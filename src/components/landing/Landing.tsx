"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Sparkles,
  Timer,
  Network,
  ScrollText,
  ScanLine,
  Lock,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  FileText,
  Users,
  CheckCircle2,
  Landmark,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { TextReveal } from "@/components/ui/text-reveal";
import { CountUp } from "@/components/ui/count-up";
import { ProgressRing } from "@/components/ui/progress-ring";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Reveal, useInViewOnce } from "@/components/ui/reveal";
import { LangProvider, useLang, LanguageToggle } from "@/components/ui/language";
import { landing } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/* ============================================================================
   Locale-independent presentation data (copy lives in @/lib/i18n)
   ========================================================================== */

/** Statutory window days, order matches landing[lang].sla.cats. */
const SLA_DAYS = [7, 15, 30, 45, 60, 30, 30, 45];

/** Capability-tile icons and accent tones, order matches landing[lang].cap.tiles. */
const TILE_ICONS = [Sparkles, Timer, Network, ScrollText, Lock, ScanLine];
const TILE_TONES = [
  "bg-brand-400/20 text-brand-600 dark:text-brand-300",
  "bg-rose-400/20 text-rose-600 dark:text-rose-300",
  "bg-amber-400/20 text-amber-600 dark:text-amber-300",
  "bg-emerald-400/20 text-emerald-600 dark:text-emerald-300",
  "bg-violet-400/20 text-violet-600 dark:text-violet-300",
  "bg-sky-400/20 text-sky-600 dark:text-sky-300",
];
const TILE_SPANS = ["md:col-span-2", undefined, undefined, undefined, undefined, undefined];
const TILE_DELAYS = [80, 160, 120, 200, 240, 280];

/** How-it-works step icons, order matches landing[lang].how.steps. */
const HOW_ICONS = [ScrollText, Timer, CheckCircle2];

/** Immutable-timeline mini-rows (tile 4): icons and mono timestamps. */
const TIMELINE_ROW_ICONS = [FileText, Users, CheckCircle2];
const TIMELINE_ROW_TIMES = ["09:42", "Mon", "SLA ✓"];

/** Access card icons, order matches landing[lang].access.cards. */
const ACCESS_ICONS = [ShieldCheck, ScanLine];

/* ============================================================================
   Frosted-glass sticky nav
   ========================================================================== */

function LandingNav({ scrolled }: { scrolled: boolean }) {
  const { lang } = useLang();
  const t = landing[lang].nav;
  // While the nav floats over the always-dark hero it needs light text;
  // once the frosted bar engages it follows the page theme.
  const overHero = !scrolled;
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled
          ? "border-b border-slate-200/70 bg-white/70 shadow-[0_8px_30px_-18px_rgba(6,10,20,0.35)] backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-ink-950/60 dark:shadow-[0_8px_30px_-18px_rgba(0,0,0,0.8)]"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-7">
        <Link href="/" className="group flex items-center gap-2.5" aria-label={t.homeAria}>
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-gradient-to-br from-saffron-400 to-saffron-600 shadow-[0_6px_16px_-6px_rgba(245,158,11,0.7)] transition-transform duration-300 group-hover:scale-105">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-950" fill="currentColor" aria-hidden>
              <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
            </svg>
          </div>
          <span
            className={cn(
              "font-display text-[14px] font-extrabold tracking-tight",
              overHero ? "text-white" : "text-slate-900 dark:text-white"
            )}
          >
            AICTE <span className="text-saffron-600 dark:text-saffron-400">Sentinel</span>
          </span>
        </Link>

        <div
          className={cn(
            "hidden items-center gap-7 text-[12px] font-semibold transition-colors md:flex",
            overHero
              ? "text-slate-300"
              : "text-slate-600 dark:text-slate-300"
          )}
        >
          <a href="#capabilities" className="transition-colors hover:text-white dark:hover:text-white">
            {t.capabilities}
          </a>
          <a href="#sla" className="transition-colors hover:text-white dark:hover:text-white">
            {t.statutoryClock}
          </a>
          <a href="#how" className="transition-colors hover:text-white dark:hover:text-white">
            {t.how}
          </a>
          <a href="#faq" className="transition-colors hover:text-white dark:hover:text-white">
            {t.faq}
          </a>
          <Link href="/track" className="transition-colors hover:text-white dark:hover:text-white">
            {t.tracker}
          </Link>
          <Link href="/transparency" className="transition-colors hover:text-white dark:hover:text-white">
            {t.transparency}
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <LanguageToggle overHero={overHero} />
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              "group inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-bold shadow-[0_10px_24px_-10px_rgba(6,10,20,0.6)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.97]",
              overHero
                ? "bg-white text-ink-950 hover:bg-brand-50"
                : "bg-ink-950 text-white hover:bg-brand-700 dark:bg-white dark:text-ink-950 dark:hover:bg-brand-100"
            )}
          >
            {t.signIn}
            <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/* ============================================================================
   Bento feature tile
   ========================================================================== */

