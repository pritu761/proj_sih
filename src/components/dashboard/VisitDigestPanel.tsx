"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  History,
  Inbox,
  ArrowRightLeft,
  Flame,
  ShieldAlert,
  Check,
  X,
} from "lucide-react";
import { dismissVisitDigestAction } from "@/actions/visit-digest-actions";
import { useToast } from "@/components/ui/toast";
import type { VisitDigest, VisitDigestSection } from "@/lib/services/repository";
import { cn } from "@/lib/utils";

const sectionIcon: Record<VisitDigestSection["key"], typeof Inbox> = {
  newGrievances: Inbox,
  statusChanges: ArrowRightLeft,
  filesEscalated: Flame,
  newOverlapAlerts: ShieldAlert,
};

const sectionTone: Record<VisitDigestSection["key"], string> = {
  newGrievances:
    "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300",
  statusChanges:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300",
  filesEscalated:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300",
  newOverlapAlerts:
    "border-saffron-300/60 bg-saffron-500/10 text-saffron-600 dark:border-saffron-400/20 dark:bg-saffron-400/10 dark:text-saffron-300",
};

/**
 * Dismissible "what changed" digest. All figures and the window come from the
 * server-computed, JSON-serializable `digest` kept in DashboardClient state, so
 * replaying from the Navbar needs no server round trip and never advances the
 * last-seen marker (only "Mark as seen" does that).
 */
export function VisitDigestPanel({
  digest,
  onClose,
}: {
  digest: VisitDigest;
  onClose: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const markSeen = async () => {
    setBusy(true);
    try {
      const res = await dismissVisitDigestAction();
      if (!res.success) {
        toast.error("Could not update", res.error || "Please try again.");
        return;
      }
      toast.success("Marked as seen", "New changes will be summarised on your next visit.");
      onClose();
    } catch {
      toast.error("Could not update", "The registry did not respond. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  // UTC-based, locale-independent formatting keeps SSR and client markup
  // identical regardless of the officer's timezone.
  const sinceDate = Number.isFinite(Date.parse(digest.since))
    ? new Date(digest.since)
    : null;
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const sinceLabel = sinceDate
    ? `${String(sinceDate.getUTCDate()).padStart(2, "0")} ${MONTHS[sinceDate.getUTCMonth()]}`
    : "your last visit";

  return (
    <section
      className="panel overflow-hidden border-brand-200/70 dark:border-brand-400/20"
      aria-label={digest.isFirstVisit ? "Registry overview" : "What changed since your last visit"}
    >
      <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-saffron-400 to-emerald-400" />
      <div className="panel-head flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-400/20 dark:bg-brand-400/10 dark:text-brand-300">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="panel-title">
              {digest.isFirstVisit
                ? "Welcome — here's the state of the registry"
                : "What changed since your last visit"}
            </h2>
            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
              {digest.isFirstVisit
                ? `A snapshot of the last 7 days · as of ${sinceLabel}`
                : `Since ${sinceLabel} · ${digest.total} update${digest.total === 1 ? "" : "s"} across your scope`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={markSeen} disabled={busy} className="btn btn-secondary btn-sm">
            <Check className="h-3.5 w-3.5" />
            {busy ? "Saving…" : "Mark as seen"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss digest"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-white/5 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100 dark:bg-white/5 sm:grid-cols-4">
        {digest.sections.map((section) => {
          const Icon = sectionIcon[section.key];
          return (
            <Link
              key={section.key}
              href={section.href}
              onClick={onClose}
              className="group bg-white p-4 transition-colors hover:bg-slate-50/80 dark:bg-white/[0.02] dark:hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg border",
                    sectionTone[section.key]
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300" />
              </div>
              <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-slate-950 dark:text-white">
                {section.count}
              </p>
              <p className="mt-1.5 text-[10.5px] font-semibold leading-snug text-slate-500 dark:text-slate-400">
                {section.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 dark:border-white/5">
        <p className="text-[10px] text-slate-400 dark:text-slate-500">
          Replayable any time from your profile menu · counts are scoped to your role.
        </p>
        <Link
          href="/audit"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300"
        >
          Open audit ledger
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </section>
  );
}
