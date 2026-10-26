"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
} from "lucide-react";
import {
  formatDateTime,
  getBureauBadgeColor,
} from "@/lib/utils";
import {
  coordinateOverlapAction,
  dismissOverlapAction,
} from "@/actions/overlap-actions";
import { SessionUser } from "@/lib/rbac";

interface AlertsClientProps {
  initialAlerts: any[];
  currentUser?: SessionUser;
}

export function AlertsClient({ initialAlerts, currentUser: _currentUser }: AlertsClientProps) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "COORDINATED" | "DISMISSED">("OPEN");

  // Coordinate / Dismiss modal state
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<"COORDINATE" | "DISMISS" | null>(null);
  const [noteText, setNoteText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === "ALL") return true;
    return a.status === statusFilter;
  });

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
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Cross-Bureau Overlap Alerts & Collision Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated detection of concurrent grievances across Bureaus (RB, PGRC, AB, SDC) to eliminate duplicate effort.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-2xs">
          {(["OPEN", "COORDINATED", "DISMISSED", "ALL"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab
                  ? "bg-blue-900 text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {tab === "OPEN" ? "Open Alerts" : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Overlaps List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="mt-2 text-sm font-bold text-slate-800">
              No {statusFilter.toLowerCase()} overlap alerts
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              All multi-bureau inquiries are either fully coordinated or no collisions exist.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl border p-5 shadow-xs transition-all ${
                alert.status === "OPEN"
                  ? "border-rose-300 bg-rose-50/20 hover:border-rose-400"
                  : alert.status === "COORDINATED"
                  ? "border-emerald-300 bg-emerald-50/15"
                  : "border-slate-200 bg-white opacity-80"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      alert.status === "OPEN"
                        ? "bg-rose-600 text-white animate-pulse"
                        : alert.status === "COORDINATED"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-500 text-white"
                    }`}
                  >
                    {alert.status}
                  </span>

                  <span className="text-xs font-bold text-slate-700">
                    Confidence:{" "}
                    <strong
                      className={`${
                        alert.confidence === "HIGH"
                          ? "text-rose-700"
                          : alert.confidence === "MEDIUM"
                          ? "text-amber-700"
                          : "text-blue-700"
                      }`}
                    >
                      {alert.confidence}
                    </strong>
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Detected: {formatDateTime(alert.detected_at)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-500">Bureaus Involved:</span>
                  {alert.bureaus_involved?.map((b: string) => (
                    <span
                      key={b}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBureauBadgeColor(b)}`}
                    >
                      {b.replace("_", " ")}
                    </span>
                  ))}
                </div>
              </div>

              {/* Institution and Case Identifiers */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Institution
                  </span>
                  <Link
                    href={`/institutions/${alert.institution_id}`}
                    className="text-sm font-bold text-blue-900 hover:underline block mt-0.5"
                  >
                    {alert.institution?.name || "Target Technical Institution"}
                  </Link>
                  <span className="text-xs text-slate-500">
                    {alert.institution?.city}, {alert.institution?.state} (ID: {alert.institution?.aicte_permanent_id})
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Colliding Case Numbers
                  </span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {alert.case_ids?.map((cid: string) => (
                      <Link
                        key={cid}
                        href={`/cases/${cid}`}
                        className="font-mono text-xs font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:bg-blue-100"
                      >
                        {cid} →
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detection Match Reasons */}
              <div className="mt-3.5 rounded-xl border border-slate-200 bg-white p-3.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                  Algorithm Match Rationale:
                </span>
                <ul className="text-xs text-slate-700 space-y-1">
                  {alert.match_reasons?.map((m: any, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{m.description}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Coordination Notes if already coordinated */}
              {alert.coordination_note && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-900">
                  <span className="font-bold block">Coordination Directives:</span>
                  <p className="mt-0.5">{alert.coordination_note}</p>
                </div>
              )}

              {/* Dismissed Reason if dismissed */}
              {alert.dismissed_reason && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                  <span className="font-bold block">Dismissal Reason:</span>
                  <p className="mt-0.5">{alert.dismissed_reason}</p>
                </div>
              )}

              {/* Action Buttons */}
              {alert.status === "OPEN" && (
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-end gap-2.5">
                  <button
                    onClick={() => {
                      setActiveAlert(alert);
                      setModalMode("DISMISS");
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Dismiss Alert
                  </button>

                  <button
                    onClick={() => {
                      setActiveAlert(alert);
                      setModalMode("COORDINATE");
                    }}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Coordinate & Link Cases</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Action Modal (Coordinate or Dismiss) */}
      {activeAlert && modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {modalMode === "COORDINATE"
                ? "Coordinate Inter-Bureau Action"
                : "Dismiss Overlap Alert"}
            </h3>

            <p className="text-xs text-slate-500">
              {modalMode === "COORDINATE"
                ? `Record joint directives between ${activeAlert.bureaus_involved?.join(" and ")}. Cases will be linked as OVERLAP.`
                : "State the reason why this alert does not require bureau alignment (e.g., unrelated departments, distinct academic years)."}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {modalMode === "COORDINATE" ? "Coordination Note *" : "Dismissal Reason *"}
              </label>
              <textarea
                rows={3}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Enter notes..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveAlert(null);
                  setNoteText("");
                }}
                className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={modalMode === "COORDINATE" ? handleCoordinate : handleDismiss}
                disabled={isLoading || !noteText.trim()}
                className={`rounded-lg px-4 py-2 text-xs font-bold text-white cursor-pointer ${
                  modalMode === "COORDINATE" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-700 hover:bg-slate-800"
                }`}
              >
                {isLoading ? "Saving..." : modalMode === "COORDINATE" ? "Confirm Coordination" : "Confirm Dismissal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
