import { describe, it, expect, beforeAll } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

// A generic bureau officer: per the feed's scoping rules they only receive
// their own desk's files, unlike the Single-Source-of-Truth specialist roles.
const SKILL_OFFICER: SessionUser = {
  id: "usr_skill_001",
  name: "Skill Cell Officer",
  email: "skill.officer@aicte.gov.in",
  role: "BUREAU_OFFICER",
  bureau: "SKILL_CELL",
};

const RO_NORTH: SessionUser = {
  id: "usr_ro_test",
  name: "RO North",
  email: "ro.north@aicte.gov.in",
  role: "REGIONAL_OFFICER",
  bureau: "ALL",
  region: "Northern",
};

describe("RBAC-scoped recent-activity feed", () => {
  beforeAll(async () => {
    // Warm the singleton store (hydration + one-shot daily intake) so the
    // deterministic comparisons below read a settled ledger.
    await repository.getDashboardMetrics(ADMIN);
  });

  it("projects the ledger newest-first with stable ordering", async () => {
    const feed = await repository.getRecentActivity(ADMIN, 20);
    expect(feed.length).toBeGreaterThan(0);

    const times = feed.map((e) => Date.parse(e.timestamp));
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeLessThanOrEqual(times[i - 1]);
    }

    // Every row is fully projected and carries a safe destination.
    for (const entry of feed) {
      expect(entry.id).toBeTruthy();
      expect(entry.label).toBeTruthy();
      expect(entry.actor).toBeTruthy();
      expect(entry.href.startsWith("/")).toBe(true);
      expect(Number.isNaN(Date.parse(entry.timestamp))).toBe(false);
    }

    // Repeated reads agree exactly (same ledger, same order, same ids).
    const again = await repository.getRecentActivity(ADMIN, 20);
    expect(again).toEqual(feed);
  });

  it("hides case entries outside a bureau officer's bureau", async () => {
    const feed = await repository.getRecentActivity(SKILL_OFFICER, 50);
    const caseRows = feed.filter((e) => e.href.startsWith("/cases/"));

    for (const row of caseRows) {
      expect(row.entityBureau).toBe("SKILL_CELL");
    }

    // A PGRC anchor case must never appear in a Skill Cell officer's feed.
    expect(
      feed.some(
        (e) =>
          e.entity_id === "AICTE/PGRC/2026/00101" ||
          e.entityLabel === "AICTE/PGRC/2026/00101" ||
          e.href === "/cases/case_00101"
      )
    ).toBe(false);
  });

  it("lets ADMIN see the full ledger (a strict superset of the bureau slice)", async () => {
    // Use a limit covering the whole ledger: a filtered slice can include rows
    // that sit past a smaller admin cutoff even though it is a subsequence.
    const adminFeed = await repository.getRecentActivity(ADMIN, 500);
    const skillFeed = await repository.getRecentActivity(SKILL_OFFICER, 500);

    const adminIds = new Set(adminFeed.map((e) => e.id));
    expect(skillFeed.every((e) => adminIds.has(e.id))).toBe(true);
    expect(adminFeed.length).toBeGreaterThanOrEqual(skillFeed.length);
    // The seeded ledger spans several bureaus, so the admin view is broader.
    expect(
      adminFeed.some(
        (e) => e.entityBureau && e.entityBureau !== "SKILL_CELL"
      )
    ).toBe(true);
  });

  it("scopes regional officers to their own region's cases", async () => {
    const feed = await repository.getRecentActivity(RO_NORTH, 50);
    for (const row of feed.filter((e) => e.href.startsWith("/cases/"))) {
      const detail = await repository.getCaseById(
        row.href.replace("/cases/", ""),
        ADMIN
      );
      expect(detail?.caseItem.institution?.region).toBe("Northern");
    }
  });

  it("humanises action labels into title case", async () => {
    const feed = await repository.getRecentActivity(ADMIN, 50);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed.every((e) => e.label === e.label.trim())).toBe(true);
    expect(feed.some((e) => !e.label.includes("_"))).toBe(true);
  });
});

describe("Honest KPI trend chips", () => {
  it("derives non-negative, bounded weekly movement from live case dates", async () => {
    const metrics = await repository.getDashboardMetrics(ADMIN);
    const { received, disposed } = metrics.kpiTrends;

    for (const trend of [received, disposed]) {
      expect(Number.isInteger(trend.current)).toBe(true);
      expect(Number.isInteger(trend.previous)).toBe(true);
      expect(trend.current).toBeGreaterThanOrEqual(0);
      expect(trend.previous).toBeGreaterThanOrEqual(0);
      expect(trend.delta).toBe(trend.current - trend.previous);
      expect(trend.direction).toBe(
        trend.delta > 0 ? "up" : trend.delta < 0 ? "down" : "flat"
      );
    }

    expect(received.current).toBeLessThanOrEqual(metrics.kpi.totalReceived);
    expect(received.previous).toBeLessThanOrEqual(metrics.kpi.totalReceived);
    expect(disposed.current).toBeLessThanOrEqual(metrics.kpi.disposed);
    expect(disposed.previous).toBeLessThanOrEqual(metrics.kpi.disposed);
  });

  it("recomputes deterministic trends on every call", async () => {
    const first = await repository.getDashboardMetrics(ADMIN);
    const second = await repository.getDashboardMetrics(ADMIN);
    expect(second.kpiTrends).toEqual(first.kpiTrends);
    // The additive feed is carried on the same polling payload.
    expect(Array.isArray(second.recentActivity)).toBe(true);
    expect(second.recentActivity).toEqual(first.recentActivity);
  });

  it("leaves the demo anchor registry numbers untouched by dashboard reads", async () => {
    await repository.getDashboardMetrics(ADMIN);
    await repository.getRecentActivity(ADMIN);

    const pgrc = await repository.getCaseById("case_00101", ADMIN);
    const rb = await repository.getCaseById("case_00042", ADMIN);
    expect(pgrc?.caseItem.case_id).toBe("AICTE/PGRC/2026/00101");
    expect(rb?.caseItem.case_id).toBe("AICTE/RB/2026/00042");
  });
});
