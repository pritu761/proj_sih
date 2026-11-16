import { describe, it, expect, afterEach } from "vitest";
import { SLA_CONFIGS } from "@/lib/demo-data";
import {
  calculateCaseSla,
  clearSlaConfigOverrides,
  getEffectiveSlaConfigs,
  setSlaConfigOverrides,
} from "@/lib/services/sla-engine";
import repository from "@/lib/services/repository";
import type { SessionUser } from "@/lib/rbac";

const ADMIN: SessionUser = {
  id: "usr_admin_001",
  name: "Dr. Rajesh Sharma",
  email: "admin@aicte.gov.in",
  role: "ADMIN",
  bureau: "ALL",
};

const CATEGORY = "Capitation Fee & Overcharging";
const REF = new Date("2026-10-26T12:00:00Z");
const RECEIVED_25_DAYS_AGO = new Date("2026-10-01T12:00:00Z");

afterEach(() => {
  // Clear both the globalThis engine registry and the store-backed overrides
  // so no test leaks a changed statutory schedule into another test file.
  clearSlaConfigOverrides();
  repository.resetSlaConfig(ADMIN);
});

describe("Administrable statutory SLA schedule", () => {
  it("derives the default effective config from the seeded SLA_CONFIGS", () => {
    clearSlaConfigOverrides();
    expect(getEffectiveSlaConfigs()).toEqual(
      SLA_CONFIGS.map((c) => ({
        category: c.category,
        timeline_days: c.timeline_days,
        warning_threshold_percent: c.warning_threshold_percent,
      }))
    );

    const schedule = repository.getSlaSchedule();
    expect(schedule).toHaveLength(SLA_CONFIGS.length);
    expect(schedule.every((row) => !row.isOverridden)).toBe(true);
    expect(schedule.find((row) => row.category === CATEGORY)).toMatchObject({
      timeline_days: 30,
      warning_threshold_percent: 80,
      default_timeline_days: 30,
      default_warning_threshold_percent: 80,
    });
  });

  it("lets a timeline override flip an approaching case to breached", () => {
    const baseline = calculateCaseSla(
      CATEGORY,
      RECEIVED_25_DAYS_AGO,
      "UNDER_PROCESS",
      REF
    );
    expect(baseline.timelineDays).toBe(30);
    expect(baseline.isApproaching).toBe(true);
    expect(baseline.isBreached).toBe(false);

    setSlaConfigOverrides({
      [CATEGORY]: { timeline_days: 10, warning_threshold_percent: 80 },
    });

    const changed = calculateCaseSla(
      CATEGORY,
      RECEIVED_25_DAYS_AGO,
      "UNDER_PROCESS",
      REF
    );
    expect(changed.timelineDays).toBe(10);
    expect(changed.isBreached).toBe(true);
    expect(changed.isApproaching).toBe(false);
    expect(changed.statusColor).toBe("rose");

    clearSlaConfigOverrides();
    const restored = calculateCaseSla(
      CATEGORY,
      RECEIVED_25_DAYS_AGO,
      "UNDER_PROCESS",
      REF
    );
    expect(restored.isBreached).toBe(false);
    expect(restored.statusColor).toBe("amber");
  });

  it("lets a warning-threshold override flip a normal case to approaching", () => {
    const received20DaysAgo = new Date("2026-10-06T12:00:00Z");
    const baseline = calculateCaseSla(
      CATEGORY,
      received20DaysAgo,
      "PENDING",
      REF
    );
    expect(baseline.percentElapsed).toBe(67);
    expect(baseline.isApproaching).toBe(false);

    setSlaConfigOverrides({
      [CATEGORY]: { timeline_days: 30, warning_threshold_percent: 60 },
    });
    const changed = calculateCaseSla(
      CATEGORY,
      received20DaysAgo,
      "PENDING",
      REF
    );
    expect(changed.isApproaching).toBe(true);
    expect(changed.statusColor).toBe("amber");

    clearSlaConfigOverrides();
    expect(
      calculateCaseSla(CATEGORY, received20DaysAgo, "PENDING", REF)
        .isApproaching
    ).toBe(false);
  });

  it("persists overrides through the repository and restores defaults on reset", () => {
    const before = repository.getSlaSchedule().find((r) => r.category === CATEGORY);
    expect(before?.isOverridden).toBe(false);

    const saved = repository.updateSlaConfig(CATEGORY, 12, 55, ADMIN);
    expect(saved).toMatchObject({
      category: CATEGORY,
      timeline_days: 12,
      warning_threshold_percent: 55,
      isOverridden: true,
    });
    expect(
      calculateCaseSla(CATEGORY, RECEIVED_25_DAYS_AGO, "UNDER_PROCESS", REF)
        .timelineDays
    ).toBe(12);

    const reset = repository.resetSlaConfig(ADMIN);
    expect(reset.every((row) => !row.isOverridden)).toBe(true);
    const restored = calculateCaseSla(
      CATEGORY,
      RECEIVED_25_DAYS_AGO,
      "UNDER_PROCESS",
      REF
    );
    expect(restored.timelineDays).toBe(30);
    expect(restored.isBreached).toBe(false);
    expect(restored.isApproaching).toBe(true);
  });

  it("refuses schedule mutations from non-administrators", () => {
    const officer: SessionUser = {
      id: "usr_rb_003",
      name: "Officer",
      email: "rb.officer@aicte.gov.in",
      role: "REGULATION_OFFICER",
      bureau: "REGULATION_BUREAU",
    };
    expect(() => repository.updateSlaConfig(CATEGORY, 1, 50, officer)).toThrow(
      /administrator/i
    );
    expect(() => repository.resetSlaConfig(officer)).toThrow(/administrator/i);
  });
});
