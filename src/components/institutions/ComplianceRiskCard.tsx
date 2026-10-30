"use client";

import Link from "next/link";
import {
  Gavel,
  ShieldAlert,
  ArrowUpRight,
  FileWarning,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComplianceAssessment } from "@/lib/services/aph-engine";

const BAND_STYLE: Record<
  ComplianceAssessment["band"],
  { color: string; text: string; border: string; wash: string }
> = {
  CRITICAL: { color: "#fb7185", text: "text-rose-300", border: "border-rose-500/40", wash: "bg-rose-500/10" },
  HIGH: { color: "#fbbf24", text: "text-amber-300", border: "border-amber-400/40", wash: "bg-amber-400/10" },
  MODERATE: { color: "#60a5fa", text: "text-sky-300", border: "border-sky-400/40", wash: "bg-sky-400/10" },
  LOW: { color: "#34d399", text: "text-emerald-300", border: "border-emerald-400/40", wash: "bg-emerald-400/10" },
};

export function ComplianceRiskCard({
  assessment,
  showCauseCaseId,
}: {
  assessment: ComplianceAssessment;
  showCauseCaseId?: string;
}) {
  const meta = BAND_STYLE[assessment.band];
  const circumference = 2 * Math.PI * 26;
  const dash = (Math.min(100, assessment.score) / 100) * circumference;

  return (
    <section className="dark-surface relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
            <Scale className="h-3 w-3 text-amber-400" />
            Compliance & enforcement
          </p>
          <h2 className="mt-0.5 font-display text-[13.5px] font-extrabold tracking-tight text-white">
            Institutional APH risk
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">
          APH 2026-27
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-[70px] w-[70px] shrink-0">
          <svg viewBox="0 0 70 70" className="h-full w-full -rotate-90">
            <circle cx="35" cy="35" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="35"
              cy="35"
              r="26"
              fill="none"
              stroke={meta.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circumference}`}
              className="transition-[stroke-dasharray] duration-700"
              style={{ filter: `drop-shadow(0 0 5px ${meta.color}66)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-[18px] font-extrabold leading-none text-white">
              {assessment.score}
            </span>
            <span className="mt-0.5 text-[6.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
              /100
            </span>
          </div>
        </div>
        <div className="min-w-0">
          <span className={cn("inline-flex rounded border px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide", meta.border, meta.wash, meta.text)}>
            {assessment.band}
          </span>
          <p className="mt-1 text-[9.5px] font-semibold leading-snug text-slate-300">
            {assessment.eoa.flag ? "EoA scrutiny recommended" : "EoA renewal may proceed"}
          </p>
          <p className="mt-0.5 text-[8.5px] text-slate-500">
            {assessment.activeCases} active · {assessment.slaBreaches} breached · {assessment.openOverlaps} collision
            {assessment.openOverlaps === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          { key: "EOA", icon: FileWarning, active: assessment.eoa.flag, label: "EoA" },
          { key: "EVC", icon: ClipboardCheck, active: assessment.evc.flag, label: "EVC" },
          { key: "SCN", icon: Gavel, active: assessment.showCauseEligible, label: "SCN" },
        ].map((flag) => {
          const Icon = flag.icon;
          return (
            <div
              key={flag.key}
              className={cn(
                "rounded-lg border px-2 py-1.5 text-center",
                flag.active
                  ? flag.key === "SCN"
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-amber-400/35 bg-amber-400/[0.08]"
                  : "border-emerald-400/25 bg-emerald-400/[0.05]"
              )}
            >
              <Icon className={cn("mx-auto h-3 w-3", flag.active ? (flag.key === "SCN" ? "text-rose-300" : "text-amber-300") : "text-emerald-300")} />
              <p className={cn("mt-0.5 text-[8px] font-extrabold uppercase tracking-wide", flag.active ? "text-slate-200" : "text-emerald-200")}>
                {flag.label}
              </p>
              <p className="text-[7.5px] font-semibold text-slate-500">
                {flag.active ? "Flagged" : "Clear"}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/10 pt-2.5">
        {assessment.drivers.slice(0, 3).map((driver) => (
          <div key={driver.label} className="flex items-center justify-between gap-2">
            <span className="truncate text-[9px] font-medium text-slate-400">{driver.label}</span>
            <span className="font-mono text-[8.5px] font-bold text-amber-300">+{driver.points}</span>
          </div>
        ))}
        {assessment.drivers.length === 0 && (
          <p className="flex items-center gap-1 text-[9px] text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            No adverse compliance signal.
          </p>
        )}
      </div>

      {assessment.evc.flag && (
        <div className="mt-2.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-2 py-1.5">
          <p className="flex items-center gap-1 text-[8px] font-extrabold uppercase tracking-[0.1em] text-amber-300">
            <AlertTriangle className="h-2.5 w-2.5" />
            EVC scope
          </p>
          <p className="mt-0.5 line-clamp-2 text-[8.5px] leading-relaxed text-amber-100/70">
            {assessment.evc.scope[0]}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        {showCauseCaseId ? (
          <Link
            href={`/cases/${showCauseCaseId}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-200 transition-colors hover:bg-rose-500/20 hover:text-white"
          >
            <Gavel className="h-3 w-3" />
            Open enforcement file
            <ArrowUpRight className="h-2.5 w-2.5" />
          </Link>
        ) : (
          <Link
            href={`/cases?q=${encodeURIComponent(assessment.aictePermanentId)}`}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[9px] font-bold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            <Building2 className="h-3 w-3" />
            View all files
          </Link>
        )}
      </div>

      <p className="mt-2 flex items-start gap-1 text-[7.5px] leading-relaxed text-slate-400">
        <ShieldAlert className="mt-0.5 h-2 w-2 shrink-0" />
        Deterministic APH engine. Every point is traceable and every notice carries a SHA-256 digest.
      </p>
    </section>
  );
}
