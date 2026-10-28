import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { formatDate } from "@/lib/utils";
import { SessionUser } from "@/lib/rbac";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const searchParams = req.nextUrl.searchParams;
  const casesRes = await repository.getCases(
    {
      q: searchParams.get("q") || undefined,
      bureau: searchParams.get("bureau") || undefined,
      region: searchParams.get("region") || undefined,
      category: searchParams.get("category") || undefined,
      status: searchParams.get("status") || undefined,
      priority: searchParams.get("priority") || undefined,
      sla_status: (searchParams.get("sla_status") as any) || undefined,
      limit: 5000,
    },
    user
  );

  const headers = [
    "Case ID",
    "AICTE Permanent ID",
    "Institution Name",
    "City",
    "State",
    "Region",
    "Assigned Bureau",
    "Category",
    "Status",
    "Priority",
    "SLA Status",
    "Date Received",
    "Last Action",
  ];

  const escapeCsv = (str: string | null | undefined) => {
    if (!str) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = casesRes.cases.map((c) => [
    escapeCsv(c.case_id),
    escapeCsv(c.institution?.aicte_permanent_id),
    escapeCsv(c.institution?.name),
    escapeCsv(c.institution?.city),
    escapeCsv(c.institution?.state),
    escapeCsv(c.institution?.region),
    escapeCsv(c.assigned_bureau),
    escapeCsv(c.category),
    escapeCsv(c.status),
    escapeCsv(c.priority),
    escapeCsv(c.sla.statusText),
    escapeCsv(formatDate(c.date_received)),
    escapeCsv(c.last_action),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aicte_complaints_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
