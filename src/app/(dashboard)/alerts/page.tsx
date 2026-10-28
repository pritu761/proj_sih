import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { AlertsClient } from "@/components/alerts/AlertsClient";
import { SessionUser } from "@/lib/rbac";

export default async function AlertsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;

  // Read from the shared repository store (not a fresh seed) so coordinate and
  // dismiss actions persist across refreshes and are region-scoped.
  const alerts = await repository.getOverlapAlerts(user);

  return <AlertsClient initialAlerts={alerts} currentUser={user} />;
}
