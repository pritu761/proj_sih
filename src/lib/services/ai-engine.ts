/**
 * AI engine for AICTE Sentinel — Groq-powered assistance for grievance handling.
 *
 * These are pure functions (no DB writes). Side effects live in
 * src/actions/ai-actions.ts. Every function degrades gracefully when
 * GROQ_API_KEY is not configured — callers should check `disabled` and render
 * an "AI not configured" hint instead of failing hard.
 *
 * Domain: statutory grievance monitoring across AICTE bureaus.
 * Supported intake languages (BCP-47): en, hi, ta, te, bn, mr, gu, kn, ml, or, ur.
 */

import { groqJson, groqChat, type GroqMessage } from "@/lib/groq";
import { detectLanguage } from "@/lib/services/language-detect";

const SYSTEM_PREFIX = `You are an AI assistant for AICTE Sentinel, the statutory grievance monitoring desk of the All India Council for Technical Education (AICTE). You help bureau officers triage, summarize, and respond to institutional grievances. Be concise, neutral, and grounded strictly in the provided case facts. Never invent evidence, dates, names, or legal conclusions. When you are unsure, say so. Respond only with valid JSON.`;

const STATUTORY_CATEGORIES = [
  "Capitation Fee & Overcharging",
  "Withholding Certificates",
  "Faculty Non-Payment & Harassment",
  "Ragging & Safety Violations",
  "Admission Irregularities",
  "Unapproved Courses & Seats",
  "Infrastructure & Lab Deficiencies",
  "Examination Irregularities",
  "Affiliation & Recognition",
  "Other",
] as const;

const BUREAUS = ["REGULATION_BUREAU", "PGRC", "APPROVAL_BUREAU", "SKILL_CELL"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

// ============================================================================
// 1. CASE SUMMARY
// ============================================================================

export interface CaseSummaryResult {
  executiveSummary: string;
  keyFacts: string[];
  timeline: string[];
  suggestedNextSteps: string[];
  riskFlags: string[];
}

export async function summarizeCase(payload: {
  caseId: string;
  caseCode: string;
  category: string;
  status: string;
  priority: string;
  bureau: string;
  description: string;
  dateReceived: string;
  language?: string | null;
  institutionName?: string | null;
  institutionCity?: string | null;
  institutionState?: string | null;
  actions: Array<{
    action_type: string;
    actor_user: string;
    actor_bureau: string;
    remarks: string;
    timestamp: string;
  }>;
  comments: Array<{
    author_name: string;
    author_bureau: string;
    body: string;
    created_at: string;
    scope: string;
  }>;
}): Promise<{
  ok: boolean;
  data?: CaseSummaryResult;
  disabled?: boolean;
  error?: string;
}> {
  const actionLines = (payload.actions ?? [])
    .slice(0, 30)
    .map(
      (a) =>
        `- ${new Date(a.timestamp).toLocaleDateString("en-IN")} | ${a.action_type} | ${a.actor_user} (${a.actor_bureau}): ${a.remarks}`
    )
    .join("\n") || "No action history recorded yet.";

  const commentLines = (payload.comments ?? [])
    .slice(0, 10)
    .map(
      (c) =>
        `- ${new Date(c.created_at).toLocaleDateString("en-IN")} | ${c.author_name} (${c.author_bureau}, ${c.scope}): ${c.body}`
    )
    .join("\n") || "No inter-bureau comments recorded yet.";

  const detected = detectLanguage(payload.description, payload.institutionState ?? undefined);

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Summarize this AICTE grievance case into a briefing for the handling officer.

CASE ID: ${payload.caseCode} (${payload.caseId})
Institution: ${payload.institutionName ?? "—"} (${payload.institutionCity ?? "—"}, ${payload.institutionState ?? "—"})
Category: ${payload.category}
Status: ${payload.status}
Priority: ${payload.priority}
Assigned bureau: ${payload.bureau}
Language detected: ${detected.name} (${detected.code})
Date received: ${payload.dateReceived}

Complainant representation:
${payload.description}

Action history:
${actionLines}

Comments / coordination notes:
${commentLines}

Return a JSON object with exactly these keys:
- executiveSummary: 2-3 sentence plain-language briefing
- keyFacts: array of 4-6 short factual bullets extracted from the representation
- timeline: array of 4-6 chronological bullets from the action history
- suggestedNextSteps: array of 3-5 concrete next actions for the officer
- riskFlags: array of compliance/SLA risk flags (e.g. SLA approaching, unassigned, repeat complainant), or empty array

Do not invent facts not present in the case.`,
    },
  ];

  return groqJson<CaseSummaryResult>({ messages, temperature: 0.3, maxTokens: 3000 });
}

// ============================================================================
// 2. SMART CLASSIFICATION (category / bureau / priority suggestion)
// ============================================================================

export interface ClassificationSuggestion {
  suggestedCategory: string;
  suggestedBureau: string;
  suggestedPriority: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
  categoryAlternatives: Array<{ category: string; reason: string }>;
}

export async function suggestClassification(payload: {
  description: string;
  language?: string | null;
  institutionState?: string | null;
  currentCategory?: string | null;
  currentBureau?: string | null;
  currentPriority?: string | null;
}): Promise<{
  ok: boolean;
  data?: ClassificationSuggestion;
  disabled?: boolean;
  error?: string;
}> {
  const detected = detectLanguage(payload.description, payload.institutionState ?? undefined);

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Classify this AICTE grievance representation and suggest the statutory category, responsible bureau, and priority.

Allowed categories: ${STATUTORY_CATEGORIES.join(", ")}
Allowed bureaus: ${BUREAUS.join(", ")}
Allowed priorities: ${PRIORITIES.join(", ")}

Language detected: ${detected.name} (${detected.code})
Institution state: ${payload.institutionState ?? "—"}
Current values — category: ${payload.currentCategory ?? "—"}, bureau: ${payload.currentBureau ?? "—"}, priority: ${payload.currentPriority ?? "—"}

Complainant representation:
${payload.description}

Return a JSON object with exactly these keys:
- suggestedCategory: one of the allowed categories
- suggestedBureau: one of the allowed bureaus
- suggestedPriority: one of the allowed priorities
- confidence: "HIGH" | "MEDIUM" | "LOW"
- reasoning: short plain-language justification citing specific phrases from the representation
- categoryAlternatives: up to 3 alternative categories with one-line reasons each

Do not invent facts. If the text is too vague to classify confidently, set confidence to "LOW" and say so in reasoning.`,
    },
  ];

  return groqJson<ClassificationSuggestion>({ messages, temperature: 0.2, maxTokens: 2500 });
}

