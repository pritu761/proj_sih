import { NextRequest, NextResponse } from "next/server";
import repository from "@/lib/services/repository";
import { isAuthorizedCron } from "@/lib/cron-auth";

/**
 * Daily auto-escalation sweep. Deterministic rule engine (see
 * src/lib/services/escalation-engine.ts): files breached past the grace
 * window are escalated to the Competent Authority with a generated memo.
 * Scheduled at 04:00 UTC in vercel.json — after the 03:30 intake, so a file
 * that "arrived" this morning is never escalated on day zero.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const force = req.nextUrl.searchParams.get("force") === "1";
  const summary = await repository.runAutoEscalationNow(force);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    day: summary.day,
    checked: summary.checked,
    escalated: summary.escalated,
    alreadyEscalated: summary.alreadyEscalated,
    graceDays: summary.graceDays,
    cases: summary.items.slice(0, 10).map((i) => ({
      case_id: i.case_id,
      bureau: i.bureau,
      breachDays: i.breachDays,
    })),
  });
}
