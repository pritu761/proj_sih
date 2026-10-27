"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Database,
  Users,
  Fingerprint,
  Braces,
  Lock,
  ScrollText,
  Filter,
  CheckCircle2,
  Server,
  Activity,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

const actionTone: Record<string, string> = {
  RECEIVED: "border-brand-200 bg-brand-50 text-brand-700",
  ASSIGNED: "border-sky-200 bg-sky-50 text-sky-700",
  STATUS_CHANGED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  TRANSFERRED: "border-violet-200 bg-violet-50 text-violet-700",
  ESCALATED: "border-rose-200 bg-rose-50 text-rose-700",
  DISPOSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REMARK: "border-slate-200 bg-slate-50 text-slate-600",
  LINKED: "border-amber-200 bg-amber-50 text-amber-700",
  OVERLAP_COORDINATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  LOGIN: "border-slate-200 bg-slate-50 text-slate-600",
};

function initials(name: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "AC"
  );
}

export function AuditLedger({ logs }: { logs: any[] }) {
  const PAGE_SIZE = 12;
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const officers = useMemo(() => new Set(logs.map((l) => l.user)).size, [logs]);
  const entities = useMemo(() => new Set(logs.map((l) => l.entity_id)).size, [logs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((log) => {
      if (actionFilter !== "ALL" && log.action !== actionFilter) return false;
      if (!q) return true;
      return [log.user, log.action, log.entity, log.entity_id, log.ip]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [logs, query, actionFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const firstRow = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastRow = Math.min(filtered.length, currentPage * PAGE_SIZE);

  const goToPage = (next: number) => {
    setExpanded(null);
    setPage(Math.min(pageCount, Math.max(1, next)));
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Ledger entries",
            value: logs.length,
            icon: ScrollText,
            tone: "text-brand-700 bg-brand-50 border-brand-200",
            note: "Append-only records",
          },
          {
            label: "Distinct officers",
            value: officers,
            icon: Users,
            tone: "text-violet-700 bg-violet-50 border-violet-200",
            note: "Attributed identities",
          },
          {
            label: "Entities touched",
            value: entities,
            icon: Database,
            tone: "text-amber-700 bg-amber-50 border-amber-200",
            note: "Cases & links",
          },
          {
            label: "Action types",
            value: actions.length,
            icon: Activity,
            tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
            note: "Workflow events",
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="panel p-4">
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", s.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-emerald-700">
                  <Lock className="h-2 w-2" /> sealed
                </span>
              </div>
              <p className="mt-3 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
                {s.label}
              </p>
              <p className="mt-1 font-display text-[26px] font-extrabold leading-none tracking-[-0.03em] text-slate-950">
                {s.value}
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-slate-400">{s.note}</p>
            </div>
          );
        })}
      </div>

      {/* Integrity strip */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white p-4">
        <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-teal-400" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-[0_10px_24px_-10px_rgba(5,150,105,0.7)]">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[12.5px] font-bold text-emerald-950">
                Tamper-evident hash chain active
              </p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-emerald-800/80">
                Every mutation is append-only. Records cannot be edited or deleted, and each entry
                carries actor, IP, and payload context.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { icon: Server, label: "Immutable store" },
              { icon: Fingerprint, label: "Officer attributed" },
              { icon: Braces, label: "JSON payload" },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/80 px-2 py-1 text-[9px] font-bold text-emerald-700"
                >
                  <Icon className="h-2.5 w-2.5" />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ledger */}
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="font-display text-[13px] font-bold text-slate-900">Audit ledger</h2>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-500">
              {filtered.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                  setExpanded(null);
                }}
                placeholder="Search officer, action, case ID…"
                className="input h-9 w-full pl-9 text-[11.5px] sm:w-[260px]"
                aria-label="Search audit ledger"
              />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                  setExpanded(null);
                }}
                className="input h-9 pl-9 text-[11.5px] sm:w-[180px]"
                aria-label="Filter by action"
              >
                <option value="ALL">All actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={ScrollText}
              title="No audit entries match"
              description="Clear the search or choose a different action type. New mutations appear here in real time."
              action={
                <button
                  onClick={() => {
                    setQuery("");
                    setActionFilter("ALL");
                    setPage(1);
                    setExpanded(null);
                  }}
                  className="btn btn-secondary btn-sm"
                >
                  Reset filters
                </button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Officer</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Source IP</th>
                  <th className="text-right">Payload</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((log: any, idx: number) => {
                  const open = expanded === idx;
                  const payload = log.after || log.before || {};
                  return (
                    <Fragment key={`${log.entity_id}-${idx}`}>
                      <tr
                        className={cn("group", open && "bg-brand-50/30")}
                      >
                        <td className="whitespace-nowrap font-mono text-[10px] text-slate-500">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink-800 to-ink-700 text-[8.5px] font-extrabold text-white">
                              {initials(log.user)}
                            </span>
                            <span className="text-[11px] font-bold text-slate-800">{log.user}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={cn(
                              "inline-flex rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide",
                              actionTone[log.action] ?? "border-slate-200 bg-slate-50 text-slate-600"
                            )}
                          >
                            {log.action.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="text-[10.5px] font-medium text-slate-500">{log.entity}</td>
                        <td className="max-w-[190px] truncate font-mono text-[10.5px] font-bold text-brand-700">
                          {log.entity_id}
                        </td>
                        <td className="font-mono text-[10px] text-slate-500">{log.ip}</td>
                        <td className="text-right">
                          <button
                            onClick={() => setExpanded(open ? null : idx)}
                            aria-expanded={open}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[9.5px] font-bold transition-colors",
                              open
                                ? "border-brand-300 bg-brand-50 text-brand-700"
                                : "border-slate-200 bg-white text-slate-500 hover:border-brand-300 hover:text-brand-700"
                            )}
                          >
                            JSON
                            <ChevronDown
                              className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
                            />
                          </button>
                        </td>
                      </tr>

                      {open && (
                        <tr>
                          <td colSpan={7} className="dark-surface bg-ink-950 px-4 py-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                <Braces className="h-3 w-3 text-emerald-400" />
                                Immutable payload · {log.entity_id}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5" /> verified
                              </span>
                            </div>
                            <pre className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 font-mono text-[10.5px] leading-relaxed text-emerald-200">
{JSON.stringify(payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
            <Lock className="h-3 w-3 text-slate-400" />
            Append-only ledger · retention as per AICTE records policy
          </p>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <p className="text-[10px] font-medium text-slate-400">
              {filtered.length === 0
                ? "No entries"
                : `Showing ${firstRow}–${lastRow} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[64px] text-center text-[10px] font-bold tabular-nums text-slate-500">
                {currentPage} / {pageCount}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
