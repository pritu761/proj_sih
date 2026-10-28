import { calculateCaseSla, SlaStatusResult } from "./sla-engine";

/**
 * Sentinel risk engine
 * --------------------
 * A deterministic, explainable scoring model. Every point awarded to a case is
 * traceable to a single driver, which is surfaced in the UI. No black boxes:
 * officers can see exactly why a grievance is ranked as high risk.
 *
 * Weights (max 100):
 *   SLA pressure ........ 45  (percent of statutory timeline consumed)
 *   Priority ............ 15  (CRITICAL 15 / HIGH 10 / MEDIUM 5)
 *   Stagnation .......... 12  (no movement for 7+ days)
 *   Overlap exposure .... 10  (named in an open multi-bureau collision)
 *   Workflow churn ......  8  (escalated / repeatedly reassigned)
 *   Statutory category ..  6  (7- or 15-day category)
 */

export type RiskBand = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export interface RiskCaseInput {
  id: string;
  case_id: string;
  institution_id: string;
  category: string;
  status: string;
  priority: string;
  assigned_bureau: string;
  assigned_officer?: string;
  date_received: Date | string;
  last_action: string;
  last_action_date: Date | string;
  next_action_required?: string | null;
  actions?: { action_type: string; timestamp: Date | string }[];
}

export interface RiskInstitutionInput {
  id: string;
  name: string;
  city?: string;
  state?: string;
  region?: string;
}

export interface RiskOverlapInput {
  id: string;
  institution_id: string;
  case_ids: string[];
  bureaus_involved: string[];
  confidence: string;
  status: string;
  detected_at?: Date | string;
}

export interface RiskDriver {
  label: string;
  detail: string;
  points: number;
}

export interface CaseRisk {
  id: string;
  case_id: string;
  category: string;
  status: string;
  priority: string;
  bureau: string;
  institution_id: string;
  institution_name: string;
  institution_city: string;
  region: string;
  score: number;
  band: RiskBand;
  drivers: RiskDriver[];
  remainingDays: number;
  percentElapsed: number;
  isBreached: boolean;
  isApproaching: boolean;
  breachDate: string;
  lastActionDate: string;
  recommendation: string;
  overlapId: string | null;
}

export interface RiskRadar {
  generatedAt: string;
  scored: number;
  exposure: number;
  breached: number;
  bands: { band: RiskBand; count: number }[];
  horizons: { days: number; label: string; count: number }[];
  top: CaseRisk[];
  watchlist: string[];
}

export const BAND_META: Record<
  RiskBand,
  { label: string; color: string; text: string; bg: string; border: string; ring: string }
> = {
  CRITICAL: {
    label: "Critical",
    color: "#e11d48",
    text: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    ring: "stroke-rose-500",
  },
  HIGH: {
    label: "High",
    color: "#ea580c",
    text: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    ring: "stroke-orange-500",
  },
  MODERATE: {
    label: "Moderate",
    color: "#d97706",
    text: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "stroke-amber-500",
  },
  LOW: {
    label: "Low",
    color: "#059669",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "stroke-emerald-500",
  },
};

