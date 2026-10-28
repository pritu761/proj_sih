import { normalizeInstitutionName } from "@/lib/demo-data";

export interface CaseWithInstitution {
  id: string;
  case_id: string;
  institution_id: string;
  institution_aicte_id?: string;
  institution_name?: string;
  institution_normalized_name?: string;
  institution_city?: string;
  institution_state?: string;
  institution_pincode?: string;
  category: string;
  description: string;
  assigned_bureau: string;
  status: string;
  date_received?: Date | string;
}

export interface MatchReason {
  rule: "EXACT_PERMANENT_ID" | "FUZZY_NAME_AND_LOCATION" | "CONTENT_SIMILARITY" | "CATEGORY_OVERLAP";
  description: string;
  score?: number;
  layer?: TrilayerKey;
}

export type TrilayerKey = "ENTITY" | "SEMANTIC" | "TEMPORAL";

export interface TrilayerLayer {
  key: TrilayerKey;
  label: string;
  score: number;
  weight: number;
  verdict: "STRONG" | "CORROBORATING" | "WEAK";
  evidence: string[];
}

export interface TrilayerBreakdown {
  entity: TrilayerLayer;
  semantic: TrilayerLayer;
  temporal: TrilayerLayer;
  total: number;
  formula: string;
}

export interface OverlapCandidate {
  institution_id: string;
  case_ids: string[];
  bureaus_involved: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  match_reasons: MatchReason[];
  trilayer: TrilayerBreakdown;
}

export interface IOverlapDetector {
  checkCase(
    targetCase: CaseWithInstitution,
    activeCases: CaseWithInstitution[]
  ): Promise<OverlapCandidate[]>;
  batchScan(
    allCases: CaseWithInstitution[]
  ): Promise<OverlapCandidate[]>;
  calculateTrigramSimilarity(a: string, b: string): number;
}

/**
 * Trigram generator matching PostgreSQL pg_trgm behavior
 */
export function generateTrigrams(str: string): Set<string> {
  const padded = `  ${str.toLowerCase().trim()} `;
  const trigrams = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    trigrams.add(padded.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Calculates Trigram Similarity index (0.0 to 1.0) identical to pg_trgm similarity()
 */
export function calculateTrigramSimilarity(strA: string, strB: string): number {
  if (!strA || !strB) return 0;
  if (strA.toLowerCase() === strB.toLowerCase()) return 1.0;

  const trigramsA = generateTrigrams(strA);
  const trigramsB = generateTrigrams(strB);

  let intersectionCount = 0;
  for (const t of trigramsA) {
    if (trigramsB.has(t)) {
      intersectionCount++;
    }
  }

  const unionCount = trigramsA.size + trigramsB.size - intersectionCount;
  return unionCount === 0 ? 0 : Math.round((intersectionCount / unionCount) * 100) / 100;
}

/**
 * Calculates token-based content similarity between case descriptions
 */
export function calculateContentSimilarity(descA: string, descB: string): number {
  const wordsA = new Set(
    descA.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3)
  );
  const wordsB = new Set(
    descB.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(w => w.length > 3)
  );

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) common++;
  }

  const total = new Set([...wordsA, ...wordsB]).size;
  return total === 0 ? 0 : Math.round((common / total) * 100) / 100;
}

const LAYER_WEIGHT = {
  ENTITY: 0.45,
  SEMANTIC: 0.35,
  TEMPORAL: 0.2,
} as const;

function verdictFor(score: number): TrilayerLayer["verdict"] {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "CORROBORATING";
  return "WEAK";
}

function daysBetween(a?: Date | string, b?: Date | string): number | null {
  if (!a || !b) return null;
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  return Math.abs(Math.round((first - second) / 86_400_000));
}

