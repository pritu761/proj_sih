import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  action,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "py-7" : "py-12",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center border border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-50 text-slate-400 dark:border-white/10 dark:from-white/[0.07] dark:to-white/[0.03] dark:text-slate-400",
          compact ? "h-9 w-9 rounded-xl" : "h-12 w-12 rounded-2xl"
        )}
      >
        <Icon className={compact ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2} aria-hidden />
      </div>
      <p
        className={cn(
          "mt-3 font-semibold text-slate-600 dark:text-slate-300",
          compact ? "text-[12px]" : "text-[13px]"
        )}
      >
        {title}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
