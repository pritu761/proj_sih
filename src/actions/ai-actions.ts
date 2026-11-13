"use server";

import { auth } from "@/auth";
import { SessionUser } from "@/lib/rbac";
import repository from "@/lib/services/repository";
import { computeBureauScorecard } from "@/lib/services/scorecard";
import { SLA_CONFIGS } from "@/lib/demo-data";
import {
  AiSummarizeCaseSchema,
  AiSuggestClassificationSchema,
  AiDraftReplySchema,
  AiTranslateSchema,
  AiExplainOverlapSchema,
  AiHearingBriefSchema,
  AiAnalyzeResponseSchema,
  AiCaseFiltersSchema,
  BureauEnum,
  CaseStatusEnum,
  CasePriorityEnum,
} from "@/lib/validations";
import {
  summarizeCase,
  suggestClassification,
  draftReply,
  translateText,
  explainOverlap,
  briefDashboard,
  adviseQueue,
  summarizeReports,
  parseSearchQuery,
  briefHearing,
  analyzeInstitutionResponse,
} from "@/lib/services/ai-engine";

async function requireActor(): Promise<SessionUser | { error: string }> {
  const session = await auth();
  if (!session?.user) {
    return { error: "Authentication required." };
  }
  return session.user as unknown as SessionUser;
}

/**
 * Generate an AI case summary from the case record, action history, and comments.
 */
export async function aiSummarizeCaseAction(data: { caseId: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiSummarizeCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = actor as SessionUser;
    const data_ = await repository.getCaseById(parsed.data.caseId, user);
    if (!data_?.caseItem) {
      return { success: false, disabled: false, error: "Case not found." };
    }

    const caseItem = data_.caseItem;
    const comments = await repository.getVisibleCaseComments(caseItem.case_id, user);

    const result = await summarizeCase({
      caseId: caseItem.id,
      caseCode: caseItem.case_id,
      category: caseItem.category,
      status: caseItem.status,
      priority: caseItem.priority,
      bureau: caseItem.assigned_bureau,
      description: caseItem.description,
      dateReceived: caseItem.date_received?.toISOString?.() ?? String(caseItem.date_received),
      language: caseItem.language ?? null,
      institutionName: caseItem.institution?.name ?? null,
      institutionCity: caseItem.institution?.city ?? null,
      institutionState: caseItem.institution?.state ?? null,
      actions: (caseItem.actions ?? []).map((a: any) => ({
        action_type: a.action_type,
        actor_user: a.actor_user,
        actor_bureau: a.actor_bureau,
        remarks: a.remarks,
        timestamp: a.timestamp?.toISOString?.() ?? String(a.timestamp),
      })),
      comments: (comments ?? []).map((c: any) => ({
        author_name: c.author_name,
        author_bureau: c.author_bureau,
        body: c.body,
        created_at: c.created_at?.toISOString?.() ?? String(c.created_at),
        scope: c.scope,
      })),
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to generate summary." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to summarize case." };
  }
}

/**
 * Suggest statutory category, bureau, and priority for a grievance description.
 */
export async function aiSuggestClassificationAction(data: {
  caseId?: string;
  description: string;
  language?: string;
  institutionState?: string;
  currentCategory?: string;
  currentBureau?: string;
  currentPriority?: string;
}) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiSuggestClassificationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const result = await suggestClassification({
      description: parsed.data.description,
      language: parsed.data.language ?? null,
      institutionState: parsed.data.institutionState ?? null,
      currentCategory: parsed.data.currentCategory ?? null,
      currentBureau: parsed.data.currentBureau ?? null,
      currentPriority: parsed.data.currentPriority ?? null,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to classify." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to classify case." };
  }
}

/**
 * Draft a formal reply / statutory notice to the complainant.
 */
export async function aiDraftReplyAction(data: {
  caseId: string;
  replyType: "ACKNOWLEDGEMENT" | "STATUS_UPDATE" | "RESOLUTION" | "SHOW_CAUSE" | "HEARING_NOTICE";
  language?: string;
  officerName?: string;
}) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiDraftReplySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = actor as SessionUser;
    const data_ = await repository.getCaseById(parsed.data.caseId, user);
    if (!data_?.caseItem) {
      return { success: false, disabled: false, error: "Case not found." };
    }

    const caseItem = data_.caseItem;
    const result = await draftReply({
      caseCode: caseItem.case_id,
      category: caseItem.category,
      status: caseItem.status,
      bureau: caseItem.assigned_bureau,
      description: caseItem.description,
      dateReceived: caseItem.date_received?.toISOString?.() ?? String(caseItem.date_received),
      complainantName: caseItem.complainant_name ?? null,
      institutionName: caseItem.institution?.name ?? null,
      replyType: parsed.data.replyType,
      language: parsed.data.language ?? null,
      officerName: parsed.data.officerName ?? null,
      institutionState: caseItem.institution?.state ?? null,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to draft reply." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to draft reply." };
  }
}

