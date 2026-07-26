import { describe, it, expect } from "vitest";
import { SUMMARIES, scoreSummary } from "../src/components/ScoreGauge";

describe("score summaries", () => {
  // Math.random() here would deal a new verdict on every React re-render, so
  // the headline would change each time someone expanded a finding.
  it("gives the same line for the same report, every time", () => {
    const seed = "2026-07-01T10:00:00.000Z";
    const first = scoreSummary(73, seed);
    for (let i = 0; i < 20; i++) expect(scoreSummary(73, seed)).toBe(first);
  });

  it("varies between scans", () => {
    const seen = new Set<string>();
    for (let m = 0; m < 40; m++) {
      seen.add(scoreSummary(73, `2026-07-01T10:${String(m).padStart(2, "0")}:00.000Z`));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("never crosses a band, however it varies", () => {
    for (let m = 0; m < 40; m++) {
      const seed = `2026-07-01T10:${String(m).padStart(2, "0")}:00.000Z`;
      expect(SUMMARIES.good).toContain(scoreSummary(95, seed));
      expect(SUMMARIES.middling).toContain(scoreSummary(73, seed));
      expect(SUMMARIES.poor).toContain(scoreSummary(40, seed));
    }
  });

  it("puts the band boundaries where the colours are", () => {
    expect(SUMMARIES.good).toContain(scoreSummary(90, "s"));
    expect(SUMMARIES.middling).toContain(scoreSummary(89, "s"));
    expect(SUMMARIES.middling).toContain(scoreSummary(70, "s"));
    expect(SUMMARIES.poor).toContain(scoreSummary(69, "s"));
  });

  it("copes with an empty seed rather than throwing", () => {
    expect(typeof scoreSummary(73, "")).toBe("string");
  });

  // The register is deadpan, not chatty. A line that needs an exclamation mark
  // is a line that does not trust itself.
  it("keeps every line short, and never exclaims", () => {
    for (const lines of Object.values(SUMMARIES)) {
      for (const line of lines) {
        expect(line.length, line).toBeLessThan(70);
        expect(line, line).not.toMatch(/!/);
        expect(line, line).not.toMatch(/—/);
      }
    }
  });

  // The one rule that is not negotiable. The joke is aimed at the design, or
  // at the assumption behind it. Never at the people the site turns away.
  it("never makes the excluded the punchline", () => {
    for (const line of SUMMARIES.poor) {
      expect(line, line).not.toMatch(/\b(disabled|blind|deaf|cripple|handicap)\w*\b/i);
    }
  });
});