// ============================================================================
// 3. DRAFT COMPLAINANT REPLY / STATUTORY NOTICE
// ============================================================================

export interface DraftReplyResult {
  subject: string;
  body: string;
  language: string;
  tone: string;
  notes: string;
}

export type ReplyType =
  | "ACKNOWLEDGEMENT"
  | "STATUS_UPDATE"
  | "RESOLUTION"
  | "SHOW_CAUSE"
  | "HEARING_NOTICE";

export async function draftReply(payload: {
  caseCode: string;
  category: string;
  status: string;
  bureau: string;
  description: string;
  dateReceived: string;
  complainantName?: string | null;
  institutionName?: string | null;
  replyType: ReplyType;
  language?: string | null;
  officerName?: string | null;
  institutionState?: string | null;
}): Promise<{
  ok: boolean;
  data?: DraftReplyResult;
  disabled?: boolean;
  error?: string;
}> {
  const detected = detectLanguage(
    payload.description,
    payload.institutionState ?? undefined
  );
  const replyLang = payload.language ?? detected.code ?? "en";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Draft a formal ${payload.replyType.toLowerCase().replaceAll("_", " ")} letter for an AICTE grievance case.

Case: ${payload.caseCode}
Category: ${payload.category}
Status: ${payload.status}
Handling bureau: ${payload.bureau}
Date received: ${payload.dateReceived}
Complainant: ${payload.complainantName ?? "—"}
Institution: ${payload.institutionName ?? "—"}

Complainant representation:
${payload.description}

Reply type: ${payload.replyType}
Purpose: Formal statutory correspondence to the complainant.
Target language: ${replyLang} (${detected.name})

Return a JSON object with exactly these keys:
- subject: email/letter subject line
- body: the full letter body in ${replyLang}, formal and statutory in tone, addressing the complainant, referencing the case registry number
- language: the BCP-47 code used (${replyLang})
- tone: short descriptor of the tone used
- notes: any cautions (e.g. "verify dates before issuing", "legal review recommended for show-cause")

Keep the letter concise, neutral, and grounded only in the case facts provided.`,
    },
  ];

  return groqJson<DraftReplyResult>({ messages, temperature: 0.4, maxTokens: 3500 });
}

// ============================================================================
// 4. TRANSLATION
// ============================================================================

export interface TranslateResult {
  translatedText: string;
  from: string;
  to: string;
  notes: string;
}

export async function translateText(payload: {
  text: string;
  from: string;
  to: string;
}): Promise<{
  ok: boolean;
  data?: TranslateResult;
  disabled?: boolean;
  error?: string;
}> {
  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Translate the following text from ${payload.from} to ${payload.to}. Preserve meaning, formal statutory tone, and any case registry numbers or proper nouns exactly. Do not add or omit information.

Text:
${payload.text}

Return a JSON object with exactly these keys:
- translatedText: the translation
- from: "${payload.from}"
- to: "${payload.to}"
- notes: any cautions (e.g. script-specific terms that could not be precisely translated)`,
    },
  ];

  return groqJson<TranslateResult>({ messages, temperature: 0.2, maxTokens: 3000 });
}

