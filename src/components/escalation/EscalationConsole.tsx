"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Gavel,
  Loader2,
  RefreshCw,
  Siren,
} from "lucide-react";
import {
  recordAuthorityDirectionAction,
  runAutoEscalationSweepAction,
} from "@/actions/escalation-actions";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export interface EscalationReviewView {
  day: string;
  graceDays: number;
  checked: number;
  escalated: number;
  alreadyEscalated: number;
  items: {
    case_id: string;
    internal_id: string;
    bureau: string;
    institutionName: string;
    breachDays: number;
    memo: string;
    escalatedAt: string;
  }[];
}

export function EscalationConsole({ review }: { review: EscalationReviewView }) {
  const router = useRouter();
  const toast = useToast();
  const [isSweeping, setIsSweeping] = useState(false);
  const [lastSweep, setLastSweep] = useState<{
    checked: number;
    escalated: number;
    alreadyEscalated: number;
  } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingCase, setSavingCase] = useState<string | null>(null);

  const runSweep = async () => {
    if (isSweeping) return;
    setIsSweeping(true);
    try {
      const res = await runAutoEscalationSweepAction();
      if (!res.success || !res.summary) {
        toast.error("Sweep failed", res.error || "The sweep did not return a summary.");
        return;
      }
      setLastSweep({
        checked: res.summary.checked,
        escalated: res.summary.escalated,
        alreadyEscalated: res.summary.alreadyEscalated,
      });
      toast.success(
        "Sweep complete",
        `${res.summary.escalated} file(s) escalated, ${res.summary.alreadyEscalated} already on the authority's desk.`
      );
      router.refresh();
    } finally {
      setIsSweeping(false);
    }
  };

  const recordDirection = async (caseId: string) => {
    const text = drafts[caseId]?.trim();
    if (!text || savingCase) return;
    setSavingCase(caseId);
    try {
      const res = await recordAuthorityDirectionAction(caseId, text);
      if (!res.success) {
        toast.error("Direction not recorded", res.error);
        return;
      }
      setDrafts((prev) => ({ ...prev, [caseId]: "" }));
      toast.success("Direction recorded", `Added to the timeline of ${caseId}.`);
      router.refresh();
    } finally {
      setSavingCase(null);
    }
  };

  const cards = [
    {
      label: "Files checked",
      value: review.checked,
      note: "active files in this sweep",
      icon: Siren,
      tone: "text-brand-600 bg-brand-50",
    },
    {
      label: "Auto-escalated",
      value: review.escalated,
      note: "memoranda on file timelines",
      icon: Gavel,
      tone: "text-rose-600 bg-rose-50",
    },
    {
      label: "Already escalated",
      value: review.alreadyEscalated,
      note: "awaiting authority directions",
      icon: Clock3,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Grace window",
      value: `${review.graceDays}d`,
      note: `sweep day ${review.day}`,
      icon: CheckCircle2,
      tone: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Sweep summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="panel px-4 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  {card.label}
                </p>
                <span className={cn("rounded-lg p-1.5", card.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 font-display text-[22px] font-extrabold leading-none tracking-[-0.02em] text-slate-900">
                {card.value}
              </p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">{card.note}</p>
            </div>
          );
        })}
      </div>

      {/* Manual trigger */}
      <div className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <Siren className="h-3.5 w-3.5 text-saffron-500" />
            Daily escalation sweep
          </h2>
          <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
            {lastSweep
              ? `Last run: ${lastSweep.checked} checked · ${lastSweep.escalated} escalated · ${lastSweep.alreadyEscalated} already escalated.`
              : "Deterministic breach-age rule; re-running the same day is safe."}
          </p>
        </div>
        <button
          type="button"
          onClick={runSweep}
          disabled={isSweeping}
          className="btn btn-primary btn-sm disabled:opacity-60"
        >
          {isSweeping ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {isSweeping ? "Running sweep…" : "Run sweep now"}
        </button>
      </div>

      {/* Escalated files */}
      {review.items.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
          <Siren className="h-7 w-7 text-slate-300" />
          <p className="text-[12px] font-semibold text-slate-500">
            No files have been auto-escalated yet
          </p>
          <p className="text-[10.5px] text-slate-400">
            Files breached beyond the {review.graceDays}-day grace window appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {review.items.map((item) => (
            <article key={item.case_id} className="panel overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/cases/${item.internal_id}`}
                      className="font-display text-[13px] font-bold tracking-tight text-slate-900 hover:text-brand-700"
                    >
                      {item.case_id}
                    </Link>
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold text-rose-700">
                      {item.breachDays}d past statutory window
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-400">
                    {item.institutionName} · {item.bureau.replaceAll("_", " ")} ·{" "}
                    {formatDateTime(item.escalatedAt)}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9.5px] font-bold text-slate-500">
                  <Gavel className="h-3 w-3 text-rose-500" />
                  Authority cognizance
                </span>
              </div>

              <div className="px-5 py-4">
                <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Generated memorandum
                </p>
                <p className="mt-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">
                  {item.memo}
                </p>

                <div className="mt-4 border-t border-slate-100 pt-3.5">
                  <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                    Record authority direction
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={drafts[item.case_id] ?? ""}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [item.case_id]: e.target.value }))
                      }
                      placeholder="Direction to the bureau (recorded on the file timeline)"
                      className="input h-9 min-w-[260px] flex-1 text-[11.5px]"
                    />
                    <button
                      type="button"
                      onClick={() => recordDirection(item.case_id)}
                      disabled={!drafts[item.case_id]?.trim() || savingCase === item.case_id}
                      className="btn btn-secondary btn-sm disabled:opacity-50"
                    >
                      {savingCase === item.case_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      Record direction
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
