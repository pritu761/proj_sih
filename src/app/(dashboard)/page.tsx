import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { SessionUser } from "@/lib/rbac";

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);

  return (
    <DashboardClient
      initialMetrics={metrics}
      userRole={user.role}
      userBureau={user.bureau}
    />
  );
}
