"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Clock3,
  Pencil,
  Save,
  X,
  RotateCcw,
  ShieldCheck,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import {
  resetSlaConfigAction,
  updateSlaConfigAction,
} from "@/actions/sla-actions";
import { cn } from "@/lib/utils";

export interface SlaScheduleRow {
  category: string;
  timeline_days: number;
  warning_threshold_percent: number;
  default_timeline_days: number;
  default_warning_threshold_percent: number;
  isOverridden: boolean;
}

interface Draft {
  timeline_days: string;
  warning_threshold_percent: string;
}

export function SlaSchedule({ initialRows }: { initialRows: SlaScheduleRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState<SlaScheduleRow[]>(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({
    timeline_days: "",
    warning_threshold_percent: "",
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Server actions revalidate this route; keep local rows in step with the
  // freshly rendered server props as well as with our optimistic updates.
  useEffect(() => setRows(initialRows), [initialRows]);

  const overrideCount = rows.filter((r) => r.isOverridden).length;

  const openEditor = (row: SlaScheduleRow) => {
    setEditing(row.category);
    setDraft({
      timeline_days: String(row.timeline_days),
      warning_threshold_percent: String(row.warning_threshold_percent),
    });
    setError("");
  };

  const save = async (row: SlaScheduleRow) => {
    const timeline = Number(draft.timeline_days);
    const threshold = Number(draft.warning_threshold_percent);
    if (
      !Number.isInteger(timeline) ||
      timeline < 1 ||
      timeline > 3650 ||
      !Number.isInteger(threshold) ||
      threshold < 1 ||
      threshold > 100
    ) {
      setError("Enter a timeline of 1-3650 days and a warning of 1-100%.");
      return;
    }

    setBusy(row.category);
    setError("");
    const res = await updateSlaConfigAction({
      category: row.category,
      timeline_days: timeline,
      warning_threshold_percent: threshold,
    });
    setBusy(null);
    if (!res.success) {
      setError(res.error || "Could not save the override.");
      toast.error("Could not save schedule", res.error);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.category === row.category
          ? {
              ...r,
              timeline_days: timeline,
              warning_threshold_percent: threshold,
              isOverridden: true,
            }
          : r
      )
    );
    setEditing(null);
    toast.success(
      "Statutory timeline updated",
      `${row.category} now resolves within ${timeline} days.`
    );
    router.refresh();
  };

  const restore = async (row?: SlaScheduleRow) => {
    const key = row?.category ?? "__all__";
    setBusy(key);
    setError("");
    const res = await resetSlaConfigAction(
      row ? { category: row.category } : {}
    );
    setBusy(null);
    if (!res.success) {
      setError(res.error || "Could not restore the defaults.");
      toast.error("Could not restore defaults", res.error);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        !row || r.category === row.category
          ? {
              ...r,
              timeline_days: r.default_timeline_days,
              warning_threshold_percent: r.default_warning_threshold_percent,
              isOverridden: false,
            }
          : r
      )
    );
    if (editing && (!row || editing === row.category)) setEditing(null);
    toast.success(
      row ? "Category restored" : "Defaults restored",
      row
        ? `${row.category} is back on its statutory schedule.`
        : "All categories use their seeded statutory values again."
    );
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Statutory SLA schedule"
        icon={Clock3}
        crumbs={[{ label: "Administration" }, { label: "SLA schedule" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1.5 text-[10.5px] font-bold text-brand-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Administrator only
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={busy === "__all__" || overrideCount === 0}
              onClick={() => restore()}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restore all defaults
            </button>
          </div>
        }
      />

      <div className="panel overflow-hidden">
        <div className="panel-head flex-wrap gap-2">
          <div>
            <h2 className="panel-title">Grievance categories &amp; timelines</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Edits take effect immediately across dashboards, reports, the
              breach heatmap and every case SLA countdown. Overrides persist in
              the registry snapshot; the statutory defaults remain recorded for
              comparison.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10.5px] font-bold text-slate-600">
            {overrideCount} of {rows.length} overridden
          </span>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[10.5px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Category</th>
                <th className="px-3 py-3 text-center">Default days</th>
                <th className="px-3 py-3 text-center">Effective days</th>
                <th className="px-3 py-3 text-center">Default warning</th>
                <th className="px-3 py-3 text-center">Effective warning</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isEditing = editing === row.category;
                const isBusy = busy === row.category;
                return (
                  <tr
                    key={row.category}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                  >
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {row.category}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-400">
                      {row.default_timeline_days}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          aria-label={`Timeline days for ${row.category}`}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-[12px] tabular-nums focus:border-brand-400 focus:outline-none"
                          value={draft.timeline_days}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              timeline_days: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span
                          className={cn(
                            "font-display text-[13px] font-bold tabular-nums",
                            row.isOverridden ? "text-brand-700" : "text-slate-800"
                          )}
                        >
                          {row.timeline_days}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-400">
                      {row.default_warning_threshold_percent}%
                    </td>
                    <td className="px-3 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={1}
                          max={100}
                          aria-label={`Warning threshold for ${row.category}`}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-center text-[12px] tabular-nums focus:border-brand-400 focus:outline-none"
                          value={draft.warning_threshold_percent}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              warning_threshold_percent: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span
                          className={cn(
                            "font-display text-[13px] font-bold tabular-nums",
                            row.isOverridden ? "text-brand-700" : "text-slate-800"
                          )}
                        >
                          {row.warning_threshold_percent}%
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.isOverridden ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                          <Pencil className="h-2.5 w-2.5" /> Overridden
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          Default
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isBusy}
                            onClick={() => save(row)}
                          >
                            <Save className="h-3.5 w-3.5" />
                            {isBusy ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={isBusy}
                            onClick={() => {
                              setEditing(null);
                              setError("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={isBusy}
                            onClick={() => openEditor(row)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            disabled={isBusy || !row.isOverridden}
                            title={
                              row.isOverridden
                                ? "Restore the statutory default"
                                : "Already at the statutory default"
                            }
                            onClick={() => restore(row)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reset
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] leading-relaxed text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          <span>
            The effective schedule is merged into the SLA engine on every store
            load and immediately after each save, so case countdowns, breach
            alerts, ageing dashboards, reports and the region &times; category
            heatmap all use the same values. Each change is written to the
            tamper-evident audit trail.
          </span>
        </div>
      </div>
    </div>
  );
}
