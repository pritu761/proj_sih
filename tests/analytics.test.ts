import { describe, it, expect } from "vitest";
import { generateSeedData, type SeedCase } from "@/lib/mock-data-generator";
import { SLA_CONFIGS } from "@/lib/demo-data";
import {
  computeBacklogForecast,
  computeBreachHeatmap,
  computePrecedentStats,
} from "@/lib/services/analytics";

const DAY = 86400000;

const TIMELINE_DAYS =
  SLA_CONFIGS.find((s) => s.category === "Withholding Certificates")?.timeline_days ?? 30;

function caseFixture(overrides: Partial<SeedCase>): SeedCase {
  const now = Date.now();
  const received = overrides.date_received ?? new Date(now - 20 * DAY);
  return {
    id: `fx_${Math.random().toString(36).slice(2, 9)}`,
    case_id: `AICTE/RB/2026/8${Math.floor(Math.random() * 10000)}`,
    institution_id: "inst_001",
    date_received: received,
    source: "student",
    category: "Withholding Certificates",
    description: "Analytics fixture case.",
    status: "UNDER_PROCESS",
    assigned_bureau: "REGULATION_BUREAU",
    assigned_officer: "",
    last_action: "Registered",
    last_action_date: received,
    next_action_required: null,
    expected_disposal_date: new Date(new Date(received).getTime() + TIMELINE_DAYS * DAY),
    priority: "MEDIUM",
    actions: [
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "RECEIVED",
        remarks: "Registered.",
        timestamp: received,
        attachments: [],
      },
    ],
    ...overrides,
  };
}

/**
 * A closed file: received `receivedDaysAgo` days ago, disposed exactly
 * `durationDays` after receipt — both dates fully controlled by the test.
 */
function disposedCase(
  overrides: Partial<SeedCase>,
  durationDays: number,
  receivedDaysAgo: number
): SeedCase {
  const now = Date.now();
  const received = new Date(now - receivedDaysAgo * DAY);
  const disposedAt = new Date(received.getTime() + durationDays * DAY);
  return caseFixture({
    status: "DISPOSED",
    date_received: received,
    last_action: "Disposed with directions",
    last_action_date: disposedAt,
    actions: [
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "RECEIVED",
        remarks: "Registered.",
        timestamp: received,
        attachments: [],
      },
      {
        actor_user: "rb.officer@aicte.gov.in",
        actor_bureau: "REGULATION_BUREAU",
        action_type: "DISPOSED",
        remarks: `Disposed after ${durationDays} days. Show-cause notice issued; institution complied and certificates were released to the students.`,
        timestamp: disposedAt,
        attachments: [],
      },
    ],
    ...overrides,
  });
}

describe("Backlog forecast", () => {
  const now = new Date();

  it("derives intake/disposal rates from the trailing window and projects linearly", () => {
    const cases: SeedCase[] = [];
    // 10 older open files — received OUTSIDE the 30-day observation window.
    for (let i = 0; i < 10; i++) {
      cases.push(caseFixture({ date_received: new Date(now.getTime() - 60 * DAY) }));
    }
    // 6 recent arrivals inside the window (intake 6/30 = 0.2/day).
    for (let i = 0; i < 6; i++) {
      cases.push(caseFixture({ date_received: new Date(now.getTime() - i * DAY) }));
    }
    // 3 disposals closed 5 days ago but received outside the window, so the
    // intake rate counts only genuine new filings (disposal 3/30 = 0.1/day).
    for (let i = 0; i < 3; i++) cases.push(disposedCase({}, 55, 60 + i));

    const f = computeBacklogForecast(cases, now);

    expect(f.backlog).toBe(16);
    expect(f.recentIntake).toBe(6);
    expect(f.recentDisposals).toBe(3);
    expect(f.intakePerDay).toBe(0.2);
    expect(f.disposalPerDay).toBe(0.1);
    expect(f.netPerDay).toBe(0.1);
    expect(f.projections.map((p) => p.days)).toEqual([30, 60, 90]);
    // backlog 16 + 0.1/day → 19 / 22 / 25
    expect(f.projections.map((p) => p.projectedOpen)).toEqual([19, 22, 25]);
    expect(f.weeksToClear).toBeNull(); // backlog is growing
  });

  it("computes weeks-to-clear when disposals outrun intake", () => {
    const cases: SeedCase[] = [];
    for (let i = 0; i < 20; i++) {
      cases.push(caseFixture({ date_received: new Date(now.getTime() - 45 * DAY) }));
    }
    // 10 closures inside the window, all received outside it → intake 0/day,
    // disposal 10/30 ≈ 0.33/day.
    for (let i = 0; i < 10; i++) cases.push(disposedCase({}, 40 + i, 45 + i));

    const f = computeBacklogForecast(cases, now);

    expect(f.backlog).toBe(20);
    expect(f.recentIntake).toBe(0);
    expect(f.intakePerDay).toBe(0);
    expect(f.disposalPerDay).toBeCloseTo(0.3333, 2);
    expect(f.netPerDay).toBeLessThan(0);
    expect(f.weeksToClear).toBeGreaterThan(0);
    // Projections never go negative.
    expect(Math.min(...f.projections.map((p) => p.projectedOpen))).toBeGreaterThanOrEqual(0);
  });
});