// ============================================================================
// 5. OVERLAP EXPLAINER
// ============================================================================

export interface OverlapExplanation {
  plainExplanation: string;
  sharedElements: string[];
  coordinationRecommendation: string;
}

export async function explainOverlap(payload: {
  currentCaseCode: string;
  currentCategory: string;
  currentBureau: string;
  currentDescription: string;
  collidingCaseCode: string;
  collidingCategory: string;
  collidingBureau: string;
  collidingDescription: string;
  matchReasons?: Array<{ rule?: string; score?: number }> | null;
}): Promise<{
  ok: boolean;
  data?: OverlapExplanation;
  disabled?: boolean;
  error?: string;
}> {
  const matchLines = (payload.matchReasons ?? [])
    .map((m) => {
      const label = (m.rule || "overlap").replaceAll("_", " ").toLowerCase();
      const score = typeof m.score === "number" ? ` (${Math.round(m.score * 100)}% match)` : "";
      return `- ${label}${score}`;
    })
    .join("\n") || "No structured match reasons recorded.";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Explain in plain language why two AICTE grievance cases have been flagged as potentially overlapping, to help a bureau officer coordinate a lead bureau.

Current case: ${payload.currentCaseCode}
Category: ${payload.currentCategory}
Bureau: ${payload.currentBureau}
Description: ${payload.currentDescription}

Colliding case: ${payload.collidingCaseCode}
Category: ${payload.collidingCategory}
Bureau: ${payload.collidingBureau}
Description: ${payload.collidingDescription}

Structured match reasons from the detector:
${matchLines}

Return a JSON object with exactly these keys:
- plainExplanation: 2-4 sentences in plain language an officer can quote in coordination minutes
- sharedElements: array of short phrases describing what the two cases have in common (institution, issue, dates, persons)
- coordinationRecommendation: one concrete recommendation (e.g. which bureau should lead, whether to merge, transfer, or hear jointly)

Ground every claim in the case facts above.`,
    },
  ];

  return groqJson<OverlapExplanation>({ messages, temperature: 0.3, maxTokens: 2500 });
}

// ============================================================================
// 6. DASHBOARD AI BRIEFING
// ============================================================================

export interface DashboardBriefing {
  headline: string;
  situation: string;
  risks: string[];
  recommendedFocus: string[];
  tone: "STEADY" | "WATCHFUL" | "URGENT";
}

export async function briefDashboard(payload: {
  kpi: {
    totalReceived: number;
    pending: number;
    underProcess: number;
    disposed: number;
    transferred: number;
    escalated: number;
    pendingBeyondTimeline: number;
    openOverlapAlerts: number;
  };
  disposalRate: number;
  avgResolutionDays: number;
  urgentCases: Array<{ case_id: string; category: string; priority: string; institution_name: string }>;
  hearingsSoon: Array<{ case_id: string; category: string; hearing_date: string }>;
  bureauWorkload: Array<{ bureau: string; count: number }>;
  role: string;
  bureau: string;
  name: string;
}): Promise<{
  ok: boolean;
  data?: DashboardBriefing;
  disabled?: boolean;
  error?: string;
}> {
  const urgentLines =
    (payload.urgentCases ?? [])
      .slice(0, 8)
      .map((c) => `- ${c.case_id} · ${c.category} · ${c.priority} · ${c.institution_name}`)
      .join("\n") || "No urgent cases flagged.";

  const hearingLines =
    (payload.hearingsSoon ?? [])
      .slice(0, 6)
      .map((h) => `- ${h.case_id} · ${h.category} · hearing on ${h.hearing_date}`)
      .join("\n") || "No hearings scheduled in the next 45 days.";

  const workloadLines =
    (payload.bureauWorkload ?? [])
      .map((b) => `- ${b.bureau}: ${b.count} open cases`)
      .join("\n") || "No bureau workload data.";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Draft a morning operations briefing for an AICTE ${payload.role.replaceAll("_", " ").toLowerCase()} (${payload.bureau.replaceAll("_", " ")}) named ${payload.name}, covering the live grievance portfolio.

Portfolio KPIs:
- Total received: ${payload.kpi.totalReceived}
- Pending scrutiny: ${payload.kpi.pending}
- Under process: ${payload.kpi.underProcess}
- Disposed: ${payload.kpi.disposed}
- Escalated: ${payload.kpi.escalated}
- Pending beyond statutory timeline (SLA breach): ${payload.kpi.pendingBeyondTimeline}
- Open inter-bureau overlap alerts: ${payload.kpi.openOverlapAlerts}
- Disposal rate: ${payload.disposalRate}%
- Average resolution: ${payload.avgResolutionDays} days

Urgent cases:
${urgentLines}

Upcoming hearings:
${hearingLines}

Bureau workload:
${workloadLines}

Return a JSON object with exactly these keys:
- headline: one punchy sentence (max 15 words) summarizing the day's posture
- situation: 2-4 sentences describing the current state, grounded in the numbers
- risks: array of 3-5 concrete risk flags (SLA breaches, overlaps, workload concentration)
- recommendedFocus: array of 3-5 prioritized actions for today, referencing specific case IDs where available
- tone: "STEADY" if healthy, "WATCHFUL" if risks are building, "URGENT" if breaches/overlaps demand immediate action

Do not invent numbers. Use only the data above.`,
    },
  ];

  return groqJson<DashboardBriefing>({ messages, temperature: 0.4, maxTokens: 2500 });
}

