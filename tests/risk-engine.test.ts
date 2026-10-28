import { describe, it, expect } from "vitest";
import {
  scoreCaseRisk,
  buildRiskRadar,
  buildCaseInsight,
  bandFor,
  type RiskCaseInput,
  type RiskOverlapInput,
  type RiskInstitutionInput,
} from "@/lib/services/risk-engine";

const now = new Date("2026-10-26T12:00:00Z");

const institution: RiskInstitutionInput = {
  id: "inst_1",
  name: "Apex Institute of Engineering & Technology",
  city: "Kanpur",
  state: "Uttar Pradesh",
  region: "North",
};

function makeCase(overrides: Partial<RiskCaseInput> = {}): RiskCaseInput {
  return {
    id: "case_1",
    case_id: "AICTE/RB/2026/00001",
    institution_id: "inst_1",
    category: "Capitation Fee & Overcharging",
    status: "PENDING",
    priority: "LOW",
    assigned_bureau: "REGULATION_BUREAU",
    date_received: new Date("2026-10-24T12:00:00Z"),
    last_action: "Received and catalogued",
    last_action_date: new Date("2026-10-24T12:00:00Z"),
    next_action_required: "Allocate to officer",
    actions: [{ action_type: "RECEIVED", timestamp: new Date("2026-10-24T12:00:00Z") }],
    ...overrides,
  };
}

const overlap: RiskOverlapInput = {
  id: "ovl_1",
  institution_id: "inst_1",
  case_ids: ["AICTE/RB/2026/00001", "AICTE/RB/2026/00002"],
  bureaus_involved: ["REGULATION_BUREAU", "PGRC"],
  confidence: "HIGH",
  status: "OPEN",
};

describe("Sentinel risk engine", () => {
  it("keeps a fresh, low-priority file in the LOW band", () => {
    const risk = scoreCaseRisk(makeCase(), institution, [], now);
    expect(risk.score).toBeLessThan(40);
    expect(risk.band).toBe("LOW");
    expect(risk.isBreached).toBe(false);
    expect(risk.remainingDays).toBe(28);
  });

  it("flags a breached statutory clock, stagnation, overlap and escalation", () => {
    const risk = scoreCaseRisk(
      makeCase({
        category: "Ragging & Safety Violations",
        status: "ESCALATED",
        priority: "CRITICAL",
        date_received: new Date("2026-09-01T12:00:00Z"),
        last_action_date: new Date("2026-10-01T12:00:00Z"),
      }),
      institution,
      [overlap],
      now
    );

    expect(risk.isBreached).toBe(true);
    expect(risk.score).toBeGreaterThanOrEqual(80);
    expect(risk.band).toBe("CRITICAL");
    expect(risk.drivers.map((d) => d.label)).toEqual(
      expect.arrayContaining([
        "Statutory deadline crossed",
        "CRITICAL priority complaint",
        "No recorded movement",
        "Named in an open collision",
        "Escalated file",
        "Short statutory clock",
      ])
    );
    expect(risk.recommendation).toContain("joint case conference");
  });

  it("caps the score at 100 and sorts drivers by weight", () => {
    const risk = scoreCaseRisk(
      makeCase({
        category: "Ragging & Safety Violations",
        status: "ESCALATED",
        priority: "CRITICAL",
        date_received: new Date("2026-01-01T12:00:00Z"),
        last_action_date: new Date("2026-01-01T12:00:00Z"),
      }),
      institution,
      [overlap],
      now
    );

    expect(risk.score).toBe(96);
    for (let i = 1; i < risk.drivers.length; i += 1) {
      expect(risk.drivers[i - 1].points).toBeGreaterThanOrEqual(risk.drivers[i].points);
    }
  });

  it("maps score thresholds to the documented bands", () => {
    expect(bandFor(80)).toBe("CRITICAL");
    expect(bandFor(79)).toBe("HIGH");
    expect(bandFor(60)).toBe("HIGH");
    expect(bandFor(40)).toBe("MODERATE");
    expect(bandFor(39)).toBe("LOW");
  });

  it("builds a portfolio radar with horizons and a watchlist", () => {
    const breached = makeCase({
      id: "case_2",
      case_id: "AICTE/RB/2026/00002",
      category: "Ragging & Safety Violations",
      status: "ESCALATED",
      priority: "CRITICAL",
      date_received: new Date("2026-09-01T12:00:00Z"),
      last_action_date: new Date("2026-10-20T12:00:00Z"),
    });
    const disposed = makeCase({ id: "case_3", case_id: "AICTE/RB/2026/00003", status: "DISPOSED" });

    const radar = buildRiskRadar([makeCase(), breached, disposed], [institution], [overlap], now);

    expect(radar.scored).toBe(2); // disposed files are excluded
    expect(radar.breached).toBe(1);
    expect(radar.bands.find((b) => b.band === "CRITICAL")?.count).toBe(1);
    expect(radar.watchlist).toContain(breached.case_id);
    expect(radar.horizons.map((h) => h.days)).toEqual([7, 15, 30]);
    expect(radar.exposure).toBeGreaterThan(0);
  });

  it("recommends a workflow action and benchmarks against closed peers", () => {
    const closed = makeCase({
      id: "case_9",
      case_id: "AICTE/RB/2026/00009",
      status: "DISPOSED",
      date_received: new Date("2026-09-01T12:00:00Z"),
      last_action_date: new Date("2026-09-21T12:00:00Z"),
    });

    const insight = buildCaseInsight(
      makeCase(),
      institution,
      [overlap],
      [makeCase(), closed],
      [institution],
      now
    );

    expect(insight.recommendation.action).toBe("LINK");
    expect(insight.overlap?.confidence).toBe("HIGH");
    expect(insight.similar).toHaveLength(1);
    expect(insight.benchmark?.avgDays).toBe(20);
    expect(insight.slaText).toBe("28 days remaining");
  });
});
