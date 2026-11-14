"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckSquare,
  Square,
  ExternalLink,
  Building2,
  CalendarDays,
  Layers,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { bulkUpdateCasesAction } from "@/actions/case-actions";
import { canActOnCase, SessionUser } from "@/lib/rbac";
import { BureauPill, PriorityPill, SlaPill, StatusPill } from "@/components/ui/badges";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { cn, formatDate } from "@/lib/utils";

export interface BulkCaseRow {
  id: string;
  case_id: string;
  status: string;
  priority: string;
  assigned_bureau: string;
  category: string;
  institution_id: string;
  date_received: string | Date;
  last_action_date: string | Date;
  sla: { isBreached: boolean; isApproaching: boolean; remainingDays: number; percentElapsed: number };
  institution?: { id?: string; name?: string; city?: string; region?: string; aicte_permanent_id?: string } | null;
}

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending scrutiny" },
  { value: "UNDER_PROCESS", label: "Under process" },
  { value: "DISPOSED", label: "Disposed" },
  { value: "TRANSFERRED", label: "Transferred" },
  { value: "ESCALATED", label: "Escalated" },
];

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/**
 * Case Explorer table view with bulk desk actions. Checkbox-selection with a
 * toolbar that applies one status and/or priority change to the whole
 * selection in a single audited pass. Per-case bureau writ is enforced in the
 * repository; rows outside the actor's writ are marked here and reported back
 * as skipped after the apply.
 */
