import { groqJson } from "@/lib/groq";
import type { SeedCase } from "@/lib/mock-data-generator";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { routeComplaint, INGESTION_CHANNELS, type IngestionChannel } from "./ingestion-engine";
import { detectLanguage } from "./language-detect";
import { overlapDetector } from "./overlap-detector";
import { logAuditEvent } from "./audit";
import { markStoreDirty, type StoreState } from "./persistence";

/**
 * Daily synthetic intake — keeps the demonstration registry alive.
 *
 * Once per UTC day the engine registers a fresh batch of grievances
 * (6-10 files), so dashboards, SLA watches and the AI surfaces show a
 * portfolio that visibly grows day after day. Where GROQ_API_KEY is
 * configured, the day's narratives are *written by the LLM* (one JSON
 * batch call on the intake's DEDICATED model — openai/gpt-oss-20b — so
 * the intake never competes with the interactive AI features for the
 * same model's rate-limit bucket; override with GROQ_INTAKE_MODEL). Without a
 * key — or on any API failure — the engine falls back to deterministic
 * local templates, so the demo never stalls.
 *
 * Idempotency: the store carries a `lastDailyIntake` day marker that is
 * persisted with the snapshot. Booting the same day again creates
 * nothing; boots after missed days catch up (capped) with each day's
 * arrivals back-dated, so the timeline stays coherent.
 */

const MAX_CATCHUP_DAYS = 30;

const CATEGORIES = SLA_CONFIGS.map((s) => s.category);

const SOURCES = ["student", "faculty", "stakeholder", "public", "other"] as const;
type SourceKey = (typeof SOURCES)[number];

const CHANNELS = INGESTION_CHANNELS.map((c) => c.key);

/** Groq-written complaint draft produced for one day's intake batch. */
interface GroqComplaint {
  category?: string;
  description?: string;
  source?: string;
  language?: string;
}

/** Local fallback narratives — used when the LLM is unavailable. */
const FALLBACK_TEMPLATES: Record<string, string[]> = {
  "Capitation Fee & Overcharging": [
    "Admitted students at {inst} were charged Rs 35,000 as a mandatory placement-assistance fee at counselling, over and above the state fee-committee structure, with receipts issued against a private account.",
    "A parent of {inst} reports the institute demanding Rs 28,000 in cash for 'exam processing' before the semester form submission window, with no fee receipt issued.",
  ],
  "Withholding Certificates": [
    "Passed-out students of {inst} state the office is withholding degree certificates until an alumni-fund contribution is paid, delaying several verified job on-boardings.",
    "{inst} retained a student's original Class X and XII mark sheets at admission; requests for return during a transfer are being refused by the front office.",
  ],
  "Ragging & Safety Violations": [
    "A fresher at {inst} reported repeated intimidation by seniors in the second-year hostel corridor; the warden allegedly advised the student to 'adjust quietly' instead of reporting.",
    "An anti-ragging squad visit complaint from {inst} alleges the committee minutes for the current session were never recorded despite two incidents.",
  ],
  "Unapproved Courses & Seats": [
    "{inst} is admitting students to an MCA (Cloud Computing) programme this session without a visible AICTE approval reference for the enlarged intake in the prospectus.",
    "The admission brochure of {inst} advertises 240 engineering seats while the last published approval letter sanctions 180, and the extra seats were filled in the spot round.",
  ],
  "Admission Irregularities": [
    "Candidates at {inst} allege the vacant-seat matrix for the management quota was never published before the second counselling round, and seat allotments changed without notice.",
    "{inst} collected token admission charges in cash before the centralised counselling portal closed, and refused printed receipts for the same.",
  ],
  "Faculty Non-Payment & Harassment": [
    "Five faculty members of {inst} report salaries pending for three months, while the institution advertises new campus construction in its admissions campaign.",
    "A lab instructor at {inst} was removed without written notice after flagging equipment-shortage findings to the principal in writing.",
  ],
  "Infrastructure & Lab Deficiencies": [
    "The computer centre at {inst} operates with 20 functional machines against 60 approved; first-year students share single workstations during lab hours.",
    "Inspection inputs from {inst} indicate the fire-safety equipment and workshop tools listed in compliance filings are missing or expired.",
  ],
  "Other Institutional Grievances": [
    "{inst} has not published an ombudsman appointment or grievance-committee contact this academic year, leaving students without a documented escalation path.",
    "Students of {inst} report the internal transport fee doubling mid-session without prior intimation, and no revised notice displayed on the campus board.",
  ],
};

