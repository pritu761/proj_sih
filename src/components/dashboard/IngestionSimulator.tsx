"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Radio,
  Inbox,
  GraduationCap,
  Globe2,
  Mail,
  ShieldAlert,
  Search,
  Building2,
  MapPin,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Siren,
  Scale,
  TimerReset,
  Lock,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { TrilayerPanel, type TrilayerView } from "@/components/alerts/TrilayerPanel";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import {
  INGESTION_CHANNELS,
  routeComplaint,
  sampleComplaint,
  type IngestionChannel,
} from "@/lib/services/ingestion-engine";
import { simulateIngestionAction } from "@/actions/ingestion-actions";

interface InstitutionOption {
  id: string;
  name: string;
  aicte_permanent_id: string;
  city: string;
  state: string;
  region: string;
  institution_type: string;
}

interface DetectedAlert {
  id: string;
  confidence: string;
  case_ids: string[];
  bureaus_involved: string[];
  trilayer?: TrilayerView;
}

interface SimulationResult {
  caseId: string;
  caseCode: string;
  institutionName: string;
  institutionCity: string;
  institutionState: string;
  aictePermanentId: string;
  channel: string;
  channelLabel: string;
  bureau: string;
  bureauLabel: string;
  routedBureau: string;
  routedBureauLabel: string;
  bureauCode: string;
  priority: string;
  slaDays: number;
  regulatory: boolean;
  rationale: string[];
  expectedDisposal: string;
  alerts: DetectedAlert[];
}

const CHANNEL_ICON = {
  CPGRAMS: Globe2,
  UGC_ESAMADHAN: GraduationCap,
  DIRECT_PORTAL: Inbox,
  EMAIL_OCR: Mail,
  VIGILANCE: Siren,
} as const;

const PROCESS_STAGES = [
  "Normalising channel payload",
  "Resolving AICTE entity & aliases",
  "Scoring entity / semantic / temporal layers",
  "Routing to bureau and starting SLA clock",
  "Scanning parallel bureau inquiries",
];

const PRIORITY_TONE: Record<string, string> = {
  CRITICAL: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  HIGH: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  MEDIUM: "border-sky-400/40 bg-sky-400/10 text-sky-300",
  LOW: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
};

const darkInput =
  "dark-surface w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-[12px] font-medium text-slate-100 outline-none transition-colors placeholder:text-slate-400 hover:border-white/20 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20";

