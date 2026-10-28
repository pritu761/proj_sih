"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

interface CountUpProps {
  value: number;
  /** Animation length in ms. */
  duration?: number;
  /** Fraction digits to render. */
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  style?: CSSProperties;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

function reducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Animates a number from its previous value to the next one.
 * Renders the final value immediately for reduced-motion users and on the server.
 */
export function CountUp({
  value,
  duration = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
  style,
}: CountUpProps) {
  const [display, setDisplay] = useState(value);
  const current = useRef(value);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const from = current.current;
    const to = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    if (reducedMotion() || duration <= 0) {
      current.current = to;
      setDisplay(to);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const next = from + (to - from) * easeOutCubic(progress);
      current.current = next;
      setDisplay(next);
      if (progress < 1) {
        frame.current = window.requestAnimationFrame(tick);
      } else {
        current.current = to;
        setDisplay(to);
      }
    };

    frame.current = window.requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <span className={className} style={style}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
