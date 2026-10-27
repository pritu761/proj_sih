"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  ShieldAlert,
  ScanLine,
  Network,
  CheckCircle2,
  Sparkles,
  MapPin,
  Timer,
  CircleDot,
  Layers,
  Info,
} from "lucide-react";
import { createCaseAction } from "@/actions/case-actions";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { Breadcrumbs } from "@/components/ui/page-header";
import { BureauPill, PriorityPill, SlaPill } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

const bureaus = [
  { value: "REGULATION_BUREAU", label: "Regulation Bureau (RB)", note: "Statutory compliance, fees, approvals" },
  { value: "PGRC", label: "Public Grievance Redressal Cell (PGRC)", note: "Student & public grievances" },
  { value: "APPROVAL_BUREAU", label: "Approval Bureau (AB)", note: "Approvals, extensions, EVC" },
  { value: "SKILL_CELL", label: "Skill Development Cell (SDC)", note: "Skill, vocational & internship matters" },
];

const sources = [
  { value: "student", label: "Student / Parent" },
  { value: "faculty", label: "Faculty / Staff" },
  { value: "stakeholder", label: "Institution Stakeholder / Trust" },
  { value: "public", label: "General Public / Suo-Motu" },
  { value: "other", label: "Government / Legal Referral" },
];

const priorities = [
  { value: "LOW", label: "Low", note: "Routine" },
  { value: "MEDIUM", label: "Medium", note: "Standard" },
  { value: "HIGH", label: "High", note: "Priority" },
  { value: "CRITICAL", label: "Critical", note: "Immediate EVC / hearing" },
];

const scanSteps = [
  {
    icon: Building2,
    title: "Institution identity match",
    text: "AICTE permanent ID plus normalised name, city, and pincode fingerprint.",
  },
  {
    icon: Network,
    title: "Cross-bureau collision check",
    text: "Every open case across RB, PGRC, AB, and SDC is compared for parallel jurisdiction.",
  },
  {
    icon: Layers,
    title: "Category & narrative similarity",
    text: "Complaint category, description tokens, and source are scored for duplication.",
  },
];

