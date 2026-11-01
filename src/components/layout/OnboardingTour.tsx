"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  body: string;
  target?: string; // CSS selector
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to the AICTE Sentinel workspace",
    body: "This console is the single source of truth for every grievance routed across AICTE bureaus and regional offices. Let's take a quick tour of the tools you'll use daily.",
  },
  {
    title: "Command centre",
    body: "The Dashboard surfaces the live KPI picture, the SLA countdown, and cross-bureau collision alerts that need your attention today.",
    target: "a[href='/']",
  },
  {
    title: "Officer Work Queue",
    body: "Files assigned to you appear here, alongside the bureau backlog awaiting allocation. Pick up unassigned files with one click.",
    target: "a[href='/workqueue']",
  },
  {
    title: "Hearing Calendar",
    body: "Standing Grievance Committee sittings across bureaus. Reschedule a hearing and the case workspace, public tracker and weekly digest all stay in sync.",
    target: "a[href='/calendar']",
  },
  {
    title: "Case Explorer & Institutions",
    body: "Drill into any grievance, its verification trail, document vault, complainant history and inter-bureau coordination thread.",
    target: "a[href='/cases']",
  },
  {
    title: "Public tracker & weekly digest",
    body: "Citizens track grievances at /track without sign-in; the Reports workspace ships a weekly executive PDF digest with the bureau scorecard.",
    target: "a[href='/reports']",
  },
];

const STORAGE_KEY = "aicte-sentinel-tour-seen";

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [highlight, setHighlight] = useState<DOMRect | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) !== "1") {
        setOpen(true);
      }
    } catch {
      /* storage unavailable — skip the tour */
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const target = STEPS[step].target;
    if (target) {
      const el = document.querySelector(target) as HTMLElement | null;
      if (el) {
        setHighlight(el.getBoundingClientRect());
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
    }
    setHighlight(null);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => {
      const target = STEPS[step].target;
      if (target) {
        const el = document.querySelector(target) as HTMLElement | null;
        if (el) setHighlight(el.getBoundingClientRect());
      }
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [open, step]);

  const finish = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const next = () => {
    if (step === STEPS.length - 1) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const back = () => setStep((s) => Math.max(0, s - 1));

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Spotlight overlay */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <mask id="tour-spotlight">
            <rect width="100%" height="100%" fill="white" />
            {highlight && (
              <rect
                x={highlight.left - 6}
                y={highlight.top - 6}
                width={highlight.width + 12}
                height={highlight.height + 12}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(2,6,23,0.72)"
          mask="url(#tour-spotlight)"
        />
      </svg>

      {/* Highlight ring */}
      {highlight && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-saffron-400/80 ring-offset-2 ring-offset-transparent transition-all"
          style={{
            top: highlight.top - 6,
            left: highlight.left - 6,
            width: highlight.width + 12,
            height: highlight.height + 12,
          }}
        />
      )}

      {/* Card */}
      <div className="absolute bottom-6 left-1/2 w-[92vw] max-w-md -translate-x-1/2 rounded-2xl border border-white/10 bg-ink-900 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-saffron-400/15 text-saffron-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-saffron-300">
                Step {step + 1} of {STEPS.length}
              </p>
              <h3 className="font-display text-[14px] font-extrabold text-white">{current.title}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={finish}
            className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-[11.5px] leading-relaxed text-white/70">{current.body}</p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            disabled={step === 0}
            className="btn btn-secondary btn-sm disabled:opacity-40"
          >
            Back
          </button>
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors",
                  i === step ? "bg-saffron-400" : "bg-white/15"
                )}
              />
            ))}
          </div>
          <button type="button" onClick={next} className="btn btn-primary btn-sm">
            {isLast ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finish
              </>
            ) : (
              "Next"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
