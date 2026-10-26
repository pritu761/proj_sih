import { NextResponse } from "next/server";
import repository from "@/lib/services/repository";

export async function GET() {
  const data = await repository.getInstitutions({ limit: 100 });
  return NextResponse.json(data.institutions);
}
