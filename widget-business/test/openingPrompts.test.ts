import { describe, expect, it } from "vitest";
import { OPENING_PROMPTS, PROMPT_LAYOUTS, pickOpeningPrompts } from "../src/lib/openingPrompts";
import { CHROME_KEYS } from "../src/lib/strings";
import { STRINGS_DE } from "../src/lib/strings.de";
import { STRINGS_ES } from "../src/lib/strings.es";
import { STRINGS_FR } from "../src/lib/strings.fr";

/** A seeded stand-in for Math.random, so a draw can be repeated. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("opening prompts", () => {
  it("draws one question from each group, each in a different layout", () => {
    for (let seed = 1; seed < 50; seed++) {
      const picks = pickOpeningPrompts(seeded(seed));
      expect(picks.map((p) => p.group)).toEqual(OPENING_PROMPTS.map((g) => g.label));
      picks.forEach((p, i) => expect(OPENING_PROMPTS[i].prompts).toContain(p.prompt));
      expect(new Set(picks.map((p) => p.layout)).size).toBe(PROMPT_LAYOUTS.length);
    }
  });

  it("does not load the same way every time", () => {
    const draws = new Set<string>();
    for (let seed = 1; seed < 30; seed++) draws.add(JSON.stringify(pickOpeningPrompts(seeded(seed))));
    expect(draws.size).toBeGreaterThan(20);
  });

  it("changes every panel's question when shuffled", () => {
    const random = seeded(7);
    let last = pickOpeningPrompts(random);
    for (let i = 0; i < 40; i++) {
      const next = pickOpeningPrompts(random, last);
      next.forEach((p, j) => expect(p.prompt).not.toBe(last[j].prompt));
      last = next;
    }
  });

  it("is listed with the chrome and translated in every language", () => {
    const all = [...OPENING_PROMPTS.map((g) => g.label), ...OPENING_PROMPTS.flatMap((g) => g.prompts), "Other questions", "Questions to start with"];
    for (const key of all) {
      expect(CHROME_KEYS).toContain(key);
      for (const [code, strings] of [["de", STRINGS_DE], ["es", STRINGS_ES], ["fr", STRINGS_FR]] as const) {
        expect(strings[key], `${code}: ${key}`).toBeTruthy();
      }
    }
  });
});
