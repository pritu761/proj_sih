"use client";

import Link from "next/link";
import {
  Gavel,
  FileWarning,
  ShieldAlert,
  Building2,
  Download,
  BadgeCheck,
  ClipboardCheck,
  Lock,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAphClauses,
  type ComplianceAssessment,
} from "@/lib/services/aph-engine";

const BAND_STYLE: Record<
  ComplianceAssessment["band"],
  { color: string; text: string; border: string; wash: string }
> = {
  CRITICAL: {
    color: "#fb7185",
    text: "text-rose-300",
    border: "border-rose-500/40",
    wash: "bg-rose-500/10",
  },
  HIGH: {
    color: "#fbbf24",
    text: "text-amber-300",
    border: "border-amber-400/40",
    wash: "bg-amber-400/10",
  },
  MODERATE: {
    color: "#60a5fa",
    text: "text-sky-300",
    border: "border-sky-400/40",
    wash: "bg-sky-400/10",
  },
  LOW: {
    color: "#34d399",
    text: "text-emerald-300",
    border: "border-emerald-400/40",
    wash: "bg-emerald-400/10",
  },
};

const FLAG_META = {
  EOA: {
    icon: FileWarning,
    label: "Extension of Approval",
    activeLabel: "EoA scrutiny",
    inactiveLabel: "EoA clear",
  },
  EVC: {
    icon: ClipboardCheck,
    label: "Expert Visit Committee",
    activeLabel: "EVC inspection",
    inactiveLabel: "No EVC",
  },
  SCN: {
    icon: Gavel,
    label: "Show-cause notice",
    activeLabel: "Show-cause eligible",
    inactiveLabel: "Notice not advised",
  },
} as const;

