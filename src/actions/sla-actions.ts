"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { hasRole, SessionUser } from "@/lib/rbac";

async function requireAdmin(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const user = session.user as unknown as SessionUser;
  return hasRole(user, ["ADMIN"]) ? user : null;
}

/** Inline edit/save of one statutory timeline. Admin-only at the action seam. */
export async function updateSlaConfigAction(data: {
  category: string;
  timeline_days: number;
  warning_threshold_percent: number;
}) {
  const actor = await requireAdmin();
  if (!actor) {
    return { success: false, error: "Administrator access required." };
  }

  try {
    const row = repository.updateSlaConfig(
      data.category,
      data.timeline_days,
      data.warning_threshold_percent,
      actor
    );
    revalidatePath("/sla-schedule");
    revalidatePath("/dashboard");
    return { success: true, row };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to save the SLA schedule.",
    };
  }
}

/** Restore one category (or the whole schedule) to its statutory defaults. */
export async function resetSlaConfigAction(data: { category?: string } = {}) {
  const actor = await requireAdmin();
  if (!actor) {
    return { success: false, error: "Administrator access required." };
  }

  try {
    const rows = repository.resetSlaConfig(actor, data.category);
    revalidatePath("/sla-schedule");
    revalidatePath("/dashboard");
    return { success: true, rows };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to reset the SLA schedule.",
    };
  }
}
