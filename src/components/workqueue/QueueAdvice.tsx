"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, RefreshCw, ListOrdered, Inbox } from "lucide-react";
import { aiQueueAdviceAction } from "@/actions/ai-actions";
import { cn } from "@/lib/utils";

export function QueueAdvice({ hasQueue }: { hasQueue: boolean }) {
  const [advice, setAdvice] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [disabled, setDisabled] = useState(false);

  const generate = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await aiQueueAdviceAction();
      if (res.disabled) {
        setDisabled(true);
        setError(res.error || "AI is not configured.");
      } else if (!res.success) {
        setError(res.error || "Failed to generate advice.");
      } else {
        setAdvice(res.data);
      }
    } catch (err: any) {
      setError(err.message || "AI request failed.");
    } finally {
      setIsLoading(false);
    }
  };

  if (disabled || !hasQueue) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-white p-4 shadow-sm">
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-violet-500 to-fuchsia-400" />

      <div className="flex flex-wrap items-center justify-between gap-2 pl-3">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.1em] text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          AI prioritization advice
        </span>
        <button
          onClick={generate}
          disabled={isLoading}
          className="btn btn-sm border border-violet-200 bg-white text-violet-700 hover:bg-violet-50"
        >
          <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
          {advice ? "Regenerate" : isLoading ? "Analyzing…" : "Advise my day"}
        </button>
      </div>

      {isLoading && !advice ? (
        <div className="mt-4 space-y-2 pl-3">
          <div className="h-3 w-full animate-pulse rounded bg-slate-200/60" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-slate-200/60" />
          <div className="mt-3 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-slate-200/50" />
            ))}
          </div>
        </div>
      ) : advice ? (
        <div className="mt-3 space-y-3 pl-3">
          <p className="text-[11.5px] leading-relaxed text-slate-700">{advice.advice}</p>

          {advice.priorityOrder?.length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-white p-3">
              <h4 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                <ListOrdered className="h-3 w-3" /> Suggested order of work
              </h4>
              <ol className="space-y-1.5">
                {advice.priorityOrder.map((p: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <Link
                        href={`/cases/${p.caseCode}`}
                        className="font-mono font-bold text-violet-700 hover:underline"
                      >
                        {p.caseCode}
                      </Link>
                      <span className="text-slate-600"> — {p.reason}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {advice.workloadNote && (
            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Inbox className="mt-0.5 h-3 w-3 shrink-0" />
              {advice.workloadNote}
            </p>
          )}

          <p className="text-[10px] italic text-slate-400">
            Advisory only — SLA breach and statutory hearings should always take precedence.
          </p>
        </div>
      ) : (
        <p className="mt-3 pl-3 text-[11.5px] leading-relaxed text-slate-500">
          Get a suggested order of work based on SLA breach, hearings, and priority.
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
