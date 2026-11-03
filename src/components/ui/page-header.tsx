import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[12px]">
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
  title,
  icon: Icon,
  actions,
  crumbs,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  crumbs?: Crumb[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-3.5", className)}>
      {crumbs && <Breadcrumbs items={crumbs} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {Icon && (
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-50 text-slate-500 shadow-xs sm:flex dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.03] dark:text-slate-300">
              <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden />
            </div>
          )}
          <h1 className="font-display text-[24px] font-extrabold leading-[1.12] tracking-[-0.025em] text-slate-950 sm:text-[26px]">
            {title}
          </h1>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        )}
      </div>
    </div>
  );
}
