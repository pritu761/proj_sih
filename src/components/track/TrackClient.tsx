"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ScrollText,
  Building2,
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle2,
  Flame,
  Gavel,
  Inbox,
  AlertCircle,
  Landmark,
  ArrowLeft,
  ReceiptText,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { trackCaseAction } from "@/actions/track-actions";
import { StatusPill } from "@/components/ui/badges";
import { formatDate, formatDateTime, cn } from "@/lib/utils";

interface TrackingResult {
  registry_no: string;
  category: string;
  status: string;
  assigned_bureau: string;
  institution_name: string;
  institution_city: string;
  institution_state: string;
  date_received: Date | string;
  expected_disposal_date: Date | string;
  hearing_date: Date | string | null;
  sla_status: string;
  last_action: string;
  timeline: {
    action_type: string;
    remarks: string;
    timestamp: Date | string;
  }[];
}

const DEMO_REGISTRIES = [
  { code: "AICTE/PGRC/2026/00101", note: "Capitation fee grievance — SLA breached" },
  { code: "AICTE/RB/2026/00042", note: "Document withholding — coordination in progress" },
];

const timelineIcon: Record<string, typeof Inbox> = {
  RECEIVED: ReceiptText,
  STATUS_CHANGED: Clock,
  DISPOSED: CheckCircle2,
  ESCALATED: Flame,
  HEARING_SCHEDULED: Gavel,
};

const timelineLabel: Record<string, string> = {
  RECEIVED: "Grievance registered",
  STATUS_CHANGED: "Status updated",
  DISPOSED: "Grievance redressed (disposed)",
  ESCALATED: "Escalated to competent authority",
  HEARING_SCHEDULED: "Hearing scheduled",
};

export function TrackClient() {
  const [registryNo, setRegistryNo] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (code?: string) => {
    const target = (code ?? registryNo).trim();
    if (target.length < 10) {
      setError("Enter the full registry number exactly as printed on your acknowledgement slip.");
      return;
    }
    setIsChecking(true);
    setError("");
    const res = await trackCaseAction(target);
    setIsChecking(false);

    if (!res.success) {
      setResult(null);
      setError(res.error || "Lookup failed. Please try again.");
      return;
    }
    if (code && !registryNo) setRegistryNo(code);
    setResult(res.tracking);
    setCheckedAt(res.checkedAt);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 text-white">
      {/* Top bar */}
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3.5">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" />
            Officer sign-in
          </Link>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-saffron-400">
              <Landmark className="h-3.5 w-3.5" />
              Government of India
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-10">
        {/* Hero */}
        <div className="text-center">
          <h1 className="font-display text-[30px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[38px]">
            Grievance Status Tracker
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[12.5px] leading-relaxed text-white/60">
            Track any grievance you filed with AICTE using the registry number on your acknowledgement
            slip. No account or personal data is needed.
          </p>
        </div>

        {/* Lookup card */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <label htmlFor="registry" className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
            Registry number
          </label>
          <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
            <div className="relative flex-1">
              <ScrollText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                id="registry"
                value={registryNo}
                onChange={(e) => setRegistryNo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTrack()}
                placeholder="AICTE/PGRC/2026/00101"
                className="w-full rounded-xl border border-white/15 bg-ink-900/60 py-2.5 pl-9 pr-3 font-mono text-[13px] font-bold tracking-wide text-white placeholder:text-white/25 focus:border-saffron-400/60 focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleTrack()}
              disabled={isChecking}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-saffron-400 px-5 py-2.5 text-[12px] font-extrabold text-ink-950 transition-colors hover:bg-saffron-300 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {isChecking ? "Checking…" : "Track status"}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-[11.5px] font-medium text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          <div className="mt-4 border-t border-white/10 pt-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
              Demo registry numbers
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DEMO_REGISTRIES.map((d) => (
                <button
                  key={d.code}
                  onClick={() => handleTrack(d.code)}
                  disabled={isChecking}
                  className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-left transition-colors hover:border-saffron-400/50 hover:bg-white/10"
                >
                  <span className="block font-mono text-[10.5px] font-bold text-white">
                    {d.code}
                  </span>
                  <span className="block text-[10.5px] text-white/40">{d.note}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="mt-6 animate-[fadeSlideIn_0.4s_ease-out] space-y-4">
            {checkedAt && (
              <p className="text-center text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Status as on {formatDateTime(checkedAt)}
              </p>
            )}

            {/* Summary */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="font-mono text-[13px] font-extrabold tracking-wide text-saffron-300">
                  {result.registry_no}
                </span>
                <StatusPill status={result.status} />
              </div>

              <h2 className="mt-2.5 font-display text-[19px] font-extrabold leading-snug text-white">
                {result.category}
              </h2>

              <div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <Building2 className="h-3 w-3" /> Institution
                  </p>
                  <p className="mt-1 font-bold leading-snug text-white">{result.institution_name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-white/50">
                    <MapPin className="h-2.5 w-2.5" />
                    {result.institution_city}, {result.institution_state}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <Landmark className="h-3 w-3" /> Responsible wing
                  </p>
                  <p className="mt-1 font-bold leading-snug text-white">
                    {result.assigned_bureau.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                  </p>
                  <p className="mt-0.5 text-white/50">SLA: {result.sla_status}</p>
                </div>
              </div>

              <div className="mt-3 grid gap-3 text-[11px] sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <CalendarDays className="h-3 w-3" /> Received
                  </p>
                  <p className="mt-1 font-bold text-white">{formatDate(result.date_received)}</p>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <Clock className="h-3 w-3" /> Disposal due
                  </p>
                  <p className="mt-1 font-bold text-white">{formatDate(result.expected_disposal_date)}</p>
                </div>
                <div className="rounded-xl border border-white/10 p-3">
                  <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                    <Gavel className="h-3 w-3" /> Hearing
                  </p>
                  <p className="mt-1 font-bold text-white">
                    {result.hearing_date ? formatDate(result.hearing_date) : "Not yet scheduled"}
                  </p>
                </div>
              </div>

              <p className="mt-3 rounded-xl border border-white/10 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-white/70">
                <span className="font-bold text-white">Latest update from the Council:</span>{" "}
                {result.last_action}
              </p>
            </div>

            {/* Public timeline */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Disclosure timeline
              </p>
              <div className="mt-4 space-y-4">
                {result.timeline.map((t, idx) => {
                  const Icon = timelineIcon[t.action_type] ?? Clock;
                  return (
                    <div key={idx} className="relative pl-9">
                      <div
                        className={cn(
                          "absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border",
                          idx === 0
                            ? "border-saffron-400/40 bg-saffron-400/15 text-saffron-300"
                            : "border-white/15 bg-white/5 text-white/40"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                      </div>
                      {idx !== result.timeline.length - 1 && (
                        <div className="absolute left-[13px] top-8 h-[calc(100%-1rem)] w-px bg-white/10" />
                      )}
                      <p className="text-[12px] font-bold text-white">
                        {timelineLabel[t.action_type] ?? t.action_type}
                      </p>
                      <p className="text-[10.5px] font-semibold text-white/40">
                        {formatDateTime(t.timestamp)}
                      </p>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                        {t.remarks}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-5 border-t border-white/10 pt-3 text-[10.5px] leading-relaxed text-white/30">
                Coordination notes, officer attributions and evidence documents are internal records
                and are not part of public disclosure.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 py-5">
        <p className="mx-auto max-w-3xl px-5 text-center text-[10.5px] leading-relaxed text-white/35">
          AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.
        </p>
      </footer>
    </div>
  );
}
