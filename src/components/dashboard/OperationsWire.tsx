import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

export interface WireItem {
  value: string;
  text: string;
  href: string;
  tone?: string;
}

export function OperationsWire({ items }: { items: WireItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Command brief"
      className="wire dark-surface relative flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-[0_18px_40px_-24px_rgba(6,10,20,0.7)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-500/60 to-transparent"
      />

      <div className="relative z-10 flex shrink-0 items-center gap-2.5 border-r border-white/10 bg-ink-950 px-3.5 py-3 sm:px-4">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
        </span>
        <Radio className="hidden h-3.5 w-3.5 text-saffron-400 sm:block" />
        <span className="hidden text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-300 sm:inline">
          Command brief
        </span>
        <span className="text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-300 sm:hidden">
          Brief
        </span>
      </div>

      <div className="wire-viewport relative min-w-0 flex-1 overflow-hidden">
        <div className="wire-track flex w-max">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="flex shrink-0 items-center gap-8 py-3 pl-4 pr-8 sm:pl-5"
            >
              {items.map((item) => (
                <Link
                  key={`${copy}-${item.text}`}
                  href={item.href}
                  tabIndex={copy === 1 ? -1 : undefined}
                  className="group flex items-center gap-2 whitespace-nowrap"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: item.tone ?? "#6091fa" }}
                  />
                  <span className="text-[10.5px] font-medium text-slate-400 transition-colors group-hover:text-slate-200">
                    <strong className="font-display text-[11.5px] font-extrabold tabular-nums text-white">
                      {item.value}
                    </strong>{" "}
                    {item.text}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>

      </div>

      <Link
        href="/reports"
        className="relative z-10 hidden shrink-0 items-center gap-1.5 border-l border-white/10 px-4 text-[10px] font-bold text-slate-400 transition-colors hover:bg-white/[0.04] hover:text-white md:flex"
      >
        Full brief
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </section>
  );
}
