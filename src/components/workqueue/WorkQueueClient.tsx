"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Inbox,
  UserPlus,
  Flame,
  Gavel,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  PriorityPill,
  StatusPill,
  BureauPill,
} from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { assignOfficerAction } from "@/actions/case-actions";
import { SessionUser } from "@/lib/rbac";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

export interface QueueItem {
  id: string;
  case_id: string;
  category: string;
  status: string;
  priority: string;
  assigned_bureau: string;
  assigned_officer: string | null;
  assigned_to_me: boolean;
  complainant_name: string | null;
  institution_name: string;
  institution_city: string;
  region: string;
  date_received: Date | string;
  last_action: string;
  last_action_date: Date | string;
  expected_disposal_date: Date | string;
  hearing_date: Date | string | null;
  sla: {
    remainingDays: number;
    isBreached: boolean;
    isApproaching: boolean;
    statusText: string;
  };
}

export interface WorkQueueOfficer {
  id: string;
  name: string;
  email: string;
  role: string;
  bureau: string;
  region?: string | null;
  designation: string;
}

interface WorkQueueClientProps {
  mine: QueueItem[];
  unassigned: QueueItem[];
  officers: WorkQueueOfficer[];
  currentUser: SessionUser;
}

function slaTone(item: QueueItem) {
  if (item.sla.isBreached) return "border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-white";
  if (item.sla.isApproaching) return "border-amber-200 bg-gradient-to-br from-amber-50/70 via-white to-white";
  return "border-slate-200 bg-white";
}

function slaChip(item: QueueItem) {
  const tone = item.sla.isBreached
    ? "bg-rose-100 text-rose-700"
    : item.sla.isApproaching
      ? "bg-amber-100 text-amber-700"
      : "bg-emerald-100 text-emerald-700";
  const label = item.sla.isBreached
    ? `${Math.abs(item.sla.remainingDays)}d overdue`
    : item.sla.isApproaching
      ? `${item.sla.remainingDays}d left`
      : `${item.sla.remainingDays}d left`;
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide", tone)}>
      {label}
    </span>
  );
}