export function EnforcementPanel({
  assessment,
  caseItem,
}: {
  assessment: ComplianceAssessment;
  caseItem: any;
}) {
  const meta = BAND_STYLE[assessment.band];
  const circumference = 2 * Math.PI * 31;
  const dash = (Math.min(100, assessment.score) / 100) * circumference;
  const caseClauses = getAphClauses(caseItem.category);
  const clauses = caseClauses.slice(0, 2);

  const flags = [
    {
      key: "EOA" as const,
      active: assessment.eoa.flag,
      headline: assessment.eoa.headline,
    },
    {
      key: "EVC" as const,
      active: assessment.evc.flag,
      headline: assessment.evc.headline,
    },
    {
      key: "SCN" as const,
      active: assessment.showCauseEligible,
      headline: assessment.showCauseEligible
        ? "Statutory notice can issue today"
        : "No high-priority allegation on record",
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_24px_60px_-34px_rgba(0,0,0,0.9)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-amber-400/[0.06] blur-3xl" />

      <div className="relative border-b border-white/10 px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300">
              <Gavel className="h-4 w-4" />
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-500">
                <Scale className="h-3 w-3 text-amber-400" />
                Regulatory enforcement · APH 2026-27
              </p>
              <h2 className="mt-0.5 font-display text-[14px] font-extrabold tracking-tight text-white">
                Institutional compliance risk & statutory action
              </h2>
              <p className="mt-0.5 text-[10px] font-medium text-slate-500">
                Deterministic engine · every point traceable · audited on issue
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-md border px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide", meta.border, meta.wash, meta.text)}>
              {assessment.bandLabel}
            </span>
            <Link
              href={`/institutions/${assessment.institutionId}`}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-bold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              <Building2 className="h-2.5 w-2.5" />
              Institution record
              <ArrowUpRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-[210px_1fr]">
        <div className="border-b border-white/10 p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3">
            <div className="relative h-[84px] w-[84px] shrink-0">
              <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
                <circle cx="42" cy="42" r="31" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                <circle
                  cx="42"
                  cy="42"
                  r="31"
                  fill="none"
                  stroke={meta.color}
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-[stroke-dasharray] duration-700"
                  style={{ filter: `drop-shadow(0 0 6px ${meta.color}66)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-[22px] font-extrabold leading-none tracking-tight text-white">
                  {assessment.score}
                </span>
                <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  / 100 risk
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.12em]", meta.text)}>
                {assessment.band}
              </p>
              <p className="mt-1 text-[9.5px] leading-snug text-slate-400">
                {assessment.activeCases} active · {assessment.slaBreaches} breached
              </p>
              <p className="mt-0.5 text-[9.5px] leading-snug text-slate-400">
                {assessment.openOverlaps} collision
                {assessment.openOverlaps === 1 ? "" : "s"} · {assessment.activeBureaus.length} bureau
                {assessment.activeBureaus.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2 border-t border-white/10 pt-3">
            <p className="text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              Score drivers
            </p>
            {assessment.drivers.slice(0, 4).map((driver) => (
              <div key={driver.label} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[9.5px] font-bold text-slate-300">{driver.label}</p>
                  <p className="truncate text-[8.5px] text-slate-500">{driver.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-[9px] font-extrabold text-amber-300">
                  +{driver.points}
                </span>
              </div>
            ))}
            {assessment.drivers.length === 0 && (
              <p className="text-[9px] italic text-slate-500">No adverse signal on record.</p>
            )}
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {flags.map((flag) => {
              const flagMeta = FLAG_META[flag.key];
              const Icon = flagMeta.icon;
              return (
                <div
                  key={flag.key}
                  className={cn(
                    "rounded-xl border p-2.5",
                    flag.active
                      ? flag.key === "SCN"
                        ? "border-rose-500/40 bg-rose-500/[0.08]"
                        : "border-amber-400/35 bg-amber-400/[0.07]"
                      : "border-emerald-400/25 bg-emerald-400/[0.05]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-[8px] font-extrabold uppercase tracking-[0.1em]", flag.active ? "text-amber-300" : "text-emerald-300")}>
                      {flagMeta.label}
                    </span>
                    {flag.active ? (
                      <AlertTriangle className="h-3 w-3 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    )}
                  </div>
                  <p className={cn("mt-1 flex items-center gap-1 text-[10px] font-bold leading-snug", flag.active ? "text-white" : "text-emerald-200")}>
                    <Icon className="h-3 w-3 shrink-0" />
                    {flag.active ? flagMeta.activeLabel : flagMeta.inactiveLabel}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[8.5px] leading-snug text-slate-500">
                    {flag.headline}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
              <ShieldAlert className="h-3 w-3 text-rose-400" />
              APH clauses engaged by this category
            </p>
            <div className="mt-1.5 space-y-1.5">
              {clauses.map((clause) => (
                <div key={clause.code} className="rounded-lg border border-white/10 bg-white/[0.025] px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 font-mono text-[8px] font-bold text-rose-300">
                      {clause.code}
                    </span>
                    <span className="text-[9px] font-bold text-slate-300">{clause.title}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[8.5px] leading-relaxed text-slate-500">
                    {clause.requirement}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {assessment.eoa.flag && assessment.eoa.conditions.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/[0.06] px-2.5 py-2">
              <p className="flex items-center gap-1.5 text-[8px] font-extrabold uppercase tracking-[0.12em] text-amber-300">
                <BadgeCheck className="h-3 w-3" />
                EoA conditions proposed
              </p>
              <ul className="mt-1 space-y-0.5">
                {assessment.eoa.conditions.slice(0, 3).map((condition) => (
                  <li key={condition} className="flex items-start gap-1.5 text-[8.5px] leading-relaxed text-amber-100/70">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    {condition}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-white/10 bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-500">
          <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          Notice is bound to the case record with a SHA-256 digest. Signatory: Competent Authority, AICTE.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {assessment.showCauseEligible ? (
            <a
              href={`/api/notices/show-cause/${caseItem.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-rose-200 transition-colors hover:border-rose-400 hover:bg-rose-500/25 hover:text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Download show-cause PDF
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-bold text-slate-500">
              <Lock className="h-3 w-3" />
              No show-cause trigger
            </span>
          )}
          <Link
            href={`/cases?q=${encodeURIComponent(caseItem.institution?.aicte_permanent_id ?? "")}`}
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[9.5px] font-bold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
          >
            All files
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
