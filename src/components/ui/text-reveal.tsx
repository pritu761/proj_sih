import { cn } from "@/lib/utils";

/**
 * Word-by-word reveal: words fade and rise into place.
 * Pure CSS, no runtime animation library.
 *
 * Visibility never depends on the animation running: words start fully
 * visible, and `animate-rise`'s `both` fill-mode only hides them while its
 * delay elapses. Props like `wordClassName` land on the inner span so effects
 * such as `bg-clip-text` gradients are self-contained per word (transformed
 * descendants cannot be relied on to participate in a parent's text clip).
 */
export function TextReveal({
  text,
  className,
  wordClassName,
  delayBase = 0,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delayBase?: number;
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span className={cn("inline", className)}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} className="inline-block animate-rise" style={{ animationDelay: `${delayBase + index * 90}ms` }}>
          <span className={cn("inline", wordClassName)}>
            {word}
            {index < words.length - 1 ? "\u00A0" : null}
          </span>
        </span>
      ))}
    </span>
  );
}
