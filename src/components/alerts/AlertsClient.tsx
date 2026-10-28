"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ShieldAlert,
  AlertTriangle,
  Link2,
  Building2,
  MapPin,
  ArrowUpRight,
  Radar,
  GitCompareArrows,
  SlidersHorizontal,
  XCircle,
  Sparkles,
  Clock3,
  Scale,
} from "lucide-react";
import { formatDateTime, getBureauLabel } from "@/lib/utils";
import { coordinateOverlapAction, dismissOverlapAction } from "@/actions/overlap-actions";
import { SessionUser } from "@/lib/rbac";
import { BureauPill, ConfidencePill } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { CollisionFlow } from "./CollisionFlow";
import { cn } from "@/lib/utils";

interface AlertsClientProps {
  initialAlerts: any[];
  currentUser?: SessionUser;
}

const statusMeta: Record<
  string,
  { label: string; rail: string; pill: string; dot: string; wash: string; border: string }
> = {
  OPEN: {
    label: "Open",
    rail: "from-rose-500 to-amber-400",
    pill: "border-rose-200 bg-rose-50 text-rose-700",
    dot: "bg-rose-500",
    wash: "from-rose-50/70 via-white to-white",
    border: "border-rose-200",
  },
  ACKNOWLEDGED: {
    label: "Acknowledged",
    rail: "from-sky-500 to-brand-400",
    pill: "border-sky-200 bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
    wash: "from-sky-50/60 via-white to-white",
    border: "border-sky-200",
  },
  COORDINATED: {
    label: "Coordinated",
    rail: "from-emerald-500 to-teal-400",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    wash: "from-emerald-50/60 via-white to-white",
    border: "border-emerald-200",
  },
  DISMISSED: {
    label: "Dismissed",
    rail: "from-slate-400 to-slate-300",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    dot: "bg-slate-400",
    wash: "from-slate-50/60 via-white to-white",
    border: "border-slate-200",
  },
};

