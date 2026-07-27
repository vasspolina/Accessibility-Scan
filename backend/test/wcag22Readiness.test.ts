import { describe, it, expect } from "vitest";
import { buildWcag22Readiness, WCAG_22_NEW_AA } from "../src/services/conformance/wcag22Readiness.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "x",
    source: "automated",
    severity: "moderate",
    category: "accessibility",
    selector: "a",
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

describe("WCAG 2.2 readiness", () => {
  it("covers exactly the six criteria that become A or AA", () => {
    expect(WCAG_22_NEW_AA).toHaveLength(6);
    expect(WCAG_22_NEW_AA.map((c) => c.id).sort()).toEqual([
      "2.4.11",
      "2.5.7",
      "2.5.8",
      "3.2.6",
      "3.3.7",
      "3.3.8",
    ]);
  });

  // The three AAA additions belong out of scope here for the same reason they
  // are out of scope in the main checklist.
  it("leaves the AAA additions out", () => {
    const ids = WCAG_22_NEW_AA.map((c) => c.id);
    for (const aaa of ["2.4.12", "2.4.13", "3.3.9"]) expect(ids).not.toContain(aaa);
  });

  it("says nothing is failing on a clean page", () => {
    const r = buildWcag22Readiness([]);
    expect(r.alreadyFailing).toBe(0);
  });

  // Target size is the one of the six software can actually judge, and the
  // evidence already exists — tagged 2.5.5 under WCAG 2.1, which is the same
  // measurement 2.5.8 asks about.
  it("reads existing tap-target findings across to 2.5.8", () => {
    const r = buildWcag22Readiness([
      finding({ ruleId: "mobile-tap-target", wcagCriterion: "2.5.5" }),
      finding({ ruleId: "mobile-tap-target", wcagCriterion: "2.5.5" }),
    ]);
    const target = r.criteria.find((c) => c.id === "2.5.8")!;
    expect(target.status).toBe("already-failing");
    expect(target.findingCount).toBe(2);
    expect(r.alreadyFailing).toBe(1);
  });

  it("marks everything software cannot judge as needing a person", () => {
    const r = buildWcag22Readiness([]);
    expect(r.needsReview).toBe(5);
    for (const c of r.criteria.filter((x) => x.coverage === "manual")) {
      expect(c.status).toBe("needs-review");
      expect(c.whyManual, c.id).toBeTruthy();
    }
  });

  // 4.1.1 Parsing is removed as obsolete in 2.2, so a failure against it today
  // stops counting. That is the one unambiguously good part of the change.
  it("notices when a current 4.1.1 failure will stop counting", () => {
    expect(buildWcag22Readiness([finding({ wcagCriterion: "4.1.1" })]).parsingNoLongerCounts).toBe(true);
    expect(buildWcag22Readiness([finding({ wcagCriterion: "1.1.1" })]).parsingNoLongerCounts).toBe(false);
  });

  it("ignores design-clarity and dark-pattern findings, like the checklist does", () => {
    const r = buildWcag22Readiness([
      finding({ ruleId: "mobile-tap-target", category: "design-clarity" }),
      finding({ wcagCriterion: "4.1.1", category: "dark-pattern" }),
    ]);
    expect(r.alreadyFailing).toBe(0);
    expect(r.parsingNoLongerCounts).toBe(false);
  });

  it("names the standard and when it is expected", () => {
    const r = buildWcag22Readiness([]);
    expect(r.standard).toMatch(/WCAG 2\.2/);
    expect(r.standard).toMatch(/EN 301 549/);
    expect(r.expectedFrom).toMatch(/2026/);
  });
});
