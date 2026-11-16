/**
 * Pure scroll-progress math shared by the public-site progress bar.
 *
 * Kept free of DOM/React so it can be unit tested in the node environment and
 * reused by any future surface. The bar itself only ever writes `transform`,
 * so scrolling stays on the compositor.
 */

/** Fraction of the document scrolled, clamped to [0, 1]. */
export function scrollProgress(
  scrollY: number,
  scrollHeight: number,
  clientHeight: number
): number {
  if (
    !Number.isFinite(scrollY) ||
    !Number.isFinite(scrollHeight) ||
    !Number.isFinite(clientHeight)
  ) {
    return 0;
  }
  // A non-positive viewport (or a negative document height) is degenerate and
  // cannot represent a real scroll range.
  if (clientHeight <= 0 || scrollHeight < 0) return 0;
  const scrollable = scrollHeight - clientHeight;
  if (scrollable <= 0) return 0;
  const ratio = scrollY / scrollable;
  if (ratio <= 0) return 0;
  if (ratio >= 1) return 1;
  return ratio;
}

/**
 * Stable transform string for a progress value. Rounding to three decimals
 * avoids long floating-point strings on every rAF tick.
 */
export function scrollProgressTransform(progress: number): string {
  const safe = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return `scaleX(${Math.round(safe * 1000) / 1000})`;
}
