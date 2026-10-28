import { NextResponse } from "next/server";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as unknown as SessionUser;
  const region =
    user.role === "REGIONAL_OFFICER" ? user.region ?? undefined : undefined;

  const data = await repository.getInstitutions({ limit: 100, region });
  return NextResponse.json(data.institutions);
}
