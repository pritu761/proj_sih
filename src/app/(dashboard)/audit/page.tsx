import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { buildAuditChain } from "@/lib/services/audit-chain";
import { ScrollText, ShieldCheck } from "lucide-react";
import { SessionUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLedger } from "@/components/audit/AuditLedger";

export default async function AuditPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;

  if (user.role !== "ADMIN" && user.role !== "COMPETENT_AUTHORITY") {
    redirect("/");
  }

  const logs = await repository.getAuditLogs();
  const chain = buildAuditChain(logs);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Governance"
        title="System security & audit trail"
        description="Immutable record of every login, grievance creation, status change, bureau transfer, and overlap coordination across the platform."
        icon={ScrollText}
        tone="emerald"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Tamper-evident ledger active
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-600">
              Restricted · Admin & Authority
            </span>
          </div>
        }
      />

      <AuditLedger
        logs={chain.entries}
        chain={{
          head: chain.head,
          count: chain.count,
          valid: chain.valid,
          brokenAt: chain.brokenAt,
          algorithm: chain.algorithm,
          genesis: chain.genesis,
          builtAt: chain.builtAt,
        }}
      />
    </div>
  );
}
