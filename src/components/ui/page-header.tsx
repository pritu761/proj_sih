import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

const toneStyles: Record<string, string> = {
  blue: "from-brand-500/18 to-brand-500/5 text-brand-700",
  amber: "from-amber-500/18 to-amber-500/5 text-amber-700",
  rose: "from-rose-500/18 to-rose-500/5 text-rose-700",
  emerald: "from-emerald-500/18 to-emerald-500/5 text-emerald-700",
  violet: "from-violet-500/18 to-violet-500/5 text-violet-700",
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />}
          {item.href ? (
            <Link
              href={item.href}
              className="font-medium text-slate-500 transition-colors hover:text-brand-700"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  tone = "blue",
  actions,
  crumbs,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: keyof typeof toneStyles;
  actions?: React.ReactNode;
  crumbs?: Crumb[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {crumbs && <Breadcrumbs items={crumbs} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3.5">
          {Icon && (
            <div
              className={cn(
                "hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-gradient-to-br shadow-sm sm:flex",
                toneStyles[tone]
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={2.1} aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
            <h1 className="font-display text-[25px] font-extrabold leading-[1.12] tracking-[-0.025em] text-slate-950 sm:text-[28px]">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-[12.5px] font-medium leading-relaxed text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        )}
      </div>
    </div>
  );
}
