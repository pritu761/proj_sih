"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export async function markNotificationReadAction(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    const actor = session.user as unknown as SessionUser;
    await repository.markNotificationRead(id, actor);
    revalidatePath("/");
    revalidatePath("/alerts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
