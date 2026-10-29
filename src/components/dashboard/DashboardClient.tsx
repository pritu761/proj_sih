"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
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
  TrendingUp,
  PlusCircle,
  ChevronRight,
  Activity,
  Gauge,
  Timer,
  Sparkles,
  Scale,
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
  AreaChart,
  Area,
} from "recharts";
import { StatusPill, BureauPill, ConfidencePill } from "@/components/ui/badges";
import { CountUp } from "@/components/ui/count-up";
import { RiskRadar } from "./RiskRadar";
import { IngestionSimulator } from "./IngestionSimulator";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
  initialMetrics: any;
  userRole?: string;
  userBureau?: string;
  userName?: string;
}

const bureauShort: Record<string, string> = {
  "REGULATION BUREAU": "RB",
  PGRC: "PGRC",
  "APPROVAL BUREAU": "AB",
  "SKILL CELL": "SDC",
};

const statusColor: Record<string, string> = {
  Pending: "#f59e0b",
  "Under Process": "#2559e8",
  Disposed: "#059669",
  Transferred: "#7c3aed",
  Escalated: "#e11d48",
};

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-ink-900/95 px-3.5 py-2.5 shadow-2xl backdrop-blur">
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: p.color || p.payload?.fill || "#60a5fa" }}
            />
            <span className="font-medium text-slate-300">{p.name}</span>
            <span className="ml-auto font-bold tabular-nums text-white">
              {p.value}
              {suffix ?? ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardClient({
  initialMetrics,
  userRole: _userRole,
  userBureau: _userBureau,
  userName,
}: DashboardClientProps) {
  const router = useRouter();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    setLastUpdated(new Date());
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          setMetrics(await res.json());
          setLastUpdated(new Date());
        }
      } catch {
        /* silent polling tick */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (res.ok) {
        setMetrics(await res.json());
        setLastUpdated(new Date());
      }
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const k = metrics.kpi;
  const total = Math.max(1, k.totalReceived);
  const slaCompliance = Math.max(0, 100 - Math.round((k.pendingBeyondTimeline / total) * 100));
  const disposalRate = metrics.disposalRate ?? Math.round((k.disposed / total) * 100);
  const avgResolution = metrics.avgResolutionDays ?? 0;
  const urgentCases: any[] = metrics.urgentCases ?? [];
  const openOverlaps: any[] = metrics.openOverlapList ?? [];

  const kpis = [
    {
      label: "Total received",
      value: k.totalReceived,
      icon: Inbox,
      tone: "text-ink-800 bg-slate-100 border-slate-200",
      accent: "#0a1020",
      href: "/cases",
      sub: "All bureaus & regions",
      share: 100,
    },
    {
      label: "Pending scrutiny",
      value: k.pending,
      icon: Clock,
      tone: "text-amber-700 bg-amber-50 border-amber-200",
      accent: "#f59e0b",
      href: "/cases?status=PENDING",
      sub: "Awaiting allocation",
      share: (k.pending / total) * 100,
    },
    {
      label: "Under process",
      value: k.underProcess,
      icon: RotateCw,
      tone: "text-brand-700 bg-brand-50 border-brand-200",
      accent: "#2559e8",
      href: "/cases?status=UNDER_PROCESS",
      sub: "Hearing · notice · inquiry",
      share: (k.underProcess / total) * 100,
    },
    {
      label: "Disposed",
      value: k.disposed,
      icon: CheckCircle2,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
      accent: "#059669",
      href: "/cases?status=DISPOSED",
      sub: "Redressed & closed",
      share: (k.disposed / total) * 100,
    },
    {
      label: "Transferred",
      value: k.transferred,
      icon: ArrowRightLeft,
      tone: "text-violet-700 bg-violet-50 border-violet-200",
      accent: "#7c3aed",
      href: "/cases?status=TRANSFERRED",
      sub: "Cross-jurisdiction",
      share: (k.transferred / total) * 100,
    },
    {
      label: "Escalated",
      value: k.escalated,
      icon: Flame,
      tone: "text-rose-700 bg-rose-50 border-rose-200",
      accent: "#e11d48",
      href: "/cases?status=ESCALATED",
      sub: "To competent authority",
      share: (k.escalated / total) * 100,
    },
    {
      label: "Beyond timeline",
      value: k.pendingBeyondTimeline,
      icon: AlertOctagon,
      tone: "text-rose-700 bg-rose-50 border-rose-200",
      accent: "#dc2626",
      href: "/cases?sla_status=BREACHED",
      sub: "Statutory SLA breached",
      share: (k.pendingBeyondTimeline / total) * 100,
      alert: true,
    },
    {
      label: "Overlap alerts",
      value: k.openOverlapAlerts,
      icon: ShieldAlert,
      tone: "text-saffron-600 bg-saffron-500/10 border-saffron-300",
      accent: "#f59e0b",
      href: "/alerts?status=OPEN",
      sub: "Multi-bureau collisions",
      share: (k.openOverlapAlerts / total) * 100,
      alert: true,
    },
  ];

  const bureauData = (metrics.bureauWorkload ?? []).map((b: any) => ({
    ...b,
    short: bureauShort[b.bureau] ?? b.bureau,
  }));

  const statusData = (metrics.statusDistribution ?? []).map((s: any) => ({
    ...s,
    color: statusColor[s.name] ?? s.color,
  }));

  const ageingData = [
    { range: "0–15d", count: metrics.ageingBuckets.bucket_0_15, color: "#10b981" },
    { range: "16–30d", count: metrics.ageingBuckets.bucket_16_30, color: "#2559e8" },
    { range: "31–60d", count: metrics.ageingBuckets.bucket_31_60, color: "#f59e0b" },
    { range: "60+d", count: metrics.ageingBuckets.bucket_60_plus, color: "#e11d48" },
  ];

  const go = (href: string) => router.push(href);

  const honorifics = new Set(["dr", "prof", "shri", "smt", "mr", "mrs", "ms"]);
  const firstName =
    userName
      ?.split(/\s+/)
      .find((w) => w && !honorifics.has(w.toLowerCase().replace(/\./g, ""))) ?? "Officer";

  return (
    <div className="space-y-5">
      {/* ── Command hero ── */}
      <section className="hero-mesh relative overflow-hidden rounded-[26px] border border-white/10 px-5 py-5 shadow-[0_24px_60px_-30px_rgba(6,10,20,0.6)] sm:px-7 sm:py-6">
        {/* Real AICTE HQ architectural backdrop */}
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-25 filter contrast-125 mix-blend-luminosity dark:opacity-40 dark:filter-none dark:brightness-105"
          style={{
            backgroundImage: "url('/images/aicte-hq.webp')",
            maskImage: "linear-gradient(to right, transparent 5%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)",
            WebkitMaskImage: "linear-gradient(to right, transparent 5%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)",
          }}
          aria-hidden="true"
        />
        <span className="hero-scan" aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live command center
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

            <h1 className="mt-3.5 font-display text-[27px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white sm:text-[34px]">
              {userName ? `Welcome back, ${firstName}.` : "Institutional grievance overview."}
            </h1>
            <p className="mt-2 max-w-xl text-[12.5px] leading-relaxed text-slate-400">
              One live operating picture across every Bureau, Cell, and Regional Office.
              <span className="hidden sm:inline"> Overlap detection and SLA watch are running.</span>
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button onClick={refresh} disabled={isRefreshing} className="btn btn-secondary btn-sm border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/[0.1] hover:text-white">
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
                Refresh data
              </button>
              <IngestionSimulator userRole={_userRole} userBureau={_userBureau} />
              <Link href="/cases/new" className="btn btn-primary btn-sm">
                <PlusCircle className="h-3.5 w-3.5" />
                Register complaint
              </Link>
              <span className="ml-1 text-[10px] font-medium text-slate-500">
                Synced {lastUpdated ? lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "just now"}
              </span>
            </div>
          </div>

          {/* Live pulse stats */}
          <div className="grid w-full grid-cols-3 gap-2.5 xl:w-[390px]">
            {[
              { label: "Disposal rate", value: `${disposalRate}%`, pct: disposalRate, color: "#34d399", icon: TrendingUp },
              { label: "SLA compliance", value: `${slaCompliance}%`, pct: slaCompliance, color: "#60a5fa", icon: Gauge },
              { label: "Avg. resolution", value: `${avgResolution}d`, pct: Math.min(100, (avgResolution / 45) * 100), color: "#fbbf4c", icon: Timer },
            ].map((s, si) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">{s.label}</span>
                    <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                  </div>
                  <p className="mt-2 font-display text-[21px] font-extrabold leading-none tracking-tight text-white">
                    {s.value}
                  </p>
                  <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="meter-fill h-full rounded-full transition-all duration-700"
                      style={{ width: `${s.pct}%`, background: s.color, animationDelay: `${120 + si * 110}ms` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Overlap alert ── */}
      {k.openOverlapAlerts > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50/60 p-4 shadow-sm animate-slide-up sm:p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-400" />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_24px_-8px_rgba(225,29,72,0.6)]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[14px] font-bold tracking-tight text-rose-950">
                    Potential Overlapping Cases – Coordination Required
                  </h2>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    {k.openOverlapAlerts} open
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-rose-800/85">
                  Parallel open inquiries detected on the same institutions across multiple Bureaus.
                  Assign a lead bureau before duplicate action is taken.
                </p>
              </div>
            </div>
            <Link href="/alerts?status=OPEN" className="btn btn-danger btn-sm shrink-0 self-start sm:self-auto">
              Review collisions
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ── KPI grid ── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 stagger-children">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              style={{ "--kpi-accent": kpi.accent } as CSSProperties}
              className={cn(
                "kpi-card group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg",
                kpi.alert ? "border-rose-200/80 bg-gradient-to-br from-white to-rose-50/40" : "border-slate-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", kpi.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 group-hover:opacity-100" />
              </div>

              <p className="mt-3.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                {kpi.label}
              </p>
              <p className="mt-1 font-display text-[29px] font-extrabold leading-none tracking-[-0.03em] text-slate-950">
                <CountUp value={kpi.value} />
              </p>
              <p className="mt-1.5 truncate text-[10px] font-medium text-slate-400">{kpi.sub}</p>

              <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="meter-fill h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.max(3, Math.min(100, kpi.share))}%`, background: kpi.accent }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Charts row 1 ── */}
      <RiskRadar risk={metrics.riskRadar} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bureau caseload distribution</h2>
              <p className="panel-sub">Active workload split by processing stage · click a bar to drill down</p>
            </div>
            <div className="flex items-center gap-3">
              {[
                { label: "Pending", color: "#f59e0b" },
                { label: "In process", color: "#2559e8" },
                { label: "Disposed", color: "#059669" },
              ].map((l) => (
                <span key={l.label} className="hidden items-center gap-1.5 text-[10px] font-semibold text-slate-500 sm:flex">
                  <span className="h-2 w-2 rounded-sm" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="h-[286px] px-3 pb-4 pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={bureauData}
                margin={{ top: 6, right: 12, left: -18, bottom: 0 }}
                barGap={5}
                onClick={(state: any) => {
                  const key = state?.activePayload?.[0]?.payload?.bureauKey;
                  if (key) go(`/cases?bureau=${key}`);
                }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="short" axisLine={false} tickLine={false} dy={8} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.045)" }} content={<ChartTooltip />} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
                <Bar dataKey="underProcess" name="In process" fill="#2559e8" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
                <Bar dataKey="disposed" name="Disposed" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel flex flex-col">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Status mix</h2>
              <p className="panel-sub">Resolution lifecycle distribution</p>
            </div>
          </div>
          <div className="relative h-[196px] px-4 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={700}
                  onClick={(entry: any) => {
                    const map: Record<string, string> = {
                      Pending: "PENDING",
                      "Under Process": "UNDER_PROCESS",
                      Disposed: "DISPOSED",
                      Transferred: "TRANSFERRED",
                      Escalated: "ESCALATED",
                    };
                    if (entry?.name) go(`/cases?status=${map[entry.name] || entry.name}`);
                  }}
                >
                  {statusData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} cursor="pointer" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-1">
              <span className="font-display text-[27px] font-extrabold leading-none tracking-tight text-slate-950">
                {k.totalReceived}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                total cases
              </span>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-0.5 p-4 pt-2">
            {statusData.map((s: any) => (
              <button
                key={s.name}
                onClick={() => {
                  const map: Record<string, string> = {
                    Pending: "PENDING",
                    "Under Process": "UNDER_PROCESS",
                    Disposed: "DISPOSED",
                    Transferred: "TRANSFERRED",
                    Escalated: "ESCALATED",
                  };
                  go(`/cases?status=${map[s.name] || s.name}`);
                }}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-[10.5px] font-medium text-slate-500">{s.name}</span>
                <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-900">{s.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Pending ageing</h2>
              <p className="panel-sub">Duration since receipt</p>
            </div>
            <span className="badge border-rose-200 bg-rose-50 text-rose-600">SLA watch</span>
          </div>
          <div className="h-[224px] px-3 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="range" axisLine={false} tickLine={false} dy={6} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.04)" }} content={<ChartTooltip suffix=" cases" />} />
                <Bar dataKey="count" name="Cases" radius={[6, 6, 0, 0]} maxBarSize={42} animationDuration={700}>
                  {ageingData.map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Disposal velocity</h2>
              <p className="panel-sub">Received vs disposed · last 6 months</p>
            </div>
            <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
              {disposalRate}% closed
            </span>
          </div>
          <div className="h-[224px] px-3 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrends} margin={{ top: 6, right: 10, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDisposed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} dy={6} tickFormatter={(v) => String(v).split(" ")[0]} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gReceived)" dot={{ r: 2.5, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 4 }} animationDuration={700} />
                <Area type="monotone" dataKey="disposed" name="Disposed" stroke="#10b981" strokeWidth={2.5} fill="url(#gDisposed)" dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 4 }} animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 pb-3">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Received
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Disposed
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Regional volume</h2>
              <p className="panel-sub">Jurisdictional spread</p>
            </div>
            <Link href="/institutions" className="text-[10.5px] font-bold text-brand-600 hover:text-brand-700">
              Directory →
            </Link>
          </div>
          <div className="h-[224px] px-2 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={metrics.regionCases}
                margin={{ top: 0, right: 16, left: 6, bottom: 0 }}
                onClick={(state: any) => {
                  const region = state?.activePayload?.[0]?.payload?.region;
                  if (region) go(`/cases?region=${encodeURIComponent(region)}`);
                }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="region" axisLine={false} tickLine={false} width={74} tickFormatter={(v) => String(v).replace("North-Western", "NW").replace("South-Western", "SW")} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.04)" }} content={<ChartTooltip suffix=" cases" />} />
                <Bar dataKey="cases" name="Cases" fill="#2559e8" radius={[0, 5, 5, 0]} maxBarSize={18} cursor="pointer" animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Attention + collisions ── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2 overflow-hidden">
          <div className="panel-head">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="panel-title">Requires attention</h2>
                <p className="panel-sub">Breached, approaching, or critical cases across all bureaus</p>
              </div>
            </div>
            <Link href="/cases?sla_status=BREACHED" className="btn btn-secondary btn-sm">
              Open SLA view
            </Link>
          </div>

          {urgentCases.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-[12px] font-semibold text-slate-600">No urgent cases right now</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">Every active case is comfortably within its timeline.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case</th>
                    <th>Institution</th>
                    <th>Bureau</th>
                    <th>SLA</th>
                    <th className="text-right">View</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentCases.map((c) => (
                    <tr key={c.id} className="group">
                      <td>
                        <Link href={`/cases/${c.id}`} className="block">
                          <span className="block font-mono text-[10.5px] font-bold text-brand-700 group-hover:underline">
                            {c.case_id}
                          </span>
                          <span className="mt-0.5 block max-w-[190px] truncate text-[10.5px] font-medium text-slate-500">
                            {c.category}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="block max-w-[200px] truncate text-[11px] font-semibold text-slate-800">
                          {c.institution_name}
                        </span>
                        <span className="mt-0.5 block text-[9.5px] text-slate-400">{c.institution_city}</span>
                      </td>
                      <td><BureauPill bureau={c.assigned_bureau} /></td>
                      <td>
                        <span
                          className={cn(
                            "badge border",
                            c.isBreached
                              ? "sla-breached"
                              : c.isApproaching
                                ? "sla-approaching"
                                : "sla-normal"
                          )}
                        >
                          {c.isBreached
                            ? `${Math.abs(c.remainingDays)}d overdue`
                            : `${c.remainingDays}d left`}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link href={`/cases/${c.id}`} className="inline-flex rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600" aria-label={`View ${c.case_id}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="panel-head">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h2 className="panel-title">Open collisions</h2>
                <p className="panel-sub">Institutions with parallel bureau action</p>
              </div>
            </div>
          </div>

          {openOverlaps.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShieldAlert className="mx-auto h-8 w-8 text-emerald-300" />
              <p className="mt-2 text-[12px] font-semibold text-slate-600">No uncoordinated overlaps</p>
              <p className="mt-0.5 text-[10.5px] text-slate-400">Bureau actions are aligned.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {openOverlaps.map((o) => (
                <Link
                  key={o.id}
                  href={`/institutions/${o.institution_id}`}
                  className="group block px-4 py-3.5 transition-colors hover:bg-slate-50/80"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-[11.5px] font-bold text-slate-800 group-hover:text-brand-700">
                      {o.institution_name}
                    </p>
                    <ConfidencePill confidence={o.confidence} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {o.bureaus_involved.map((b: string) => (
                      <BureauPill key={b} bureau={b} />
                    ))}
                    <span className="text-[9.5px] font-semibold text-slate-400">
                      {o.case_ids.length} cases
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-[10px] text-slate-400">
                    {o.match_reasons?.[0]?.description ?? "Multi-bureau inquiry detected."}
                  </p>
                </Link>
              ))}
              <div className="p-3">
                <Link href="/alerts?status=OPEN" className="btn btn-secondary btn-sm w-full">
                  <Sparkles className="h-3.5 w-3.5" />
                  Open coordination hub
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
