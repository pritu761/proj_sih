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
}

export interface MatchReason {
  rule: "EXACT_PERMANENT_ID" | "FUZZY_NAME_AND_LOCATION" | "CONTENT_SIMILARITY" | "CATEGORY_OVERLAP";
  description: string;
  score?: number;
}

export interface OverlapCandidate {
  institution_id: string;
  case_ids: string[];
  bureaus_involved: string[];
  confidence: "HIGH" | "MEDIUM" | "LOW";
  match_reasons: MatchReason[];
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
        });
      }

      // RULE 3: Category and Content similarity
      const sameCategory = targetCase.category.toLowerCase() === other.category.toLowerCase();
      if (sameCategory) {
        totalScore += 25;
        reasons.push({
          rule: "CATEGORY_OVERLAP",
          description: `Both cases address the same category: '${targetCase.category}'.`,
        });
      }

      const contentSim = calculateContentSimilarity(targetCase.description, other.description);
      if (contentSim >= 0.30) {
        totalScore += 15;
        reasons.push({
          rule: "CONTENT_SIMILARITY",
          description: `Complaint text keyword overlap of ${Math.round(contentSim * 100)}%.`,
          score: contentSim,
        });
      }

      if (reasons.length > 0 && totalScore >= 60) {
        const confidence: "HIGH" | "MEDIUM" | "LOW" =
          totalScore >= 80 ? "HIGH" : totalScore >= 65 ? "MEDIUM" : "LOW";

        candidates.push({
          institution_id: targetCase.institution_id || other.institution_id,
          case_ids: [targetCase.case_id, other.case_id].sort(),
          bureaus_involved: Array.from(new Set([targetCase.assigned_bureau, other.assigned_bureau])).sort(),
          confidence,
          match_reasons: reasons,
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
