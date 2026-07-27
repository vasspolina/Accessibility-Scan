import { describe, it, expect } from "vitest";
import { computeScore, summarizeSeverity } from "../src/services/merge/scoring.js";
import type { AccessibilityFinding, SeveritySummary } from "../src/types/report.js";

function summary(p: Partial<SeveritySummary>): SeveritySummary {
  return { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0, ...p };
}

describe("computeScore", () => {
  it("gives a clean page 100", () => {
    expect(computeScore(summary({}))).toBe(100);
  });

  it("is linear where it always was, so existing scores don't move", () => {
    // 1 critical = 10 penalty, 2 serious = 10, 5 moderate = 10, 8 minor = 8.
    expect(computeScore(summary({ critical: 1, serious: 2, moderate: 5, minor: 8 }))).toBe(62);
    expect(computeScore(summary({ serious: 18, moderate: 10, minor: 1 }))).toBe(29);
    expect(computeScore(summary({ minor: 8 }))).toBe(92);
  });

  it("joins the curve without a jump", () => {
    // Penalty 90 is the last linear point; both halves must agree there, or
    // the score would visibly lurch as a page crosses it.
    expect(computeScore(summary({ critical: 9 }))).toBe(10);
    // One point past the join the curve gives 9.89, which rounds back to 10.
    // Adjacent penalties tying is a property of reporting a whole number out
    // of 100, not a fault: what must never happen is the score going UP.
    expect(computeScore(summary({ critical: 9, minor: 1 }))).toBeLessThanOrEqual(10);
    expect(computeScore(summary({ critical: 9, minor: 10 }))).toBeLessThan(10);
  });

  // The whole point. A page deep in the red used to score 0 and stay there
  // however much work was done, which made the re-scan history call five
  // problems fixed while the headline number said nothing had changed.
  it("still moves when a badly failing page is partly fixed", () => {
    const before = summary({ critical: 7, serious: 10, moderate: 11 });
    const halfTheSeriousFixed = summary({ critical: 7, serious: 5, moderate: 11 });
    expect(computeScore(before)).toBeGreaterThan(0);
    expect(computeScore(halfTheSeriousFixed)).toBeGreaterThan(computeScore(before));
  });

  it("never rewards adding a problem", () => {
    let previous = 101;
    for (let criticals = 0; criticals <= 40; criticals++) {
      const score = computeScore(summary({ critical: criticals }));
      expect(score).toBeLessThanOrEqual(previous);
      previous = score;
    }
  });

  it("keeps a badly failing page in single digits", () => {
    expect(computeScore(summary({ critical: 7, serious: 10, moderate: 11 }))).toBeLessThan(10);
  });

  it("never goes below zero or above a hundred", () => {
    expect(computeScore(summary({ critical: 500 }))).toBeGreaterThanOrEqual(0);
    expect(computeScore(summary({ critical: 500 }))).toBeLessThanOrEqual(100);
  });

  // Design-clarity and dark-pattern findings are outside WCAG and must never
  // move an accessibility score.
  it("counts only accessibility findings", () => {
    const f = (category: AccessibilityFinding["category"]): AccessibilityFinding => ({
      id: "x", source: "automated", severity: "critical", category,
      selector: "a", description: "d", suggestedFix: "f",
    });
    const s = summarizeSeverity([f("accessibility"), f("design-clarity"), f("dark-pattern")]);
    expect(s.critical).toBe(1);
    expect(s.total).toBe(1);
  });
});

// This report measures WCAG 2.1 A and AA. Marking a site down against a
// standard it is not being held to is the same overclaim as the tap-target
// badge that said "required by law" for a AAA criterion, one step further on.
describe("what the score counts", () => {
  const finding = (
    severity: AccessibilityFinding["severity"],
    wcagLevel?: "A" | "AA" | "AAA"
  ): AccessibilityFinding => ({
    id: Math.random().toString(),
    source: "automated",
    severity,
    category: "accessibility",
    wcagLevel,
    selector: "a",
    description: "d",
    suggestedFix: "f",
  });

  // Mirrors the pipeline: everything is summarised for the triage counts, and
  // the score is computed from the A/AA subset.
  const scoreOf = (findings: AccessibilityFinding[]) =>
    computeScore(summarizeSeverity(findings.filter((f) => f.wcagLevel !== "AAA")));

  it("ignores AAA findings", () => {
    const aaaOnly = [finding("moderate", "AAA"), finding("moderate", "AAA")];
    expect(scoreOf(aaaOnly)).toBe(100);
  });

  it("still counts A and AA", () => {
    expect(scoreOf([finding("critical", "A")])).toBe(90);
    expect(scoreOf([finding("serious", "AA")])).toBe(95);
  });

  // Most findings carry no level at all — best-practice axe rules, and our own
  // deterministic layers. Silence must not be read as AAA.
  it("counts a finding with no level, rather than dropping it", () => {
    expect(scoreOf([finding("critical", undefined)])).toBe(90);
  });

  it("leaves the triage counts alone, so they still match the list shown", () => {
    const mixed = [finding("critical", "A"), finding("moderate", "AAA")];
    const shown = summarizeSeverity(mixed);
    expect(shown.total).toBe(2);
    expect(shown.moderate).toBe(1);
    // ...while the score sees only the Level A one.
    expect(scoreOf(mixed)).toBe(90);
  });

  // The case that prompted this: fifteen AAA tap-target findings, moderate,
  // which alone reach the moderate cap of 30.
  it("does not let AAA findings exhaust a penalty cap", () => {
    const many = Array.from({ length: 15 }, () => finding("moderate", "AAA"));
    expect(scoreOf(many)).toBe(100);
  });
});
