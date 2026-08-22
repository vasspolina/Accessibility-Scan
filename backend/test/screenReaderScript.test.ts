import { describe, it, expect } from "vitest";
import { evaluateScreenReaderScript } from "../src/services/screenReader/analyzeScreenReader.js";
import type { ScreenReaderLine } from "../src/types/report.js";

describe("evaluateScreenReaderScript: unhelpful names become findings", () => {
  const line = (kind: ScreenReaderLine["kind"], issueKind?: "missing" | "unhelpful"): ScreenReaderLine => ({
    text: kind === "image" ? "image, “IMG_4821.jpg”" : kind === "link" ? "link, “click here”" : "button, “×”",
    kind,
    selector: `${kind}.x`,
    issue: issueKind ? "why" : undefined,
    issueKind,
  });

  it("cards filename alts as 1.1.1, vague links as 2.4.4, vague buttons as 2.4.6", () => {
    const out = evaluateScreenReaderScript({
      lines: [line("image", "unhelpful"), line("link", "unhelpful"), line("button", "unhelpful")],
      truncated: false,
    });
    const by = Object.fromEntries(out.map((f) => [f.ruleId, f]));
    expect(by["sr-filename-alt"].wcagCriterion).toBe("1.1.1");
    expect(by["sr-vague-link-name"].wcagCriterion).toBe("2.4.4");
    expect(by["sr-vague-button-name"].wcagCriterion).toBe("2.4.6");
    for (const f of out) expect(f.category).toBe("accessibility");
  });

  it("one card per kind, however many lines", () => {
    const out = evaluateScreenReaderScript({
      lines: [line("image", "unhelpful"), line("image", "unhelpful"), line("image", "unhelpful")],
      truncated: false,
    });
    expect(out).toHaveLength(1);
    expect(out[0].description).toContain("3 images");
  });

  it("leaves the missing-name lines to axe — one fault, one card", () => {
    const out = evaluateScreenReaderScript({
      lines: [line("image", "missing"), line("link", "missing"), line("button")],
      truncated: false,
    });
    expect(out).toEqual([]);
  });

  it("tolerates an absent script — a crashed collector is not a clean page", () => {
    expect(evaluateScreenReaderScript(undefined)).toEqual([]);
  });
});
