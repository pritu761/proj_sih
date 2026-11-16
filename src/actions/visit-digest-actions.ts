"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

/**
 * Dismisses the login "what changed" digest for the signed-in officer by
 * advancing their last-seen marker. The digest itself is computed read-only,
 * so this is the only mutation in the flow; the dashboard is revalidated so a
 * fresh visit renders the new marker (and a fresh window).
 */
export async function dismissVisitDigestAction() {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    repository.markVisitSeen(actor);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
