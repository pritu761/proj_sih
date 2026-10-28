import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  // timingSafeEqual requires equal lengths. Compare a padded buffer when they
  // differ so the length itself does not short-circuit the check.
  if (bufferA.length !== bufferB.length) {
    const length = Math.max(bufferA.length, bufferB.length);
    const paddedA = Buffer.alloc(length);
    const paddedB = Buffer.alloc(length);
    bufferA.copy(paddedA);
    bufferB.copy(paddedB);
    timingSafeEqual(paddedA, paddedB);
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Shared authorization for scheduled `/api/cron/*` handlers.
 *
 * - Accepts `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) or `?key=`.
 * - Fails closed in production when `CRON_SECRET` is not configured.
 * - Allows unauthenticated local development when no secret is configured, so
 *   `npm run dev` can trigger jobs manually.
 */
export function isAuthorizedCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const provided = authHeader.slice("Bearer ".length).trim();
    if (provided && constantTimeEquals(provided, secret)) return true;
  }

  const keyParam = req.nextUrl.searchParams.get("key");
  if (keyParam && constantTimeEquals(keyParam, secret)) return true;

  return false;
}
