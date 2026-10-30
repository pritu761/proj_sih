import { auth } from "@/auth";
import { redirect } from "next/navigation";
import repository from "@/lib/services/repository";
import {
  Download,
  FileText,
  ChartSpline,
  TrendingUp,
  AlertOctagon,
  ShieldAlert,
  RotateCw,
  Timer,
  Gauge,
  FileSpreadsheet,
  CheckCircle2,
  CalendarRange,
  Building2,
} from "lucide-react";
import { SessionUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { BureauPill } from "@/components/ui/badges";
import { ReportsClient, RegionBars } from "@/components/reports/ReportsClient";
import { cn } from "@/lib/utils";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);

  const kpi = metrics.kpi;
  const total = Math.max(1, kpi.totalReceived);
  const disposalRate = metrics.disposalRate ?? Math.round((kpi.disposed / total) * 100);
  const slaCompliance = Math.max(
    0,
    Math.round(100 - (kpi.pendingBeyondTimeline / total) * 100)
  );

  const kpiHighlights = [
    {
      label: "Overall disposal rate",
      value: `${disposalRate}%`,
      subtext: `${kpi.disposed} closed of ${kpi.totalReceived} received`,
      icon: TrendingUp,
      color: "#059669",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
      progress: disposalRate,
    },
    {
      label: "Cases under process",
      value: kpi.underProcess,
      subtext: "Notice · hearing · inspection active",
      icon: RotateCw,
      color: "#2559e8",
      chip: "border-brand-200 bg-brand-50 text-brand-700",
      progress: (kpi.underProcess / total) * 100,
    },
    {
      label: "SLA breach incidence",
      value: kpi.pendingBeyondTimeline,
      subtext: "Exceeded statutory category timeline",
      icon: AlertOctagon,
      color: "#dc2626",
      chip: "border-rose-200 bg-rose-50 text-rose-700",
      progress: (kpi.pendingBeyondTimeline / total) * 100,
    },
    {
      label: "Inter-bureau overlaps",
      value: kpi.openOverlapAlerts,
      subtext: "Concurrent multi-bureau inquiries",
      icon: ShieldAlert,
      color: "#f59e0b",
      chip: "border-amber-200 bg-amber-50 text-amber-700",
      progress: (kpi.openOverlapAlerts / total) * 100,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Insight"
        title="Reports & Analytics"
        description="Performance metrics, disposal velocity, and statutory compliance across every AICTE bureau and regional office."
        icon={ChartSpline}
        tone="blue"
        actions={
          <>
            <a href="/api/reports/csv" download="aicte_complaints.csv" className="btn btn-secondary">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
            <a
              href="/api/reports/pdf"
              download="aicte_executive_report.pdf"
              className="btn btn-primary"
            >
              <FileText className="h-3.5 w-3.5" />
              Official PDF report
            </a>
          </>
        }
      />

      {/* Report meta strip */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10.5px]">
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            <CalendarRange className="h-3.5 w-3.5 text-slate-400" />
            Reporting window
            <strong className="text-slate-900">May – Oct 2026</strong>
          </span>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            Scope
            <strong className="text-slate-900">
              {user.bureau === "ALL" ? "All bureaus · all regions" : user.bureau.replaceAll("_", " ")}
            </strong>
          </span>
          <span className="hidden h-3 w-px bg-slate-200 sm:block" />
          <span className="inline-flex items-center gap-1.5 font-semibold text-slate-600">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <strong className="text-emerald-700">Statutory format</strong>
          </span>
        </div>
        <p className="text-[10px] font-medium text-slate-400">
          Generated{" "}
          {new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 stagger-children">
        {kpiHighlights.map((kpiItem) => {
          const Icon = kpiItem.icon;
          return (
            <div key={kpiItem.label} className="panel relative overflow-hidden p-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border",
                    kpiItem.chip
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate-400">
                  YTD
                </span>
              </div>

              <p className="mt-3.5 min-h-[24px] text-[9.5px] font-bold uppercase leading-[1.25] tracking-[0.1em] text-slate-400">
                {kpiItem.label}
              </p>
              <p
                className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]"
                style={{ color: kpiItem.color }}
              >
                {kpiItem.value}
              </p>
              <p className="mt-1.5 text-[10px] font-medium leading-snug text-slate-400">
                {kpiItem.subtext}
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(3, Math.min(100, kpiItem.progress))}%`,
                    background: kpiItem.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <ReportsClient metrics={metrics} />

      {/* Bureau table */}
      <div className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Bureau disposal velocity & caseload</h2>
            <p className="panel-sub">Comparative breakdown across all AICTE divisions</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
            <Gauge className="h-3 w-3" />
            {disposalRate}% overall
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bureau / cell</th>
                <th>Pending</th>
                <th>Under process</th>
                <th>Disposed</th>
                <th>Total received</th>
                <th className="min-w-[190px]">Disposal rate</th>
              </tr>
            </thead>
            <tbody>
              {metrics.bureauWorkload.map((b: any) => {
                const rate = b.total > 0 ? Math.round((b.disposed / b.total) * 100) : 0;
                const rateColor =
                  rate >= 70 ? "#059669" : rate >= 40 ? "#d97706" : "#dc2626";
                return (
                  <tr key={b.bureauKey}>
                    <td>
                      <div className="flex items-center gap-2">
                        <BureauPill bureau={b.bureauKey} />
                        <span className="text-[11.5px] font-semibold text-slate-800">{b.bureau}</span>
                      </div>
                    </td>
                    <td className="font-bold tabular-nums text-amber-600">{b.pending}</td>
                    <td className="font-bold tabular-nums text-brand-600">{b.underProcess}</td>
                    <td className="font-bold tabular-nums text-emerald-600">{b.disposed}</td>
                    <td className="font-bold tabular-nums text-slate-900">{b.total}</td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${rate}%`, background: rateColor }}
                          />
                        </div>
                        <span className="text-[11px] font-extrabold tabular-nums text-slate-700">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regional + exports */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Regional office complaint volume</h2>
              <p className="panel-sub">Jurisdictional workload across all AICTE regions</p>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              {metrics.regionCases.reduce((sum: number, r: any) => sum + r.cases, 0)} cases
            </span>
          </div>
          <div className="p-5">
            <RegionBars data={metrics.regionCases} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="panel p-4">
            <div className="flex items-center justify-between">
              <h2 className="panel-title">Export centre</h2>
              <Timer className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <p className="panel-sub mb-3">Downloadable statutory extracts</p>

            <div className="space-y-2">
              <a
                href="/api/reports/csv"
                download="aicte_complaints.csv"
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-600">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Case-level dataset
                  </span>
                  <span className="block text-[9.5px] text-slate-400">
                    CSV · full filtered registry
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-emerald-600" />
              </a>

              <a
                href="/api/reports/pdf"
                download="aicte_executive_report.pdf"
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600">
                  <FileText className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Executive brief
                  </span>
                  <span className="block text-[9.5px] text-slate-400">
                    PDF · signed-off summary
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600" />
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-white p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <p className="text-[11px] font-bold text-emerald-900">SLA compliance</p>
            </div>
            <p className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-tight text-emerald-700">
              {slaCompliance}%
            </p>
            <p className="mt-1.5 text-[10px] leading-relaxed text-emerald-800/75">
              {kpi.pendingBeyondTimeline} of {kpi.totalReceived} active cases have exceeded their
              statutory timeline.
            </p>
            <p className="mt-2 flex items-center gap-1.5 border-t border-emerald-200/60 pt-2 text-[9.5px] font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              Average resolution {metrics.avgResolutionDays ?? 0} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
