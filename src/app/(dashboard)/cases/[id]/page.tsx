import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { CaseDetailClient } from "@/components/cases/CaseDetailClient";
import { SessionUser } from "@/lib/rbac";
import { assessInstitutionCompliance } from "@/lib/services/aph-engine";

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const { id } = await params;
  const [data, insight] = await Promise.all([
    repository.getCaseById(id, user),
    repository.getCaseInsight(id),
  ]);

  if (!data) {
    notFound();
  }

  const institutionData = data.caseItem.institution
    ? await repository.getInstitutionById(data.caseItem.institution.id, user)
    : null;

  const compliance = institutionData
    ? assessInstitutionCompliance(
        institutionData.institution,
        institutionData.cases,
        institutionData.overlapAlerts
      )
    : null;

  return (
    <CaseDetailClient
      caseItem={data.caseItem}
      linkedCases={data.linkedCases}
      overlapAlert={data.overlapAlert}
      collidingCase={data.collidingCase}
      currentUser={user}
      insight={insight}
      compliance={compliance}
    />
  );
}
