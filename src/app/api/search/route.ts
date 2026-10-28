import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

const MAX_QUERY_LENGTH = 80;

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ cases: [], institutions: [] }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const q = rawQuery.trim().slice(0, MAX_QUERY_LENGTH);

  const results = await repository.search(q, user);
  return NextResponse.json(results);
}
