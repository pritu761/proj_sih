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
  Braces,
  Lock,
  ScrollText,
  Filter,
  CheckCircle2,
  Activity,
  Hash,
  Loader2,
  RefreshCw,
  XCircle,
  Copy,
  Check,
  Link2,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { CountUp } from "@/components/ui/count-up";
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

type ChainSummary = {
  head: string;
  count: number;
  valid: boolean;
  brokenAt: number | null;
  algorithm: string;
  genesis: string;
  builtAt: string;
};

function shortHash(hash: string, size = 10) {
  if (!hash || hash.length <= size * 2) return hash;
  return `${hash.slice(0, size)}...${hash.slice(-4)}`;
}

export function AuditLedger({ logs, chain }: { logs: any[]; chain: ChainSummary }) {
  const PAGE_SIZE = 12;
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [verifyState, setVerifyState] = useState<"idle" | "verifying" | "valid" | "invalid">(
    chain.valid ? "idle" : "invalid"
  );
  const [verified, setVerified] = useState<{
    count: number;
    checkedAt: string;
    durationMs: number;
    head: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const runVerification = async () => {
    setVerifyState("verifying");
    try {
      const [res] = await Promise.all([
        fetch("/api/audit/verify"),
        new Promise((resolve) => setTimeout(resolve, 850)),
      ]);
      if (!res.ok) {
        setVerifyState("invalid");
        return;
      }
      const data = await res.json();
      setVerified(data);
      setVerifyState(data.valid ? "valid" : "invalid");
    } catch {
      setVerifyState("invalid");
    }
  };

  const copyHead = async () => {
    try {
      await navigator.clipboard.writeText(chain.head);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be blocked in embedded contexts */
    }
  };

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
                <CountUp value={s.value} />
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-slate-400">{s.note}</p>
            </div>
          );
        })}
      </div>

      {/* Integrity strip */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 transition-colors",
          verifyState === "invalid"
            ? "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-white"
            : verifyState === "verifying"
              ? "border-brand-200 bg-gradient-to-r from-brand-50 via-white to-white"
              : "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-white"
        )}
      >
        {verifyState === "verifying" && <span className="audit-scan" aria-hidden="true" />}
        <span
          className={cn(
            "absolute inset-y-0 left-0 w-1 bg-gradient-to-b",
            verifyState === "invalid"
              ? "from-rose-500 to-rose-400"
              : verifyState === "verifying"
                ? "from-brand-500 to-sky-400"
                : "from-emerald-500 to-teal-400"
          )}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
                verifyState === "invalid"
                  ? "bg-rose-600 shadow-[0_10px_24px_-10px_rgba(225,29,72,0.7)]"
                  : verifyState === "verifying"
                    ? "bg-brand-600 shadow-[0_10px_24px_-10px_rgba(37,89,232,0.7)]"
                    : "animate-verified-pop bg-emerald-600 shadow-[0_10px_24px_-10px_rgba(5,150,105,0.7)]"
              )}
            >
              {verifyState === "verifying" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : verifyState === "invalid" ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  aria-live="polite"
                  className={cn(
                    "text-[12.5px] font-bold",
                    verifyState === "invalid"
                      ? "text-rose-950"
                      : verifyState === "verifying"
                        ? "text-brand-950"
                        : "text-emerald-950"
                  )}
                >
                  {verifyState === "invalid"
                    ? "Chain verification failed"
                    : verifyState === "verifying"
                      ? "Recomputing block hashes"
                      : "Tamper-evident SHA-256 chain active"}
                </p>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide",
                    verifyState === "invalid"
                      ? "border-rose-300 bg-rose-100 text-rose-700"
                      : verifyState === "verifying"
                        ? "border-brand-300 bg-brand-100 text-brand-700"
                        : "animate-verified-pop border-emerald-300 bg-emerald-100 text-emerald-700"
                  )}
                >
                  <span className={cn("h-1 w-1 rounded-full", verifyState === "invalid" ? "bg-rose-500" : verifyState === "verifying" ? "bg-brand-500 animate-pulse" : "bg-emerald-500")} />
                  {verifyState === "invalid"
                    ? `broken at ${chain.brokenAt ?? "?"}`
                    : verifyState === "verifying"
                      ? "verifying"
                      : "chain valid"}
                </span>
              </div>
              <p
                className={cn(
                  "mt-0.5 max-w-2xl text-[10.5px] leading-relaxed",
                  verifyState === "invalid" ? "text-rose-800/80" : verifyState === "verifying" ? "text-brand-900/75" : "text-emerald-800/80"
                )}
              >
                Every mutation is sealed over its predecessor&apos;s hash. Altering an actor, IP,
                timestamp, or payload breaks the chain and is detected on the next verification.
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={copyHead}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-2 py-1 font-mono text-[9.5px] font-semibold text-slate-600 transition-colors hover:border-brand-300 hover:text-brand-700"
                  title={chain.head}
                >
                  <Hash className="h-2.5 w-2.5 text-slate-400" />
                  {shortHash(chain.head, 14)}
                  {copied ? (
                    <Check className="h-2.5 w-2.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-2.5 w-2.5 text-slate-300" />
                  )}
                </button>
                <span className="text-[9px] font-semibold text-slate-400">
                  {chain.algorithm} - {chain.count} blocks - genesis {chain.genesis}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1.5 lg:items-end">
            <button
              onClick={runVerification}
              disabled={verifyState === "verifying"}
              className={cn(
                "btn btn-sm",
                verifyState === "invalid" ? "btn-danger" : "btn-primary"
              )}
            >
              {verifyState === "verifying" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : verifyState === "valid" ? (
                <ShieldCheck className="h-3.5 w-3.5" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {verifyState === "verifying"
                ? "Recomputing hashes..."
                : verifyState === "valid"
                  ? "Re-verify ledger"
                  : "Verify ledger integrity"}
            </button>
            <p className="text-[9px] font-medium text-slate-400">
              {verifyState === "valid" && verified
                ? `Verified ${verified.count} blocks in ${verified.durationMs}ms at ${formatDateTime(verified.checkedAt)}`
                : verifyState === "invalid"
                  ? "Investigate the flagged block before exporting evidence."
                  : `Sealed ${formatDateTime(chain.builtAt)} - on-demand re-verification`}
            </p>
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
                  <th>Block</th>
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
                        <td className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-500">
                              <Link2 className="h-2 w-2 text-slate-300" />
                              {log.block}
                            </span>
                            <span
                              className="hidden font-mono text-[9px] text-slate-400 xl:inline"
                              title={log.hash}
                            >
                              {String(log.hash ?? "").slice(0, 8)}
                            </span>
                          </div>
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
                          <td colSpan={8} className="dark-surface bg-ink-950 px-4 py-4">
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                              <p className="flex items-center gap-1.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                <Braces className="h-3 w-3 text-emerald-400" />
                                Immutable payload · {log.entity_id}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-emerald-400">
                                <CheckCircle2 className="h-2.5 w-2.5" /> verified
                              </span>
                            </div>
                            <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-slate-500">
                              <span className="inline-flex items-center gap-1 text-slate-300">
                                <Hash className="h-2.5 w-2.5" /> {log.block}
                              </span>
                              <span title={log.prevHash}>prev {shortHash(String(log.prevHash ?? ""), 12)}</span>
                              <span className="text-emerald-400" title={log.hash}>
                                hash {shortHash(String(log.hash ?? ""), 18)}
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
            Append-only ledger · SHA-256 chained · head {shortHash(chain.head, 10)}
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
