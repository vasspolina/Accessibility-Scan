import { describe, it, expect } from "vitest";
import { aiToFindings, wcagLevelFromTags } from "../src/services/merge/mergeFindings.js";

describe("wcagLevelFromTags", () => {
  it("returns A for wcag2a", () => {
    expect(wcagLevelFromTags(["cat.text-alternatives", "wcag2a", "wcag111"])).toBe("A");
  });

  it("returns A for wcag21a", () => {
    expect(wcagLevelFromTags(["wcag21a"])).toBe("A");
  });

  it("returns AA for wcag2aa", () => {
    expect(wcagLevelFromTags(["wcag2aa", "wcag1411"])).toBe("AA");
  });

  it("returns AA for wcag21aa", () => {
    expect(wcagLevelFromTags(["wcag21aa"])).toBe("AA");
  });

  it("returns AA for wcag22aa", () => {
    expect(wcagLevelFromTags(["wcag22aa"])).toBe("AA");
  });

  it("returns AAA for wcag2aaa", () => {
    expect(wcagLevelFromTags(["wcag2aaa"])).toBe("AAA");
  });

  it("resolves to the highest level when multiple versions are tagged", () => {
    expect(wcagLevelFromTags(["wcag2aa", "wcag22aa"])).toBe("AA");
    expect(wcagLevelFromTags(["wcag2a", "wcag2aaa"])).toBe("AAA");
    expect(wcagLevelFromTags(["wcag21a", "wcag2aa"])).toBe("AA");
  });

  it("returns undefined for best-practice rules with no numbered WCAG tag", () => {
    expect(wcagLevelFromTags(["cat.semantics", "best-practice"])).toBeUndefined();
  });

  it("returns undefined for an empty tag list", () => {
    expect(wcagLevelFromTags([])).toBeUndefined();
  });
});

describe("the AI review may not flip rows it has no evidence for", () => {
  const ai = (wcagCriterion: string | undefined) => ({
    severity: "serious" as const,
    category: "accessibility" as const,
    selector: "div",
    title: "t",
    description: "d",
    suggestedFix: "s",
    confidence: "high" as const,
    wcagCriterion,
  });

  it("keeps a claim its prompt and the registry stand behind", () => {
    expect(aiToFindings([ai("1.4.1 Use of Color (A)")])[0].wcagCriterion).toBe("1.4.1 Use of Color (A)");
    expect(aiToFindings([ai("3.3.1")])[0].wcagCriterion).toBe("3.3.1");
  });

  it("strips 2.3.1 — one frame cannot evidence three flashes in a second", () => {
    const f = aiToFindings([ai("2.3.1 Three Flashes (A)")])[0];
    expect(f.wcagCriterion).toBe("N/A");
    expect(f.description).toBe("d"); // the observation survives
  });

  it("strips 4.1.3 — the product itself classifies it beyond automated judgement", () => {
    expect(aiToFindings([ai("4.1.3")])[0].wcagCriterion).toBe("N/A");
  });

  it("strips an invented criterion string", () => {
    expect(aiToFindings([ai("9.9.9 Made Up (AAA)")])[0].wcagCriterion).toBe("N/A");
  });
});
