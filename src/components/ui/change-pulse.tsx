"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Gives a one-shot `.animate-verified-pop` to a pill only when its watched
 * value changes into an active (critical) state. The first render — including
 * SSR — never animates, so hydration output is identical on both sides.
 * Reduced-motion users are skipped here and by the global
 * `.animate-verified-pop` opt-out in globals.css.
 */
export function ChangePulse({
  watch,
  active = true,
  className,
  children,
}: {
  watch: string;
  active?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const previous = useRef(watch);
  const [pulsing, setPulsing] = useState(false);

  useEffect(() => {
    const changed = previous.current !== watch;
    previous.current = watch;
    if (!changed || !active) return;
    if (
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    setPulsing(true);
    const timer = window.setTimeout(() => setPulsing(false), 550);
    return () => window.clearTimeout(timer);
  }, [watch, active]);

  return (
    <span className={cn("inline-flex", pulsing && "animate-verified-pop", className)}>
      {children}
    </span>
  );
}
