"use client";

import { useState } from "react";
import Link from "next/link";
import {
  GitMerge,
  Crown,
  XCircle,
  Building2,
  MapPin,
  Sparkles,
  Lock,
  CalendarDays,
  User,
} from "lucide-react";
import {
  mergeSuggestionAction,
  dismissMergeSuggestionAction,
} from "@/actions/overlap-actions";
import type { MergeSuggestion } from "@/lib/services/merge-suggester";
import { SessionUser } from "@/lib/rbac";
import { StatusPill, PriorityPill, ConfidencePill } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, cn } from "@/lib/utils";

export type MergeSuggestionView = MergeSuggestion & { canManage: boolean };

interface MergeQueueProps {
  suggestions: MergeSuggestionView[];
  currentUser?: SessionUser;
}

/**
 * Possible-duplicate queue for filings within one bureau. Suggestions are
 * derived deterministically by the merge-suggester engine; this UI only
 * records the officer's decision — merge into a master docket, or review as
 * "not duplicates" (which keeps the pair out of the queue permanently).
 */
export function MergeQueue({ suggestions, currentUser }: MergeQueueProps) {
  const toast = useToast();
  const [items, setItems] = useState(suggestions);
  const [activePair, setActivePair] = useState<MergeSuggestionView | null>(null);
  const [dismissPair, setDismissPair] = useState<MergeSuggestionView | null>(null);
  const [masterRef, setMasterRef] = useState("");
  const [noteText, setNoteText] = useState("");
  const [reasonText, setReasonText] = useState(
    "Reviewed at the bureau desk — the two filings describe separate grievances, not duplicates."
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const openMerge = (pair: MergeSuggestionView) => {
    setActivePair(pair);
    setMasterRef(pair.a.case_id); // recommended: earliest-filed side
    setNoteText(
      `Duplicate filings consolidated per the ${pair.confidence}-confidence Sentinel suggestion (${pair.score}/100). The oldest file becomes the master docket; the duplicate is linked and closed into it.`
    );
    setErrorMsg("");
  };

  const handleMerge = async () => {
    if (!activePair || !masterRef || !noteText.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    const res = await mergeSuggestionAction({
      pairKey: activePair.key,
      masterCaseId: masterRef,
      mergeNote: noteText,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to merge the duplicate pair.");
      return;
    }

    toast.success(
      "Duplicate filings merged",
      `${res.data?.masterCaseId ?? masterRef} is now the master docket.`
    );
    setItems((prev) => prev.filter((p) => p.key !== activePair.key));
    setActivePair(null);
    setNoteText("");
    setMasterRef("");
  };

  const handleDismiss = async () => {
    if (!dismissPair || !reasonText.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    const res = await dismissMergeSuggestionAction({
      pairKey: dismissPair.key,
      reason: reasonText,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to dismiss the suggestion.");
      return;
    }

    toast.info("Suggestion dismissed", "The pair will not resurface in this queue.");
    setItems((prev) => prev.filter((p) => p.key !== dismissPair.key));
    setDismissPair(null);
  };

  const highCount = items.filter((p) => p.confidence === "HIGH").length;

  return (
    <div className="panel overflow-hidden">
      <div className="panel-head">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <GitMerge className="h-3.5 w-3.5 text-brand-600" />
            Possible duplicates — same-bureau merge queue
          </h2>
          <p className="mt-0.5 text-[10.5px] font-medium text-slate-400">
            Same institution + category + similar narrative, scored deterministically —
            no black box. Reviewed pairs are never re-suggested.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700">
              <Sparkles className="h-3 w-3" />
              {highCount} high confidence
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-slate-500">
            {items.length} suggestion{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-6">
          <EmptyState
            icon={GitMerge}
            title="No duplicate pairings in the queue"
            action={
              <p className="max-w-md text-[10.5px] font-medium text-slate-400">
                The engine found no same-institution, same-category filings with matching
                narratives among the open desk files. New pairings surface here
                automatically as they arrive.
              </p>
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((pair) => (
            <div key={pair.key} className="px-5 py-4">
              {/* Score strip */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <ConfidencePill confidence={pair.confidence} />
                <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700">
                  {pair.score}/100 match
                </span>
                <span className="text-[10.5px] font-medium text-slate-500">
                  {Math.round(pair.textSimilarity * 100)}% narrative similarity · filed{" "}
                  {pair.filedDaysApart} day{pair.filedDaysApart === 1 ? "" : "s"} apart
                </span>
              </div>

              {/* The two filings */}
              <div className="grid gap-3 sm:grid-cols-2">
                {([pair.a, pair.b] as const).map((side, idx) => {
                  const isMaster = idx === 0;
                  return (
                    <div
                      key={side.id}
                      className={cn(
                        "rounded-xl border p-3",
                        isMaster
                          ? "border-amber-300 bg-amber-50/60"
                          : "border-slate-200 bg-white"
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                            <Crown className="h-3 w-3" />
                            Master docket (recommended)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            Duplicate filing
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/cases/${side.id}`}
                        className="font-display text-[13px] font-bold tracking-tight text-slate-900 hover:text-brand-700"
                      >
                        {side.case_id}
                      </Link>
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{side.institution_name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-[10.5px] font-medium text-slate-500">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {side.category}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <StatusPill status={side.status} />
                        <PriorityPill priority={side.priority} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-medium text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          Filed {formatDate(side.date_received)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {side.assigned_officer || "Unassigned"}
                        </span>
                        <span className="uppercase">{side.source} channel</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Deterministic rationale */}
              <ul className="mt-3 space-y-1">
                {pair.rationale.map((r) => (
                  <li
                    key={r}
                    className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-500"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
                    {r}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {pair.canManage ? (
                  <>
                    <button
                      onClick={() => openMerge(pair)}
                      className="btn btn-primary btn-sm"
                    >
                      <GitMerge className="h-3.5 w-3.5" />
                      Merge into docket…
                    </button>
                    <button
                      onClick={() => setDismissPair(pair)}
                      className="btn btn-secondary btn-sm"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Not duplicates
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold italic text-slate-500">
                    <Lock className="h-3 w-3" />
                    Both filings belong to {pair.a.bureau.replaceAll("_", " ")} —{" "}
                    {currentUser?.role === "REGIONAL_OFFICER"
                      ? "regional officers observe only"
                      : "outside your bureau's writ"}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Merge modal */}
      <Modal
        open={Boolean(activePair)}
        onClose={() => setActivePair(null)}
        title="Merge duplicate filings"
        description="One inquiry proceeds under the master docket; the other is linked as a duplicate and folded into it."
        icon={<GitMerge className="h-4 w-4" />}
        tone="blue"
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setActivePair(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleMerge}
              disabled={isLoading || !masterRef || noteText.trim().length < 10}
            >
              {isLoading ? "Merging…" : "Confirm merge"}
            </button>
          </div>
        }
      >
        {activePair && (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {([activePair.a, activePair.b] as const).map((side, idx) => (
                <button
                  key={side.id}
                  type="button"
                  onClick={() => setMasterRef(side.case_id)}
                  className={cn(
                    "rounded-xl border p-3 text-left transition",
                    masterRef === side.case_id
                      ? "border-brand-400 bg-brand-50 ring-1 ring-brand-300"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[13px] font-bold text-slate-900">
                      {side.case_id}
                    </span>
                    {idx === 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[9.5px] font-bold uppercase text-amber-800">
                        <Crown className="h-3 w-3" />
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[10.5px] font-medium text-slate-500">
                    {side.institution_name} · filed {formatDate(side.date_received)}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">
                    Master: single inquiry &amp; compliance record under this file
                  </p>
                </button>
              ))}
            </div>
            <div>
              <label className="mb-1 block text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                Merge justification (recorded on both timelines &amp; the audit ledger)
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-800 outline-none focus:border-brand-400"
                placeholder="Why these two filings are the same grievance…"
              />
            </div>
            {errorMsg && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Dismiss modal */}
      <Modal
        open={Boolean(dismissPair)}
        onClose={() => setDismissPair(null)}
        title="Not duplicates"
        description="The pair is removed from the queue permanently and the review decision is audited."
        icon={<XCircle className="h-4 w-4" />}
        tone="slate"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setDismissPair(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleDismiss}
              disabled={isLoading || reasonText.trim().length < 5}
            >
              {isLoading ? "Saving…" : "Confirm review"}
            </button>
          </div>
        }
      >
        {dismissPair && (
          <div className="space-y-3">
            <p className="text-[11.5px] leading-relaxed text-slate-600">
              Reviewing{" "}
              <strong className="text-slate-800">{dismissPair.a.case_id}</strong> ↔{" "}
              <strong className="text-slate-800">{dismissPair.b.case_id}</strong> as
              separate grievances.
            </p>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-[12px] text-slate-800 outline-none focus:border-brand-400"
            />
            {errorMsg && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
