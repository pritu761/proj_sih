"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "rgba(10, 16, 32, 0.96)",
  color: "#F8FAFC",
  borderRadius: "12px",
  fontSize: "11px",
  fontWeight: 600,
  padding: "9px 12px",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 12px 32px rgba(6,10,20,0.35)",
};

const statusColor: Record<string, string> = {
  Pending: "#f59e0b",
  "Under Process": "#2559e8",
  Disposed: "#059669",
  Transferred: "#7c3aed",
  Escalated: "#e11d48",
};

const bureauShort: Record<string, string> = {
  "Regulation Bureau": "RB",
  PGRC: "PGRC",
  "Approval Bureau": "AB",
  "Skill Cell": "SDC",
  "Skill Development Cell": "SDC",
};

export function ReportsClient({ metrics }: { metrics: any }) {
  const bureauData = (metrics.bureauWorkload ?? []).map((b: any) => ({
    ...b,
    short: bureauShort[b.bureau] ?? b.bureau,
  }));

  const statusData = (metrics.statusDistribution ?? []).map((s: any) => ({
    ...s,
    color: statusColor[s.name] ?? s.color ?? "#94a3b8",
  }));

  const ageingData = [
    { range: "0–15 days", count: metrics.ageingBuckets?.bucket_0_15 ?? 0, color: "#10b981" },
    { range: "16–30 days", count: metrics.ageingBuckets?.bucket_16_30 ?? 0, color: "#2559e8" },
    { range: "31–60 days", count: metrics.ageingBuckets?.bucket_31_60 ?? 0, color: "#f59e0b" },
    { range: "60+ days", count: metrics.ageingBuckets?.bucket_60_plus ?? 0, color: "#e11d48" },
  ];

  const totalAgeing = Math.max(1, ageingData.reduce((sum, a) => sum + a.count, 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Velocity */}
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Disposal velocity</h2>
              <p className="panel-sub">Received vs disposed · rolling six-month window</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-saffron-500" /> Received
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Disposed
              </span>
            </div>
          </div>
          <div className="h-[300px] px-3 pb-4 pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={metrics.monthlyTrends ?? []}
                margin={{ top: 6, right: 14, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="repReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="repDisposed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" vertical={false} />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  dy={8}
                  tickFormatter={(v) => String(v).split(" ")[0]}
                />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }} />
                <Area
                  type="monotone"
                  dataKey="received"
                  name="Received"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  fill="url(#repReceived)"
                  dot={{ r: 2.5, fill: "#f59e0b", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  animationDuration={700}
                />
                <Area
                  type="monotone"
                  dataKey="disposed"
                  name="Disposed"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fill="url(#repDisposed)"
                  dot={{ r: 2.5, fill: "#10b981", strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                  animationDuration={700}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status mix */}
        <div className="panel flex flex-col">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Lifecycle mix</h2>
              <p className="panel-sub">Case status distribution</p>
            </div>
          </div>
          <div className="relative h-[190px] px-4 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={82}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                  animationDuration={700}
                >
                  {statusData.map((entry: any, i: number) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-1">
              <span className="font-display text-[26px] font-extrabold leading-none tracking-tight text-slate-950">
                {metrics.kpi?.totalReceived ?? 0}
              </span>
              <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                total cases
              </span>
            </div>
          </div>
          <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-0.5 p-4 pt-2">
            {statusData.map((s: any) => (
              <div
                key={s.name}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
                <span className="truncate text-[10.5px] font-medium text-slate-500">{s.name}</span>
                <span className="ml-auto text-[11px] font-bold tabular-nums text-slate-900">
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Bureau composition */}
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Bureau workload composition</h2>
              <p className="panel-sub">Pending, in-process, and disposed split by division</p>
            </div>
            <div className="hidden items-center gap-3 sm:flex">
              {[
                { label: "Pending", color: "#f59e0b" },
                { label: "In process", color: "#2559e8" },
                { label: "Disposed", color: "#10b981" },
              ].map((l) => (
                <span
                  key={l.label}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500"
                >
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
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#eef2f8" vertical={false} />
                <XAxis dataKey="short" axisLine={false} tickLine={false} dy={8} />
                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: "rgba(37,89,232,0.05)" }} contentStyle={tooltipStyle} />
                <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} maxBarSize={46} animationDuration={700} />
                <Bar dataKey="underProcess" name="In process" stackId="a" fill="#2559e8" maxBarSize={46} animationDuration={700} />
                <Bar dataKey="disposed" name="Disposed" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={46} animationDuration={700} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ageing */}
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Pending ageing</h2>
              <p className="panel-sub">Days since receipt</p>
            </div>
            <span className="badge border-rose-200 bg-rose-50 text-rose-600">SLA watch</span>
          </div>
          <div className="space-y-3 p-4">
            {ageingData.map((a) => (
              <div key={a.range}>
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-semibold text-slate-600">{a.range}</span>
                  <span className="font-extrabold tabular-nums text-slate-900">
                    {a.count}
                    <span className="ml-1 text-[9px] font-medium text-slate-400">
                      {Math.round((a.count / totalAgeing) * 100)}%
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.max(a.count > 0 ? 3 : 0, (a.count / totalAgeing) * 100)}%`,
                      background: a.color,
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[8px] font-extrabold text-white">
                !
              </span>
              <p className="text-[10px] leading-relaxed text-amber-800">
                Cases beyond 60 days materially reduce the bureau disposal rate and trigger automatic
                escalation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegionBars({ data }: { data: any[] }) {
  const max = Math.max(1, ...data.map((d) => d.cases));

  return (
    <div className="space-y-2.5">
      {data.map((r) => (
        <div key={r.region} className="flex items-center gap-3">
          <span className="w-[104px] shrink-0 truncate text-[10.5px] font-semibold text-slate-600">
            {r.region}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
              style={{ width: `${(r.cases / max) * 100}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-[10.5px] font-extrabold tabular-nums text-slate-900">
            {r.cases}
          </span>
        </div>
      ))}
    </div>
  );
}
