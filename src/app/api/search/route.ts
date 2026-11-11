import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";
import { parseSearchQuery } from "@/lib/services/ai-engine";
import { SLA_CONFIGS } from "@/lib/demo-data";

const MAX_QUERY_LENGTH = 80;
// Minimum length for a query to be worth an AI semantic parse (below this the
// deterministic substring search is almost always the right interpretation).
const NL_MIN_LENGTH = 12;

const REGIONS = ["Northern", "Western", "Southern", "Eastern", "Central"];
const CATEGORIES = SLA_CONFIGS.map((c: any) => c.category);

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ cases: [], institutions: [] }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);

  const results = await repository.search(q, user);

  // Deterministic search hit (or trivially short query) — return as-is.
  if (results.cases.length > 0 || results.institutions.length > 0 || q.length < NL_MIN_LENGTH) {
    return NextResponse.json(results);
  }

  // Zero hits: fall back to AI natural-language parsing so plain-language
  // queries like "capitation fee complaints in Karnataka" still return cases.
  try {
    const parsed = await parseSearchQuery({ query: q, categories: CATEGORIES, regions: REGIONS });
    if (!parsed.ok || !parsed.data) {
      return NextResponse.json(results);
    }

    const p = parsed.data;
    const filters: Record<string, any> = { limit: 6, page: 1 };
    if (p.category) filters.category = p.category;
    if (p.bureau) filters.bureau = p.bureau;
    if (p.status) filters.status = p.status;
    if (p.priority) filters.priority = p.priority;
    if (p.region) filters.region = p.region;
    if (p.institution_name) filters.institution_name = p.institution_name;
    if (p.q) filters.q = p.q;

    // Only spend a case query when the AI actually extracted a structured filter.
    const hasStructuredFilter =
      p.category || p.bureau || p.status || p.priority || p.region || p.institution_name;
    if (!hasStructuredFilter) {
      return NextResponse.json(results);
    }

    const page = await repository.getCases(filters, user);
    const cases = (page.cases ?? []).map((c: any) => ({
      id: c.id,
      case_id: c.case_id,
      category: c.category,
      status: c.status,
      priority: c.priority,
      bureau: c.assigned_bureau,
      institution_name: c.institution?.name ?? c.institution_name ?? "Unknown institution",
      city: c.institution?.city ?? c.institution_city ?? "",
      remainingDays: c.sla?.remainingDays ?? 0,
      isBreached: Boolean(c.sla?.isBreached),
    }));

    return NextResponse.json({ cases, institutions: [] });
  } catch {
    // AI layer must never break the palette — degrade to the empty result.
    return NextResponse.json(results);
  }
}