export function bandFor(score: number): RiskBand {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function daysBetween(from: Date | string, to: Date): number {
  return Math.floor((to.getTime() - new Date(from).getTime()) / 86400000);
}

const PRIORITY_POINTS: Record<string, number> = {
  CRITICAL: 15,
  HIGH: 10,
  MEDIUM: 5,
  LOW: 0,
};

const ACTIVE = new Set(["PENDING", "UNDER_PROCESS", "ESCALATED", "TRANSFERRED"]);

export function isActiveStatus(status: string): boolean {
  return ACTIVE.has(status);
}

/**
 * Scores a single case and explains every driver behind the score.
 */
export function scoreCaseRisk(
  c: RiskCaseInput,
  institution: RiskInstitutionInput | undefined,
  overlaps: RiskOverlapInput[],
  now: Date = new Date()
): CaseRisk {
  const sla: SlaStatusResult = calculateCaseSla(
    c.category,
    c.date_received,
    c.status,
    now
  );

  const drivers: RiskDriver[] = [];

  // 1. SLA pressure (0-45)
  const slaPoints = Math.min(45, Math.round(Math.min(100, sla.percentElapsed) * 0.45));
  if (slaPoints > 0) {
    drivers.push({
      label: sla.isBreached ? "Statutory deadline crossed" : "Timeline consumed",
      detail: sla.isBreached
        ? `${Math.abs(sla.remainingDays)} days beyond the ${sla.timelineDays}-day limit`
        : `${sla.percentElapsed}% of the ${sla.timelineDays}-day limit elapsed`,
      points: slaPoints,
    });
  }

  // 2. Priority (0-15)
  const priorityPoints = PRIORITY_POINTS[c.priority] ?? 0;
  if (priorityPoints > 0) {
    drivers.push({
      label: `${c.priority} priority complaint`,
      detail:
        c.priority === "CRITICAL"
          ? "Competent Authority attention band"
          : "Weighted above routine caseload",
      points: priorityPoints,
    });
  }

  // 3. Stagnation since the last recorded movement (0-12)
  const idleDays = Math.max(0, daysBetween(c.last_action_date, now));
  const stagnationPoints =
    idleDays > 7 ? Math.min(12, Math.round((idleDays - 7) * 1.2)) : 0;
  if (stagnationPoints > 0) {
    drivers.push({
      label: "No recorded movement",
      detail: `${idleDays} days since "${c.last_action}"`,
      points: stagnationPoints,
    });
  }

  // 4. Overlap exposure (0-10)
  const openOverlap = overlaps.find(
    (o) => o.institution_id === c.institution_id && o.status === "OPEN"
  );
  const namedInOverlap = Boolean(
    openOverlap && openOverlap.case_ids.includes(c.case_id)
  );
  const overlapPoints = namedInOverlap ? 10 : openOverlap ? 5 : 0;
  if (overlapPoints > 0 && openOverlap) {
    const others = openOverlap.bureaus_involved
      .map((b) => b.replace(/_/g, " ").replace("REGULATION BUREAU", "RB").replace("PUBLIC GRIEVANCE REDRESSAL CELL", "PGRC"))
      .join(" + ");
    drivers.push({
      label: namedInOverlap ? "Named in an open collision" : "Institution under collision",
      detail: `Parallel inquiry across ${others}`,
      points: overlapPoints,
    });
  }

  // 5. Workflow churn (0-8)
  const actionCount = c.actions?.length ?? 0;
  let churnPoints = 0;
  if (c.status === "ESCALATED") churnPoints = 8;
  else if (c.status === "TRANSFERRED") churnPoints = 5;
  else if (actionCount >= 4) churnPoints = 3;
  if (churnPoints > 0) {
    drivers.push({
      label: c.status === "ESCALATED" ? "Escalated file" : "Extended workflow history",
      detail:
        c.status === "ESCALATED"
          ? "Already escalated once without closure"
          : `${actionCount} recorded actions without disposal`,
      points: churnPoints,
    });
  }

  // 6. Statutory category weight (0-6)
  const categoryPoints = sla.timelineDays <= 15 ? 6 : sla.timelineDays <= 30 ? 3 : 0;
  if (categoryPoints > 0 && sla.timelineDays <= 30) {
    drivers.push({
      label: "Short statutory clock",
      detail: `${sla.timelineDays}-day category threshold`,
      points: categoryPoints,
    });
  }

  const score = Math.min(100, slaPoints + priorityPoints + stagnationPoints + overlapPoints + churnPoints + categoryPoints);
  const band = bandFor(score);
  const breachAt = new Date(new Date(c.date_received).getTime() + sla.timelineDays * 86400000);

  drivers.sort((a, b) => b.points - a.points);

  const recommendation = recommend(
    c,
    sla,
    openOverlap,
    namedInOverlap,
    idleDays,
    band
  );

  return {
    id: c.id,
    case_id: c.case_id,
    category: c.category,
    status: c.status,
    priority: c.priority,
    bureau: c.assigned_bureau,
    institution_id: c.institution_id,
    institution_name: institution?.name ?? "Unknown institution",
    institution_city: institution?.city ?? "",
    region: institution?.region ?? "",
    score,
    band,
    drivers,
    remainingDays: sla.remainingDays,
    percentElapsed: sla.percentElapsed,
    isBreached: sla.isBreached,
    isApproaching: sla.isApproaching,
    breachDate: breachAt.toISOString(),
    lastActionDate: new Date(c.last_action_date).toISOString(),
    recommendation,
    overlapId: openOverlap?.id ?? null,
  };
}

function recommend(
  c: RiskCaseInput,
  sla: SlaStatusResult,
  overlap: RiskOverlapInput | undefined,
  namedInOverlap: boolean,
  idleDays: number,
  band: RiskBand
): string {
  if (namedInOverlap && overlap) {
    const bureaus = overlap.bureaus_involved
      .map((b) =>
        b === "REGULATION_BUREAU" ? "RB" : b === "PGRC" ? "PGRC" : b === "APPROVAL_BUREAU" ? "AB" : "SDC"
      )
      .join(", ");
    return `Convene a joint case conference with ${bureaus} and nominate a lead bureau before any order is issued.`;
  }
  if (sla.isBreached) {
    return c.status === "ESCALATED"
      ? "Record a compliance note and fix a hearing date within 7 days."
      : "Issue an escalation memo to the Competent Authority within 48 hours and record the delay reason.";
  }
  if (sla.remainingDays <= 3) {
    return `Close the current hearing cycle - the statutory clock expires in ${sla.remainingDays} day${sla.remainingDays === 1 ? "" : "s"}.`;
  }
  if (idleDays >= 10) {
    return `Obtain a written status note from the assigned officer - no movement for ${idleDays} days.`;
  }
  if (c.status === "PENDING" && c.next_action_required) {
    return `Allocate the file and action "${c.next_action_required}" before the next review.`;
  }
  if (band === "LOW") {
    return "On track. Keep the scheduled checkpoint and confirm closure evidence at disposal.";
  }
  return "Hold the current trajectory and verify the next milestone is recorded in the timeline.";
}

/**
 * Builds the portfolio-level radar for the command centre.
 */
export function buildRiskRadar(
  cases: RiskCaseInput[],
  institutions: RiskInstitutionInput[],
  overlaps: RiskOverlapInput[],
  now: Date = new Date()
): RiskRadar {
  const instMap = new Map(institutions.map((i) => [i.id, i]));
  const scored = cases
    .filter((c) => isActiveStatus(c.status))
    .map((c) => scoreCaseRisk(c, instMap.get(c.institution_id), overlaps, now))
    .sort((a, b) => b.score - a.score || a.remainingDays - b.remainingDays);

  const bands: { band: RiskBand; count: number }[] = (
    ["CRITICAL", "HIGH", "MODERATE", "LOW"] as RiskBand[]
  ).map((band) => ({ band, count: scored.filter((c) => c.band === band).length }));

  const horizons = [7, 15, 30].map((days) => ({
    days,
    label: `${days} days`,
    count: scored.filter(
      (c) => !c.isBreached && c.remainingDays >= 0 && c.remainingDays <= days
    ).length,
  }));

  const exposure =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length)
      : 0;

  const watchlist = scored
    .filter((c) => c.score >= 60)
    .slice(0, 4)
    .map((c) => c.case_id);

  return {
    generatedAt: now.toISOString(),
    scored: scored.length,
    exposure,
    breached: scored.filter((c) => c.isBreached).length,
    bands,
    horizons,
    top: scored.slice(0, 6),
    watchlist,
  };
}

