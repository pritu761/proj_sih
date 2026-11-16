"use client";

import Link from "next/link";
import { Activity, ArrowUpRight, ChevronRight, History } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

/** Mirrors the projection returned by repository.getRecentActivity. */
export interface RecentActivityItem {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entity_id: string;
  label: string;
  timestamp: string;
  href: string;
  entityLabel?: string;
  entityBureau?: string;
}

/** Shimmer placeholder that keeps the panel's height stable while polling. */
export function RecentActivitySkeleton() {
  return (
    <section className="panel overflow-hidden" aria-busy="true" aria-label="Loading recent activity">
      <div className="panel-head">
        <div className="flex items-center gap-2.5">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <div className="skeleton h-3 w-28 rounded" />
            <div className="skeleton h-2 w-40 rounded" />
          </div>
        </div>
        <div className="skeleton h-2.5 w-16 rounded" />
      </div>
      <div className="divide-y divide-slate-100 dark:divide-white/5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="skeleton h-7 w-7 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="skeleton h-2.5 w-1/3 rounded" />
              <div className="skeleton h-2 w-2/3 rounded" />
            </div>
            <div className="skeleton h-2 w-10 shrink-0 rounded" />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Deterministic relative time against a supplied reference (the server's
 * `generatedAt`), so server render and client hydration agree exactly. */
export function relativeTime(iso: string, referenceTime: number): string {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return "—";
  const seconds = Math.max(0, Math.floor((referenceTime - at) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function RecentActivity({
  items,
  referenceTime = Date.now(),
}: {
  items?: RecentActivityItem[] | null;
  referenceTime?: number;
}) {
  // A missing field (older cached payload) shows the shimmer rather than a
  // misleading empty state.
  if (!items) return <RecentActivitySkeleton />;

  const entries = items.slice(0, 6);

  return (
    <section className="panel overflow-hidden">
      <div className="panel-head flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 dark:border-white/10 dark:bg-white/5 dark:text-brand-300">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h2 className="panel-title">Recent activity</h2>
            <p className="mt-0.5 text-[10.5px] font-medium text-slate-400 dark:text-slate-500">
              Latest verified actions from the audit trail.
            </p>
          </div>
        </div>
        <Link
          href="/audit"
          className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-600 hover:text-brand-700 dark:text-brand-300"
        >
          Full ledger
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          compact
          icon={Activity}
          title="No recent activity for your scope"
          action={
            <Link href="/reports" className="btn btn-secondary btn-sm">
              Open reports
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {entries.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex items-start gap-3 px-4 py-3 transition-colors",
                "hover:bg-slate-50/80 dark:hover:bg-white/[0.04]"
              )}
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                <Activity className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11.5px] font-bold text-slate-800 group-hover:text-brand-700 dark:text-slate-100 dark:group-hover:text-brand-300">
                  {item.label}
                </p>
                <p className="mt-0.5 truncate text-[10.5px] font-medium text-slate-500 dark:text-slate-400">
                  {item.actor}
                  {item.entityLabel ? ` · ${item.entityLabel}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] font-semibold tabular-nums text-slate-400 dark:text-slate-500">
                  {relativeTime(item.timestamp, referenceTime)}
                </p>
                <ChevronRight className="ml-auto mt-1 h-3.5 w-3.5 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-600" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
