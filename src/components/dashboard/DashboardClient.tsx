"use client";

import { useEffect, useRef, useState } from "react";
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
  ListChecks,
  Users,
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
import { ProgressRing } from "@/components/ui/progress-ring";
import { useToast } from "@/components/ui/toast";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { Reveal } from "@/components/ui/reveal";
import type { VisitDigest } from "@/lib/services/repository";
import { VisitDigestPanel } from "./VisitDigestPanel";
import { RecentActivity } from "./RecentActivity";
import { RiskRadar } from "./RiskRadar";
import { IngestionSimulator } from "./IngestionSimulator";
import { OperationsWire } from "./OperationsWire";
import { AiBriefing } from "./AiBriefing";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
  initialMetrics: any;
  userRole?: string;
  userBureau?: string;
  userName?: string;
  /** Server-computed, JSON-serializable login digest (no live DB round trip). */
  visitDigest?: VisitDigest;
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

export function DashboardClient({
  initialMetrics,
  userRole,
  userBureau,
  userName,
  visitDigest,
}: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Keep the digest in local state so the Navbar's "replay" entry can reopen
  // the exact same server-computed figures without another request.
  const [digest] = useState(visitDigest);
  const [showDigest, setShowDigest] = useState(Boolean(visitDigest));

  // Hydration-safe time-aware greeting: the first client render matches the
  // server's static "Welcome back" exactly; the clock-derived salutation is
  // applied only after mount.
  const [greeting, setGreeting] = useState("Welcome back");
  // The "Synced" label is derived from the server's generatedAt timestamp,
  // formatted after mount so server/client locale differences cannot diverge.
  const [syncedLabel, setSyncedLabel] = useState("just now");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening");
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/dashboard/metrics");
        if (res.ok) {
          setMetrics(await res.json());
        }
      } catch {
        /* silent polling tick */
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const generatedAt = metrics?.generatedAt;
    if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) return;
    setSyncedLabel(
      new Date(generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }, [metrics?.generatedAt]);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/dashboard/metrics");
      if (!res.ok) throw new Error("Metrics endpoint unavailable");
      // generatedAt from the response drives the "Synced" label — no client clock.
      setMetrics(await res.json());
    } catch {
      toast.error(
        "Refresh failed",
        "The registry did not respond. Showing the last known operating picture."
      );
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // The command palette broadcasts a refresh request on this channel. Keep a
  // ref to the latest `refresh` closure so the listener (installed once) always
  // sees current state, and remove it on unmount.
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => {
    const onExternalRefresh = () => void refreshRef.current();
    window.addEventListener("sentinel:refresh-dashboard", onExternalRefresh);
    return () =>
      window.removeEventListener("sentinel:refresh-dashboard", onExternalRefresh);
  }, []);

  // The profile menu broadcasts this on "Replay what's new". Reopen the digest
  // held in state — no server round trip and no mutation of the seen marker.
  useEffect(() => {
    const onReplayDigest = () => {
      if (digest) setShowDigest(true);
    };
    window.addEventListener("sentinel:replay-visit-digest", onReplayDigest);
    return () =>
      window.removeEventListener("sentinel:replay-visit-digest", onReplayDigest);
  }, [digest]);

  const k = metrics.kpi;
  const total = Math.max(1, k.totalReceived);
  const slaCompliance = Math.max(0, 100 - Math.round((k.pendingBeyondTimeline / total) * 100));
  const disposalRate = metrics.disposalRate ?? Math.round((k.disposed / total) * 100);
  const avgResolution = metrics.avgResolutionDays ?? 0;
  const urgentCases: any[] = metrics.urgentCases ?? [];
  const openOverlaps: any[] = metrics.openOverlapList ?? [];
  const topRegion = [...(metrics.regionCases ?? [])].sort(
    (a: any, b: any) => b.cases - a.cases
  )[0];

  const wireItems = [
    {
      value: `${k.pendingBeyondTimeline}`,
      text: "files beyond the statutory timeline",
      href: "/cases?sla_status=BREACHED",
      tone: "#fb7185",
    },
    {
      value: `${disposalRate}%`,
      text: `disposal rate · ${k.disposed} of ${k.totalReceived} closed`,
      href: "/cases?status=DISPOSED",
      tone: "#34d399",
    },
    {
      value: `${slaCompliance}%`,
      text: "SLA compliance · target 90%",
      href: "/reports",
      tone: slaCompliance >= 90 ? "#34d399" : "#60a5fa",
    },
    {
      value: `${avgResolution}d`,
      text: "average resolution time",
      href: "/reports",
      tone: "#93b8fd",
    },
    ...(topRegion
      ? [
          {
            value: `${topRegion.cases}`,
            text: `active cases in ${topRegion.region} region`,
            href: `/cases?region=${encodeURIComponent(topRegion.region)}`,
            tone: "#f59e0b",
          },
        ]
      : []),
  ];

  type KpiCard = {
    label: string;
    value: number;
    icon: typeof Inbox;
    tone: string;
    accent: string;
    href: string;
    sub: string;
    share: number;
    alert?: boolean;
    trend?: {
      current: number;
      previous: number;
      delta: number;
      direction: "up" | "down" | "flat";
    };
    /** Whether a rising value is the "good" direction for this metric. */
    trendGoodWhenUp?: boolean;
  };

  const kpis: KpiCard[] = [
    {
      label: "Total received",
      value: k.totalReceived,
      icon: Inbox,
      tone: "text-ink-800 bg-slate-100 border-slate-200 dark:border-white/10 dark:bg-white/5 dark:text-slate-200",
      accent: "#0a1020",
      href: "/cases",
      sub: "All bureaus & regions",
      share: 100,
      trend: metrics.kpiTrends?.received,
      trendGoodWhenUp: false,
    },
    {
      label: "Pending scrutiny",
      value: k.pending,
      icon: Clock,
      tone: "text-amber-700 bg-amber-50 border-amber-200 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
      accent: "#f59e0b",
      href: "/cases?status=PENDING",
      sub: "Awaiting allocation",
      share: (k.pending / total) * 100,
    },
    {
      label: "Under process",
      value: k.underProcess,
      icon: RotateCw,
      tone: "text-brand-700 bg-brand-50 border-brand-200 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300",
      accent: "#2559e8",
      href: "/cases?status=UNDER_PROCESS",
      sub: "Hearing · notice · inquiry",
      share: (k.underProcess / total) * 100,
    },
    {
      label: "Disposed",
      value: k.disposed,
      icon: CheckCircle2,
      tone: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
      accent: "#059669",
      href: "/cases?status=DISPOSED",
      sub: "Redressed & closed",
      share: (k.disposed / total) * 100,
      trend: metrics.kpiTrends?.disposed,
      trendGoodWhenUp: true,
    },
    {
      label: "Transferred",
      value: k.transferred,
      icon: ArrowRightLeft,
      tone: "text-violet-700 bg-violet-50 border-violet-200 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
      accent: "#7c3aed",
      href: "/cases?status=TRANSFERRED",
      sub: "Cross-jurisdiction",
      share: (k.transferred / total) * 100,
    },
    {
      label: "Escalated",
      value: k.escalated,
      icon: Flame,
      tone: "text-rose-700 bg-rose-50 border-rose-200 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
      accent: "#e11d48",
      href: "/cases?status=ESCALATED",
      sub: "To competent authority",
      share: (k.escalated / total) * 100,
    },
    {
      label: "Beyond timeline",
      value: k.pendingBeyondTimeline,
      icon: AlertOctagon,
      tone: "text-rose-700 bg-rose-50 border-rose-200 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
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
      tone: "text-saffron-600 bg-saffron-500/10 border-saffron-300 dark:border-saffron-400/20 dark:bg-saffron-400/10 dark:text-saffron-300",
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

  const recentMovement = metrics.recentMovement ?? { received7d: 0, disposed7d: 0 };
  const bureauLabel = bureauShort[userBureau ?? ""] ?? userBureau ?? "Your bureau";

  // Server-generated freshness drives the activity feed's relative times so
  // the first client render matches SSR exactly (no clock-based hydration drift).
  const parsedSyncTime = Date.parse(metrics.generatedAt ?? "");
  const activityReference = Number.isFinite(parsedSyncTime)
    ? parsedSyncTime
    : Date.now();

  // One-click action deck. Every figure is registry-derived (or an additive
  // metrics field); cards appear only where the signed-in role can act on the
  // signal. Regional officers are read-only for bureau case state, so their
  // unassigned count is zero and a neutral, region-safe card keeps the deck at
  // three compact actions.
  const priorities: {
    label: string;
    count: number;
    detail: string;
    href: string;
    icon: typeof Inbox;
    tone: string;
  }[] = [
    {
      label: "SLA breaches",
      count: k.pendingBeyondTimeline,
      detail: "Files past the statutory timeline awaiting action.",
      href: "/cases?sla_status=BREACHED",
      icon: AlertOctagon,
      tone: "text-rose-700 bg-rose-50 border-rose-200 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
    },
    {
      label: "Cross-bureau overlaps",
      count: k.openOverlapAlerts,
      detail: "Parallel inquiries that need a lead bureau.",
      href: "/alerts",
      icon: ShieldAlert,
      tone: "text-saffron-600 bg-saffron-500/10 border-saffron-300 dark:border-saffron-400/20 dark:bg-saffron-400/10 dark:text-saffron-300",
    },
  ];

  if (userRole !== "REGIONAL_OFFICER") {
    priorities.push({
      label: "Unassigned files",
      count: metrics.queueUnassigned ?? 0,
      detail: `${bureauLabel} desk files awaiting an officer.`,
      href: "/workqueue",
      icon: Users,
      tone: "text-brand-700 bg-brand-50 border-brand-200 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300",
    });
  }

  if (userRole === "ADMIN" || userRole === "COMPETENT_AUTHORITY") {
    priorities.push({
      label: "Awaiting authority direction",
      count: k.escalated,
      detail: "Escalated files awaiting your decision.",
      href: "/escalation",
      icon: Flame,
      tone: "text-violet-700 bg-violet-50 border-violet-200 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300",
    });
  }

  if (priorities.length < 3) {
    priorities.push({
      label: "Pending scrutiny",
      count: k.pending,
      detail: "Region files awaiting allocation.",
      href: "/cases?status=PENDING",
      icon: Inbox,
      tone: "text-amber-700 bg-amber-50 border-amber-200 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300",
    });
  }

  return (
    <div
      className={cn(
        "space-y-5 transition-opacity",
        isRefreshing && "pointer-events-none opacity-50"
      )}
    >
      {/* ── Command hero ── */}
      <section className="hero-mesh relative overflow-hidden rounded-[20px] border border-white/10 px-5 py-5 shadow-[0_24px_60px_-30px_rgba(6,10,20,0.6)] sm:px-7 sm:py-6">
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
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live command center
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            </div>

            <h1 className="mt-3.5 font-display text-[clamp(1.65rem,3vw,2.15rem)] font-extrabold leading-[1.08] tracking-[-0.035em] text-white">
              {userName ? `${greeting}, ${firstName}.` : "Institutional grievance overview."}
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
              <IngestionSimulator userRole={userRole} userBureau={userBureau} />
              <Link href="/cases/new" className="btn btn-primary btn-sm">
                <PlusCircle className="h-3.5 w-3.5" />
                Register complaint
              </Link>
              <span className="ml-1 text-[10.5px] font-medium text-slate-400">
                Synced {syncedLabel}
              </span>
            </div>
          </div>

          {/* Live pulse stats */}
          <div className="grid w-full grid-cols-3 gap-2.5 xl:w-[390px]">
            {[
              { label: "Disposal rate", value: disposalRate, suffix: "%", pct: disposalRate, color: "#34d399", icon: TrendingUp },
              { label: "SLA compliance", value: slaCompliance, suffix: "%", pct: slaCompliance, color: "#60a5fa", icon: Gauge },
              { label: "Avg. resolution", value: avgResolution, suffix: "d", pct: Math.min(100, (avgResolution / 45) * 100), color: "#fbbf4c", icon: Timer },
            ].map((s, si) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400">{s.label}</span>
                    <Icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="font-display text-[21px] font-extrabold leading-none tracking-tight text-white">
                      <CountUp value={s.value} suffix={s.suffix} />
                    </p>
                    <ProgressRing
                      value={s.pct}
                      color={s.color}
                      size={40}
                      stroke={3}
                      delay={140 + si * 120}
                      trackClassName="stroke-white/10"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Replayable login digest (first visit / what changed) ── */}
      {digest && showDigest && (
        <Reveal>
          <VisitDigestPanel digest={digest} onClose={() => setShowDigest(false)} />
        </Reveal>
      )}

      {/* ── Today's priorities ── */}
      <Reveal delay={60}>
        <section className="panel overflow-hidden">
          <div className="panel-head flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-saffron-300/60 bg-saffron-500/10 text-saffron-600 dark:border-saffron-400/20 dark:bg-saffron-400/10 dark:text-saffron-300">
                <ListChecks className="h-4 w-4" />
              </div>
              <div>
                <h2 className="panel-title">Today&apos;s priorities</h2>
                <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
                  Live registry signals — one click to act.
                </p>
              </div>
            </div>
            <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
              This week:{" "}
              <span className="text-slate-700 dark:text-slate-200">{recentMovement.received7d}</span>{" "}
              received ·{" "}
              <span className="text-slate-700 dark:text-slate-200">{recentMovement.disposed7d}</span>{" "}
              disposed
            </span>
          </div>
          <div className="grid grid-cols-1 gap-px bg-slate-100 dark:bg-white/5 sm:grid-cols-2 xl:grid-cols-4">
            {priorities.map((p) => {
              const Icon = p.icon;
              return (
                <Link
                  key={p.label}
                  href={p.href}
                  className="group bg-white p-4 transition-colors hover:bg-slate-50/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", p.tone)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
                  </div>
                  <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                    {p.label}
                  </p>
                  <p className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-slate-950 dark:text-white">
                    <CountUp value={p.count} />
                  </p>
                  <p className="mt-1.5 text-[10.5px] leading-snug text-slate-500 dark:text-slate-400">
                    {p.detail}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </Reveal>

      {/* ── Recent activity (RBAC-scoped audit projection) ── */}
      <Reveal delay={70}>
        <RecentActivity
          items={metrics.recentActivity}
          referenceTime={activityReference}
        />
      </Reveal>

      <Reveal>
        <OperationsWire items={wireItems} />
      </Reveal>

      <Reveal delay={90}>
        <AiBriefing />
      </Reveal>

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
                "kpi-card group relative overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg dark:bg-white/[0.02] dark:hover:border-white/20",
                kpi.alert
                  ? "border-rose-200/80 bg-gradient-to-br from-white to-rose-50/40 dark:border-rose-400/20 dark:from-white/[0.03] dark:to-rose-500/5"
                  : "border-slate-200 dark:border-white/10"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", kpi.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 group-hover:opacity-100 dark:text-slate-600 dark:group-hover:text-slate-300" />
              </div>

              <p className="mt-3.5 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                {kpi.label}
              </p>
              <p className="mt-1 font-display text-[29px] font-extrabold leading-none tracking-[-0.03em] text-slate-950 dark:text-white">
                <CountUp value={kpi.value} />
              </p>
              <p className="mt-1.5 truncate text-[10.5px] font-medium text-slate-400 dark:text-slate-500">{kpi.sub}</p>

              {/* Honest, date-derived weekly movement — only on cards with real data. */}
              {kpi.trend && (
                <div className="mt-2 flex items-center">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums dark:bg-transparent",
                      kpi.trend.direction === "flat"
                        ? "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:text-slate-400"
                        : (kpi.trend.direction === "up") === (kpi.trendGoodWhenUp ?? true)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300"
                          : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:text-rose-300"
                    )}
                    title={`${kpi.trend.current} in the last 7 days vs ${kpi.trend.previous} in the prior 7 days`}
                  >
                    {kpi.trend.direction === "up"
                      ? "▲"
                      : kpi.trend.direction === "down"
                        ? "▼"
                        : "—"}
                    {" "}
                    {kpi.trend.direction === "flat"
                      ? "no change"
                      : `${kpi.trend.direction === "up" ? "+" : "−"}${Math.abs(kpi.trend.delta)} vs prior 7d`}
                  </span>
                </div>
              )}

              <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
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
      <Reveal>
        <RiskRadar risk={metrics.riskRadar} />
      </Reveal>

      <Reveal delay={80}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bureau caseload distribution</h2>
            </div>
            <div className="flex items-center gap-3">
              {[
                { label: "Pending", color: "#f59e0b" },
                { label: "In process", color: "#2559e8" },
                { label: "Disposed", color: "#059669" },
              ].map((l) => (
                <span key={l.label} className="hidden items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 sm:flex">
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
                <defs>
                  <linearGradient id="dBureauPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf4c" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.72} />
                  </linearGradient>
                  <linearGradient id="dBureauProcess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6091fa" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#2559e8" stopOpacity={0.78} />
                  </linearGradient>
                  <linearGradient id="dBureauDisposed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.78} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.28)" vertical={false} />
                <XAxis dataKey="short" axisLine={false} tickLine={false} dy={8} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.045)" }} content={<ChartTooltip />} />
                <Bar dataKey="pending" name="Pending" fill="url(#dBureauPending)" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
                <Bar dataKey="underProcess" name="In process" fill="url(#dBureauProcess)" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
                <Bar dataKey="disposed" name="Disposed" fill="url(#dBureauDisposed)" radius={[6, 6, 0, 0]} maxBarSize={34} cursor="pointer" animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel flex flex-col">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Status mix</h2>
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
              <span className="font-display text-[27px] font-extrabold leading-none tracking-tight text-slate-950 dark:text-white">
                <CountUp value={k.totalReceived} />
              </span>
              <span className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
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
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-[10.5px] font-medium text-slate-500 dark:text-slate-400">{s.name}</span>
                <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-900 dark:text-white">{s.value}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      </Reveal>

      {/* ── Charts row 2 ── */}
      <Reveal delay={80}>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Pending ageing</h2>
            </div>
            <span className="badge border-rose-200 bg-rose-50 text-rose-600">SLA watch</span>
          </div>
          <div className="h-[224px] px-3 pb-3 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingData} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.28)" vertical={false} />
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
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.28)" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} dy={6} tickFormatter={(v) => String(v).split(" ")[0]} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="received" name="Received" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gReceived)" dot={{ r: 2.5, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 4 }} animationDuration={700} />
                <Area type="monotone" dataKey="disposed" name="Disposed" stroke="#10b981" strokeWidth={2.5} fill="url(#gDisposed)" dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }} activeDot={{ r: 4 }} animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-4 pb-3">
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Received
            </span>
            <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Disposed
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Regional volume</h2>
            </div>
            <Link href="/institutions" className="text-[10.5px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300">
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
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.28)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="region" axisLine={false} tickLine={false} width={74} tickFormatter={(v) => String(v).replace("North-Western", "NW").replace("South-Western", "SW")} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.04)" }} content={<ChartTooltip suffix=" cases" />} />
                <Bar dataKey="cases" name="Cases" fill="#2559e8" radius={[0, 5, 5, 0]} maxBarSize={18} cursor="pointer" animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      </Reveal>

      {/* ── Attention + collisions ── */}
      <Reveal delay={80}>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel xl:col-span-2 overflow-hidden">
          <div className="panel-head">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
                <Activity className="h-4 w-4" />
              </div>
              <div>
                <h2 className="panel-title">Requires attention</h2>
              </div>
            </div>
            <Link href="/cases?sla_status=BREACHED" className="btn btn-secondary btn-sm">
              Open SLA view
            </Link>
          </div>

          {urgentCases.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No urgent cases right now"
              action={
                <Link href="/cases?sla_status=BREACHED" className="btn btn-secondary btn-sm">
                  Open SLA view
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
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
                          <span className="block font-mono text-[10.5px] font-bold text-brand-700 group-hover:underline dark:text-brand-300">
                            {c.case_id}
                          </span>
                          <span className="mt-0.5 block max-w-[190px] truncate text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                            {c.category}
                          </span>
                        </Link>
                      </td>
                      <td>
                        <span className="block max-w-[200px] truncate text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                          {c.institution_name}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-slate-400 dark:text-slate-500">{c.institution_city}</span>
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
                        <Link href={`/cases/${c.id}`} className="inline-flex rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-brand-600 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-brand-300" aria-label={`View ${c.case_id}`}>
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
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h2 className="panel-title">Open collisions</h2>
              </div>
            </div>
          </div>

          {openOverlaps.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No uncoordinated overlaps"
              action={
                <Link href="/alerts?status=OPEN" className="btn btn-secondary btn-sm">
                  Open coordination hub
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {openOverlaps.map((o) => (
                <Link
                  key={o.id}
                  href={`/institutions/${o.institution_id}`}
                  className="group block px-4 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-[11.5px] font-bold text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                      {o.institution_name}
                    </p>
                    <ConfidencePill confidence={o.confidence} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {o.bureaus_involved.map((b: string) => (
                      <BureauPill key={b} bureau={b} />
                    ))}
                    <span className="text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
                      {o.case_ids.length} cases
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-[10.5px] text-slate-400 dark:text-slate-500">
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
      </Reveal>
    </div>
  );
}