export default function NewCasePage() {
  const router = useRouter();

  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [source, setSource] = useState<any>("student");
  const [category, setCategory] = useState(SLA_CONFIGS[2].category);
  const [assignedBureau, setAssignedBureau] = useState<any>("REGULATION_BUREAU");
  const [priority, setPriority] = useState<any>("HIGH");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  useEffect(() => {
    fetch("/api/institutions/list")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setInstitutions(data);
          if (data.length > 0) setSelectedInstId(data[0].aicte_permanent_id);
        }
      })
      .catch((err) => console.debug("Institution list fetch tick.", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstId) {
      setErrorMsg("Please select an institution.");
      return;
    }
    if (description.length < 15) {
      setErrorMsg("Description must be at least 15 characters long.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await createCaseAction({
        aicte_permanent_id: selectedInstId,
        source,
        category,
        description,
        assigned_bureau: assignedBureau,
        priority,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to create case.");
        setIsSubmitting(false);
      } else {
        router.push(`/cases/${res.caseId}`);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Case registration failed.");
      setIsSubmitting(false);
    }
  };

  const slaConfig = useMemo(
    () => SLA_CONFIGS.find((c) => c.category === category) ?? SLA_CONFIGS[0],
    [category]
  );

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.aicte_permanent_id === selectedInstId),
    [institutions, selectedInstId]
  );

  const deadline = useMemo(() => {
    if (!today) return null;
    const d = new Date(today);
    d.setDate(d.getDate() + slaConfig.timeline_days);
    return d;
  }, [today, slaConfig.timeline_days]);

  const selectedBureauMeta = bureaus.find((b) => b.value === assignedBureau);

  const checks = [
    { label: "Institution selected", done: Boolean(selectedInstId) },
    { label: "Category & SLA assigned", done: Boolean(category) },
    { label: "Bureau allocation confirmed", done: Boolean(assignedBureau) },
    { label: "Narrative at least 15 characters", done: description.trim().length >= 15 },
  ];
  const completed = checks.filter((c) => c.done).length;

  return (
    <div className="space-y-5">
      <Breadcrumbs
        items={[
          { label: "Case Explorer", href: "/cases" },
          { label: "Register new grievance" },
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-saffron-200 bg-gradient-to-br from-saffron-100 to-saffron-50 text-saffron-600 shadow-sm sm:flex">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="eyebrow mb-1 text-saffron-600">Registry intake</p>
            <h1 className="font-display text-[25px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[28px]">
              Register a new institutional complaint
            </h1>
            <p className="mt-1.5 max-w-2xl text-[12.5px] font-medium leading-relaxed text-slate-500">
              The cross-bureau overlap engine evaluates every submission for duplicate or parallel
              jurisdiction cases before it enters the registry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500">
            <CircleDot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
              Intake progress
            </p>
            <p className="text-[12px] font-extrabold text-slate-900">
              {completed} of {checks.length} ready
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Form */}
        <div className="xl:col-span-2">
          <form onSubmit={handleSubmit} className="panel overflow-hidden">
            <div className="rail-top" />

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 border-b border-rose-100 bg-rose-50 px-5 py-3 text-[11.5px] font-medium text-rose-700 animate-slide-down"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-6 p-5 sm:p-6">
              {/* Step 1 */}
              <section>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-[10px] font-extrabold text-white">
                    1
                  </span>
                  <div>
                    <h2 className="font-display text-[13px] font-bold text-slate-900">
                      Institution & jurisdiction
                    </h2>
                    <p className="text-[10.5px] text-slate-400">
                      Identify the AICTE-approved institution and the owning bureau
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label htmlFor="institution" className="field-label">
                      Institution <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <select
                        id="institution"
                        value={selectedInstId}
                        onChange={(e) => setSelectedInstId(e.target.value)}
                        required
                        className="input h-11 pl-10"
                      >
                        {institutions.length === 0 ? (
                          <option value="1-1029384751">
                            Apex Institute of Engineering & Technology (1-1029384751)
                          </option>
                        ) : (
                          institutions.map((i) => (
                            <option key={i.id} value={i.aicte_permanent_id}>
                              {i.name} — {i.city}, {i.state} (ID: {i.aicte_permanent_id})
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                    {selectedInstitution && (
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-slate-400" />
                          {selectedInstitution.city}, {selectedInstitution.state}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span>{selectedInstitution.region} region</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-semibold text-slate-600">
                          {selectedInstitution.institution_type}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <div>
                      <label htmlFor="bureau" className="field-label">
                        Allocating bureau / cell <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="bureau"
                        value={assignedBureau}
                        onChange={(e) => setAssignedBureau(e.target.value as any)}
                        className="input"
                      >
                        {bureaus.map((b) => (
                          <option key={b.value} value={b.value}>
                            {b.label}
                          </option>
                        ))}
                      </select>
                      <p className="field-hint">{selectedBureauMeta?.note}</p>
                    </div>

                    <div>
                      <label htmlFor="source" className="field-label">
                        Grievance source <span className="text-rose-600">*</span>
                      </label>
                      <select
                        id="source"
                        value={source}
                        onChange={(e) => setSource(e.target.value as any)}
                        className="input"
                      >
                        {sources.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <p className="field-hint">Used for routing and audit attribution.</p>
                    </div>
                  </div>
                </div>
              </section>

              <div className="hairline" />

              {/* Step 2 */}
              <section>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-[10px] font-extrabold text-white">
                    2
                  </span>
                  <div>
                    <h2 className="font-display text-[13px] font-bold text-slate-900">
                      Classification & priority
                    </h2>
                    <p className="text-[10.5px] text-slate-400">
                      Category drives the statutory SLA timeline
                    </p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label htmlFor="category" className="field-label">
                      Complaint category <span className="text-rose-600">*</span>
                    </label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="input"
                    >
                      {SLA_CONFIGS.map((c) => (
                        <option key={c.category} value={c.category}>
                          {c.category} — SLA {c.timeline_days} days
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="field-label">Initial priority</span>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {priorities.map((p) => {
                        const active = priority === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => setPriority(p.value)}
                            aria-pressed={active}
                            className={cn(
                              "rounded-xl border px-3 py-2.5 text-left transition-all",
                              active
                                ? "border-brand-400 bg-brand-50 shadow-[0_0_0_3px_rgba(59,118,246,0.1)]"
                                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                            )}
                          >
                            <span
                              className={cn(
                                "block text-[11px] font-extrabold",
                                active ? "text-brand-800" : "text-slate-700"
                              )}
                            >
                              {p.label}
                            </span>
                            <span className="mt-0.5 block text-[9px] text-slate-400">{p.note}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <div className="hairline" />

              {/* Step 3 */}
              <section>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-[10px] font-extrabold text-white">
                    3
                  </span>
                  <div>
                    <h2 className="font-display text-[13px] font-bold text-slate-900">
                      Grievance representation
                    </h2>
                    <p className="text-[10.5px] text-slate-400">
                      Factual particulars as received — at least 15 characters
                    </p>
                  </div>
                </div>

                <label htmlFor="description" className="sr-only">
                  Grievance representation and factual particulars
                </label>
                <textarea
                  id="description"
                  rows={6}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the alleged violations, affected semesters, fee amounts, or non-compliance observed…"
                  className="input"
                />
                <div className="mt-1.5 flex items-center justify-between">
                  <p className="field-hint mt-0">
                    Do not include personal phone numbers or bank details.
                  </p>
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
                      description.trim().length >= 15 ? "text-emerald-600" : "text-slate-400"
                    )}
                  >
                    {description.trim().length}/15 min
                  </span>
                </div>
              </section>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <Link href="/cases" className="btn btn-ghost btn-sm text-slate-500">
                Cancel
              </Link>

              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <p className="hidden text-[10px] font-medium text-slate-400 sm:block">
                  Overlap scan runs on submit
                </p>
                <button
                  type="submit"
                  disabled={isSubmitting || description.length < 15}
                  className="btn btn-primary"
                >
                  {isSubmitting ? (
                    <>
                      <ScanLine className="h-4 w-4 animate-pulse" />
                      Scanning overlaps & registering…
                    </>
                  ) : (
                    <>
                      Submit to registry
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Live preview rail */}
        <div className="space-y-4">
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <div>
                <h2 className="panel-title flex items-center gap-2">
                  <Timer className="h-3.5 w-3.5 text-brand-600" />
                  Live SLA projection
                </h2>
                <p className="panel-sub">Calculated from the selected category</p>
              </div>
            </div>

            <div className="p-4">
              <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                      Statutory timeline
                    </p>
                    <p className="mt-1 font-display text-[30px] font-extrabold leading-none tracking-tight text-slate-950">
                      {slaConfig.timeline_days}
                      <span className="ml-1 text-[13px] font-bold text-slate-400">days</span>
                    </p>
                  </div>
                  <SlaPill>Within timeline</SlaPill>
                </div>

                <div className="mt-3.5 space-y-2 border-t border-slate-200/80 pt-3 text-[10.5px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-slate-500">Category</span>
                    <span className="text-right font-bold leading-snug text-slate-800">
                      {category}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-slate-500">
                      <CalendarClock className="h-3 w-3 text-slate-400" />
                      Expected disposal
                    </span>
                    <span className="font-bold text-slate-800">
                      {deadline
                        ? deadline.toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Warning at</span>
                    <span className="font-bold text-amber-600">
                      {slaConfig.warning_threshold_percent}% elapsed
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <BureauPill bureau={assignedBureau} full />
                <PriorityPill priority={priority} />
              </div>
            </div>
          </div>

          {/* Overlap scan */}
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <div>
                <h2 className="panel-title flex items-center gap-2">
                  <ScanLine className="h-3.5 w-3.5 text-saffron-600" />
                  Overlap scan
                </h2>
                <p className="panel-sub">Runs automatically on submission</p>
              </div>
              <span className="badge border-emerald-200 bg-emerald-50 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
              </span>
            </div>

            <div className="space-y-3 p-4">
              {scanSteps.map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">{s.title}</p>
                      <p className="mt-0.5 text-[10px] leading-relaxed text-slate-400">{s.text}</p>
                    </div>
                  </div>
                );
              })}

              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <p className="text-[10px] leading-relaxed text-amber-800">
                  If a collision is detected, a{" "}
                  <strong>“Potential Overlapping Cases – Coordination Required”</strong> alert is raised
                  for both bureaus.
                </p>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="panel p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="panel-title">Readiness</h2>
              <span className="text-[10px] font-bold text-slate-400">
                {completed}/{checks.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {checks.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-2 text-[10.5px]"
                >
                  {c.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-slate-300" />
                  )}
                  <span className={cn(c.done ? "font-medium text-slate-600" : "text-slate-400")}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${(completed / checks.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[10px] leading-relaxed text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p>
              Registration writes to the audit ledger with your officer identity.{" "}
              <span className="inline-flex items-center gap-0.5 font-semibold text-slate-600">
                <Sparkles className="h-2.5 w-2.5" /> Demo environment
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
