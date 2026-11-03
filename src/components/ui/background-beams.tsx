import { cn } from "@/lib/utils";

/**
 * Aceternity-style background beams: animated SVG light trails.
 * Decorative only; hidden from assistive tech and disabled under reduced motion.
 */
export function BackgroundBeams({ className }: { className?: string }) {
  const beams = [
    { x1: "0%", y1: "20%", x2: "100%", y2: "80%", delay: "0s", width: 1.1 },
    { x1: "0%", y1: "45%", x2: "100%", y2: "55%", delay: "1.2s", width: 0.7 },
    { x1: "0%", y1: "70%", x2: "100%", y2: "30%", delay: "2.4s", width: 1.3 },
    { x1: "20%", y1: "0%", x2: "80%", y2: "100%", delay: "0.6s", width: 0.8 },
    { x1: "40%", y1: "0%", x2: "60%", y2: "100%", delay: "1.8s", width: 1 },
  ];

  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="sentinel-beam-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(96,145,250,0)" />
          <stop offset="50%" stopColor="rgba(96,145,250,0.65)" />
          <stop offset="100%" stopColor="rgba(96,145,250,0)" />
        </linearGradient>
      </defs>
      {beams.map((beam, index) => (
        <line
          key={index}
          x1={beam.x1}
          y1={beam.y1}
          x2={beam.x2}
          y2={beam.y2}
          stroke="url(#sentinel-beam-gradient)"
          strokeWidth={beam.width}
          strokeLinecap="round"
          strokeDasharray="12 18"
          className="beam-line"
          style={{ animationDelay: beam.delay }}
        />
      ))}
    </svg>
  );
}
