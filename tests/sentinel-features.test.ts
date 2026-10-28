import { describe, it, expect } from "vitest";
import {
  computeTrilayer,
  deriveTrilayerFromCases,
  type CaseWithInstitution,
} from "@/lib/services/overlap-detector";
import {
  assessInstitutionCompliance,
  replyDeadline,
  showCauseReference,
} from "@/lib/services/aph-engine";
import { routeComplaint, sampleComplaint } from "@/lib/services/ingestion-engine";

function caseRecord(overrides: Partial<CaseWithInstitution> = {}): CaseWithInstitution {
  return {
    id: "case_1",
    case_id: "AICTE/RB/2026/00001",
    institution_id: "inst_1",
    institution_aicte_id: "1-1029384751",
    institution_name: "Apex Institute of Engineering & Technology",
    institution_normalized_name: "apex",
    institution_city: "Kanpur",
    institution_state: "Uttar Pradesh",
    institution_pincode: "208016",
    category: "Capitation Fee & Overcharging",
    description:
      "Students allege an unauthorised capitation fee was collected before the semester examination.",
    assigned_bureau: "REGULATION_BUREAU",
    status: "UNDER_PROCESS",
    date_received: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

describe("Trilayer explainability", () => {
  it("scores an exact Permanent ID match strongly and explains every layer", () => {
    const target = caseRecord();
    const other = caseRecord({
      id: "case_2",
      case_id: "AICTE/PGRC/2026/00002",
      assigned_bureau: "PGRC",
      date_received: new Date("2026-10-06T00:00:00Z"),
    });

    const result = computeTrilayer({
      target,
      other,
      exactId: true,
      nameSimilarity: 1,
      sameLocation: true,
      sameCategory: true,
      contentSimilarity: 0.5,
    });

    expect(result.entity.score).toBe(100);
    expect(result.entity.evidence.join(" ")).toContain("Identical AICTE Permanent ID");
    expect(result.temporal.score).toBe(100);
    expect(result.total).toBeGreaterThanOrEqual(80);
    expect(result.formula).toContain("Entity 45%");
  });

  it("reconstructs seeded fuzzy alerts without claiming an exact ID", () => {
    const result = deriveTrilayerFromCases(caseRecord(), caseRecord(), {
      exactIdOverride: false,
      nameSimilarityOverride: 0.91,
    });

    expect(result.entity.score).toBeLessThan(100);
    expect(result.entity.evidence.join(" ")).toContain("91% name similarity");
    expect(result.entity.evidence.join(" ")).not.toContain("Identical AICTE Permanent ID");
  });
});

describe("Ingestion routing", () => {
  it("routes fee complaints to the Regulation Bureau with the 30-day clock", () => {
    const decision = routeComplaint({
      category: "Capitation Fee & Overcharging",
      channel: "CPGRAMS",
    });

    expect(decision.bureau).toBe("REGULATION_BUREAU");
    expect(decision.priority).toBe("CRITICAL");
    expect(decision.slaDays).toBe(30);
    expect(decision.regulatory).toBe(true);
    expect(decision.rationale.join(" ")).toContain("CPGRAMS");
  });

  it("escalates a vigilance reference and preserves the institution in the sample", () => {
    const decision = routeComplaint({
      category: "Withholding Certificates",
      channel: "VIGILANCE",
    });
    const text = sampleComplaint(
      "Withholding Certificates",
      "VIGILANCE",
      "Apex Institute of Engineering & Technology"
    );

    expect(decision.bureau).toBe("REGULATION_BUREAU");
    expect(decision.priority).toBe("CRITICAL");
    expect(text).toContain("Apex Institute of Engineering & Technology");
    expect(text).toContain("Vigilance");
  });
});

describe("APH compliance engine", () => {
  it("flags EoA, EVC and show-cause exposure for a critical multi-bureau record", () => {
    const assessment = assessInstitutionCompliance(
      {
        id: "inst_1",
        name: "Apex Institute of Engineering & Technology",
        aicte_permanent_id: "1-1029384751",
        city: "Kanpur",
        state: "Uttar Pradesh",
        region: "Northern",
        institution_type: "Engineering & Technology",
      },
      [
        {
          id: "case_1",
          case_id: "AICTE/RB/2026/00001",
          category: "Capitation Fee & Overcharging",
          status: "UNDER_PROCESS",
          priority: "CRITICAL",
          assigned_bureau: "REGULATION_BUREAU",
          date_received: new Date("2026-09-01T00:00:00Z"),
          sla: {
            isBreached: true,
            isApproaching: false,
            remainingDays: -5,
            timelineDays: 30,
          },
        },
        {
          id: "case_2",
          case_id: "AICTE/PGRC/2026/00002",
          category: "Capitation Fee & Overcharging",
          status: "PENDING",
          priority: "HIGH",
          assigned_bureau: "PGRC",
          date_received: new Date("2026-09-10T00:00:00Z"),
          sla: {
            isBreached: false,
            isApproaching: true,
            remainingDays: 2,
            timelineDays: 30,
          },
        },
        {
          id: "case_3",
          case_id: "AICTE/AB/2026/00003",
          category: "Unapproved Courses & Seats",
          status: "ESCALATED",
          priority: "CRITICAL",
          assigned_bureau: "APPROVAL_BUREAU",
          date_received: new Date("2026-09-15T00:00:00Z"),
          sla: {
            isBreached: true,
            isApproaching: false,
            remainingDays: -2,
            timelineDays: 30,
          },
        },
      ],
      [
        {
          id: "ovl_001",
          status: "OPEN",
          case_ids: ["AICTE/RB/2026/00001", "AICTE/PGRC/2026/00002"],
          confidence: "HIGH",
        },
      ]
    );

    expect(assessment.score).toBeGreaterThanOrEqual(75);
    expect(assessment.band).toBe("CRITICAL");
    expect(assessment.eoa.flag).toBe(true);
    expect(assessment.evc.flag).toBe(true);
    expect(assessment.showCauseEligible).toBe(true);
    expect(assessment.aphClauses.length).toBeGreaterThan(0);
    expect(assessment.eoa.conditions.length).toBeGreaterThan(0);
  });

  it("derives a stable notice reference and a readable reply deadline", () => {
    expect(showCauseReference("AICTE/PGRC/2026/00101")).toMatch(
      /^AICTE\/SCN\/\d{4}\/00101$/
    );
    expect(replyDeadline(15)).toMatch(/\d{2} \w+ \d{4}/);
  });
});
