import { NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;
  const metrics = await repository.getDashboardMetrics(user);
  return NextResponse.json(metrics);
}