export function IngestionSimulator({
  userRole,
  userBureau,
}: {
  userRole?: string;
  userBureau?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"FORM" | "PROCESSING" | "RESULT">("FORM");
  const [processStep, setProcessStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [institutionError, setInstitutionError] = useState("");
  const [institutionSearch, setInstitutionSearch] = useState("");

  const [channel, setChannel] = useState<IngestionChannel>("CPGRAMS");
  const [institutionId, setInstitutionId] = useState("");
  const [category, setCategory] = useState("Capitation Fee & Overcharging");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("CRITICAL");
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [result, setResult] = useState<SimulationResult | null>(null);

  const readOnly = userRole === "REGIONAL_OFFICER";
  const selectedInstitution = institutions.find((i) => i.id === institutionId);

  const routing = useMemo(
    () => routeComplaint({ category, channel }),
    [category, channel]
  );

  const filteredInstitutions = useMemo(() => {
    const q = institutionSearch.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter((i) =>
      [i.name, i.aicte_permanent_id, i.city, i.state, i.region]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [institutions, institutionSearch]);

  useEffect(() => {
    if (!open || institutions.length > 0) return;
    let cancelled = false;
    setLoadingInstitutions(true);
    setInstitutionError("");
    fetch("/api/institutions/list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load the institution registry.");
        return (await res.json()) as InstitutionOption[];
      })
      .then((data) => {
        if (cancelled) return;
        setInstitutions(data);
        if (data.length > 0) {
          setInstitutionId((current) => current || data[0].id);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setInstitutionError(
            error instanceof Error ? error.message : "Unable to load institutions."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingInstitutions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, institutions.length]);

  useEffect(() => {
    if (step !== "PROCESSING") return;
    const timer = window.setInterval(() => {
      setProcessStep((current) => Math.min(PROCESS_STAGES.length - 1, current + 1));
    }, 420);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    setPriority(routing.priority);
  }, [routing.priority]);

  const resetForm = () => {
    setErrorMsg("");
    setResult(null);
    setStep("FORM");
    setProcessStep(0);
    setDescription("");
    setReference("");
    setPriority(routing.priority);
  };

  const loadSample = () => {
    setDescription(
      sampleComplaint(
        category,
        channel,
        selectedInstitution?.name ?? "The institution"
      )
    );
    setErrorMsg("");
  };

  const handleSubmit = async () => {
    if (readOnly) {
      setErrorMsg(
        "Regional Officers are read-only observers. Demo this with AICTE HQ Admin or a bureau account."
      );
      return;
    }
    if (!institutionId) {
      setErrorMsg("Select the institution referenced in the grievance.");
      return;
    }
    if (description.trim().length < 30) {
      setErrorMsg("Describe the grievance in at least 30 characters.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    setResult(null);
    setProcessStep(0);
    setStep("PROCESSING");

    const [response] = await Promise.all([
      simulateIngestionAction({
        channel,
        aicte_permanent_id:
          selectedInstitution?.aicte_permanent_id ?? institutionId,
        category,
        description: description.trim(),
        priority,
        complainant_reference: reference.trim() || undefined,
      }),
      new Promise((resolve) => window.setTimeout(resolve, 1500)),
    ]);

    setIsSubmitting(false);

    if (!response.success) {
      setStep("FORM");
      setErrorMsg(response.error);
      return;
    }

    setResult(response as SimulationResult);
    setStep("RESULT");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setErrorMsg("");
          if (step === "RESULT") resetForm();
        }}
        className="btn btn-sm border border-amber-400/40 bg-amber-400/10 text-amber-200 hover:border-amber-300 hover:bg-amber-400/20 hover:text-amber-100"
      >
        <Radio className="h-3.5 w-3.5" />
        Simulate live grievance
        <span className="relative ml-0.5 flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-300" />
        </span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          step === "RESULT"
            ? "Live ingestion result"
            : step === "PROCESSING"
              ? "Scanning incoming grievance"
              : "Inject a live multi-channel grievance"
        }
        description={
          step === "RESULT"
            ? "The complaint is now in the single source of truth. Review the routing and collision verdict."
            : "Watch trilayer matching, bureau routing and the statutory SLA clock execute in real time."
        }
        icon={
          step === "RESULT" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : step === "PROCESSING" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Radio className="h-4 w-4" />
          )
        }
        tone={step === "RESULT" ? "emerald" : "amber"}
        size="xl"
        footer={
          step === "RESULT" ? (
            <>
              <button type="button" onClick={resetForm} className="btn btn-secondary btn-sm">
                <RotateCcw className="h-3.5 w-3.5" />
                Inject another
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-primary btn-sm">
                Close
              </button>
            </>
          ) : step === "PROCESSING" ? (
            <span className="text-[10.5px] font-semibold text-slate-500">
              Running deterministic AICTE rules — no external AI service called.
            </span>
          ) : (
            <>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || readOnly}
                className="btn btn-primary btn-sm"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Inject & scan now
              </button>
            </>
          )
        }
      >
        {step === "PROCESSING" ? (
          <div className="dark-surface rounded-2xl border border-white/10 bg-slate-950 p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
                <Radio className="h-5 w-5 text-amber-300" />
                <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-amber-400/60" />
              </div>
              <div>
                <p className="font-display text-[14px] font-bold text-white">
                  {selectedInstitution?.name ?? "Institution"} · {routing.channelLabel}
                </p>
                <p className="mt-0.5 text-[10.5px] text-slate-400">
                  {category} · deterministic pipeline executing
                </p>
              </div>
            </div>

            <ol className="mt-5 space-y-3">
              {PROCESS_STAGES.map((label, index) => {
                const done = index < processStep;
                const active = index === processStep;
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[9px] font-extrabold",
                        done
                          ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300"
                          : active
                            ? "border-amber-400/60 bg-amber-400/15 text-amber-300"
                            : "border-white/10 bg-white/[0.03] text-slate-400"
                      )}
                    >
                      {done ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-[11.5px] font-semibold",
                          done ? "text-slate-300" : active ? "text-amber-200" : "text-slate-400"
                        )}
                      >
                        {label}
                      </p>
                      {active && (
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400" />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : step === "RESULT" && result ? (
          <div className="space-y-4">
            <div className="dark-surface relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" />
                    Ingested into single source of truth
                  </p>
                  <p className="mt-1.5 font-mono text-[13px] font-bold text-white">
                    {result.caseCode}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-300">
                    {result.institutionName}
                    {result.institutionCity ? ` · ${result.institutionCity}, ${result.institutionState}` : ""}
                  </p>
                  <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">
                    AICTE {result.aictePermanentId} · {result.institutionName ? "entity resolved" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className={cn("rounded-md border px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide", PRIORITY_TONE[result.priority] ?? PRIORITY_TONE.MEDIUM)}>
                    {result.priority}
                  </span>
                  <span className="rounded-md border border-sky-400/30 bg-sky-400/10 px-2 py-1 text-[8.5px] font-extrabold uppercase tracking-wide text-sky-300">
                    {result.channelLabel}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Routed bureau", value: result.bureauLabel, icon: Scale },
                  { label: "SLA clock", value: `${result.slaDays} days`, icon: TimerReset },
                  { label: "Collisions", value: String(result.alerts.length), icon: ShieldAlert },
                  {
                    label: "Dispose by",
                    value: new Date(result.expectedDisposal).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    }),
                    icon: CheckCircle2,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                      <p className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-[0.1em] text-slate-500">
                        <Icon className="h-2.5 w-2.5" />
                        {item.label}
                      </p>
                      <p className="mt-1 truncate text-[11px] font-bold text-slate-100">{item.value}</p>
                    </div>
                  );
                })}
              </div>

              {result.routedBureau !== result.bureau && (
                <p className="mt-2.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1.5 text-[9.5px] leading-relaxed text-amber-200/80">
                  Policy destination: {result.routedBureauLabel}. Queued under {result.bureauLabel} because of
                  {userBureau && userBureau !== "ALL" ? ` the ${userBureau.replaceAll("_", " ").toLowerCase()} allocation.` : " your bureau allocation."}
                </p>
              )}

              <div className="mt-3 border-t border-white/10 pt-2.5">
                <p className="text-[8.5px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                  Routing rationale
                </p>
                <ul className="mt-1 space-y-1">
                  {result.rationale.map((line, index) => (
                    <li key={index} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
                      <ArrowRight className="mt-0.5 h-2.5 w-2.5 shrink-0 text-amber-400" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {result.alerts.length > 0 ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-rose-500/30 bg-rose-500/[0.08] p-3">
                  <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-400" />
                  <p className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-rose-200">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Potential Overlapping Cases – Coordination Required
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-rose-100/70">
                    {result.alerts.length} parallel inquir{result.alerts.length === 1 ? "y" : "ies"} detected.
                    All three matching layers are shown below with the exact evidence used.
                  </p>
                </div>

                {result.alerts.map((alert) => (
                  <div key={alert.id} className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[9.5px] text-slate-500">
                        Alert {alert.id} · {alert.confidence} confidence
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {alert.bureaus_involved.map((b) => (
                          <span key={b} className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-slate-400">
                            {b.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                    <TrilayerPanel trilayer={alert.trilayer} confidence={alert.confidence} compact />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-[11.5px] font-bold text-emerald-200">
                    No parallel inquiry detected
                  </p>
                  <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-100/60">
                    Trilayer scan completed against every open file. The grievance is the only live
                    inquiry on this institution and category.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/cases/${result.caseId}`} className="btn btn-primary btn-sm">
                Open generated case
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {result.alerts.length > 0 && (
                <Link href="/alerts?status=OPEN" className="btn btn-secondary btn-sm">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Review collision queue
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {readOnly && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] p-2.5 text-[10.5px] leading-relaxed text-amber-800">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  This account is a <strong>Regional Officer (read-only observer)</strong>. You can inspect
                  the simulator and routing rules, but registration is blocked by RBAC. Sign in as AICTE HQ
                  Admin or a bureau officer to inject the grievance.
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                <Radio className="h-3 w-3 text-amber-500" />
                1 · Inbound channel
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {INGESTION_CHANNELS.map((item) => {
                  const Icon = CHANNEL_ICON[item.key];
                  const active = channel === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setChannel(item.key)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-all",
                        active
                          ? "border-amber-400/50 bg-amber-400/[0.08] shadow-[0_0_0_1px_rgba(251,191,36,0.15)]"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <Icon
                          className="h-3.5 w-3.5"
                          style={{ color: active ? item.accent : "#64748b" }}
                        />
                        <span className="font-mono text-[8px] font-bold text-slate-400">
                          {item.short}
                        </span>
                      </div>
                      <p className={cn("mt-1.5 text-[10.5px] font-bold", active ? "text-slate-900" : "text-slate-400")}>
                        {item.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[8.5px] leading-snug text-slate-500">
                        {item.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="ingest-institution" className="mb-1.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Building2 className="h-3 w-3 text-amber-500" />
                  2 · Institution
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    value={institutionSearch}
                    onChange={(e) => setInstitutionSearch(e.target.value)}
                    placeholder="Search name, AICTE ID, city…"
                    className={cn(darkInput, "mb-1.5 pl-8")}
                    aria-label="Filter institutions"
                  />
                </div>
                <select
                  id="ingest-institution"
                  value={institutionId}
                  onChange={(e) => setInstitutionId(e.target.value)}
                  className={darkInput}
                  disabled={loadingInstitutions}
                >
                  {loadingInstitutions && <option value="">Loading registry…</option>}
                  {!loadingInstitutions && filteredInstitutions.length === 0 && (
                    <option value="">No institution matches the filter</option>
                  )}
                  {filteredInstitutions.map((institution) => (
                    <option key={institution.id} value={institution.id}>
                      {institution.name} · {institution.aicte_permanent_id}
                    </option>
                  ))}
                </select>
                {institutionError && (
                  <p className="mt-1 text-[10px] font-medium text-rose-700">{institutionError}</p>
                )}
                {selectedInstitution && (
                  <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="flex items-center gap-1 text-[9.5px] font-semibold text-slate-700">
                      <MapPin className="h-2.5 w-2.5 text-slate-500" />
                      {selectedInstitution.city}, {selectedInstitution.state} · {selectedInstitution.region} RO
                    </p>
                    <p className="mt-0.5 font-mono text-[8.5px] text-slate-500">
                      AICTE {selectedInstitution.aicte_permanent_id} · {selectedInstitution.institution_type}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="ingest-category" className="mb-1.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Scale className="h-3 w-3 text-amber-500" />
                  3 · Grievance category & priority
                </label>
                <select
                  id="ingest-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={darkInput}
                >
                  {SLA_CONFIGS.map((config) => (
                    <option key={config.category} value={config.category}>
                      {config.category} · {config.timeline_days}d SLA
                    </option>
                  ))}
                </select>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="ingest-priority" className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Priority
                    </label>
                    <select
                      id="ingest-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as typeof priority)}
                      className={darkInput}
                    >
                      {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ingest-reference" className="mb-1 block text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      Source reference
                    </label>
                    <input
                      id="ingest-reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. CPGRAMS/UP/2026/9941"
                      className={darkInput}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="ingest-description" className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Mail className="h-3 w-3 text-amber-500" />
                  4 · Representation text
                </label>
                <button
                  type="button"
                  onClick={loadSample}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-700 transition-colors hover:border-amber-400/60 hover:text-amber-700 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-amber-400/40 dark:hover:text-amber-300"
                >
                  <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                  Load realistic sample
                </button>
              </div>
              <textarea
                id="ingest-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Paste the complaint text or OCR output. The semantic layer scores this against every open representation."
                className={darkInput}
              />
              <p className="mt-1 text-[9.5px] text-slate-500">
                {description.trim().length} characters · minimum 30 · stored in the immutable case trail.
              </p>
            </div>

            <div className="dark-surface rounded-xl border border-white/10 bg-slate-950 p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                  <Siren className="h-3 w-3 text-amber-400" />
                  Live routing decision
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded border border-sky-400/30 bg-sky-400/10 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-sky-300">
                    {routing.bureauCode} · {routing.bureau.replaceAll("_", " ")}
                  </span>
                  <span className="rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-amber-300">
                    {routing.slaDays}d SLA
                  </span>
                  <span className={cn("rounded border px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase", PRIORITY_TONE[routing.priority])}>
                    {routing.priority}
                  </span>
                  {routing.regulatory && (
                    <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase text-rose-300">
                      APH hook
                    </span>
                  )}
                </div>
              </div>
              <ul className="mt-2 space-y-1">
                {routing.rationale.map((line, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
                    <ArrowRight className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-400" />
                    {line}
                  </li>
                ))}
              </ul>
            </div>

            {errorMsg && (
              <p
                role="alert"
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[10.5px] font-medium text-rose-700"
              >
                {errorMsg}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
