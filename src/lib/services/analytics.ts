import type { SeedCase, SeedInstitution } from "@/lib/mock-data-generator";
import { SLA_CONFIGS } from "@/lib/demo-data";
import { calculateCaseSla } from "./sla-engine";

/**
 * Deterministic analytics — backlog forecast, region×category breach heatmap
 * and precedent statistics for closed files.
 *
 * Every number here is reproducible from the registry itself: a linear
 * intake-vs-disposal projection instead of a black-box model, a plain breach
 * density ratio for the heatmap, and keyword-classified outcomes for the
 * precedent cards. This is a deliberate "no black-box" companion to the AI
 * surfaces — the figures an officer signs off on must survive an audit.
 */

/* ── Backlog forecast ─────────────────────────────────────────────────────── */

export interface ForecastHorizon {
  days: number;
  /** Projected count of open files at that horizon (never below zero). */
  projectedOpen: number;
}

export interface BacklogForecastResult {
  backlog: number;
  windowDays: number;
  recentIntake: number;
  recentDisposals: number;
  intakePerDay: number;
  disposalPerDay: number;
  netPerDay: number;
  projections: ForecastHorizon[];
  /** Weeks of sustained rates needed to reach zero; null when backlog grows. */
  weeksToClear: number | null;
}

/** The UTC day a case was actually disposed, from its action history. */
function disposedAtOf(c: SeedCase): number {
  const disposed = c.actions
    .filter((a) => a.action_type === "DISPOSED")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
  return disposed
    ? new Date(disposed.timestamp).getTime()
    : new Date(c.last_action_date).getTime();
}

/**
 * Linear what-if projection: open backlog today, observed intake and disposal
 * rates over the trailing window, and the backlog each horizon would carry if
 * those rates simply continue.
 */
