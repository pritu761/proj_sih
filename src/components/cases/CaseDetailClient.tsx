"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Building,
  User,
  ArrowRightLeft,
  Flame,
  MessageSquare,
  Link2,
  ShieldAlert,
  CheckCircle2,
  X,
  Paperclip,
  Eye,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  getBureauBadgeColor,
  getBureauLabel,
  getStatusBadgeColor,
  getPriorityBadgeColor,
} from "@/lib/utils";
import {
  updateCaseStatusAction,
  transferCaseAction,
  escalateCaseAction,
  addRemarkAction,
  linkCasesAction,
} from "@/actions/case-actions";
import { coordinateOverlapAction } from "@/actions/overlap-actions";
import { canActOnCase, SessionUser } from "@/lib/rbac";

interface CaseDetailClientProps {
  caseItem: any;
  linkedCases: any[];
  overlapAlert?: any;
  collidingCase?: any;
  currentUser: SessionUser;
}

export function CaseDetailClient({
  caseItem,
  linkedCases,
  overlapAlert,
  collidingCase,
  currentUser,
}: CaseDetailClientProps) {
  const router = useRouter();

  // Modals
  const [activeModal, setActiveModal] = useState<
    "STATUS" | "TRANSFER" | "ESCALATE" | "REMARK" | "LINK" | "OVERLAP_COMPARE" | null
  >(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Form states
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
  };

  // Action Handlers
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

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/cases" className="hover:text-blue-900 font-medium">
          Case Explorer
        </Link>
        <span>/</span>
        <span className="font-mono font-bold text-slate-900">{caseItem.case_id}</span>
      </nav>

      {/* Prominent Overlap Banner if active for this case */}
      {overlapAlert && (
        <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-5 shadow-sm animate-warning-glow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-600 text-white shadow-xs">
                <ShieldAlert className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-950 flex items-center gap-2">
                  <span>Potential Overlapping Cases – Coordination Required</span>
                  <span className="rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-800">
                    ACTION NEEDED
                  </span>
                </h3>
                <p className="text-xs text-rose-800 mt-1 max-w-2xl">
                  {overlapAlert.match_reasons?.map((r: any) => r.description).join(" ") ||
                    "This case collides with an open case in another Bureau for the same institution."}
                </p>
                <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-rose-900">
                  <span>Collision with: {overlapAlert.case_ids?.filter((id: string) => id !== caseItem.case_id).join(", ")}</span>
                  <span>•</span>
                  <span>Confidence: {overlapAlert.confidence}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveModal("OVERLAP_COMPARE")}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>Compare Side-by-Side</span>
            </button>
          </div>
        </div>
      )}

      {/* Case Header & Primary Details */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-sm font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                {caseItem.case_id}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getStatusBadgeColor(caseItem.status)}`}>
                {caseItem.status.replace("_", " ")}
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getPriorityBadgeColor(caseItem.priority)}`}>
                {caseItem.priority} PRIORITY
              </span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded border ${getBureauBadgeColor(caseItem.assigned_bureau)}`}>
                {getBureauLabel(caseItem.assigned_bureau)}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
              Category: {caseItem.category}
            </h1>

            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <Building className="h-4 w-4 text-slate-400 shrink-0" />
              <Link
                href={`/institutions/${caseItem.institution_id}`}
                className="font-bold text-blue-900 hover:underline"
              >
                {caseItem.institution?.name}
              </Link>
              <span>•</span>
              <span>AICTE ID: {caseItem.institution?.aicte_permanent_id}</span>
              <span>•</span>
              <span>{caseItem.institution?.city}, {caseItem.institution?.state}</span>
            </div>
          </div>

          {/* SLA Countdown Card */}
          <div
            className={`rounded-xl border p-4 shrink-0 lg:w-72 ${
              caseItem.sla.isBreached
                ? "border-rose-300 bg-rose-50"
                : caseItem.sla.isApproaching
                ? "border-amber-300 bg-amber-50"
                : "border-emerald-300 bg-emerald-50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                SLA Compliance Status
              </span>
              <Clock
                className={`h-4 w-4 ${
                  caseItem.sla.isBreached
                    ? "text-rose-600"
                    : caseItem.sla.isApproaching
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              />
            </div>

            <p
              className={`mt-1.5 text-base font-black ${
                caseItem.sla.isBreached
                  ? "text-rose-700"
                  : caseItem.sla.isApproaching
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {caseItem.sla.statusText}
            </p>

            <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${
                  caseItem.sla.isBreached
                    ? "bg-rose-600"
                    : caseItem.sla.isApproaching
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }`}
                style={{ width: `${Math.min(100, caseItem.sla.percentElapsed)}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
              <span>Elapsed: {caseItem.sla.elapsedDays}d</span>
              <span>Limit: {caseItem.sla.timelineDays}d</span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <User className="h-4 w-4 text-slate-400" />
            <span>Assigned Officer: <strong className="text-slate-800">{caseItem.assigned_officer}</strong></span>
            <span>•</span>
            <span>Source: <strong className="text-slate-800 uppercase">{caseItem.source}</strong></span>
          </div>

          {/* Workflow Action Buttons (Role Guarded) */}
          <div className="flex flex-wrap items-center gap-2">
            {isAuthorizedToAct ? (
              <>
                <button
                  onClick={() => setActiveModal("STATUS")}
                  className="rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Change Status
                </button>
                <button
                  onClick={() => setActiveModal("TRANSFER")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Transfer Bureau</span>
                </button>
                <button
                  onClick={() => setActiveModal("ESCALATE")}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Escalate</span>
                </button>
                <button
                  onClick={() => setActiveModal("REMARK")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Add Remark / Doc</span>
                </button>
                <button
                  onClick={() => setActiveModal("LINK")}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Link Case</span>
                </button>
              </>
            ) : (
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-500 font-medium italic">
                Read-Only Access ({currentUser.role === "REGIONAL_OFFICER" ? "Regional Observer" : `Assigned to ${caseItem.assigned_bureau}`})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Description & Chronological Vertical Action Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Description & Metadata */}
        <div className="space-y-6">
          {/* Complaint Description */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              Grievance Representation
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {caseItem.description}
            </p>
          </div>

          {/* Action Status Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
              Next Action & Milestones
            </h2>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Action</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">{caseItem.last_action}</p>
              <span className="text-[10px] text-slate-400">{formatDateTime(caseItem.last_action_date)}</span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Next Action Required</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {caseItem.next_action_required || "Awaiting verification / compliance response"}
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Expected Disposal Date</span>
              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                {formatDate(caseItem.expected_disposal_date)}
              </p>
            </div>
          </div>

          {/* Linked Cases Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Link2 className="h-4 w-4 text-blue-900" />
                <span>Linked & Related Cases</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-bold">{linkedCases.length}</span>
            </div>

            {linkedCases.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No cross-referenced cases linked yet.</p>
            ) : (
              <div className="space-y-2">
                {linkedCases.map((lc) => (
                  <div key={lc.id} className="rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <Link href={`/cases/${lc.id}`} className="font-mono font-bold text-blue-900 hover:underline">
                        {lc.case_id}
                      </Link>
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                        {lc.linkType || "RELATED"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{lc.category}</p>
                    {lc.linkNote && <p className="text-[10px] text-slate-400 italic mt-0.5">{lc.linkNote}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Append-Only Chronological Vertical Timeline */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Action History & Verification Trail
              </h2>
              <p className="text-xs text-slate-500">
                Immutable, append-only chronological log of all bureau movements, remarks, and speaking orders.
              </p>
            </div>
            <span className="rounded bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-bold">
              {caseItem.actions?.length || 0} Actions
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {caseItem.actions?.map((act: any, idx: number) => (
              <div key={idx} className="relative group">
                {/* Node icon indicator */}
                <div className="absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-900 shadow-xs" />

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all group-hover:border-slate-300 group-hover:bg-white shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {act.action_type.replace("_", " ")}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBureauBadgeColor(act.actor_bureau)}`}>
                        {act.actor_bureau.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">
                    {act.remarks}
                  </p>

                  {/* Supporting Attachments if present */}
                  {act.attachments && act.attachments.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-400">Supporting Documents:</span>
                      {act.attachments.map((url: string, aIdx: number) => (
                        <a
                          key={aIdx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 hover:bg-blue-100 border border-blue-200"
                        >
                          <Paperclip className="h-3 w-3" />
                          <span>Attachment {aIdx + 1}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Officer: {act.actor_user}</span>
                    {act.from_bureau && act.to_bureau && (
                      <span className="font-semibold text-purple-700">
                        Movement: {act.from_bureau} → {act.to_bureau}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIDE-BY-SIDE OVERLAP COMPARISON MODAL */}
      {/* ========================================================================= */}
      {activeModal === "OVERLAP_COMPARE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Cross-Bureau Overlap Side-by-Side Comparison
                </h3>
              </div>
              <button onClick={resetModals} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Overlap Summary Alert Header */}
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-900">
                  Overlap Confidence: <strong className="uppercase">{overlapAlert?.confidence}</strong>
                </span>
                <span className="text-[10px] font-mono text-rose-700">Alert ID: {overlapAlert?.id}</span>
              </div>
              <ul className="mt-2 text-xs text-rose-800 space-y-1">
                {overlapAlert?.match_reasons?.map((m: any, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="font-bold">•</span>
                    <span>{m.description}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Side-by-side Columns: Case A vs Case B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Primary Case (Case A) */}
              <div className="rounded-xl border-2 border-blue-400 bg-blue-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    Current Case
                  </span>
                  <span className="font-mono text-xs font-bold text-blue-900">{caseItem.case_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Bureau</span>
                  <p className="text-xs font-bold text-slate-900">{caseItem.assigned_bureau}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Category</span>
                  <p className="text-xs font-bold text-slate-900">{caseItem.category}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status & Priority</span>
                  <p className="text-xs text-slate-800">{caseItem.status} ({caseItem.priority})</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Grievance Representation</span>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-4">{caseItem.description}</p>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  Received: {formatDate(caseItem.date_received)}
                </div>
              </div>

              {/* Colliding Case (Case B) */}
              <div className="rounded-xl border-2 border-amber-400 bg-amber-50/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    Colliding Open Case
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-900">
                    {collidingCase?.case_id || overlapAlert?.case_ids?.find((id: string) => id !== caseItem.case_id)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Bureau</span>
                  <p className="text-xs font-bold text-slate-900">
                    {collidingCase?.assigned_bureau || "Parallel Bureau"}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Category</span>
                  <p className="text-xs font-bold text-slate-900">{collidingCase?.category || "Capitation Fee"}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Status & Priority</span>
                  <p className="text-xs text-slate-800">{collidingCase?.status || "PENDING"} ({collidingCase?.priority || "HIGH"})</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Grievance Representation</span>
                  <p className="text-xs text-slate-700 mt-1 line-clamp-4">
                    {collidingCase?.description || "Parallel representation submitted to AICTE registry."}
                  </p>
                </div>
                <div className="text-[11px] text-slate-500 pt-2 border-t border-slate-200">
                  Received: {formatDate(collidingCase?.date_received)}
                </div>
              </div>
            </div>

            {/* Inter-Bureau Coordination Action Box */}
            <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Joint Coordination Minutes / Directive:
              </label>
              <textarea
                rows={3}
                value={coordinationNote}
                onChange={(e) => setCoordinationNote(e.target.value)}
                placeholder="Record joint decision between Bureaus (e.g., 'Regulation Bureau will take lead on inspection; PGRC grievance merged under AICTE/RB/2026/00042')..."
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-hidden"
              />

              {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetModals}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isLoading || !coordinationNote.trim()}
                  onClick={handleCoordinateOverlap}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isLoading ? "Saving..." : "Mark as Coordinated & Link Cases"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STATUS CHANGE MODAL */}
      {/* ========================================================================= */}
      {activeModal === "STATUS" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Update Grievance Status</h3>
              <button onClick={resetModals}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select New Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
              >
                <option value="PENDING">Pending Scrutiny</option>
                <option value="UNDER_PROCESS">Under Process (Notice / Hearing / Inspection)</option>
                <option value="DISPOSED">Disposed / Redressed (Speaking Order)</option>
                <option value="TRANSFERRED">Transferred to External Bureau</option>
                <option value="ESCALATED">Escalated to Competent Authority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Remarks / Decision Summary *
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain the rationale for status transition..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Supporting Document (PDF/Docx)</label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isUploading && <span className="text-[10px] text-blue-700">Uploading to Vercel Blob...</span>}
              {uploadedUrl && <span className="text-[10px] text-emerald-600 block mt-1">Uploaded successfully.</span>}
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetModals} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
              <button
                onClick={handleUpdateStatus}
                disabled={isLoading || remarks.length < 5}
                className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isLoading ? "Updating..." : "Commit Status Change"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRANSFER BUREAU MODAL */}
      {/* ========================================================================= */}
      {activeModal === "TRANSFER" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Transfer Case to Another Bureau</h3>
              <button onClick={resetModals}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Bureau/Cell *</label>
              <select
                value={toBureau}
                onChange={(e) => setToBureau(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
              >
                <option value="REGULATION_BUREAU">Regulation Bureau (RB)</option>
                <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                <option value="APPROVAL_BUREAU">Approval Bureau (AB)</option>
                <option value="SKILL_CELL">Skill Development Cell (SDC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Transfer Justification & Reason * (min 10 chars)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Explain why this matter falls under the recipient bureau's mandate..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetModals} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
              <button
                onClick={handleTransfer}
                disabled={isLoading || remarks.length < 10}
                className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isLoading ? "Transferring..." : "Confirm Bureau Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ESCALATE MODAL */}
      {/* ========================================================================= */}
      {activeModal === "ESCALATE" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-rose-600" />
                <span>Escalate Case to Competent Authority</span>
              </h3>
              <button onClick={resetModals}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <p className="text-xs text-slate-600">
              This action flags this grievance directly to the Member Secretary & Hon&apos;ble Chairman, AICTE. Priority will be set to CRITICAL.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reasons for Urgent Escalation * (min 10 chars)
              </label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Specify non-compliance, severe student impact, or SLA breach..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetModals} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
              <button
                onClick={handleEscalate}
                disabled={isLoading || remarks.length < 10}
                className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isLoading ? "Escalating..." : "Confirm Escalation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD REMARK MODAL */}
      {/* ========================================================================= */}
      {activeModal === "REMARK" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Add Remark / Upload Document</h3>
              <button onClick={resetModals}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Officer Remark *</label>
              <textarea
                rows={3}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Record inquiry findings, hearing notes, or compliance updates..."
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Attach Supporting File</label>
              <input
                type="file"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {isUploading && <span className="text-[10px] text-blue-700">Uploading to Vercel Blob...</span>}
              {uploadedUrl && <span className="text-[10px] text-emerald-600 block mt-1">Uploaded successfully.</span>}
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetModals} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
              <button
                onClick={handleAddRemark}
                disabled={isLoading || remarks.length < 3}
                className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isLoading ? "Recording..." : "Save to Timeline"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LINK CASE MODAL */}
      {/* ========================================================================= */}
      {activeModal === "LINK" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-bold text-slate-900">Link Related AICTE Case</h3>
              <button onClick={resetModals}><X className="h-5 w-5 text-slate-400" /></button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target AICTE Case ID *</label>
              <input
                type="text"
                placeholder="e.g. AICTE/RB/2026/00042"
                value={linkTargetId}
                onChange={(e) => setLinkTargetId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Relationship Type</label>
              <select
                value={linkType}
                onChange={(e) => setLinkType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
              >
                <option value="OVERLAP">OVERLAP (Concurrent jurisdiction / shared grievance)</option>
                <option value="DUPLICATE">DUPLICATE (Identical representation)</option>
                <option value="RELATED">RELATED (Same institution / linked issue)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Note (Optional)</label>
              <input
                type="text"
                placeholder="Brief explanatory note..."
                value={linkNote}
                onChange={(e) => setLinkNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              />
            </div>

            {errorMsg && <p className="text-xs text-rose-600">{errorMsg}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={resetModals} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
              <button
                onClick={handleLinkCase}
                disabled={isLoading || !linkTargetId.trim()}
                className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {isLoading ? "Linking..." : "Establish Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
