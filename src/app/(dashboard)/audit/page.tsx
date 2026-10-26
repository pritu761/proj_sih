import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { formatDateTime } from "@/lib/utils";
import { ShieldCheck, History } from "lucide-react";
import { SessionUser } from "@/lib/rbac";

export default async function AuditPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;

  if (user.role !== "ADMIN" && user.role !== "COMPETENT_AUTHORITY") {
    redirect("/");
  }

  const logs = await repository.getAuditLogs();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <History className="h-6 w-6 text-blue-900" />
            <span>AICTE System Security & Audit Trail</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immutable log of all user logins, grievance creations, status changes, bureau transfers, and overlap coordinations.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Tamper-Evident Ledger Active</span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 font-bold text-slate-700">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Authorized Officer</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Entity ID</th>
                <th className="py-3 px-4">Audit Payload / Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    No mutations recorded in this session yet.
                  </td>
                </tr>
              ) : (
                logs.map((log: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.user}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{log.entity}</td>
                    <td className="py-3 px-4 font-mono text-blue-900 font-bold">
                      {log.entity_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-600 max-w-xs truncate">
                      {JSON.stringify(log.after || log.before || {})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
