import { describe, it, expect } from "vitest";
import { wcagLevelFromTags } from "../src/services/merge/mergeFindings.js";

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
