"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";
import { SimulateIngestionSchema } from "@/lib/validations";
import {
  INGESTION_CHANNELS,
  routeComplaint,
  type IngestionChannel,
  type RoutedBureau,
} from "@/lib/services/ingestion-engine";

const BUREAU_LABEL: Record<RoutedBureau, string> = {
  REGULATION_BUREAU: "Regulation Bureau",
  PGRC: "Public Grievance Redressal Cell",
  APPROVAL_BUREAU: "Approval Bureau",
  SKILL_CELL: "Skill Development Cell",
};

export async function simulateIngestionAction(data: {
  channel: IngestionChannel;
  aicte_permanent_id: string;
  category: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  assigned_bureau?: RoutedBureau;
  complainant_reference?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "Authentication required." };
  }

  const actor = session.user as unknown as SessionUser;
  if (actor.role === "REGIONAL_OFFICER") {
    return {
      success: false as const,
      error:
        "Regional Officers are read-only observers. Sign in as AICTE HQ Admin, the competent authority, or a bureau officer to inject a live grievance.",
    };
  }

  const parsed = SimulateIngestionSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const decision = routeComplaint({
    category: parsed.data.category,
    channel: parsed.data.channel,
  });

  // A bureau-bound officer may only register files for their own bureau. The
  // router still explains the statutory destination, while the case is queued
  // under the officer's bureau so RBAC remains intact during the demo.
  let assignedBureau: RoutedBureau = parsed.data.assigned_bureau ?? decision.bureau;
  let ownershipNote: string | null = null;
  if (actor.role === "REGULATION_OFFICER") {
    assignedBureau = "REGULATION_BUREAU";
  } else if (actor.role === "PGRC_OFFICER") {
    assignedBureau = "PGRC";
  } else if (actor.role === "BUREAU_OFFICER") {
    if (actor.bureau === "ALL") {
      return {
        success: false as const,
        error: "This account has no bureau allocation for complaint registration.",
      };
    }
    assignedBureau = actor.bureau as RoutedBureau;
  }
  if (assignedBureau !== decision.bureau) {
    ownershipNote = `Routed to ${BUREAU_LABEL[decision.bureau]} by policy, queued under ${BUREAU_LABEL[assignedBureau]} because of your bureau allocation.`;
  }

  const source =
    INGESTION_CHANNELS.find((c) => c.key === parsed.data.channel)?.source ??
    "public";

  try {
    const created = await repository.createCase(
      {
        aicte_permanent_id: parsed.data.aicte_permanent_id,
        source,
        category: parsed.data.category,
        description: parsed.data.description,
        assigned_bureau: assignedBureau,
        priority: parsed.data.priority ?? decision.priority,
      },
      actor
    );

    const institutionData = await repository.getInstitutionById(
      parsed.data.aicte_permanent_id,
      actor
    );

    const allAlerts = await repository.getOverlapAlerts(actor);
    const alerts = allAlerts.filter((alert) =>
      alert.case_ids.includes(created.case_id)
    );

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath("/alerts");
    revalidatePath("/institutions");

    return {
      success: true as const,
      caseId: created.id,
      caseCode: created.case_id,
      institutionName: institutionData?.institution.name ?? "Institution",
      institutionCity: institutionData?.institution.city ?? "",
      institutionState: institutionData?.institution.state ?? "",
      aictePermanentId: parsed.data.aicte_permanent_id,
      channel: parsed.data.channel,
      channelLabel:
        INGESTION_CHANNELS.find((c) => c.key === parsed.data.channel)?.label ??
        parsed.data.channel,
      bureau: assignedBureau,
      bureauLabel: BUREAU_LABEL[assignedBureau],
      routedBureau: decision.bureau,
      routedBureauLabel: BUREAU_LABEL[decision.bureau],
      bureauCode: decision.bureauCode,
      priority: parsed.data.priority ?? decision.priority,
      slaDays: decision.slaDays,
      regulatory: decision.regulatory,
      rationale: [...decision.rationale, ...(ownershipNote ? [ownershipNote] : [])],
      expectedDisposal: created.expected_disposal_date.toISOString(),
      alerts: alerts.map((alert) => ({
        id: alert.id,
        confidence: alert.confidence,
        case_ids: alert.case_ids,
        bureaus_involved: alert.bureaus_involved,
        detected_at: alert.detected_at,
        trilayer: alert.trilayer,
        match_reasons: alert.match_reasons,
      })),
    };
  } catch (error: any) {
    return {
      success: false as const,
      error: error?.message || "Unable to inject the grievance.",
    };
  }
}
