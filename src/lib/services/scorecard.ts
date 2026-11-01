import { calculateCaseSla } from "./sla-engine";

/**
 * Bureau scorecard — per-bureau statutory performance grading used by the
 * Reports workspace and the weekly executive PDF digest. Entirely offline and
 * derived from the same SLA engine the rest of the platform uses, so numbers
 * always reconcile with the dashboard.
 */

export interface BureauScorecardRow {
  bureau: string;
  totalCases: number;
  pending: number;
  underProcess: number;
  disposed: number;
  transferred: number;
  escalated: number;
  beyondTimeline: number;
  disposalRatePercent: number;
  onTimeRatePercent: number;
  avgAgeDays: number;
  oldestActiveDays: number;
  grade: "A" | "B" | "C" | "D";
}

export interface BureauScorecardInput {
  case_id: string;
  status: string;
  assigned_bureau: string;
  date_received: Date | string;
  last_action_date: Date | string;
  category: string;
}

const BUREAU_ORDER = [
  "REGULATION_BUREAU",
  "PGRC",
  "APPROVAL_BUREAU",
  "SKILL_CELL",
];

export function computeBureauScorecard(
  cases: BureauScorecardInput[],
  referenceDate: Date = new Date()
): BureauScorecardRow[] {
  const groups = new Map<string, BureauScorecardInput[]>();
  for (const c of cases) {
    const list = groups.get(c.assigned_bureau) ?? [];
    list.push(c);
    groups.set(c.assigned_bureau, list);
  }

  const rows: BureauScorecardRow[] = [];
  for (const [bureau, list] of groups) {
    const valid = list.filter((c) => c.status !== "TRANSFERRED");
    const disposedCases = valid.filter((c) => c.status === "DISPOSED");
    const pending = valid.filter((c) => c.status === "PENDING").length;
    const underProcess = valid.filter((c) => c.status === "UNDER_PROCESS").length;
    const escalated = valid.filter((c) => c.status === "ESCALATED").length;
    const transferred = list.filter((c) => c.status === "TRANSFERRED").length;

    const beyondTimeline = valid.filter((c) => {
      if (c.status === "DISPOSED") return false;
      const sla = calculateCaseSla(c.category, c.date_received, c.status, referenceDate);
      return sla.isBreached;
    }).length;

    const onTime = disposedCases.filter((c) => {
      const resolved =
        (new Date(c.last_action_date).getTime() -
          new Date(c.date_received).getTime()) /
        86400000;
      const sla = calculateCaseSla(
        c.category,
        c.date_received,
        "DISPOSED",
        new Date(c.last_action_date)
      );
      return resolved <= sla.timelineDays;
    }).length;

    const ages = valid.map(
      (c) =>
        (referenceDate.getTime() - new Date(c.date_received).getTime()) / 86400000
    );

    const disposalRatePercent = valid.length
      ? Math.round((disposedCases.length / valid.length) * 100)
      : 0;
    const onTimeRatePercent = disposedCases.length
      ? Math.round((onTime / disposedCases.length) * 100)
      : 0;

    rows.push({
      bureau,
      totalCases: list.length,
      pending,
      underProcess,
      disposed: disposedCases.length,
      transferred,
      escalated,
      beyondTimeline,
      disposalRatePercent,
      onTimeRatePercent,
      avgAgeDays: ages.length ? Math.round(ages.reduce((a, b) => a + Math.max(0, b), 0) / ages.length) : 0,
      oldestActiveDays: ages.length ? Math.round(Math.max(0, ...ages)) : 0,
      grade: gradeBureau(beyondTimeline, onTimeRatePercent),
    });
  }

  rows.sort(
    (a, b) =>
      BUREAU_ORDER.indexOf(a.bureau) - BUREAU_ORDER.indexOf(b.bureau)
  );
  return rows;
}

/**
 * Grading blends statutory discipline (share of closures on time) with the
 * open breach load:
 *  A ≥ 85% on-time and ≤ 5% of active files breached
 *  B ≥ 70% on-time and ≤ 10% breached
 *  C ≥ 50% on-time
 *  D otherwise
 */
export function gradeBureau(
  beyondTimeline: number,
  onTimeRatePercent: number
): "A" | "B" | "C" | "D" {
  if (onTimeRatePercent >= 85 && beyondTimeline <= 5) return "A";
  if (onTimeRatePercent >= 70 && beyondTimeline <= 10) return "B";
  if (onTimeRatePercent >= 50) return "C";
  return "D";
}
