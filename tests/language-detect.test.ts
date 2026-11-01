import { describe, it, expect } from "vitest";
import { detectLanguage, LANGUAGE_BADGE } from "@/lib/services/language-detect";

describe("Language Detection (offline)", () => {
  it("identifies pure English as Latin/English with high confidence", () => {
    const r = detectLanguage("Grievance filed regarding extra capitation fee charged by the institution.");
    expect(r.code).toBe("en");
    expect(r.script).toBe("Latin");
    expect(r.nonLatinRatio).toBe(0);
    expect(r.confidence).toBe("HIGH");
  });

  it("detects Devanagari script and resolves Hindi for Uttar Pradesh", () => {
    const text = "संस्थान से छात्रों से अतिरिक्त शुल्क वसूला गया है।";
    const r = detectLanguage(text, "Uttar Pradesh");
    expect(r.code).toBe("hi");
    expect(r.script).toBe("Devanagari");
    expect(r.confidence).toBe("HIGH");
    expect(r.nonLatinRatio).toBeGreaterThan(0.6);
  });

  it("resolves Marathi when the institution is in Maharashtra", () => {
    const text = "संस्थान विद्यार्थ्यांकडून अतिरिक्त शुल्क आकारले आहे.";
    const r = detectLanguage(text, "Maharashtra");
    expect(r.code).toBe("mr");
    expect(r.name).toBe("Marathi");
  });

  it("detects Tamil script", () => {
    const text = "நிறுவனம் மாணவர்களின் சான்றிதழ்களை வைத்திருக்கிறது.";
    const r = detectLanguage(text, "Tamil Nadu");
    expect(r.code).toBe("ta");
    expect(r.script).toBe("Tamil");
  });

  it("suggests a statutory category from the curated lexicon", () => {
    const text = "कैपिटेशन फीस और अतिरिक्त शुल्क वसूला गया है।";
    const r = detectLanguage(text, "Delhi");
    expect(r.suggestedCategory).toBe("Capitation Fee & Overcharging");
    expect(r.suggestionReason).toContain("कैपिटेशन");
  });

  it("returns null category suggestion for pure English", () => {
    const r = detectLanguage("Hello world");
    expect(r.suggestedCategory).toBeNull();
    expect(r.suggestionReason).toBeNull();
  });

  it("handles empty input gracefully", () => {
    const r = detectLanguage("");
    expect(r.code).toBe("en");
    expect(r.confidence).toBe("LOW");
    expect(r.nonLatinRatio).toBe(0);
  });

  it("LANGUAGE_BADGE covers every supported code", () => {
    for (const code of ["en", "hi", "mr", "ta", "te", "bn"]) {
      expect(LANGUAGE_BADGE[code]).toBeDefined();
      expect(LANGUAGE_BADGE[code].label.length).toBeGreaterThan(0);
    }
  });
});