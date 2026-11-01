/**
 * Recurring complainant detection (offline, deterministic).
 *
 * Unifies filings by the same person across All India Council for Technical
 * Education Bureaus — a signature that appears both in serial-victim scenarios
 * (one aggrieved person knocking on every door) and in orchestrated spam
 * campaigns (one source flooding multiple Bureaus). Applies the identical
 * trigram-style hashing philosophy as the overlap detector: normalize → group
 * → explainable counts, no black boxes.
 */

export type RecurrenceLevel = "WATCH" | "REPEAT" | "PROLIFIC";

export interface ComplainantProfile {
  key: string;
  name: string;
  contact: string | null;
  totalCases: number;
  openCases: number;
  disposedCases: number;
  categories: string[];
  institutions: string[];
  bureaus: string[];
  firstFiled: Date;
  lastFiled: Date;
  level: RecurrenceLevel;
  /** Case registry numbers attributed to this complainant, newest first */
  caseIds: string[];
}

export interface RecurrenceSummary {
  profiles: ComplainantProfile[];
  byKey: Map<string, ComplainantProfile>;
  prolificCount: number;
  repeatCount: number;
  watchCount: number;
  crossBureauProfiles: ComplainantProfile[];
}

/** A case needs to expose only these fields to the analyzer. */
export interface ComplainantCaseInput {
  case_id: string;
  complainant_name?: string | null;
  complainant_contact?: string | null;
  status: string;
  category: string;
  assigned_bureau: string;
  date_received: Date | string;
  institution_name?: string | null;
}

export function normalizeComplainant(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9\u0900-\u097f\u0980-\u09ff\u0b80-\u0bff\u0c00-\u0c7f]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ")
    .trim();
}

export const RECUR_THRESHOLDS = { watch: 2, repeat: 3, prolific: 5 } as const;

function levelFor(total: number): RecurrenceLevel {
  if (total >= RECUR_THRESHOLDS.prolific) return "PROLIFIC";
  if (total >= RECUR_THRESHOLDS.repeat) return "REPEAT";
  if (total >= RECUR_THRESHOLDS.watch) return "WATCH";
  return "WATCH";
}

/**
 * Builds explainable complainant profiles. Singletons (one filing) are retained
 * in the map for UI attribution but are not flagged and not returned in
 * `profiles` to keep watch-lists actionable.
 */
export function analyzeComplainants(
  cases: ComplainantCaseInput[]
): RecurrenceSummary {
  const groups = new Map<
    string,
    {
      displayNames: string[];
      contacts: Set<string>;
      entries: ComplainantCaseInput[];
    }
  >();

  for (const c of cases) {
    const rawName = (c.complainant_name ?? "").trim();
    if (!rawName) continue;
    const key = normalizeComplainant(rawName);
    if (!key) continue;

    let group = groups.get(key);
    if (!group) {
      group = { displayNames: [], contacts: new Set(), entries: [] };
      groups.set(key, group);
    }
    if (!group.displayNames.includes(rawName)) group.displayNames.push(rawName);
    if (c.complainant_contact) group.contacts.add(c.complainant_contact);
    group.entries.push(c);
  }

  const profiles: ComplainantProfile[] = [];
  const byKey = new Map<string, ComplainantProfile>();

  for (const [key, group] of groups) {
    const sorted = [...group.entries].sort(
      (a, b) =>
        new Date(b.date_received).getTime() - new Date(a.date_received).getTime()
    );
    const first = sorted[sorted.length - 1];
    const last = sorted[0];
    const openCases = sorted.filter(
      (c) => c.status !== "DISPOSED" && c.status !== "TRANSFERRED"
    ).length;

    const profile: ComplainantProfile = {
      key,
      name: group.displayNames[0],
      contact: group.contacts.values().next().value ?? null,
      totalCases: sorted.length,
      openCases,
      disposedCases: sorted.length - openCases,
      categories: Array.from(new Set(sorted.map((c) => c.category))),
      institutions: Array.from(
        new Set(sorted.map((c) => c.institution_name ?? "").filter(Boolean))
      ),
      bureaus: Array.from(new Set(sorted.map((c) => c.assigned_bureau))),
      firstFiled: new Date(first.date_received),
      lastFiled: new Date(last.date_received),
      level: levelFor(sorted.length),
      caseIds: sorted.map((c) => c.case_id),
    };

    byKey.set(key, profile);
    if (sorted.length >= RECUR_THRESHOLDS.watch) profiles.push(profile);
  }

  profiles.sort((a, b) => b.totalCases - a.totalCases);

  return {
    profiles,
    byKey,
    prolificCount: profiles.filter((p) => p.level === "PROLIFIC").length,
    repeatCount: profiles.filter((p) => p.level === "REPEAT").length,
    watchCount: profiles.filter((p) => p.level === "WATCH").length,
    crossBureauProfiles: profiles.filter((p) => p.bureaus.length >= 2),
  };
}

/** Badge + messaging metadata for the three escalation levels. */
export const RECURRENCE_META: Record<
  RecurrenceLevel,
  { label: string; chip: string; note: string }
> = {
  WATCH: {
    label: "Watch",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    note: "Second filing from this complainant — verify history before disposal.",
  },
  REPEAT: {
    label: "Repeat complainant",
    chip: "bg-orange-50 text-orange-700 border-orange-200",
    note: "3+ grievances linked to this identity. Check cross-Bureau filings for a coordinated pattern.",
  },
  PROLIFIC: {
    label: "Prolific complainant",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    note: "5+ grievances from the same identity — candidate for a single coordinated hearing or spam review.",
  },
};
