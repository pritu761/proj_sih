"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Inbox,
  Clock,
  RotateCw,
  CheckCircle2,
  ArrowRightLeft,
  AlertOctagon,
  ShieldAlert,
  Flame,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

interface DashboardClientProps {
  initialMetrics: any;
  userRole?: string;
  userBureau?: string;
}

export function DashboardClient({
  initialMetrics,
  userRole: _userRole,
  userBureau: _userBureau,
}: DashboardClientProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real-time polling every 30 seconds (Vercel serverless compatible)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch {
        console.debug("Dashboard polling tick completed.");
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const kpis = [
    {
      label: "Total Received",
      value: metrics.kpi.totalReceived,
      icon: Inbox,
      color: "text-slate-900",
      bgColor: "bg-slate-100",
      href: "/cases",
      subtext: "Across all AICTE Bureaus & Cells",
    },
    {
      label: "Pending Scrutiny",
      value: metrics.kpi.pending,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      href: "/cases?status=PENDING",
      subtext: "Awaiting initial bureau allocation",
    },
    {
      label: "Under Process",
      value: metrics.kpi.underProcess,
      icon: RotateCw,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      href: "/cases?status=UNDER_PROCESS",
      subtext: "Hearing / Notice / EVC active",
    },
    {
      label: "Disposed / Closed",
      value: metrics.kpi.disposed,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      href: "/cases?status=DISPOSED",
      subtext: "Redressed with speaking orders",
    },
    {
      label: "Transferred",
      value: metrics.kpi.transferred,
      icon: ArrowRightLeft,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      href: "/cases?status=TRANSFERRED",
      subtext: "Cross-jurisdiction reassignment",
    },
    {
      label: "Escalated",
      value: metrics.kpi.escalated,
      icon: Flame,
      color: "text-rose-600",
      bgColor: "bg-rose-50",
      href: "/cases?status=ESCALATED",
      subtext: "Referred to Competent Authority",
    },
    {
      label: "Beyond SLA Timeline",
      value: metrics.kpi.pendingBeyondTimeline,
      icon: AlertOctagon,
      color: "text-red-700 font-black",
      bgColor: "bg-red-50 border-red-300",
      href: "/cases?sla_status=BREACHED",
      subtext: "Immediate intervention required",
      isAlert: true,
    },
    {
      label: "Open Overlap Alerts",
      value: metrics.kpi.openOverlapAlerts,
      icon: ShieldAlert,
      color: "text-rose-700 font-black",
      bgColor: "bg-rose-50 border-rose-300",
      href: "/alerts?status=OPEN",
      subtext: "Multi-Bureau collision detected",
      isAlert: true,
    },
  ];

  const ageingData = [
    { range: "0 - 15 Days", count: metrics.ageingBuckets.bucket_0_15, color: "#10B981" },
    { range: "16 - 30 Days", count: metrics.ageingBuckets.bucket_16_30, color: "#3B82F6" },
    { range: "31 - 60 Days", count: metrics.ageingBuckets.bucket_31_60, color: "#F59E0B" },
    { range: "60+ Days (Severe)", count: metrics.ageingBuckets.bucket_60_plus, color: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Title and Live Poller */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Integrated Institution Complaint Monitoring Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time inter-bureau grievance tracking, automated collision avoidance, and SLA compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
          >
            <span>+ Register Complaint</span>
          </Link>
        </div>
      </div>

      {/* Prominent Overlap Banner if Overlaps Exist */}
      {metrics.kpi.openOverlapAlerts > 0 && (
        <div className="rounded-xl border border-rose-300 bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 p-4 shadow-sm animate-warning-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Potential Overlapping Cases – Coordination Required</span>
                  <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-800">
                    {metrics.kpi.openOverlapAlerts} UNRESOLVED
                  </span>
                </h3>
                <p className="text-xs text-rose-800 mt-0.5">
                  AICTE Overlap Engine detected parallel open inquiries on the same institution across multiple Bureaus/Cells.
                </p>
              </div>
            </div>
            <Link
              href="/alerts"
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-all shrink-0 shadow-xs"
            >
              <span>Review & Coordinate Overlaps</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={idx}
              href={kpi.href}
              className={`group flex flex-col justify-between rounded-xl border p-3 transition-all hover:shadow-md cursor-pointer ${
                kpi.isAlert
                  ? `${kpi.bgColor} hover:border-red-400`
                  : "bg-white border-slate-200 hover:border-blue-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 line-clamp-1">
                  {kpi.label}
                </span>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="mt-2">
                <span className={`text-xl sm:text-2xl font-bold tracking-tight ${kpi.color}`}>
                  {kpi.value}
                </span>
                <p className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{kpi.subtext}</p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Row 1 Charts: Bureau Workload & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bureau Workload Bar Chart */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Bureau/Cell-Wise Case Distribution</h2>
              <p className="text-xs text-slate-500">
                Active caseload across Regulation Bureau, PGRC, Approval Bureau, and Skill Cell
              </p>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Click bar to drill down</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={metrics.bureauWorkload}
                margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const bureauKey = state.activePayload[0].payload.bureauKey;
                    router.push(`/cases?bureau=${bureauKey}`);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="bureau" tick={{ fontSize: 11, fill: "#64748B" }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                <Tooltip
                  cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                <Bar dataKey="pending" name="Pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                <Bar dataKey="underProcess" name="Under Process" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disposed" name="Disposed" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Donut Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">Status Breakdown</h2>
              <span className="text-[10px] text-slate-400 font-medium">Click slice to filter</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Grievance resolution lifecycle</p>
          </div>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  onClick={(entry: any) => {
                    if (!entry?.name) return;
                    const statusMap: Record<string, string> = {
                      Pending: "PENDING",
                      "Under Process": "UNDER_PROCESS",
                      Disposed: "DISPOSED",
                      Transferred: "TRANSFERRED",
                      Escalated: "ESCALATED",
                    };
                    const mapped = statusMap[entry.name] || entry.name;
                    router.push(`/cases?status=${mapped}`);
                  }}
                >
                  {metrics.statusDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
            {metrics.statusDistribution.map((item: any, i: number) => (
              <button
                key={i}
                onClick={() => {
                  const statusMap: Record<string, string> = {
                    Pending: "PENDING",
                    "Under Process": "UNDER_PROCESS",
                    Disposed: "DISPOSED",
                    Transferred: "TRANSFERRED",
                    Escalated: "ESCALATED",
                  };
                  router.push(`/cases?status=${statusMap[item.name] || item.name}`);
                }}
                className="flex items-center gap-1.5 text-left text-xs hover:bg-slate-50 p-1 rounded transition-colors"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate">{item.name}:</span>
                <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2 Charts: Pending Ageing Buckets, Monthly Trend, Region-wise cases */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Ageing Buckets */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pending Case Ageing</h2>
              <p className="text-xs text-slate-500">Timeline duration since receipt</p>
            </div>
            <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              SLA Risk Watch
            </span>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingData} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="range" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="count" name="Active Cases" radius={[4, 4, 0, 0]}>
                  {ageingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Trend: Received vs Disposed */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Disposal Velocity</h2>
              <p className="text-xs text-slate-500">Monthly Received vs Disposed (6 months)</p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.monthlyTrends} margin={{ top: 10, right: 10, left: -25, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Line type="monotone" dataKey="received" name="Received" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="disposed" name="Disposed" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Region-wise Cases */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Regional Office Volume</h2>
              <p className="text-xs text-slate-500">Distribution across 5 AICTE regions</p>
            </div>
            <Link href="/institutions" className="text-xs text-blue-700 hover:underline font-semibold">
              Institutions →
            </Link>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={metrics.regionCases}
                margin={{ top: 5, right: 20, left: 25, bottom: 5 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const reg = state.activePayload[0].payload.region;
                    router.push(`/cases?region=${encodeURIComponent(reg)}`);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} />
                <YAxis type="category" dataKey="region" tick={{ fontSize: 10, fill: "#64748B" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="cases" name="Cases" fill="#1E3A8A" radius={[0, 4, 4, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
