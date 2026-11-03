"use client";

import { useEffect, useRef, useState } from "react";
import { BackgroundBeams } from "@/components/ui/background-beams";

/**
 * Login ambient layer: floating orbs, orbit rings and beams with a gentle
 * mouse parallax. Decorative only; parallax is pointer-driven and skipped
 * for touch devices and reduced motion.
 */
export function HeroAmbient() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const onMove = (e: PointerEvent) => {
      if (frame.current !== null) return;
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        // Normalized -1..1 from viewport center, damped.
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setOffset({ x: nx, y: ny });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, []);

  // Parallax is strongest for the near orbs, subtle for the far rings.
  const px = (depth: number) => `translate3d(${(-offset.x * depth).toFixed(1)}px, ${(-offset.y * depth).toFixed(1)}px, 0)`;

  return (
    <>
      {/* Parallax wrapper → CSS float animation on the inner node (transforms don't fight) */}
      <div className="pointer-events-none absolute inset-0 transition-transform duration-500 ease-out" style={{ transform: px(14) }} aria-hidden="true">
        <div className="animate-float-slow absolute -left-40 top-24 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(59,118,246,0.16),transparent_68%)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out" style={{ transform: px(26) }} aria-hidden="true">
        <div className="animate-float-slower absolute -bottom-44 -right-40 h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle,rgba(245,158,11,0.1),transparent_66%)]" />
      </div>

      <div className="pointer-events-none absolute inset-0 transition-transform duration-700 ease-out" style={{ transform: px(8) }} aria-hidden="true">
        <div className="animate-spin-slow absolute right-[12%] top-[12%] h-64 w-64 rounded-full border border-white/[0.06]" style={{ animationDuration: "64s" }}>
          <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-saffron-300/70" />
        </div>
        <div className="animate-spin-slow absolute bottom-[6%] right-[8%] h-[22rem] w-[22rem] rounded-full border border-white/[0.05]" style={{ animationDirection: "reverse", animationDuration: "76s" }}>
          <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand-300/60" />
        </div>
      </div>

      <BackgroundBeams className="z-0 opacity-25 motion-reduce:opacity-10" />
    </>
  );
}
