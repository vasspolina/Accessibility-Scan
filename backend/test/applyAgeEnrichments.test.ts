import { describe, it, expect } from "vitest";
import { applyAgeEnrichments } from "../src/services/merge/mergeFindings.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function finding(over: Partial<AccessibilityFinding>): AccessibilityFinding {
  return {
    id: "x", source: "automated", severity: "moderate", category: "accessibility",
    selector: "main > p", description: "Body text is set at 14px.", suggestedFix: "f",
    ruleId: "typo-font-size-small",
    ...over,
  } as AccessibilityFinding;
}

describe("applyAgeEnrichments", () => {
  it("appends the note to the finding it names", () => {
    const f = finding({});
    applyAgeEnrichments([f], [{
      ruleId: "typo-font-size-small", selector: "main > p",
      ageNote: "At sixty, perceiving the same brightness takes about three times the light it did at twenty",
    }]);
    expect(f.description).toMatch(/three times the light it did at twenty\.$/);
  });

  // Prompt instructions set direction; they do not enforce invariants. The
  // framing rules are the layer's whole ethic, so they are enforced here.
  it("drops a note that frames older visitors as a group or a burden", () => {
    for (const bad of [
      "Elderly users struggle with text this small.",
      "Seniors will find this confusing.",
      "Consider a simplified version for old people.",
      "Offer a senior mode with larger text.",
    ]) {
      const f = finding({});
      const before = f.description;
      applyAgeEnrichments([f], [{ ruleId: "typo-font-size-small", selector: "main > p", ageNote: bad }]);
      expect(f.description, bad).toBe(before);
    }
  });

  // "Seniority" is not "seniors" — the filter must not fire inside words.
  it("does not fire on innocent words", () => {
    const f = finding({});
    applyAgeEnrichments([f], [{
      ruleId: "typo-font-size-small", selector: "main > p",
      ageNote: "Text this size is the first thing seniority in a design review flags",
    }]);
    expect(f.description).toContain("seniority");
  });

  it("attaches nothing to a finding that does not exist", () => {
    const f = finding({});
    const before = f.description;
    applyAgeEnrichments([f], [{ ruleId: "color-contrast", selector: "footer a", ageNote: "A real note." }]);
    expect(f.description).toBe(before);
  });

  it("never enriches an AI finding — only measured ones carry notes", () => {
    const f = finding({ source: "ai-review" });
    const before = f.description;
    applyAgeEnrichments([f], [{ ruleId: "typo-font-size-small", selector: "main > p", ageNote: "A note." }]);
    expect(f.description).toBe(before);
  });

  it("takes the first note per finding and ignores repeats", () => {
    const f = finding({});
    applyAgeEnrichments([f], [
      { ruleId: "typo-font-size-small", selector: "main > p", ageNote: "First note" },
      { ruleId: "typo-font-size-small", selector: "main > p", ageNote: "Second note" },
    ]);
    expect(f.description).toContain("First note.");
    expect(f.description).not.toContain("Second note");
  });
});
