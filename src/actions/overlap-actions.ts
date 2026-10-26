"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { CoordinateOverlapSchema, DismissOverlapSchema } from "@/lib/validations";
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

    revalidatePath("/");
    revalidatePath("/alerts");
    revalidatePath("/institutions");
    revalidatePath("/cases");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to coordinate alert." };
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

    revalidatePath("/");
    revalidatePath("/alerts");
    revalidatePath("/institutions");
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to dismiss alert." };
  }
}
