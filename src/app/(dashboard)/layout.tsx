import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
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
  const notifications = await repository.getNotifications(user);
  const metrics = await repository.getDashboardMetrics(user);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        user={user}
        notifications={notifications}
        openOverlapCount={metrics.kpi.openOverlapAlerts}
      />
      <div className="flex flex-1">
        <Sidebar user={user} openOverlapCount={metrics.kpi.openOverlapAlerts} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
