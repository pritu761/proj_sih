"use client";

import {
  Fingerprint,
  BrainCircuit,
  TimerReset,
  GitMerge,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrilayerLayerView {
  key: "ENTITY" | "SEMANTIC" | "TEMPORAL";
  label: string;
  score: number;
  weight: number;
  verdict: "STRONG" | "CORROBORATING" | "WEAK";
  evidence: string[];
}

export interface TrilayerView {
  entity: TrilayerLayerView;
  semantic: TrilayerLayerView;
  temporal: TrilayerLayerView;
  total: number;
  formula: string;
}

const LAYER_META = {
  ENTITY: {
    icon: Fingerprint,
    color: "#fbbf24",
    text: "text-amber-300",
    tag: "bg-amber-400/10 text-amber-300 border-amber-400/30",
  },
  SEMANTIC: {
    icon: BrainCircuit,
    color: "#34d399",
    text: "text-emerald-300",
    tag: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  },
  TEMPORAL: {
    icon: TimerReset,
    color: "#fb7185",
    text: "text-rose-300",
    tag: "bg-rose-500/10 text-rose-300 border-rose-500/30",
  },
} as const;

const VERDICT_LABEL = {
  STRONG: "Strong signal",
  CORROBORATING: "Corroborating",
  WEAK: "Weak signal",
} as const;

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-300";
  if (score >= 60) return "text-amber-300";
  return "text-rose-300";
}

export function TrilayerPanel({
  trilayer,
  onMerge,
  merged = false,
  masterCaseId,
  confidence,
  compact = false,
}: {
  trilayer?: TrilayerView | null;
  onMerge?: () => void;
  merged?: boolean;
  masterCaseId?: string | null;
  confidence?: string;
  compact?: boolean;
}) {
  if (!trilayer) {
    return (
      <div className="dark-surface rounded-xl border border-white/10 bg-slate-950/70 p-3 text-[10.5px] text-slate-400">
        Layer scores are being reconstructed from the case record.
      </div>
    );
  }

  const layers = [trilayer.entity, trilayer.semantic, trilayer.temporal];
  const effectiveConfidence =
    confidence ??
    (trilayer.total >= 80 ? "HIGH" : trilayer.total >= 65 ? "MEDIUM" : "LOW");

  return (
    <div
      className={cn(
        "dark-surface relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.9)]",
        compact ? "p-3.5" : "p-4"
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-slate-400">
            <Fingerprint className="h-3 w-3 text-amber-400" />
            Trilayer match explainability
          </p>
          <p className="mt-1 text-[10px] font-medium text-slate-500">{trilayer.formula}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[8.5px] font-bold uppercase tracking-[0.12em] text-slate-500">
              Composite match
            </p>
            <p className={cn("font-display text-[22px] font-extrabold leading-none tracking-tight", scoreTone(trilayer.total))}>
              {trilayer.total}
              <span className="ml-0.5 text-[10px] font-bold text-slate-400">/100</span>
            </p>
          </div>
          <span
            className={cn(
              "rounded-md border px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide",
              effectiveConfidence === "HIGH"
                ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                : effectiveConfidence === "MEDIUM"
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-300"
                  : "border-slate-500/40 bg-slate-500/10 text-slate-300"
            )}
          >
            {effectiveConfidence === "HIGH"
              ? "High confidence"
              : effectiveConfidence === "MEDIUM"
                ? "Medium confidence"
                : "Low confidence"}
          </span>
        </div>
      </div>

      <div className="mt-3.5 space-y-3">
        {layers.map((layer) => {
          const meta = LAYER_META[layer.key];
          const Icon = meta.icon;
          return (
            <div key={layer.key}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta.color }} />
                  <span className="truncate text-[11px] font-bold text-slate-200">
                    {layer.label}
                  </span>
                  <span className="hidden rounded border border-white/10 bg-white/[0.03] px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:inline">
                    {Math.round(layer.weight * 100)}%
                  </span>
                  <span className={cn("hidden rounded border px-1 py-0.5 text-[8px] font-bold uppercase tracking-wide sm:inline", meta.tag)}>
                    {VERDICT_LABEL[layer.verdict]}
                  </span>
                </div>
                <span className={cn("shrink-0 font-mono text-[11px] font-extrabold tabular-nums", meta.text)}>
                  {layer.score}
                </span>
              </div>

              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(2, Math.min(100, layer.score))}%`,
                    background: meta.color,
                    boxShadow: `0 0 12px ${meta.color}66`,
                  }}
                />
              </div>

              <p className="mt-1 line-clamp-2 text-[9.5px] leading-relaxed text-slate-500">
                {layer.evidence[0]}
              </p>
            </div>
          );
        })}
      </div>

      {merged ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Merged into master docket
          </span>
          <span className="font-mono text-[9.5px] font-bold text-emerald-200/80">
            {masterCaseId ?? "master file"}
          </span>
        </div>
      ) : onMerge ? (
        <div className="mt-3.5 flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[9.5px] leading-relaxed text-slate-500">
            One inquiry should proceed. Merge parallel files into a single master docket.
          </p>
          <button
            type="button"
            onClick={onMerge}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-300 transition-colors hover:border-emerald-300 hover:bg-emerald-400/20 hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
          >
            <GitMerge className="h-3.5 w-3.5" />
            Merge into master docket
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
