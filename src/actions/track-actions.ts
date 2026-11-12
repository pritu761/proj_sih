"use server";

import repository from "@/lib/services/repository";
import { TrackCaseSchema, SubscribeCaseWatchSchema } from "@/lib/validations";
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
const WATCH_PREFIX = "public-watch:";

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

  const watchers = await repository.getPublicWatcherCount(parsed.data.registryNo);

  return {
    success: true as const,
    tracking,
    watchers,
    checkedAt: new Date().toISOString(),
  } as const;
}

/**
 * Public watch subscription for a tracked grievance ("email me when the
 * status changes"). Throttled like the tracker itself; stores only the
 * registry number and the email — no session, no personal profile.
 */
export async function subscribeCaseWatchAction(data: {
  registryNo: string;
  email: string;
}) {
  const parsed = SubscribeCaseWatchSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const throttleKey = `${WATCH_PREFIX}${parsed.data.registryNo}`;
  const limit = checkLoginRateLimit(throttleKey);
  if (!limit.allowed) {
    return {
      success: false as const,
      error: `Too many requests for this registry number. Please retry in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
    };
  }

  try {
    const count = await repository.subscribePublicWatcher(
      parsed.data.registryNo,
      parsed.data.email
    );
    if (count === null) {
      return {
        success: false as const,
        error: `No grievance is registered under ${parsed.data.registryNo}.`,
      };
    }
    return { success: true as const, watchers: count };
  } catch {
    return {
      success: false as const,
      error: "Could not save the subscription right now. Please try again later.",
    };
  }
}
