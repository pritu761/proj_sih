import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import { SessionUser } from "@/lib/rbac";
import {
  ShieldAlert,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  History,
  Inbox,
  UserCheck,
  ArrowRightLeft,
  Flame,
  MessageSquare,
  CheckCircle2,
  Link2,
  RefreshCw,
  Building2,
  AlertTriangle,
  GraduationCap,
  Globe2,
} from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { BureauPill, PriorityPill, StatusPill } from "@/components/ui/badges";
import { cn } from "@/lib/utils";

interface InstitutionProfileProps {
  params: Promise<{ id: string }>;
}

const actionIcon: Record<string, typeof Inbox> = {
  RECEIVED: Inbox,
  ASSIGNED: UserCheck,
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

export default async function InstitutionProfilePage({ params }: InstitutionProfileProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as unknown as SessionUser;
  const { id } = await params;
  const data = await repository.getInstitutionById(id, user);

  if (!data) notFound();

  const { institution, cases, activeBureaus, openOverlapAlerts, hasOpenOverlap, timeline } = data;

  const activeCases = cases.filter((c: any) => c.status !== "DISPOSED");
  const disposed = cases.filter((c: any) => c.status === "DISPOSED").length;
  const breached = activeCases.filter((c: any) => c.sla?.isBreached).length;
  const approaching = activeCases.filter((c: any) => c.sla?.isApproaching).length;

  const bureauCounts = cases.reduce((acc: Record<string, number>, c: any) => {
    acc[c.assigned_bureau] = (acc[c.assigned_bureau] ?? 0) + 1;
    return acc;
  }, {});
  const maxBureau = Math.max(1, ...Object.values(bureauCounts));

  const monogram =
    institution.name
      .replace(/[^A-Za-z ]/g, "")
      .split(" ")
      .filter((w: string) => w.length > 2 && !["the", "and", "of", "for"].includes(w.toLowerCase()))
      .slice(0, 2)
      .map((w: string) => w[0])
      .join("")
      .toUpperCase() || "AI";

  const firstAlert = openOverlapAlerts[0];
  const firstAlertCase =
    cases.find((c: any) => c.case_id === firstAlert?.case_ids?.[0]) ??
    activeCases[0];

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Institution profile"
        title={institution.name}
        description={`${institution.institution_type} · ${institution.city}, ${institution.state} · AICTE ${institution.aicte_permanent_id}`}
        icon={Building2}
        tone="violet"
        crumbs={[
          { label: "Institutions", href: "/institutions" },
          { label: institution.name },
        ]}
        actions={
          <>
            <Link href={`/cases?q=${encodeURIComponent(institution.aicte_permanent_id)}`} className="btn btn-secondary">
              All {cases.length} cases
            </Link>
            <Link href="/cases/new" className="btn btn-primary">
              Register complaint
            </Link>
          </>
        }
      />

      {/* Overlap banner */}
      {hasOpenOverlap && (
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
                    Critical collision
                  </span>
                </div>
                <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-rose-800/85">
                  {firstAlert?.match_reasons?.map((r: any) => r.description).slice(0, 3).join(" · ") ||
                    "Multiple AICTE Bureaus are actively investigating grievances for this institution concurrently."}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-rose-700">
                    Bureaus involved
                  </span>
                  {firstAlert?.bureaus_involved?.map((b: string) => (
                    <BureauPill key={b} bureau={b} />
                  ))}
                  <span className="font-mono text-[9.5px] font-semibold text-slate-500">
                    {firstAlert?.case_ids?.join("  ·  ")}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <Link href={`/cases/${firstAlertCase?.id ?? ""}`} className="btn btn-secondary btn-sm">
                View case
              </Link>
              <Link href="/alerts?status=OPEN" className="btn btn-danger btn-sm">
                Coordinate overlap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Identity + stats */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="panel relative overflow-hidden p-5 xl:col-span-2">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-50/80 to-transparent" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-ink-800 to-ink-700 text-[17px] font-extrabold text-white shadow-lg ring-4 ring-[var(--surface-card)]">
                  {monogram}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-lg border border-brand-200 bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-bold text-brand-700">
                      {institution.aicte_permanent_id}
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-slate-600">
                      {institution.region} region
                    </span>
                    <span className="rounded-lg border border-slate-200 bg-white px-2 py-0.5 text-[9.5px] font-bold text-slate-600">
                      {institution.institution_type}
                    </span>
                  </div>
                  <p className="mt-2 text-[11.5px] font-medium text-slate-500">
                    {institution.address}, {institution.city}, {institution.state} – {institution.pincode}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-[10.5px] text-slate-500">
                    {institution.contact_email && (
                      <span className="inline-flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-300" />
                        {institution.contact_email}
                      </span>
                    )}
                    {institution.contact_phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3 w-3 text-slate-300" />
                        {institution.contact_phone}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-slate-300" />
                      {institution.region} Regional Office
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Total cases", value: cases.length, tone: "text-slate-950" },
                { label: "Active now", value: activeCases.length, tone: "text-brand-700" },
                { label: "Disposed", value: disposed, tone: "text-emerald-700" },
                { label: "SLA breach", value: breached, tone: "text-rose-700" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{s.label}</p>
                  <p className={cn("mt-1 font-display text-[21px] font-extrabold leading-none tracking-tight", s.tone)}>
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="panel-title">Bureau exposure</h2>
              <p className="panel-sub">Cases by owning bureau</p>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              {activeBureaus.length} active
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {Object.entries(bureauCounts).length === 0 ? (
              <p className="text-[11px] italic text-slate-400">No cases recorded.</p>
            ) : (
              Object.entries(bureauCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([b, count]) => (
                  <div key={b}>
                    <div className="flex items-center justify-between">
                      <BureauPill bureau={b} full />
                      <span className="text-[10.5px] font-bold tabular-nums text-slate-700">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400"
                        style={{ width: `${(Number(count) / maxBureau) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="font-medium text-slate-500">Approaching SLA</span>
              <span className="font-bold text-amber-600">{approaching}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[10.5px]">
              <span className="font-medium text-slate-500">Open overlaps</span>
              <span className="font-bold text-rose-600">{openOverlapAlerts.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cases + timeline */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              <h2 className="font-display text-[14px] font-bold text-slate-900">
                Consolidated case history
              </h2>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-500">
                {cases.length}
              </span>
            </div>
            <Link
              href={`/cases?q=${encodeURIComponent(institution.aicte_permanent_id)}`}
              className="text-[10.5px] font-bold text-brand-600 hover:text-brand-700"
            >
              Open in explorer →
            </Link>
          </div>

          {cases.length === 0 ? (
            <div className="panel p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-200" />
              <p className="mt-2 text-[12px] font-semibold text-slate-600">No cases on record</p>
              <p className="text-[10.5px] text-slate-400">This institution has a clean grievance history.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cases.map((c: any) => (
                <div
                  key={c.id}
                  className={cn(
                    "group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md",
                    c.sla?.isBreached
                      ? "border-rose-200 hover:border-rose-300"
                      : "border-slate-200 hover:border-brand-300"
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-mono text-[10.5px] font-bold text-brand-700 hover:underline"
                      >
                        {c.case_id}
                      </Link>
                      <StatusPill status={c.status} />
                      <PriorityPill priority={c.priority} />
                      <BureauPill bureau={c.assigned_bureau} />
                    </div>
                    <span
                      className={cn(
                        "badge border",
                        c.sla?.isBreached
                          ? "sla-breached"
                          : c.sla?.isApproaching
                            ? "sla-approaching"
                            : "sla-normal"
                      )}
                    >
                      {c.sla?.isBreached
                        ? `${Math.abs(c.sla.remainingDays)}d overdue`
                        : c.status === "DISPOSED"
                          ? "Closed"
                          : `${c.sla?.remainingDays}d left`}
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-display text-[12.5px] font-bold text-slate-900">
                    {c.category}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-slate-500">
                    {c.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        {c.assigned_officer}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <History className="h-3 w-3" />
                        Received {formatDate(c.date_received)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Last action {formatDate(c.last_action_date)}
                      </span>
                    </div>
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700 hover:text-brand-800"
                    >
                      View case <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cross-bureau activity */}
        <div className="panel h-fit overflow-hidden">
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Cross-bureau activity</h2>
              <p className="panel-sub">Consolidated audit trail</p>
            </div>
            <span className="badge border-slate-200 bg-slate-50 text-slate-600">
              {timeline.length}
            </span>
          </div>

          <div className="max-h-[720px] overflow-y-auto p-5">
            <div className="timeline space-y-5">
              {timeline.slice(0, 14).map((act: any, idx: number) => {
                const Icon = actionIcon[act.action_type] ?? RefreshCw;
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
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/cases/${act.case_internal_id}`}
                        className="font-mono text-[9.5px] font-bold text-brand-700 hover:underline"
                      >
                        {act.case_id}
                      </Link>
                      <span className="text-[9px] font-medium text-slate-400">
                        {formatDate(act.timestamp)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-slate-600">
                        {act.action_type.replaceAll("_", " ")}
                      </span>
                      <BureauPill bureau={act.actor_bureau} />
                    </div>
                    <p className="mt-1 line-clamp-3 text-[10.5px] leading-relaxed text-slate-600">
                      {act.remarks}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-400">by {act.actor_user}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Append-only ledger. Entries cannot be edited or deleted.
            </div>
          </div>
        </div>
      </div>

      {/* Institutional facts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            icon: GraduationCap,
            label: "Institution type",
            value: institution.institution_type,
            note: "AICTE approved category",
          },
          {
            icon: Globe2,
            label: "Regional jurisdiction",
            value: `${institution.region} Regional Office`,
            note: `${institution.city}, ${institution.state}`,
          },
          {
            icon: MapPin,
            label: "Registered address",
            value: `${institution.city} – ${institution.pincode}`,
            note: institution.address,
          },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.label} className="panel flex items-start gap-3 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{f.label}</p>
                <p className="mt-0.5 truncate text-[11.5px] font-bold text-slate-800">{f.value}</p>
                <p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{f.note}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
