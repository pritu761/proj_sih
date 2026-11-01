"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import {
  UpdateStatusSchema,
  TransferCaseSchema,
  EscalateCaseSchema,
  AddRemarkSchema,
  LinkCasesSchema,
  CreateCaseSchema,
  AssignOfficerSchema,
  ScheduleHearingSchema,
  AddCaseCommentSchema,
  FieldVerificationSchema,
} from "@/lib/validations";
import { SessionUser } from "@/lib/rbac";

export async function updateCaseStatusAction(data: {
  caseId: string;
  status: "PENDING" | "UNDER_PROCESS" | "DISPOSED" | "TRANSFERRED" | "ESCALATED";
  remarks: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = UpdateStatusSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.updateCaseStatus(
      parsed.data.caseId,
      parsed.data.status,
      parsed.data.remarks,
      actor,
      parsed.data.attachments || []
    );

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${parsed.data.caseId}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update status." };
  }
}

export async function transferCaseAction(data: {
  caseId: string;
  toBureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL";
  remarks: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = TransferCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.transferCase(
      parsed.data.caseId,
      parsed.data.toBureau,
      parsed.data.remarks,
      actor,
      parsed.data.attachments || []
    );

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${parsed.data.caseId}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to transfer case." };
  }
}

export async function escalateCaseAction(data: {
  caseId: string;
  remarks: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = EscalateCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.escalateCase(
      parsed.data.caseId,
      parsed.data.remarks,
      actor,
      parsed.data.attachments || []
    );

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${parsed.data.caseId}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to escalate case." };
  }
}

export async function addRemarkAction(data: {
  caseId: string;
  remarks: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = AddRemarkSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.addRemark(
      parsed.data.caseId,
      parsed.data.remarks,
      parsed.data.attachments || [],
      actor
    );

    revalidatePath(`/cases/${parsed.data.caseId}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add remark." };
  }
}

export async function linkCasesAction(data: {
  caseAId: string;
  caseBId: string;
  linkType: "OVERLAP" | "DUPLICATE" | "RELATED";
  note?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = LinkCasesSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    await repository.linkCases(
      parsed.data.caseAId,
      parsed.data.caseBId,
      parsed.data.linkType,
      parsed.data.note,
      actor
    );

    revalidatePath(`/cases/${parsed.data.caseAId}`);
    revalidatePath(`/cases/${parsed.data.caseBId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to link cases." };
  }
}

export async function createCaseAction(data: {
  aicte_permanent_id: string;
  source: "student" | "faculty" | "stakeholder" | "public" | "other";
  category: string;
  description: string;
  assigned_bureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  complainant_name?: string;
  complainant_contact?: string;
  language?: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = CreateCaseSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const created = await repository.createCase(parsed.data, actor);

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath("/alerts");
    return { success: true, caseId: created.id, caseCode: created.case_id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create case." };
  }
}

export async function assignOfficerAction(data: {
  caseId: string;
  officerEmail: string;
  note?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = AssignOfficerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.assignOfficer(
      parsed.data.caseId,
      parsed.data.officerEmail,
      parsed.data.note || "",
      actor
    );

    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${parsed.data.caseId}`);
    revalidatePath("/workqueue");
    return {
      success: true,
      assignedOfficer: updated.assigned_officer,
      caseCode: updated.case_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to assign officer." };
  }
}

export async function scheduleHearingAction(data: {
  caseId: string;
  hearingDate: string | Date;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = ScheduleHearingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.scheduleHearing(
      parsed.data.caseId,
      parsed.data.hearingDate,
      actor
    );

    revalidatePath("/calendar");
    revalidatePath(`/cases/${parsed.data.caseId}`);
    revalidatePath("/cases");
    return {
      success: true,
      hearingDate: updated.hearing_date,
      caseCode: updated.case_id,
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to schedule hearing." };
  }
}

export async function addCaseCommentAction(data: {
  caseId: string;
  body: string;
  scope?: "COORDINATION" | "INTERNAL";
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = AddCaseCommentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const comment = await repository.addCaseComment(
      parsed.data.caseId,
      parsed.data.body,
      parsed.data.scope ?? "COORDINATION",
      actor
    );

    revalidatePath(`/cases/${parsed.data.caseId}`);
    return { success: true, commentId: comment.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to post comment." };
  }
}

export async function fieldVerificationAction(data: {
  caseId: string;
  findings: string;
  attachments?: string[];
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = FieldVerificationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.addFieldVerification(
      parsed.data.caseId,
      parsed.data.findings,
      actor,
      parsed.data.attachments || []
    );

    revalidatePath(`/cases/${parsed.data.caseId}`);
    revalidatePath("/cases");
    return { success: true, caseCode: updated.case_id };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to record field verification.",
    };
  }
}
