import { describe, it, expect } from "vitest";
import {
  StandardOverlapDetector,
  calculateTrigramSimilarity,
  CaseWithInstitution,
} from "@/lib/services/overlap-detector";
import { normalizeInstitutionName } from "@/lib/demo-data";

describe("OverlapDetector Unit Tests", () => {
  const detector = new StandardOverlapDetector();

  it("calculates trigram similarity correctly", () => {
    // Identical strings
    expect(calculateTrigramSimilarity("Apex College", "Apex College")).toBe(1.0);

    // Minor variations in spelling
    const sim = calculateTrigramSimilarity(
      "St. Xavier Institute of Management",
      "St Xavier Inst of Management"
    );
    expect(sim).toBeGreaterThanOrEqual(0.65);

    // Completely disjoint
    const zeroSim = calculateTrigramSimilarity("IIT Bombay", "Anna University");
    expect(zeroSim).toBeLessThan(0.2);
  });

  it("normalizes institution names by stripping stop words and punctuation", () => {
    const raw = "Apex Institute of Engineering & Technology, Kanpur";
    const norm = normalizeInstitutionName(raw);
    expect(norm).toBe("apex kanpur");
  });

  it("detects Rule 1: Exact AICTE Permanent ID overlap across distinct bureaus (Sample from Problem Statement)", async () => {
    const casePgrc: CaseWithInstitution = {
      id: "c1",
      case_id: "AICTE/PGRC/2026/00101",
      institution_id: "inst_apex",
      institution_aicte_id: "1-1029384751",
      institution_name: "Apex Institute of Engineering & Technology",
      category: "Capitation Fee & Overcharging",
      description: "Students report illegal fee collection of 45000",
      assigned_bureau: "PGRC",
      status: "UNDER_PROCESS",
    };

    const caseRb: CaseWithInstitution = {
      id: "c2",
      case_id: "AICTE/RB/2026/00042",
      institution_id: "inst_apex",
      institution_aicte_id: "1-1029384751",
      institution_name: "Apex Institute of Engineering & Technology",
      category: "Capitation Fee & Overcharging",
      description: "Faculty report capitation fees being demanded",
      assigned_bureau: "REGULATION_BUREAU",
      status: "PENDING",
    };

    const alerts = await detector.checkCase(caseRb, [casePgrc]);
    expect(alerts.length).toBe(1);
    const alert = alerts[0];

    expect(alert.confidence).toBe("HIGH");
    expect(alert.case_ids).toContain("AICTE/PGRC/2026/00101");
    expect(alert.case_ids).toContain("AICTE/RB/2026/00042");
    expect(alert.bureaus_involved).toEqual(["PGRC", "REGULATION_BUREAU"]);

    const exactIdReason = alert.match_reasons.find((r) => r.rule === "EXACT_PERMANENT_ID");
    expect(exactIdReason).toBeDefined();
    expect(exactIdReason?.description).toContain("1-1029384751");
  });

  it("detects Rule 2: Fuzzy institution match when names differ across bureaus but location matches", async () => {
    const caseA: CaseWithInstitution = {
      id: "c_a",
      case_id: "AICTE/AB/2026/00222",
      institution_id: "inst_xavier_1",
      institution_name: "St. Xavier Institute of Management",
      institution_normalized_name: "xavier",
      institution_city: "Lucknow",
      institution_state: "Uttar Pradesh",
      institution_pincode: "226010",
      category: "Unapproved Courses & Seats",
      description: "Running unapproved PGDM branches",
      assigned_bureau: "APPROVAL_BUREAU",
      status: "UNDER_PROCESS",
    };

    const caseB: CaseWithInstitution = {
      id: "c_b",
      case_id: "AICTE/RB/2026/00333",
      institution_id: "inst_xavier_2",
      institution_name: "St Xaviers Inst of Mgmt",
      institution_normalized_name: "xaviers",
      institution_city: "Lucknow",
      institution_state: "Uttar Pradesh",
      institution_pincode: "226010",
      category: "Unapproved Courses & Seats",
      description: "Unauthorized seat intake in management quota",
      assigned_bureau: "REGULATION_BUREAU",
      status: "PENDING",
    };

    const alerts = await detector.checkCase(caseB, [caseA]);
    expect(alerts.length).toBe(1);
    expect(alerts[0].confidence).toBe("HIGH"); // High due to fuzzy match + same category
    expect(alerts[0].match_reasons.some((r) => r.rule === "FUZZY_NAME_AND_LOCATION")).toBe(true);
  });

  it("does not report overlap if cases belong to the same Bureau", async () => {
    const case1: CaseWithInstitution = {
      id: "c1",
      case_id: "AICTE/PGRC/2026/001",
      institution_id: "inst_1",
      institution_aicte_id: "1-999999",
      category: "Capitation Fee",
      description: "Test",
      assigned_bureau: "PGRC",
      status: "UNDER_PROCESS",
    };

    const case2: CaseWithInstitution = {
      id: "c2",
      case_id: "AICTE/PGRC/2026/002",
      institution_id: "inst_1",
      institution_aicte_id: "1-999999",
      category: "Capitation Fee",
      description: "Test 2",
      assigned_bureau: "PGRC",
      status: "UNDER_PROCESS",
    };

    const alerts = await detector.checkCase(case1, [case2]);
    expect(alerts.length).toBe(0);
  });

  it("does not report overlap if one case is already DISPOSED", async () => {
    const openCase: CaseWithInstitution = {
      id: "c1",
      case_id: "AICTE/RB/2026/001",
      institution_id: "inst_1",
      institution_aicte_id: "1-999999",
      category: "Capitation Fee",
      description: "Test",
      assigned_bureau: "REGULATION_BUREAU",
      status: "UNDER_PROCESS",
    };

    const closedCase: CaseWithInstitution = {
      id: "c2",
      case_id: "AICTE/PGRC/2026/002",
      institution_id: "inst_1",
      institution_aicte_id: "1-999999",
      category: "Capitation Fee",
      description: "Test 2",
      assigned_bureau: "PGRC",
      status: "DISPOSED",
    };

    const alerts = await detector.checkCase(openCase, [closedCase]);
    expect(alerts.length).toBe(0);
  });

  it("batchScan deduplicates alerts and returns unique case pairs", async () => {
    const cases: CaseWithInstitution[] = [
      {
        id: "c1",
        case_id: "AICTE/RB/2026/001",
        institution_id: "inst_1",
        institution_aicte_id: "1-999999",
        category: "Capitation Fee",
        description: "Test 1",
        assigned_bureau: "REGULATION_BUREAU",
        status: "UNDER_PROCESS",
      },
      {
        id: "c2",
        case_id: "AICTE/PGRC/2026/002",
        institution_id: "inst_1",
        institution_aicte_id: "1-999999",
        category: "Capitation Fee",
        description: "Test 2",
        assigned_bureau: "PGRC",
        status: "PENDING",
      },
    ];

    const alerts = await detector.batchScan(cases);
    expect(alerts.length).toBe(1);
  });
});