/**
 * Trilayer explainability model.
 *
 * Layer 1 — Entity:   AICTE Permanent ID, institutional name and geography.
 * Layer 2 — Semantic: category equivalence and complaint-text overlap.
 * Layer 3 — Temporal: filing burst window and simultaneous bureau action.
 *
 * The weighted total is deterministic and every point is backed by an
 * evidence string that the UI renders next to the score.
 */
export function computeTrilayer(input: {
  target: CaseWithInstitution;
  other: CaseWithInstitution;
  exactId: boolean;
  nameSimilarity: number;
  sameLocation: boolean;
  sameCategory: boolean;
  contentSimilarity: number;
}): TrilayerBreakdown {
  const {
    target,
    other,
    exactId,
    nameSimilarity,
    sameLocation,
    sameCategory,
    contentSimilarity,
  } = input;

  const entityEvidence: string[] = [];
  let entityScore = 0;
  if (exactId) {
    entityScore = 100;
    entityEvidence.push(`Identical AICTE Permanent ID ${target.institution_aicte_id}.`);
  } else if (nameSimilarity >= 0.65 && sameLocation) {
    entityScore = Math.round(Math.min(100, nameSimilarity * 100 + 8));
    entityEvidence.push(
      `${Math.round(nameSimilarity * 100)}% name similarity after normalization.`
    );
    entityEvidence.push(
      `Location corroborated: ${target.institution_city ?? "same city"} / ${target.institution_pincode ?? "same PIN"}.`
    );
  } else if (sameLocation) {
    entityScore = 38;
    entityEvidence.push("No name match, but city/PIN corroborates the same institution.");
  } else {
    entityScore = Math.round(nameSimilarity * 40);
    entityEvidence.push("No exact identifier or location corroboration.");
  }

  const semanticEvidence: string[] = [];
  let semanticScore: number;
  if (sameCategory) {
    semanticScore = Math.min(
      100,
      Math.round(contentSimilarity * 70 + 32)
    );
    semanticEvidence.push(`Same grievance category: ${target.category}.`);
  } else {
    semanticScore = Math.round(contentSimilarity * 85);
    semanticEvidence.push("Different categories; only narrative text compared.");
  }
  if (contentSimilarity > 0) {
    semanticEvidence.push(
      `${Math.round(contentSimilarity * 100)}% token overlap in the representation text.`
    );
  }

  const gap = daysBetween(target.date_received, other.date_received);
  const temporalEvidence: string[] = [];
  let temporalScore: number;
  if (gap === null) {
    temporalScore = 50;
    temporalEvidence.push("Filing date unavailable; neutral burst score applied.");
  } else if (gap <= 14) {
    temporalScore = 100;
    temporalEvidence.push(`Filed ${gap} day${gap === 1 ? "" : "s"} apart — inside the 14-day burst window.`);
  } else if (gap <= 30) {
    temporalScore = 82;
    temporalEvidence.push(`Filed ${gap} days apart — inside the 30-day statutory burst window.`);
  } else if (gap <= 45) {
    temporalScore = 64;
    temporalEvidence.push(`Filed ${gap} days apart — partial temporal overlap.`);
  } else if (gap <= 90) {
    temporalScore = 42;
    temporalEvidence.push(`Filed ${gap} days apart — outside the active burst window.`);
  } else {
    temporalScore = 20;
    temporalEvidence.push(`Filed ${gap} days apart — historical parallel, low burst risk.`);
  }
  if (target.assigned_bureau !== other.assigned_bureau) {
    temporalEvidence.push(
      `Both files are live simultaneously in ${target.assigned_bureau} and ${other.assigned_bureau}.`
    );
  }

  const entity: TrilayerLayer = {
    key: "ENTITY",
    label: "Entity resolution",
    score: entityScore,
    weight: LAYER_WEIGHT.ENTITY,
    verdict: verdictFor(entityScore),
    evidence: entityEvidence,
  };
  const semantic: TrilayerLayer = {
    key: "SEMANTIC",
    label: "Semantic similarity",
    score: semanticScore,
    weight: LAYER_WEIGHT.SEMANTIC,
    verdict: verdictFor(semanticScore),
    evidence: semanticEvidence,
  };
  const temporal: TrilayerLayer = {
    key: "TEMPORAL",
    label: "Temporal burst",
    score: temporalScore,
    weight: LAYER_WEIGHT.TEMPORAL,
    verdict: verdictFor(temporalScore),
    evidence: temporalEvidence,
  };

  const total = Math.round(
    entity.score * LAYER_WEIGHT.ENTITY +
      semantic.score * LAYER_WEIGHT.SEMANTIC +
      temporal.score * LAYER_WEIGHT.TEMPORAL
  );

  return {
    entity,
    semantic,
    temporal,
    total,
    formula: "Entity 45% + Semantic 35% + Temporal 20%",
  };
}

