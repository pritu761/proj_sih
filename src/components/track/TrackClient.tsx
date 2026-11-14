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
  Star,
  MessageSquareQuote,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LangProvider, useLang, LanguageToggle } from "@/components/ui/language";
import { track } from "@/lib/i18n";
import {
  trackCaseAction,
  subscribeCaseWatchAction,
  submitFeedbackAction,
} from "@/actions/track-actions";
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
  /** Citizen feedback on the redressal (present once submitted). */
  feedback_rating?: number | null;
  feedback_comment?: string | null;
  feedback_at?: string | Date | null;
}

const DEMO_REGISTRY_CODES = ["AICTE/PGRC/2026/00101", "AICTE/RB/2026/00042"];

const timelineIcon: Record<string, typeof Inbox> = {
  RECEIVED: ReceiptText,
  STATUS_CHANGED: Clock,
  DISPOSED: CheckCircle2,
  ESCALATED: Flame,
  HEARING_SCHEDULED: Gavel,
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
  return (
    <LangProvider>
      <TrackClientContent />
    </LangProvider>
  );
}

function TrackClientContent() {
  const { lang } = useLang();
  const t = track[lang];
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

  // Citizen feedback on the redressal (DISPOSED files only)
  const [fbRating, setFbRating] = useState(0);
  const [fbHover, setFbHover] = useState(0);
  const [fbComment, setFbComment] = useState("");
  const [fbSubmitted, setFbSubmitted] = useState<{
    rating: number;
    comment: string | null;
    at: string;
  } | null>(null);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");

  const handleTrack = async (code?: string) => {
    const target = (code ?? registryNo).trim();
    if (target.length < 10) {
      setError(t.lookup.shortError);
      return;
    }
    setIsChecking(true);
    setError("");
    const res = await trackCaseAction(target);
    setIsChecking(false);

    if (!res.success) {
      setResult(null);
      setError(res.error || t.errors.lookupFail);
      return;
    }
    if (code && !registryNo) setRegistryNo(code);
    setResult(res.tracking);
    setWatchers(res.watchers ?? 0);
    setCheckedAt(res.checkedAt);
    setWatchDone(false);
    setWatchEmail("");
    setWatchError("");
    // Reset (and prefill) the redressal feedback form for this file.
    setFbRating(res.tracking?.feedback_rating ?? 0);
    setFbHover(0);
    setFbComment(res.tracking?.feedback_comment ?? "");
    setFbSubmitted(
      res.tracking?.feedback_rating
        ? {
            rating: res.tracking.feedback_rating,
            comment: res.tracking.feedback_comment ?? null,
            at: String(res.tracking.feedback_at ?? ""),
          }
        : null
    );
    setIsSendingFeedback(false);
    setFeedbackError("");
  };

  const handleSendFeedback = async () => {
    if (!result || fbRating < 1) return;
    setIsSendingFeedback(true);
    setFeedbackError("");
    const res = await submitFeedbackAction({
      registryNo: result.registry_no,
      rating: fbRating,
      comment: fbComment.trim() || undefined,
    });
    setIsSendingFeedback(false);
    if (!res.success) {
      setFeedbackError(res.error || t.errors.feedbackFail);
      return;
    }
    setFbSubmitted({ rating: res.rating, comment: res.comment, at: res.submittedAt });
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
      setWatchError(res.error || t.errors.subscribeFail);
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
              {t.header.goi}
            </span>
            <Link
              href="/login"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-white/80 transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              {t.header.officerSignIn}
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <LanguageToggle overHero />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-16 pt-12">
        {/* Hero */}
        <Reveal className="text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/40">
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5.5vw,2.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            <TextReveal key={lang} text={t.hero.title} />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-white/60">
            {t.hero.sub}
          </p>
        </Reveal>

        {/* Lookup card */}
        <Reveal delay={160} className="no-print">
          <div className="mt-9 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <label htmlFor="registry" className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
              {t.lookup.label}
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
                {isChecking ? t.lookup.checking : t.lookup.button}
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
                {t.lookup.demoLabel}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_REGISTRY_CODES.map((code, i) => (
                  <button
                    key={code}
                    onClick={() => handleTrack(code)}
                    disabled={isChecking}
                    className="lift rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-left hover:border-saffron-400/50 hover:bg-white/10"
                  >
                    <span className="block font-mono text-[10.5px] font-bold text-white">
                      {code}
                    </span>
                    <span className="block text-[10.5px] text-white/40">{t.lookup.demoNotes[i]}</span>
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
                {t.statusAsOn} {formatDateTime(checkedAt)}
              </p>
            )}

            {/* Status hero */}
            <Reveal>
              <div className="print-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="no-print absolute right-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10.5px] font-bold text-white/70 transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  title={t.result.printTitle}
                >
                  <Printer className="h-3 w-3" />
                  {t.result.printReport}
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
                          {t.result.statutoryWindow}
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
                      <Building2 className="h-3 w-3" /> {t.result.institution}
                    </p>
                    <p className="mt-1 font-bold leading-snug text-white">{result.institution_name}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-white/50">
                      <MapPin className="h-2.5 w-2.5" />
                      {result.institution_city}, {result.institution_state}
                    </p>
                  </div>
                  <div className="rounded-xl print-soft border border-white/10 bg-ink-900/40 p-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      <Landmark className="h-3 w-3" /> {t.result.responsibleWing}
                    </p>
                    <p className="mt-1 font-bold leading-snug text-white">
                      {result.assigned_bureau.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase())}
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-white/50">
                      <Gavel className="h-2.5 w-2.5" />
                      {t.result.hearing}{" "}
                      {result.hearing_date ? formatDate(result.hearing_date) : t.result.hearingNone}
                    </p>
                  </div>
                </div>

                <p className="relative mt-3 rounded-xl print-soft border border-white/10 bg-ink-900/40 p-3 text-[11px] leading-relaxed text-white/70">
                  <span className="font-bold text-white">{t.result.latestFrom}</span>{" "}
                  {result.last_action}
                </p>
              </div>
            </Reveal>

            {/* Journey timeline */}
            <Reveal delay={120}>
              <div className="print-card rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                  {t.journey.heading}
                </p>
                <div className="relative mt-5">
                  {/* Gradient spine */}
                  <div
                    className="absolute bottom-2 left-[13px] top-2 w-px bg-gradient-to-b from-saffron-400/50 via-white/15 to-transparent"
                    aria-hidden
                  />
                  <div className="space-y-5">
                    {result.timeline.map((entry, idx) => {
                      const Icon = timelineIcon[entry.action_type] ?? Clock;
                      const latest = idx === 0;
                      const done = entry.action_type === "DISPOSED";
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
                            {t.journey.labels[entry.action_type] ?? entry.action_type}
                          </p>
                          <p className="text-[10.5px] font-semibold text-white/40">
                            {formatDateTime(entry.timestamp)}
                          </p>
                          <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                            {entry.remarks}
                          </p>
                        </Reveal>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-5 border-t border-white/10 pt-3 text-[10.5px] leading-relaxed text-white/30">
                  {t.journey.note}
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
                      {t.watch.heading}
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-white/60">
                      {watchers !== null && watchers > 0 ? (
                        <>
                          <span className="font-bold text-white">{watchers}</span>{" "}
                          {watchers === 1 ? t.watch.countSingle : t.watch.countPlural}.{" "}
                          {t.watch.watchSub}
                        </>
                      ) : (
                        t.watch.bodyPlain
                      )}
                    </p>
                  </div>
                  <div className="no-print flex w-full shrink-0 flex-col gap-2 sm:w-72">
                    {watchDone ? (
                      <p className="flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-bold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        {t.watch.successNote(watchEmail)}
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
                            {t.watch.button}
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
                  {t.watch.privacy}
                </p>
              </div>
            </Reveal>

            {/* Citizen feedback on the redressal (DISPOSED files only) */}
            {result.status === "DISPOSED" && (
              <Reveal delay={260}>
                <div className="no-print rounded-2xl border border-saffron-400/25 bg-saffron-400/[0.06] p-5 backdrop-blur-2xl">
                  <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-saffron-300">
                    <MessageSquareQuote className="h-3.5 w-3.5" />
                    {t.feedback.heading}
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/60">
                    {t.feedback.sub}
                  </p>

                  {fbSubmitted && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-[11px] font-bold text-emerald-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t.feedback.recordedLabel} ·{" "}
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "inline h-3 w-3",
                              i < fbSubmitted.rating ? "fill-saffron-400 text-saffron-400" : "text-white/20"
                            )}
                          />
                        ))}
                        <br />
                        <span className="font-semibold text-emerald-200/80">
                          {fbSubmitted.at
                            ? t.feedback.recordedNote(
                                new Date(fbSubmitted.at).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              )
                            : t.feedback.thankYou}
                        </span>
                      </span>
                    </p>
                  )}

                  <div className="mt-4">
                    <p className="text-[10.5px] font-semibold text-white/45">{t.feedback.rateLabel}</p>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          aria-label={`${star} star${star === 1 ? "" : "s"}`}
                          onMouseEnter={() => setFbHover(star)}
                          onMouseLeave={() => setFbHover(0)}
                          onClick={() => setFbRating(star)}
                          className="active:scale-90 transition-transform duration-150"
                        >
                          <Star
                            className={cn(
                              "h-7 w-7 transition-colors duration-150",
                              (fbHover || fbRating) >= star
                                ? "fill-saffron-400 text-saffron-400"
                                : "text-white/25"
                            )}
                          />
                        </button>
                      ))}
                      {fbRating > 0 && (
                        <span className="ml-2 text-[11px] font-bold text-saffron-300">
                          {fbRating}/5
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label
                      htmlFor="feedback-comment"
                      className="text-[10.5px] font-semibold text-white/45"
                    >
                      {t.feedback.commentLabel}
                    </label>
                    <textarea
                      id="feedback-comment"
                      value={fbComment}
                      onChange={(e) => setFbComment(e.target.value)}
                      rows={3}
                      maxLength={600}
                      placeholder={t.feedback.commentPlaceholder}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-ink-900/60 px-3 py-2.5 text-[11.5px] font-medium text-white placeholder:text-white/25 transition-all duration-300 focus:border-saffron-400/60 focus:outline-none"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSendFeedback}
                      disabled={fbRating < 1 || isSendingFeedback}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-saffron-400 px-4 py-2.5 text-[11px] font-extrabold text-ink-950 transition-all duration-300 hover:bg-saffron-300 active:scale-[0.97] disabled:opacity-50"
                    >
                      {isSendingFeedback ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className="h-3.5 w-3.5" />
                      )}
                      {isSendingFeedback
                        ? t.feedback.submitting
                        : fbSubmitted
                          ? t.feedback.update
                          : t.feedback.submit}
                    </button>
                    <p className="text-[10px] leading-relaxed text-white/30">
                      {t.feedback.privacy}
                    </p>
                  </div>

                  {feedbackError && (
                    <p role="alert" className="mt-2 text-[10.5px] font-semibold text-rose-300">
                      {feedbackError}
                    </p>
                  )}
                </div>
              </Reveal>
            )}
          </div>
        )}
      </main>

      <footer className="no-print border-t border-white/10 py-5">
        <p className="mx-auto max-w-3xl px-5 text-center text-[10.5px] leading-relaxed text-white/35">
          {t.footer.note}
        </p>
      </footer>
    </div>
  );
}