export function CasesBulkTable({ cases, currentUser }: { cases: BulkCaseRow[]; currentUser: SessionUser }) {
  const router = useRouter();
  const toast = useToast();

  const [rows, setRows] = useState<BulkCaseRow[]>(cases);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [patch, setPatch] = useState<{ status?: string; priority?: string }>({});
  const [isApplying, setIsApplying] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [skipped, setSkipped] = useState<Array<{ case_id: string | null; reason: string }>>([]);

  const writableRows = useMemo(
    () => rows.filter((c) => canActOnCase(currentUser, { assigned_bureau: c.assigned_bureau, institution: c.institution ?? undefined })).length,
    [rows, currentUser]
  );
  const selectedIds = useMemo(() => [...selected], [selected]);
  const selectedWritable = selectedIds.filter((id) => {
    const row = rows.find((r) => r.id === id);
    return row && canActOnCase(currentUser, { assigned_bureau: row.assigned_bureau, institution: row.institution ?? undefined });
  });
  const hasPatch = Boolean(patch.status || patch.priority);

  const toggleRow = (id: string, writable: boolean) => {
    if (!writable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllWritable = () => {
    if (selectedWritable.length === writableRows) {
      setSelected(new Set());
    } else {
      setSelected(
        new Set(
          rows
            .filter((c) => canActOnCase(currentUser, { assigned_bureau: c.assigned_bureau, institution: c.institution ?? undefined }))
            .map((c) => c.id)
        )
      );
    }
  };

  const clearSelection = () => {
    setSelected(new Set());
    setPatch({});
    setSkipped([]);
  };

  const applyBulk = async () => {
    if (!hasPatch || selectedWritable.length === 0) return;
    setConfirmOpen(false);
    setIsApplying(true);

    const res = await bulkUpdateCasesAction({
      ids: selectedWritable,
      patch: { status: patch.status as any, priority: patch.priority as any },
    });
    setIsApplying(false);

    if (!res.success) {
      toast.error("Bulk update failed", res.error || "Please try again.");
      return;
    }

    const updated = res.data?.updated ?? [];
    const skippedRows = res.data?.skipped ?? [];
    if (updated.length > 0) {
      setRows((prev) =>
        prev.map((row) => {
          const hit = updated.find((u: any) => u.id === row.id);
          return hit ? { ...row, status: hit.status, priority: hit.priority } : row;
        })
      );
      toast.success(
        `Applied to ${updated.length} file${updated.length === 1 ? "" : "s"}`,
        `Status${patch.priority ? " and priority" : ""} updated; each file got its own timeline entry and audit record.`
      );
      router.refresh();
    }
    if (skippedRows.length > 0) {
      setSkipped(skippedRows);
    } else {
      clearSelection();
    }
  };

  const allSelected = writableRows > 0 && selectedWritable.length === writableRows;

  return (
    <div>
      {/* Bulk toolbar */}
      <div
        className={cn(
          "sticky top-[3.25rem] z-20 flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-5 py-3 transition-all",
          selected.size > 0
            ? "border-brand-100 bg-brand-50/80"
            : "bg-slate-50/60"
        )}
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold",
            selected.size > 0
              ? "border-brand-200 bg-white text-brand-700"
              : "border-slate-200 bg-white text-slate-500"
          )}
        >
          <Layers className="h-3 w-3" />
          {selected.size} selected
        </span>

        {selected.size > 0 ? (
          <>
            <select
              value={patch.status ?? ""}
              onChange={(e) => setPatch((p) => ({ ...p, status: e.target.value || undefined }))}
              className="input w-auto min-w-[140px] py-1.5 text-[11px] font-semibold"
              aria-label="Bulk status"
            >
              <option value="">Status — no change</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <select
              value={patch.priority ?? ""}
              onChange={(e) => setPatch((p) => ({ ...p, priority: e.target.value || undefined }))}
              className="input w-auto min-w-[120px] py-1.5 text-[11px] font-semibold"
              aria-label="Bulk priority"
            >
              <option value="">Priority — no change</option>
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={!hasPatch || isApplying}
              className="btn btn-primary btn-sm"
            >
              {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Apply to {selectedWritable.length}
            </button>
            <button type="button" onClick={clearSelection} className="btn btn-secondary btn-sm">
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
            {selectedWritable.length < selected.size && (
              <span className="text-[10.5px] font-semibold italic text-slate-400">
                {selected.size - selectedWritable.length} selected file(s) are outside your bureau's writ and will be skipped.
              </span>
            )}
          </>
        ) : (
          <span className="text-[10.5px] font-medium text-slate-400">
            Tick files to change status / priority in one audited pass · {writableRows} writable by your desk
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="w-9">
                <button
                  type="button"
                  onClick={toggleAllWritable}
                  aria-label={allSelected ? "Deselect all writable files" : "Select all writable files"}
                  disabled={writableRows === 0}
                  className="disabled:opacity-30"
                >
                  {allSelected ? (
                    <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                  ) : (
                    <Square className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </button>
              </th>
              <th>Case</th>
              <th>Institution</th>
              <th>Bureau</th>
              <th>Category</th>
              <th>Status</th>
              <th>Priority</th>
              <th>SLA countdown</th>
              <th>Received</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const writable = canActOnCase(currentUser, { assigned_bureau: c.assigned_bureau, institution: c.institution ?? undefined });
              const isSelected = selected.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={cn("group", isSelected && "bg-brand-50/40", !writable && "opacity-60")}
                >
                  <td>
                    {writable ? (
                      <button
                        type="button"
                        onClick={() => toggleRow(c.id, writable)}
                        aria-label={isSelected ? `Deselect ${c.case_id}` : `Select ${c.case_id}`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover:text-slate-500" />
                        )}
                      </button>
                    ) : (
                      <Lock className="h-3 w-3 text-slate-300" aria-label="Outside your bureau's writ" />
                    )}
                  </td>

                  <td>
                    <Link href={`/cases/${c.id}`} className="block">
                      <span className="font-mono text-[10.5px] font-bold text-brand-700 group-hover:underline">
                        {c.case_id}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-slate-400">
                        <CalendarDays className="h-2.5 w-2.5" />
                        {formatDate(c.last_action_date)}
                      </span>
                    </Link>
                  </td>

                  <td className="max-w-[240px]">
                    <Link
                      href={`/institutions/${c.institution_id}`}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 hover:text-brand-700 hover:underline"
                    >
                      <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">{c.institution?.name}</span>
                    </Link>
                    <span className="mt-0.5 block pl-[18px] text-[10.5px] text-slate-400">
                      {c.institution?.city}, {c.institution?.region} · {c.institution?.aicte_permanent_id}
                    </span>
                  </td>

                  <td><BureauPill bureau={c.assigned_bureau} /></td>

                  <td className="max-w-[160px]">
                    <span className="block truncate text-[11px] font-medium text-slate-600" title={c.category}>
                      {c.category}
                    </span>
                  </td>

                  <td><StatusPill status={c.status} /></td>
                  <td><PriorityPill priority={c.priority} /></td>

                  <td>
                    <SlaPill breached={c.sla.isBreached} approaching={c.sla.isApproaching}>
                      {c.sla.isBreached
                        ? `${Math.abs(c.sla.remainingDays)}d overdue`
                        : `${c.sla.remainingDays}d left`}
                    </SlaPill>
                    <div className="mt-1.5 h-1 w-[86px] overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(4, Math.min(100, c.sla.percentElapsed))}%`,
                          background: c.sla.isBreached ? "#dc2626" : c.sla.isApproaching ? "#d97706" : "#059669",
                        }}
                      />
                    </div>
                  </td>

                  <td className="whitespace-nowrap text-[10.5px] font-medium text-slate-500">
                    {formatDate(c.date_received)}
                  </td>

                  <td className="text-right">
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Skipped-files report */}
      <Modal
        open={skipped.length > 0}
        onClose={() => {
          setSkipped([]);
          clearSelection();
        }}
        title={`${skipped.length} file${skipped.length === 1 ? "" : "s"} skipped`}
        description="These files were left untouched. Everything else in the selection was applied and audited."
        icon={<Lock className="h-4 w-4" />}
        tone="amber"
        size="sm"
        footer={
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setSkipped([]);
              clearSelection();
            }}
          >
            Understood
          </button>
        }
      >
        <ul className="space-y-1.5">
          {skipped.slice(0, 12).map((s, i) => (
            <li key={i} className="flex items-start justify-between gap-3 text-[11px]">
              <span className="font-mono font-bold text-slate-700">{s.case_id ?? "(unknown file)"}</span>
              <span className="text-right font-medium text-slate-500">{s.reason}</span>
            </li>
          ))}
          {skipped.length > 12 && (
            <li className="text-[10.5px] font-medium italic text-slate-400">
              …and {skipped.length - 12} more.
            </li>
          )}
        </ul>
      </Modal>

      {/* Confirm apply */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Apply bulk desk action"
        description="Each selected file gets its own timeline entry and audit record."
        icon={<ShieldCheck className="h-4 w-4" />}
        tone="blue"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary btn-sm" onClick={applyBulk} disabled={isApplying}>
              {isApplying ? "Applying…" : "Confirm apply"}
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-[11.5px] leading-relaxed text-slate-700">
          <p>
            <strong className="font-bold">{selectedWritable.length} file(s)</strong> in one pass:
          </p>
          <ul className="space-y-1">
            {patch.status && (
              <li className="flex items-center gap-2">
                <StatusPill status={patch.status} dot={false} />
                <span className="text-slate-500">new status</span>
              </li>
            )}
            {patch.priority && (
              <li className="flex items-center gap-2">
                <PriorityPill priority={patch.priority} />
                <span className="text-slate-500">new priority</span>
              </li>
            )}
          </ul>
        </div>
      </Modal>
    </div>
  );
}
