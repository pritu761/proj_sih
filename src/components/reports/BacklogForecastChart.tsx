"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import type { BacklogForecastResult } from "@/lib/services/analytics";

/**
 * Backlog forecast — the deterministic, auditable projection behind the
 * "what does the open stock look like in 30/60/90 days" question. A linear
 * what-if from the observed intake and disposal rates of the trailing
 * window: deliberately no black-box model, since officers sign off on it.
 */
export function BacklogForecastChart({ forecast }: { forecast: BacklogForecastResult }) {
  const data = [
    { label: "Today", open: forecast.backlog, horizon: 0 },
    ...forecast.projections.map((p) => ({
      label: `+${p.days}d`,
      open: p.projectedOpen,
      horizon: p.days,
    })),
  ];

  const shrinking = forecast.netPerDay < 0;

  const stats = [
    {
      label: "Open backlog today",
      value: forecast.backlog,
      tone: "text-slate-900",
    },
    {
      label: "Intake rate",
      value: `${forecast.intakePerDay.toFixed(2)}/day`,
      tone: "text-brand-600",
      note: `${forecast.recentIntake} received in ${forecast.windowDays}d`,
    },
    {
      label: "Disposal rate",
      value: `${forecast.disposalPerDay.toFixed(2)}/day`,
      tone: "text-emerald-600",
      note: `${forecast.recentDisposals} closed in ${forecast.windowDays}d`,
    },
    {
      label: "Net drift",
      value: `${forecast.netPerDay > 0 ? "+" : ""}${forecast.netPerDay.toFixed(2)}/day`,
      tone: shrinking ? "text-emerald-600" : "text-rose-600",
      note: shrinking
        ? `backlog clears in ~${forecast.weeksToClear} weeks at this pace`
        : "backlog grows at this pace",
    },
  ];

  return (
    <div className="panel overflow-hidden">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Backlog forecast — 30 / 60 / 90 days out</h2>
          <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
            Linear what-if from observed intake vs disposal rates over the trailing{" "}
            {forecast.windowDays} days. Deterministic — every figure is reproducible
            from the registry, no model inference.
          </p>
        </div>
        <span
          className={
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold " +
            (shrinking
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700")
          }
        >
          {shrinking ? "Backlog shrinking" : "Backlog growing"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
              {s.label}
            </p>
            <p className={`mt-1 font-display text-[18px] font-extrabold leading-none tracking-[-0.02em] ${s.tone}`}>
              {s.value}
            </p>
            <p className="mt-1 text-[9.5px] font-medium text-slate-400">{s.note}</p>
          </div>
        ))}
      </div>

      <div className="h-[220px] px-2 py-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgba(100,116,139,0.9)", fontSize: 10.5 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              tick={{ fill: "rgba(100,116,139,0.9)", fontSize: 10.5 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148,163,184,0.08)" }} />
            <Bar dataKey="open" name="Projected open files" radius={[6, 6, 0, 0]} maxBarSize={64}>
              {data.map((d, i) => (
                <Cell
                  key={d.label}
                  fill={i === 0 ? "#2559e8" : shrinking ? "#059669" : "#f59e0b"}
                  fillOpacity={i === 0 ? 1 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