/**
 * Reconstructs the trilayer view for alerts seeded before layer scores were
 * persisted. Used by the alerts workspace so every alert is explainable.
 */
export function deriveTrilayerFromCases(
  target: CaseWithInstitution,
  other: CaseWithInstitution,
  options?: { exactIdOverride?: boolean; nameSimilarityOverride?: number }
): TrilayerBreakdown {
  const resolvedExactId =
    Boolean(target.institution_aicte_id) &&
    Boolean(other.institution_aicte_id) &&
    target.institution_aicte_id === other.institution_aicte_id;
  // Seeded alerts carry the rule that originally fired. If the stored
  // rationale is a fuzzy name/location match, the layer view must not claim
  // an identical Permanent ID just because both files point at the same seed
  // institution row.
  const hasExactId = options?.exactIdOverride ?? resolvedExactId;

  const targetNorm =
    target.institution_normalized_name ||
    (target.institution_name ? normalizeInstitutionName(target.institution_name) : "");
  const otherNorm =
    other.institution_normalized_name ||
    (other.institution_name ? normalizeInstitutionName(other.institution_name) : "");

  return computeTrilayer({
    target,
    other,
    exactId: hasExactId,
    nameSimilarity:
      options?.nameSimilarityOverride ??
      calculateTrigramSimilarity(targetNorm, otherNorm),
    sameLocation:
      (Boolean(target.institution_pincode) &&
        target.institution_pincode === other.institution_pincode) ||
      (Boolean(target.institution_city) &&
        target.institution_city?.toLowerCase() === other.institution_city?.toLowerCase()),
    sameCategory: target.category.toLowerCase() === other.category.toLowerCase(),
    contentSimilarity: calculateContentSimilarity(target.description, other.description),
  });
}


export class StandardOverlapDetector implements IOverlapDetector {
  public calculateTrigramSimilarity(a: string, b: string): number {
    return calculateTrigramSimilarity(a, b);
  }

