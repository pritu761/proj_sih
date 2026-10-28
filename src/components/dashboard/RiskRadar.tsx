"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Radar,
  ArrowUpRight,
  Flame,
  Clock3,
  ShieldAlert,
  Sparkles,
  Info,
} from "lucide-react";
import { cn, getBureauShortName } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import type { CaseRisk, RiskBand, RiskRadar as RiskRadarData } from "@/lib/services/risk-engine";

const BAND: Record<
  RiskBand,
  { label: string; color: string; text: string; bg: string; border: string }
> = {
  CRITICAL: { label: "Critical", color: "#e11d48", text: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
  HIGH: { label: "High", color: "#ea580c", text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200" },
  MODERATE: { label: "Moderate", color: "#d97706", text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
  LOW: { label: "Low", color: "#059669", text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const HORIZONS = [7, 15, 30] as const;

function daysLabel(c: CaseRisk) {
  if (c.isBreached) return `${Math.abs(c.remainingDays)}d overdue`;
  if (c.remainingDays === 0) return "Breaches today";
  return `${c.remainingDays}d to deadline`;
}

export function RiskRadar({ risk }: { risk?: RiskRadarData }) {
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(15);
  const [hovered, setHovered] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (!risk) return [];
    const within = risk.top.filter(
      (c) => c.isBreached || (c.remainingDays >= 0 && c.remainingDays <= horizon)
    );
    const rest = risk.top.filter((c) => !within.includes(c));
    return [...within, ...rest].slice(0, 4);
  }, [risk, horizon]);

  if (!risk) return null;

  const horizonCount = risk.horizons.find((h) => h.days === horizon)?.count ?? 0;
  const criticalCount = risk.bands.find((b) => b.band === "CRITICAL")?.count ?? 0;
  const exposure = risk.exposure;

  return (
    <section className="panel overflow-hidden">
      <div className="panel-head items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-600">
            <Radar className="h-[18px] w-[18px]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="panel-title">Sentinel Risk Radar</h2>
              <span className="badge border-slate-200 bg-slate-50 text-slate-500">
                <Sparkles className="h-2.5 w-2.5" />
                Explainable model
              </span>
            </div>
            <p className="panel-sub">
              Predicted statutory breaches across {risk.scored} active files - every score shows its drivers
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {HORIZONS.map((h) => (
            <button
              key={h}
              onClick={() => setHorizon(h)}
              aria-pressed={horizon === h}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold transition-all",
                horizon === h
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              )}
            >
              {h}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[262px_1fr]">
        {/* Radar scope */}
        <div className="relative overflow-hidden border-b border-slate-100 bg-ink-950 p-5 lg:border-b-0 lg:border-r">
          <div
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                "radial-gradient(240px 240px at 50% 42%, rgba(59,118,246,0.22), transparent 70%)",
            }}
          />
          <div className="relative mx-auto h-[176px] w-[176px]">
            <svg viewBox="0 0 176 176" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id="radar-sweep" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
                  <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              {[80, 58, 36].map((r) => (
                <circle
                  key={r}
                  cx="88"
                  cy="88"
                  r={r}
                  fill="none"
                  stroke="rgba(148,183,246,0.16)"
                  strokeDasharray={r === 80 ? "0" : "3 5"}
                />
              ))}
              <line x1="8" y1="88" x2="168" y2="88" stroke="rgba(148,183,246,0.12)" />
              <line x1="88" y1="8" x2="88" y2="168" stroke="rgba(148,183,246,0.12)" />
              <g className="radar-sweep">
                <path d="M88 88 L168 88 A80 80 0 0 0 128 18 Z" fill="url(#radar-sweep)" />
              </g>
              {risk.top.slice(0, 5).map((c, i) => {
                const angle = (-90 + i * 66) * (Math.PI / 180);
                const radius = 26 + (c.score / 100) * 52;
                const x = 88 + Math.cos(angle) * radius;
                const y = 88 + Math.sin(angle) * radius;
                const color = BAND[c.band].color;
                const active = hovered === c.id;
                return (
                  <g
                    key={c.id}
                    onMouseEnter={() => setHovered(c.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <circle cx={x} cy={y} r={active ? 9 : 6} fill={color} opacity={0.16}>
                      <animate attributeName="r" values="4;10;4" dur="3.2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                      <animate attributeName="opacity" values="0.34;0;0.34" dur="3.2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                    </circle>
                    <circle cx={x} cy={y} r={active ? 4.4 : 3.4} fill={color} />
                  </g>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[30px] font-extrabold leading-none tracking-tight text-white">
                <CountUp value={exposure} />
              </span>
              <span className="mt-1 text-[8.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
                exposure index
              </span>
            </div>
          </div>

          <div className="relative mt-1 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <Flame className="h-2.5 w-2.5 text-rose-400" /> Overdue
              </p>
              <p className="mt-1 font-display text-[16px] font-extrabold leading-none text-white">
                {risk.breached}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
              <p className="flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                <ShieldAlert className="h-2.5 w-2.5 text-amber-400" /> Critical
              </p>
              <p className="mt-1 font-display text-[16px] font-extrabold leading-none text-white">
                {criticalCount}
              </p>
            </div>
          </div>

          <div className="relative mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
              <Clock3 className="h-2.5 w-2.5" /> Next {horizon} days
            </span>
            <span className="font-display text-[14px] font-extrabold text-amber-300">{horizonCount}</span>
          </div>
        </div>

        {/* Ranked watchlist */}
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 sm:px-5">
            <span className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Priority watchlist
            </span>
            <span className="hidden text-[10px] font-medium text-slate-400 sm:inline">
              Hover the scope to identify a file
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[12px] font-semibold text-slate-500">
                No files breach in the next {horizon} days.
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Switch the horizon to widen the forecast.</p>
            </div>
          ) : (
            <ul key={horizon} className="divide-y divide-slate-100">
              {rows.map((c, idx) => {
                const meta = BAND[c.band];
                const topDriver = c.drivers[0];
                const active = hovered === c.id;
                return (
                  <li
                    key={c.id}
                    className="watch-row"
                    style={{ animationDelay: `${idx * 60}ms` }}
                  >
                    <Link
                      href={`/cases/${c.id}`}
                      onMouseEnter={() => setHovered(c.id)}
                      onMouseLeave={() => setHovered(null)}
                      className={cn(
                        "group flex items-center gap-3 px-4 py-3 transition-colors sm:px-5",
                        active ? "bg-brand-50/60" : "hover:bg-slate-50"
                      )}
                    >
                      <span className="w-4 shrink-0 text-center font-mono text-[10px] font-bold text-slate-300">
                        {String(idx + 1).padStart(2, "0")}
                      </span>

                      <div
                        className={cn(
                          "flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl border text-[13px] font-extrabold leading-none",
                          meta.bg,
                          meta.border,
                          meta.text
                        )}
                        title={`Risk ${c.score}/100`}
                      >
                        {c.score}
                        <span className="mt-0.5 text-[7px] font-bold uppercase tracking-wide opacity-70">
                          risk
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-mono text-[10.5px] font-bold text-brand-700">
                            {c.case_id}
                          </span>
                          <span className="rounded-md border border-slate-200 bg-white px-1.5 py-px text-[8.5px] font-bold text-slate-500">
                            {getBureauShortName(c.bureau)}
                          </span>
                          <span className={cn("rounded-md px-1.5 py-px text-[8.5px] font-extrabold uppercase tracking-wide", meta.bg, meta.text)}>
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11.5px] font-semibold text-slate-800">
                          {c.institution_name}
                        </p>
                        <p className="mt-px truncate text-[10px] text-slate-400">
                          {c.category}
                          {topDriver ? ` - ${topDriver.detail}` : ""}
                        </p>
                      </div>

                      <div className="hidden shrink-0 text-right sm:block">
                        <p
                          className={cn(
                            "text-[10.5px] font-bold",
                            c.isBreached ? "text-rose-600" : c.remainingDays <= horizon ? "text-amber-600" : "text-slate-500"
                          )}
                        >
                          {daysLabel(c)}
                        </p>
                        <p className="text-[9px] font-medium text-slate-400">
                          {c.percentElapsed}% elapsed
                        </p>
                      </div>

                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-colors group-hover:text-brand-500" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 sm:px-5">
            <span className="inline-flex items-center gap-1 text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
              <Info className="h-2.5 w-2.5" />
              Model weights
            </span>
            {[
              ["SLA", "45"],
              ["Priority", "15"],
              ["Stagnation", "12"],
              ["Overlap", "10"],
              ["Churn", "8"],
              ["Category", "6"],
            ].map(([label, weight]) => (
              <span key={label} className="text-[9px] font-semibold text-slate-400">
                {label} <span className="font-mono text-slate-500">{weight}</span>
              </span>
            ))}
            <span className="ml-auto hidden text-[9px] font-medium text-slate-400 md:inline">
              Deterministic and reviewable - no black-box ML
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
