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
import { BacklogForecastChart } from "@/components/reports/BacklogForecastChart";
import { AiReportSummary } from "@/components/reports/AiReportSummary";
import { computeBureauScorecard } from "@/lib/services/scorecard";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";

/** Colour scale for the breach heatmap cells (density = breached ÷ open). */
function heatmapCellClass(cell: { active: number; density: number }): string {
  if (cell.active === 0 || cell.density === 0) return "bg-slate-100 text-slate-400";
  if (cell.density < 25) return "bg-emerald-100 text-emerald-800";
  if (cell.density < 50) return "bg-amber-100 text-amber-800";
  if (cell.density < 75) return "bg-orange-200 text-orange-900";
  return "bg-rose-200 text-rose-900";
}

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user as unknown as SessionUser;
  const metrics = await repository.getDashboardMetrics(user);
  const forecast = repository.getBacklogForecast();
  const heatmap = repository.getBreachHeatmap();

  // Bureau scorecard input — same region-safe view the weekly digest uses.
  const casePage = await repository.getCases({ limit: 1000, page: 1 }, user);
  const scorecard = computeBureauScorecard(
    casePage.cases.map((c) => ({
      case_id: c.case_id,
      status: c.status,
      assigned_bureau: c.assigned_bureau,
      date_received: c.date_received,
      last_action_date: c.last_action_date,
      category: c.category,
    }))
  );

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
        title="Reports & Analytics"
        icon={ChartSpline}
        actions={
          <>
            <a href="/api/reports/csv" download="aicte_complaints.csv" className="btn btn-secondary">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </a>
            <a
              href="/api/reports/weekly"
              download="aicte_weekly_digest.pdf"
              className="btn btn-secondary"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              Weekly digest
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
        <p className="text-[10.5px] font-medium text-slate-400">
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
                <span className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">
                  YTD
                </span>
              </div>

              <p className="mt-3.5 min-h-[24px] text-[10.5px] font-semibold uppercase leading-[1.25] tracking-[0.1em] text-slate-400">
                {kpiItem.label}
              </p>
              <p
                className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-[-0.03em]"
                style={{ color: kpiItem.color }}
              >
                {kpiItem.value}
              </p>
              <p className="mt-1.5 text-[10.5px] font-medium leading-snug text-slate-400">
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

      {/* AI executive summary */}
      <AiReportSummary />

      {/* Charts */}
      <ReportsClient metrics={metrics} />

      {/* Backlog forecast — deterministic intake-vs-disposal projection */}
      <BacklogForecastChart forecast={forecast} />

      {/* Breach heatmap — statutory-breach density per regional office × category */}
      <div className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Breach heatmap — regional office × category</h2>
            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
              Share of open files already past the statutory window in each cell.
              Disposed files are excluded — they are no longer under SLA pressure.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
            {heatmap.cells.filter((c) => c.breached > 0).length} cells under pressure
          </span>
        </div>

        <div className="overflow-x-auto px-5 py-4">
          <table className="w-full border-separate" style={{ borderSpacing: "3px" }}>
            <thead>
              <tr>
                <th className="pb-1 text-left text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Regional office
                </th>
                {heatmap.categories.map((cat) => (
                  <th
                    key={cat}
                    title={cat}
                    className="min-w-[74px] pb-1 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400"
                  >
                    {cat.length > 12 ? cat.slice(0, 11) + "…" : cat}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.regions.map((region) => (
                <tr key={region}>
                  <td className="whitespace-nowrap pr-2 text-[10.5px] font-bold text-slate-700">
                    {region}
                  </td>
                  {heatmap.categories.map((cat) => {
                    const cell = heatmap.cells.find(
                      (c) => c.region === region && c.category === cat
                    )!;
                    return (
                      <td key={cat}>
                        <div
                          title={`${cell.breached} breached of ${cell.active} open file(s)`}
                          className={cn(
                            "rounded-md px-1.5 py-1.5 text-center",
                            heatmapCellClass(cell)
                          )}
                        >
                          <span className="block text-[11px] font-extrabold leading-none">
                            {cell.active > 0 ? `${cell.density}%` : "–"}
                          </span>
                          <span className="block text-[8.5px] font-semibold opacity-70">
                            {cell.active > 0 ? `${cell.breached}/${cell.active}` : ""}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-2.5 text-[9.5px] font-semibold text-slate-400">
          <span>Breach density:</span>
          {[
            { label: "0", cls: "bg-slate-100 text-slate-400" },
            { label: "<25%", cls: "bg-emerald-100 text-emerald-800" },
            { label: "<50%", cls: "bg-amber-100 text-amber-800" },
            { label: "<75%", cls: "bg-orange-200 text-orange-900" },
            { label: "≥75%", cls: "bg-rose-200 text-rose-900" },
          ].map((chip) => (
            <span
              key={chip.label}
              className={cn("rounded-md px-2 py-0.5 text-[9px] font-bold", chip.cls)}
            >
              {chip.label}
            </span>
          ))}
          <span className="ml-auto">cell text: breached / open</span>
        </div>
      </div>

      {/* Bureau scorecard — statutory performance grading */}
      <div className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Bureau scorecard</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
            <Gauge className="h-3 w-3" />
            {scorecard.filter((s) => s.grade === "A").length}/{scorecard.length} graded A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bureau / cell</th>
                <th>Open stock</th>
                <th>Disposal rate</th>
                <th>On-time disposal</th>
                <th>SLA-breached</th>
                <th>Avg age</th>
                <th>Oldest open</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {scorecard.map((row) => {
                const open = row.pending + row.underProcess + row.escalated;
                const gradeTone =
                  row.grade === "A"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : row.grade === "B"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : row.grade === "C"
                        ? "bg-orange-50 text-orange-700 border-orange-200"
                        : "bg-rose-50 text-rose-700 border-rose-200";
                return (
                  <tr key={row.bureau}>
                    <td>
                      <div className="flex items-center gap-2">
                        <BureauPill bureau={row.bureau} />
                        <span className="text-[11.5px] font-semibold text-slate-800">
                          {{
                            REGULATION_BUREAU: "Regulation Bureau",
                            PGRC: "Public Grievance Redressal Cell",
                            APPROVAL_BUREAU: "Approval Bureau",
                            SKILL_CELL: "Skill Development Cell",
                          }[row.bureau] ?? row.bureau}
                        </span>
                      </div>
                    </td>
                    <td className="font-bold tabular-nums text-slate-900">{open}</td>
                    <td className="font-bold tabular-nums text-brand-600">{row.disposalRatePercent}%</td>
                    <td className="font-bold tabular-nums text-emerald-600">{row.onTimeRatePercent}%</td>
                    <td
                      className={cn(
                        "font-bold tabular-nums",
                        row.beyondTimeline > 0 ? "text-rose-600" : "text-emerald-600"
                      )}
                    >
                      {row.beyondTimeline}
                    </td>
                    <td className="font-bold tabular-nums text-slate-700">{row.avgAgeDays}d</td>
                    <td className="font-bold tabular-nums text-slate-700">{row.oldestActiveDays}d</td>
                    <td>
                      <span
                        className={cn(
                          "inline-flex rounded-md border px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide",
                          gradeTone
                        )}
                      >
                        {row.grade}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[10.5px] text-slate-500">
          Grading rule: A ≥ 85% on-time disposals and ≤ 5 open files breached · B ≥ 70% / ≤ 10 ·
          C ≥ 50% on-time · D otherwise. Figures recomputed live from the SLA engine.
        </p>
      </div>

      {/* Bureau table */}
      <div className="panel overflow-hidden">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Bureau disposal velocity & caseload</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-slate-500">
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
                        <span className="text-[11px] font-bold tabular-nums text-slate-700">
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

            <div className="mt-3 space-y-2">
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
                  <span className="block text-[10.5px] text-slate-400">
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
                  <span className="block text-[10.5px] text-slate-400">
                    PDF · signed-off summary
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-brand-600" />
              </a>

              <a
                href="/api/reports/weekly"
                download="aicte_weekly_digest.pdf"
                className="group flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 transition-colors hover:border-fuchsia-300 hover:bg-fuchsia-50/40"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-600">
                  <CalendarClock className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold text-slate-800">
                    Weekly executive digest
                  </span>
                  <span className="block text-[10.5px] text-slate-400">
                    PDF · scorecard + hearing board + recurrence watch
                  </span>
                </span>
                <Download className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-colors group-hover:text-fuchsia-600" />
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
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-emerald-800/75">
              {kpi.pendingBeyondTimeline} of {kpi.totalReceived} active cases have exceeded their
              statutory timeline.
            </p>
            <p className="mt-2 flex items-center gap-1.5 border-t border-emerald-200/60 pt-2 text-[10.5px] font-medium text-emerald-700">
              <TrendingUp className="h-3 w-3" />
              Average resolution {metrics.avgResolutionDays ?? 0} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
