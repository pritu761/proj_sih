import { NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { buildAuditChain } from "@/lib/services/audit-chain";
import { SessionUser } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser | undefined;

  if (!user || (user.role !== "ADMIN" && user.role !== "COMPETENT_AUTHORITY")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const started = Date.now();
  const logs = await repository.getAuditLogs();
  const chain = buildAuditChain(logs);

  return NextResponse.json({
    valid: chain.valid,
    count: chain.count,
    head: chain.head,
    genesis: chain.genesis,
    algorithm: chain.algorithm,
    brokenAt: chain.brokenAt,
    checkedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
  });
}
