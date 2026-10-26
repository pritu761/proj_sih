import Link from "next/link";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import {
  Search,
  Download,
  PlusCircle,
  ExternalLink,
} from "lucide-react";
import {
  formatDate,
  getBureauBadgeColor,
  getBureauShortName,
  getStatusBadgeColor,
  getPriorityBadgeColor,
} from "@/lib/utils";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { SessionUser } from "@/lib/rbac";

interface CasesPageProps {
  searchParams: Promise<{
    q?: string;
    bureau?: string;
    region?: string;
    category?: string;
    status?: string;
    priority?: string;
    sla_status?: "NORMAL" | "APPROACHING" | "BREACHED";
    date_from?: string;
    date_to?: string;
    sortBy?: "date_received" | "last_action_date" | "priority" | "status";
    sortOrder?: "asc" | "desc";
    page?: string;
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const session = await auth();
  const user = session?.user as unknown as SessionUser;
  const params = await searchParams;

  const page = parseInt(params.page || "1", 10);
  const data = await repository.getCases(
    {
      q: params.q,
      bureau: params.bureau,
      region: params.region,
      category: params.category,
      status: params.status,
      priority: params.priority,
      sla_status: params.sla_status,
      date_from: params.date_from,
      date_to: params.date_to,
      sortBy: params.sortBy || "date_received",
      sortOrder: params.sortOrder || "desc",
      page,
      limit: 15,
    },
    user
  );

  const bureaus = [
    { key: "REGULATION_BUREAU", label: "Regulation Bureau (RB)" },
    { key: "PGRC", label: "Public Grievance Redressal Cell (PGRC)" },
    { key: "APPROVAL_BUREAU", label: "Approval Bureau (AB)" },
    { key: "SKILL_CELL", label: "Skill Development Cell (SDC)" },
  ];

  const statuses = [
    "PENDING",
    "UNDER_PROCESS",
    "DISPOSED",
    "TRANSFERRED",
    "ESCALATED",
  ];

  const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

  const regions = [
    "Northern",
    "Western",
    "Southern",
    "Eastern",
    "Central",
    "North-Western",
    "South-Western",
  ];

  // Build CSV export URL preserving active query filters
  const exportParams = new URLSearchParams();
  if (params.q) exportParams.set("q", params.q);
  if (params.bureau) exportParams.set("bureau", params.bureau);
  if (params.region) exportParams.set("region", params.region);
  if (params.category) exportParams.set("category", params.category);
  if (params.status) exportParams.set("status", params.status);
  if (params.priority) exportParams.set("priority", params.priority);
  if (params.sla_status) exportParams.set("sla_status", params.sla_status);
  const exportCsvUrl = `/api/reports/csv?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Case Explorer & Grievance Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, filter, monitor SLAs, and manage all cross-bureau institutional complaints.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={exportCsvUrl}
            download="aicte_cases_export.csv"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <Link
            href="/cases/new"
            className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Register New Case</span>
          </Link>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
        <form method="GET" action="/cases" className="space-y-3">
          {/* Top Row: Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search across all fields (Case ID, Institution Name, Permanent ID, Description, or City)..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            />
          </div>

          {/* Middle Row: Combinable Dropdowns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* Bureau */}
            <select
              name="bureau"
              defaultValue={params.bureau || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            >
              <option value="">All Bureaus</option>
              {bureaus.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>

            {/* Region */}
            <select
              name="region"
              defaultValue={params.region || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            >
              <option value="">All Regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r} Region
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              name="status"
              defaultValue={params.status || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>

            {/* Priority */}
            <select
              name="priority"
              defaultValue={params.priority || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            >
              <option value="">All Priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Category */}
            <select
              name="category"
              defaultValue={params.category || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden truncate"
            >
              <option value="">All Categories</option>
              {SLA_CONFIGS.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category}
                </option>
              ))}
            </select>

            {/* SLA Status Filter */}
            <select
              name="sla_status"
              defaultValue={params.sla_status || ""}
              className="rounded-lg border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:bg-white focus:outline-hidden"
            >
              <option value="">All SLA Timelines</option>
              <option value="NORMAL">Within Normal SLA</option>
              <option value="APPROACHING">Approaching SLA (Amber)</option>
              <option value="BREACHED">Breached Overdue (Red)</option>
            </select>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-medium text-slate-500">
              Found <span className="font-bold text-slate-900">{data.total}</span> matching cases
            </span>

            <div className="flex items-center gap-2">
              <Link
                href="/cases"
                className="text-xs text-slate-500 hover:text-slate-900 font-medium px-2 py-1"
              >
                Clear Filters
              </Link>

              <button
                type="submit"
                className="rounded-lg bg-blue-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-800 transition-colors shadow-2xs cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Cases Table Data Grid */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-bold text-slate-700">
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Institution & Region</th>
                <th className="py-3 px-4">Bureau</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">SLA Countdown</th>
                <th className="py-3 px-4">Received</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {data.cases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    No cases match the specified filter criteria.
                  </td>
                </tr>
              ) : (
                data.cases.map((c) => (
                  <tr key={c.id} className="hover:bg-blue-50/30 transition-colors">
                    {/* Case ID */}
                    <td className="py-3 px-4 font-mono font-bold text-blue-900">
                      <Link href={`/cases/${c.id}`} className="hover:underline">
                        {c.case_id}
                      </Link>
                    </td>

                    {/* Institution */}
                    <td className="py-3 px-4 max-w-xs">
                      <Link
                        href={`/institutions/${c.institution_id}`}
                        className="font-bold text-slate-900 hover:text-blue-900 hover:underline block truncate"
                      >
                        {c.institution?.name}
                      </Link>
                      <span className="text-[10px] text-slate-500 block">
                        {c.institution?.city}, {c.institution?.region} Region
                      </span>
                    </td>

                    {/* Bureau */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBureauBadgeColor(
                          c.assigned_bureau
                        )}`}
                      >
                        {getBureauShortName(c.assigned_bureau)}
                      </span>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-700">
                      {c.category}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadgeColor(
                          c.status
                        )}`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityBadgeColor(
                          c.priority
                        )}`}
                      >
                        {c.priority}
                      </span>
                    </td>

                    {/* SLA Countdown Chip */}
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${
                          c.sla.isBreached
                            ? "bg-rose-100 text-rose-800 font-black border border-rose-300"
                            : c.sla.isApproaching
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}
                      >
                        {c.sla.statusText}
                      </span>
                    </td>

                    {/* Date Received */}
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {formatDate(c.date_received)}
                    </td>

                    {/* Action link */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 font-bold text-blue-900 hover:text-blue-700 text-xs"
                      >
                        <span>Track</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50/50">
            <p className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-900">{data.page}</span> of{" "}
              <span className="font-bold text-slate-900">{data.totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/cases?page=${page - 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}${params.bureau ? `&bureau=${params.bureau}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  Previous
                </Link>
              )}
              {page < data.totalPages && (
                <Link
                  href={`/cases?page=${page + 1}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}${params.bureau ? `&bureau=${params.bureau}` : ""}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
