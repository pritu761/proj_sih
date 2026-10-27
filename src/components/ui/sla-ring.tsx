import { cn } from "@/lib/utils";

export function SlaRing({
  percent,
  days,
  breached,
  approaching,
  size = 108,
  label = "days left",
  className,
}: {
  percent: number;
  days: number;
  breached?: boolean;
  approaching?: boolean;
  size?: number;
  label?: string;
  className?: string;
}) {
  const safe = Math.max(0, Math.min(100, percent));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (safe / 100) * c;

  const color = breached ? "#dc2626" : approaching ? "#d97706" : "#059669";
  const id = breached ? "sla-rose" : approaching ? "sla-amber" : "sla-emerald";

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${safe.toFixed(0)}% of SLA timeline elapsed, ${Math.abs(days)} days ${days < 0 ? "overdue" : "remaining"}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.65" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--sla-track)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-[21px] font-extrabold leading-none tracking-tight"
          style={{ color }}
        >
          {breached ? "−" : ""}
          {Math.abs(days)}
        </span>
        <span className="mt-0.5 text-[8.5px] font-bold uppercase tracking-[0.1em] text-slate-400">
          {days < 0 ? "days over" : label}
        </span>
        <span className="mt-px text-[8.5px] font-semibold" style={{ color }}>
          {safe.toFixed(0)}% elapsed
        </span>
      </div>
    </div>
  );
}