function Tile({
  icon: Icon,
  eyebrow,
  title,
  body,
  children,
  span,
  tone,
  delay,
}: {
  icon: typeof Sparkles;
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
  span?: string;
  tone: string;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className={span}>
      <div className="group panel relative h-full overflow-hidden rounded-[22px] p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_28px_70px_-30px_rgba(6,10,20,0.35)] sm:p-7">
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-opacity duration-700 opacity-40 group-hover:opacity-80",
            tone
          )}
          aria-hidden
        />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400">
            <Icon className={cn("h-3.5 w-3.5", tone.split(" ").pop())} />
            {eyebrow}
          </div>
          <h3 className="font-display text-[19px] font-extrabold leading-snug tracking-[-0.02em] text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="mt-2 max-w-md text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {body}
          </p>
          {children}
        </div>
      </div>
    </Reveal>
  );
}

/* ============================================================================
   Landing page
   ========================================================================== */

export function Landing() {
  return (
    <LangProvider>
      <LandingContent />
    </LangProvider>
  );
}

function LandingContent() {
  const { lang } = useLang();
  const t = landing[lang];
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const slaStats = useInViewOnce(0.5);

  return (
    <div className="relative">
      <LandingNav scrolled={scrolled} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[94vh] flex-col items-center justify-center overflow-hidden px-5 pb-24 pt-28 text-center sm:px-8">
        {/* hero-mesh + AICTE HQ backdrop, masked like the dashboard hero */}
        <div className="hero-mesh absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center opacity-25 mix-blend-luminosity contrast-125 dark:opacity-40 dark:brightness-105 dark:filter-none"
          style={{
            backgroundImage: "url('/images/aicte-hq.webp')",
            maskImage: "radial-gradient(ellipse 80% 62% at 50% 42%, black 30%, transparent 78%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 62% at 50% 42%, black 30%, transparent 78%)",
          }}
          aria-hidden="true"
        />
        <span className="hero-scan" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-4xl">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-300 backdrop-blur-xl">
              <Landmark className="h-3 w-3 text-saffron-400" />
              {t.hero.badge}
            </span>
          </Reveal>

          <h1 className="mt-6 font-display font-extrabold leading-[0.98] tracking-[-0.045em] text-white">
            <span className="block text-[clamp(2.9rem,8vw,6.25rem)]">
              <TextReveal key={lang} text={t.hero.line1} />
            </span>
            <span className="block text-[clamp(2.9rem,8vw,6.25rem)]">
              <TextReveal
                key={`${lang}-2`}
                text={t.hero.line2}
                delayBase={340}
                wordClassName="bg-gradient-to-r from-brand-400 via-violet-400 to-saffron-400 bg-clip-text text-transparent"
              />
            </span>
          </h1>

          <Reveal delay={620}>
            <p className="mx-auto mt-6 max-w-2xl text-[15px] leading-relaxed text-slate-300 sm:text-[16.5px]">
              {t.hero.sub}
            </p>
          </Reveal>

          <Reveal delay={760}>
            <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-brand-600 px-7 text-[13.5px] font-bold text-white shadow-[0_18px_44px_-14px_rgba(37,89,232,0.65)] transition-all duration-300 hover:scale-[1.03] hover:bg-brand-500 active:scale-[0.97]"
              >
                {t.hero.ctaCommand}
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/track"
                className="group inline-flex h-12 items-center gap-1.5 px-3 text-[13.5px] font-bold text-brand-300 transition-colors hover:text-white"
              >
                {t.hero.ctaTrack}
                <ArrowRight className="h-4 w-4 text-slate-400 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>

          <Reveal delay={880}>
            <p className="mt-7 text-[10.5px] font-medium text-slate-500">
              {t.hero.note}
            </p>
          </Reveal>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-500" aria-hidden>
          <ChevronDown className="h-5 w-5 animate-bounce" />
        </div>
      </section>

      {/* ── Stats band ───────────────────────────────────────────────────── */}
      <section className="relative border-y border-slate-200/70 bg-white/60 py-14 backdrop-blur-xl dark:border-white/10 dark:bg-ink-900/50">
        <div
          ref={slaStats.ref}
          className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 text-center sm:px-7 lg:grid-cols-4"
        >
          {t.stats.map((s, i) => (
            <div key={s.label} className={cn(i > 0 && "lg:border-l lg:border-slate-200/70 lg:dark:border-white/10")}>
              <p className="font-display text-[clamp(2.2rem,4.5vw,3.4rem)] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">
                <CountUp value={slaStats.visible ? s.value : 0} duration={1100} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-[12px] font-bold text-slate-700 dark:text-slate-200">{s.label}</p>
              <p className="mt-1 text-[10.5px] leading-relaxed text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Capabilities bento ───────────────────────────────────────────── */}
      <section id="capabilities" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="max-w-3xl font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white">
              {t.cap.h2a}
              <span className="block text-slate-400 dark:text-slate-500">{t.cap.h2b}</span>
            </h2>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
            {t.cap.tiles.map((tile, i) => {
              const Icon = TILE_ICONS[i];
              return (
                <Tile
                  key={tile.eyebrow}
                  icon={Icon}
                  tone={TILE_TONES[i]}
                  eyebrow={tile.eyebrow}
                  title={tile.title}
                  body={tile.body}
                  span={TILE_SPANS[i]}
                  delay={TILE_DELAYS[i]}
                >
                  {i === 0 && (
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                      <span className="rounded-lg border border-brand-200 bg-brand-50 px-2.5 py-1 text-[10.5px] font-bold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
                        Capitation Fee & Overcharging
                      </span>
                      <span className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-[10.5px] font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300">
                        PGRC
                      </span>
                      <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[10.5px] font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        HIGH
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10.5px] font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        87% confidence
                      </span>
                      <span className="text-[10px] italic text-slate-400">{t.cap.illustrative}</span>
                    </div>
                  )}
                  {i === 1 && (
                    <div className="mt-5 flex items-center gap-3.5">
                      <ProgressRing value={82} size={52} color="#dc2626" trackClassName="stroke-slate-200/70 dark:stroke-white/10">
                        <span className="font-display text-[11px] font-extrabold text-rose-600 dark:text-rose-300">82</span>
                      </ProgressRing>
                      <div>
                        <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{t.cap.watchlist}</p>
                        <p className="text-[10.5px] text-slate-400">{t.cap.watchlistSub}</p>
                      </div>
                    </div>
                  )}
                  {i === 2 && (
                    <div className="relative mt-5 h-14" aria-hidden>
                      <span className="absolute left-4 top-4 h-8 w-8 rounded-full border-2 border-amber-400/70" />
                      <span className="absolute left-10 top-4 h-8 w-8 rounded-full border-2 border-brand-400/70" />
                      <span className="absolute left-7 top-6 h-4 w-4 rounded-full bg-gradient-to-br from-saffron-400 to-brand-500 shadow-[0_0_18px_rgba(245,158,11,0.5)]" />
                    </div>
                  )}
                  {i === 3 && (
                    <ul className="mt-5 space-y-2.5" aria-hidden>
                      {t.cap.rows.map((label, r) => {
                        const RowIcon = TIMELINE_ROW_ICONS[r];
                        return (
                          <li key={label} className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-white/[0.06]">
                              <RowIcon className="h-3 w-3" />
                            </span>
                            <span className="font-medium">{label}</span>
                            <span className="ml-auto font-mono text-[10px] text-slate-400">{TIMELINE_ROW_TIMES[r]}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {i === 4 && (
                    <div className="mt-5 flex flex-wrap gap-1.5" aria-hidden>
                      {["ADMIN", "AUTHORITY", "RB", "PGRC", "AB", "RO"].map((r) => (
                        <span key={r} className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[9.5px] font-bold text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                  {i === 5 && (
                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-white/10 dark:bg-white/[0.04]">
                      <p className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        AICTE/PGRC/2026/00101
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{t.cap.underProcess}</p>
                    </div>
                  )}
                </Tile>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Statutory clock (dark full-bleed) ────────────────────────────── */}
      <section id="sla" className="relative scroll-mt-20 overflow-hidden px-5 py-28 sm:px-8">
        <div className="dark-surface absolute inset-0 bg-ink-950" aria-hidden />
        <BackgroundBeams className="opacity-60" />
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-brand-300/80">
              {t.sla.eyebrow}
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-white">
              {t.sla.h2}
            </h2>
            <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-slate-400">
              {t.sla.sub}
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {t.sla.cats.map((cat, i) => (
              <Reveal key={cat} delay={i * 60}>
                <div className="group rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-white/[0.07]">
                  <p className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-white">
                    {SLA_DAYS[i]}
                    <span className="ml-1 text-[11px] font-bold text-slate-400">{t.sla.days}</span>
                  </p>
                  <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-400">{cat}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Reveal>
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                {t.how.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white">
                {t.how.h2}
              </h2>
              <p className="mt-4 max-w-md text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t.how.sub}
              </p>
              <Link
                href="/transparency"
                className="group mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-300"
              >
                {t.how.link}
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Reveal>
          </div>

          <div className="space-y-4">
            {t.how.steps.map((step, i) => {
              const Icon = HOW_ICONS[i];
              return (
                <Reveal key={step.title} delay={i * 90}>
                  <div className="panel group flex gap-5 rounded-[22px] p-6 transition-all duration-500 hover:-translate-y-0.5">
                    <div className="flex flex-col items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 text-slate-700 shadow-inner transition-colors duration-500 group-hover:from-saffron-50 group-hover:text-saffron-600 dark:from-white/[0.06] dark:to-white/[0.02] dark:text-slate-300 dark:group-hover:from-saffron-400/15 dark:group-hover:text-saffron-400">
                        <Icon className="h-5 w-5" />
                      </div>
                      {i < t.how.steps.length - 1 && (
                        <span className="mt-3 w-px flex-1 bg-gradient-to-b from-slate-200 to-transparent dark:from-white/10" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                        {t.how.stepLabel} {i + 1}
                      </p>
                      <h3 className="mt-1 font-display text-[15.5px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {step.title}
                      </h3>
                      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="scroll-mt-20 px-5 pb-28 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <h2 className="text-center font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white">
              {t.faq.h2}
            </h2>
          </Reveal>
          <div className="mt-10 space-y-3">
            {t.faq.items.map((f, i) => (
              <Reveal key={f.q} delay={i * 55}>
                <details className="panel group rounded-2xl px-5 py-4 transition-colors duration-300 open:border-brand-200 dark:open:border-brand-400/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[13px] font-bold text-slate-900 dark:text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                    {f.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Access / final CTA ───────────────────────────────────────────── */}
      <section id="access" className="scroll-mt-20 px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="text-center font-display text-[clamp(1.9rem,4.5vw,3rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-slate-950 dark:text-white">
              {t.access.h2}
            </h2>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
            {t.access.cards.map((card, i) => {
              const Icon = ACCESS_ICONS[i];
              return (
                <Reveal key={card.title} delay={(i + 1) * 100}>
                  <Link
                    href={i === 0 ? "/login" : "/track"}
                    className={cn(
                      "group panel block h-full rounded-[22px] p-7 transition-all duration-500 hover:-translate-y-1",
                      i === 0
                        ? "hover:shadow-[0_28px_70px_-30px_rgba(37,89,232,0.4)]"
                        : "hover:shadow-[0_28px_70px_-30px_rgba(245,158,11,0.35)]"
                    )}
                  >
                    <div
                      className={cn(
                        "mb-4 flex h-11 w-11 items-center justify-center rounded-xl shadow-[0_10px_24px_-10px_rgba(6,10,20,0.5)]",
                        i === 0
                          ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white"
                          : "bg-gradient-to-br from-saffron-400 to-saffron-600 text-ink-950"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-display text-[18px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                      {card.title}
                    </h3>
                    <p className="mt-2 text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                      {card.body}
                    </p>
                    <span
                      className={cn(
                        "mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-bold",
                        i === 0 ? "text-brand-600 dark:text-brand-300" : "text-saffron-600 dark:text-saffron-400"
                      )}
                    >
                      {card.cta}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200/70 px-5 py-10 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-saffron-400 to-saffron-600">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-ink-950" fill="currentColor" aria-hidden>
                <path d="M12 1.8 3.6 5.4v5.5c0 5.2 3.5 9.7 8.4 11.3 4.9-1.6 8.4-6.1 8.4-11.3V5.4L12 1.8Zm0 3.1 5.6 2.4v3.6c0 3.6-2.3 6.8-5.6 8.1-3.3-1.3-5.6-4.5-5.6-8.1V7.3L12 4.9Zm-1 3.7v3.3H8.4l3.6 4.5 3.6-4.5H13V8.6h-2Z" />
              </svg>
            </div>
            <p className="text-[11.5px] font-bold text-slate-600 dark:text-slate-300">
              AICTE Sentinel
            </p>
          </div>

          <div className="flex items-center gap-6 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/track" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              {t.footer.tracker}
            </Link>
            <Link href="/transparency" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              {t.footer.transparency}
            </Link>
            <Link href="/login" className="transition-colors hover:text-slate-900 dark:hover:text-white">
              {t.footer.signIn}
            </Link>
          </div>

          <p className="text-[10px] text-slate-400">
            {t.footer.disclaimer}
          </p>
        </div>
      </footer>
    </div>
  );
}
