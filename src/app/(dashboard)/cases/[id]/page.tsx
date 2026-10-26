import { notFound } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { CaseDetailClient } from "@/components/cases/CaseDetailClient";
import { SessionUser } from "@/lib/rbac";

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  const { id } = await params;
  const data = await repository.getCaseById(id);

  if (!data) {
    notFound();
  }

  return (
    <CaseDetailClient
      caseItem={data.caseItem}
      linkedCases={data.linkedCases}
      overlapAlert={data.overlapAlert}
      collidingCase={data.collidingCase}
      currentUser={user}
    />
  );
}
