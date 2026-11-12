"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartTooltip } from "@/components/ui/chart-tooltip";

/**
 * Public transparency charts — dark public-surface styling to match the
 * citizen tracker. Server page passes plain aggregate arrays.
 */
export function MonthlyFlowChart({
  data,
}: {
  data: { month: string; received: number; disposed: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.16)" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10.5 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10.5 }}
        />
        <Tooltip cursor={{ fill: "rgba(251,191,36,0.05)" }} content={<ChartTooltip suffix=" cases" />} />
        <Bar dataKey="received" name="Received" fill="#fbbf24" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={700} />
        <Bar dataKey="disposed" name="Disposed" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={700} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategoryBars({
  data,
  max,
}: {
  data: { category: string; received: number; disposed: number; avgDays: number }[];
  max: number;
}) {
  return (
    <div className="space-y-3">
      {data.map((c) => (
        <div key={c.category}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-[11.5px] font-bold text-white">{c.category}</p>
            <p className="shrink-0 text-[10.5px] font-semibold text-white/40">
              {c.disposed}/{c.received} disposed
              {c.avgDays > 0 && <> · {c.avgDays}d avg</>}
            </p>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-300"
              style={{ width: `${Math.max(3, Math.round((c.received / Math.max(1, max)) * 100))}%` }}
            />
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-transparent">
            <div
              className="h-full rounded-full bg-emerald-400/70"
              style={{ width: `${Math.max(2, Math.round((c.disposed / Math.max(1, max)) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
