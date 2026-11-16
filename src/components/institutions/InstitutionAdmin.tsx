"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Save,
  Tags,
  Trash2,
  GitMerge,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  createInstitutionAction,
  updateInstitutionAction,
  addInstitutionAliasAction,
  removeInstitutionAliasAction,
  mergeInstitutionsAction,
} from "@/actions/institution-actions";
import {
  InstitutionRegionEnum,
  InstitutionTypeEnum,
} from "@/lib/validations";

const regions = InstitutionRegionEnum.options;
const types = InstitutionTypeEnum.options;

export interface InstitutionAdminView {
  id: string;
  name: string;
  aicte_permanent_id: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  region: string;
  institution_type: string;
  contact_email: string;
  contact_phone: string;
  aliases: string[];
  caseCount: number;
  merged_into?: string;
}

/**
 * ADMIN-only "Add institution" form for the directory page. Collapsed by
 * default so the read-only directory stays uncluttered.
 */
export function AddInstitutionPanel({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    aicte_permanent_id: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    region: "Northern",
    institution_type: "Engineering & Technology",
    contact_email: "",
    contact_phone: "",
  });

  if (!isAdmin) return null;

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await createInstitutionAction(form);
      if (!res.success) {
        setError(res.error || "Failed to create institution.");
        return;
      }
      toast.success("Institution created", `${res.data?.name ?? "Institution"} added to the directory.`);
      setForm({
        name: "",
        aicte_permanent_id: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        region: "Northern",
        institution_type: "Engineering & Technology",
        contact_email: "",
        contact_phone: "",
      });
      setOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Failed to create institution.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="flex items-center gap-2 text-[12px] font-bold text-slate-800">
          <Plus className="h-3.5 w-3.5 text-brand-600" />
          Add institution
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-brand-700">
            Admin
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Institution name *">
              <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Registered name" />
            </Field>
            <Field label="AICTE Permanent ID *">
              <input className="input font-mono" value={form.aicte_permanent_id} onChange={(e) => set("aicte_permanent_id", e.target.value)} placeholder="1-1234567890" />
            </Field>
            <Field label="Institution type *">
              <select className="input" value={form.institution_type} onChange={(e) => set("institution_type", e.target.value)}>
                {types.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Address *">
              <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street / campus" />
            </Field>
            <Field label="City *">
              <input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="State *">
              <input className="input" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </Field>
            <Field label="PIN code *">
              <input className="input" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="6 digits" maxLength={6} />
            </Field>
            <Field label="Region *">
              <select className="input" value={form.region} onChange={(e) => set("region", e.target.value)}>
                {regions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Contact email">
              <input className="input" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} />
            </Field>
            <Field label="Contact phone">
              <input className="input" value={form.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </Field>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {busy ? "Creating…" : "Create institution"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Detail-page manager: edit key fields, manage aliases (entity resolution),
 * and merge this institution into another. Edit is available to admins and
 * bureau officers; merge is ADMIN-only (documented in the repository).
 */
export function InstitutionManager({
  institution,
  allInstitutions,
  isAdmin,
  isOfficer,
}: {
  institution: InstitutionAdminView;
  allInstitutions: Array<{ id: string; name: string; aicte_permanent_id: string }>;
  isAdmin: boolean;
  isOfficer: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [edit, setEdit] = useState({
    name: institution.name,
    address: institution.address,
    city: institution.city,
    state: institution.state,
    pincode: institution.pincode,
    region: institution.region,
    institution_type: institution.institution_type,
    contact_email: institution.contact_email ?? "",
    contact_phone: institution.contact_phone ?? "",
  });
  const [aliasInput, setAliasInput] = useState("");
  const [mergeTarget, setMergeTarget] = useState("");
  const [mergeReason, setMergeReason] = useState("");
  const [mergeConfirmed, setMergeConfirmed] = useState(false);

  const canEdit = isAdmin || isOfficer;
  const aliases = institution.aliases ?? [];
  const targets = allInstitutions.filter((i) => i.id !== institution.id);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    setBusy(true);
    setError("");
    try {
      const res = await fn();
      if (!res.success) {
        setError(res.error || "Operation failed.");
        return;
      }
      toast.success(ok);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Operation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="panel overflow-hidden">
          <div className="panel-head">
            <h2 className="panel-title flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-brand-600" />
              Edit institution record
            </h2>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              {isAdmin ? "Admin" : "Bureau officer"}
            </span>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Name">
                <input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </Field>
              <Field label="City">
                <input className="input" value={edit.city} onChange={(e) => setEdit({ ...edit, city: e.target.value })} />
              </Field>
              <Field label="State">
                <input className="input" value={edit.state} onChange={(e) => setEdit({ ...edit, state: e.target.value })} />
              </Field>
              <Field label="PIN code">
                <input className="input" value={edit.pincode} maxLength={6} onChange={(e) => setEdit({ ...edit, pincode: e.target.value })} />
              </Field>
              <Field label="Region">
                <select className="input" value={edit.region} onChange={(e) => setEdit({ ...edit, region: e.target.value })}>
                  {regions.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Type">
                <select className="input" value={edit.institution_type} onChange={(e) => setEdit({ ...edit, institution_type: e.target.value })}>
                  {types.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Address">
                <input className="input" value={edit.address} onChange={(e) => setEdit({ ...edit, address: e.target.value })} />
              </Field>
              <Field label="Contact email">
                <input className="input" value={edit.contact_email} onChange={(e) => setEdit({ ...edit, contact_email: e.target.value })} />
              </Field>
              <Field label="Contact phone">
                <input className="input" value={edit.contact_phone} onChange={(e) => setEdit({ ...edit, contact_phone: e.target.value })} />
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                disabled={busy}
                onClick={() => run(() => updateInstitutionAction({ institutionId: institution.id, ...edit }), "Institution updated")}
                className="btn btn-primary btn-sm"
              >
                <Save className="h-3.5 w-3.5" />
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="panel overflow-hidden">
          <div className="panel-head">
            <h2 className="panel-title flex items-center gap-2">
              <Tags className="h-3.5 w-3.5 text-amber-600" />
              Aliases — alternate names for entity resolution
            </h2>
            <span className="badge border-amber-200 bg-amber-50 text-amber-700">{aliases.length}</span>
          </div>
          <div className="px-5 py-4">
            <p className="mb-3 text-[10.5px] leading-relaxed text-slate-500">
              Aliases let the overlap detector recognise filings made under a different name as the
              same institution. They are additive and never overwrite the canonical name.
            </p>
            {aliases.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {aliases.map((alias) => (
                  <span key={alias} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {alias}
                    <button
                      type="button"
                      aria-label={`Remove alias ${alias}`}
                      disabled={busy}
                      onClick={() => run(
                        () => removeInstitutionAliasAction({ institutionId: institution.id, alias }),
                        "Alias removed"
                      )}
                      className="rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                placeholder="e.g. Apex Engineering College"
              />
              <button
                disabled={busy || aliasInput.trim().length < 2}
                onClick={() => run(async () => {
                  const res = await addInstitutionAliasAction({ institutionId: institution.id, alias: aliasInput });
                  if (res.success) setAliasInput("");
                  return res;
                }, "Alias added")}
                className="btn btn-secondary btn-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add alias
              </button>
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="panel overflow-hidden">
          <div className="panel-head">
            <h2 className="panel-title flex items-center gap-2">
              <GitMerge className="h-3.5 w-3.5 text-violet-600" />
              Merge into another institution
            </h2>
            <span className="badge border-violet-200 bg-violet-50 text-violet-700">Admin</span>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed text-amber-900">
                All <strong>{institution.caseCount}</strong> case(s), documents and overlap alerts on
                record will be reassigned. The source record stays in the audit trail; history is
                never deleted.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="field-label">Merge into *</label>
                <select className="input" value={mergeTarget} onChange={(e) => setMergeTarget(e.target.value)}>
                  <option value="">Select target institution…</option>
                  {targets.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.aicte_permanent_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Justification *</label>
                <input
                  className="input"
                  value={mergeReason}
                  onChange={(e) => setMergeReason(e.target.value)}
                  placeholder="e.g. Duplicate AICTE records for the same campus"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <input
                type="checkbox"
                checked={mergeConfirmed}
                onChange={(e) => setMergeConfirmed(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 accent-violet-600"
              />
              <span className="text-[11px] font-medium leading-relaxed text-slate-700">
                I confirm that <strong className="font-mono">{institution.aicte_permanent_id}</strong> is
                the same entity as the selected target and that its {institution.caseCount} case(s)
                should move.
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                disabled={busy || !mergeTarget || mergeReason.trim().length < 10 || !mergeConfirmed}
                onClick={() => run(
                  () => mergeInstitutionsAction({
                    sourceId: institution.id,
                    targetId: mergeTarget,
                    reason: mergeReason,
                  }),
                  "Institutions merged"
                )}
                className="btn btn-sm border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              >
                <GitMerge className="h-3.5 w-3.5" />
                {busy ? "Merging…" : "Merge institutions"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
