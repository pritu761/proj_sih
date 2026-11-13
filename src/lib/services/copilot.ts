import { groqChat } from "@/lib/groq";
import { parseSearchQuery, type ParsedSearchQuery } from "./ai-engine";
import { SLA_CONFIGS } from "@/lib/demo-data";
import repository from "./repository";
import type { SessionUser } from "@/lib/rbac";

/**
 * Registry Copilot — a grounded chat over the live grievance registry.
 *
 * Two-stage design, both deterministic at the seam:
 *  1. The natural-language question is parsed into whitelisted registry
 *     filters (parseSearchQuery) plus deterministic SLA/date phrasing;
 *  2. The matching cases and portfolio aggregates are computed by the
 *     repository (no AI), and ONLY those facts are handed to the model,
 *     which must answer from them and cite registry numbers.
 *
 * The model narrates; the registry decides. Every number in an answer can
 * be re-derived from the store.
 */

const REGIONS = [
  "Northern",
  "Western",
  "Southern",
  "Eastern",
  "Central",
  "North-Western",
  "South-Western",
];

export interface CopilotCaseCard {
  case_id: string;
  internal_id: string;
  category: string;
  status: string;
  priority: string;
  bureau: string;
  institution_name: string;
  region: string | null;
  filed: string;
  sla_status: string;
  sla_days: number;
  hearing_date: string | null;
  excerpt: string;
}

export interface CopilotFacts {
  question: string;
  portfolio: {
    totalReceived: number;
    pending: number;
    underProcess: number;
    disposed: number;
    escalated: number;
    pendingBeyondTimeline: number;
    openOverlapAlerts: number;
    avgResolutionDays: number;
  };
  categories: string[];
  matchedCases: CopilotCaseCard[];
  matchedCount: number;
  filterNote: string;
}

export interface CopilotAnswer {
  answer: string;
  filters: Partial<Record<string, string>>;
  reasoning: string;
  facts: CopilotFacts;
}

/** Chat turns sent back for continuity (bounded, client-supplied). */
export interface CopilotHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

function daysOverdueLabel(isBreached: boolean, remaining: number): string {
  return isBreached ? `${Math.abs(remaining)}d overdue` : `${remaining}d left`;
}

/**
 * Parses the question, gathers grounded facts from the repository, and asks
 * the interactive model for the narration. RBAC applies to the case list
 * (regional officers see only their region, exactly like the explorer).
 */
