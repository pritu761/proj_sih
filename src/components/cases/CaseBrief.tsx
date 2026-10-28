"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Gauge,
  Layers,
  Lock,
  ShieldAlert,
  Scale,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CountUp } from "@/components/ui/count-up";
import type { CaseInsight, RiskBand } from "@/lib/services/risk-engine";

const BAND: Record<RiskBand, { label: string; color: string; text: string; bg: string; border: string }> = {
  CRITICAL: { label: "Critical risk", color: "#e11d48", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200" },
  HIGH: { label: "High risk", color: "#ea580c", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  MODERATE: { label: "Moderate risk", color: "#d97706", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  LOW: { label: "Low risk", color: "#059669", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
};

const ACTION_LABEL: Record<CaseInsight["recommendation"]["action"], string> = {
  STATUS: "Open status workflow",
  ESCALATE: "Start escalation",
  REMARK: "Record a remark",
  TRANSFER: "Transfer the file",
  LINK: "Link the colliding case",
};

export function CaseBrief({
  insight,
  canAct,
  onAction,
}: {
  insight: CaseInsight;
  canAct: boolean;
  onAction: (action: CaseInsight["recommendation"]["action"]) => void;
}) {
  const { risk, recommendation, benchmark, similar, overlap } = insight;
  const meta = BAND[risk.band];

  const circumference = 2 * Math.PI * 30;
  const dash = (risk.score / 100) * circumference;
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section className="panel rail-top overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h2 className="font-display text-[12.5px] font-bold tracking-tight text-slate-900">
            Sentinel Brief
          </h2>
          <span className="rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-brand-700">
            Explainable
          </span>
        </div>
        <p className="text-[9.5px] font-medium text-slate-400">
          Recomputed from {risk.drivers.length} live signals - no black-box model
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-100 md:grid-cols-[190px_1fr_260px] md:divide-x md:divide-y-0">
        {/* Score */}
        <div className="flex items-center gap-4 p-5 md:flex-col md:items-start md:justify-center md:gap-2">
          <div className="relative h-[76px] w-[76px] shrink-0">
            <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="38" cy="38" r="30" fill="none" stroke="var(--sla-track)" strokeWidth="7" />
              <circle
                cx="38"
                cy="38"
                r="30"
                fill="none"
                stroke={meta.color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${drawn ? dash : 0} ${circumference}`}
                className="transition-[stroke-dasharray] duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[20px] font-extrabold leading-none tracking-tight" style={{ color: meta.color }}>
                <CountUp value={risk.score} duration={1100} />
              </span>
              <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                / 100
              </span>
            </div>
          </div>
          <div>
            <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide", meta.bg, meta.border, meta.text)}>
              <Gauge className="h-2.5 w-2.5" />
              {meta.label}
            </span>
            <p className="mt-1.5 text-[10.5px] font-semibold text-slate-700">
              {risk.isBreached
                ? `${Math.abs(risk.remainingDays)} days past the statutory deadline`
                : `${risk.remainingDays} of ${insight.timelineDays} days remain`}
            </p>
            <p className="mt-0.5 text-[9.5px] text-slate-400">
              {insight.elapsedDays} days elapsed - {risk.percentElapsed}% of the clock
            </p>
          </div>
        </div>

        {/* Drivers */}
        <div className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Why this file ranks here
            </p>
            {overlap && (
              <Link
                href="/alerts"
                className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[8.5px] font-bold text-rose-600 hover:bg-rose-100"
              >
                <ShieldAlert className="h-2.5 w-2.5" />
                {overlap.confidence} collision
              </Link>
            )}
          </div>

          <ul className="mt-2.5 space-y-2">
            {risk.drivers.slice(0, 3).map((d) => (
              <li key={d.label} className="flex items-start gap-2.5">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[11px] font-bold text-slate-800">{d.label}</p>
                    <span className="font-mono text-[9px] font-bold text-slate-400">
                      +{d.points}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-slate-500">{d.detail}</p>
                </div>
              </li>
            ))}
            {risk.drivers.length === 0 && (
              <li className="text-[11px] text-slate-500">
                No adverse signals. File is within its timeline and moving.
              </li>
            )}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2.5">
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400">
              <Layers className="h-2.5 w-2.5" />
              {similar.length} similar closed {similar.length === 1 ? "file" : "files"}
            </span>
            {benchmark && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                <Scale className="h-2.5 w-2.5" />
                Peer median {benchmark.avgDays}d
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
              <BadgeCheck className="h-2.5 w-2.5" />
              Audited trail
            </span>
          </div>
        </div>

        {/* Recommendation */}
        <div className="bg-gradient-to-br from-brand-50/80 to-white p-5">
          <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand-600">
            Recommended next action
          </p>
          <p className="mt-1.5 font-display text-[13px] font-bold leading-snug tracking-tight text-slate-900">
            {recommendation.title}
          </p>
          <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
            {recommendation.detail}
          </p>

          {canAct ? (
            <button
              onClick={() => onAction(recommendation.action)}
              className="btn btn-primary btn-sm mt-3 w-full justify-center"
            >
              {ACTION_LABEL[recommendation.action]}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : (
            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/70 px-2.5 py-2 text-[9.5px] font-medium text-slate-500">
              <Lock className="h-2.5 w-2.5 shrink-0" />
              Read-only view - the assigned bureau owns this workflow
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
