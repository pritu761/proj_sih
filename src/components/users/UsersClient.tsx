"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UsersRound,
  UserPlus,
  ShieldCheck,
  Ban,
  KeyRound,
  Building2,
  MapPin,
  ClipboardList,
  Pencil,
  Mail,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { BureauPill } from "@/components/ui/badges";
import {
  createUserAction,
  updateUserAction,
  resetUserPasswordAction,
} from "@/actions/user-actions";
import { SessionUser, Role, Bureau } from "@/lib/rbac";
import { formatDate, cn } from "@/lib/utils";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  bureau: string;
  region: string | null;
  designation: string;
  active: boolean;
  createdAt: Date | string;
  openCases: number;
}

interface UsersClientProps {
  initialUsers: ManagedUser[];
  currentUser: SessionUser;
}

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "ADMIN", label: "System Administrator" },
  { value: "COMPETENT_AUTHORITY", label: "Competent Authority" },
  { value: "REGULATION_OFFICER", label: "Regulation Bureau Officer" },
  { value: "PGRC_OFFICER", label: "PGRC Officer" },
  { value: "BUREAU_OFFICER", label: "Bureau Officer (Approval / Skill)" },
  { value: "REGIONAL_OFFICER", label: "Regional Officer" },
];

const BUREAU_OPTIONS: { value: Bureau; label: string }[] = [
  { value: "REGULATION_BUREAU", label: "Regulation Bureau" },
  { value: "PGRC", label: "Public Grievance Redressal Cell" },
  { value: "APPROVAL_BUREAU", label: "Approval Bureau" },
  { value: "SKILL_CELL", label: "Skill Development Cell" },
  { value: "ALL", label: "Cross-bureau / Administration" },
];

const REGIONS = ["Northern", "Western", "Southern", "Eastern", "Central"];

const roleBadge: Record<string, string> = {
  ADMIN: "bg-ink-900 text-white border-ink-900",
  COMPETENT_AUTHORITY: "bg-saffron-100 text-amber-800 border-saffron-200",
  REGULATION_OFFICER: "bg-indigo-100 text-indigo-700 border-indigo-200",
  PGRC_OFFICER: "bg-sky-100 text-sky-700 border-sky-200",
  BUREAU_OFFICER: "bg-amber-100 text-amber-800 border-amber-200",
  REGIONAL_OFFICER: "bg-teal-100 text-teal-800 border-teal-200",
};

const roleShort: Record<string, string> = {
  ADMIN: "Admin",
  COMPETENT_AUTHORITY: "Authority",
  REGULATION_OFFICER: "RB",
  PGRC_OFFICER: "PGRC",
  BUREAU_OFFICER: "Bureau",
  REGIONAL_OFFICER: "RO",
};

/** Bureau options the given role is allowed to hold. */
function bureausForRole(role: string): Bureau[] {
  if (role === "ADMIN" || role === "COMPETENT_AUTHORITY") return ["ALL"];
  if (role === "REGIONAL_OFFICER") return ["ALL"];
  if (role === "REGULATION_OFFICER") return ["REGULATION_BUREAU"];
  if (role === "PGRC_OFFICER") return ["PGRC"];
  return ["APPROVAL_BUREAU", "SKILL_CELL"];
}

