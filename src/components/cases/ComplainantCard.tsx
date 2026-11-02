"use client";

import Link from "next/link";
import { UserSearch, UsersRound, Repeat2, Building2, CalendarClock, Flag } from "lucide-react";
import { RECURRENCE_META, ComplainantProfile, RecurrenceLevel } from "@/lib/services/complainant-engine";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface ComplainantCardProps {
  caseItem: {
    complainant_name?: string | null;
    complainant_contact?: string | null;
  };
  /** null when the complainant has exactly one filing */
  profile: (Pick<
    ComplainantProfile,
    "totalCases" | "openCases" | "disposedCases" | "categories" | "institutions" | "bureaus" | "firstFiled" | "lastFiled" | "level" | "caseIds"
  > & { key: string }) | null;
  meta: { label: string; chip: string; note: string } | null;
  /** whether the current page's registry number is part of the profile */
  isCurrentCase: boolean;
}

export function ComplainantCard({ caseItem, profile, isCurrentCase }: ComplainantCardProps) {
  const name = caseItem.complainant_name;
  if (!name) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title flex items-center gap-2">
              <UserSearch className="h-3.5 w-3.5 text-brand-600" />
              Complainant identity
            </h2>
          </div>
        </div>
        <div className="px-5 py-6 text-center">
          <p className="text-[11px] italic text-slate-400">
            Complainant identity not captured for this record (seeded archive entry).
          </p>
        </div>
      </div>
    );
  }

  const meta = profile ? RECURRENCE_META[profile.level as RecurrenceLevel] : null;
  const isFirstFiling = !profile || profile.totalCases < 2;

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2 className="panel-title flex items-center gap-2">
            <UserSearch className="h-3.5 w-3.5 text-brand-600" />
            Complainant identity
          </h2>
        </div>
        {meta && !isFirstFiling && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide",
              meta.chip
            )}
          >
            <Repeat2 className="h-2.5 w-2.5" />
            {meta.label}
          </span>
        )}
      </div>

      <div className="px-5 py-4">
        <p className="text-[13px] font-bold text-slate-900">{name}</p>
        {caseItem.complainant_contact && (
          <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">
            {caseItem.complainant_contact}
          </p>
        )}

        {isFirstFiling ? (
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-[10.5px] leading-relaxed text-emerald-800">
            <Flag className="mt-0.5 h-3 w-3 shrink-0" />
            First filing recorded for this identity — monitor if further grievances arrive.
          </p>
        ) : (
          profile && (
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Linked files", value: profile.totalCases, tone: "text-slate-900" },
                  { label: "Open right now", value: profile.openCases, tone: "text-rose-700" },
                  { label: "Bureaus approached", value: profile.bureaus.length, tone: "text-brand-700" },
                  { label: "Institutions", value: profile.institutions.length, tone: "text-slate-900" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-400">{s.label}</p>
                    <p className={cn("mt-0.5 font-display text-[17px] font-extrabold leading-none", s.tone)}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {profile.institutions.length > 1 && (
                <p className="flex items-start gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 text-[10px] leading-relaxed text-amber-800">
                  <Building2 className="mt-0.5 h-3 w-3 shrink-0" />
                  Filings across {profile.institutions.length} institutions — consistent with a
                  cross-campus pattern or shared representation.
                </p>
              )}
              {profile.bureaus.length > 1 && isCurrentCase && (
                <p className="flex items-start gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 text-[10px] leading-relaxed text-rose-800">
                  <Repeat2 className="mt-0.5 h-3 w-3 shrink-0" />
                  This identity approached {profile.bureaus.length} bureaus, including this one —
                  check the collider's complainant before coordinating.
                </p>
              )}

              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">
                  Linked registry numbers
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {profile.caseIds.slice(0, 8).map((cid) => (
                    <Link
                      key={cid}
                      href={`/cases/${encodeURIComponent(cid)}`}
                      className={cn(
                        "rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] font-bold transition-colors",
                        cid === profile.caseIds[0] && isCurrentCase
                          ? "border-brand-300 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700"
                      )}
                    >
                      {cid}
                    </Link>
                  ))}
                  {profile.caseIds.length > 8 && (
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-bold text-slate-500">
                      +{profile.caseIds.length - 8} more
                    </span>
                  )}
                </div>
              </div>

              <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
                <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                Filing window {formatDate(profile.firstFiled)} → {formatDate(profile.lastFiled)} ·{" "}
                {meta?.note}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
