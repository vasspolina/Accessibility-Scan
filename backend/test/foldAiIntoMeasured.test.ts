import { describe, it, expect } from "vitest";
import { foldAiIntoMeasured } from "../src/services/merge/mergeFindings.js";
import { scoreFindings } from "../src/services/merge/scoring.js";
import type { AccessibilityFinding } from "../src/types/report.js";

const rule = (selector: string, over: Partial<AccessibilityFinding> = {}): AccessibilityFinding => ({
  id: `rule-${selector}`,
  source: "automated",
  severity: "critical",
  category: "accessibility",
  wcagCriterion: "4.1.2",
  wcagLevel: "A",
  selector,
  description: "Form elements must have labels",
  suggestedFix: "Add a label",
  ruleId: "label",
  ...over,
});

const ai = (selector: string, over: Partial<AccessibilityFinding> = {}): AccessibilityFinding => ({
  id: `ai-${selector}`,
  source: "ai-review",
  severity: "serious",
  category: "accessibility",
  wcagCriterion: "4.1.2",
  selector,
  title: "Email field has no name",
  description: "A screen reader announces only 'edit text' here.",
  suggestedFix: "Label it",
  confidence: "high",
  ...over,
});

describe("foldAiIntoMeasured: one repair, one card", () => {
  // The broken MDN form: two unlabelled fields found by the rule, the same
  // two described again by the model.
  it("folds the model's retelling of two measured fields into the rule's cards", () => {
    const measured = [rule("#name"), rule("#email")];
    const kept = foldAiIntoMeasured([ai("#name"), ai("#email")], measured);
    expect(kept).toHaveLength(0);
    expect(measured[0].aiSupport).toBe("Email field has no name. A screen reader announces only 'edit text' here.");
    expect(measured[1].aiSupport).toBeDefined();
    expect(scoreFindings([...measured, ...kept])).toBe(80);
  });

  it("folds a note about the form into the fields inside it when the criterion agrees", () => {
    const measured = [rule("form > #name"), rule("form > #email")];
    const kept = foldAiIntoMeasured([ai("form")], measured);
    expect(kept).toHaveLength(0);
    expect(measured.every((m) => m.aiSupport)).toBe(true);
  });

  it("keeps a note about the form when it is about a different fault", () => {
    const measured = [rule("form > #name")];
    const errors = ai("form", { wcagCriterion: "3.3.1", title: "No message after a failed send" });
    expect(foldAiIntoMeasured([errors], measured)).toEqual([errors]);
    expect(measured[0].aiSupport).toBeUndefined();
  });

  it("does not take a sibling whose id merely starts the same", () => {
    const measured = [rule("#signup-old > input")];
    const other = ai("#signup");
    expect(foldAiIntoMeasured([other], measured)).toEqual([other]);
  });

  it("leaves design notes and dark patterns alone", () => {
    const note = ai("#name", { category: "design-clarity" });
    expect(foldAiIntoMeasured([note], [rule("#name")])).toEqual([note]);
  });

  it("keeps the first note when two retell the same field", () => {
    const measured = [rule("#name")];
    foldAiIntoMeasured([ai("#name", { title: "First" }), ai("#name", { title: "Second" })], measured);
    expect(measured[0].aiSupport).toMatch(/^First\./);
  });
});