/**
 * Translate text between languages.
 */
export async function aiTranslateAction(data: { text: string; from: string; to: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiTranslateSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const result = await translateText({
      text: parsed.data.text,
      from: parsed.data.from,
      to: parsed.data.to,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to translate." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to translate text." };
  }
}

/**
 * Explain an overlap alert in plain language for coordination.
 */
export async function aiExplainOverlapAction(data: { alertId: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiExplainOverlapSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = actor as SessionUser;
    const alerts = await repository.getOverlapAlerts(user);
    const data_ = (alerts.find((o: any) => o.id === parsed.data.alertId) ?? {}) as any;
    if (!data_ || !data_.id) {
      return { success: false, disabled: false, error: "Overlap alert not found." };
    }

    const result = await explainOverlap({
      currentCaseCode: data_.cases?.[0]?.case_id ?? data_.case_ids?.[0] ?? "—",
      currentCategory: data_.cases?.[0]?.category ?? "—",
      currentBureau: data_.cases?.[0]?.assigned_bureau ?? "—",
      currentDescription: data_.cases?.[0]?.description ?? "—",
      collidingCaseCode: data_.cases?.[1]?.case_id ?? data_.case_ids?.[1] ?? "—",
      collidingCategory: data_.cases?.[1]?.category ?? "—",
      collidingBureau: data_.cases?.[1]?.assigned_bureau ?? "—",
      collidingDescription: data_.cases?.[1]?.description ?? "—",
      matchReasons: data_.match_reasons ?? null,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to explain overlap." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to explain overlap." };
  }
}

/**
 * AI morning briefing for the live grievance portfolio (dashboard card).
 */
export async function aiDashboardBriefingAction() {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  try {
    const user = actor as SessionUser;
    const [metrics, hearings] = await Promise.all([
      repository.getDashboardMetrics(user),
      repository.getUpcomingHearings(user, 45),
    ]);

    const result = await briefDashboard({
      kpi: metrics.kpi,
      disposalRate: metrics.disposalRate ?? 0,
      avgResolutionDays: metrics.avgResolutionDays ?? 0,
      urgentCases: (metrics.urgentCases ?? []).map((c: any) => ({
        case_id: c.case_id,
        category: c.category,
        priority: c.priority,
        institution_name: c.institution?.name ?? c.institution_name ?? "—",
      })),
      hearingsSoon: (hearings ?? []).map((h: any) => ({
        case_id: h.case_id,
        category: h.category,
        hearing_date: h.hearing_date
          ? new Date(h.hearing_date).toLocaleDateString("en-IN")
          : "—",
      })),
      bureauWorkload: (metrics.bureauWorkload ?? []).map((b: any) => ({
        bureau: b.bureau,
        count: (b.pending ?? 0) + (b.underProcess ?? 0) || (b.total ?? 0),
      })),
      role: user.role,
      bureau: user.bureau,
      name: user.name,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to brief." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to generate briefing." };
  }
}

/**
 * AI prioritization advice for the officer's work queue.
 */
export async function aiQueueAdviceAction() {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  try {
    const user = actor as SessionUser;
    const queue = await repository.getMyQueue(user);

    const result = await adviseQueue({
      mine: (queue.mine ?? []).map((c: any) => ({
        case_id: c.case_id,
        category: c.category,
        status: c.status,
        priority: c.priority,
        institution_name: c.institution_name ?? "—",
        slaRemainingDays: c.sla?.remainingDays ?? 0,
        slaBreached: Boolean(c.sla?.isBreached),
        slaApproaching: Boolean(c.sla?.isApproaching),
        hearingDate: c.hearing_date
          ? new Date(c.hearing_date).toLocaleDateString("en-IN")
          : null,
        lastAction: c.last_action ?? "—",
      })),
      unassigned: (queue.unassigned ?? []).map((c: any) => ({
        case_id: c.case_id,
        category: c.category,
        priority: c.priority,
        slaRemainingDays: c.sla?.remainingDays ?? 0,
      })),
      officerName: user.name,
      officerBureau: user.bureau,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to advise." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to generate queue advice." };
  }
}

/**
 * AI executive summary for the reports page.
 */
export async function aiReportSummaryAction() {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  try {
    const user = actor as SessionUser;
    const [metrics, casePage] = await Promise.all([
      repository.getDashboardMetrics(user),
      repository.getCases({ limit: 1000, page: 1 }, user),
    ]);

    const scorecard = computeBureauScorecard(
      casePage.cases.map((c: any) => ({
        case_id: c.case_id,
        status: c.status,
        assigned_bureau: c.assigned_bureau,
        date_received: c.date_received,
        last_action_date: c.last_action_date,
        category: c.category,
      }))
    );

    const kpi = metrics.kpi;
    const total = Math.max(1, kpi.totalReceived);
    const disposalRate = metrics.disposalRate ?? Math.round((kpi.disposed / total) * 100);
    const slaCompliance = Math.max(
      0,
      Math.round(100 - (kpi.pendingBeyondTimeline / total) * 100)
    );

    const result = await summarizeReports({
      disposalRate,
      slaCompliance,
      kpi,
      bureauScorecard: scorecard.map((b) => ({
        bureau: b.bureau,
        total: b.totalCases,
        disposed: b.disposed,
        disposalRate: b.disposalRatePercent,
        breachRate: b.totalCases > 0 ? Math.round((b.beyondTimeline / b.totalCases) * 100) : 0,
      })),
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to summarize." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to generate report summary." };
  }
}

/**
 * Parse a plain-language case-explorer query ("breached capitation cases older
 * than 30 days") into whitelisted query-builder filters. Every AI-returned
 * value is validated against the registry's allowed enums before it reaches
 * the URL, and SLA wording / date windows are extracted deterministically.
 */
export async function aiParseCaseFiltersAction(data: { query: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiCaseFiltersSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const query = parsed.data.query;
    const lower = query.toLowerCase();

    // SLA wording and date windows are parsed deterministically — the model is
    // not asked for them, so the phrasing stays reliable.
    const derived: Record<string, string> = {};
    if (/\b(approach\w*|nearing|near(ing)? (the )?(deadline|sla|expiry)|about to (breach|expire)|running out)\b/i.test(lower)) {
      derived.sla_status = "APPROACHING";
    } else if (/\b(breach\w*|overdue|past (the |its )?(deadline|sla|due date)|missed (the )?sla)\b/i.test(lower)) {
      derived.sla_status = "BREACHED";
    }
    const olderThan = lower.match(/older than (\d{1,3}) days?/);
    if (olderThan) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(olderThan[1], 10));
      derived.date_to = d.toISOString().slice(0, 10);
    }
    const recentWindow = lower.match(/(?:last|past|within) (?:the )?(\d{1,3}) days?/);
    if (recentWindow) {
      const d = new Date();
      d.setDate(d.getDate() - parseInt(recentWindow[1], 10));
      derived.date_from = d.toISOString().slice(0, 10);
    }

    const result = await parseSearchQuery({
      query,
      categories: SLA_CONFIGS.map((c: any) => c.category),
      regions: CASES_REGIONS,
    });
    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to read that query." };
    }

    const p = result.data;
    // Whitelist every AI-returned value against the query builder's enums.
    const filters: Record<string, string> = {};
    if (p.category && SLA_CONFIGS.some((c: any) => c.category === p.category)) {
      filters.category = p.category;
    }
    if (p.bureau && (BureauEnum.options as readonly string[]).includes(p.bureau)) {
      filters.bureau = p.bureau;
    }
    if (p.status && (CaseStatusEnum.options as readonly string[]).includes(p.status)) {
      filters.status = p.status;
    }
    if (p.priority && (CasePriorityEnum.options as readonly string[]).includes(p.priority)) {
      filters.priority = p.priority;
    }
    if (p.region && CASES_REGIONS.includes(p.region)) {
      filters.region = p.region;
    } else {
      // Indian states are not a registry filter; map the common ones to the
      // AICTE regional office named in the seed registry.
      for (const [state, region] of Object.entries(STATE_TO_REGION)) {
        if (lower.includes(state.toLowerCase())) {
          filters.region = region;
          break;
        }
      }
    }

    // Free text: model keywords + any institution name, sanitized for the URL.
    const qParts = [p.q, p.institution_name].filter(Boolean) as string[];
    const q = qParts.join(" ").replace(/["\\<>]/g, "").trim().slice(0, 80);
    if (q) filters.q = q;

    Object.assign(filters, derived);

    if (Object.keys(filters).length === 0) {
      return {
        success: false,
        disabled: false,
        error:
          "Could not map that to registry filters. Try naming a bureau, category, status, region, or SLA state.",
      };
    }

    return {
      success: true,
      disabled: false,
      data: { filters, reasoning: (p.reasoning ?? "").slice(0, 140) },
    };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to read that query." };
  }
}

/** Regions offered by the case explorer query builder. */
const CASES_REGIONS = [
  "Northern",
  "Western",
  "Southern",
  "Eastern",
  "Central",
  "North-Western",
  "South-Western",
];

/**
 * Pre-hearing brief for one board sitting: the AI organises the file's own
 * record (facts, statutory position, likely questions, directions to seek)
 * into a one-page brief the officer can walk into the hearing with.
 */
export async function aiHearingBriefAction(data: { caseId: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiHearingBriefSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = actor as SessionUser;
    const data_ = await repository.getCaseById(parsed.data.caseId, user);
    if (!data_?.caseItem) {
      return { success: false, disabled: false, error: "Case not found." };
    }

    const caseItem = data_.caseItem;
    const result = await briefHearing({
      caseCode: caseItem.case_id,
      category: caseItem.category,
      status: caseItem.status,
      bureau: caseItem.assigned_bureau,
      institutionName: caseItem.institution?.name ?? null,
      city: caseItem.institution?.city ?? null,
      state: caseItem.institution?.state ?? null,
      hearingDate: caseItem.hearing_date
        ? new Date(caseItem.hearing_date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
        : "unscheduled",
      description: caseItem.description,
      slaRemainingDays: caseItem.sla?.remainingDays ?? 0,
      slaBreached: Boolean(caseItem.sla?.isBreached),
      actions: (caseItem.actions ?? []).slice(0, 12).map((a: any) => ({
        action_type: a.action_type,
        actor_bureau: a.actor_bureau,
        remarks: a.remarks,
        timestamp:
          a.timestamp?.toISOString?.() ?? new Date(a.timestamp ?? Date.now()).toISOString(),
      })),
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to brief." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to generate the brief." };
  }
}

/**
 * Classify an institution's written compliance response (stance, commitments,
 * gaps, recommended next step). Text-input based: the demo's response documents
 * are scanned blobs, so the officer pastes the response text instead.
 */
export async function aiAnalyzeResponseAction(data: { caseId: string; responseText: string }) {
  const actor = await requireActor();
  if ("error" in actor) return { success: false, disabled: false, error: actor.error };

  const parsed = AiAnalyzeResponseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, disabled: false, error: parsed.error.issues[0].message };
  }

  try {
    const user = actor as SessionUser;
    const data_ = await repository.getCaseById(parsed.data.caseId, user);
    if (!data_?.caseItem) {
      return { success: false, disabled: false, error: "Case not found." };
    }

    const caseItem = data_.caseItem;
    const result = await analyzeInstitutionResponse({
      caseCode: caseItem.case_id,
      category: caseItem.category,
      bureau: caseItem.assigned_bureau,
      institutionName: caseItem.institution?.name ?? null,
      status: caseItem.status,
      grievanceText: caseItem.description,
      responseText: parsed.data.responseText,
    });

    if (result.disabled) {
      return {
        success: false,
        disabled: true,
        error: result.error || "AI features are not configured. Set GROQ_API_KEY.",
      };
    }
    if (!result.ok || !result.data) {
      return { success: false, disabled: false, error: result.error || "Failed to analyze." };
    }

    return { success: true, disabled: false, data: result.data };
  } catch (err: any) {
    return { success: false, disabled: false, error: err.message || "Failed to analyze the response." };
  }
}

/**
 * State mentions in plain-language queries, mapped to the AICTE regional
 * office that handles them in this registry (derived from the seeded
 * institution registry, not administrative geography).
 */
const STATE_TO_REGION: Record<string, string> = {
  "uttar pradesh": "Northern",
  uttarakhand: "Northern",
  bihar: "Northern",
  maharashtra: "Western",
  gujarat: "Western",
  goa: "Western",
  "tamil nadu": "Southern",
  "andhra pradesh": "Southern",
  telangana: "Southern",
  kerala: "Southern",
  puducherry: "Southern",
  karnataka: "South-Western",
  odisha: "Eastern",
  "west bengal": "Eastern",
  jharkhand: "Eastern",
  assam: "Eastern",
  meghalaya: "Eastern",
  "madhya pradesh": "Central",
  chhattisgarh: "Central",
  delhi: "North-Western",
  rajasthan: "North-Western",
  punjab: "North-Western",
  haryana: "North-Western",
  chandigarh: "North-Western",
};
