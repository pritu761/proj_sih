"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import {
  CoordinateOverlapSchema,
  DismissOverlapSchema,
  MergeOverlapSchema,
  MergeSuggestionActionSchema,
  DismissMergeSuggestionSchema,
} from "@/lib/validations";
import { SessionUser } from "@/lib/rbac";

export async function coordinateOverlapAction(data: {
  alertId: string;
  coordinationNote: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = CoordinateOverlapSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.coordinateOverlapAlert(
      parsed.data.alertId,
      parsed.data.coordinationNote,
      actor
    );

    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/institutions");
    revalidatePath("/cases");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to coordinate alert." };
  }
}

export async function mergeOverlapAction(data: {
  alertId: string;
  masterCaseId: string;
  mergeNote: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = MergeOverlapSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const merged = await repository.mergeOverlapAlert(
      parsed.data.alertId,
      parsed.data.masterCaseId,
      parsed.data.mergeNote,
      actor
    );

    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/cases");
    revalidatePath(`/cases/${merged.masterInternalId}`);
    revalidatePath("/institutions");
    return { success: true, data: merged };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to merge collision." };
  }
}

export async function dismissOverlapAction(data: {
  alertId: string;
  dismissedReason: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = DismissOverlapSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const updated = await repository.dismissOverlapAlert(
      parsed.data.alertId,
      parsed.data.dismissedReason,
      actor
    );

    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/institutions");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to dismiss alert." };
  }
}

/**
 * Same-bureau duplicate queue: merges a suggested pair into one master docket
 * (default: the earliest-filed side) and records the officer's decision.
 */
export async function mergeSuggestionAction(data: {
  pairKey: string;
  masterCaseId: string;
  mergeNote: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = MergeSuggestionActionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const merged = await repository.mergeSuggestionCases(
      parsed.data.pairKey,
      parsed.data.masterCaseId,
      parsed.data.mergeNote,
      actor
    );

    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/cases");
    revalidatePath(`/cases/${merged.masterInternalId}`);
    return { success: true, data: merged };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to merge the duplicate pair." };
  }
}

/** Records an officer's review decision: these two filings are not duplicates. */
export async function dismissMergeSuggestionAction(data: {
  pairKey: string;
  reason: string;
}) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = DismissMergeSuggestionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    const dismissed = await repository.dismissMergeSuggestion(
      parsed.data.pairKey,
      parsed.data.reason,
      actor
    );

    revalidatePath("/dashboard");
    revalidatePath("/alerts");
    revalidatePath("/cases");
    return { success: true, data: dismissed };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to dismiss the merge suggestion.",
    };
  }
}
