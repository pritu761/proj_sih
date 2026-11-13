"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Send,
  Loader2,
  ArrowRight,
  MessageSquareText,
  Flame,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

interface CopilotUser {
  name: string;
  role: string;
  bureau: string;
}

interface CopilotCaseChip {
  case_id: string;
  internal_id: string;
  category: string;
  status: string;
  institution_name: string;
  sla_status: string;
  sla_days: number;
}

interface ChatEntry {
  role: "user" | "assistant";
  content: string;
  cases?: CopilotCaseChip[];
  filterNote?: string;
  reasoning?: string;
}

const SUGGESTIONS = [
  "How many breached capitation fee cases are there right now?",
  "Which files in the Southern region are overdue?",
  "What is the status of the Vellore Institute grievance?",
  "Show me PGRC's pending files",
  "Which cases have hearings coming up?",
];

const STATUS_TONE: Record<string, string> = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  UNDER_PROCESS: "border-brand-200 bg-brand-50 text-brand-700",
  DISPOSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  TRANSFERRED: "border-violet-200 bg-violet-50 text-violet-700",
  ESCALATED: "border-rose-200 bg-rose-50 text-rose-700",
};

export function CopilotClient({ user }: { user: CopilotUser }) {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = async (query: string) => {
    const text = query.trim();
    if (!text || isLoading) return;

    const history = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setIsLoading(true);
    setError("");
    window.setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 30);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, history }),
      });
      const json = await res.json();

      if (json.disabled) {
        setDisabled(true);
        setError(json.error || "AI features are not configured. Set GROQ_API_KEY.");
      } else if (!json.success) {
        setError(json.error || "Copilot could not answer right now.");
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: json.data.answer,
            cases: json.data.facts?.matchedCases ?? [],
            filterNote: json.data.facts?.filterNote,
            reasoning: json.data.reasoning,
          },
        ]);
      }
    } catch {
      setError("Network error — the copilot could not be reached.");
    } finally {
      setIsLoading(false);
      window.setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      }, 30);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registry Copilot"
        icon={Sparkles}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10.5px] font-bold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Grounded in the live registry
          </span>
        }
      />

      <div className="mx-auto w-full max-w-3xl">
        <div className="panel flex h-[calc(100vh-220px)] min-h-[480px] flex-col overflow-hidden">
          {/* Transcript */}
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-white text-brand-600">
                  <MessageSquareText className="h-5 w-5" />
                </div>
                <p className="mt-3 font-display text-[15px] font-bold text-slate-900">
                  Ask the registry, in plain language
                </p>
                <p className="mt-1 max-w-md text-[11.5px] leading-relaxed text-slate-500">
                  {user.name}, the copilot reads the same live store you do — portfolio
                  counts, SLA clocks, hearings, coordination state. Answers cite registry
                  numbers; every figure is recomputed from the data, never invented.
                </p>
                <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-md border border-brand-100 bg-brand-50/70 px-4 py-2.5">
                    <p className="text-[12.5px] font-medium leading-relaxed text-slate-800">
                      {m.content}
                    </p>
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[92%] space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 text-ink-950">
                        <Sparkles className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3">
                        <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-slate-700">
                          {m.content}
                        </p>
                        {m.filterNote && (
                          <p className="mt-2 border-t border-slate-100 pt-2 text-[10px] font-medium text-slate-400">
                            Read as: {m.filterNote}
                          </p>
                        )}
                      </div>
                    </div>

                    {m.cases && m.cases.length > 0 && (
                      <div className="ml-9 grid gap-2 sm:grid-cols-2">
                        {m.cases.slice(0, 6).map((c) => (
                          <Link
                            key={c.internal_id}
                            href={`/cases/${c.internal_id}`}
                            className="group rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 transition hover:border-brand-300 hover:bg-white"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-[10.5px] font-bold text-brand-700">
                                {c.case_id}
                              </span>
                              <ArrowRight className="h-3 w-3 text-slate-300 transition group-hover:text-brand-600" />
                            </div>
                            <p className="mt-0.5 truncate text-[10.5px] font-semibold text-slate-700">
                              {c.institution_name}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  "rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                  STATUS_TONE[c.status] ?? "border-slate-200 bg-slate-100 text-slate-600"
                                )}
                              >
                                {c.status.replaceAll("_", " ")}
                              </span>
                              {c.sla_status === "BREACHED" && (
                                <span className="inline-flex items-center gap-0.5 rounded-full border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                                  <Flame className="h-2.5 w-2.5" />
                                  {Math.abs(c.sla_days)}d overdue
                                </span>
                              )}
                              {c.sla_status === "APPROACHING" && (
                                <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">
                                  {c.sla_days}d left
                                </span>
                              )}
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 text-ink-950">
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                    <span className="text-[11.5px] font-medium text-slate-500">
                      Reading the registry…
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            {error && (
              <p
                role="alert"
                className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700"
              >
                {error}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. which escalated files have hearings this week?"
                className="input flex-1"
                maxLength={300}
                disabled={isLoading}
              />
              <button type="submit" className="btn btn-primary btn-sm shrink-0" disabled={isLoading || input.trim().length < 4}>
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Ask
              </button>
            </form>
            {disabled && (
              <p className="mt-2 text-[10px] font-medium text-slate-400">
                The copilot needs GROQ_API_KEY; the rest of the console keeps working.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
