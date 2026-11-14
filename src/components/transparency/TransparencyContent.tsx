"use client";

import Link from "next/link";
import {
  Landmark,
  ArrowRight,
  Inbox,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Timer,
  Scale,
  Star,
  MessageSquareQuote,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { LangProvider, useLang, LanguageToggle } from "@/components/ui/language";
import { MonthlyFlowChart, CategoryBars } from "@/components/transparency/TransparencyCharts";
import { transparency } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface TransparencyStats {
  total: number;
  disposed: number;
  inProgress: number;
  escalated: number;
  transferred: number;
  breached: number;
  disposalRate: number;
  avgResolutionDays: number;
  perCategory: Array<{ category: string; received: number; disposed: number; avgDays: number }>;
  perRegion: Array<{ region: string; received: number; disposed: number }>;
  monthly: Array<{ month: string; received: number; disposed: number }>;
  feedbackCount: number;
  avgFeedback: number;
  satisfactionRate: number;
  ratingMix: Array<{ stars: number; count: number }>;
}

function TransparencyContentBody({ s }: { s: TransparencyStats }) {
  const { lang } = useLang();
  const t = transparency[lang];

  const kpis = [
    { label: t.kpis.received.label, value: s.total, icon: Inbox, accent: "text-saffron-300", sub: t.kpis.received.sub },
    { label: t.kpis.disposed.label, value: s.disposed, icon: CheckCircle2, accent: "text-emerald-300", sub: t.kpis.disposed.sub },
    { label: t.kpis.disposalRate.label, value: s.disposalRate, suffix: "%", icon: Scale, accent: "text-white", sub: t.kpis.disposalRate.sub },
    { label: t.kpis.avgResolution.label, value: s.avgResolutionDays, suffix: " days", icon: Timer, accent: "text-white", sub: t.kpis.avgResolution.sub },
    { label: t.kpis.inProcess.label, value: s.inProgress, icon: Clock, accent: "text-white", sub: t.kpis.inProcess.sub },
    { label: t.kpis.breached.label, value: s.breached, icon: ShieldAlert, accent: "text-rose-300", sub: t.kpis.breached.sub },
  ];

  const maxCategory = Math.max(1, ...s.perCategory.map((c) => c.received));
  const maxRegion = Math.max(1, ...s.perRegion.map((r) => r.received));
  const maxStars = Math.max(1, ...s.ratingMix.map((r) => r.count));

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-ink-950 via-ink-900 to-ink-950 text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-ink-950/55 backdrop-blur-2xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
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
            <LanguageToggle overHero />
            <Link
              href="/track"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-white/80 transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              {t.header.trackCta}
              <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16 pt-12">
        {/* Hero */}
        <Reveal className="text-center">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-white/40">
            {t.hero.eyebrow}
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5.5vw,2.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            {t.hero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-white/60">
            {t.hero.sub}
          </p>
        </Reveal>

        {/* KPI grid */}
        <Reveal delay={140}>
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div
                  key={k.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
                      {k.label}
                    </p>
                    <Icon className={`h-3.5 w-3.5 ${k.accent}`} />
                  </div>
                  <p className="mt-2 font-display text-[clamp(1.5rem,3vw,1.9rem)] font-extrabold leading-none tracking-[-0.03em] text-white">
                    <CountUp value={k.value} suffix={k.suffix ?? ""} />
                  </p>
                  <p className="mt-1.5 text-[10px] font-medium text-white/35">{k.sub}</p>
                </div>
              );
            })}
          </div>
        </Reveal>

        {/* Monthly flow */}
        <Reveal delay={80}>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                {t.monthly.heading}
              </p>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-saffron-400" /> {t.monthly.received}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t.monthly.disposed}
                </span>
              </div>
            </div>
            <div className="mt-3 h-[240px]">
              <MonthlyFlowChart data={s.monthly} />
            </div>
          </div>
        </Reveal>

        {/* Category + region */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Reveal delay={80}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                {t.categories.heading}
              </p>
              <div className="mt-4">
                <CategoryBars data={s.perCategory} max={maxCategory} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                {t.regions.heading}
              </p>
              <div className="mt-4 space-y-3">
                {s.perRegion.map((r) => (
                  <div key={r.region}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[11.5px] font-bold text-white">
                        {r.region}
                        {t.regions.regionSuffix}
                      </p>
                      <p className="shrink-0 text-[10.5px] font-semibold text-white/40">
                        {t.regions.disposedOf(r.disposed, r.received)}
                      </p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-300"
                        style={{
                          width: `${Math.max(3, Math.round((r.received / maxRegion) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/30">
                {t.regions.escalatedNote(s.escalated, s.transferred)}
              </p>
            </div>
          </Reveal>
        </div>

        {/* Quality of redressal — the citizen feedback loop, published */}
        <Reveal delay={80}>
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                <MessageSquareQuote className="h-3.5 w-3.5 text-saffron-300" />
                {t.quality.heading}
              </p>
            </div>
            <p className="mt-1.5 max-w-2xl text-[11.5px] leading-relaxed text-white/45">
              {t.quality.sub}
            </p>

            {s.feedbackCount === 0 ? (
              <p className="mt-4 rounded-xl border border-white/10 bg-ink-900/40 px-4 py-3 text-[11px] leading-relaxed text-white/40">
                {t.quality.empty}
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                      {t.quality.avgLabel}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 font-display text-[22px] font-extrabold leading-none text-white">
                      {s.avgFeedback.toFixed(1)}
                      <Star className="h-4 w-4 fill-saffron-400 text-saffron-400" />
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                      {t.quality.satisfactionLabel}
                    </p>
                    <p className="mt-1 font-display text-[22px] font-extrabold leading-none text-emerald-300">
                      {s.satisfactionRate}%
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-ink-900/40 p-3.5">
                    <p className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                      {t.quality.countLabel}
                    </p>
                    <p className="mt-1 font-display text-[22px] font-extrabold leading-none text-white">
                      {s.feedbackCount}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-[9.5px] font-bold uppercase tracking-[0.12em] text-white/40">
                  {t.quality.distributionLabel}
                </p>
                <div className="mt-2 space-y-1.5">
                  {s.ratingMix.map((r) => (
                    <div key={r.stars} className="flex items-center gap-2.5">
                      <span className="flex w-12 shrink-0 items-center justify-end gap-0.5 text-[10.5px] font-bold text-white/60">
                        {r.stars}
                        <Star className="h-2.5 w-2.5 fill-saffron-400 text-saffron-400" />
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-saffron-500 to-saffron-300"
                          style={{ width: `${Math.round((r.count / maxStars) * 100)}%` }}
                        />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] font-semibold tabular-nums text-white/40">
                        {r.count}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal delay={80}>
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-saffron-400/25 bg-saffron-400/[0.07] p-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-display text-[14px] font-extrabold tracking-tight text-white">
                {t.cta.title}
              </p>
              <p className="mt-0.5 text-[11.5px] text-white/55">{t.cta.sub}</p>
            </div>
            <Link
              href="/track"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-saffron-400 px-4 py-2.5 text-[11.5px] font-extrabold text-ink-950 transition-all duration-300 hover:scale-[1.02] hover:bg-saffron-300 active:scale-[0.97]"
            >
              {t.cta.button}
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-white/10 py-5">
        <p className="mx-auto max-w-5xl px-5 text-center text-[10.5px] leading-relaxed text-white/35">
          {t.footer.note}
        </p>
      </footer>
    </div>
  );
}

/**
 * Public transparency disclosure, bilingual (EN | हिं). The stats are
 * computed server-side and passed as plain data; the narrative around them
 * switches on the visitor's locally-persisted language preference.
 */
export function TransparencyContent({ stats }: { stats: TransparencyStats }) {
  return (
    <LangProvider>
      <TransparencyContentBody s={stats} />
    </LangProvider>
  );
}
