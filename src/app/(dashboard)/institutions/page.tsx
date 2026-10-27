import Link from "next/link";
import repository from "@/lib/services/repository";
import {
  Building2,
  ShieldAlert,
  ArrowRight,
  Search,
  MapPin,
  Tag,
  SlidersHorizontal,
  PlusCircle,
  Layers,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { BureauPill } from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface InstitutionsPageProps {
  searchParams: Promise<{
    q?: string;
    region?: string;
    type?: string;
    page?: string;
  }>;
}

const regions = [
  "Northern",
  "Western",
  "Southern",
  "Eastern",
  "Central",
  "North-Western",
  "South-Western",
];

const types = [
  "Engineering & Technology",
  "Management",
  "Polytechnic",
  "Pharmacy",
  "Architecture",
];

function query(
  base: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>
) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...overrides })) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
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

  const activeFilters = [params.q, params.region, params.type].filter(Boolean).length;
  const withOverlaps = data.institutions.filter((i: any) => i.openOverlaps > 0).length;
  const totalActive = data.institutions.reduce((sum: number, i: any) => sum + i.activeCases, 0);

  const base: Record<string, string | undefined> = {
    q: params.q,
    region: params.region,
    type: params.type,
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Registry"
        title="Institution directory"
        description="AICTE-approved institutions with a consolidated, cross-bureau grievance history."
        icon={Building2}
        tone="violet"
        actions={
          <Link href="/cases/new" className="btn btn-primary">
            <PlusCircle className="h-3.5 w-3.5" />
            Register complaint
          </Link>
        }
      />

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Institutions in view", value: data.total, tone: "text-slate-950", bg: "bg-slate-50 border-slate-200" },
          { label: "With open overlaps", value: withOverlaps, tone: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
          { label: "Active cases (page)", value: totalActive, tone: "text-brand-700", bg: "bg-brand-50 border-brand-200" },
          { label: "Regions covered", value: regions.length, tone: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-2xl border bg-white p-3.5 shadow-sm", s.bg)}>
            <p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-400">{s.label}</p>
            <p className={cn("mt-1.5 font-display text-[24px] font-extrabold leading-none tracking-tight", s.tone)}>
              {s.value.toLocaleString("en-IN")}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="panel p-4 sm:p-5">
        <form method="GET" action="/institutions" className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="q"
              defaultValue={params.q || ""}
              placeholder="Search by institution name, AICTE ID, city, or state…"
              className="input h-10 pl-10"
              aria-label="Search institutions"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <select name="region" defaultValue={params.region || ""} className="input h-10 w-full text-[11.5px] sm:w-[170px]" aria-label="Region">
              <option value="">All regions</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r} region</option>
              ))}
            </select>

            <select name="type" defaultValue={params.type || ""} className="input h-10 w-full text-[11.5px] sm:w-[190px]" aria-label="Institution type">
              <option value="">All institution types</option>
              {types.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <button type="submit" className="btn btn-primary btn-sm h-10 px-4">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </button>

            {activeFilters > 0 && (
              <Link href="/institutions" className="btn btn-ghost btn-sm h-10">
                Clear
              </Link>
            )}
          </div>
        </form>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-3.5 w-3.5 text-slate-400" />
          <p className="text-[11px] font-medium text-slate-500">
            <span className="font-bold text-slate-900">{data.total}</span> institutions · page{" "}
            {data.page} of {Math.max(1, data.totalPages)}
          </p>
        </div>
        {activeFilters > 0 && (
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
            {activeFilters} filter{activeFilters > 1 ? "s" : ""} active
          </span>
        )}
      </div>

      {/* Grid */}
      {data.institutions.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No institutions found"
          description="Try a different name, AICTE permanent ID, region, or institution type."
          action={
            <Link href="/institutions" className="btn btn-secondary btn-sm">
              Reset search
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
          {data.institutions.map((inst: any) => {
            const monogram = inst.name
              .replace(/[^A-Za-z ]/g, "")
              .split(" ")
              .filter((w: string) => w.length > 2 && !["the", "and", "of", "for"].includes(w.toLowerCase()))
              .slice(0, 2)
              .map((w: string) => w[0])
              .join("")
              .toUpperCase();

            const overlap = inst.openOverlaps > 0;

            return (
              <Link
                key={inst.id}
                href={`/institutions/${inst.id}`}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                  overlap ? "border-rose-200" : "border-slate-200 hover:border-brand-300"
                )}
              >
                {overlap && (
                  <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-rose-500 to-amber-400" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl text-[12px] font-extrabold shadow-sm",
                        overlap
                          ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white"
                          : "bg-gradient-to-br from-ink-800 to-ink-700 text-white"
                      )}
                    >
                      {monogram || "AI"}
                    </div>
                    <div>
                      <span className="block font-mono text-[9.5px] font-bold tracking-tight text-brand-700">
                        {inst.aicte_permanent_id}
                      </span>
                      <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                        {inst.region} region
                      </span>
                    </div>
                  </div>

                  {overlap ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-rose-600">
                      <ShieldAlert className="h-3 w-3" />
                      {inst.openOverlaps} overlap{inst.openOverlaps > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                      Clear
                    </span>
                  )}
                </div>

                <h3 className="mt-3.5 line-clamp-2 font-display text-[13px] font-bold leading-snug tracking-tight text-slate-900 group-hover:text-brand-700">
                  {inst.name}
                </h3>

                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                    <Tag className="h-3 w-3 shrink-0 text-slate-300" />
                    <span className="truncate">{inst.institution_type}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0 text-slate-300" />
                    <span className="truncate">{inst.city}, {inst.state} · {inst.pincode}</span>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    Active
                  </span>
                  {inst.activeBureaus.length === 0 ? (
                    <span className="text-[9.5px] italic text-slate-400">No live inquiries</span>
                  ) : (
                    inst.activeBureaus.map((b: string) => <BureauPill key={b} bureau={b} />)
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Active</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900">{inst.activeCases}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Closed</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-emerald-600">{inst.disposedCases}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Total</p>
                      <p className="mt-0.5 text-[13px] font-extrabold text-slate-900">{inst.totalCases}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-brand-700">
                    Profile
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {data.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-slate-500">
            Page <span className="font-bold text-slate-900">{data.page}</span> of{" "}
            <span className="font-bold text-slate-900">{data.totalPages}</span>
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/institutions${query(base, { page: String(Math.max(1, page - 1)) })}`}
              aria-disabled={page <= 1}
              className={cn("btn btn-secondary btn-sm", page <= 1 && "pointer-events-none opacity-40")}
            >
              Previous
            </Link>
            <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-ink-900 px-2 text-[11px] font-bold text-white">
              {data.page}
            </span>
            <Link
              href={`/institutions${query(base, { page: String(Math.min(data.totalPages, page + 1)) })}`}
              aria-disabled={page >= data.totalPages}
              className={cn("btn btn-secondary btn-sm", page >= data.totalPages && "pointer-events-none opacity-40")}
            >
              Next
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
