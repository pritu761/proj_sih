import { cn } from "@/lib/utils";

const RADIUS = 16;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // 100.53 — matches the .ring-fill keyframes

/**
 * Compact animated progress ring. The arc sweeps from zero on mount
 * (pure CSS via .ring-fill); reduced-motion users see the final value.
 */
export function ProgressRing({
  value,
  size = 44,
  stroke = 3.5,
  color,
  trackClassName = "stroke-white/10",
  className,
  delay = 0,
  children,
}: {
  /** Percentage 0-100. */
  value: number;
  size?: number;
  stroke?: number;
  color: string;
  trackClassName?: string;
  className?: string;
  delay?: number;
  children?: React.ReactNode;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const target = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className={cn("relative inline-flex shrink-0 items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle cx="18" cy="18" r={RADIUS} fill="none" strokeWidth={stroke} className={trackClassName} />
        <circle
          cx="18"
          cy="18"
          r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          className="ring-fill"
          style={{ "--ring-target": target, animationDelay: `${delay}ms` } as React.CSSProperties}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}
