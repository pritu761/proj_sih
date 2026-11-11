import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { UsersClient } from "@/components/users/UsersClient";
import { SessionUser } from "@/lib/rbac";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  // Non-administrators are bounced: the console is Administrator-only by design.
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await repository.getUsers(user);

  return < UsersClient initialUsers={users} currentUser={user} />;
}
