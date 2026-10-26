import { auth } from "@/auth";
import { AlertsClient } from "@/components/alerts/AlertsClient";
import { SessionUser } from "@/lib/rbac";
import { generateSeedData } from "@/lib/mock-data-generator";

export default async function AlertsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  const { institutions, overlapAlerts } = generateSeedData();

  // Attach institution details
  const alertsWithInst = overlapAlerts.map((a) => {
    const inst = institutions.find((i) => i.id === a.institution_id);
    return {
      ...a,
      institution: inst,
    };
  });

  return (
    <AlertsClient
      initialAlerts={alertsWithInst}
      currentUser={user}
    />
  );
}
