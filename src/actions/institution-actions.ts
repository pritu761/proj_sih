"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import {
  AddInstitutionDocumentSchema,
  RemoveInstitutionDocumentSchema,
} from "@/lib/validations";
import { SessionUser } from "@/lib/rbac";

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
