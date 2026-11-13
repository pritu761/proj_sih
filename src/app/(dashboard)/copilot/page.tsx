import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CopilotClient } from "@/components/copilot/CopilotClient";
import { SessionUser } from "@/lib/rbac";

export default async function CopilotPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;

  return <CopilotClient user={{ name: user.name, role: user.role, bureau: user.bureau }} />;
}
