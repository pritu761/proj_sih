"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";

export async function markNotificationReadAction(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Authentication required." };
  }

  try {
    await repository.markNotificationRead(id);
    revalidatePath("/");
    revalidatePath("/alerts");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
