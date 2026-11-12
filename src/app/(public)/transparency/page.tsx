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
} from "lucide-react";
import repository from "@/lib/services/repository";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { CountUp } from "@/components/ui/count-up";
import { Reveal } from "@/components/ui/reveal";
import { MonthlyFlowChart, CategoryBars } from "@/components/transparency/TransparencyCharts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Public Transparency | AICTE Sentinel",
  description:
    "Statutory disclosure of AICTE grievance disposal: volumes, disposal rate, average resolution time and regional office performance. No sign-in required.",
};

export default function TransparencyPage() {
  const s = repository.getPublicTransparencyStats();

  const kpis = [
    { label: "Grievances received", value: s.total, icon: Inbox, accent: "text-saffron-300", sub: "since the registry opened" },
    { label: "Disposed", value: s.disposed, icon: CheckCircle2, accent: "text-emerald-300", sub: "redressal completed" },
    { label: "Disposal rate", value: s.disposalRate, suffix: "%", icon: Scale, accent: "text-white", sub: "of all registered cases" },
    { label: "Avg resolution", value: s.avgResolutionDays, suffix: " days", icon: Timer, accent: "text-white", sub: "received → disposed" },
    { label: "In process", value: s.inProgress, icon: Clock, accent: "text-white", sub: "open across bureaus" },
    { label: "SLA breached", value: s.breached, icon: ShieldAlert, accent: "text-rose-300", sub: "past statutory deadline" },
  ];

  const maxCategory = Math.max(1, ...s.perCategory.map((c) => c.received));
  const maxRegion = Math.max(1, ...s.perRegion.map((r) => r.received));

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
              Government of India
            </span>
            <Link
              href="/track"
              className="group inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3.5 py-1.5 text-[11px] font-bold text-white/80 transition-all duration-300 hover:border-white/25 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              Track a grievance
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
            Statutory disclosure · Updated live
          </p>
          <h1 className="mt-3 font-display text-[clamp(1.9rem,5.5vw,2.9rem)] font-extrabold leading-[1.04] tracking-[-0.04em]">
            The numbers behind every grievance.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[13px] leading-relaxed text-white/60">
            How much grievance traffic AICTE receives, how fast the Council disposes cases, and
            where the pressure sits — published openly, no sign-in required.
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
                Grievances received vs disposed · last 6 months
              </p>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-saffron-400" /> Received
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Disposed
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
                Disposal by grievance category
              </p>
              <div className="mt-4">
                <CategoryBars data={s.perCategory} max={maxCategory} />
              </div>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-white/50">
                Volume by regional office
              </p>
              <div className="mt-4 space-y-3">
                {s.perRegion.map((r) => (
                  <div key={r.region}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="truncate text-[11.5px] font-bold text-white">
                        {r.region} region
                      </p>
                      <p className="shrink-0 text-[10.5px] font-semibold text-white/40">
                        {r.disposed}/{r.received} disposed
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
                {s.escalated} escalated to the competent authority · {s.transferred} transferred
                between bureaus for coordinated handling.
              </p>
            </div>
          </Reveal>
        </div>

        {/* CTA */}
        <Reveal delay={80}>
          <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-2xl border border-saffron-400/25 bg-saffron-400/[0.07] p-5 text-center sm:flex-row sm:text-left">
            <div>
              <p className="font-display text-[14px] font-extrabold tracking-tight text-white">
                Filed a grievance with the Council?
              </p>
              <p className="mt-0.5 text-[11.5px] text-white/55">
                Follow its journey through the statutory process with the registry number on your
                acknowledgement slip.
              </p>
            </div>
            <Link
              href="/track"
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-saffron-400 px-4 py-2.5 text-[11.5px] font-extrabold text-ink-950 transition-all duration-300 hover:scale-[1.02] hover:bg-saffron-300 active:scale-[0.97]"
            >
              Track your grievance
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>
      </main>

      <footer className="border-t border-white/10 py-5">
        <p className="mx-auto max-w-5xl px-5 text-center text-[10.5px] leading-relaxed text-white/35">
          AICTE public grievance disclosure · Demonstration deployment seeded with synthetic data.
        </p>
      </footer>
    </div>
  );
}
