"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Gavel,
  CalendarPlus,
  Flame,
  Building2,
  MapPin,
  Clock,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  HelpCircle,
  FileCheck2,
  FileWarning,
  Scale,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatusPill, PriorityPill, BureauPill } from "@/components/ui/badges";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { scheduleHearingAction } from "@/actions/case-actions";
import { aiHearingBriefAction } from "@/actions/ai-actions";
import { canActOnCase, SessionUser } from "@/lib/rbac";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

export interface HearingItem {
  id: string;
  case_id: string;
  internal_id: string;
  category: string;
  status: string;
  priority: string;
  assigned_bureau: string;
  institution_name: string;
  city: string;
  state: string;
  region: string;
  sla_status: {
    isBreached: boolean;
    isApproaching: boolean;
    remainingDays: number;
    statusText: string;
  };
  hearing_date: Date | string;
  daysUntil: number;
  isPast: boolean;
  isThisWeek: boolean;
}

interface HearingCalendarClientProps {
  hearings: HearingItem[];
  currentUser: SessionUser;
}

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function HearingCalendarClient({ hearings, currentUser }: HearingCalendarClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [rescheduleTarget, setRescheduleTarget] = useState<HearingItem | null>(null);
  const [hearingInput, setHearingInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Hearing-prep brief state
  const [briefTarget, setBriefTarget] = useState<HearingItem | null>(null);
  const [brief, setBrief] = useState<any>(null);
  const [isBriefing, setIsBriefing] = useState(false);
  const [briefError, setBriefError] = useState("");

  const groups = useMemo(() => {
    const overdue = hearings.filter((h) => h.isPast);
    const thisWeek = hearings.filter((h) => !h.isPast && h.isThisWeek);
    const later = hearings.filter((h) => !h.isPast && !h.isThisWeek);
    return { overdue, thisWeek, later };
  }, [hearings]);

  const regionNote =
    currentUser.role === "REGIONAL_OFFICER" && currentUser.region
      ? `Scoped to the ${currentUser.region} region`
      : null;

  const openReschedule = (h: HearingItem) => {
    setRescheduleTarget(h);
    setHearingInput(new Date(h.hearing_date).toISOString().slice(0, 16));
    setError("");
  };

  const confirmReschedule = async () => {
    if (!rescheduleTarget || !hearingInput) return;
    setIsSaving(true);
    setError("");
    const res = await scheduleHearingAction({
      caseId: rescheduleTarget.internal_id,
      hearingDate: hearingInput,
    });
    setIsSaving(false);
    if (!res.success) {
      setError(res.error || "Failed to reschedule the hearing.");
      return;
    }
    setRescheduleTarget(null);
    toast.success("Hearing updated", `${rescheduleTarget.case_id}`);
    router.refresh();
  };

  const openBrief = async (h: HearingItem) => {
    setBriefTarget(h);
    setBrief(null);
    setBriefError("");
    setIsBriefing(true);
    try {
      const res = await aiHearingBriefAction({ caseId: h.internal_id });
      if (res.disabled) {
        setBriefError(res.error || "AI features are not configured. Set GROQ_API_KEY.");
      } else if (!res.success) {
        setBriefError(res.error || "Failed to generate the brief.");
      } else {
        setBrief(res.data);
      }
    } catch (err: any) {
      setBriefError(err?.message || "Failed to generate the brief.");
    } finally {
      setIsBriefing(false);
    }
  };

  const BriefSection = ({
    icon: Icon,
    title,
    items,
    tone,
  }: {
    icon: typeof ClipboardList;
    title: string;
    items: string[];
    tone: string;
  }) =>
    items?.length ? (
      <div>
        <p className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em]", tone)}>
          <Icon className="h-3 w-3" />
          {title}
        </p>
        <ul className="mt-1.5 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-relaxed text-slate-600">
              <span className={cn("mt-1.5 h-1 w-1 shrink-0 rounded-full", tone.replace("text-", "bg-"))} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    ) : null;

  const renderHearing = (h: HearingItem) => {
    const date = new Date(h.hearing_date);
    const canReschedule =
      !h.isPast && h.status !== "DISPOSED" && canActOnCase(currentUser, { assigned_bureau: h.assigned_bureau });

    return (
      <div
        key={h.id}
        className={cn(
          "flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center",
          h.isPast
            ? "border-slate-200 bg-slate-50/70 opacity-75"
            : h.sla_status.isBreached
              ? "border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-white"
              : "border-slate-200 bg-white"
        )}
      >
        {/* Date block */}
        <div
          className={cn(
            "flex shrink-0 items-center gap-2.5 rounded-xl border p-2.5 sm:w-[104px] sm:flex-col sm:gap-0",
            h.isPast
              ? "border-slate-200 bg-slate-100"
              : h.isThisWeek
                ? "border-fuchsia-200 bg-fuchsia-50"
                : "border-brand-200 bg-brand-50"
          )}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-widest text-slate-500">
            {WEEKDAY[date.getDay()]}
          </span>
          <span className="font-display text-[22px] font-extrabold leading-none text-slate-900">
            {date.getDate()}
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">
            {date.toLocaleDateString("en-IN", { month: "short" })} ·{" "}
            {date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>

        {/* Case info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/cases/${h.internal_id}`}
              className="font-mono text-[11px] font-bold text-brand-700 hover:underline"
            >
              {h.case_id}
            </Link>
            <StatusPill status={h.status} />
            <PriorityPill priority={h.priority} />
            {h.sla_status.isBreached && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-rose-700">
                <Flame className="h-2.5 w-2.5" /> SLA breached
              </span>
            )}
            {h.isPast && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-slate-600">
                <AlertTriangle className="h-2.5 w-2.5" /> Past sitting
              </span>
            )}
            {!h.isPast && h.isThisWeek && (
              <span className="inline-flex items-center gap-1 rounded-full bg-fuchsia-100 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-fuchsia-700">
                <Clock className="h-2.5 w-2.5" /> In {h.daysUntil === 0 ? "today" : `${h.daysUntil}d`}
              </span>
            )}
          </div>

          <p className="mt-1 text-[12.5px] font-bold leading-snug text-slate-900">{h.category}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10.5px] text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3 text-slate-400" />
              {h.institution_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              {h.city}, {h.state}
            </span>
          </p>
          <p className="mt-1.5 flex items-center gap-2">
            <BureauPill bureau={h.assigned_bureau} />
            <span
              className={cn(
                "text-[10.5px] font-semibold",
                h.sla_status.isBreached
                  ? "text-rose-700"
                  : h.sla_status.isApproaching
                    ? "text-amber-700"
                    : "text-emerald-700"
              )}
            >
              {h.sla_status.statusText}
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col gap-2 sm:w-[128px]">
          {canReschedule ? (
            <button onClick={() => openReschedule(h)} className="btn btn-secondary btn-sm">
              <CalendarPlus className="h-3.5 w-3.5" />
              Reschedule
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10.5px] font-semibold italic text-slate-400">
              {h.isPast ? "Concluded sitting" : "Not your bureau's file"}
            </span>
          )}
          {!h.isPast && (
            <button onClick={() => openBrief(h)} className="btn btn-primary btn-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Prep brief
            </button>
          )}
        </div>
      </div>
    );
  };

  const section = (title: string, items: HearingItem[], accent: string, badge: string) => (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <Gavel className={cn("h-3.5 w-3.5", accent)} />
            {title}
          </h2>
        </div>
        <span className={badge}>{items.length} sittings</span>
      </div>
      <div className="space-y-3 p-4">
        {items.length === 0 ? (
          <EmptyState compact icon={CalendarDays} title="Nothing scheduled in this window" />
        ) : (
          items.map(renderHearing)
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Hearing Calendar"
        icon={CalendarDays}
        actions={
          regionNote ? (
            <span className="badge border-teal-200 bg-teal-50 text-teal-700">{regionNote}</span>
          ) : (
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">Next 45 days</span>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 stagger-children">
        {[
          { label: "All board sittings", value: hearings.length, tone: "text-slate-900" },
          { label: "This week", value: groups.thisWeek.length, tone: "text-fuchsia-700" },
          { label: "Past sittings", value: groups.overdue.length, tone: "text-slate-500" },
          {
            label: "Files SLA-breached",
            value: hearings.filter((h) => h.sla_status.isBreached && !h.isPast).length,
            tone: "text-rose-700",
          },
        ].map((s) => (
          <div key={s.label} className="panel px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-400">{s.label}</p>
            <p className={cn("mt-1.5 font-display text-[20px] font-extrabold leading-none", s.tone)}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {section(
        "This week",
        groups.thisWeek,
        "text-fuchsia-600",
        "badge border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
      )}

      {section(
        "Later hearings",
        groups.later,
        "text-brand-600",
        "badge border-brand-200 bg-brand-50 text-brand-700"
      )}

      {section(
        "Past sittings",
        groups.overdue,
        "text-slate-400",
        "badge border-slate-200 bg-slate-50 text-slate-600"
      )}

      {/* Hearing-prep brief modal */}
      <Modal
        open={Boolean(briefTarget)}
        onClose={() => setBriefTarget(null)}
        title="Hearing-prep brief"
        description={
          briefTarget
            ? `${briefTarget.case_id} · ${briefTarget.institution_name} · ${formatDateTime(briefTarget.hearing_date)}`
            : undefined
        }
        icon={<Sparkles className="h-4 w-4" />}
        tone="violet"
        size="lg"
        footer={
          <button onClick={() => setBriefTarget(null)} className="btn btn-secondary btn-sm">
            Close
          </button>
        }
      >
        {isBriefing && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            <p className="mt-3 text-[12px] font-semibold text-slate-700">
              Organising the file record into a sitting brief…
            </p>
            <p className="mt-1 text-[10.5px] text-slate-400">
              Facts, statutory position, likely questions — grounded in the case timeline only.
            </p>
          </div>
        )}

        {!isBriefing && briefError && (
          <div className="space-y-3">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11.5px] font-medium text-amber-800">
              {briefError}
            </p>
            <p className="text-[10.5px] text-slate-400">
              The brief is generated by the interactive AI model from this file's record;
              everything else on the calendar keeps working without it.
            </p>
          </div>
        )}

        {!isBriefing && brief && briefTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-violet-700">
                Opening summary
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-800">
                {brief.opening_summary}
              </p>
            </div>

            <BriefSection
              icon={ClipboardList}
              title="Key facts on record"
              items={brief.key_facts}
              tone="text-slate-600"
            />

            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-brand-600">
                <Scale className="h-3 w-3" />
                Statutory position
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-700">
                {brief.statutory_position}
              </p>
            </div>

            <BriefSection
              icon={HelpCircle}
              title="Questions the panel may ask"
              items={brief.likely_questions}
              tone="text-fuchsia-600"
            />

            <BriefSection
              icon={Gavel}
              title="Directions to seek"
              items={brief.directions_to_seek}
              tone="text-emerald-600"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <BriefSection
                icon={FileCheck2}
                title="Documents ready"
                items={brief.documents_ready}
                tone="text-emerald-600"
              />
              <BriefSection
                icon={FileWarning}
                title="Documents pending"
                items={brief.documents_pending}
                tone="text-amber-600"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Reschedule modal */}
      <Modal
        open={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reschedule statutory hearing"
        description={rescheduleTarget ? `${rescheduleTarget.case_id} · currently ${formatDateTime(rescheduleTarget.hearing_date)}` : undefined}
        icon={<CalendarPlus className="h-4 w-4" />}
        tone="violet"
        footer={
          <>
            <button onClick={() => setRescheduleTarget(null)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button
              onClick={confirmReschedule}
              disabled={isSaving || !hearingInput}
              className="btn btn-primary btn-sm"
            >
              {isSaving ? "Saving…" : "Confirm reschedule"}
            </button>
          </>
        }
      >
        {rescheduleTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3">
              <p className="text-[11px] font-bold text-slate-900">{rescheduleTarget.institution_name}</p>
              <p className="text-[10.5px] text-slate-500">
                {rescheduleTarget.city}, {rescheduleTarget.state} · {rescheduleTarget.category}
              </p>
            </div>

            <div>
              <label htmlFor="cal-hearing" className="field-label">
                New date & time <span className="text-rose-600">*</span>
              </label>
              <input
                id="cal-hearing"
                type="datetime-local"
                value={hearingInput}
                onChange={(e) => setHearingInput(e.target.value)}
                className="input"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
