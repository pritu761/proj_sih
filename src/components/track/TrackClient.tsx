"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ScrollText,
  Building2,
  MapPin,
  Clock,
  CheckCircle2,
  Flame,
  Gavel,
  Inbox,
  AlertCircle,
  Landmark,
  ArrowRight,
  ReceiptText,
  Printer,
  MailPlus,
  Loader2,
  Users,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { trackCaseAction, subscribeCaseWatchAction } from "@/actions/track-actions";
import { StatusPill } from "@/components/ui/badges";
import { TextReveal } from "@/components/ui/text-reveal";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Reveal } from "@/components/ui/reveal";
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

function slaMeta(result: TrackingResult) {
  const breached = /breached/i.test(result.sla_status);
  const approaching = /approaching/i.test(result.sla_status);
  const color = breached ? "#fb7185" : approaching ? "#fbbf24" : "#34d399";

  const received = new Date(result.date_received).getTime();
  const due = new Date(result.expected_disposal_date).getTime();
  const total = Math.max(1, due - received);
  const elapsed = breached
    ? 100
    : Math.min(100, Math.max(2, ((Date.now() - received) / total) * 100));

  return { color, elapsed };
}

export function TrackClient() {
  const [registryNo, setRegistryNo] = useState("");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [watchers, setWatchers] = useState<number | null>(null);
  const [watchEmail, setWatchEmail] = useState("");
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [watchDone, setWatchDone] = useState(false);
  const [watchError, setWatchError] = useState("");
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
    setWatchers(res.watchers ?? 0);
    setCheckedAt(res.checkedAt);
    setWatchDone(false);
    setWatchEmail("");
    setWatchError("");
  };

  const handleSubscribe = async () => {
    if (!result) return;
    setIsSubscribing(true);
    setWatchError("");
    const res = await subscribeCaseWatchAction({
      registryNo: result.registry_no,
      email: watchEmail,
    });
    setIsSubscribing(false);
    if (!res.success) {
      setWatchError(res.error || "Could not subscribe right now.");
      return;
    }
    setWatchers(res.watchers);
    setWatchDone(true);
  };

  const sla = result ? slaMeta(result) : null;

  return (
    <div className="print-page flex min-h-screen flex-col bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 text-white">
      {/* Sticky frosted header */}
      <header className="no-print sticky top-0 z-40 border-b border-white/10 bg-ink-950/55 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link
            href="/"
            className="group flex items-center gap-2.5"
            aria-label="Back to AICTE Sentinel home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_6px_16px_-6px_rgba(245,158,11,0.7)] transition-transform duration-300 group-hover:scale-105">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink-950" fill="currentColor" aria-hidden>
                <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
              </svg>
            </span>
            <span className="font-display text-[13px] font-extrabold tracking-tight text-white">
              AICTE <span className="text-saffron-400">Sentinel</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-saffron-400 sm:inline-flex">
              <Landmark className="h-3.5 w-3.5" />
              Government of India
            </span>
            <Link
              href="/login"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-white/80 transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              Officer sign-in
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-12">
        {/* Hero */}
        <Reveal className="text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/40">
            Public disclosure · No sign-in required
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5.5vw,2.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            <TextReveal text="Where is my grievance?" />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-white/60">
            Track any grievance you filed with AICTE using the registry number on your acknowledgement
            slip. No account or personal data is needed.
          </p>
        </Reveal>

        {/* Lookup card */}
        <Reveal delay={160} className="no-print">
          <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
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
                  className="w-full rounded-xl border border-white/15 bg-ink-900/60 py-2.5 pl-9 pr-3 font-mono text-[13px] font-bold tracking-wide text-white placeholder:text-white/25 transition-all duration-300 focus:border-saffron-400/60 focus:shadow-[0_0_0_3.5px_rgba(251,191,36,0.12),0_0_28px_-8px_rgba(251,191,36,0.45)] focus:outline-none"
                />
              </div>
              <button
                onClick={() => handleTrack()}
                disabled={isChecking}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-saffron-400 px-5 py-2.5 text-[12px] font-extrabold text-ink-950 transition-all duration-300 hover:scale-[1.02] hover:bg-saffron-300 active:scale-[0.97] disabled:opacity-50"
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
                    className="lift rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-left hover:border-saffron-400/50 hover:bg-white/10"
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
        </Reveal>

        {/* Result */}
        {result && (
          <div className="mt-6 animate-[fadeSlideIn_0.4s_ease-out] space-y-4">
            {checkedAt && (
              <p className="text-center text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/35">
                Status as on {formatDateTime(checkedAt)}
              </p>
            )}

            {/* Status hero */}
            <Reveal>
              <div className="print-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10.5px] font-bold text-white/70 transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  title="Print or save this status report as PDF"
                >
                  <Printer className="h-3 w-3" />
                  Print report
                </button>
                <div
                  className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-25"
                  style={{ background: `radial-gradient(circle, ${sla?.color ?? "#34d399"}, transparent 65%)` }}
                  aria-hidden
                />
                <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <span className="font-mono text-[15px] font-extrabold tracking-wide text-saffron-300">
                      {result.registry_no}
                    </span>
                    <h2 className="mt-1.5 font-display text-[clamp(1.25rem,3vw,1.6rem)] font-extrabold leading-snug tracking-[-0.03em] text-white">
                      {result.category}
                    </h2>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <StatusPill status={result.status} />
                      <span className="text-[10.5px] font-semibold text-white/45">{result.sla_status}</span>
                    </div>
                  </div>
                  {sla && (
                    <div className="flex shrink-0 items-center gap-3.5">
                      <ProgressRing
                        value={sla.elapsed}
                        size={64}
                        stroke={4}
                        color={sla.color}
                        trackClassName="stroke-white/10"
                      >
                        <span className="font-display text-[12px] font-extrabold tabular-nums text-white">
                          {Math.round(sla.elapsed)}%
                        </span>
                      </ProgressRing>
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                          Statutory window
                        </p>
                        <p className="mt-0.5 text-[11.5px] font-bold text-white">
                          {formatDate(result.date_received)} → {formatDate(result.expected_disposal_date)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="relative mt-4 grid gap-3 text-[11px] sm:grid-cols-2">
                  <div className="rounded-xl print-soft border border-white/10 bg-ink-900/40 p-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      <Building2 className="h-3 w-3" /> Institution
                    </p>
                    <p className="mt-1 font-bold leading-snug text-white">{result.institution_name}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-white/50">
                      <MapPin className="h-2.5 w-2.5" />
                      {result.institution_city}, {result.institution_state}
                    </p>
                  </div>
                  <div className="rounded-xl print-soft border border-white/10 bg-ink-900/40 p-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      <Landmark className="h-3 w-3" /> Responsible wing
                    </p>
                    <p className="mt-1 font-bold leading-snug text-white">
                      {result.assigned_bureau.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-white/50">
                      <Gavel className="h-2.5 w-2.5" />
                      Hearing: {result.hearing_date ? formatDate(result.hearing_date) : "not yet scheduled"}
                    </p>
                  </div>
                </div>

                <p className="relative mt-3 rounded-xl print-soft border border-white/10 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-white/70">
                  <span className="font-bold text-white">Latest update from the Council:</span>{" "}
                  {result.last_action}
                </p>
              </div>
            </Reveal>

            {/* Journey timeline */}
            <Reveal delay={120}>
              <div className="print-card rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  Journey of your grievance
                </p>
                <div className="relative mt-5">
                  {/* Gradient spine */}
                  <div
                    className="absolute bottom-2 left-[13px] top-2 w-px bg-gradient-to-b from-saffron-400/50 via-white/15 to-transparent"
                    aria-hidden
                  />
                  <div className="space-y-5">
                    {result.timeline.map((t, idx) => {
                      const Icon = timelineIcon[t.action_type] ?? Clock;
                      const latest = idx === 0;
                      const done = t.action_type === "DISPOSED";
                      return (
                        <Reveal key={idx} delay={idx * 110} className="relative pl-10">
                          <div
                            className={cn(
                              "absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full border",
                              latest
                                ? "border-saffron-400/60 bg-saffron-400/20 text-saffron-300 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
                                : done
                                  ? "border-emerald-400/50 bg-emerald-400/15 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                                  : "border-white/15 bg-white/5 text-white/40"
                            )}
                          >
                            <Icon className="h-3 w-3" />
                          </div>
                          <p className={cn("text-[12.5px] font-bold", latest ? "text-white" : "text-white/80")}>
                            {timelineLabel[t.action_type] ?? t.action_type}
                          </p>
                          <p className="text-[10.5px] font-semibold text-white/40">
                            {formatDateTime(t.timestamp)}
                          </p>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                            {t.remarks}
                          </p>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-5 border-t border-white/10 pt-3 text-[10.5px] leading-relaxed text-white/30">
                  Coordination notes, officer attributions and evidence documents are internal records
                  and are not part of public disclosure.
                </p>
              </div>
            </Reveal>

            {/* Watch subscription */}
            <Reveal delay={200}>
              <div className="print-card rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
                <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                      <Users className="h-3 w-3" />
                      Keep watching this grievance
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                      {watchers !== null && watchers > 0 ? (
                        <>
                          <span className="font-bold text-white">{watchers}</span>{" "}
                          {watchers === 1 ? "citizen is" : "citizens are"} tracking{" "}
                          {watchers === 1 ? "it" : "them"}. Leave your email and the Council's
                          disclosure desk will notify you when the status changes.
                        </>
                      ) : (
                        "Leave your email and the Council's disclosure desk will notify you when the status of this grievance changes."
                      )}
                    </p>
                  </div>
                  <div className="no-print flex w-full shrink-0 flex-col gap-2 sm:w-72">
                    {watchDone ? (
                      <p className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        You will be notified at {watchEmail}
                      </p>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="email"
                            value={watchEmail}
                            onChange={(e) => setWatchEmail(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
                            placeholder="you@example.com"
                            className="w-full rounded-xl border border-white/15 bg-ink-900/60 px-3 py-2.5 text-[11.5px] font-semibold text-white placeholder:text-white/25 transition-all duration-300 focus:border-saffron-400/60 focus:shadow-[0_0_0_3.5px_rgba(251,191,36,0.12),0_0_28px_-8px_rgba(251,191,36,0.45)] focus:outline-none"
                            aria-label="Email address for status notifications"
                          />
                          <button
                            type="button"
                            onClick={handleSubscribe}
                            disabled={isSubscribing}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-saffron-400 px-3.5 py-2.5 text-[11px] font-extrabold text-ink-950 transition-all duration-300 hover:bg-saffron-300 active:scale-[0.97] disabled:opacity-50"
                          >
                            {isSubscribing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MailPlus className="h-3.5 w-3.5" />
                            )}
                            Notify me
                          </button>
                        </div>
                        {watchError && (
                          <p role="alert" className="text-[10.5px] font-semibold text-rose-300">
                            {watchError}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="mt-3 border-t border-white/10 pt-2.5 text-[10px] leading-relaxed text-white/30">
                  Only the registry number and your email are stored. Unsubscribe by replying to any
                  notification. This demo deployment does not send live email.
                </p>
              </div>
            </Reveal>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-white/10 py-5">
        <p className="mx-auto max-w-3xl px-5 text-center text-[10.5px] leading-relaxed text-white/35">
          AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.
        </p>
      </footer>
    </div>
  );
}
