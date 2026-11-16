"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import {
  AddInstitutionDocumentSchema,
  RemoveInstitutionDocumentSchema,
  CreateInstitutionSchema,
  UpdateInstitutionSchema,
  MergeInstitutionsSchema,
  AddInstitutionAliasSchema,
  RemoveInstitutionAliasSchema,
} from "@/lib/validations";
import { SessionUser } from "@/lib/rbac";

/**
 * Institution master-data actions. Authentication is required for all of
 * them; the repository applies the documented RBAC rule (create/merge ADMIN
 * only, edit/alias ADMIN or bureau officer) against the live session user.
 */

export async function createInstitutionAction(data: {
  name: string;
  aicte_permanent_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  region: string;
  institution_type: string;
  contact_email?: string;
  contact_phone?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = CreateInstitutionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const created = await repository.createInstitution(parsed.data, actor);
    revalidatePath("/institutions");
    revalidatePath(`/institutions/${created.id}`);
    return { success: true, institutionId: created.id, data: created };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create institution." };
  }
}

export async function updateInstitutionAction(data: {
  institutionId: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  region?: string;
  institution_type?: string;
  contact_email?: string;
  contact_phone?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = UpdateInstitutionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const { institutionId, ...patch } = parsed.data;
    const updated = await repository.updateInstitution(institutionId, patch, actor);
    revalidatePath("/institutions");
    revalidatePath(`/institutions/${institutionId}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update institution." };
  }
}

export async function addInstitutionAliasAction(data: {
  institutionId: string;
  alias: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = AddInstitutionAliasSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.addInstitutionAlias(
      parsed.data.institutionId,
      parsed.data.alias,
      actor
    );
    revalidatePath(`/institutions/${parsed.data.institutionId}`);
    revalidatePath("/institutions");
    return { success: true, aliases: updated.aliases ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add alias." };
  }
}

export async function removeInstitutionAliasAction(data: {
  institutionId: string;
  alias: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = RemoveInstitutionAliasSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.removeInstitutionAlias(
      parsed.data.institutionId,
      parsed.data.alias,
      actor
    );
    revalidatePath(`/institutions/${parsed.data.institutionId}`);
    revalidatePath("/institutions");
    return { success: true, aliases: updated.aliases ?? [] };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove alias." };
  }
}

export async function mergeInstitutionsAction(data: {
  sourceId: string;
  targetId: string;
  reason: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = MergeInstitutionsSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const result = await repository.mergeInstitutions(
      parsed.data.sourceId,
      parsed.data.targetId,
      actor,
      parsed.data.reason
    );
    revalidatePath("/institutions");
    revalidatePath(`/institutions/${result.target.id}`);
    revalidatePath(`/institutions/${result.source.id}`);
    revalidatePath("/cases");
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to merge institutions." };
  }
}

export async function addInstitutionDocumentAction(data: {
  institutionId: string;
  title: string;
  docType:
    | "APPROVAL_LETTER"
    | "COMPLIANCE_REPORT"
    | "AUDIT_STATEMENT"
    | "SHOW_CAUSE_NOTICE"
    | "COURT_ORDER"
    | "FINANCIAL_RECORD"
    | "OTHER";
  blobUrl: string;
  fileName: string;
  fileSize: number;
  notes?: string;
  linkedCase?: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = AddInstitutionDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const doc = await repository.addInstitutionDocument(
      {
        institution_id: parsed.data.institutionId,
        title: parsed.data.title,
        doc_type: parsed.data.docType,
        blob_url: parsed.data.blobUrl,
        file_name: parsed.data.fileName,
        file_size: parsed.data.fileSize,
        notes: parsed.data.notes,
        case_id: parsed.data.linkedCase,
      },
      actor
    );

    revalidatePath(`/institutions/${parsed.data.institutionId}`);
    revalidatePath("/institutions");
    return { success: true, documentId: doc.id };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to add the document." };
  }
}

export async function removeInstitutionDocumentAction(data: {
  documentId: string;
  institutionId: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = RemoveInstitutionDocumentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    await repository.removeInstitutionDocument(parsed.data.documentId, actor);
    revalidatePath(`/institutions/${data.institutionId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove the document." };
  }
}