const FALLBACK_COMPLAINANTS: { name: string; contact: string }[] = [
  { name: "Ankit Verma", contact: "+91 9822014471" },
  { name: "Priya Nair", contact: "+91 9845233008" },
  { name: "Mohd. Imran Shaikh", contact: "+91 9760055122" },
  { name: "D. Kavitha", contact: "+91 9444100981" },
  { name: "Harpreet Singh Bedi", contact: "+91 9876502211" },
  { name: "Swati Deshmukh", contact: "+91 9021105544" },
];

const OFFICER_ROSTER = [
  { email: "rb.officer@aicte.gov.in", bureau: "REGULATION_BUREAU", name: "Dr. Ramesh Unnikrishnan" },
  { email: "pgrc.officer@aicte.gov.in", bureau: "PGRC", name: "Smt. Sunita Chhibba" },
  { email: "ab.officer@aicte.gov.in", bureau: "APPROVAL_BUREAU", name: "Shri A. Krishnamurthy" },
  { email: "sdc.officer@aicte.gov.in", bureau: "SKILL_CELL", name: "Dr. Vikram Mehta" },
] as const;

/** Day key (UTC) used for the idempotency marker and catch-up math. */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return dayKey(d);
}

function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00.000Z`).getTime() - new Date(`${from}T00:00:00.000Z`).getTime()) / 86400000
  );
}

/** Random receive time within a UTC day, always in the past. */
function receivedTimeFor(day: string, now: Date): Date {
  const dayStart = new Date(`${day}T00:00:00.000Z`).getTime();
  const jitter = Math.floor(Math.random() * 6 * 3600000); // within the last 6 hours
  const candidate =
    day === dayKey(now)
      ? now.getTime() - Math.max(60_000, jitter)
      : dayStart + (1 + Math.floor(Math.random() * 22)) * 3600000 + Math.floor(Math.random() * 3600000);
  return new Date(Math.min(candidate, now.getTime() - 60_000));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** One Groq call writes the whole day's narrative batch. */
async function generateNarratives(
  count: number
): Promise<{ list: GroqComplaint[]; usedGroq: boolean }> {
  const model = process.env.GROQ_INTAKE_MODEL ?? "openai/gpt-oss-20b";
  const buildCall = (batchCount: number) =>
    groqJson<{ complaints?: GroqComplaint[] }>({
      model,
      messages: [
        {
          role: "system",
          content:
            "You write synthetic complaints for AICTE Sentinel, a demonstration grievance-monitoring environment for Indian technical education. " +
            "Every complaint must concern exactly ONE of these categories: " +
            CATEGORIES.map((c) => `"${c}"`).join(", ") +
            ". " +
            "Style: 45-80 words, factual and specific (amounts in Rs, seat counts, departments, dates). Do NOT invent an institution name inside the text — refer only to 'the institution'; the registry attaches the institution separately. " +
            'Output JSON only: {"complaints":[{"category":"<one of the categories>","description":"<text>","source":"student|faculty|stakeholder|public","language":"en|hi|ta"}]}',
        },
        {
          role: "user",
          content: `Write ${batchCount} distinct grievances filed today. Vary the categories (no repeats unless unavoidable), vary the complainant type, and make at most one complaint in Hindi (Devanagari script, language "hi").`,
        },
      ],
      temperature: 0.75,
      // Reasoning models spend completion tokens on internal thinking before
      // the JSON lands; a batch can legitimately exceed 3000 tokens and get
      // truncated mid-JSON (Groq then rejects it with json_validate_failed).
      // Intake is a background job — give it real headroom.
      maxTokens: 8000,
    });

  // One bounded retry with a smaller batch: a failed attempt (truncation,
  // transient 4xx) falls back to fewer AI narratives rather than zero — the
  // deterministic filler covers whatever is still missing.
  const callFailure = { ok: false, data: undefined, error: "network" } as const;
  let result = await buildCall(count).catch(() => callFailure);
  if (!result.ok) {
    console.warn(`[intake] Groq batch failed: ${result.error} — retrying with a smaller batch.`);
    result = await buildCall(Math.max(3, Math.ceil(count / 2))).catch(() => callFailure);
  }

  const list: GroqComplaint[] = result.data?.complaints ?? [];
  const cleaned = list
    .filter((c) => typeof c.description === "string" && c.description.trim().length >= 40)
    .slice(0, count)
    .map((c) => ({
      category: CATEGORIES.includes(c.category ?? "") ? (c.category as string) : "Other Institutional Grievances",
      description: (c.description ?? "").trim().slice(0, 600),
      source: SOURCES.includes((c.source ?? "") as SourceKey) ? c.source : undefined,
      language: ["en", "hi", "ta"].includes(c.language ?? "") ? c.language : undefined,
    }));
  console.info(
    `[intake] ${cleaned.length}/${count} narratives via ${result.ok ? `Groq (${model})` : "deterministic fallback"}`
  );
  return { list: cleaned, usedGroq: result.ok && cleaned.length > 0 };
}
/** Fill any shortfall with local deterministic narratives. The {inst}
 *  placeholder is resolved against each case's actual institution at build
 *  time, so the narrative always matches the file it lands on. */
function fallbackNarratives(count: number, used: number): GroqComplaint[] {
  const out: GroqComplaint[] = [];
  for (let i = used; i < count; i++) {
    const category = CATEGORIES[(i * 3 + Math.floor(Math.random() * CATEGORIES.length)) % CATEGORIES.length];
    const templates = FALLBACK_TEMPLATES[category] ?? FALLBACK_TEMPLATES["Other Institutional Grievances"];
    out.push({
      category,
      description: templates[i % templates.length], // {inst} resolved per case
      source: undefined,
      language: undefined,
    });
  }
  return out;
}

/**
 * Runs the daily intake for the live store. Returns the batch summary;
 * `created` is 0 when the marker says today is already ingested.
 */
export async function ensureDailyIntake(options: {
  store: StoreState;
  now?: Date;
  /** Ignore the marker and force today's batch (admin trigger). */
  force?: boolean;
  /** Schedule the next UTC-midnight self-tick (long-running servers). */
  schedule?: boolean;
  /** Skip the Groq call and use local templates (tests / offline runs). */
  offline?: boolean;
}): Promise<{
  created: number;
  days: string[];
  narrativeSource: "groq" | "fallback" | "none";
  totalCases: number;
}> {
  const { store, force = false, schedule = false, offline = false } = options;
  const now = options.now ?? new Date();
  const today = dayKey(now);

  if (!force && store.lastDailyIntake === today) {
    return { created: 0, days: [], narrativeSource: "none", totalCases: store.cases.length };
  }

  // Catch-up window: every missing UTC day since the marker (bounded).
  const start = !force && store.lastDailyIntake
    ? addDays(store.lastDailyIntake, 1)
    : today;
  const boundedStart = daysBetween(start, today) > MAX_CATCHUP_DAYS
    ? addDays(today, -MAX_CATCHUP_DAYS)
    : start;
  const missedDays: string[] = [];
  for (let d = boundedStart; d <= today; d = addDays(d, 1)) missedDays.push(d);

  // Registry numbering continues from the highest live sequence.
  let sequence = store.cases.reduce((max, c) => {
    const m = /(\d+)$/.exec(c.case_id);
    return m ? Math.max(max, Number(m[1])) : max;
  }, 0);

  const institutions = store.institutions;
  // Trouble-spot bias: most arrivals land at institutions that already have
  // open files, which keeps overlap coordination and repeat-offender
  // analytics warm instead of scattering noise across the registry.
  const hotInstitutions = new Map<string, number>();
  for (const c of store.cases) {
    if (c.status !== "DISPOSED") hotInstitutions.set(c.institution_id, (hotInstitutions.get(c.institution_id) ?? 0) + 1);
  }
  const hotIds = [...hotInstitutions.entries()].filter(([, n]) => n >= 2).map(([id]) => id);

  const createdCases: SeedCase[] = [];
  const daysWithNew: string[] = [];
  let usedGroq = false;
  let usedFallback = false;

  for (const day of missedDays) {
    const count = 6 + Math.floor(Math.random() * 5); // 6-10 files per day
    let narratives: GroqComplaint[] = [];
    let groqCount = 0;
    if (!offline) {
      const generated = await generateNarratives(count).catch(() => ({ list: [], usedGroq: false }));
      narratives = generated.list;
      groqCount = narratives.length;
      if (generated.usedGroq) usedGroq = true;
    }
    if (narratives.length < count) {
      narratives.push(...fallbackNarratives(count, narratives.length));
      usedFallback = true;
    }

    const received = receivedTimeFor(day, now);
    for (let i = 0; i < narratives.length; i++) {
      sequence++;
      const draft = narratives[i];

      // 55% of arrivals continue a documented trouble spot; the rest explore
      // the wider registry so coverage stays broad.
      const inst =
        hotIds.length > 0 && Math.random() < 0.55
          ? institutions.find((s) => s.id === hotIds[i % hotIds.length]) ?? pick(institutions)
          : pick(institutions);

      const channel: IngestionChannel = pick(CHANNELS);
      const routed = routeComplaint({ category: draft.category ?? CATEGORIES[0], channel });
      const detected = detectLanguage(draft.description ?? "");

      const isRepeat = Math.random() < 0.3;
      const repeat = FALLBACK_COMPLAINANTS[(sequence + i) % FALLBACK_COMPLAINANTS.length];
      const complainantName = isRepeat
        ? repeat.name
        : ["Rahul", "Sneha", "Aarav", "Meera", "Farhan", "Divya", "Karan", "Lakshmi"][i % 8] +
          " " +
          ["Sharma", "Iyer", "Patel", "Reddy", "Khan", "Bose", "Chauhan", "Menon"][i % 8];
      const complainantContact = isRepeat
        ? repeat.contact
        : `+91 9${String(100000000 + Math.floor(Math.random() * 899999999)).slice(0, 9)}`;

      // Desk allocation happens only when the received time is old enough
      // that the assignment still lands in the past.
      const assignedAt = new Date(received.getTime() + (45 + Math.floor(Math.random() * 120)) * 60_000);
      const canAssign = assignedAt.getTime() < now.getTime() - 60_000;
      const officer = canAssign ? pick(OFFICER_ROSTER.filter((o) => o.bureau === routed.bureau)) ?? pick(OFFICER_ROSTER) : null;

      const hearing =
        Math.random() < 0.08
          ? new Date(received.getTime() + (10 + Math.floor(Math.random() * 20)) * 86400000)
          : null;

      const actions: SeedCase["actions"] = [
        {
          actor_user: officer?.email ?? (routed.bureau === "PGRC" ? "pgrc.officer@aicte.gov.in" : "rb.officer@aicte.gov.in"),
          actor_bureau: routed.bureau,
          action_type: "RECEIVED",
          remarks: `Grievance received via ${routed.channelLabel} and registered in the daily intake register.`,
          timestamp: received,
          attachments: [],
        },
      ];
      if (canAssign && officer) {
        actions.push({
          actor_user: officer.email,
          actor_bureau: officer.bureau,
          action_type: "ASSIGNED",
          remarks: "Complaint allocated to the bureau desk for initial scrutiny.",
          timestamp: assignedAt,
          attachments: [],
        });
      }

      const caseCode = `AICTE/${routed.bureauCode}/2026/${String(sequence).padStart(5, "0")}`;
      // Fallback-origin drafts carry an {inst} placeholder; Groq drafts name
      // no institution by contract, so both bind to the assigned institution.
      const description = draft.description
        ? i < groqCount
          ? draft.description
          : draft.description.replace(/\{inst\}/g, inst.name)
        : "";
      createdCases.push({
        id: `case_${now.getTime()}_${sequence}_${i}`,
        case_id: caseCode,
        institution_id: inst.id,
        date_received: received,
        source: (draft.source as SourceKey) ?? (INGESTION_CHANNELS.find((c) => c.key === channel)?.source as SourceKey) ?? "public",
        category: draft.category ?? CATEGORIES[0],
        description,
        status: canAssign && officer ? "UNDER_PROCESS" : "PENDING",
        assigned_bureau: routed.bureau,
        assigned_officer: canAssign && officer ? officer.email : "",
        last_action: canAssign && officer ? "Complaint allocated for desk scrutiny" : "Complaint registered on portal",
        last_action_date: actions[actions.length - 1].timestamp,
        next_action_required: "Initial scrutiny by Bureau desk officer",
        expected_disposal_date: new Date(received.getTime() + routed.slaDays * 86400000),
        priority: routed.priority,
        complainant_name: complainantName,
        complainant_contact: complainantContact,
        language: detected.code !== "en" ? detected.code : draft.language && draft.language !== "en" ? draft.language : undefined,
        hearing_date: hearing,
        actions,
      });
    }
    daysWithNew.push(day);
  }

  // New files land newest-first, matching createCase behaviour.
  for (const c of createdCases) store.cases.unshift(c);

  // One overlap pass for the batch: fresh files can collide with live files
  // at the same institution under another bureau, which surfaces as a new
  // coordination alert (realistic signal, not noise).
  const activeForOverlap = store.cases.map((c) => {
    const inst = store.institutions.find((s) => s.id === c.institution_id);
    return {
      id: c.id,
      case_id: c.case_id,
      institution_id: c.institution_id,
      institution_aicte_id: inst?.aicte_permanent_id,
      institution_name: inst?.name,
      institution_normalized_name: inst?.normalized_name,
      institution_city: inst?.city,
      institution_state: inst?.state,
      institution_pincode: inst?.pincode,
      category: c.category,
      description: c.description,
      assigned_bureau: c.assigned_bureau,
      status: c.status,
      date_received: c.date_received,
    };
  });
  const newIds = new Set(createdCases.map((c) => c.id));
  for (const target of activeForOverlap.filter((t) => newIds.has(t.id))) {
    const alerts = await overlapDetector.checkCase(target, activeForOverlap).catch(() => []);
    for (const d of alerts) {
      store.overlapAlerts.unshift({
        id: `ovl_${now.getTime()}_${store.overlapAlerts.length}`,
        institution_id: target.institution_id,
        case_ids: d.case_ids,
        bureaus_involved: d.bureaus_involved,
        confidence: d.confidence,
        match_reasons: d.match_reasons as any,
        trilayer: d.trilayer,
        detected_at: now,
        status: "OPEN",
        coordination_note: null,
        dismissed_reason: null,
      });
    }
  }

  store.lastDailyIntake = today;
  markStoreDirty();

  if (createdCases.length > 0) {
    await logAuditEvent({
      user: "system@aicte.gov.in",
      action: "DAILY_INTAKE",
      entity: "Registry",
      entity_id: today,
      after: { created: createdCases.length, days: daysWithNew, narratives: usedGroq ? "groq" : "fallback" },
    }).catch(() => undefined);
  }

  if (schedule) scheduleNextTick(store);

  return {
    created: createdCases.length,
    days: daysWithNew,
    narrativeSource: usedGroq ? "groq" : usedFallback ? "fallback" : "none",
    totalCases: store.cases.length,
  };
}

/**
 * Self-contained daily tick for long-running servers: sleeps until the next
 * UTC midnight (plus a small jitter) and ingests again. The timer is
 * unref'd so it never holds a process or test runner open.
 */
export function scheduleNextTick(store: StoreState): void {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 5, 0, 0); // 00:05 UTC — safely inside the new day
  const delay = next.getTime() - now.getTime() + Math.floor(Math.random() * 300_000);
  const timer = setTimeout(() => {
    void ensureDailyIntake({ store, schedule: true }).catch(() => undefined);
  }, Math.max(delay, 60_000));
  timer.unref?.();
}
