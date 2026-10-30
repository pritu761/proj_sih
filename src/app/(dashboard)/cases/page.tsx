import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import repository from "@/lib/services/repository";
import {
  Search,
  PlusCircle,
  ExternalLink,
  FolderSearch,
  SlidersHorizontal,
  X,
  Building2,
  CalendarDays,
  ArrowUpDown,
  LayoutGrid,
  List,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { SessionUser } from "@/lib/rbac";
import { PageHeader } from "@/components/ui/page-header";
import { BureauPill, PriorityPill, SlaPill, StatusPill } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportCsvButton } from "@/components/cases/export-csv-button";
import { cn } from "@/lib/utils";

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
    view?: "table" | "grid";
    page?: string;
  }>;
}

const bureaus = [
  { key: "REGULATION_BUREAU", label: "Regulation Bureau (RB)" },
  { key: "PGRC", label: "Public Grievance Redressal Cell (PGRC)" },
  { key: "APPROVAL_BUREAU", label: "Approval Bureau (AB)" },
  { key: "SKILL_CELL", label: "Skill Development Cell (SDC)" },
];

const statuses = ["PENDING", "UNDER_PROCESS", "DISPOSED", "TRANSFERRED", "ESCALATED"];
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

function buildQuery(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const sp = new URLSearchParams();
  const merged = { ...base, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value) sp.set(key, value);
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user as unknown as SessionUser;
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

  const filterEntries = [
    ["q", params.q],
    ["bureau", params.bureau],
    ["region", params.region],
    ["category", params.category],
    ["status", params.status],
    ["priority", params.priority],
    ["sla_status", params.sla_status],
    ["date_from", params.date_from],
    ["date_to", params.date_to],
  ].filter(([, value]) => Boolean(value)) as [string, string][];

  const exportParams = new URLSearchParams();
  for (const [key, value] of filterEntries) exportParams.set(key, value);
  const exportCsvUrl = `/api/reports/csv?${exportParams.toString()}`;

  const baseForPagination: Record<string, string | undefined> = {
    q: params.q,
    bureau: params.bureau,
    region: params.region,
    category: params.category,
    status: params.status,
    priority: params.priority,
    sla_status: params.sla_status,
    date_from: params.date_from,
    date_to: params.date_to,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    view: params.view,
  };

  const labelFor = (key: string, value: string) => {
    if (key === "sla_status")
      return `SLA: ${value.charAt(0)}${value.slice(1).toLowerCase()}`;
    if (key === "status") return `Status: ${value.replaceAll("_", " ").toLowerCase()}`;
    if (key === "bureau")
      return `Bureau: ${bureaus.find((b) => b.key === value)?.label ?? value}`;
    if (key === "category") return `Category: ${value}`;
    if (key === "priority") return `Priority: ${value.toLowerCase()}`;
    if (key === "region") return `Region: ${value}`;
    if (key === "q") return `“${value}”`;
    if (key === "date_from") return `From ${value}`;
    if (key === "date_to") return `To ${value}`;
    return `${key}: ${value}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registry"
        title="Case Explorer"
        description="Search, filter, and act on every cross-bureau institutional complaint from one auditable registry."
        icon={FolderSearch}
        tone="blue"
        actions={
          <>
            <ExportCsvButton href={exportCsvUrl} />
            <Link href="/cases/new" className="btn btn-primary">
              <PlusCircle className="h-3.5 w-3.5" />
              Register case
            </Link>
          </>
        }
      />

      {/* Search & filters */}
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="font-display text-[12.5px] font-bold text-slate-900">Query builder</p>
              <p className="text-[10.5px] text-slate-400">
                Combine any filters — every view is URL-shareable
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
            {data.total.toLocaleString("en-IN")} matching cases
          </span>
        </div>

        <form method="GET" action="/cases" className="space-y-3 p-4 sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search case ID, institution name, AICTE permanent ID, description, or city…"
              className="input h-11 pl-10 pr-4"
              aria-label="Search cases"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            <select name="bureau" defaultValue={params.bureau || ""} className="input h-9 text-[11.5px]" aria-label="Bureau">
              <option value="">All bureaus</option>
              {bureaus.map((b) => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>

            <select name="region" defaultValue={params.region || ""} className="input h-9 text-[11.5px]" aria-label="Region">
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r} region</option>
              ))}
            </select>

            <select name="status" defaultValue={params.status || ""} className="input h-9 text-[11.5px]" aria-label="Status">
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
              ))}
            </select>

            <select name="priority" defaultValue={params.priority || ""} className="input h-9 text-[11.5px]" aria-label="Priority">
              <option value="">All priorities</option>
              {priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select name="category" defaultValue={params.category || ""} className="input h-9 truncate text-[11.5px]" aria-label="Category">
              <option value="">All categories</option>
              {SLA_CONFIGS.map((c) => (
                <option key={c.category} value={c.category}>{c.category}</option>
              ))}
            </select>

            <select name="sla_status" defaultValue={params.sla_status || ""} className="input h-9 text-[11.5px]" aria-label="SLA status">
              <option value="">All SLA states</option>
              <option value="NORMAL">Within SLA</option>
              <option value="APPROACHING">Approaching</option>
              <option value="BREACHED">Breached</option>
            </select>
          </div>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Date window
              </span>
              <input type="date" name="date_from" defaultValue={params.date_from || ""} className="input h-8 w-[142px] text-[11px]" aria-label="From date" />
              <span className="text-[10px] text-slate-400">to</span>
              <input type="date" name="date_to" defaultValue={params.date_to || ""} className="input h-8 w-[142px] text-[11px]" aria-label="To date" />
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <Link href="/cases" className="btn btn-ghost btn-sm text-slate-500">
                Reset
              </Link>
              <button type="submit" className="btn btn-primary btn-sm px-4">
                <Search className="h-3.5 w-3.5" />
                Apply filters
              </button>
            </div>
          </div>
        </form>

        {filterEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
            <span className="mr-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
              Active
            </span>
            {filterEntries.map(([key, value]) => (
              <Link
                key={key}
                href={`/cases${buildQuery(baseForPagination, { [key]: undefined, page: undefined })}`}
                className="group inline-flex items-center gap-1 rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-brand-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
              >
                {labelFor(key, value)}
                <X className="h-2.5 w-2.5 opacity-50 group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            <h2 className="font-display text-[13px] font-bold text-slate-900">Case registry</h2>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-500">
              {data.total}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              role="group"
              aria-label="Registry view"
              className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5"
            >
              <Link
                href={`/cases${buildQuery(baseForPagination, { view: undefined, page: undefined })}`}
                aria-current={params.view !== "grid" ? "page" : undefined}
                title="Table view"
                aria-label="Table view"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  params.view !== "grid"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <List className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/cases${buildQuery(baseForPagination, { view: "grid", page: undefined })}`}
                aria-current={params.view === "grid" ? "page" : undefined}
                title="Card view"
                aria-label="Card view"
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
                  params.view === "grid"
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Link>
            </div>
            <Link
              href={`/cases${buildQuery(baseForPagination, {
                sortBy: "date_received",
                sortOrder: params.sortOrder === "asc" ? "desc" : "asc",
                page: undefined,
              })}`}
              className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-500 hover:text-brand-600"
            >
              <ArrowUpDown className="h-3 w-3" />
              Received {params.sortOrder === "asc" ? "oldest first" : "newest first"}
            </Link>
          </div>
        </div>

        {data.cases.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={FolderSearch}
              title="No cases match these filters"
              description="Try widening the date window, clearing a filter, or searching by AICTE permanent ID."
              action={
                <Link href="/cases" className="btn btn-secondary btn-sm">
                  Clear all filters
                </Link>
              }
            />
          </div>
        ) : params.view === "grid" ? (
          <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {data.cases.map((c: any) => (
              <div
                key={c.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/cases/${c.id}`}
                    className="font-mono text-[10.5px] font-bold text-brand-700 hover:underline"
                  >
                    {c.case_id}
                  </Link>
                  <PriorityPill priority={c.priority} />
                </div>

                <Link
                  href={`/institutions/${c.institution_id}`}
                  className="mt-2.5 line-clamp-2 text-[12.5px] font-bold leading-snug text-slate-900 transition-colors hover:text-brand-700 hover:underline"
                >
                  {c.institution?.name}
                </Link>
                <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[9.5px] font-medium text-slate-400">
                  <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="truncate">
                    {c.institution?.city}, {c.institution?.region} · {c.institution?.aicte_permanent_id}
                  </span>
                </p>

                <div className="mt-3 flex min-w-0 flex-wrap items-center gap-1.5">
                  <BureauPill bureau={c.assigned_bureau} />
                  <span className="badge max-w-full truncate border-slate-200 bg-slate-50 text-slate-600">
                    {c.category}
                  </span>
                </div>

                <div className="mt-auto pt-4">
                  <div className="flex items-center justify-between gap-2">
                    <StatusPill status={c.status} />
                    <SlaPill breached={c.sla.isBreached} approaching={c.sla.isApproaching}>
                      {c.sla.isBreached
                        ? `${Math.abs(c.sla.remainingDays)}d overdue`
                        : `${c.sla.remainingDays}d left`}
                    </SlaPill>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(4, Math.min(100, c.sla.percentElapsed))}%`,
                        background: c.sla.isBreached
                          ? "#dc2626"
                          : c.sla.isApproaching
                            ? "#d97706"
                            : "#059669",
                      }}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <span className="flex items-center gap-1 text-[9.5px] font-medium text-slate-400">
                      <CalendarDays className="h-2.5 w-2.5" />
                      {formatDate(c.date_received)}
                    </span>
                    <Link
                      href={`/cases/${c.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-brand-700 hover:underline"
                    >
                      Open case
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Institution</th>
                  <th>Bureau</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>SLA countdown</th>
                  <th>Received</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.cases.map((c: any) => (
                  <tr key={c.id} className="group">
                    <td>
                      <Link href={`/cases/${c.id}`} className="block">
                        <span className="font-mono text-[10.5px] font-bold text-brand-700 group-hover:underline">
                          {c.case_id}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 text-[9.5px] font-medium text-slate-400">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {formatDate(c.last_action_date)}
                        </span>
                      </Link>
                    </td>

                    <td className="max-w-[240px]">
                      <Link
                        href={`/institutions/${c.institution_id}`}
                        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-800 hover:text-brand-700 hover:underline"
                      >
                        <Building2 className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{c.institution?.name}</span>
                      </Link>
                      <span className="mt-0.5 block pl-[18px] text-[9.5px] text-slate-400">
                        {c.institution?.city}, {c.institution?.region} · {c.institution?.aicte_permanent_id}
                      </span>
                    </td>

                    <td><BureauPill bureau={c.assigned_bureau} /></td>

                    <td className="max-w-[160px]">
                      <span className="block truncate text-[11px] font-medium text-slate-600" title={c.category}>
                        {c.category}
                      </span>
                    </td>

                    <td><StatusPill status={c.status} /></td>
                    <td><PriorityPill priority={c.priority} /></td>

                    <td>
                      <SlaPill breached={c.sla.isBreached} approaching={c.sla.isApproaching}>
                        {c.sla.isBreached
                          ? `${Math.abs(c.sla.remainingDays)}d overdue`
                          : `${c.sla.remainingDays}d left`}
                      </SlaPill>
                      <div className="mt-1.5 h-1 w-[86px] overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(4, Math.min(100, c.sla.percentElapsed))}%`,
                            background: c.sla.isBreached ? "#dc2626" : c.sla.isApproaching ? "#d97706" : "#059669",
                          }}
                        />
                      </div>
                    </td>

                    <td className="whitespace-nowrap text-[10.5px] font-medium text-slate-500">
                      {formatDate(c.date_received)}
                    </td>

                    <td className="text-right">
                      <Link
                        href={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10.5px] font-bold text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 sm:flex-row">
            <p className="text-[11px] text-slate-500">
              Showing <span className="font-bold text-slate-900">{(data.page - 1) * 15 + 1}</span>–
              <span className="font-bold text-slate-900">{Math.min(data.page * 15, data.total)}</span> of{" "}
              <span className="font-bold text-slate-900">{data.total}</span> cases
            </p>

            <div className="flex items-center gap-1">
              <Link
                href={`/cases${buildQuery(baseForPagination, { page: String(Math.max(1, page - 1)) })}`}
                aria-disabled={page <= 1}
                className={cn("btn btn-secondary btn-sm", page <= 1 && "pointer-events-none opacity-40")}
              >
                Previous
              </Link>
              {Array.from({ length: Math.min(5, data.totalPages) }).map((_, i) => {
                const start = Math.max(1, Math.min(page - 2, data.totalPages - 4));
                const p = start + i;
                if (p > data.totalPages) return null;
                return (
                  <Link
                    key={p}
                    href={`/cases${buildQuery(baseForPagination, { page: String(p) })}`}
                    aria-current={p === page ? "page" : undefined}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold transition-colors",
                      p === page
                        ? "bg-ink-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {p}
                  </Link>
                );
              })}
              <Link
                href={`/cases${buildQuery(baseForPagination, { page: String(Math.min(data.totalPages, page + 1)) })}`}
                aria-disabled={page >= data.totalPages}
                className={cn("btn btn-secondary btn-sm", page >= data.totalPages && "pointer-events-none opacity-40")}
              >
                Next
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
