"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Building2,
  User,
  ArrowRightLeft,
  Flame,
  MessageSquare,
  Link2,
  ShieldAlert,
  CheckCircle2,
  Paperclip,
  Eye,
  FileText,
  CalendarDays,
  Target,
  Gavel,
  UploadCloud,
  Sparkles,
  Lock,
  Layers,
  MapPin,
  Inbox,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  updateCaseStatusAction,
  transferCaseAction,
  escalateCaseAction,
  addRemarkAction,
  linkCasesAction,
} from "@/actions/case-actions";
import { coordinateOverlapAction } from "@/actions/overlap-actions";
import { canActOnCase, SessionUser } from "@/lib/rbac";
import { Breadcrumbs } from "@/components/ui/page-header";
import { BureauPill, ConfidencePill, PriorityPill, StatusPill } from "@/components/ui/badges";
import { SlaRing } from "@/components/ui/sla-ring";
import { Modal } from "@/components/ui/modal";
import { CaseBrief } from "./CaseBrief";
import type { CaseInsight } from "@/lib/services/risk-engine";
import { cn } from "@/lib/utils";

interface CaseDetailClientProps {
  caseItem: any;
  linkedCases: any[];
  overlapAlert?: any;
  collidingCase?: any;
  currentUser: SessionUser;
  insight?: CaseInsight | null;
}

const actionIcon: Record<string, typeof Inbox> = {
  RECEIVED: Inbox,
  ASSIGNED: User,
  TRANSFERRED: ArrowRightLeft,
  ESCALATED: Flame,
  REMARK: MessageSquare,
  DISPOSED: CheckCircle2,
  LINKED: Link2,
  STATUS_CHANGED: RefreshCw,
};

const actionTone: Record<string, string> = {
  RECEIVED: "bg-brand-50 text-brand-600 border-brand-100",
  ASSIGNED: "bg-sky-50 text-sky-600 border-sky-100",
  TRANSFERRED: "bg-violet-50 text-violet-600 border-violet-100",
  ESCALATED: "bg-rose-50 text-rose-600 border-rose-100",
  REMARK: "bg-slate-50 text-slate-500 border-slate-200",
  DISPOSED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  LINKED: "bg-amber-50 text-amber-600 border-amber-100",
  STATUS_CHANGED: "bg-indigo-50 text-indigo-600 border-indigo-100",
};

const bureauOptions = [
  { value: "REGULATION_BUREAU", label: "Regulation Bureau (RB)" },
  { value: "PGRC", label: "Public Grievance Redressal Cell (PGRC)" },
  { value: "APPROVAL_BUREAU", label: "Approval Bureau (AB)" },
  { value: "SKILL_CELL", label: "Skill Development Cell (SDC)" },
];

