"use client";

import { useEffect, useRef } from "react";
import { scrollProgress, scrollProgressTransform } from "@/lib/scroll-progress";

/**
 * Thin gradient progress rail pinned to the top of public pages.
 *
 * The first client render matches SSR exactly (`scaleX(0)`); the real value is
 * written straight to the node in a passive, rAF-throttled scroll listener so
 * no React state/re-render is involved. Transform-only keeps scrolling smooth.
 */
export function ScrollProgress() {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      bar.style.transform = scrollProgressTransform(
        scrollProgress(window.scrollY, doc.scrollHeight, doc.clientHeight)
      );
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="scroll-progress no-print" aria-hidden="true">
      <div
        ref={barRef}
        className="scroll-progress__bar"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
