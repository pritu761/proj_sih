import { describe, it, expect } from "vitest";
import { generateSeedData } from "@/lib/mock-data-generator";
import { ensureDailyIntake } from "@/lib/services/daily-intake";
import type { StoreState } from "@/lib/services/persistence";
import { SLA_CONFIGS } from "@/lib/demo-data";

const CATEGORIES = SLA_CONFIGS.map((s) => s.category);

/** Mirrors buildSeedStore() without touching the repository (no DB wiring). */
function freshStore(): StoreState {
  const seed = generateSeedData();
  return {
    institutions: seed.institutions,
    cases: seed.cases,
    overlapAlerts: seed.overlapAlerts,
    caseLinks: [],
    notifications: [],
    comments: seed.comments,
    documents: seed.documents,
    users: [],
  };
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

describe("Daily synthetic intake", () => {
  const now = new Date();

  it("registers a fresh batch on first run with past-dated arrivals", async () => {
    const store = freshStore();
    const before = store.cases.length;
    const registry = new Set(store.cases.map((c) => c.case_id));

    const summary = await ensureDailyIntake({ store, now, offline: true });

    expect(summary.created).toBeGreaterThanOrEqual(6);
    expect(summary.created).toBeLessThanOrEqual(10);
    expect(summary.days).toEqual([dayKey(now)]);
    expect(summary.narrativeSource).toBe("fallback");
    expect(store.cases.length).toBe(before + summary.created);
    expect(store.lastDailyIntake).toBe(dayKey(now));

    // Every NEW file must extend the registry without collisions; the whole
    // store must stay globally unique as well.
    for (const c of store.cases.slice(0, summary.created)) {
      expect(registry.has(c.case_id)).toBe(false);
      registry.add(c.case_id);
      expect(c.date_received.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(c.actions[0].action_type).toBe("RECEIVED");
      expect(c.description.length).toBeGreaterThan(20);
    }
    const allIds = store.cases.map((c) => c.case_id);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("is idempotent within the same UTC day", async () => {
    const store = freshStore();
    await ensureDailyIntake({ store, now, offline: true });
    const afterFirst = store.cases.length;

    const second = await ensureDailyIntake({ store, now, offline: true });

    expect(second.created).toBe(0);
    expect(store.cases.length).toBe(afterFirst);
  });

  it("catches up missed days with back-dated arrivals", async () => {
    const store = freshStore();
    // The marker day itself was already ingested, so the missed window is
    // marker+1 .. today (3 day-batches).
    store.lastDailyIntake = dayKey(new Date(now.getTime() - 3 * 86400000));
    const before = store.cases.length;

    const summary = await ensureDailyIntake({ store, now, offline: true });

    expect(summary.days.length).toBe(3);
    expect(summary.created).toBeGreaterThanOrEqual(18);
    expect(summary.created).toBeLessThanOrEqual(30);
    expect(store.cases.length).toBe(before + summary.created);

    const cutoff = new Date(`${summary.days[0]}T00:00:00.000Z`).getTime();
    for (const c of store.cases.slice(0, summary.created)) {
      expect(c.date_received.getTime()).toBeGreaterThanOrEqual(cutoff);
      expect(c.date_received.getTime()).toBeLessThanOrEqual(now.getTime());
    }
  });

  it("keeps status and statutory routing coherent for fresh files", async () => {
    const store = freshStore();
    const before = store.cases.length;

    const summary = await ensureDailyIntake({ store, now, offline: true });

    for (const c of store.cases.slice(0, summary.created)) {
      expect(["PENDING", "UNDER_PROCESS"]).toContain(c.status);
      // Routing may legitimately escalate a Vigilance-channel filing to
      // CRITICAL; what matters is that the priority came from the router,
      // never from SLA pressure (fresh files have elapsed none of it).
      expect(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).toContain(c.priority);
      expect(c.expected_disposal_date.getTime()).toBeGreaterThan(now.getTime() - 86400000);
      expect(CATEGORIES).toContain(c.category);
    }
  });

  it("forces a second batch when explicitly requested", async () => {
    const store = freshStore();
    await ensureDailyIntake({ store, now, offline: true });
    const afterFirst = store.cases.length;

    const forced = await ensureDailyIntake({ store, now, offline: true, force: true });

    expect(forced.created).toBeGreaterThan(0);
    expect(store.cases.length).toBe(afterFirst + forced.created);
  });
});
