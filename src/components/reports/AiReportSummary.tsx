"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, TrendingUp, AlertOctagon } from "lucide-react";
import { aiReportSummaryAction } from "@/actions/ai-actions";
import { cn } from "@/lib/utils";

export function AiReportSummary() {
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await aiReportSummaryAction();
      if (res.disabled) {
        setDisabled(true);
        setError(res.error || "AI is not configured.");
      } else if (!res.success) {
        setError(res.error || "Failed to generate summary.");
      } else {
        setSummary(res.data);
      }
    } catch (err: any) {
      setError(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (disabled) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/70 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-500 to-teal-400" />

      <div className="flex flex-wrap items-center justify-between gap-2 pl-3">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          AI executive summary
        </span>
        <button
          onClick={generate}
          disabled={isLoading}
          className="btn btn-sm border border-brand-200 bg-white text-brand-700 hover:bg-brand-50"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          {summary ? "Regenerate" : isLoading ? "Analyzing…" : "Draft summary"}
        </button>
      </div>

      {isLoading && !summary ? (
        <div className="mt-4 space-y-2 pl-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-slate-200/60" />
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="h-20 animate-pulse rounded-xl bg-slate-200/50" />
            <div className="h-20 animate-pulse rounded-xl bg-slate-200/50" />
          </div>
        </div>
      ) : summary ? (
        <div className="mt-3 space-y-3 pl-3">
          <p className="text-[12px] leading-relaxed text-slate-700">{summary.narrative}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                <TrendingUp className="h-3 w-3" /> Highlights
              </h4>
              <ul className="space-y-1 text-[11px] leading-relaxed text-emerald-900/90 list-disc list-inside">
                {summary.highlights?.map((h: string, i: number) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3">
              <h4 className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-700">
                <AlertOctagon className="h-3 w-3" /> Concerns
              </h4>
              <ul className="space-y-1 text-[11px] leading-relaxed text-rose-900/90 list-disc list-inside">
                {summary.concerns?.map((h: string, i: number) => (
                  <li key={i}>{h}</li>
                ))}
              </ul>
            </div>
          </div>

          {summary.outlook && (
            <p className="text-[11px] leading-relaxed text-slate-600">
              <strong className="font-bold text-slate-800">Outlook: </strong>
              {summary.outlook}
            </p>
          )}

          <p className="text-[10px] italic text-slate-400">
            AI-drafted from live report metrics — review and adapt before statutory publication.
          </p>
        </div>
      ) : (
        <p className="mt-3 pl-3 text-[11.5px] leading-relaxed text-slate-500">
          Draft a statutory-ready executive summary of portfolio performance with highlights and concerns.
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
