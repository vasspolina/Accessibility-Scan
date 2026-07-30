import { describe, it, expect } from "vitest";
import { PLAIN_RULE_EXPLANATIONS } from "../src/lib/wcagPlain";

const withResearch = Object.entries(PLAIN_RULE_EXPLANATIONS).filter(([, r]) => r.research);

// The educational module's rules, enforced rather than requested. Research
// lines are curated by hand precisely because a model asked for a statistic
// per scan is an invented-number machine; these tests are what keeps the
// curation honest as it grows.
describe("research lines", () => {
  it("exist for the common rule families", () => {
    expect(withResearch.length).toBeGreaterThanOrEqual(6);
  });

  // Every line names a source the module approves. A research claim with no
  // named source is an assertion wearing a lab coat.
  it("always names an approved source", () => {
    const approved =
      /WebAIM|World Health Organization|Click-Away Pound|Eurostat|Nielsen Norman|W3C|WAI|accessibility\.nl/;
    for (const [id, r] of withResearch) {
      expect(r.research!, `${id} cites no approved source`).toMatch(approved);
    }
  });

  // No digits. Numbers appear as words ("one in six"), and only where rock
  // solid — the structural guard against a made-up figure reaching a reader,
  // and against a real one drifting stale ("83.6% in 2019" ages; "the most
  // common failure, year after year" does not).
  it("contains no digits", () => {
    for (const [id, r] of withResearch) {
      expect(r.research!, `${id} contains a digit`).not.toMatch(/\d/);
    }
  });

  it("never overpromises", () => {
    for (const [id, r] of withResearch) {
      expect(r.research!, id).not.toMatch(/fully accessible|guarantee/i);
    }
  });
});

// The module's vocabulary bans, applied to every piece of report copy, not
// just the research lines: no exclamation marks anywhere, and none of the
// framings that turn people into objects of pity.
describe("all plain copy", () => {
  it("bans the forbidden framings and the exclamation mark", () => {
    const forbidden = /suffer(s|ing)? from|victims?\b|handicapped|the disabled\b/i;
    for (const [id, r] of Object.entries(PLAIN_RULE_EXPLANATIONS)) {
      const all = [r.plain, r.impact, r.research ?? "", r.found?.(3) ?? ""].join(" ");
      expect(all, `${id} uses forbidden framing`).not.toMatch(forbidden);
      expect(all, `${id} exclaims`).not.toMatch(/!/);
    }
  });
});
