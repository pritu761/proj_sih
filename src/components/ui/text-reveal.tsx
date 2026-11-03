import { cn } from "@/lib/utils";

/**
 * Word-by-word reveal: words fade and rise into place.
 * Pure CSS, no runtime animation library.
 */
export function TextReveal({
  text,
  className,
  delayBase = 0,
}: {
  text: string;
  className?: string;
  delayBase?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span className={cn("inline", className)}>
      {words.map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="inline-block animate-rise opacity-0"
          style={{ animationDelay: `${delayBase + index * 90}ms` }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </span>
  );
}
