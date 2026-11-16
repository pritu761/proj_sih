import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SlaSchedule } from "@/components/admin/SlaSchedule";
import { SessionUser } from "@/lib/rbac";

export default async function SlaSchedulePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  // The statutory schedule is Administrator-only, matching the sidebar guard.
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const rows = repository.getSlaSchedule();
  return <SlaSchedule initialRows={rows} />;
}
