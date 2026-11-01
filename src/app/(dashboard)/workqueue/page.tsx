import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { WorkQueueClient } from "@/components/workqueue/WorkQueueClient";
import { SessionUser } from "@/lib/rbac";

export default async function WorkQueuePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const [queue, officers] = await Promise.all([
    repository.getMyQueue(user),
    repository.getAssignableOfficers(user),
  ]);

  return (
    <WorkQueueClient
      mine={queue.mine}
      unassigned={queue.unassigned}
      officers={officers}
      currentUser={user}
    />
  );
}