export function WorkQueueClient({ mine, unassigned, officers, currentUser }: WorkQueueClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [assignTarget, setAssignTarget] = useState<QueueItem | null>(null);
  const [assignOfficerEmail, setAssignOfficerEmail] = useState(currentUser.email);
  const [assignNote, setAssignNote] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [selfAssigningId, setSelfAssigningId] = useState<string | null>(null);

  const breachedMine = mine.filter((c) => c.sla.isBreached).length;
  const hearingsSoon = mine.filter(
    (c) => c.hearing_date && new Date(c.hearing_date).getTime() > Date.now()
  );
  const nextHearing = hearingsSoon
    .slice()
    .sort(
      (a, b) =>
        new Date(a.hearing_date!).getTime() - new Date(b.hearing_date!).getTime()
    )[0];

  const stats = useMemo(
    () => [
      {
        label: "Files in your queue",
        value: mine.length,
        icon: ClipboardList,
        tone: "text-brand-700",
      },
      {
        label: "Beyond statutory timeline",
        value: breachedMine,
        icon: Flame,
        tone: "text-rose-700",
      },
      {
        label: "Unassigned backlog",
        value: unassigned.length,
        icon: Inbox,
        tone: "text-amber-700",
      },
      {
        label: "Next hearing in your queue",
        value: nextHearing ? formatDate(nextHearing.hearing_date!) : "—",
        icon: Gavel,
        tone: "text-fuchsia-700",
        small: true,
      },
    ],
    [mine, unassigned, breachedMine, nextHearing]
  );

  const openAssignModal = (item: QueueItem, presetSelf = false) => {
    setAssignTarget(item);
    setAssignOfficerEmail(presetSelf ? currentUser.email : item.assigned_officer || "");
    setAssignNote("");
    setAssignError("");
  };

  const confirmAssign = async () => {
    if (!assignTarget || !assignOfficerEmail) return;
    setIsAssigning(true);
    setAssignError("");
    const res = await assignOfficerAction({
      caseId: assignTarget.id,
      officerEmail: assignOfficerEmail,
      note: assignNote,
    });
    setIsAssigning(false);
    if (!res.success) {
      setAssignError(res.error || "Failed to assign the file.");
      return;
    }
    setAssignTarget(null);
    toast.success("File assigned", `${assignTarget.case_id} now sits in ${assignOfficerEmail}'s work queue.`);
    router.refresh();
  };

  const selfAssign = async (item: QueueItem) => {
    setSelfAssigningId(item.id);
    const res = await assignOfficerAction({
      caseId: item.id,
      officerEmail: currentUser.email,
      note: "Self-assigned from the officer work queue.",
    });
    setSelfAssigningId(null);
    if (!res.success) {
      toast.error("Could not assign file", res.error || "Please try again in a moment.");
      return;
    }
    toast.success("File added to your queue", `${item.case_id} is now yours to progress.`);
    router.refresh();
  };

  const renderCard = (item: QueueItem, unassignedCard: boolean) => (
    <div key={item.id} className={cn("rounded-2xl border p-4 shadow-sm", slaTone(item))}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <Link
          href={`/cases/${item.id}`}
          className="font-mono text-[11px] font-bold text-brand-700 hover:underline"
        >
          {item.case_id}
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={item.status} />
          <PriorityPill priority={item.priority} />
          {slaChip(item)}
        </div>
      </div>

      <p className="mt-1.5 text-[13px] font-bold leading-snug text-slate-900">
        {item.category}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Building2 className="h-3 w-3 text-slate-400" />
          {item.institution_name}
        </span>
        <span className="text-slate-300">·</span>
        <span>{item.institution_city}, {item.region}</span>
        <span className="text-slate-300">·</span>
        <span className="inline-flex items-center gap-1">
          <BureauPill bureau={item.assigned_bureau} />
        </span>
      </p>

      {item.complainant_name && (
        <p className="mt-1 text-[10px] text-slate-400">Complainant: {item.complainant_name}</p>
      )}

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px] text-slate-500 sm:grid-cols-4">
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-slate-400">Received</p>
          <p className="font-semibold text-slate-700">{formatDate(item.date_received)}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-slate-400">Due</p>
          <p className="font-semibold text-slate-700">{formatDate(item.expected_disposal_date)}</p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-slate-400">Hearing</p>
          <p className="inline-flex items-center gap-1 font-semibold text-slate-700">
            {item.hearing_date ? (
              <>
                <Gavel className="h-2.5 w-2.5 text-fuchsia-500" />
                {formatDate(item.hearing_date)}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
        <div>
          <p className="font-bold uppercase tracking-[0.08em] text-slate-400">Last action</p>
          <p className="truncate font-semibold text-slate-700" title={item.last_action}>
            {formatDate(item.last_action_date)}
          </p>
        </div>
      </div>

      <p className="mt-2 line-clamp-1 text-[10.5px] italic text-slate-400" title={item.last_action}>
        {item.last_action}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        {!unassignedCard && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">
            <User className="h-3 w-3" />
            {item.assigned_officer?.toLowerCase() === currentUser.email.toLowerCase()
              ? "Assigned to you"
              : item.assigned_officer}
          </span>
        )}
        {unassignedCard && (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-rose-600">
            Awaiting allocation
          </span>
        )}
        <div className="flex items-center gap-1.5">
          {unassignedCard && (
            <button
              onClick={() => selfAssign(item)}
              disabled={selfAssigningId === item.id}
              className="btn btn-success btn-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {selfAssigningId === item.id ? "Taking…" : "Take file"}
            </button>
          )}
          <button
            onClick={() => openAssignModal(item, unassignedCard)}
            className="btn btn-secondary btn-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            {item.assigned_officer ? "Reassign" : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );

  const emptyState = (title: string, note: string) => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-10 text-center">
      <Inbox className="mx-auto h-6 w-6 text-slate-300" />
      <p className="mt-2 text-[12px] font-bold text-slate-600">{title}</p>
      <p className="mt-1 text-[11px] text-slate-400">{note}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Officer workbench"
        title="Officer Work Queue"
        description="Personal allocation plus the unassigned bureau backlog — assignable files land here the moment they are routed."
        icon={ClipboardList}
        actions={
          <span className="badge border-brand-200 bg-brand-50 text-brand-700">
            {currentUser.name} ·{" "}
            {currentUser.bureau === "ALL" ? "All bureaus" : currentUser.bureau.replaceAll("_", " ")}
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="panel px-4 py-3.5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {s.label}
                </p>
                <Icon className={cn("h-3.5 w-3.5", s.tone)} />
              </div>
              <p
                className={cn(
                  "mt-1.5 font-display text-[20px] font-extrabold leading-none text-slate-900",
                  s.small && "text-[15px] leading-tight"
                )}
              >
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Unassigned backlog */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <Inbox className="h-3.5 w-3.5 text-amber-600" />
              Unassigned backlog
            </h2>
            <p className="panel-sub">
              Open files without a named officer{currentUser.bureau === "ALL" ? " across all bureaus" : ` in ${currentUser.bureau.replaceAll("_", " ")}`}
            </p>
          </div>
          <span className="badge border-amber-200 bg-amber-50 text-amber-700">
            {unassigned.length} files
          </span>
        </div>
        <div className="space-y-3 p-4">
          {unassigned.length === 0
            ? emptyState("Backlog is clear", "Every open file in your scope has an allocated officer.")
            : unassigned.map((item) => renderCard(item, true))}
        </div>
      </div>

      {/* Personal queue */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <ClipboardList className="h-3.5 w-3.5 text-brand-600" />
              Your queue
            </h2>
            <p className="panel-sub">Files assigned to you directly, most urgent first</p>
          </div>
          <span className="badge border-brand-200 bg-brand-50 text-brand-700">
            {mine.length} open
          </span>
        </div>
        <div className="space-y-3 p-4">
          {mine.length === 0
            ? emptyState(
                "No files assigned to you",
                "Use “Take file” above or ask the bureau desk to route work into your queue."
              )
            : mine.map((item) => renderCard(item, false))}
        </div>
      </div>

      {/* Assign modal */}
      <Modal
        open={Boolean(assignTarget)}
        onClose={() => setAssignTarget(null)}
        title={assignTarget?.assigned_officer ? "Reassign file" : "Assign file to officer"}
        description={assignTarget?.case_id}
        icon={<UserPlus className="h-4 w-4" />}
        tone="blue"
        footer={
          <>
            <button onClick={() => setAssignTarget(null)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={confirmAssign}
              disabled={isAssigning || !assignOfficerEmail}
              className="btn btn-primary btn-sm"
            >
              {isAssigning ? "Assigning…" : "Confirm assignment"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="wq-officer" className="field-label">
              Registered officer <span className="text-rose-600">*</span>
            </label>
            <select
              id="wq-officer"
              value={assignOfficerEmail}
              onChange={(e) => setAssignOfficerEmail(e.target.value)}
              className="input"
            >
              <option value="">Select an officer…</option>
              {officers.map((o) => (
                <option key={o.id} value={o.email}>
                  {o.name} — {o.designation || o.role}
                  {o.region ? ` (${o.region} RO)` : ""}
                  {o.email === currentUser.email ? " (you)" : ""}
                </option>
              ))}
            </select>
            <p className="field-hint">
              The server verifies bureau jurisdiction; cross-bureau assignments are rejected.
            </p>
          </div>

          <div>
            <label htmlFor="wq-note" className="field-label">
              Handling instruction <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="wq-note"
              rows={2}
              maxLength={500}
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              placeholder="e.g. Submit compliance verification within the week."
              className="input"
            />
          </div>

          {assignTarget?.hearing_date && (
            <p className="flex items-center gap-1.5 rounded-xl border border-fuchsia-200 bg-fuchsia-50/70 p-2.5 text-[10.5px] font-semibold text-fuchsia-800">
              <CalendarClock className="h-3.5 w-3.5" />
              Hearing already scheduled on {formatDate(assignTarget.hearing_date)} — the assignee
              inherits the sitting.
            </p>
          )}

          {assignError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {assignError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
