import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Tone =
  | "neutral"
  | "blue"
  | "indigo"
  | "sky"
  | "amber"
  | "emerald"
  | "rose"
  | "violet"
  | "teal"
  | "slate";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 border-slate-200",
  blue: "bg-brand-50 text-brand-700 border-brand-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
  sky: "bg-sky-50 text-sky-700 border-sky-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
  teal: "bg-teal-50 text-teal-700 border-teal-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusTone: Record<string, Tone> = {
  PENDING: "amber",
  UNDER_PROCESS: "blue",
  DISPOSED: "emerald",
  TRANSFERRED: "violet",
  ESCALATED: "rose",
  OPEN: "rose",
  ACKNOWLEDGED: "amber",
  COORDINATED: "emerald",
  DISMISSED: "slate",
};

const statusLabel: Record<string, string> = {
  PENDING: "Pending",
  UNDER_PROCESS: "Under process",
  DISPOSED: "Disposed",
  TRANSFERRED: "Transferred",
  ESCALATED: "Escalated",
};

const bureauTone: Record<string, Tone> = {
  REGULATION_BUREAU: "indigo",
  PGRC: "sky",
  APPROVAL_BUREAU: "amber",
  SKILL_CELL: "teal",
  ALL: "slate",
};

const bureauLabel: Record<string, string> = {
  REGULATION_BUREAU: "RB",
  PGRC: "PGRC",
  APPROVAL_BUREAU: "AB",
  SKILL_CELL: "SDC",
  ALL: "HQ",
};

const priorityTone: Record<string, Tone> = {
  CRITICAL: "rose",
  HIGH: "amber",
  MEDIUM: "blue",
  LOW: "slate",
};

interface PillProps {
  children?: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  className?: string;
  title?: string;
}

export function Pill({ children, tone = "neutral", dot, icon: Icon, className, title }: PillProps) {
  return (
    <span
      title={title}
      className={cn(
        "badge border",
        tones[tone],
        dot && "badge-dot",
        className
      )}
    >
      {Icon ? <Icon className="h-3 w-3" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function StatusPill({
  status,
  className,
  dot = true,
}: {
  status: string;
  className?: string;
  dot?: boolean;
}) {
  return (
    <Pill tone={statusTone[status] ?? "neutral"} dot={dot} className={className}>
      {statusLabel[status] ?? status.replaceAll("_", " ")}
    </Pill>
  );
}

export function BureauPill({
  bureau,
  className,
  full = false,
}: {
  bureau: string;
  className?: string;
  full?: boolean;
}) {
  const label = bureauLabel[bureau] ?? bureau.replaceAll("_", " ");
  const fullLabel =
    bureau === "REGULATION_BUREAU"
      ? "Regulation Bureau"
      : bureau === "PGRC"
        ? "PGRC"
        : bureau === "APPROVAL_BUREAU"
          ? "Approval Bureau"
          : bureau === "SKILL_CELL"
            ? "Skill Development Cell"
            : label;

  return (
    <Pill
      tone={bureauTone[bureau] ?? "slate"}
      className={cn("font-bold", className)}
      title={fullLabel}
    >
      {full ? fullLabel : label}
    </Pill>
  );
}

export function PriorityPill({ priority, className }: { priority: string; className?: string }) {
  const tone = priorityTone[priority] ?? "slate";
  return (
    <Pill tone={tone} dot className={cn("font-bold uppercase tracking-wide", className)}>
      {priority}
    </Pill>
  );
}

export function SlaPill({
  breached,
  approaching,
  children,
  className,
}: {
  breached?: boolean;
  approaching?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Pill
      tone={breached ? "rose" : approaching ? "amber" : "emerald"}
      dot
      className={cn("font-bold", className)}
    >
      {children}
    </Pill>
  );
}

export function ConfidencePill({ confidence }: { confidence: string }) {
  const tone: Tone =
    confidence === "HIGH" ? "rose" : confidence === "MEDIUM" ? "amber" : "blue";
  return (
    <Pill tone={tone} className="uppercase tracking-wide font-bold">
      {confidence} confidence
    </Pill>
  );
}

export function ToneDot({ tone = "blue", className }: { tone?: Tone; className?: string }) {
  const map: Record<Tone, string> = {
    neutral: "bg-slate-400",
    blue: "bg-brand-500",
    indigo: "bg-indigo-500",
    sky: "bg-sky-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    violet: "bg-violet-500",
    teal: "bg-teal-500",
    slate: "bg-slate-400",
  };
  return <span className={cn("inline-block h-1.5 w-1.5 rounded-full", map[tone], className)} />;
}
