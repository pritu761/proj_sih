import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ cases: [], institutions: [] }, { status: 401 });
  }

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await repository.search(q);
  return NextResponse.json(results);
}
