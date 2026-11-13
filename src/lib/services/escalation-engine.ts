import type { SeedCase } from "@/lib/mock-data-generator";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { logAuditEvent } from "./audit";
import { markStoreDirty, type StoreState } from "./persistence";

/**
 * Deterministic auto-escalation engine.
 *
 * Every UTC day the engine sweeps the registry for files whose statutory
 * disposal window has been breached for longer than the grace window and
 * escalates them to the Competent Authority on their own — no officer has to
 * remember. Each escalation records:
 *
 *  - an ESCALATED action on the file's timeline carrying the full memorandum,
 *  - a status move to ESCALATED with priority raised to CRITICAL,
 *  - one daily digest notification for the Competent Authority's desk,
 *  - one AUTO_ESCALATION entry in the tamper-evident audit ledger.
 *
 * The engine is deliberately rule-based (breach age past a grace window), not
 * model-based: an escalation that removes an officer's discretion must be
 * explainable and reproducible. Idempotency follows the daily intake pattern —
 * a `lastAutoEscalation` UTC-day marker persisted with the snapshot.
 */

/** Days a file may sit overdue before the engine escalates it. */
export const AUTO_ESCALATION_GRACE_DAYS = 7;

export const AUTO_ESCALATION_SYSTEM_ACTOR = "system@aicte.gov.in";

const BUREAU_LABELS: Record<string, string> = {
  REGULATION_BUREAU: "Regulation Bureau",
  PGRC: "Public Grievance Redressal Cell",
  APPROVAL_BUREAU: "Approval Bureau",
  SKILL_CELL: "Skill Development Cell",
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * The memorandum recorded on the file's timeline. Deterministic: the same
 * case state always produces the same text, so audits can reproduce it.
 */
export function buildEscalationMemo(input: {
  caseItem: SeedCase;
  institutionName: string;
  breachDays: number;
  asOf: Date;
}): string {
  const { caseItem, institutionName, breachDays, asOf } = input;
  const timeline =
    SLA_CONFIGS.find(
      (s) => s.category.toLowerCase() === caseItem.category.toLowerCase()
    )?.timeline_days ?? 30;
  const bureauLabel =
    BUREAU_LABELS[caseItem.assigned_bureau] ?? caseItem.assigned_bureau;

  return [
    `AUTO-ESCALATION MEMORANDUM — File ${caseItem.case_id} (${caseItem.category}, ${institutionName}) was received on ${fmtDate(caseItem.date_received)} and disposed by the ${bureauLabel} against a ${timeline}-day statutory window ending ${fmtDate(caseItem.expected_disposal_date)}.`,
    `As on ${fmtDate(asOf)} the file stands ${breachDays} day${breachDays === 1 ? "" : "s"} overdue with desk status: ${caseItem.last_action || "no recorded action"}.`,
    `The Competent Authority is requested to take direct cognizance, call for the bureau's compliance record and issue final disposal directions under the grievance redressal timeline provisions.`,
    `Raised automatically by the Sentinel SLA engine — deterministic breach-age rule, no manual threshold applied.`,
  ].join(" ");
}

export interface EscalatedItem {
  case_id: string;
  internal_id: string;
  category: string;
  bureau: string;
  breachDays: number;
  institutionName: string;
  memo: string;
}

export interface EscalationSummary {
  day: string;
  checked: number;
  escalated: number;
  alreadyEscalated: number;
  graceDays: number;
  items: EscalatedItem[];
}

/**
 * Runs the daily escalation sweep for the live store. Returns the summary;
 * `escalated` is 0 when the marker says today already ran (unless forced).
 */
export async function runAutoEscalation(options: {
  store: StoreState;
  now?: Date;
  /** Ignore the day marker and sweep again (admin trigger). */
  force?: boolean;
  /** Override the grace window (tests). */
  graceDays?: number;
}): Promise<EscalationSummary> {
  const { store, force = false } = options;
  const now = options.now ?? new Date();
  const graceDays = options.graceDays ?? AUTO_ESCALATION_GRACE_DAYS;
  const today = dayKey(now);

  if (!force && store.lastAutoEscalation === today) {
    return {
      day: today,
      checked: 0,
      escalated: 0,
      alreadyEscalated: 0,
      graceDays,
      items: [],
    };
  }

  const instNames = new Map(store.institutions.map((i) => [i.id, i.name]));
  const items: EscalatedItem[] = [];
  const previousStates = new Map<string, { status: string; priority: string }>();
  let checked = 0;
  let alreadyEscalated = 0;

  for (const c of store.cases) {
    if (c.status === "DISPOSED" || c.status === "TRANSFERRED") continue;
    if (c.status === "ESCALATED") {
      alreadyEscalated++;
      continue;
    }
    checked++;

    const due = new Date(c.expected_disposal_date).getTime();
    const breachDays = Math.floor((now.getTime() - due) / 86400000);
    if (!Number.isFinite(breachDays) || breachDays < graceDays) continue;

    const institutionName = instNames.get(c.institution_id) ?? "the institution on record";
    const memo = buildEscalationMemo({ caseItem: c, institutionName, breachDays, asOf: now });

    previousStates.set(c.case_id, { status: c.status, priority: c.priority });
    c.status = "ESCALATED";
    c.priority = "CRITICAL";
    c.last_action = `Auto-escalated to Competent Authority (${breachDays}d past statutory window)`;
    c.last_action_date = now;
    c.next_action_required = "Competent Authority directions awaited";
    c.actions.unshift({
      actor_user: AUTO_ESCALATION_SYSTEM_ACTOR,
      actor_bureau: c.assigned_bureau,
      action_type: "ESCALATED",
      remarks: memo,
      timestamp: now,
      attachments: [],
    });

    items.push({
      case_id: c.case_id,
      internal_id: c.id,
      category: c.category,
      bureau: c.assigned_bureau,
      breachDays,
      institutionName,
      memo,
    });
  }

  // One digest notification instead of one per file — the Competent
  // Authority's bell stays readable even on heavy days.
  if (items.length > 0) {
    store.notifications.unshift({
      id: `notif_${now.getTime()}_autoesc`,
      type: "ESCALATION",
      case_id: items[0].case_id,
      target_bureau: "ALL",
      title: `Auto-escalation digest: ${items.length} file(s) crossed the ${graceDays}-day grace window`,
      message: `${items
        .slice(0, 5)
        .map((i) => `${i.case_id} (${i.breachDays}d overdue)`)
        .join(", ")}${items.length > 5 ? ` and ${items.length - 5} more` : ""}. Memoranda are recorded on each file's timeline.`,
      read: false,
      created_at: now,
    });
  }

  store.lastAutoEscalation = today;
  markStoreDirty();

  if (items.length > 0) {
    await logAuditEvent({
      user: AUTO_ESCALATION_SYSTEM_ACTOR,
      action: "AUTO_ESCALATION",
      entity: "Registry",
      entity_id: today,
      after: {
        escalated: items.length,
        graceDays,
        cases: items.map((i) => {
          const before = previousStates.get(i.case_id);
          return {
            case_id: i.case_id,
            bureau: i.bureau,
            breachDays: i.breachDays,
            before_status: before?.status,
            before_priority: before?.priority,
            after_status: "ESCALATED",
            after_priority: "CRITICAL",
          };
        }),
      },
    }).catch(() => undefined);
  }

  return {
    day: today,
    checked,
    escalated: items.length,
    alreadyEscalated,
    graceDays,
    items,
  };
}