export function computeBacklogForecast(
  cases: SeedCase[],
  now: Date = new Date(),
  horizons: number[] = [30, 60, 90],
  windowDays = 30
): BacklogForecastResult {
  const nowMs = now.getTime();
  const windowStart = nowMs - windowDays * 86400000;

  const active = cases.filter((c) => c.status !== "DISPOSED");
  const backlog = active.length;

  let recentIntake = 0;
  let recentDisposals = 0;
  for (const c of cases) {
    if (new Date(c.date_received).getTime() >= windowStart) recentIntake++;
    // Disposals are counted independently of intake so a file that both
    // entered and left the registry inside the window moves both rates.
    if (c.status === "DISPOSED" && disposedAtOf(c) >= windowStart) recentDisposals++;
  }

  const intakePerDay = round2(recentIntake / windowDays);
  const disposalPerDay = round2(recentDisposals / windowDays);
  const netPerDay = round2(intakePerDay - disposalPerDay);

  const projections = horizons.map((days) => ({
    days,
    projectedOpen: Math.max(0, Math.round(backlog + netPerDay * days)),
  }));

  const weeksToClear =
    netPerDay < 0 && backlog > 0
      ? Math.max(1, Math.ceil(backlog / Math.abs(netPerDay) / 7))
      : null;

  return {
    backlog,
    windowDays,
    recentIntake,
    recentDisposals,
    intakePerDay,
    disposalPerDay,
    netPerDay,
    projections,
    weeksToClear,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ── Breach heatmap (region × category) ──────────────────────────────────── */

export interface HeatmapCell {
  region: string;
  category: string;
  /** Open files in the cell. */
  active: number;
  /** Open files already past their statutory window. */
  breached: number;
  /** breached / active as a whole percentage. */
  density: number;
}

export interface BreachHeatmap {
  regions: string[];
  categories: string[];
  cells: HeatmapCell[];
  maxDensity: number;
}

const CANONICAL_REGIONS = [
  "Northern",
  "Western",
  "Southern",
  "Eastern",
  "Central",
  "North-Western",
  "South-Western",
];

/**
 * Breach density per regional office × grievance category, over open files
 * only (disposed files are, by definition, no longer under SLA pressure).
 */
export function computeBreachHeatmap(
  cases: SeedCase[],
  institutions: SeedInstitution[]
): BreachHeatmap {
  const categories = SLA_CONFIGS.map((s) => s.category);
  const regionOf = new Map(institutions.map((i) => [i.id, i.region]));
  const regions = CANONICAL_REGIONS.filter((r) =>
    institutions.some((i) => i.region === r)
  );

  const key = (region: string, category: string) => `${region}||${category}`;
  const cells = new Map<string, HeatmapCell>();
  for (const region of regions) {
    for (const category of categories) {
      cells.set(key(region, category), { region, category, active: 0, breached: 0, density: 0 });
    }
  }

  for (const c of cases) {
    if (c.status === "DISPOSED") continue;
    const region = regionOf.get(c.institution_id);
    if (!region) continue;
    const cell = cells.get(key(region, c.category));
    if (!cell) continue;
    cell.active++;
    if (calculateCaseSla(c.category, c.date_received, c.status).isBreached) cell.breached++;
  }

  const list = [...cells.values()].map((cell) => ({
    ...cell,
    density: cell.active > 0 ? Math.round((cell.breached / cell.active) * 100) : 0,
  }));

  return {
    regions,
    categories,
    cells: list,
    maxDensity: Math.max(0, ...list.map((c) => c.density)),
  };
}

/* ── Precedent statistics ────────────────────────────────────────────────── */

export interface PrecedentExample {
  id: string;
  case_id: string;
  institution_name: string;
  category: string;
  bureau: string;
  /** Days from receipt to disposal. */
  days: number;
  onTime: boolean;
  outcome: string;
  disposedAt: Date;
  /** Closing remarks excerpt (first sentence). */
  outcomeNote: string;
}

export interface PrecedentStats {
  category: string;
  similarDisposed: number;
  medianDays: number;
  avgDays: number;
  onTimeRate: number;
  outcomeDistribution: { outcome: string; count: number }[];
  examples: PrecedentExample[];
}

const OUTCOME_RULES: [RegExp, string][] = [
  [/show.?cause|\bscn\b/i, "Show-cause notice issued"],
  [/refund|reimburse|penalt|fine/i, "Refund or penalty ordered"],
  [/inspection|verif|\bevc\b|site visit/i, "Inspection & compliance verified"],
  [/certificate|marksheet|marksheet|release.*document|document.*release/i, "Certificates released"],
  [/not substantiated|frivolous|no grievance|closed without/i, "Closed — grievance not substantiated"],
  [/direction|instruct|comply|order/i, "Directions issued to institution"],
];

/** Keyword classification of how a comparable file was actually closed. */
function classifyOutcome(disposalRemarks: string): string {
  for (const [pattern, label] of OUTCOME_RULES) {
    if (pattern.test(disposalRemarks)) return label;
  }
  return "Resolved with corrective action";
}

function timelineDaysFor(category: string): number {
  return (
    SLA_CONFIGS.find((s) => s.category.toLowerCase() === category.toLowerCase())
      ?.timeline_days ?? 30
  );
}

/**
 * How were comparable grievances resolved? Pools DISPOSED files of the same
 * category, derives disposal durations, an on-time rate against the statutory
 * window and a keyword-classified outcome mix, and returns the three most
 * recent comparable closures as cards.
 */
export function computePrecedentStats(input: {
  category: string;
  excludeCaseId?: string;
  cases: SeedCase[];
  institutions: SeedInstitution[];
  now?: Date;
}): PrecedentStats {
  const { category, excludeCaseId, cases, institutions } = input;
  const nameOf = new Map(institutions.map((i) => [i.id, i.name]));
  const timeline = timelineDaysFor(category);

  const pool: PrecedentExample[] = [];
  for (const c of cases) {
    if (c.status !== "DISPOSED") continue;
    if (c.category.toLowerCase() !== category.toLowerCase()) continue;
    if (excludeCaseId && (c.id === excludeCaseId || c.case_id === excludeCaseId)) continue;

    const disposedTs = disposedAtOf(c);
    const days = Math.max(1, Math.round((disposedTs - new Date(c.date_received).getTime()) / 86400000));
    const disposalAction = c.actions
      .filter((a) => a.action_type === "DISPOSED")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const remarks = disposalAction?.remarks ?? c.last_action ?? "";

    pool.push({
      id: c.id,
      case_id: c.case_id,
      institution_name: nameOf.get(c.institution_id) ?? "Institution on record",
      category: c.category,
      bureau: c.assigned_bureau,
      days,
      onTime: days <= timeline,
      outcome: classifyOutcome(remarks),
      disposedAt: new Date(disposedTs),
      outcomeNote: remarks.split(/(?<=\.)\s/)[0]?.slice(0, 180) || "Disposed with recorded directions.",
    });
  }

  pool.sort((a, b) => b.disposedAt.getTime() - a.disposedAt.getTime());

  const durations = pool.map((p) => p.days).sort((a, b) => a - b);
  const medianDays = durations.length
    ? durations.length % 2 === 1
      ? durations[(durations.length - 1) / 2]
      : Math.round((durations[durations.length / 2 - 1] + durations[durations.length / 2]) / 2)
    : 0;
  const avgDays = durations.length
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0;
  const onTimeRate = pool.length
    ? Math.round((pool.filter((p) => p.onTime).length / pool.length) * 100)
    : 0;

  const outcomeMap = new Map<string, number>();
  for (const p of pool) outcomeMap.set(p.outcome, (outcomeMap.get(p.outcome) ?? 0) + 1);
  const outcomeDistribution = [...outcomeMap.entries()]
    .map(([outcome, count]) => ({ outcome, count }))
    .sort((a, b) => b.count - a.count);

  return {
    category,
    similarDisposed: pool.length,
    medianDays,
    avgDays,
    onTimeRate,
    outcomeDistribution,
    examples: pool.slice(0, 3),
  };
}
