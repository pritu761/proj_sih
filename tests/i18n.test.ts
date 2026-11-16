import { describe, it, expect } from "vitest";
import {
  LANGS,
  LOCALE_BY_LANG,
  landing,
  track,
  transparency,
  resolveDict,
  type DeepPartial,
  type Lang,
  type TrackDict,
} from "@/lib/i18n";

describe("Public-page i18n", () => {
  it("accepts all five languages", () => {
    const langs: Lang[] = ["en", "hi", "ta", "te", "bn"];
    expect(langs).toEqual([...LANGS]);
    expect(Object.keys(LOCALE_BY_LANG).sort()).toEqual([...langs].sort());
  });

  it("falls back to English for a missing key in a partial dictionary", () => {
    const partial: DeepPartial<TrackDict> = {
      hero: { title: "என் புகார் எங்கே?" },
      lookup: { label: "பதிவு எண்" },
    };
    const merged = resolveDict(track.en, partial);

    // Supplied keys win …
    expect(merged.hero.title).toBe("என் புகார் எங்கே?");
    expect(merged.lookup.label).toBe("பதிவு எண்");
    // … everything absent comes from English.
    expect(merged.hero.sub).toBe(track.en.hero.sub);
    expect(merged.lookup.button).toBe(track.en.lookup.button);
    expect(merged.feedback.heading).toBe(track.en.feedback.heading);
    expect(merged.digest.heading).toBe(track.en.digest.heading);
    // Existing EN/HI strings remain byte-identical.
    expect(track.en.hero.title).toBe("Where is my grievance?");
    expect(track.hi.hero.title).toBe("मेरी शिकायत कहाँ तक पहुँची?");
  });

  it("exposes five dictionary maps with the expected top-level scopes", () => {
    const expectedLangs = ["en", "hi", "ta", "te", "bn"];
    expect(Object.keys(landing)).toEqual(expectedLangs);
    expect(Object.keys(track)).toEqual(expectedLangs);
    expect(Object.keys(transparency)).toEqual(expectedLangs);

    for (const lang of expectedLangs) {
      expect(Object.keys(landing[lang as Lang])).toEqual(Object.keys(landing.en));
      expect(Object.keys(track[lang as Lang])).toEqual(Object.keys(track.en));
      expect(Object.keys(transparency[lang as Lang])).toEqual(
        Object.keys(transparency.en)
      );
    }

    // Substantive translations, not a handful of labels: navigation, hero,
    // tracker lookup/feedback and the transparency quality panel all differ.
    expect(landing.te.nav.capabilities).not.toBe(landing.en.nav.capabilities);
    expect(landing.bn.hero.sub).not.toBe(landing.en.hero.sub);
    expect(track.ta.lookup.label).not.toBe(track.en.lookup.label);
    expect(track.te.feedback.heading).not.toBe(track.en.feedback.heading);
    expect(track.bn.digest.heading).not.toBe(track.en.digest.heading);
    expect(transparency.ta.quality.heading).not.toBe(
      transparency.en.quality.heading
    );
    expect(transparency.ta.hero.title).not.toBe(transparency.en.hero.title);
  });
});
