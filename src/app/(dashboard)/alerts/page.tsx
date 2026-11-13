import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { AlertsClient } from "@/components/alerts/AlertsClient";
import { MergeQueue } from "@/components/alerts/MergeQueue";
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
  const mergeSuggestions = repository.getMergeSuggestions(user);

  return (
    <div className="space-y-5">
      <AlertsClient initialAlerts={alerts} currentUser={user} />
      <MergeQueue suggestions={mergeSuggestions} currentUser={user} />
    </div>
  );
}
