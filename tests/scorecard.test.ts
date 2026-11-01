import { describe, it, expect } from "vitest";
import { computeBureauScorecard, gradeBureau } from "@/lib/services/scorecard";

describe("Bureau Scorecard", () => {
  const ref = new Date("2026-10-26T12:00:00Z");

  it("grades a bureau A when on-time disposals are high and breach load is low", () => {
    expect(gradeBureau(0, 90)).toBe("A");
    expect(gradeBureau(4, 85)).toBe("A");
  });

  it("grades a bureau D when on-time rate is below 50%", () => {
    expect(gradeBureau(12, 30)).toBe("D");
  });

  it("computes one row per bureau with correct counts", () => {
    const cases = [
      { case_id: "C1", status: "PENDING", assigned_bureau: "PGRC", date_received: "2026-09-20", last_action_date: "2026-09-25", category: "Capitation Fee & Overcharging" },
      { case_id: "C2", status: "DISPOSED", assigned_bureau: "PGRC", date_received: "2026-09-20", last_action_date: "2026-09-25", category: "Capitation Fee & Overcharging" },
      { case_id: "C3", status: "ESCALATED", assigned_bureau: "REGULATION_BUREAU", date_received: "2026-10-01", last_action_date: "2026-10-02", category: "Withholding Certificates" },
    ];
    const rows = computeBureauScorecard(cases as any, ref);
    expect(rows.length).toBe(2);
    const pgrc = rows.find((r) => r.bureau === "PGRC")!;
    expect(pgrc.totalCases).toBe(2);
    expect(pgrc.pending).toBe(1);
    expect(pgrc.disposed).toBe(1);
    expect(pgrc.disposalRatePercent).toBe(50);
    const rb = rows.find((r) => r.bureau === "REGULATION_BUREAU")!;
    expect(rb.escalated).toBe(1);
  });

  it("sorts rows by bureau order", () => {
    const cases = [
      { case_id: "C1", status: "PENDING", assigned_bureau: "SKILL_CELL", date_received: new Date("2026-10-01"), last_action_date: new Date("2026-10-02"), category: "Capitation Fee & Overcharging" },
      { case_id: "C2", status: "PENDING", assigned_bureau: "REGULATION_BUREAU", date_received: new Date("2026-10-01"), last_action_date: new Date("2026-10-02"), category: "Capitation Fee & Overcharging" },
    ];
    const rows = computeBureauScorecard(cases as any, ref);
    expect(rows[0].bureau).toBe("REGULATION_BUREAU");
    expect(rows[1].bureau).toBe("SKILL_CELL");
  });

  it("returns zero division rates without NaN", () => {
    const cases = [{ case_id: "C1", status: "TRANSFERRED", assigned_bureau: "PGRC", date_received: new Date("2026-10-01"), last_action_date: new Date("2026-10-02"), category: "Capitation Fee & Overcharging" }];
    const rows = computeBureauScorecard(cases as any, ref);
    const pgrc = rows.find((r) => r.bureau === "PGRC")!;
    expect(Number.isNaN(pgrc.disposalRatePercent)).toBe(false);
    expect(Number.isNaN(pgrc.onTimeRatePercent)).toBe(false);
  });
});