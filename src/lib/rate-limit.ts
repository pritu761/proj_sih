/**
 * Lightweight in-memory rate limiter for the credentials sign-in flow.
 *
 * This is intentionally dependency-free and process-local: it protects a single
 * deployment instance against brute-force attempts without requiring Redis or
 * another external service. For multi-instance deployments the same interface
 * can be backed by a shared store later.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as unknown as {
  loginRateLimitBuckets?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  (globalStore.loginRateLimitBuckets ??= new Map());

/** Maximum failed attempts allowed inside the window. */
export const LOGIN_MAX_ATTEMPTS = 10;
/** Sliding window duration (15 minutes). */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  retryAfterMs: number;
} {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    return { allowed: true, retryAfterMs: 0 };
  }
  if (bucket.count >= LOGIN_MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return;
  }

  bucket.count += 1;
}

export function clearLoginFailures(key: string): void {
  buckets.delete(key);
}
