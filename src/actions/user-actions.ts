"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import repository from "@/lib/services/repository";
import { CreateUserSchema, ResetUserPasswordSchema, UpdateUserSchema } from "@/lib/validations";
import { SessionUser } from "@/lib/rbac";

async function requireActor() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as unknown as SessionUser;
}

export async function createUserAction(data: {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "COMPETENT_AUTHORITY" | "REGULATION_OFFICER" | "PGRC_OFFICER" | "BUREAU_OFFICER" | "REGIONAL_OFFICER";
  bureau: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL" | "ALL";
  region?: string | null;
  designation?: string | null;
}) {
  const actor = await requireActor();
  if (!actor) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = CreateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const created = await repository.createUser(parsed.data, actor);
    revalidatePath("/users");
    return { success: true, userId: created.id, email: created.email };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create the account." };
  }
}

export async function updateUserAction(data: {
  userId: string;
  role?: "ADMIN" | "COMPETENT_AUTHORITY" | "REGULATION_OFFICER" | "PGRC_OFFICER" | "BUREAU_OFFICER" | "REGIONAL_OFFICER";
  bureau?: "REGULATION_BUREAU" | "PGRC" | "APPROVAL_BUREAU" | "SKILL_CELL" | "ALL";
  region?: string | null;
  designation?: string | null;
  active?: boolean;
}) {
  const actor = await requireActor();
  if (!actor) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = UpdateUserSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await repository.updateUser(parsed.data.userId, parsed.data, actor);
    revalidatePath("/users");
    revalidatePath("/workqueue");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update the account." };
  }
}

export async function resetUserPasswordAction(data: {
  userId: string;
  password: string;
}) {
  const actor = await requireActor();
  if (!actor) {
    return { success: false, error: "Authentication required." };
  }

  const parsed = ResetUserPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    await repository.resetUserPassword(parsed.data.userId, parsed.data.password, actor);
    revalidatePath("/users");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to reset the password." };
  }
}