describe("Breach heatmap", () => {
  it("computes per-cell breach density across regions and categories", () => {
    const seed = generateSeedData();
    const inst = seed.institutions[0];
    const now = new Date();

    const cases: SeedCase[] = [
      // Same region+category: one breached, one healthy → density 50%.
      caseFixture({
        institution_id: inst.id,
        category: "Withholding Certificates",
        date_received: new Date(now.getTime() - (TIMELINE_DAYS + 10) * DAY),
      }),
      caseFixture({
        institution_id: inst.id,
        category: "Withholding Certificates",
        date_received: new Date(now.getTime() - 2 * DAY),
      }),
    ];

    const heatmap = computeBreachHeatmap(cases, seed.institutions);

    expect(heatmap.regions).toContain(inst.region);
    expect(heatmap.categories.length).toBeGreaterThan(0);

    const cell = heatmap.cells.find(
      (c) => c.region === inst.region && c.category === "Withholding Certificates"
    )!;
    expect(cell.active).toBe(2);
    expect(cell.breached).toBe(1);
    expect(cell.density).toBe(50);
    expect(heatmap.maxDensity).toBeGreaterThanOrEqual(50);

    // Empty cells report zero, never NaN.
    const empty = heatmap.cells.find((c) => c.region === inst.region && c.active === 0);
    expect(empty?.density).toBe(0);
  });
});

describe("Precedent statistics", () => {
  it("aggregates durations, on-time rate and outcome mix for a category", () => {
    const seed = generateSeedData();
    const durations = [12, 28, TIMELINE_DAYS + 15];

    const cases: SeedCase[] = [
      disposedCase({ category: "Withholding Certificates" }, durations[0], durations[0] + 5),
      disposedCase({ category: "Withholding Certificates" }, durations[1], durations[1] + 5),
      disposedCase({ category: "Withholding Certificates" }, durations[2], durations[2] + 5),
      disposedCase({ category: "Capitation Fee & Overcharging" }, 10, 15), // other category
    ];

    const stats = computePrecedentStats({
      category: "Withholding Certificates",
      cases,
      institutions: seed.institutions,
    });

    const expectedOnTime = durations.filter((d) => d <= TIMELINE_DAYS).length;

    expect(stats.similarDisposed).toBe(3);
    expect(stats.medianDays).toBe(28);
    expect(stats.onTimeRate).toBe(
      Math.round((expectedOnTime / durations.length) * 100)
    );
    expect(stats.outcomeDistribution[0].outcome).toContain("Show-cause");
    expect(stats.examples.length).toBe(3);
    // Most recent closure first.
    expect(new Date(stats.examples[0].disposedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(stats.examples[1].disposedAt).getTime()
    );
  });

  it("returns zeroed stats when no comparable files exist", () => {
    const seed = generateSeedData();
    const stats = computePrecedentStats({
      category: "Ragging & Safety Violations",
      cases: [caseFixture({})],
      institutions: seed.institutions,
    });
    expect(stats.similarDisposed).toBe(0);
    expect(stats.medianDays).toBe(0);
    expect(stats.onTimeRate).toBe(0);
    expect(stats.examples).toEqual([]);
  });
});