// ============================================================================
// 7. WORK QUEUE AI ADVICE
// ============================================================================

export interface QueueAdvice {
  advice: string;
  priorityOrder: Array<{ caseCode: string; reason: string }>;
  workloadNote: string;
}

export async function adviseQueue(payload: {
  mine: Array<{
    case_id: string;
    category: string;
    status: string;
    priority: string;
    institution_name: string;
    slaRemainingDays: number;
    slaBreached: boolean;
    slaApproaching: boolean;
    hearingDate: string | null;
    lastAction: string;
  }>;
  unassigned: Array<{ case_id: string; category: string; priority: string; slaRemainingDays: number }>;
  officerName: string;
  officerBureau: string;
}): Promise<{
  ok: boolean;
  data?: QueueAdvice;
  disabled?: boolean;
  error?: string;
}> {
  const mineLines =
    (payload.mine ?? [])
      .slice(0, 20)
      .map(
        (c) =>
          `- ${c.case_id} · ${c.category} · ${c.status} · ${c.priority} · ${c.slaBreached ? "SLA BREACHED" : c.slaApproaching ? "SLA approaching" : `${c.slaRemainingDays}d left`} · hearing: ${c.hearingDate ?? "none"} · last: ${c.lastAction}`
      )
      .join("\n") || "No cases assigned to you.";

  const unassignedLines =
    (payload.unassigned ?? [])
      .slice(0, 10)
      .map((c) => `- ${c.case_id} · ${c.category} · ${c.priority} · ${c.slaRemainingDays}d left`)
      .join("\n") || "No unassigned cases.";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Advise ${payload.officerName} (${payload.officerBureau.replaceAll("_", " ")}) on how to prioritize today's grievance work queue.

My assigned cases:
${mineLines}

Unassigned cases in my bureau's intake lane:
${unassignedLines}

Return a JSON object with exactly these keys:
- advice: 3-4 sentences of practical prioritization guidance
- priorityOrder: array of the 5 most important case registry numbers (use the exact case_id strings), each with a one-line reason. Order = do first to last.
- workloadNote: one sentence on workload balance (e.g. whether to pick up unassigned cases)

Ground everything in the case data above. SLA breach and hearings are the top drivers.`,
    },
  ];

  return groqJson<QueueAdvice>({ messages, temperature: 0.4, maxTokens: 2500 });
}

// ============================================================================
// 8. REPORTS EXECUTIVE SUMMARY
// ============================================================================

export interface ReportSummary {
  narrative: string;
  highlights: string[];
  concerns: string[];
  outlook: string;
}

export async function summarizeReports(payload: {
  disposalRate: number;
  slaCompliance: number;
  kpi: {
    totalReceived: number;
    pending: number;
    underProcess: number;
    disposed: number;
    escalated: number;
    pendingBeyondTimeline: number;
    openOverlapAlerts: number;
  };
  bureauScorecard: Array<{
    bureau: string;
    total: number;
    disposed: number;
    disposalRate: number;
    breachRate?: number;
  }>;
}): Promise<{
  ok: boolean;
  data?: ReportSummary;
  disabled?: boolean;
  error?: string;
}> {
  const scorecardLines =
    (payload.bureauScorecard ?? [])
      .map(
        (b) =>
          `- ${b.bureau}: ${b.disposed}/${b.total} disposed (${b.disposalRate}%)${typeof b.breachRate === "number" ? `, breach ${b.breachRate}%` : ""}`
      )
      .join("\n") || "No bureau scorecard available.";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Write an executive summary for an AICTE periodic performance report.

Portfolio KPIs:
- Total received: ${payload.kpi.totalReceived}
- Disposed: ${payload.kpi.disposed}
- Under process: ${payload.kpi.underProcess}
- Pending scrutiny: ${payload.kpi.pending}
- Escalated: ${payload.kpi.escalated}
- Pending beyond statutory timeline: ${payload.kpi.pendingBeyondTimeline}
- Open inter-bureau overlap alerts: ${payload.kpi.openOverlapAlerts}
- Disposal rate: ${payload.disposalRate}%
- SLA compliance: ${payload.slaCompliance}%

Bureau scorecard:
${scorecardLines}

Return a JSON object with exactly these keys:
- narrative: 4-6 sentence executive summary paragraph suitable for statutory reporting
- highlights: array of 3-5 positive performance points
- concerns: array of 3-5 concerns needing attention
- outlook: 1-2 sentences forward-looking outlook

Do not invent numbers. Use only the data above.`,
    },
  ];

  return groqJson<ReportSummary>({ messages, temperature: 0.4, maxTokens: 2500 });
}

