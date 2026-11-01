"use server";

import repository from "@/lib/services/repository";
import { TrackCaseSchema } from "@/lib/validations";
import {
  checkLoginRateLimit,
  recordLoginFailure,
} from "@/lib/rate-limit";

/**
 * Citizen status-tracking channel (CPGRAMS-style ticke tracking). No session
 * is required; lookups are throttled per registry number to blunt enumeration,
 * and the response is limited to a deliberate public-safe projection built in
 * `repository.getPublicCaseStatus`.
 */
const TRACK_PREFIX = "public-track:";

export async function trackCaseAction(registryNo: string) {
  const parsed = TrackCaseSchema.safeParse({ registryNo });
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const throttleKey = `${TRACK_PREFIX}${parsed.data.registryNo}`;
  const limit = checkLoginRateLimit(throttleKey);
  if (!limit.allowed) {
    return {
      success: false as const,
      error: `Too many lookups for this registry number. Please retry in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
    };
  }

  const tracking = repository.getPublicCaseStatus(parsed.data.registryNo);
  if (!tracking) {
    recordLoginFailure(throttleKey);
    return {
      success: false as const,
      error: `No grievance is registered under ${parsed.data.registryNo}. Check the registry number in your acknowledgement slip.`,
    };
  }

  return {
    success: true as const,
    tracking,
    checkedAt: new Date().toISOString(),
  } as const;
}
