"use server";

import repository from "@/lib/services/repository";
import { WatcherDigestLookupSchema } from "@/lib/validations";
import {
  checkLoginRateLimit,
  recordLoginFailure,
} from "@/lib/rate-limit";

/**
 * Citizen-facing in-app watcher digest. No email is sent: a citizen re-enters
 * the address they subscribed with and receives only that address's recorded
 * status updates. The lookup is throttled per email (like the tracker) and the
 * repository projection excludes every other citizen's email.
 */
const DIGEST_PREFIX = "public-digest:";

export async function getWatcherDigestAction(email: string) {
  const parsed = WatcherDigestLookupSchema.safeParse({ email });
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
      digests: [],
    };
  }

  const throttleKey = `${DIGEST_PREFIX}${parsed.data.email}`;
  const limit = checkLoginRateLimit(throttleKey);
  if (!limit.allowed) {
    return {
      success: false as const,
      error: `Too many lookups for this email. Please retry in ${Math.ceil(limit.retryAfterMs / 60000)} minutes.`,
      digests: [],
    };
  }

  try {
    const digests = repository.getWatcherDigest(parsed.data.email);
    // Empty lookups count as misses so repeated probing of arbitrary addresses
    // is throttled just like failed registry-number lookups.
    if (digests.length === 0) recordLoginFailure(throttleKey);
    return { success: true as const, digests };
  } catch {
    return {
      success: false as const,
      error: "Could not load updates right now. Please try again later.",
      digests: [],
    };
  }
}
