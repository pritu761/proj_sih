import { NextRequest, NextResponse } from "next/server";
import repository from "@/lib/services/repository";
import { overlapDetector } from "@/lib/services/overlap-detector";
import { isAuthorizedCron } from "@/lib/cron-auth";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized cron trigger" }, { status: 401 });
  }

  const casesRes = await repository.getCases({ limit: 500 });
  const activeCases = casesRes.cases.filter((c) => c.status !== "DISPOSED");

  const formattedCases = activeCases.map((c) => ({
    id: c.id,
    case_id: c.case_id,
    institution_id: c.institution_id,
    institution_aicte_id: c.institution?.aicte_permanent_id,
    institution_name: c.institution?.name,
    institution_normalized_name: c.institution?.normalized_name,
    institution_city: c.institution?.city,
    institution_state: c.institution?.state,
    institution_pincode: c.institution?.pincode,
    category: c.category,
    description: c.description,
    assigned_bureau: c.assigned_bureau,
    status: c.status,
  }));

  const detectedCandidates = await overlapDetector.batchScan(formattedCases);

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    scannedCasesCount: activeCases.length,
    detectedOverlapsCount: detectedCandidates.length,
    sampleOverlaps: detectedCandidates.slice(0, 5),
  });
}
