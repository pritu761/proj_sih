import { beforeAll, describe, expect, it } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";

const DAY = 86400000;

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

const SKILL_OFFICER: SessionUser = {
  id: "usr_digest_skill",
  name: "Skill Cell Officer",
  email: "digest.skill@aicte.gov.in",
  role: "BUREAU_OFFICER",
  bureau: "SKILL_CELL",
};

const RO_NORTH: SessionUser = {
  id: "usr_digest_ro",
  name: "RO North",
  email: "digest.ro@aicte.gov.in",
  role: "REGIONAL_OFFICER",
  bureau: "ALL",
  region: "Northern",
};

/** The repository anchors the live store on globalThis (see repository.ts). */
function liveStore(): {
  lastSeenByUser?: Record<string, string>;
  cases: unknown[];
} {
  const store = (
    globalThis as unknown as {
      inMemoryData?: { lastSeenByUser?: Record<string, string>; cases: unknown[] };
    }
  ).inMemoryData;
  if (!store) throw new Error("in-memory store has not been initialised");
  return store;
}

function asAdmin(id: string): SessionUser {
  return { ...ADMIN, id, email: `${id}@aicte.gov.in` };
}

function countOf(digest: ReturnType<typeof repository.getVisitDigest>, key: string) {
  return digest.sections.find((s) => s.key === key)!.count;
}

describe("Replayable login visit digest", () => {
  beforeAll(async () => {
    // Warm the singleton store + seeded ledger so every read is settled.
    await repository.getDashboardMetrics(ADMIN);
  });

  it("is JSON-serializable with non-negative, plausible counts for seeded data", async () => {
    const digest = repository.getVisitDigest(ADMIN);
    const metrics = await repository.getDashboardMetrics(ADMIN);

    // Round-trips cleanly: no Date objects leak into the client payload.
    expect(digest).toEqual(JSON.parse(JSON.stringify(digest)));
    expect(Number.isFinite(Date.parse(digest.since))).toBe(true);
    expect(Number.isFinite(Date.parse(digest.generatedAt))).toBe(true);
    expect(typeof digest.isFirstVisit).toBe("boolean");
    expect(digest.sections).toHaveLength(4);
    expect(digest.total).toBe(digest.sections.reduce((sum, s) => sum + s.count, 0));

    for (const section of digest.sections) {
      expect(Number.isInteger(section.count)).toBe(true);
      expect(section.count).toBeGreaterThanOrEqual(0);
      expect(section.label).toBeTruthy();
      expect(section.href.startsWith("/")).toBe(true);
    }

    // A trailing window can never exceed the full portfolio it samples.
    expect(countOf(digest, "newGrievances")).toBeLessThanOrEqual(
      metrics.kpi.totalReceived
    );

    // Counts carry no registry numbers the viewer might not be able to open.
    expect(JSON.stringify(digest)).not.toContain("AICTE/");
  });

  it("uses a 7-day default window for a first-time visitor without creating a marker", () => {
    const firstTimer = asAdmin(`usr_digest_first_${Date.now()}`);
    const store = liveStore();
    expect(store.lastSeenByUser?.[firstTimer.id]).toBeUndefined();

    const digest = repository.getVisitDigest(firstTimer);

    expect(digest.isFirstVisit).toBe(true);
    const windowMs = Date.parse(digest.generatedAt) - Date.parse(digest.since);
    expect(windowMs).toBeGreaterThanOrEqual(7 * DAY - 1000);
    expect(windowMs).toBeLessThanOrEqual(7 * DAY + 1000);
    expect(store.lastSeenByUser?.[firstTimer.id]).toBeUndefined();
  });

  it("scopes counts for a bureau officer and a regional officer vs ADMIN", () => {
    const store = liveStore();
    store.lastSeenByUser ??= {};
    const old = new Date(Date.now() - 365 * DAY).toISOString();
    for (const u of [ADMIN, SKILL_OFFICER, RO_NORTH]) {
      store.lastSeenByUser[u.id] = old;
    }

    const admin = repository.getVisitDigest(ADMIN);
    const skill = repository.getVisitDigest(SKILL_OFFICER);
    const region = repository.getVisitDigest(RO_NORTH);

    const keys = [
      "newGrievances",
      "statusChanges",
      "filesEscalated",
      "newOverlapAlerts",
    ];
    for (const key of keys) {
      expect(countOf(skill, key)).toBeGreaterThanOrEqual(0);
      expect(countOf(region, key)).toBeGreaterThanOrEqual(0);
      // Every scoped slice is a subset of the registry-wide ADMIN view.
      expect(countOf(skill, key)).toBeLessThanOrEqual(countOf(admin, key));
      expect(countOf(region, key)).toBeLessThanOrEqual(countOf(admin, key));
    }

    for (const digest of [admin, skill, region]) {
      expect(digest.isFirstVisit).toBe(false);
      expect(digest.since).toBe(old);
    }
  });

  it("marks only the requested user's marker as seen and persists it on the store", () => {
    const store = liveStore();
    store.lastSeenByUser ??= {};
    const userA = asAdmin(`usr_digest_seen_a_${Date.now()}`);
    const userB = asAdmin(`usr_digest_seen_b_${Date.now()}`);
    const old = new Date(Date.now() - 10 * DAY).toISOString();
    store.lastSeenByUser[userA.id] = old;
    store.lastSeenByUser[userB.id] = old;

    const before = Date.now();
    repository.markVisitSeen(userA);
    const after = Date.now();

    const markerA = store.lastSeenByUser[userA.id]!;
    expect(markerA).not.toBe(old);
    expect(Date.parse(markerA)).toBeGreaterThanOrEqual(before - 1000);
    expect(Date.parse(markerA)).toBeLessThanOrEqual(after + 1000);
    // A second officer's marker is untouched.
    expect(store.lastSeenByUser[userB.id]).toBe(old);

    const digest = repository.getVisitDigest(userA);
    expect(digest.isFirstVisit).toBe(false);
    expect(digest.since).toBe(markerA);
  });

  it("replay (repeated reads) never advances the marker", () => {
    const store = liveStore();
    store.lastSeenByUser ??= {};
    const user = asAdmin(`usr_digest_replay_${Date.now()}`);
    const fixed = new Date(Date.now() - 3 * DAY).toISOString();
    store.lastSeenByUser[user.id] = fixed;

    const first = repository.getVisitDigest(user);
    const second = repository.getVisitDigest(user);

    expect(store.lastSeenByUser[user.id]).toBe(fixed);
    expect(first.since).toBe(second.since);
    expect(first.isFirstVisit).toBe(false);
    expect(first.sections).toEqual(second.sections);
  });
});
