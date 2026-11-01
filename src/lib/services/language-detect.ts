/**
 * Offline multi-lingual intake layer.
 *
 * Detects the written language of a grievance from its Unicode script (zero
 * network calls, zero API keys) and — for supported languages — suggests the
 * statutory category from a curated keyword lexicon. This is the deterministic,
 * offline-capable first stage that an LLM semantic matcher (future roadmap
 * item requiring API keys) can later slot behind without changing callers.
 */

export interface DetectedLanguage {
  code: string; // BCP-47 style tag stored on the case
  name: string;
  script: string;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  nonLatinRatio: number; // share of letters that are not Latin
  suggestedCategory: string | null;
  suggestionReason: string | null;
  note: string;
}

interface ScriptRange {
  code: string;
  name: string;
  script: string;
  start: number;
  end: number;
}

const SCRIPT_RANGES: ScriptRange[] = [
  { code: "hi", name: "Hindi", script: "Devanagari", start: 0x0900, end: 0x097f },
  { code: "mr", name: "Marathi", script: "Devanagari", start: 0x0900, end: 0x097f },
  { code: "bn", name: "Bengali", script: "Bengali", start: 0x0980, end: 0x09ff },
  { code: "gu", name: "Gujarati", script: "Gujarati", start: 0x0a80, end: 0x0aff },
  { code: "pa", name: "Punjabi", script: "Gurmukhi", start: 0x0a00, end: 0x0a7f },
  { code: "or", name: "Odia", script: "Odia", start: 0x0b00, end: 0x0b7f },
  { code: "ta", name: "Tamil", script: "Tamil", start: 0x0b80, end: 0x0bff },
  { code: "te", name: "Telugu", script: "Telugu", start: 0x0c00, end: 0x0c7f },
  { code: "kn", name: "Kannada", script: "Kannada", start: 0x0c80, end: 0x0cff },
  { code: "ml", name: "Malayalam", script: "Malayalam", start: 0x0d00, end: 0x0d7f },
  { code: "ur", name: "Urdu", script: "Arabic", start: 0x0600, end: 0x06ff },
];

/**
 * Curated statutory keyword lexicon. Each entry maps a grievance keyword in a
 * regional language to one of the eight AICTE statutory categories. Deliberately
 * hand-curated so the layer is fully explainable in audit ("Layer 1 lexical").
 */
const LEXICON: Record<string, { term: string; category: string; gloss: string }[]> = {
  hi: [
    { term: "कैपिटेशन", category: "Capitation Fee & Overcharging", gloss: "capitation" },
    { term: "अतिरिक्त शुल्क", category: "Capitation Fee & Overcharging", gloss: "extra fee" },
    { term: "फीस वसूली", category: "Capitation Fee & Overcharging", gloss: "fee extraction" },
    { term: "हॉल टिकट", category: "Capitation Fee & Overcharging", gloss: "hall ticket fee" },
    { term: "प्रमाण पत्र", category: "Withholding Certificates", gloss: "certificate" },
    { term: "मार्कशीट", category: "Withholding Certificates", gloss: "marksheet" },
    { term: "मूल दस्तावेज", category: "Withholding Certificates", gloss: "original documents" },
    { term: "वेतन बकाया", category: "Faculty Non-Payment & Harassment", gloss: "salary arrears" },
    { term: "वेतन नहीं मिला", category: "Faculty Non-Payment & Harassment", gloss: "salary not paid" },
    { term: "उत्पीड़न", category: "Faculty Non-Payment & Harassment", gloss: "harassment" },
    { term: "रैगिंग", category: "Ragging & Safety Violations", gloss: "ragging" },
    { term: "प्रवेश", category: "Admission Irregularities", gloss: "admission" },
    { term: "सीटें", category: "Unapproved Courses & Seats", gloss: "seats" },
    { term: "प्रयोगशाला", category: "Infrastructure & Lab Deficiencies", gloss: "laboratory" },
    { term: "भवन", category: "Infrastructure & Lab Deficiencies", gloss: "building" },
  ],
  ta: [
    { term: "கட்டணம்", category: "Capitation Fee & Overcharging", gloss: "fee" },
    { term: "அதிக கட்டணம்", category: "Capitation Fee & Overcharging", gloss: "excess fee" },
    { term: "சான்றிதழ்", category: "Withholding Certificates", gloss: "certificate" },
    { term: "மதிப்பெண் சான்று", category: "Withholding Certificates", gloss: "marksheet" },
    { term: "சம்பளம்", category: "Faculty Non-Payment & Harassment", gloss: "salary" },
    { term: "துன்புறுத்தல்", category: "Faculty Non-Payment & Harassment", gloss: "harassment" },
    { term: "ரேகிங்", category: "Ragging & Safety Violations", gloss: "ragging" },
    { term: "சேர்க்கை", category: "Admission Irregularities", gloss: "admission" },
    { term: "ஆய்வகம்", category: "Infrastructure & Lab Deficiencies", gloss: "laboratory" },
  ],
  te: [
    { term: "రుసుము", category: "Capitation Fee & Overcharging", gloss: "capitation fee" },
    { term: "ఫీజు", category: "Capitation Fee & Overcharging", gloss: "fee" },
    { term: "సర్టిఫికేట్", category: "Withholding Certificates", gloss: "certificate" },
    { term: "జ్ఞానపత్రిక", category: "Withholding Certificates", gloss: "marksheet" },
    { term: "జీతం", category: "Faculty Non-Payment & Harassment", gloss: "salary" },
    { term: "వేధింపు", category: "Faculty Non-Payment & Harassment", gloss: "harassment" },
    { term: "ర్యాగింగ్", category: "Ragging & Safety Violations", gloss: "ragging" },
    { term: "ప్రవేశం", category: "Admission Irregularities", gloss: "admission" },
  ],
  bn: [
    { term: "অতিরিক্ত ফি", category: "Capitation Fee & Overcharging", gloss: "extra fee" },
    { term: "টাকা আদায়", category: "Capitation Fee & Overcharging", gloss: "money extraction" },
    { term: "সনদ", category: "Withholding Certificates", gloss: "certificate" },
    { term: "নম্বরপত্র", category: "Withholding Certificates", gloss: "marksheet" },
    { term: "বেতন", category: "Faculty Non-Payment & Harassment", gloss: "salary" },
    { term: "র্যাগিং", category: "Ragging & Safety Violations", gloss: "ragging" },
    { term: "ভর্তি", category: "Admission Irregularities", gloss: "admission" },
  ],
};