export function CaseDetailClient({
  caseItem,
  linkedCases,
  overlapAlert,
  collidingCase,
  currentUser,
  insight,
}: CaseDetailClientProps) {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<
    "STATUS" | "TRANSFER" | "ESCALATE" | "REMARK" | "LINK" | "OVERLAP_COMPARE" | null
  >(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [newStatus, setNewStatus] = useState<any>(caseItem.status);
  const [remarks, setRemarks] = useState("");
  const [toBureau, setToBureau] = useState<any>("REGULATION_BUREAU");
  const [linkTargetId, setLinkTargetId] = useState("");
  const [linkType, setLinkType] = useState<any>("OVERLAP");
  const [linkNote, setLinkNote] = useState("");
  const [coordinationNote, setCoordinationNote] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const isAuthorizedToAct = canActOnCase(currentUser, caseItem);
  const closed = caseItem.status === "DISPOSED";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedUrl(data.url);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "File upload failed.");
      }
    } catch {
      setErrorMsg("File upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetModals = () => {
    setActiveModal(null);
    setRemarks("");
    setErrorMsg("");
    setUploadedUrl("");
    setCoordinationNote("");
  };

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await updateCaseStatusAction({
      caseId: caseItem.case_id,
      status: newStatus,
      remarks,
      attachments: uploadedUrl ? [uploadedUrl] : [],
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to update status.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const handleTransfer = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await transferCaseAction({
      caseId: caseItem.case_id,
      toBureau,
      remarks,
      attachments: uploadedUrl ? [uploadedUrl] : [],
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to transfer case.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const handleEscalate = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await escalateCaseAction({
      caseId: caseItem.case_id,
      remarks,
      attachments: uploadedUrl ? [uploadedUrl] : [],
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to escalate case.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const handleAddRemark = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await addRemarkAction({
      caseId: caseItem.case_id,
      remarks,
      attachments: uploadedUrl ? [uploadedUrl] : [],
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to record remark.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const handleLinkCase = async () => {
    setIsLoading(true);
    setErrorMsg("");
    const res = await linkCasesAction({
      caseAId: caseItem.case_id,
      caseBId: linkTargetId,
      linkType,
      note: linkNote,
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to link cases.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const handleCoordinateOverlap = async () => {
    if (!overlapAlert) return;
    setIsLoading(true);
    setErrorMsg("");
    const res = await coordinateOverlapAction({
      alertId: overlapAlert.id,
      coordinationNote,
    });
    setIsLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || "Failed to coordinate overlap.");
    } else {
      resetModals();
      router.refresh();
    }
  };

  const slaPercent = Math.min(100, Math.max(0, caseItem.sla?.percentElapsed ?? 0));
  const actions = caseItem.actions ?? [];
  const latestAction = actions[actions.length - 1];

  const slaTone = caseItem.sla?.isBreached
    ? "border-rose-200 bg-gradient-to-br from-rose-50/80 via-white to-white"
    : caseItem.sla?.isApproaching
      ? "border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-white"
      : "border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-white";

  const uploadField = (
    <div>
      <label className="field-label">Supporting document</label>
      <label
        className={cn(
          "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-colors",
          uploadedUrl
            ? "border-emerald-300 bg-emerald-50/60"
            : "border-slate-300 bg-slate-50/60 hover:border-brand-300 hover:bg-brand-50/40"
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <UploadCloud
            className={cn(
              "h-4 w-4 shrink-0",
              uploadedUrl ? "text-emerald-600" : "text-slate-400"
            )}
          />
          <span className="min-w-0">
            <span className="block truncate text-[11.5px] font-semibold text-slate-700">
              {uploadedUrl ? "Document uploaded" : "Attach PDF or DOCX"}
            </span>
            <span className="block text-[10px] text-slate-400">
              {isUploading ? "Uploading securely…" : uploadedUrl ? "Stored on secure blob" : "Max 10 MB · optional"}
            </span>
          </span>
        </span>
        {uploadedUrl ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
            Browse
          </span>
        )}
        <input type="file" onChange={handleFileUpload} className="hidden" />
      </label>
    </div>
  );

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Case Explorer", href: "/cases" },
          { label: caseItem.case_id },
        ]}
      />

      {/* Overlap banner */}
      {overlapAlert && (
        <div className="relative overflow-hidden rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 via-white to-amber-50/70 p-4 shadow-sm animate-warning-glow sm:p-5">
          <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-400" />
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_24px_-8px_rgba(225,29,72,0.6)]">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-[14px] font-bold tracking-tight text-rose-950">
                    Potential Overlapping Cases – Coordination Required
                  </h2>
                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                    Action needed
                  </span>
                  <ConfidencePill confidence={overlapAlert.confidence} />
                </div>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-rose-800/85">
                  {overlapAlert.match_reasons?.map((r: any) => r.description).join(" · ") ||
                    "This case collides with an open case in another Bureau for the same institution."}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
                    Colliding cases
                  </span>
                  <span className="font-mono text-[10px] font-bold text-slate-600">
                    {overlapAlert.case_ids
                      ?.filter((id: string) => id !== caseItem.case_id)
                      .join("  ·  ")}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal("OVERLAP_COMPARE")}
              className="btn btn-danger btn-sm shrink-0 self-start lg:self-auto"
            >
              <Eye className="h-3.5 w-3.5" />
              Compare side-by-side
            </button>
          </div>
        </div>
      )}

      {/* Case header */}
      <div className="panel overflow-hidden">
        <div className="rail-top" />
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between lg:p-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-mono text-[10.5px] font-bold text-brand-700">
                {caseItem.case_id}
              </span>
              <StatusPill status={caseItem.status} />
              <PriorityPill priority={caseItem.priority} />
              <BureauPill bureau={caseItem.assigned_bureau} full />
              {closed && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9.5px] font-bold text-emerald-700">
                  <CheckCircle2 className="h-2.5 w-2.5" /> Closed
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[26px]">
              {caseItem.category}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-slate-500">
              <Link
                href={`/institutions/${caseItem.institution_id}`}
                className="inline-flex items-center gap-1.5 font-bold text-brand-700 hover:underline"
              >
                <Building2 className="h-3.5 w-3.5" />
                {caseItem.institution?.name}
              </Link>
              {caseItem.institution?.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-slate-300" />
                  {caseItem.institution.city}, {caseItem.institution.state}
                </span>
              )}
              <span className="font-mono text-[10.5px] font-semibold text-slate-400">
                {caseItem.institution?.aicte_permanent_id}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[10.5px]">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <User className="h-3.5 w-3.5 text-slate-400" />
                Officer
                <strong className="font-bold text-slate-800">{caseItem.assigned_officer}</strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" />
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                Received
                <strong className="font-bold text-slate-800">{formatDate(caseItem.date_received)}</strong>
              </span>
              <span className="hidden h-3 w-px bg-slate-200 sm:block" />
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                Source
                <strong className="uppercase font-bold text-slate-800">{caseItem.source}</strong>
              </span>
            </div>
          </div>

          {/* SLA gauge */}
          <div className={cn("shrink-0 rounded-2xl border p-4 lg:w-[268px]", slaTone)}>
            <div className="flex items-center justify-between">
              <span className="eyebrow text-slate-500">
                <Clock className="h-3 w-3" /> SLA countdown
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                  caseItem.sla?.isBreached
                    ? "bg-rose-100 text-rose-700"
                    : caseItem.sla?.isApproaching
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                )}
              >
                {caseItem.sla?.isBreached
                  ? "Breached"
                  : caseItem.sla?.isApproaching
                    ? "Approaching"
                    : "Within SLA"}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <SlaRing
                percent={slaPercent}
                days={caseItem.sla?.remainingDays ?? 0}
                breached={caseItem.sla?.isBreached}
                approaching={caseItem.sla?.isApproaching}
                size={104}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold leading-snug text-slate-700">
                  {caseItem.sla?.statusText}
                </p>
                <div className="mt-2 space-y-1 text-[10px] text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Elapsed</span>
                    <span className="font-bold tabular-nums text-slate-800">
                      {caseItem.sla?.elapsedDays}d
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Timeline</span>
                    <span className="font-bold tabular-nums text-slate-800">
                      {caseItem.sla?.timelineDays}d
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Disposal by</span>
                    <span className="font-bold text-slate-800">
                      {formatDate(caseItem.expected_disposal_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action toolbar */}
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p className="text-[10.5px] font-medium text-slate-500">
            <span className="font-bold text-slate-700">Last action:</span>{" "}
            {caseItem.last_action}
            <span className="mx-1.5 text-slate-300">·</span>
            {latestAction ? formatDateTime(latestAction.timestamp) : formatDate(caseItem.last_action_date)}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {isAuthorizedToAct ? (
              <>
                <button onClick={() => setActiveModal("STATUS")} className="btn btn-primary btn-sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Change status
                </button>
                <button onClick={() => setActiveModal("TRANSFER")} className="btn btn-secondary btn-sm">
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Transfer
                </button>
                <button
                  onClick={() => setActiveModal("ESCALATE")}
                  className="btn btn-sm border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Escalate
                </button>
                <button onClick={() => setActiveModal("REMARK")} className="btn btn-secondary btn-sm">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Add remark
                </button>
                <button onClick={() => setActiveModal("LINK")} className="btn btn-secondary btn-sm">
                  <Link2 className="h-3.5 w-3.5" />
                  Link case
                </button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10.5px] font-semibold italic text-slate-500">
                <Lock className="h-3 w-3" />
                Read-only access
                {currentUser.role === "REGIONAL_OFFICER"
                  ? " · Regional observer"
                  : ` · Assigned to ${caseItem.assigned_bureau.replaceAll("_", " ")}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sentinel Brief - explainable risk, drivers and next best action */}
      {insight && (
        <CaseBrief
          insight={insight}
          canAct={isAuthorizedToAct}
          onAction={(action) => setActiveModal(action)}
        />
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-4">
          {/* Representation */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-brand-600" />
                  Grievance representation
                </h2>
                <p className="panel-sub">Original submission as received</p>
              </div>
            </div>
            <div className="px-5 py-4">
              <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
                {caseItem.description}
              </p>
            </div>
          </div>

          {/* Milestones */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-brand-600" />
                  Next action & milestones
                </h2>
                <p className="panel-sub">Statutory workflow checkpoints</p>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                {
                  icon: Gavel,
                  label: "Last action",
                  value: caseItem.last_action,
                  note: formatDateTime(caseItem.last_action_date),
                },
                {
                  icon: Target,
                  label: "Next action required",
                  value:
                    caseItem.next_action_required ||
                    "Awaiting verification / compliance response",
                  note: "Owner: " + caseItem.assigned_officer,
                },
                {
                  icon: CalendarDays,
                  label: "Expected disposal date",
                  value: formatDate(caseItem.expected_disposal_date),
                  note: caseItem.sla?.isBreached
                    ? `${Math.abs(caseItem.sla.remainingDays)} days past statutory timeline`
                    : `${caseItem.sla?.remainingDays} days remaining`,
                },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="flex items-start gap-3 px-5 py-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        {m.label}
                      </p>
                      <p className="mt-0.5 text-[11.5px] font-semibold leading-snug text-slate-800">
                        {m.value}
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{m.note}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked cases */}
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-brand-600" />
                  Linked & related cases
                </h2>
                <p className="panel-sub">Cross-reference map</p>
              </div>
              <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                {linkedCases.length}
              </span>
            </div>

            {linkedCases.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Link2 className="mx-auto h-6 w-6 text-slate-200" />
                <p className="mt-2 text-[11px] font-medium italic text-slate-400">
                  No cross-referenced cases linked yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {linkedCases.map((lc) => (
                  <Link
                    key={lc.id}
                    href={`/cases/${lc.id}`}
                    className="group block rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10.5px] font-bold text-brand-700 group-hover:underline">
                        {lc.case_id}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-slate-600">
                        {lc.linkType || "RELATED"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[11px] font-medium text-slate-600">
                      {lc.category}
                    </p>
                    {lc.linkNote && (
                      <p className="mt-0.5 line-clamp-1 text-[10px] italic text-slate-400">
                        {lc.linkNote}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="panel xl:col-span-2">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Action history & verification trail</h2>
              <p className="panel-sub">
                Immutable, append-only log of bureau movements, remarks and speaking orders
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge border-slate-200 bg-slate-50 text-slate-600">
                {actions.length} actions
              </span>
              <span className="hidden items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 sm:inline-flex">
                <Lock className="h-2.5 w-2.5" /> Immutable
              </span>
            </div>
          </div>

          <div className="max-h-[820px] overflow-y-auto p-5">
            <div className="timeline space-y-4">
              {actions.map((act: any, idx: number) => {
                const Icon = actionIcon[act.action_type] ?? RefreshCw;
                const isLatest = idx === actions.length - 1;
                return (
                  <div key={idx} className="relative">
                    <div
                      className={cn(
                        "timeline-node",
                        actionTone[act.action_type] ?? "bg-slate-50 text-slate-500 border-slate-200"
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                    </div>

                    <div
                      className={cn(
                        "rounded-xl border p-3.5 transition-colors",
                        isLatest
                          ? "border-brand-200 bg-brand-50/40 shadow-sm"
                          : "border-slate-100 bg-slate-50/60 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11.5px] font-bold capitalize text-slate-900">
                            {act.action_type.replaceAll("_", " ").toLowerCase()}
                          </span>
                          <BureauPill bureau={act.actor_bureau} />
                          {isLatest && (
                            <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white">
                              Latest
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatDateTime(act.timestamp)}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-slate-700">
                        {act.remarks}
                      </p>

                      {act.attachments && act.attachments.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/70 pt-2">
                          <span className="text-[9.5px] font-semibold text-slate-400">
                            Documents
                          </span>
                          {act.attachments.map((url: string, aIdx: number) => (
                            <a
                              key={aIdx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-white px-2 py-0.5 text-[10px] font-bold text-brand-700 transition-colors hover:bg-brand-50"
                            >
                              <Paperclip className="h-2.5 w-2.5" />
                              Attachment {aIdx + 1}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 text-[9.5px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {act.actor_user}
                        </span>
                        {act.from_bureau && act.to_bureau && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-1.5 py-0.5 font-semibold text-violet-700">
                            {act.from_bureau.replaceAll("_", " ")}
                            <ChevronRight className="h-2.5 w-2.5" />
                            {act.to_bureau.replaceAll("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
            <p className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <Lock className="h-3 w-3 text-slate-400" />
              Entries are append-only and cryptographically ordered. They cannot be edited or deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Overlap compare modal */}
      <Modal
        open={activeModal === "OVERLAP_COMPARE"}
        onClose={resetModals}
        title="Cross-bureau overlap comparison"
        description="Review both representations before directing a lead bureau."
        icon={<ShieldAlert className="h-4 w-4" />}
        tone="rose"
        size="xl"
        footer={
          <>
            <button type="button" onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || !coordinationNote.trim()}
              onClick={handleCoordinateOverlap}
              className="btn btn-success btn-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {isLoading ? "Saving…" : "Mark coordinated & link cases"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-900">
                <Sparkles className="h-3.5 w-3.5" />
                Overlap confidence
                <span className="uppercase">{overlapAlert?.confidence}</span>
              </span>
              <span className="font-mono text-[9.5px] text-rose-600">
                Alert {overlapAlert?.id}
              </span>
            </div>
            <ul className="mt-2 space-y-1">
              {overlapAlert?.match_reasons?.map((m: any, idx: number) => (
                <li key={idx} className="flex items-start gap-1.5 text-[11px] text-rose-800">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rose-500" />
                  {m.description}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border-2 border-brand-300 bg-brand-50/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-brand-600 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                  Current case
                </span>
                <span className="font-mono text-[10.5px] font-bold text-brand-700">
                  {caseItem.case_id}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Bureau</dt>
                  <dd className="mt-0.5"><BureauPill bureau={caseItem.assigned_bureau} full /></dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Category</dt>
                  <dd className="mt-0.5 font-bold text-slate-800">{caseItem.category}</dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Status</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    <StatusPill status={caseItem.status} />
                    <PriorityPill priority={caseItem.priority} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Representation</dt>
                  <dd className="mt-0.5 line-clamp-4 leading-relaxed text-slate-600">
                    {caseItem.description}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-brand-200/60 pt-2 text-[10px] text-slate-500">
                Received {formatDate(caseItem.date_received)}
              </p>
            </div>

            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                  Colliding case
                </span>
                <span className="font-mono text-[10.5px] font-bold text-amber-700">
                  {collidingCase?.case_id ||
                    overlapAlert?.case_ids?.find((id: string) => id !== caseItem.case_id)}
                </span>
              </div>
              <dl className="mt-3 space-y-2 text-[11px]">
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Bureau</dt>
                  <dd className="mt-0.5">
                    {collidingCase?.assigned_bureau ? (
                      <BureauPill bureau={collidingCase.assigned_bureau} full />
                    ) : (
                      <span className="font-bold text-slate-800">Parallel bureau</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Category</dt>
                  <dd className="mt-0.5 font-bold text-slate-800">
                    {collidingCase?.category || "Capitation Fee"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Status</dt>
                  <dd className="mt-1 flex flex-wrap gap-1">
                    <StatusPill status={collidingCase?.status || "PENDING"} />
                    <PriorityPill priority={collidingCase?.priority || "HIGH"} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">Representation</dt>
                  <dd className="mt-0.5 line-clamp-4 leading-relaxed text-slate-600">
                    {collidingCase?.description ||
                      "Parallel representation submitted to the AICTE registry."}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 border-t border-amber-200/60 pt-2 text-[10px] text-slate-500">
                Received {formatDate(collidingCase?.date_received)}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="coordination-note" className="field-label">
              Joint coordination minutes / directive
            </label>
            <textarea
              id="coordination-note"
              rows={3}
              value={coordinationNote}
              onChange={(e) => setCoordinationNote(e.target.value)}
              placeholder="Record the joint decision between bureaus, e.g. 'Regulation Bureau leads the inspection; PGRC grievance merged under AICTE/RB/2026/00042.'"
              className="input"
            />
            <p className="field-hint">
              This note is written to both case timelines and the audit ledger.
            </p>
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>

      {/* Status modal */}
      <Modal
        open={activeModal === "STATUS"}
        onClose={resetModals}
        title="Update grievance status"
        description="Every transition is written to the append-only audit trail."
        icon={<RefreshCw className="h-4 w-4" />}
        footer={
          <>
            <button onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={isLoading || remarks.length < 5}
              className="btn btn-primary btn-sm"
            >
              {isLoading ? "Updating…" : "Commit status change"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="new-status" className="field-label">
              New status <span className="text-rose-600">*</span>
            </label>
            <select
              id="new-status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as any)}
              className="input"
            >
              <option value="PENDING">Pending scrutiny</option>
              <option value="UNDER_PROCESS">Under process (notice / hearing / inspection)</option>
              <option value="DISPOSED">Disposed / redressed (speaking order)</option>
              <option value="TRANSFERRED">Transferred to external bureau</option>
              <option value="ESCALATED">Escalated to competent authority</option>
            </select>
          </div>

          <div>
            <label htmlFor="status-remarks" className="field-label">
              Official remarks / decision summary <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="status-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain the rationale for this status transition…"
              className="input"
            />
            <p className="field-hint">Minimum 5 characters. Visible to all authorized bureaus.</p>
          </div>

          {uploadField}

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>

      {/* Transfer modal */}
      <Modal
        open={activeModal === "TRANSFER"}
        onClose={resetModals}
        title="Transfer case to another bureau"
        description="Ownership moves immediately; the originating bureau retains observer access."
        icon={<ArrowRightLeft className="h-4 w-4" />}
        tone="violet"
        footer={
          <>
            <button onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleTransfer}
              disabled={isLoading || remarks.length < 10}
              className="btn btn-primary btn-sm"
            >
              {isLoading ? "Transferring…" : "Confirm transfer"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="to-bureau" className="field-label">
              Target bureau / cell <span className="text-rose-600">*</span>
            </label>
            <select
              id="to-bureau"
              value={toBureau}
              onChange={(e) => setToBureau(e.target.value as any)}
              className="input"
            >
              {bureauOptions.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="transfer-remarks" className="field-label">
              Transfer justification <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="transfer-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Explain why this matter falls under the recipient bureau's mandate…"
              className="input"
            />
            <p className="field-hint">Minimum 10 characters.</p>
          </div>

          {uploadField}

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>

      {/* Escalate modal */}
      <Modal
        open={activeModal === "ESCALATE"}
        onClose={resetModals}
        title="Escalate to competent authority"
        description="Flags this grievance to the Member Secretary and Hon'ble Chairman, AICTE."
        icon={<Flame className="h-4 w-4" />}
        tone="rose"
        footer={
          <>
            <button onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleEscalate}
              disabled={isLoading || remarks.length < 10}
              className="btn btn-danger btn-sm"
            >
              {isLoading ? "Escalating…" : "Confirm escalation"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p className="text-[11px] leading-relaxed text-rose-800">
              Priority is automatically set to <strong>CRITICAL</strong> and an escalation
              notification is dispatched. Use only for non-compliance, severe student impact, or SLA
              breach.
            </p>
          </div>

          <div>
            <label htmlFor="escalate-remarks" className="field-label">
              Reasons for urgent escalation <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="escalate-remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Specify non-compliance, severe student impact, or SLA breach…"
              className="input"
            />
            <p className="field-hint">Minimum 10 characters.</p>
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>

      {/* Remark modal */}
      <Modal
        open={activeModal === "REMARK"}
        onClose={resetModals}
        title="Add remark / upload document"
        description="Appends a dated note to the case verification trail."
        icon={<MessageSquare className="h-4 w-4" />}
        footer={
          <>
            <button onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleAddRemark}
              disabled={isLoading || remarks.length < 3}
              className="btn btn-primary btn-sm"
            >
              {isLoading ? "Recording…" : "Save to timeline"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="remark-text" className="field-label">
              Officer remark <span className="text-rose-600">*</span>
            </label>
            <textarea
              id="remark-text"
              rows={4}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Record inquiry findings, hearing notes, or compliance updates…"
              className="input"
            />
          </div>

          {uploadField}

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>

      {/* Link modal */}
      <Modal
        open={activeModal === "LINK"}
        onClose={resetModals}
        title="Link related AICTE case"
        description="Creates a bidirectional reference between both case records."
        icon={<Link2 className="h-4 w-4" />}
        tone="amber"
        footer={
          <>
            <button onClick={resetModals} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleLinkCase}
              disabled={isLoading || !linkTargetId.trim()}
              className="btn btn-primary btn-sm"
            >
              {isLoading ? "Linking…" : "Establish link"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="link-target" className="field-label">
              Target AICTE case ID <span className="text-rose-600">*</span>
            </label>
            <input
              id="link-target"
              type="text"
              placeholder="e.g. AICTE/RB/2026/00042"
              value={linkTargetId}
              onChange={(e) => setLinkTargetId(e.target.value)}
              className="input font-mono"
            />
          </div>

          <div>
            <label htmlFor="link-type" className="field-label">
              Relationship type
            </label>
            <select
              id="link-type"
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="input"
            >
              <option value="OVERLAP">Overlap — concurrent jurisdiction / shared grievance</option>
              <option value="DUPLICATE">Duplicate — identical representation</option>
              <option value="RELATED">Related — same institution / linked issue</option>
            </select>
          </div>

          <div>
            <label htmlFor="link-note" className="field-label">
              Note <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="link-note"
              type="text"
              placeholder="Brief explanatory note…"
              value={linkNote}
              onChange={(e) => setLinkNote(e.target.value)}
              className="input"
            />
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {errorMsg}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