// ============================================================================
// 9. NATURAL-LANGUAGE SEARCH PARSER
// ============================================================================

export interface ParsedSearchQuery {
  q: string | null;
  category: string | null;
  bureau: string | null;
  status: string | null;
  priority: string | null;
  region: string | null;
  institution_name: string | null;
  reasoning: string;
}

export async function parseSearchQuery(payload: {
  query: string;
  categories: string[];
  regions: string[];
}): Promise<{
  ok: boolean;
  data?: ParsedSearchQuery;
  disabled?: boolean;
  error?: string;
}> {
  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Convert a plain-language grievance search into structured filters for an AICTE case registry.

Known categories: ${payload.categories.join(", ")}
Known regions: ${payload.regions.join(", ")}
Allowed statuses: PENDING, UNDER_PROCESS, DISPOSED, TRANSFERRED, ESCALATED
Allowed bureaus: REGULATION_BUREAU, PGRC, APPROVAL_BUREAU, SKILL_CELL
Allowed priorities: LOW, MEDIUM, HIGH, CRITICAL

Search query: "${payload.query}"

Rules:
- Only set a filter if the query clearly expresses it; otherwise set null.
- "q" is any remaining free-text keyword worth matching against case text (or null).
- Categories must come from the known categories list.
- Regions must come from the known regions list.

Return a JSON object with exactly these keys:
- q, category, bureau, status, priority, region, institution_name (all string or null), reasoning (one short line explaining the mapping)`,
    },
  ];

  return groqJson<ParsedSearchQuery>({ messages, temperature: 0.1, maxTokens: 1500 });
}

/* ── Hearing-prep brief ──────────────────────────────────────────────────── */

export interface HearingBrief {
  opening_summary: string;
  key_facts: string[];
  statutory_position: string;
  likely_questions: string[];
  directions_to_seek: string[];
  documents_ready: string[];
  documents_pending: string[];
}

/**
 * Pre-hearing brief for a board sitting: grounded strictly in the file's
 * record — description, SLA position, action history and coordination
 * remarks. The officer walks into the sitting with a one-page brief; the
 * model organises, it does not invent.
 */
export async function briefHearing(payload: {
  caseCode: string;
  category: string;
  status: string;
  bureau: string;
  institutionName: string | null;
  city: string | null;
  state: string | null;
  hearingDate: string;
  description: string;
  slaRemainingDays: number;
  slaBreached: boolean;
  actions: Array<{
    action_type: string;
    actor_bureau: string;
    remarks: string;
    timestamp: string;
  }>;
}): Promise<{
  ok: boolean;
  data?: HearingBrief;
  disabled?: boolean;
  error?: string;
}> {
  const actionLines =
    payload.actions
      .slice(0, 12)
      .map(
        (a) =>
          `- [${a.timestamp.slice(0, 10)}] ${a.action_type} by ${a.actor_bureau}: ${a.remarks.slice(0, 220)}`
      )
      .join("\n") || "No recorded actions yet.";

  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Prepare the officer's brief for an upcoming AICTE hearing.

File: ${payload.caseCode} (${payload.category}, bureau ${payload.bureau})
Institution: ${payload.institutionName ?? "—"} (${payload.city ?? "—"}, ${payload.state ?? "—"})
Hearing date: ${payload.hearingDate}
Current status: ${payload.status}
Statutory clock: ${payload.slaBreached ? `BREACHED — ${Math.abs(payload.slaRemainingDays)} days overdue` : `${payload.slaRemainingDays} days remaining of the statutory window`}

Grievance:
"""${payload.description.slice(0, 1600)}"""

Action & coordination history (newest first):
${actionLines}

Return a JSON object with exactly these keys:
- opening_summary: 2-3 sentences the presiding officer can open the sitting with
- key_facts: array of 4-6 short factual bullets (dates, claims, actions taken) — no speculation
- statutory_position: 2-3 sentences on where the file stands against the statutory timeline and what is still owed
- likely_questions: array of 3-5 questions the hearing panel is likely to ask the bureau
- directions_to_seek: array of 2-4 concrete directions the bureau should ask the panel to issue
- documents_ready: array of document/record types already on file that support the case
- documents_pending: array of document/record types still to be obtained before the sitting
Keep every string grounded in the provided facts; mark anything unknown as "not on record".`,
    },
  ];

  return groqJson<HearingBrief>({ messages, temperature: 0.3, maxTokens: 3500 });
}