export interface SimilarCase {
  case_id: string;
  institution_name: string;
  resolutionDays: number;
  category: string;
}

export interface CaseInsight {
  risk: CaseRisk;
  recommendation: { title: string; detail: string; action: "STATUS" | "ESCALATE" | "REMARK" | "TRANSFER" | "LINK" };
  slaText: string;
  timelineDays: number;
  elapsedDays: number;
  similar: SimilarCase[];
  benchmark: { sample: number; avgDays: number; delta: number } | null;
  overlap: { id: string; bureaus: string[]; confidence: string } | null;
}

/**
 * Per-case insight used by the Sentinel Brief panel on the case workspace.
 */
export function buildCaseInsight(
  c: RiskCaseInput & { id: string },
  institution: RiskInstitutionInput | undefined,
  overlaps: RiskOverlapInput[],
  allCases: (RiskCaseInput & { id: string })[],
  institutions: RiskInstitutionInput[],
  now: Date = new Date()
): CaseInsight {
  const risk = scoreCaseRisk(c, institution, overlaps, now);
  const openOverlap = overlaps.find(
    (o) => o.institution_id === c.institution_id && o.status === "OPEN"
  );

  const instMap = new Map(institutions.map((i) => [i.id, i]));

  const similar = allCases
    .filter(
      (s) =>
        s.id !== c.id &&
        s.status === "DISPOSED" &&
        (s.category === c.category || s.institution_id === c.institution_id)
    )
    .slice(0, 3)
    .map((s) => ({
      case_id: s.case_id,
      institution_name: instMap.get(s.institution_id)?.name ?? "Unknown institution",
      category: s.category,
      resolutionDays: Math.max(
        0,
        Math.round(
          (new Date(s.last_action_date).getTime() - new Date(s.date_received).getTime()) /
            86400000
        )
      ),
    }));

  const benchmark =
    similar.length > 0
      ? {
          sample: similar.length,
          avgDays: Math.round(
            similar.reduce((sum, s) => sum + s.resolutionDays, 0) / similar.length
          ),
          delta: 0,
        }
      : null;

  if (benchmark) {
    benchmark.delta = benchmark.avgDays - daysBetween(c.date_received, now);
  }

  let action: CaseInsight["recommendation"]["action"] = "REMARK";
  if (risk.isBreached) action = "ESCALATE";
  else if (openOverlap) action = "LINK";
  else if (risk.status === "PENDING") action = "STATUS";

  const title = risk.isBreached
    ? "Escalate with delay justification"
    : openOverlap
      ? "Coordinate before further action"
      : risk.status === "PENDING"
        ? "Allocate and acknowledge"
        : "Record the next milestone";

  return {
    risk,
    recommendation: {
      title,
      detail: risk.recommendation,
      action,
    },
    slaText:
      risk.isBreached
        ? `${Math.abs(risk.remainingDays)} days overdue`
        : `${risk.remainingDays} days remaining`,
    timelineDays: calculateCaseSla(c.category, c.date_received, c.status, now).timelineDays,
    elapsedDays: calculateCaseSla(c.category, c.date_received, c.status, now).elapsedDays,
    similar,
    benchmark,
    overlap: openOverlap
      ? {
          id: openOverlap.id,
          bureaus: openOverlap.bureaus_involved,
          confidence: openOverlap.confidence,
        }
      : null,
  };
}
