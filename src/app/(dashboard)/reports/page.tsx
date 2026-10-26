import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { Download, FileText } from "lucide-react";
import { SessionUser } from "@/lib/rbac";

export default async function ReportsPage() {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Reports & Analytics Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official performance metrics, bureau disposal velocity, and statutory compliance documentation.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-3">
          <a
            href="/api/reports/csv"
            download="aicte_complaints.csv"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV Dataset</span>
          </a>

          <a
            href="/api/reports/pdf"
            download="aicte_executive_report.pdf"
            className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Download Official PDF Report</span>
          </a>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Overall Disposal Rate</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {metrics.kpi.totalReceived > 0
              ? `${Math.round((metrics.kpi.disposed / metrics.kpi.totalReceived) * 100)}%`
              : "0%"}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {metrics.kpi.disposed} cases closed out of {metrics.kpi.totalReceived}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Cases Under Process</span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {metrics.kpi.underProcess}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Notice / Hearing / Inspection active
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">SLA Breach Incidence</span>
          <p className="text-2xl font-black text-rose-600 mt-1">
            {metrics.kpi.pendingBeyondTimeline}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Exceeded category timeline
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500">Inter-Bureau Overlaps</span>
          <p className="text-2xl font-black text-amber-600 mt-1">
            {metrics.kpi.openOverlapAlerts}
          </p>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            Concurrent multi-bureau inquiries
          </span>
        </div>
      </div>

      {/* Bureau-wise Performance Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Bureau / Cell Disposal Velocity & Caseload
            </h2>
            <p className="text-xs text-slate-500">
              Comparative breakdown across Regulation Bureau, PGRC, Approval Bureau, and Skill Cell
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <th className="py-3 px-4">Bureau / Cell</th>
                <th className="py-3 px-4">Pending</th>
                <th className="py-3 px-4">Under Process</th>
                <th className="py-3 px-4">Disposed</th>
                <th className="py-3 px-4">Total Received</th>
                <th className="py-3 px-4">Disposal Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {metrics.bureauWorkload.map((b: any) => {
                const rate = b.total > 0 ? Math.round((b.disposed / b.total) * 100) : 0;
                return (
                  <tr key={b.bureauKey} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-900">{b.bureau}</td>
                    <td className="py-3 px-4 text-amber-600 font-bold">{b.pending}</td>
                    <td className="py-3 px-4 text-blue-600 font-bold">{b.underProcess}</td>
                    <td className="py-3 px-4 text-emerald-600 font-bold">{b.disposed}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{b.total}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="font-bold text-slate-700 text-[11px]">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional Office Compliance Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-900">
            Regional Office Complaint Volume
          </h2>
          <p className="text-xs text-slate-500">
            Jurisdictional workload across Northern, Western, Southern, Eastern, and Central regions
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y divide-slate-100">
          {metrics.regionCases.map((r: any) => (
            <div key={r.region} className="p-4 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {r.region} Region
              </span>
              <span className="text-xl font-black text-blue-900 block mt-1">{r.cases}</span>
              <span className="text-[9px] text-slate-400">Total Cases</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
