import { describe, it, expect } from "vitest";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";
import { generateSeedData, type SeedCase } from "@/lib/mock-data-generator";

const DAY = 86400000;

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

const RB_OFFICER: SessionUser = {
  id: "usr_rb_007",
  name: "RB Officer",
  email: "rb.officer@aicte.gov.in",
  role: "REGULATION_OFFICER",
  bureau: "REGULATION_BUREAU",
};

const RO_NORTH: SessionUser = {
  id: "usr_ro_test",
  name: "RO North",
  email: "ro.north@aicte.gov.in",
  role: "REGIONAL_OFFICER",
  bureau: "ALL",
  region: "Northern",
};

/** Mirrors analytics.disposedAtOf / the repository's latestDisposedAt helper. */
function disposedAtOf(c: SeedCase): number {
  const disposed = c.actions
    .filter((a) => a.action_type === "DISPOSED")
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )[0];
  return disposed
    ? new Date(disposed.timestamp).getTime()
    : new Date(c.last_action_date).getTime();
}

describe("Dashboard refinements — additive metrics fields", () => {
  it("exposes generatedAt as a valid ISO timestamp", async () => {
    const metrics = await repository.getDashboardMetrics(ADMIN);

    expect(typeof metrics.generatedAt).toBe("string");
    expect(metrics.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Number.isNaN(Date.parse(metrics.generatedAt))).toBe(false);
    expect(new Date(metrics.generatedAt).toISOString()).toBe(metrics.generatedAt);
  });

  it("reports non-negative, plausible 7-day movement against the seeded registry", async () => {
    const metrics = await repository.getDashboardMetrics(ADMIN);
    const { received7d, disposed7d } = metrics.recentMovement;

    expect(Number.isInteger(received7d)).toBe(true);
    expect(Number.isInteger(disposed7d)).toBe(true);
    expect(received7d).toBeGreaterThanOrEqual(0);
    expect(disposed7d).toBeGreaterThanOrEqual(0);
    // A trailing window can never exceed the full portfolio it samples.
    expect(received7d).toBeLessThanOrEqual(metrics.kpi.totalReceived);
    expect(disposed7d).toBeLessThanOrEqual(metrics.kpi.disposed);

    // The live store starts from the generated seed and can only gain recent
    // arrivals, so the seed's own 7-day counts are a deterministic lower bound.
    const seed = generateSeedData();
    const windowStart = Date.now() - 7 * DAY;
    const seedReceived = seed.cases.filter(
      (c) => new Date(c.date_received).getTime() >= windowStart
    ).length;
    const seedDisposed = seed.cases.filter(
      (c) => c.status === "DISPOSED" && disposedAtOf(c) >= windowStart
    ).length;

    expect(received7d).toBeGreaterThanOrEqual(seedReceived);
    expect(disposed7d).toBeGreaterThanOrEqual(seedDisposed);
  });

  it("scopes queueUnassigned to the bureau, matching the work queue seam", async () => {
    const adminMetrics = await repository.getDashboardMetrics(ADMIN);
    const rbMetrics = await repository.getDashboardMetrics(RB_OFFICER);

    const adminQueue = await repository.getMyQueue(ADMIN);
    const rbQueue = await repository.getMyQueue(RB_OFFICER);

    expect(adminMetrics.queueUnassigned).toBe(adminQueue.unassigned.length);
    expect(rbMetrics.queueUnassigned).toBe(rbQueue.unassigned.length);
    // A bureau slice can never exceed the all-bureaus total.
    expect(rbMetrics.queueUnassigned).toBeLessThanOrEqual(
      adminMetrics.queueUnassigned
    );
    expect(rbQueue.unassigned.every((c) => c.assigned_bureau === "REGULATION_BUREAU")).toBe(true);
  });

  it("reports zero unassigned work for a read-only regional officer", async () => {
    const metrics = await repository.getDashboardMetrics(RO_NORTH);
    expect(metrics.queueUnassigned).toBe(0);
  });

  it("leaves the demo registry anchor numbers untouched", async () => {
    const pgrc = await repository.getCaseById("case_00101", ADMIN);
    const rb = await repository.getCaseById("case_00042", ADMIN);

    expect(pgrc?.caseItem.case_id).toBe("AICTE/PGRC/2026/00101");
    expect(rb?.caseItem.case_id).toBe("AICTE/RB/2026/00042");
  });
});
