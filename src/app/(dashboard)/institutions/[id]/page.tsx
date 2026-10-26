import Link from "next/link";
import { notFound } from "next/navigation";
import repository from "@/lib/services/repository";
import {
  ShieldAlert,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  History,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  getBureauBadgeColor,
  getBureauLabel,
  getStatusBadgeColor,
  getPriorityBadgeColor,
} from "@/lib/utils";

interface InstitutionProfileProps {
  params: Promise<{ id: string }>;
}

export default async function InstitutionProfilePage({ params }: InstitutionProfileProps) {
  const { id } = await params;
  const data = await repository.getInstitutionById(id);

  if (!data) {
    notFound();
  }

  const { institution, cases, activeBureaus, openOverlapAlerts, hasOpenOverlap, timeline } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/institutions" className="hover:text-blue-900 font-medium">
          Institutions Directory
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-900 truncate">{institution.name}</span>
      </nav>

      {/* Prominent Overlap Banner if Collision Exists */}
      {hasOpenOverlap && (
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
                    CRITICAL COLLISION
                  </span>
                </h3>
                <p className="text-xs text-rose-800 mt-1 max-w-2xl">
                  {openOverlapAlerts[0]?.match_reasons?.map((r: any) => r.description).join(" ") ||
                    "Multiple AICTE Bureaus are actively investigating grievances for this institution concurrently."}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-rose-900">
                  <span>Bureaus Involved:</span>
                  {openOverlapAlerts[0]?.bureaus_involved?.map((b: string) => (
                    <span key={b} className="rounded bg-rose-200 px-2 py-0.5 text-[10px] font-bold">
                      {b}
                    </span>
                  ))}
                  <span className="ml-2 text-slate-500 font-mono text-[11px]">
                    Cases: {openOverlapAlerts[0]?.case_ids?.join(", ")}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/alerts"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition-colors shadow-xs shrink-0"
            >
              <span>Coordinate Overlap</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Institution Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                AICTE Permanent ID: {institution.aicte_permanent_id}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                {institution.region} Regional Office
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                {institution.institution_type}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {institution.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{institution.address}, {institution.city}, {institution.state} - {institution.pincode}</span>
              </div>
              {institution.contact_email && (
                <div className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span>{institution.contact_email}</span>
                </div>
              )}
              {institution.contact_phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{institution.contact_phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Active Bureaus Status Box */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 shrink-0 lg:w-72">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Bureau Coverage
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {activeBureaus.length === 0 ? (
                <span className="text-xs text-slate-500 italic">No active inquiries</span>
              ) : (
                activeBureaus.map((b) => (
                  <span
                    key={b}
                    className={`rounded-md px-2 py-1 text-xs font-bold border ${getBureauBadgeColor(b)}`}
                  >
                    {b.replace("_", " ")}
                  </span>
                ))
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-500">Total Cases Recorded:</span>
              <span className="font-bold text-slate-900">{cases.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Cases List & Consolidated Cross-Bureau Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Consolidated Case History across Bureaus
              </h2>
              <p className="text-xs text-slate-500">
                All historical and ongoing grievances submitted to AICTE for this institution.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded">
              {cases.length} Cases
            </span>
          </div>

          <div className="space-y-3">
            {cases.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">
                No cases on record for this institution.
              </div>
            ) : (
              cases.map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-blue-400 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cases/${c.id}`}
                        className="font-mono text-xs font-bold text-blue-900 hover:underline"
                      >
                        {c.case_id}
                      </Link>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(c.status)}`}>
                        {c.status.replace("_", " ")}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadgeColor(c.priority)}`}>
                        {c.priority}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBureauBadgeColor(c.assigned_bureau)}`}>
                      {getBureauLabel(c.assigned_bureau)}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800">
                    Category: {c.category}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">
                    {c.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                    <div className="flex items-center gap-3">
                      <span>Received: {formatDate(c.date_received)}</span>
                      <span>•</span>
                      <span>Officer: {c.assigned_officer}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* SLA Chip */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          c.sla.isBreached
                            ? "bg-rose-100 text-rose-800 font-black"
                            : c.sla.isApproaching
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {c.sla.statusText}
                      </span>

                      <Link
                        href={`/cases/${c.id}`}
                        className="font-bold text-blue-900 hover:underline inline-flex items-center gap-0.5"
                      >
                        <span>View Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Consolidated Visual Timeline across ALL Bureaus */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs h-fit">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
            <History className="h-4 w-4 text-blue-900" />
            <h2 className="text-sm font-bold text-slate-900">
              Cross-Bureau Activity Trail
            </h2>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {timeline.slice(0, 10).map((act, idx) => (
              <div key={idx} className="relative">
                {/* Node icon */}
                <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-900 shadow-xs" />
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold text-blue-800">
                      {act.case_id}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {formatDate(act.timestamp)}
                    </span>
                  </div>

                  <span className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded border ${getBureauBadgeColor(act.actor_bureau)}`}>
                    {act.actor_bureau.replace("_", " ")}
                  </span>

                  <p className="mt-1 text-xs text-slate-700 font-medium leading-snug">
                    {act.remarks}
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-400">
                    By: {act.actor_user}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
