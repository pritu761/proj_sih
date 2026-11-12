import { NextRequest, NextResponse } from "next/server";
import repository from "@/lib/services/repository";
import { isAuthorizedCron } from "@/lib/cron-auth";

/**
 * Daily synthetic intake — registers a fresh batch of grievances so the
 * demonstration registry grows every day. Scheduled daily in vercel.json;
 * locally, any dev-server request (or manual call) with no CRON_SECRET
 * configured can trigger it.
 *
 * Idempotent per UTC day: the store's `lastDailyIntake` marker skips repeats,
 * and boots after missed days catch up (capped) with back-dated arrivals.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const summary = await repository.runDailyIntakeNow(force);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    ...summary,
  });
}
