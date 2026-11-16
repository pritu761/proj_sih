import { NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);
  // Honest freshness: stamp the moment this payload was actually served. The
  // dashboard reads this server timestamp instead of a mount-time client Date.
  return NextResponse.json({
    ...metrics,
    generatedAt: new Date().toISOString(),
  });
}
