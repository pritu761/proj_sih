"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  FileBadge,
  ClipboardCheck,
  Scale,
  BellRing,
  Gavel,
  Landmark,
  FileText,
  Plus,
  ExternalLink,
  Trash2,
  UploadCloud,
  Link2,
  Paperclip,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  addInstitutionDocumentAction,
  removeInstitutionDocumentAction,
} from "@/actions/institution-actions";
import { SessionUser } from "@/lib/rbac";
import { formatDate, cn } from "@/lib/utils";

export interface VaultDocument {
  id: string;
  institution_id: string;
  title: string;
  doc_type: string;
  blob_url: string;
  file_name: string;
  file_size: number;
  uploaded_by: string;
  notes?: string;
  case_id?: string;
  uploaded_at: Date | string;
}

interface DocumentVaultProps {
  institutionId: string;
  initialDocuments: VaultDocument[];
  /** Registry numbers offered as statutory linkage targets */
  linkedCases: { caseId: string; label: string }[];
  currentUser: SessionUser;
}

const DOC_TYPES = [
  { value: "APPROVAL_LETTER", label: "Approval / Extension of Approval letter", icon: FileBadge, chip: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "COMPLIANCE_REPORT", label: "Compliance report", icon: ClipboardCheck, chip: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "AUDIT_STATEMENT", label: "Audit statement", icon: Scale, chip: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "SHOW_CAUSE_NOTICE", label: "Show-cause notice", icon: BellRing, chip: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "COURT_ORDER", label: "Court order", icon: Gavel, chip: "bg-violet-50 text-violet-700 border-violet-200" },
  { value: "FINANCIAL_RECORD", label: "Financial record", icon: Landmark, chip: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "OTHER", label: "Other statutory record", icon: FileText, chip: "bg-slate-100 text-slate-600 border-slate-200" },
] as const;

type DocTypeValue = (typeof DOC_TYPES)[number]["value"];

const fmtSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`;

export function DocumentVault({
  institutionId,
  initialDocuments,
  linkedCases,
  currentUser,
}: DocumentVaultProps) {
  const router = useRouter();
  const toast = useToast();

  const [documents, setDocuments] = useState<VaultDocument[]>(initialDocuments);
  const [addOpen, setAddOpen] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    docType: "APPROVAL_LETTER",
    notes: "",
    linkedCase: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setFileUrl(data.url);
        setFileName(file.name);
        setFileSize(file.size);
        if (!form.title) setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
      } else {
        const err = await res.json();
        setError(err.error || "File upload failed.");
      }
    } catch {
      setError("File upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const openAdd = () => {
    setAddOpen(true);
    setFileUrl("");
    setFileName("");
    setFileSize(0);
    setForm({ title: "", docType: "APPROVAL_LETTER", notes: "", linkedCase: "" });
    setError("");
  };

  const handleAdd = async () => {
    setIsSaving(true);
    setError("");
    const res = await addInstitutionDocumentAction({
      institutionId,
      title: form.title,
      docType: form.docType as DocTypeValue,
      blobUrl: fileUrl,
      fileName: fileName || form.title,
      fileSize,
      notes: form.notes || undefined,
      linkedCase: form.linkedCase || undefined,
    });
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || "Failed to archive the document.");
      return;
    }
    setDocuments((prev) => [
      {
        id: res.documentId ?? "",
        institution_id: institutionId,
        title: form.title,
        doc_type: form.docType,
        blob_url: fileUrl,
        file_name: fileName || form.title,
        file_size: fileSize,
        uploaded_by: currentUser.email,
        notes: form.notes || undefined,
        case_id: form.linkedCase || undefined,
        uploaded_at: new Date(),
      },
      ...prev,
    ]);
    setAddOpen(false);
    toast.success("Document archived", "The record is visible to every authorized bureau working this institution.");
    router.refresh();
  };

  const handleRemove = async (doc: VaultDocument) => {
    setBusyDocId(doc.id);
    const res = await removeInstitutionDocumentAction({
      documentId: doc.id,
      institutionId,
    });
    setBusyDocId(null);
    if (!res.success) {
      toast.error("Could not remove record", res.error || "Please try again.");
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    toast.info("Vault record removed", "The removal is recorded in the audit ledger.");
    router.refresh();
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <Archive className="h-3.5 w-3.5 text-violet-600" />
            Institution document vault
          </h2>
          <p className="panel-sub">Statutory records preserved across bureaus — single evidence shelf</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge border-slate-200 bg-slate-50 text-slate-600">
            {documents.length} records
          </span>
          <button onClick={openAdd} className="btn btn-primary btn-sm">
            <Plus className="h-3.5 w-3.5" />
            Archive record
          </button>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <Archive className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-2 text-[11.5px] font-semibold text-slate-500">Vault is empty</p>
          <p className="text-[10.5px] text-slate-400">
            Approval letters, compliance reports, notices and court orders for this institution will
            appear here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {documents.map((doc) => {
            const meta = DOC_TYPES.find((t) => t.value === doc.doc_type) ?? {
              icon: FileText,
              chip: "bg-slate-100 text-slate-600 border-slate-200",
              label: doc.doc_type,
            };
            const Icon = meta.icon;
            const canRemove =
              doc.uploaded_by?.toLowerCase() === currentUser.email.toLowerCase() ||
              currentUser.role === "ADMIN";
            return (
              <div key={doc.id} className="flex items-start gap-3 px-5 py-3.5">
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                    meta.chip
                  )}
                  title={meta.label}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-[12px] font-bold leading-snug text-slate-900">{doc.title}</p>
                    {doc.case_id && (
                      <Link
                        href={`/cases/${encodeURIComponent(doc.case_id)}`}
                        className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-brand-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-brand-700 hover:bg-brand-100"
                        title="Linked case"
                      >
                        <Link2 className="h-2.5 w-2.5" />
                        {doc.case_id}
                      </Link>
                    )}
                  </div>
                  {doc.notes && (
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{doc.notes}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[9.5px] text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <Paperclip className="h-2.5 w-2.5" />
                      {doc.file_name} · {fmtSize(Number(doc.file_size))}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>By {doc.uploaded_by}</span>
                    <span className="text-slate-300">·</span>
                    <span>Archived {formatDate(doc.uploaded_at)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={doc.blob_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </a>
                  {canRemove && (
                    <button
                      onClick={() => handleRemove(doc)}
                      disabled={busyDocId === doc.id}
                      className="btn btn-sm border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      title="Remove vault record"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add record modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Archive a statutory record"
        description="Evidence persists per institution, independent of any single case file."
        icon={<Archive className="h-4 w-4" />}
        tone="violet"
        footer={
          <>
            <button onClick={() => setAddOpen(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={isSaving || !fileUrl || form.title.trim().length < 4}
              className="btn btn-primary btn-sm"
            >
              {isSaving ? "Archiving…" : "Archive record"}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label className="field-label">Document file <span className="text-rose-600">*</span></label>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed px-3 py-2.5 transition-colors",
                fileUrl
                  ? "border-emerald-300 bg-emerald-50/60"
                  : "border-slate-300 bg-slate-50/60 hover:border-violet-300 hover:bg-violet-50/40"
              )}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <UploadCloud className={cn("h-4 w-4 shrink-0", fileUrl ? "text-emerald-600" : "text-slate-400")} />
                <span className="min-w-0">
                  <span className="block truncate text-[11.5px] font-semibold text-slate-700">
                    {isUploading
                      ? "Uploading securely…"
                      : fileUrl
                        ? fileName || "Document uploaded"
                        : "Attach PDF, PNG, JPEG or DOCX"}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {fileUrl ? `Stored on secure blob · ${fmtSize(fileSize)}` : "Max 10 MB · required"}
                  </span>
                </span>
              </span>
              <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-slate-600">
                Browse
              </span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div>
            <label htmlFor="dv-title" className="field-label">
              Title <span className="text-rose-600">*</span>
            </label>
            <input
              id="dv-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Extension of Approval 2026-27 (60 seats, CSE)"
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="dv-type" className="field-label">
                Record type <span className="text-rose-600">*</span>
              </label>
              <select
                id="dv-type"
                value={form.docType}
                onChange={(e) => setForm({ ...form, docType: e.target.value })}
                className="input"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="dv-case" className="field-label">
                Link to case <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <select
                id="dv-case"
                value={form.linkedCase}
                onChange={(e) => setForm({ ...form, linkedCase: e.target.value })}
                className="input"
              >
                <option value="">Not linked</option>
                {linkedCases.map((lc) => (
                  <option key={lc.caseId} value={lc.caseId}>
                    {lc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="dv-notes" className="field-label">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="dv-notes"
              rows={2}
              value={form.notes}
              maxLength={600}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Why this record is on the shelf — e.g. referenced in capitation enquiry as the statutory fee ceiling."
              className="input"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {error}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
