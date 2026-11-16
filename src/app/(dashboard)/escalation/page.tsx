import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ShieldCheck, Siren } from "lucide-react";
import { hasRole, SessionUser } from "@/lib/rbac";
import repository from "@/lib/services/repository";
import { PageHeader } from "@/components/ui/page-header";
import {
  EscalationConsole,
  type EscalationReviewView,
} from "@/components/escalation/EscalationConsole";

export default async function EscalationPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  if (!hasRole(user, ["ADMIN", "COMPETENT_AUTHORITY"])) {
    redirect("/dashboard");
  }

  const review = await repository.getEscalationReview();
  const view: EscalationReviewView = {
    day: review.day,
    graceDays: review.graceDays,
    checked: review.checked,
    escalated: review.escalated,
    alreadyEscalated: review.alreadyEscalated,
    items: review.items.map((item) => ({
      ...item,
      escalatedAt: item.escalatedAt.toISOString(),
    })),
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Auto-escalation review"
        icon={Siren}
        crumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Escalation review" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10.5px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Rule-based · explainable
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10.5px] font-bold text-slate-600">
              Restricted · Admin &amp; Authority
            </span>
          </div>
        }
      />

      <EscalationConsole review={view} />
    </div>
  );
}