export async function answerCopilotQuery(input: {
  query: string;
  history?: CopilotHistoryTurn[];
  user: SessionUser;
}): Promise<{
  ok: boolean;
  disabled?: boolean;
  data?: CopilotAnswer;
  error?: string;
}> {
  const { query, user } = input;
  const history = (input.history ?? [])
    .filter((t) => t.content?.trim())
    .slice(-4);

  // ── Stage 1: parse into whitelisted filters (AI) ────────────────────────
  const parsed = await parseSearchQuery({
    query,
    categories: SLA_CONFIGS.map((c) => c.category),
    regions: REGIONS,
  });
  if (parsed.disabled) return { ok: false, disabled: true, error: parsed.error };
  if (!parsed.ok || !parsed.data) {
    return { ok: false, error: parsed.error || "Could not read that question." };
  }
  const p: ParsedSearchQuery = parsed.data;

  // Deterministic SLA phrasing (same rules as the explorer's AI filter bar).
  const lower = query.toLowerCase();
  let slaStatus: "BREACHED" | "APPROACHING" | null = null;
  if (/\b(breach\w*|overdue|past (the |its )?(deadline|sla|due date)|missed (the )?sla|late)\b/i.test(lower)) {
    slaStatus = "BREACHED";
  } else if (/\b(approach\w*|nearing|near(ing)? (the )?(deadline|sla|expiry)|about to (breach|expire))\b/i.test(lower)) {
    slaStatus = "APPROACHING";
  }

  const filters: Partial<Record<string, string>> = {};
  if (p.category && SLA_CONFIGS.some((c) => c.category === p.category)) filters.category = p.category;
  if (p.bureau) filters.bureau = p.bureau;
  if (p.status) filters.status = p.status;
  if (p.priority) filters.priority = p.priority;
  if (p.region && REGIONS.includes(p.region)) filters.region = p.region;
  if (p.institution_name) filters.institution_name = p.institution_name;
  if (slaStatus) filters.sla_status = slaStatus;
  const q = [p.q, p.institution_name].filter(Boolean).join(" ").replace(/["\\<>]/g, "").trim().slice(0, 80);
  if (q) filters.q = q;

  // ── Stage 2: grounded facts from the repository (no AI) ─────────────────
  const [caseRes, metrics] = await Promise.all([
    repository.getCases({ ...filters, limit: 12 }, user),
    repository.getDashboardMetrics(user),
  ]);

  const cases = caseRes.cases;

  const filterBits = [
    ...Object.entries(filters).map(([k, v]) => `${k}=${v}`),
  ];
  const filterNote = filterBits.length ? filterBits.join(", ") : "no filters — full registry view";
  const matchedCount = caseRes.total ?? cases.length;

  const cards: CopilotCaseCard[] = cases.slice(0, 8).map((c) => ({
    case_id: c.case_id,
    internal_id: c.id,
    category: c.category,
    status: c.status,
    priority: c.priority,
    bureau: c.assigned_bureau,
    institution_name: c.institution?.name ?? "—",
    region: c.institution?.region ?? null,
    filed: new Date(c.date_received).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    sla_status: c.sla.isBreached ? "BREACHED" : c.sla.isApproaching ? "APPROACHING" : "ON_TRACK",
    sla_days: c.sla.remainingDays,
    hearing_date: c.hearing_date ? new Date(c.hearing_date).toISOString().slice(0, 10) : null,
    excerpt: c.description.slice(0, 220),
  }));

  const facts: CopilotFacts = {
    question: query,
    portfolio: {
      totalReceived: metrics.kpi.totalReceived,
      pending: metrics.kpi.pending,
      underProcess: metrics.kpi.underProcess,
      disposed: metrics.kpi.disposed,
      escalated: metrics.kpi.escalated,
      pendingBeyondTimeline: metrics.kpi.pendingBeyondTimeline,
      openOverlapAlerts: metrics.kpi.openOverlapAlerts,
      avgResolutionDays: Math.round(metrics.avgResolutionDays ?? 0),
    },
    categories: SLA_CONFIGS.map((c) => c.category),
    matchedCases: cards,
    matchedCount,
    filterNote,
  };

  // ── Stage 3: narrate from the facts ─────────────────────────────────────
  const caseLines = cards
    .map(
      (c) =>
        `- ${c.case_id} · ${c.category} · ${c.institution_name} (${c.region ?? "—"}) · ${c.status} · ${c.priority} · SLA ${daysOverdueLabel(c.sla_status === "BREACHED", c.sla_days)}${c.hearing_date ? ` · hearing ${c.hearing_date}` : ""}`
    )
    .join("\n");

  const historyLines = history
    .map((t) => `${t.role === "user" ? "Officer" : "Copilot"}: ${t.content.slice(0, 400)}`)
    .join("\n");

  const messages: Parameters<typeof groqChat>[0]["messages"] = [
    {
      role: "system",
      content:
        "You are the Registry Copilot of AICTE Sentinel, the statutory grievance monitoring desk of AICTE. " +
        "You answer officer questions about the live grievance registry. Ground every statement in the FACTS block: " +
        "cite registry numbers for case-specific claims, use only counts present in the facts, and say plainly when " +
        "the registry shows nothing matching. Never invent cases, dates, institutions or figures. " +
        "Be concise and operational: short paragraphs or tight bullets, no pleasantries, no markdown headings. " +
        "End with one concrete suggested next step for the officer when the facts support one.",
    },
    ...(history.length
      ? [
          {
            role: "assistant" as const,
            content: `Conversation so far (for continuity):\n${historyLines}`,
          },
        ]
      : []),
    {
      role: "user",
      content: `FACTS (authoritative, computed from the live registry — user scope: ${user.role}, bureau ${user.bureau}${user.region ? `, region ${user.region}` : ""}):

Portfolio:
- Received: ${facts.portfolio.totalReceived}
- Pending scrutiny: ${facts.portfolio.pending}
- Under process: ${facts.portfolio.underProcess}
- Disposed: ${facts.portfolio.disposed}
- Escalated: ${facts.portfolio.escalated}
- Pending beyond statutory timeline: ${facts.portfolio.pendingBeyondTimeline}
- Open inter-bureau overlaps: ${facts.portfolio.openOverlapAlerts}
- Average resolution: ${facts.portfolio.avgResolutionDays} days

Question interpreted as: ${filterNote}
Matching files: ${matchedCount}${matchedCount > cards.length ? ` (showing the ${cards.length} most recent)` : ""}

${caseLines || "(no files matched — say so and suggest a broader question)"}

QUESTION: ${query}`,
    },
  ];

  const narration = await groqChat({ messages, temperature: 0.3, maxTokens: 2000 });
  if (narration.disabled) return { ok: false, disabled: true, error: narration.error };
  if (!narration.ok || !narration.content) {
    return { ok: false, error: narration.error || "Copilot could not answer right now." };
  }

  return {
    ok: true,
    data: {
      answer: narration.content.trim(),
      filters,
      reasoning: (p.reasoning ?? "").slice(0, 200),
      facts,
    },
  };
}
