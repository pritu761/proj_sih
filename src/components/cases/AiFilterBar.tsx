"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowRight, Loader2, Info } from "lucide-react";
import { aiParseCaseFiltersAction } from "@/actions/ai-actions";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "breached capitation fee cases older than 30 days",
  "critical priority cases in the southern region",
  "PGRC cases filed in the last 45 days",
  "transferred cases nearing SLA deadline",
];

/**
 * Natural-language entry point for the case explorer: one Groq call converts
 * the sentence into whitelisted query-builder filters, then jumps to the
 * filtered registry URL so the normal filter chips take over.
 */
export function AiFilterBar({ nl, view }: { nl?: string; view?: string }) {
  const [query, setQuery] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const run = async (value?: string) => {
    const target = (value ?? query).trim();
    if (target.length < 4) {
      setError("Describe the filter in a few words.");
      return;
    }
    setIsParsing(true);
    setError("");
    const res = await aiParseCaseFiltersAction({ query: target });
    setIsParsing(false);

    if (!res.success) {
      setError(res.error || "Could not read that query.");
      return;
    }

    const sp = new URLSearchParams();
    for (const [key, val] of Object.entries(res.data?.filters ?? {})) {
      if (val) sp.set(key, String(val));
    }
    if (res.data?.reasoning) sp.set("nl", res.data.reasoning);
    if (view) sp.set("view", view);
    router.push(`/cases?${sp.toString()}`);
  };

  return (
    <div className="border-b border-slate-100 bg-gradient-to-r from-brand-50/70 via-white to-slate-50/50 px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-center gap-2.5 sm:w-52">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-white text-brand-600 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="font-display text-[12.5px] font-bold text-slate-900">Ask in plain English</p>
            <p className="text-[10px] font-medium text-slate-400">AI maps it to registry filters</p>
          </div>
        </div>

        <div className="flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isParsing) run();
            }}
            placeholder="e.g. breached capitation fee cases older than 30 days…"
            className="input h-9 w-full text-[11.5px]"
            aria-label="Describe the case filter in plain English"
          />
        </div>

        <button
          onClick={() => run()}
          disabled={isParsing}
          className="btn btn-primary btn-sm shrink-0 px-3.5"
        >
          {isParsing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isParsing ? "Reading…" : "Filter"}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Try
        </span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => {
              setQuery(ex);
              run(ex);
            }}
            disabled={isParsing}
            className={cn(
              "rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500 transition-colors",
              "hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50"
            )}
          >
            {ex}
          </button>
        ))}
      </div>

      {nl && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-brand-100 bg-brand-50/60 px-2.5 py-1.5 text-[10.5px] font-medium text-brand-800">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            <span className="font-bold">AI read that as:</span> {nl}
          </span>
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[10.5px] font-semibold text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
