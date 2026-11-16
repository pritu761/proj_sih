import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SessionUser } from "@/lib/rbac";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);
  // Read-only digest — computing it never advances the officer's last-seen
  // marker. It is already JSON-serializable (all dates are ISO strings).
  const visitDigest = repository.getVisitDigest(user);

  return (
    <DashboardClient
      initialMetrics={metrics}
      userRole={user.role}
      userBureau={user.bureau}
      userName={user.name}
      visitDigest={visitDigest}
    />
  );
}
