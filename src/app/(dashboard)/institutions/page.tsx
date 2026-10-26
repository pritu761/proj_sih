import Link from "next/link";
import repository from "@/lib/services/repository";
import { Building, ShieldAlert, ArrowRight, Search, MapPin, Tag } from "lucide-react";
import { getBureauBadgeColor, getBureauShortName } from "@/lib/utils";

interface InstitutionsPageProps {
  searchParams: Promise<{
    q?: string;
    region?: string;
    type?: string;
    page?: string;
  }>;
}

export default async function InstitutionsPage({ searchParams }: InstitutionsPageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const data = await repository.getInstitutions({
    q: params.q,
    region: params.region,
    type: params.type,
    page,
    limit: 12,
  });

  const regions = [
    "Northern",
    "Western",
    "Southern",
    "Eastern",
    "Central",
    "North-Western",
    "South-Western",
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Technical Institutions Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Central repository of AICTE-approved institutions with cross-bureau grievance histories.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <form method="GET" action="/institutions" className="flex-1 w-full flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search by Institution Name, AICTE Permanent ID, City, or State..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            />
          </div>

          <select
            name="region"
            defaultValue={params.region || ""}
            className="rounded-lg border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r} Region
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
          >
            Filter
          </button>

          {(params.q || params.region) && (
            <Link
              href="/institutions"
              className="text-xs text-slate-500 hover:text-slate-900 font-semibold px-2 py-2"
            >
              Reset
            </Link>
          )}
        </form>
      </div>

      {/* Institutions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.institutions.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200">
            <Building className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">No institutions found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search query or region filter.</p>
          </div>
        ) : (
          data.institutions.map((inst) => (
            <div
              key={inst.id}
              className={`flex flex-col justify-between rounded-xl border bg-white p-5 shadow-2xs transition-all hover:shadow-md ${
                inst.openOverlaps > 0
                  ? "border-rose-300 bg-rose-50/20 hover:border-rose-400"
                  : "border-slate-200 hover:border-blue-400"
              }`}
            >
              <div>
                {/* Header with AICTE ID & Region */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    ID: {inst.aicte_permanent_id}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {inst.region} Region
                  </span>
                </div>

                {/* Overlap Pill if active */}
                {inst.openOverlaps > 0 && (
                  <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-100/80 px-2.5 py-0.5 text-[10px] font-black text-rose-800 animate-pulse">
                    <ShieldAlert className="h-3 w-3 text-rose-600" />
                    <span>OVERLAP ALERT: Coordination Required</span>
                  </div>
                )}

                {/* Name & Type */}
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2">
                  {inst.name}
                </h3>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <Tag className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{inst.institution_type}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{inst.city}, {inst.state} ({inst.pincode})</span>
                </div>

                {/* Active Bureaus */}
                <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-400">Active Bureaus:</span>
                  {inst.activeBureaus.length === 0 ? (
                    <span className="text-[10px] text-slate-400 italic">None active</span>
                  ) : (
                    inst.activeBureaus.map((b) => (
                      <span
                        key={b}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getBureauBadgeColor(b)}`}
                      >
                        {getBureauShortName(b)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* Footer with Case Counters & Link */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Active Cases</span>
                    <span className="font-bold text-slate-900">{inst.activeCases}</span>
                  </div>
                  <div className="border-l border-slate-200 pl-3">
                    <span className="text-[10px] text-slate-400 block font-medium">Disposed</span>
                    <span className="font-bold text-emerald-600">{inst.disposedCases}</span>
                  </div>
                </div>

                <Link
                  href={`/institutions/${inst.id}`}
                  className="flex items-center gap-1 text-xs font-bold text-blue-900 hover:text-blue-700 group"
                >
                  <span>Full Profile</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4">
          <p className="text-xs text-slate-500">
            Showing Page <span className="font-bold">{data.page}</span> of <span className="font-bold">{data.totalPages}</span> ({data.total} total institutions)
          </p>

          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/institutions?page=${page - 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}${params.region ? `&region=${encodeURIComponent(params.region)}` : ""}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Previous
              </Link>
            )}
            {page < data.totalPages && (
              <Link
                href={`/institutions?page=${page + 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}${params.region ? `&region=${encodeURIComponent(params.region)}` : ""}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
