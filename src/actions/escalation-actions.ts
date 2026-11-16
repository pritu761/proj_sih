"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { hasRole, Role, SessionUser } from "@/lib/rbac";

const REVIEWERS: Role[] = ["ADMIN", "COMPETENT_AUTHORITY"];

/** Admin/Authority-only manual sweep — forces a re-check of breached files. */
export async function runAutoEscalationSweepAction() {
  const session = await auth();
  const actor = session?.user as unknown as SessionUser | undefined;
  if (!hasRole(actor, REVIEWERS)) {
    return { success: false, error: "Only the Administrator or Competent Authority can run a sweep." };
  }

  try {
    const summary = await repository.runAutoEscalationNow(true);
    revalidatePath("/escalation");
    revalidatePath("/dashboard");
    return { success: true, summary };
  } catch (err: any) {
    return { success: false, error: err.message || "The escalation sweep failed." };
  }
}

/** Record the authority's direction on an escalated file's timeline. */
export async function recordAuthorityDirectionAction(
  caseId: string,
  remark: string
) {
  const session = await auth();
  const actor = session?.user as unknown as SessionUser | undefined;
  if (!hasRole(actor, REVIEWERS)) {
    return { success: false, error: "Only the Administrator or Competent Authority can record directions." };
  }

  const text = remark.trim();
  if (!text) {
    return { success: false, error: "Enter a direction before recording it." };
  }

  try {
    await repository.addRemark(caseId, text, [], actor!);
    revalidatePath("/escalation");
    revalidatePath(`/cases/${caseId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Could not record the direction." };
  }
}