export function AlertsClient({ initialAlerts, currentUser: _currentUser }: AlertsClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "OPEN" | "ACKNOWLEDGED" | "COORDINATED" | "DISMISSED"
  >("OPEN");

  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"COORDINATE" | "DISMISS" | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const counts = useMemo(
    () => ({
      OPEN: alerts.filter((a) => a.status === "OPEN").length,
      ACKNOWLEDGED: alerts.filter((a) => a.status === "ACKNOWLEDGED").length,
      COORDINATED: alerts.filter((a) => a.status === "COORDINATED").length,
      DISMISSED: alerts.filter((a) => a.status === "DISMISSED").length,
      ALL: alerts.length,
    }),
    [alerts]
  );

  const filteredAlerts = alerts.filter((a) =>
    statusFilter === "ALL" ? true : a.status === statusFilter
  );

  const highConfidenceOpen = alerts.filter(
    (a) => a.status === "OPEN" && a.confidence === "HIGH"
  ).length;

  const institutionsAtRisk = new Set(
    alerts.filter((a) => a.status === "OPEN").map((a) => a.institution_id)
  ).size;

  const focusAlert = (id: string) => {
    const target = alerts.find((a) => a.id === id);
    if (!target) return;
    setStatusFilter(target.status as typeof statusFilter);
    setHighlightId(id);
    window.setTimeout(() => {
      document
        .getElementById(`alert-${id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(() => setHighlightId(null), 3200);
  };

  const handleCoordinate = async () => {
    if (!activeAlert || !noteText.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    const res = await coordinateOverlapAction({
      alertId: activeAlert.id,
      coordinationNote: noteText,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to coordinate alert.");
    } else {
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === activeAlert.id
            ? { ...item, status: "COORDINATED", coordination_note: noteText }
            : item
        )
      );
      setActiveAlert(null);
      setNoteText("");
      setModalMode(null);
    }
  };

  const handleDismiss = async () => {
    if (!activeAlert || !noteText.trim()) return;
    setIsLoading(true);
    setErrorMsg("");

    const res = await dismissOverlapAction({
      alertId: activeAlert.id,
      dismissedReason: noteText,
    });

    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to dismiss alert.");
    } else {
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === activeAlert.id
            ? { ...item, status: "DISMISSED", dismissed_reason: noteText }
            : item
        )
      );
      setActiveAlert(null);
      setNoteText("");
      setModalMode(null);
    }
  };

  const statusTabs = [
    { key: "OPEN" as const, label: "Open", count: counts.OPEN },
    ...(counts.ACKNOWLEDGED > 0
      ? [{ key: "ACKNOWLEDGED" as const, label: "Acknowledged", count: counts.ACKNOWLEDGED }]
      : []),
    { key: "COORDINATED" as const, label: "Coordinated", count: counts.COORDINATED },
    { key: "DISMISSED" as const, label: "Dismissed", count: counts.DISMISSED },
    { key: "ALL" as const, label: "All alerts", count: counts.ALL },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 shadow-sm sm:flex">
            <Radar className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow mb-1 text-rose-600">Collision control</p>
            <h1 className="font-display text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[28px]">
              Overlap Alerts Hub
            </h1>
            <p className="mt-1.5 max-w-2xl text-[12.5px] font-medium leading-relaxed text-slate-500">
              Cross-bureau collision detection and coordination centre. Assign a lead bureau before
              duplicate action is taken.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Engine scanning
          </span>
        </div>
      </div>

      {/* Severity summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Open collisions",
            value: counts.OPEN,
            icon: ShieldAlert,
            tone: "text-rose-700 bg-rose-50 border-rose-200",
            note: "Awaiting coordination",
            alert: counts.OPEN > 0,
          },
          {
            label: "High confidence",
            value: highConfidenceOpen,
            icon: Radar,
            tone: "text-amber-700 bg-amber-50 border-amber-200",
            note: "Strong institutional match",
            alert: false,
          },
          {
            label: "Institutions at risk",
            value: institutionsAtRisk,
            icon: Building2,
            tone: "text-brand-700 bg-brand-50 border-brand-200",
            note: "Parallel bureau action",
            alert: false,
          },
          {
            label: "Resolved by coordination",
            value: counts.COORDINATED,
            icon: CheckCircle2,
            tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
            note: "Joint directives recorded",
            alert: false,
          },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={cn(
                "rounded-2xl border bg-white p-4 shadow-sm",
                s.alert ? "border-rose-200 bg-gradient-to-br from-white to-rose-50/50" : "border-slate-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", s.tone)}>
                  <Icon className="h-4 w-4" />
                </div>
                {s.alert && (
                  <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-white">
                    Act
                  </span>
                )}
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

      {/* Banner */}
      {counts.OPEN > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50/60 p-4 shadow-sm sm:p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-400" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_24px_-10px_rgba(225,29,72,0.7)]">
                <Scale className="h-4 w-4" />
              </div>
              <div>
                <h2 className="font-display text-[13.5px] font-bold text-rose-950">
                  Potential Overlapping Cases – Coordination Required
                </h2>
                <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-rose-800/85">
                  {counts.OPEN} alert{counts.OPEN === 1 ? "" : "s"} across {institutionsAtRisk}{" "}
                  institution{institutionsAtRisk === 1 ? "" : "s"} require a lead-bureau decision.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter("OPEN")}
              className="btn btn-danger btn-sm shrink-0 self-start sm:self-auto"
            >
              Review queue
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Collision topology */}
      <CollisionFlow alerts={alerts} onSelect={focusAlert} />

      {/* Filter bar */}
      <div className="panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          Showing
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700">
            {filteredAlerts.length}
          </span>
          of {alerts.length} alerts
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-all",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-extrabold",
                    active
                      ? tab.key === "OPEN"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-brand-50 text-brand-700"
                      : "bg-slate-200/70 text-slate-500"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title={`No ${statusFilter === "ALL" ? "" : statusFilter.toLowerCase() + " "}overlap alerts`}
          description="All multi-bureau inquiries are coordinated, dismissed, or no collisions currently exist."
          action={
            <button onClick={() => setStatusFilter("ALL")} className="btn btn-secondary btn-sm">
              View all alerts
            </button>
          }
        />
      ) : (
        <div className="space-y-3 stagger-children">
          {filteredAlerts.map((alert) => {
            const meta = statusMeta[alert.status] ?? statusMeta.DISMISSED;
            const isOpen = alert.status === "OPEN" || alert.status === "ACKNOWLEDGED";

            return (
              <article
                key={alert.id}
                id={`alert-${alert.id}`}
                className={cn(
                  "relative overflow-hidden rounded-2xl border bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md",
                  meta.wash,
                  meta.border,
                  highlightId === alert.id &&
                    "ring-2 ring-brand-400 ring-offset-2 ring-offset-[var(--surface-bg)] shadow-lg"
                )}
              >
                <span className={cn("absolute inset-y-0 left-0 w-1 bg-gradient-to-b", meta.rail)} />

                <div className="p-4 pl-5 sm:p-5 sm:pl-6">
                  {/* Head */}
                  <div className="flex flex-col gap-2.5 border-b border-white/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                          meta.pill
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, isOpen && "animate-pulse")} />
                        {meta.label}
                      </span>
                      <ConfidencePill confidence={alert.confidence} />
                      <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-slate-400">
                        <Clock3 className="h-2.5 w-2.5" />
                        {formatDateTime(alert.detected_at)}
                      </span>
                      <span className="hidden font-mono text-[9px] text-slate-300 sm:inline">
                        {alert.id}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Bureaus
                      </span>
                      {alert.bureaus_involved?.map((b: string) => (
                        <BureauPill key={b} bureau={b} />
                      ))}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="mt-3.5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Institution
                      </p>
                      <Link
                        href={`/institutions/${alert.institution_id}`}
                        className="mt-1 inline-flex items-start gap-1.5 font-display text-[13px] font-bold leading-snug text-slate-900 hover:text-brand-700 hover:underline"
                      >
                        <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                        {alert.institution?.name || "Target Technical Institution"}
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 pl-5 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-slate-300" />
                          {alert.institution?.city}, {alert.institution?.state}
                        </span>
                        <span className="font-mono text-slate-400">
                          {alert.institution?.aicte_permanent_id}
                        </span>
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Colliding cases
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {alert.case_ids?.map((cid: string) => (
                          <Link
                            key={cid}
                            href={`/cases/${cid}`}
                            className="group inline-flex items-center gap-1.5 rounded-lg border border-brand-200 bg-white px-2 py-1 font-mono text-[10px] font-bold text-brand-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
                          >
                            <Link2 className="h-2.5 w-2.5" />
                            {cid}
                            <ArrowUpRight className="h-2.5 w-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Match rationale */}
                  <div className="mt-3.5 rounded-xl border border-slate-200/70 bg-white/70 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      <GitCompareArrows className="h-3 w-3" />
                      Match rationale
                    </p>
                    <ul className="space-y-1">
                      {alert.match_reasons?.map((m: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-600">
                          <AlertTriangle className="mt-0.5 h-2.5 w-2.5 shrink-0 text-amber-500" />
                          {m.description}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {alert.coordination_note && (
                    <div className="mt-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
                      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Coordination directives
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-emerald-900">
                        {alert.coordination_note}
                      </p>
                    </div>
                  )}

                  {alert.dismissed_reason && (
                    <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                      <p className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        <XCircle className="h-3 w-3" /> Dismissal reason
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-slate-600">
                        {alert.dismissed_reason}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  {isOpen && (
                    <div className="mt-3.5 flex flex-col gap-2 border-t border-white/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        className={cn(
                          "flex items-center gap-1.5 text-[9.5px] font-medium",
                          alert.status === "ACKNOWLEDGED" ? "text-sky-700/80" : "text-rose-700/80"
                        )}
                      >
                        <ShieldAlert className="h-3 w-3" />
                        Parallel inquiries must be merged or lead-assigned.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveAlert(alert);
                            setModalMode("DISMISS");
                            setNoteText("");
                            setErrorMsg("");
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={() => {
                            setActiveAlert(alert);
                            setModalMode("COORDINATE");
                            setNoteText("");
                            setErrorMsg("");
                          }}
                          className="btn btn-success btn-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Coordinate & link
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Action modal */}
      <Modal
        open={Boolean(activeAlert && modalMode)}
        onClose={() => {
          setActiveAlert(null);
          setNoteText("");
          setModalMode(null);
          setErrorMsg("");
        }}
        title={
          modalMode === "COORDINATE"
            ? "Coordinate inter-bureau action"
            : "Dismiss overlap alert"
        }
        description={
          modalMode === "COORDINATE"
            ? `Record joint directives between ${
                activeAlert?.bureaus_involved
                  ?.map((b: string) => getBureauLabel(b))
                  .join(" and ") ?? "the involved bureaus"
              }. Cases will be linked as OVERLAP.`
            : "State why this alert does not require bureau alignment."
        }
        icon={
          modalMode === "COORDINATE" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )
        }
        tone={modalMode === "COORDINATE" ? "emerald" : "slate"}
        footer={
          <>
            <button
              onClick={() => {
                setActiveAlert(null);
                setNoteText("");
                setModalMode(null);
                setErrorMsg("");
              }}
              className="btn btn-secondary btn-sm"
            >
              Cancel
            </button>
            <button
              onClick={modalMode === "COORDINATE" ? handleCoordinate : handleDismiss}
              disabled={isLoading || !noteText.trim()}
              className={cn("btn btn-sm", modalMode === "COORDINATE" ? "btn-success" : "btn-primary")}
            >
              {isLoading
                ? "Saving…"
                : modalMode === "COORDINATE"
                  ? "Confirm coordination"
                  : "Confirm dismissal"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {activeAlert && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                <Building2 className="h-3.5 w-3.5 text-slate-400" />
                {activeAlert.institution?.name}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {activeAlert.bureaus_involved?.map((b: string) => (
                  <BureauPill key={b} bureau={b} />
                ))}
                <span className="font-mono text-[9.5px] text-slate-400">
                  {activeAlert.case_ids?.join("  ·  ")}
                </span>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="alert-note" className="field-label">
              {modalMode === "COORDINATE" ? "Coordination note" : "Dismissal reason"}{" "}
              <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="alert-note"
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={
                modalMode === "COORDINATE"
                  ? "e.g. Regulation Bureau leads the inspection; PGRC merges its grievance under the RB case."
                  : "e.g. Duplicate representation already merged; no parallel action remains."
              }
              className="input"
            />
            <p className="field-hint">
              {modalMode === "COORDINATE"
                ? "Written to both case timelines and the audit ledger."
                : "Documented for audit; the alert leaves the active queue."}
            </p>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-[10px] leading-relaxed text-slate-500">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-saffron-500" />
            <p>
              {modalMode === "COORDINATE"
                ? "Both bureaus will see the joint directive immediately in the case history."
                : "Dismissals are reversible only by the Competent Authority."}
            </p>
          </div>

          {errorMsg && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700"
            >
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
