import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/AppShell";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const [notifications, metrics] = await Promise.all([
    repository.getNotifications(user),
    repository.getDashboardMetrics(user),
  ]);

  return (
    <AppShell user={user} notifications={notifications} openOverlapCount={metrics.kpi.openOverlapAlerts}>
      {children}
    </AppShell>
  );
}
