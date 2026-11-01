import { describe, it, expect } from "vitest";
import {
  analyzeComplainants,
  normalizeComplainant,
  RECUR_THRESHOLDS,
  RECURRENCE_META,
} from "@/lib/services/complainant-engine";

describe("Complainant Engine (recurring detection)", () => {
  it("normalizes complainant names deterministically", () => {
    expect(normalizeComplainant("  Rohit  Sharma (Union) ")).toBe("rohit sharma");
    expect(normalizeComplainant("ROHIT SHARMA")).toBe("rohit sharma");
  });

  it("groups repeated filings by the same identity", () => {
    const cases = [
      { case_id: "C1", complainant_name: "Devika Menon", status: "PENDING", category: "Capitation Fee & Overcharging", assigned_bureau: "PGRC", date_received: new Date("2026-10-01"), institution_name: "I1" },
      { case_id: "C2", complainant_name: "Devika Menon", status: "DISPOSED", category: "Withholding Certificates", assigned_bureau: "REGULATION_BUREAU", date_received: new Date("2026-10-05"), institution_name: "I2" },
      { case_id: "C3", complainant_name: "Farhan Qureshi", status: "PENDING", category: "Ragging & Safety Violations", assigned_bureau: "SKILL_CELL", date_received: new Date("2026-10-02"), institution_name: "I3" },
    ];
    const summary = analyzeComplainants(cases as any);
    const devika = summary.byKey.get("devika menon");
    expect(devika).toBeDefined();
    expect(devika!.totalCases).toBe(2);
    expect(devika!.bureaus.length).toBe(2);
    expect(devika!.institutions.length).toBe(2);
    expect(summary.crossBureauProfiles.length).toBe(1);
  });

  it("flags prolific complainants at the configured threshold", () => {
    const cases = Array.from({ length: 6 }, (_, i) => ({
      case_id: `C${i}`,
      complainant_name: "Prolific Person",
      status: "PENDING",
      category: "Other Institutional Grievances",
      assigned_bureau: "PGRC",
      date_received: new Date(`2026-10-0${i + 1}`),
      institution_name: "I1",
    }));
    const summary = analyzeComplainants(cases as any);
    expect(summary.profiles.length).toBe(1);
    expect(summary.profiles[0].level).toBe("PROLIFIC");
    expect(summary.prolificCount).toBe(1);
    expect(RECUR_THRESHOLDS.prolific).toBe(5);
  });

  it("does not flag single-filing identities in the watch list", () => {
    const cases = [
      { case_id: "C1", complainant_name: "One Time Filer", status: "PENDING", category: "Other Institutional Grievances", assigned_bureau: "PGRC", date_received: new Date("2026-10-01"), institution_name: "I1" },
    ];
    const summary = analyzeComplainants(cases as any);
    expect(summary.profiles.length).toBe(0);
  });

  it("sorts watch-list profiles by total cases descending", () => {
    const cases = [
      { case_id: "C1", complainant_name: "Alpha", status: "PENDING", category: "X", assigned_bureau: "PGRC", date_received: new Date("2026-10-01"), institution_name: "I" },
      { case_id: "C2", complainant_name: "Alpha", status: "PENDING", category: "X", assigned_bureau: "PGRC", date_received: new Date("2026-10-02"), institution_name: "I" },
      { case_id: "C3", complainant_name: "Beta", status: "PENDING", category: "X", assigned_bureau: "PGRC", date_received: new Date("2026-10-03"), institution_name: "I" },
      { case_id: "C4", complainant_name: "Beta", status: "PENDING", category: "X", assigned_bureau: "PGRC", date_received: new Date("2026-10-04"), institution_name: "I" },
      { case_id: "C5", complainant_name: "Beta", status: "PENDING", category: "X", assigned_bureau: "PGRC", date_received: new Date("2026-10-05"), institution_name: "I" },
    ];
    const summary = analyzeComplainants(cases as any);
    expect(summary.profiles[0].name).toBe("Beta");
    expect(summary.profiles[0].totalCases).toBe(3);
  });

  it("RECURRENCE_META covers every level", () => {
    expect(RECURRENCE_META.WATCH).toBeDefined();
    expect(RECURRENCE_META.REPEAT).toBeDefined();
    expect(RECURRENCE_META.PROLIFIC).toBeDefined();
  });
});