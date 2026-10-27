import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
        <Icon className="h-6 w-6 text-slate-300" />
      </div>
      <h3 className="font-display text-[14px] font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[12px] leading-relaxed text-slate-500">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
