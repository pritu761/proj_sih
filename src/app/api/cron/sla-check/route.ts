import { NextRequest, NextResponse } from "next/server";
import repository from "@/lib/services/repository";
import { calculateCaseSla } from "@/lib/services/sla-engine";
import { isAuthorizedCron } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const allCasesRes = await repository.getCases({ limit: 1000 });
  const activeCases = allCasesRes.cases.filter((c) => c.status !== "DISPOSED");

  let breachedCount = 0;
  let approachingCount = 0;
  const notificationsCreated: string[] = [];

  for (const c of activeCases) {
    const sla = calculateCaseSla(c.category, c.date_received, c.status);

    if (sla.isBreached) {
      breachedCount++;
      notificationsCreated.push(`Breach Alert: ${c.case_id} (${Math.abs(sla.remainingDays)}d overdue)`);
    } else if (sla.isApproaching) {
      approachingCount++;
      notificationsCreated.push(`Approaching SLA: ${c.case_id} (${sla.remainingDays}d left)`);
    }
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    checkedCases: activeCases.length,
    breachedCount,
    approachingCount,
    notificationsCreated: notificationsCreated.slice(0, 10),
  });
}
