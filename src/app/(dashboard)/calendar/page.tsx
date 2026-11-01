import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { HearingCalendarClient } from "@/components/calendar/HearingCalendarClient";
import { SessionUser } from "@/lib/rbac";

export default async function HearingCalendarPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const hearings = await repository.getUpcomingHearings(user, 45);

  return <HearingCalendarClient hearings={hearings} currentUser={user} />;
}