/* ── Institution response analyzer ──────────────────────────────────────── */

export type ResponseStance = "COMPLIANT" | "PARTIALLY_COMPLIANT" | "NON_COMPLIANT" | "EVASIVE";

export interface ResponseAnalysis {
  stance: ResponseStance;
  stance_reason: string;
  summary: string;
  commitments: string[];
  gaps: string[];
  recommended_action: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * Reads an institution's written compliance response against the grievance
 * it answers, and classifies the stance: compliant, partially compliant,
 * non-compliant, or evasive (acknowledging without committing). Deterministic
 * inputs; the model only classifies and structures what is written.
 */
export async function analyzeInstitutionResponse(payload: {
  caseCode: string;
  category: string;
  bureau: string;
  institutionName: string | null;
  status: string;
  grievanceText: string;
  responseText: string;
}): Promise<{
  ok: boolean;
  data?: ResponseAnalysis;
  disabled?: boolean;
  error?: string;
}> {
  const messages: GroqMessage[] = [
    { role: "system", content: SYSTEM_PREFIX },
    {
      role: "user",
      content: `Analyze an institution's written response to an AICTE grievance.

File: ${payload.caseCode} (${payload.category}, bureau ${payload.bureau})
Institution: ${payload.institutionName ?? "—"}
Desk status: ${payload.status}

The grievance it answers:
"""${payload.grievanceText.slice(0, 1400)}"""

The institution's response to analyze:
"""${payload.responseText.slice(0, 3000)}"""

Classify the stance:
- COMPLIANT: specific, verifiable remediation already done or dated commitments covering every demand
- PARTIALLY_COMPLIANT: some demands addressed, others deferred or unanswered
- NON_COMPLIANT: denies the grievance or refuses remediation outright
- EVASIVE: acknowledges receipt but commits to nothing specific, blames others, or only promises "review"

Return a JSON object with exactly these keys:
- stance: one of COMPLIANT, PARTIALLY_COMPLIANT, NON_COMPLIANT, EVASIVE
- stance_reason: 1-2 sentences citing what in the text drives the classification
- summary: 2-3 sentence neutral summary of what the institution actually says
- commitments: array of specific, dated or verifiable commitments found (empty if none)
- gaps: array of grievances demands the response does not address
- recommended_action: the single next step the bureau should take, grounded in the stance
- urgency: LOW, MEDIUM or HIGH — how quickly the bureau must react
Do not invent commitments or dates that are not in the response text.`,
    },
  ];

  return groqJson<ResponseAnalysis>({ messages, temperature: 0.2, maxTokens: 3000 });
}
