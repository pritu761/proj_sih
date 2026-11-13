import type { SeedCase, SeedInstitution } from "@/lib/mock-data-generator";
import {
  calculateContentSimilarity,
  calculateTrigramSimilarity,
} from "./overlap-detector";

/**
 * Possible-duplicate filings inside ONE bureau.
 *
 * The trilayer overlap detector only fires when two bureaus hold the same
 * institution's file simultaneously — cross-bureau coordination. This engine
 * complements it *within* a bureau: same institution, same grievance
 * category, similar narrative → the same complainant probably filed twice
 * (or two complainants reported the same incident). Those files should be
 * merged into one docket, not investigated twice.
 *
 * Deterministic scoring — no LLM, no black box:
 *   score = narrative similarity (60) + filing-burst bonus (25/12/4)
 *         + channel-diversity bonus (5)
 * Suggestions ≥ 55 are surfaced; ≥ 75 HIGH, ≥ 65 MEDIUM, else LOW.
 */

export interface MergePairSide {
  id: string;
  case_id: string;
  institution_name: string;
  category: string;
  bureau: string;
  status: string;
  priority: string;
  date_received: Date;
  assigned_officer: string;
  source: string;
  description: string;
}

export interface MergeSuggestion {
  /** Stable pair key (sorted internal ids) — used for dismissal markers. */
  key: string;
  score: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** Blended token + trigram narrative similarity, 0..1. */
  textSimilarity: number;
  filedDaysApart: number;
  rationale: string[];
  /** Earliest-filed side (recommended master docket). */
  a: MergePairSide;
  b: MergePairSide;
}

const MIN_SCORE = 55;
const DEFAULT_LIMIT = 25;

function toSide(c: SeedCase, institutions: SeedInstitution[]): MergePairSide {
  const inst = institutions.find((i) => i.id === c.institution_id);
  return {
    id: c.id,
    case_id: c.case_id,
    institution_name: inst?.name ?? "Institution on record",
    category: c.category,
    bureau: c.assigned_bureau,
    status: c.status,
    priority: c.priority,
    date_received: new Date(c.date_received),
    assigned_officer: c.assigned_officer,
    source: c.source,
    description: c.description,
  };
}

function confidenceFor(score: number): MergeSuggestion["confidence"] {
  if (score >= 75) return "HIGH";
  if (score >= 65) return "MEDIUM";
  return "LOW";
}

/**
 * Finds same-institution, same-category duplicate filings among open cases.
 * Dismissed pair keys are excluded so a reviewed pair stays reviewed.
 */
export function findMergeSuggestions(input: {
  cases: SeedCase[];
  institutions: SeedInstitution[];
  dismissedKeys?: string[];
  limit?: number;
}): MergeSuggestion[] {
  const { cases, institutions } = input;
  const dismissed = new Set(input.dismissedKeys ?? []);
  const limit = input.limit ?? DEFAULT_LIMIT;

  const groupMap = new Map<string, SeedCase[]>();
  for (const c of cases) {
    // Only genuinely open desk work is mergeable; escalated files belong to
    // the Competent Authority and disposed files are finished.
    if (c.status !== "PENDING" && c.status !== "UNDER_PROCESS") continue;
    if (!c.description || c.description.length < 30) continue;
    const groupKey = `${c.institution_id}::${c.category.toLowerCase()}`;
    const group = groupMap.get(groupKey);
    if (group) group.push(c);
    else groupMap.set(groupKey, [c]);
  }

  const suggestions: MergeSuggestion[] = [];

  for (const group of groupMap.values()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const first = group[i];
        const second = group[j];

        const pairKey = [first.id, second.id].sort().join("::");
        if (dismissed.has(pairKey)) continue;

        const textSimilarity = round2(
          (calculateContentSimilarity(first.description, second.description) +
            calculateTrigramSimilarity(first.description, second.description)) /
            2
        );
        const filedDaysApart = Math.abs(
          Math.round(
            (new Date(first.date_received).getTime() -
              new Date(second.date_received).getTime()) /
              86400000
          )
        );

        let score = Math.round(textSimilarity * 60);
        let burstNote: string;
        if (filedDaysApart <= 30) {
          score += 25;
          burstNote = `Filed ${filedDaysApart} day${filedDaysApart === 1 ? "" : "s"} apart — inside the 30-day statutory burst window (+25)`;
        } else if (filedDaysApart <= 90) {
          score += 12;
          burstNote = `Filed ${filedDaysApart} days apart — same quarter (+12)`;
        } else {
          score += 4;
          burstNote = `Filed ${filedDaysApart} days apart (+4)`;
        }
        const sameChannel = first.source === second.source;
        if (!sameChannel) score += 5;

        if (score < MIN_SCORE) continue;

        const [a, b] = [first, second].sort(
          (x, y) =>
            new Date(x.date_received).getTime() - new Date(y.date_received).getTime()
        );

        suggestions.push({
          key: pairKey,
          score: Math.min(100, score),
          confidence: confidenceFor(score),
          textSimilarity,
          filedDaysApart,
          rationale: [
            `Same institution and category: ${a.category}.`,
            `${Math.round(textSimilarity * 100)}% narrative similarity between the two representations.`,
            burstNote,
            sameChannel
              ? `Both arrived through the "${a.source}" channel.`
              : `Arrived through different channels ("${a.source}" vs "${b.source}") — same incident seen from two sides (+5).`,
          ],
          a: toSide(a, institutions),
          b: toSide(b, institutions),
        });
      }
    }
  }

  suggestions.sort((x, y) => y.score - x.score);
  return suggestions.slice(0, limit);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
