import { describe, it, expect } from "vitest";
import { calculateCaseSla, computeAgeingBuckets } from "@/lib/services/sla-engine";

describe("SlaEngine Unit Tests", () => {
  const refDate = new Date("2026-10-26T12:00:00Z");

  it("calculates green status for newly received cases", () => {
    // 5 days ago on a 30-day SLA
    const dateReceived = new Date("2026-10-21T12:00:00Z");
    const res = calculateCaseSla("Capitation Fee & Overcharging", dateReceived, "PENDING", refDate);

    expect(res.timelineDays).toBe(30);
    expect(res.elapsedDays).toBe(5);
    expect(res.remainingDays).toBe(25);
    expect(res.isBreached).toBe(false);
    expect(res.isApproaching).toBe(false);
    expect(res.statusColor).toBe("emerald");
  });

  it("calculates amber warning status when approaching SLA threshold (>= 80%)", () => {
    // 25 days elapsed on a 30-day SLA (83.3% elapsed)
    const dateReceived = new Date("2026-10-01T12:00:00Z");
    const res = calculateCaseSla("Capitation Fee & Overcharging", dateReceived, "UNDER_PROCESS", refDate);

    expect(res.elapsedDays).toBe(25);
    expect(res.remainingDays).toBe(5);
    expect(res.isBreached).toBe(false);
    expect(res.isApproaching).toBe(true);
    expect(res.statusColor).toBe("amber");
    expect(res.statusText).toContain("SLA Approaching");
  });

  it("calculates rose breached status when case exceeds timeline", () => {
    // 35 days elapsed on a 30-day SLA
    const dateReceived = new Date("2026-09-21T12:00:00Z");
    const res = calculateCaseSla("Capitation Fee & Overcharging", dateReceived, "UNDER_PROCESS", refDate);

    expect(res.elapsedDays).toBe(35);
    expect(res.remainingDays).toBe(-5);
    expect(res.isBreached).toBe(true);
    expect(res.statusColor).toBe("rose");
    expect(res.statusText).toContain("SLA Breached (5 days overdue)");
  });

  it("marks DISPOSED cases as resolved within SLA", () => {
    const dateReceived = new Date("2026-09-21T12:00:00Z");
    const res = calculateCaseSla("Capitation Fee & Overcharging", dateReceived, "DISPOSED", refDate);

    expect(res.isBreached).toBe(false);
    expect(res.statusColor).toBe("emerald");
    expect(res.statusText).toBe("Resolved within SLA");
  });

  it("correctly buckets cases into ageing distributions", () => {
    const cases = [
      { date_received: new Date("2026-10-20T12:00:00Z"), status: "PENDING" }, // 6 days -> bucket 0-15
      { date_received: new Date("2026-10-15T12:00:00Z"), status: "UNDER_PROCESS" }, // 11 days -> bucket 0-15
      { date_received: new Date("2026-10-02T12:00:00Z"), status: "PENDING" }, // 24 days -> bucket 16-30
      { date_received: new Date("2026-09-15T12:00:00Z"), status: "UNDER_PROCESS" }, // 41 days -> bucket 31-60
      { date_received: new Date("2026-08-01T12:00:00Z"), status: "ESCALATED" }, // 86 days -> bucket 60+
      { date_received: new Date("2026-08-01T12:00:00Z"), status: "DISPOSED" }, // Disposed should be excluded
    ];

    const buckets = computeAgeingBuckets(cases, refDate);
    expect(buckets.bucket_0_15).toBe(2);
    expect(buckets.bucket_16_30).toBe(1);
    expect(buckets.bucket_31_60).toBe(1);
    expect(buckets.bucket_60_plus).toBe(1);
  });
});
