"use server";

import { auth } from "@/auth";
import { SessionUser } from "@/lib/rbac";
import repository from "@/lib/services/repository";
import { computeBureauScorecard } from "@/lib/services/scorecard";
import { AiSummarizeCaseSchema, AiSuggestClassificationSchema, AiDraftReplySchema, AiTranslateSchema, AiExplainOverlapSchema } from "@/lib/validations";
import {
  summarizeCase,
  suggestClassification,
  draftReply,
  translateText,
  explainOverlap,
  briefDashboard,
  adviseQueue,
  summarizeReports,
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