export function UsersClient({ initialUsers, currentUser }: UsersClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [users, setUsers] = useState<ManagedUser[]>(initialUsers);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ManagedUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);

  // Create form
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "BUREAU_OFFICER" as Role,
    bureau: "APPROVAL_BUREAU" as Bureau,
    region: "",
    designation: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit / password forms
  const [editForm, setEditForm] = useState({
    role: "BUREAU_OFFICER" as Role,
    bureau: "APPROVAL_BUREAU" as Bureau,
    region: "",
    designation: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const stats = useMemo(
    () => [
      { label: "Registered accounts", value: users.length },
      {
        label: "Active",
        value: users.filter((u) => u.active).length,
      },
      {
        label: "Officers holding open files",
        value: users.filter((u) => u.active && u.openCases > 0).length,
      },
      {
        label: "Regional officers",
        value: users.filter((u) => u.role === "REGIONAL_OFFICER").length,
      },
    ],
    [users]
  );

  const allowedBureaus = bureausForRole(form.role);
  const bureauValue = allowedBureaus.includes(form.bureau)
    ? form.bureau
    : allowedBureaus[0];

  const openCreate = () => {
    setForm({
      name: "",
      email: "",
      password: "",
      role: "BUREAU_OFFICER",
      bureau: "APPROVAL_BUREAU",
      region: "",
      designation: "",
    });
    setFormError("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setFormError("");
    const res = await createUserAction({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      bureau: bureauValue,
      region: form.role === "REGIONAL_OFFICER" && form.region ? form.region : null,
      designation: form.designation || null,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setFormError(res.error || "Could not create the account.");
      return;
    }
    setCreateOpen(false);
    toast.success("Account created", `${form.name} can now sign in with the issued password.`);
    router.refresh();
  };

  const openEdit = (u: ManagedUser) => {
    setEditTarget(u);
    setEditForm({
      role: u.role as Role,
      bureau: u.bureau as Bureau,
      region: u.region ?? "",
      designation: u.designation,
    });
    setActionError("");
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setIsSubmitting(true);
    setActionError("");
    const res = await updateUserAction({
      userId: editTarget.id,
      role: editForm.role,
      bureau: bureausForRole(editForm.role).includes(editForm.bureau)
        ? editForm.bureau
        : bureausForRole(editForm.role)[0],
      region: editForm.role === "REGIONAL_OFFICER" && editForm.region ? editForm.region : null,
      designation: editForm.designation || null,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setActionError(res.error || "Could not update the account.");
      return;
    }
    setEditTarget(null);
    toast.success("Account updated", `${editTarget.name}'s postings were saved.`);
    router.refresh();
  };

  const toggleActive = async (u: ManagedUser) => {
    setBusyUserId(u.id);
    const res = await updateUserAction({ userId: u.id, active: !u.active });
    setBusyUserId(null);
    if (!res.success) {
      toast.error("Could not update status", res.error || "Please try again.");
      return;
    }
    toast.info(
      u.active ? "Account deactivated" : "Account activated",
      u.active
        ? `${u.name} can no longer sign in. Their queue is retained.`
        : `${u.name} may sign in again with the existing password.`
    );
    router.refresh();
  };

  const handleResetPassword = async () => {
    if (!passwordTarget) return;
    setIsSubmitting(true);
    setActionError("");
    const res = await resetUserPasswordAction({
      userId: passwordTarget.id,
      password: newPassword,
    });
    setIsSubmitting(false);
    if (!res.success) {
      setActionError(res.error || "Could not reset the password.");
      return;
    }
    setPasswordTarget(null);
    setNewPassword("");
    toast.success("Password reset", `Share the new password with ${passwordTarget.name} over an offline channel.`);
    router.refresh();
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Administration"
        title="Team & Access Management"
        description="Register officers, post them to bureaus or regional offices, and suspend access — every change is audit-logged."
        icon={UsersRound}
        actions={
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            <UserPlus className="h-3.5 w-3.5" />
            Register officer
          </button>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel px-4 py-3.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">{s.label}</p>
            <p className="mt-1.5 font-display text-[20px] font-extrabold leading-none text-slate-900">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Directory */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
              Registered officers & administrators
            </h2>
            <p className="panel-sub">
              Passwords are bcrypt-hashed; the demo logins below are pre-seeded for evaluation
            </p>
          </div>
          <span className="badge border-slate-200 bg-slate-50 text-slate-600">{users.length} accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                <th className="px-5 py-2.5">Officer</th>
                <th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Posting</th>
                <th className="px-3 py-2.5">Open files</th>
                <th className="px-3 py-2.5">Registered</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((u) => (
                <tr key={u.id} className={cn("group", !u.active && "opacity-60")}>
                  <td className="px-5 py-3">
                    <p className="text-[11.5px] font-bold text-slate-900">
                      {u.name}
                      {u.email === currentUser.email && (
                        <span className="ml-1.5 text-[9px] font-semibold text-slate-400">(you)</span>
                      )}
                    </p>
                    <p className="inline-flex items-center gap-1 font-mono text-[9.5px] text-slate-400">
                      <Mail className="h-2.5 w-2.5" />
                      {u.email}
                    </p>
                    {u.designation && (
                      <p className="mt-0.5 text-[9.5px] text-slate-500">{u.designation}</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
                        roleBadge[u.role]
                      )}
                    >
                      {roleShort[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <BureauPill bureau={u.bureau} />
                      {u.role === "REGIONAL_OFFICER" && u.region && (
                        <span className="inline-flex items-center gap-1 text-[9.5px] font-bold text-teal-700">
                          <MapPin className="h-2.5 w-2.5" />
                          {u.region} region
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                      <ClipboardList className="h-3 w-3 text-slate-400" />
                      {u.openCases}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[10.5px] text-slate-500">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-3 py-3">
                    {u.active ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">
                        <ShieldCheck className="h-2.5 w-2.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-slate-500">
                        <Ban className="h-2.5 w-2.5" /> Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => openEdit(u)}
                        className="btn btn-secondary btn-sm"
                        title="Edit posting"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setPasswordTarget(u);
                          setNewPassword("");
                          setActionError("");
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <KeyRound className="h-3 w-3" />
                        Reset
                      </button>
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={busyUserId === u.id}
                        className={cn(
                          "btn btn-sm",
                          u.active
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "btn btn-success"
                        )}
                      >
                        {u.active ? (
                          <>
                            <Ban className="h-3 w-3" /> Suspend
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-3 w-3" /> Activate
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Register a new officer"
        description="The account is active immediately and appears in every assignment roster."
        icon={<UserPlus className="h-4 w-4" />}
        tone="blue"
        footer={
          <>
            <button onClick={() => setCreateOpen(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={
                isSubmitting ||
                form.name.trim().length < 3 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
                form.password.length < 8
              }
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? "Creating…" : "Create account"}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label htmlFor="u-name" className="field-label">
              Full name <span className="text-rose-600">*</span>
            </label>
            <input
              id="u-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Dr. Asha Krishnan"
              className="input"
            />
          </div>
          <div>
            <label htmlFor="u-email" className="field-label">
              Official email <span className="text-rose-600">*</span>
            </label>
            <input
              id="u-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="officer@aicte.gov.in"
              className="input font-mono"
            />
          </div>
          <div>
            <label htmlFor="u-password" className="field-label">
              Initial password <span className="text-rose-600">*</span>
            </label>
            <input
              id="u-password"
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Minimum 8 chars, letter + number/symbol"
              className="input font-mono"
            />
            <p className="field-hint">
              Stored bcrypt-hashed. Share it over an offline channel and force a rotation later.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="u-role" className="field-label">
                Role <span className="text-rose-600">*</span>
              </label>
              <select
                id="u-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="input"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="u-bureau" className="field-label">
                Posting <span className="text-rose-600">*</span>
              </label>
              <select
                id="u-bureau"
                value={bureauValue}
                onChange={(e) => setForm({ ...form, bureau: e.target.value as Bureau })}
                className="input"
                disabled={allowedBureaus.length === 1}
              >
                {allowedBureaus.map((b) => {
                  const opt = BUREAU_OPTIONS.find((o) => o.value === b);
                  return (
                    <option key={b} value={b}>
                      {opt?.label ?? b}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          {form.role === "REGIONAL_OFFICER" && (
            <div>
              <label htmlFor="u-region" className="field-label">
                Regional office <span className="text-rose-600">*</span>
              </label>
              <select
                id="u-region"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
              >
                <option value="">Select region…</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="u-designation" className="field-label">
              Designation <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="u-designation"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g. Deputy Director (Approval Bureau)"
              className="input"
            />
          </div>

          {formError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {formError}
            </p>
          )}
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit officer posting"
        description={editTarget?.name}
        icon={<Building2 className="h-4 w-4" />}
        tone="violet"
        footer={
          <>
            <button onClick={() => setEditTarget(null)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={handleUpdate} disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? "Saving…" : "Save posting"}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label htmlFor="e-role" className="field-label">
              Role
            </label>
            <select
              id="e-role"
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
              className="input"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="e-bureau" className="field-label">
              Posting
            </label>
            <select
              id="e-bureau"
              value={bureausForRole(editForm.role).includes(editForm.bureau)
                ? editForm.bureau
                : bureausForRole(editForm.role)[0]}
              onChange={(e) => setEditForm({ ...editForm, bureau: e.target.value as Bureau })}
              className="input"
              disabled={bureausForRole(editForm.role).length === 1}
            >
              {bureausForRole(editForm.role).map((b) => {
                const opt = BUREAU_OPTIONS.find((o) => o.value === b);
                return (
                  <option key={b} value={b}>
                    {opt?.label ?? b}
                  </option>
                );
              })}
            </select>
          </div>
          {editForm.role === "REGIONAL_OFFICER" && (
            <div>
              <label htmlFor="e-region" className="field-label">
                Regional office
              </label>
              <select
                id="e-region"
                value={editForm.region}
                onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                className="input"
              >
                <option value="">Unrestricted (all regions)</option>
                {REGIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="e-designation" className="field-label">
              Designation
            </label>
            <input
              id="e-designation"
              value={editForm.designation}
              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              className="input"
            />
          </div>

          <p className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-[10.5px] leading-relaxed text-slate-500">
            Role changes apply to the next sign-in session. The last active administrator can never
            be demoted or suspended.
          </p>

          {actionError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {actionError}
            </p>
          )}
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal
        open={Boolean(passwordTarget)}
        onClose={() => setPasswordTarget(null)}
        title="Reset password"
        description={passwordTarget?.email}
        icon={<KeyRound className="h-4 w-4" />}
        tone="amber"
        footer={
          <>
            <button onClick={() => setPasswordTarget(null)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={handleResetPassword}
              disabled={isSubmitting || newPassword.length < 8}
              className="btn btn-primary btn-sm"
            >
              {isSubmitting ? "Resetting…" : "Reset password"}
            </button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div>
            <label htmlFor="r-password" className="field-label">
              New password <span className="text-rose-600">*</span>
            </label>
            <input
              id="r-password"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 chars, letter + number/symbol"
              className="input font-mono"
            />
            <p className="field-hint">
              The existing sessions of the officer stay valid until they re-authenticate.
            </p>
          </div>

          {actionError && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
              {actionError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