/**
 * Devanagari has two primary regional claimants (Hindi / Marathi). Script
 * detection is deterministic at script level; the region is resolved from the
 * institution's state where possible, otherwise Hindi is assumed.
 */
const STATE_LANGUAGE_HINT: Record<string, string> = {
  "Maharashtra": "mr",
  "Uttar Pradesh": "hi",
  Madhya: "hi",
  Rajasthan: "hi",
  Bihar: "hi",
  Chhattisgarh: "hi",
  Jharkhand: "hi",
  Uttarakhand: "hi",
  Delhi: "hi",
  Haryana: "hi",
  Himachal: "hi",
  "West Bengal": "bn",
  Tripura: "bn",
  Assam: "bn",
  "Tamil Nadu": "ta",
  Puducherry: "ta",
  "Andhra Pradesh": "te",
  Telangana: "te",
  Karnataka: "kn",
  Kerala: "ml",
  Odisha: "or",
  Punjab: "pa",
  Gujarat: "gu",
};

function resolveDevanagariRegion(state?: string): { code: string; name: string } {
  if (state && STATE_LANGUAGE_HINT[state] === "mr") {
    return { code: "mr", name: "Marathi" };
  }
  return { code: "hi", name: "Hindi" };
}

export function detectLanguage(
  text: string,
  institutionState?: string
): DetectedLanguage {
  const letters = (text.match(/[\p{L}\p{M}]/gu) ?? []).length;

  if (letters === 0) {
    return {
      code: "en",
      name: "English",
      script: "Latin",
      confidence: "LOW",
      nonLatinRatio: 0,
      suggestedCategory: null,
      suggestionReason: null,
      note: "No letters found to analyse.",
    };
  }

  let nonLatin = 0;
  const scriptCounts = new Map<ScriptRange, number>();

  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    const inScript = SCRIPT_RANGES.find((r) => cp >= r.start && cp <= r.end);
    if (inScript) {
      nonLatin++;
      scriptCounts.set(inScript, (scriptCounts.get(inScript) ?? 0) + 1);
    }
  }

  let bestMatch: ScriptRange | null = null;
  let bestCount = 0;
  for (const [range, count] of scriptCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestMatch = range;
    }
  }

  const nonLatinRatio = nonLatin / letters;

  if (!bestMatch || nonLatinRatio < 0.08) {
    return {
      code: "en",
      name: "English",
      script: "Latin",
      confidence: nonLatinRatio === 0 ? "HIGH" : "LOW",
      nonLatinRatio,
      suggestedCategory: null,
      suggestionReason: null,
      note:
        nonLatinRatio === 0
          ? "Latin script — standard English intake."
          : "Predominantly Latin script with a few non-Latin characters (likely transliteration or punctuation).",
    };
  }

  let code = bestMatch.code;
  let name = bestMatch.name;
  if (bestMatch.script === "Devanagari") {
    const regional = resolveDevanagariRegion(institutionState);
    code = regional.code;
    name = regional.name;
  }

  const lexicon = LEXICON[code] ?? LEXICON[bestMatch.code] ?? [];
  const normalized = text.toLowerCase();
  const hits = lexicon.filter((entry) => normalized.includes(entry.term.toLowerCase()));

  const confidence: DetectedLanguage["confidence"] = nonLatinRatio >= 0.6 ? "HIGH" : "MEDIUM";

  return {
    code,
    name,
    script: bestMatch.script,
    confidence,
    nonLatinRatio: Math.round(nonLatinRatio * 100) / 100,
    suggestedCategory: hits.length > 0 ? hits[0].category : null,
    suggestionReason:
      hits.length > 0
        ? `Lexical match on “${hits[0].term}” (${hits[0].gloss}) → ${hits[0].category}`
        : null,
    note: `${bestMatch.script} script detected (${Math.round(nonLatinRatio * 100)}% of letters). Translated triage manual — routed to ${name} cell review with the original narrative preserved as evidence.`,
  };
}

/** Language display metadata for badges and selectors. */
export const LANGUAGE_BADGE: Record<string, { label: string; color: string }> = {
  en: { label: "EN", color: "bg-slate-100 text-slate-600 border-slate-200" },
  hi: { label: "हि", color: "bg-orange-50 text-orange-700 border-orange-200" },
  mr: { label: "मरा", color: "bg-orange-50 text-orange-700 border-orange-200" },
  ta: { label: "தமி", color: "bg-red-50 text-red-700 border-red-200" },
  te: { label: "తెలు", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  bn: { label: "বাং", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  gu: { label: "ગુજ", color: "bg-pink-50 text-pink-700 border-pink-200" },
  pa: { label: "ਪੰ", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  or: { label: "ଓଡ଼", color: "bg-amber-50 text-amber-700 border-amber-200" },
  kn: { label: "ಕನ್", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  ml: { label: "മല", color: "bg-lime-50 text-lime-700 border-lime-200" },
  ur: { label: "اردو", color: "bg-green-50 text-green-700 border-green-200" },
};
