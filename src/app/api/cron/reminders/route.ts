import { NextRequest, NextResponse } from "next/server";
import repository from "@/lib/services/repository";
import { isAuthorizedCron } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const casesRes = await repository.getCases({ limit: 500 });
  const pendingCases = casesRes.cases.filter((c) => c.status === "PENDING");

  const now = new Date().getTime();
  const inactivePending = pendingCases.filter((c) => {
    const elapsedDays = (now - new Date(c.date_received).getTime()) / (1000 * 60 * 60 * 24);
    return elapsedDays > 7;
  });

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalPendingChecked: pendingCases.length,
    dormantCasesCount: inactivePending.length,
    remindedCaseIds: inactivePending.slice(0, 10).map((c) => c.case_id),
  });
}
