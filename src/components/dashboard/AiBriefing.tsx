"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, TrendingUp, ShieldAlert, Target, Eye, Flame } from "lucide-react";
import { aiDashboardBriefingAction } from "@/actions/ai-actions";
import { cn } from "@/lib/utils";

const toneMeta: Record<string, { label: string; icon: typeof Eye; chip: string }> = {
  STEADY: {
    label: "Steady",
    icon: TrendingUp,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  WATCHFUL: {
    label: "Watchful",
    icon: Eye,
    chip: "border-amber-200 bg-amber-50 text-amber-700",
  },
  URGENT: {
    label: "Urgent",
    icon: Flame,
    chip: "border-rose-200 bg-rose-50 text-rose-700",
  },
};

export function AiBriefing() {
  const [briefing, setBriefing] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await aiDashboardBriefingAction();
      if (res.disabled) {
        setDisabled(true);
        setError(res.error || "AI is not configured.");
      } else if (!res.success) {
        setError(res.error || "Failed to generate briefing.");
      } else {
        setBriefing(res.data);
      }
    } catch (err: any) {
      setError(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (disabled) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p className="text-[11px] leading-relaxed text-slate-500">
            AI briefing unavailable — {error || "GROQ_API_KEY is not configured."} Get a free key at
            console.groq.com/keys and add it to .env.
          </p>
        </div>
      </div>
    );
  }

  const Tone = briefing?.tone ? toneMeta[briefing.tone] : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-500 to-violet-400" />

      <div className="flex flex-wrap items-center justify-between gap-2 pl-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-700">
            <Sparkles className="h-3.5 w-3.5" />
            AI morning briefing
          </span>
          {Tone && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-bold",
                Tone.chip
              )}
            >
              <Tone.icon className="h-2.5 w-2.5" />
              {Tone.label}
            </span>
          )}
        </div>

        <button
          onClick={generate}
          disabled={isLoading}
          className="btn btn-sm border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          {briefing ? "Regenerate" : isLoading ? "Analyzing…" : "Generate briefing"}
        </button>
      </div>

      {isLoading && !briefing ? (
        <div className="mt-4 space-y-2 pl-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200/70" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/60" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="h-16 animate-pulse rounded-xl bg-slate-200/50" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-200/50" />
          </div>
        </div>
      ) : briefing ? (
        <div className="mt-3 space-y-3 pl-3">
          <p className="font-display text-[15px] font-extrabold leading-snug tracking-tight text-slate-900">
            {briefing.headline}
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-600">{briefing.situation}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
                <ShieldAlert className="h-3 w-3" /> Risks
              </h4>
              <ul className="space-y-1 text-[11px] leading-relaxed text-rose-900/90 list-disc list-inside">
                {briefing.risks?.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <Target className="h-3 w-3" /> Today's focus
              </h4>
              <ol className="space-y-1 text-[11px] leading-relaxed text-emerald-900/90 list-decimal list-inside">
                {briefing.recommendedFocus?.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ol>
            </div>
          </div>

          <p className="text-[10px] italic text-slate-400">
            AI-generated from live portfolio metrics — advisory only, verify before statutory filings.
          </p>
        </div>
      ) : (
        <p className="mt-3 pl-3 text-[11.5px] leading-relaxed text-slate-500">
          Generate a one-screen situational briefing: today's risks, SLA watch, and what to focus on.
        </p>
      )}

      {error && !disabled && (
        <p role="alert" className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