  /**
   * Scans a single case against all existing open cases across bureaus
   */
  public async checkCase(
    targetCase: CaseWithInstitution,
    activeCases: CaseWithInstitution[]
  ): Promise<OverlapCandidate[]> {
    if (targetCase.status === "DISPOSED") return [];

    const candidates: OverlapCandidate[] = [];
    const targetNormName =
      targetCase.institution_normalized_name ||
      (targetCase.institution_name ? normalizeInstitutionName(targetCase.institution_name) : "");

    for (const other of activeCases) {
      if (other.id === targetCase.id || other.case_id === targetCase.case_id) continue;
      if (other.status === "DISPOSED") continue;

      // Overlaps strictly occur when different bureaus/cells are handling the same institution
      if (other.assigned_bureau === targetCase.assigned_bureau) continue;

      const reasons: MatchReason[] = [];
      let totalScore = 0;

      // RULE 1: Exact AICTE Permanent ID match
      const hasExactId =
        Boolean(targetCase.institution_aicte_id) &&
        Boolean(other.institution_aicte_id) &&
        targetCase.institution_aicte_id === other.institution_aicte_id;

      if (hasExactId) {
        totalScore += 70;
        reasons.push({
          rule: "EXACT_PERMANENT_ID",
          description: `Identical AICTE Permanent ID: ${targetCase.institution_aicte_id} active in ${targetCase.assigned_bureau} and ${other.assigned_bureau}.`,
          score: 1.0,
          layer: "ENTITY",
        });
      }

      // RULE 2: Fuzzy institution name match + location corroboration
      const otherNormName =
        other.institution_normalized_name ||
        (other.institution_name ? normalizeInstitutionName(other.institution_name) : "");

      const nameSimilarity = calculateTrigramSimilarity(targetNormName, otherNormName);
      const samePincode = Boolean(targetCase.institution_pincode) && targetCase.institution_pincode === other.institution_pincode;
      const sameCity = Boolean(targetCase.institution_city) && targetCase.institution_city?.toLowerCase() === other.institution_city?.toLowerCase();

      if (!hasExactId && nameSimilarity >= 0.65 && (samePincode || sameCity)) {
        totalScore += 65;
        reasons.push({
          rule: "FUZZY_NAME_AND_LOCATION",
          description: `Fuzzy Name Similarity: ${Math.round(nameSimilarity * 100)}% ('${targetCase.institution_name}' vs '${other.institution_name}') with matching location (${targetCase.institution_city}, ${targetCase.institution_pincode}).`,
          score: nameSimilarity,
          layer: "ENTITY",
        });
      }

      // RULE 3: Category and Content similarity
      const sameCategory = targetCase.category.toLowerCase() === other.category.toLowerCase();
      if (sameCategory) {
        totalScore += 25;
        reasons.push({
          rule: "CATEGORY_OVERLAP",
          description: `Both cases address the same category: '${targetCase.category}'.`,
          layer: "SEMANTIC",
        });
      }

      const contentSim = calculateContentSimilarity(targetCase.description, other.description);
      if (contentSim >= 0.30) {
        totalScore += 15;
        reasons.push({
          rule: "CONTENT_SIMILARITY",
          description: `Complaint text keyword overlap of ${Math.round(contentSim * 100)}%.`,
          score: contentSim,
          layer: "SEMANTIC",
        });
      }

      if (reasons.length > 0 && totalScore >= 60) {
        const trilayer = computeTrilayer({
          target: targetCase,
          other,
          exactId: hasExactId,
          nameSimilarity,
          sameLocation: samePincode || sameCity,
          sameCategory,
          contentSimilarity: contentSim,
        });

        const confidence: "HIGH" | "MEDIUM" | "LOW" =
          totalScore >= 80 ? "HIGH" : totalScore >= 65 ? "MEDIUM" : "LOW";

        candidates.push({
          institution_id: targetCase.institution_id || other.institution_id,
          case_ids: [targetCase.case_id, other.case_id].sort(),
          bureaus_involved: Array.from(new Set([targetCase.assigned_bureau, other.assigned_bureau])).sort(),
          confidence,
          match_reasons: reasons,
          trilayer,
        });
      }
    }

    return candidates;
  }

  /**
   * Resumable batch scanner used by cron jobs and initialization
   */
  public async batchScan(
    allCases: CaseWithInstitution[]
  ): Promise<OverlapCandidate[]> {
    const activeCases = allCases.filter((c) => c.status !== "DISPOSED");
    const candidateMap = new Map<string, OverlapCandidate>();

    for (let i = 0; i < activeCases.length; i++) {
      const target = activeCases[i];
      const matches = await this.checkCase(target, activeCases.slice(i + 1));

      for (const m of matches) {
        const dedupeKey = m.case_ids.slice().sort().join("::");
        if (!candidateMap.has(dedupeKey)) {
          candidateMap.set(dedupeKey, m);
        }
      }
    }

    return Array.from(candidateMap.values());
  }
}

export const overlapDetector = new StandardOverlapDetector();
export default overlapDetector;
