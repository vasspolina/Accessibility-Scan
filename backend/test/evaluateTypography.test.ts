import { describe, it, expect } from "vitest";
import { evaluateTypography, type TypographyBlock } from "../src/services/typography/analyzeTypography.js";

// A comfortable, well-set paragraph — should trigger nothing.
function cleanParagraph(overrides: Partial<TypographyBlock> = {}): TypographyBlock {
  return {
    selector: "main > p",
    tag: "p",
    textLength: 400,
    fontSizePx: 16,
    lineHeightPx: 24, // 1.5
    letterSpacingPx: 0,
    textAlign: "start",
    hyphens: "manual",
    fontFamily: "Georgia",
    widthPx: 600,
    lineCount: 6, // ~67 chars/line
    isUppercase: false,
    textDecorationLine: "none",
    fontStyle: "normal",
    ...overrides,
  };
}

// Readability / neurodiversity checks (underline, italic, all-caps blocks).
describe("evaluateTypography — neurodiversity/readability", () => {
  it("flags underlined text that isn't a link", () => {
    const findings = evaluateTypography([cleanParagraph({ textDecorationLine: "underline" })]);
    expect(rulesOf(findings)).toContain("typo-underline-nonlink");
  });

  it("does not flag an underlined actual link", () => {
    const findings = evaluateTypography([cleanParagraph({ tag: "a", textDecorationLine: "underline" })]);
    expect(rulesOf(findings)).not.toContain("typo-underline-nonlink");
  });

  it("flags a long italic body passage but not a short one", () => {
    expect(rulesOf(evaluateTypography([cleanParagraph({ fontStyle: "italic", textLength: 300 })]))).toContain(
      "typo-italic-body"
    );
    expect(rulesOf(evaluateTypography([cleanParagraph({ fontStyle: "italic", textLength: 40 })]))).not.toContain(
      "typo-italic-body"
    );
  });

  it("flags a long all-caps body block", () => {
    const findings = evaluateTypography([cleanParagraph({ isUppercase: true, textLength: 200 })]);
    expect(rulesOf(findings)).toContain("typo-allcaps-block");
  });

  it("all readability findings are design-clarity with a help link", () => {
    const findings = evaluateTypography([
      cleanParagraph({ textDecorationLine: "underline", fontStyle: "italic", isUppercase: true }),
    ]);
    for (const f of findings) {
      expect(f.category).toBe("design-clarity");
      expect(f.helpUrl).toBeTruthy();
    }
  });
});

function rulesOf(findings: ReturnType<typeof evaluateTypography>): string[] {
  return findings.map((f) => f.ruleId ?? "");
}

describe("evaluateTypography", () => {
  it("returns nothing for well-set text", () => {
    expect(evaluateTypography([cleanParagraph()])).toEqual([]);
  });

  it("flags all-caps text without letterspacing", () => {
    const heading = cleanParagraph({
      tag: "h2",
      selector: "h2",
      textLength: 20,
      lineCount: 1,
      isUppercase: true,
      letterSpacingPx: 0,
    });
    const findings = evaluateTypography([heading]);
    expect(rulesOf(findings)).toContain("typo-caps-letterspacing");
  });

  it("does not flag all-caps text that is letterspaced", () => {
    const heading = cleanParagraph({
      tag: "h2",
      textLength: 20,
      lineCount: 1,
      isUppercase: true,
      letterSpacingPx: 1.2,
    });
    expect(evaluateTypography([heading])).toEqual([]);
  });

  it("flags letterspaced lowercase body text", () => {
    const findings = evaluateTypography([cleanParagraph({ letterSpacingPx: 1.5 })]);
    expect(rulesOf(findings)).toContain("typo-lowercase-letterspaced");
  });

  it("flags negative letterspacing", () => {
    const findings = evaluateTypography([cleanParagraph({ letterSpacingPx: -0.6 })]);
    expect(rulesOf(findings)).toContain("typo-negative-letterspacing");
  });

  it("flags over-long lines and reports one finding for many blocks", () => {
    const long = cleanParagraph({ textLength: 600, lineCount: 5 }); // 120 cpl
    const findings = evaluateTypography([long, { ...long, selector: "main > p:nth-of-type(2)" }]);
    const lineFindings = findings.filter((f) => f.ruleId === "typo-line-length-long");
    expect(lineFindings).toHaveLength(1);
    expect(lineFindings[0].description).toContain("2 blocks");
  });

  it("flags very short lines", () => {
    const findings = evaluateTypography([cleanParagraph({ textLength: 140, lineCount: 7 })]); // 20 cpl
    expect(rulesOf(findings)).toContain("typo-line-length-short");
  });

  it("flags tight leading", () => {
    const findings = evaluateTypography([cleanParagraph({ lineHeightPx: 17.6 })]); // 1.1
    expect(rulesOf(findings)).toContain("typo-leading-tight");
  });

  it("ignores line-height 'normal' (null) rather than guessing", () => {
    expect(evaluateTypography([cleanParagraph({ lineHeightPx: null, lineCount: null })])).toEqual([]);
  });

  it("flags justified text without hyphenation but not with hyphens: auto", () => {
    const justified = cleanParagraph({ textAlign: "justify", hyphens: "manual" });
    expect(rulesOf(evaluateTypography([justified]))).toContain("typo-justified-no-hyphens");

    const hyphenated = cleanParagraph({ textAlign: "justify", hyphens: "auto" });
    expect(evaluateTypography([hyphenated])).toEqual([]);
  });

  it("flags very small body text", () => {
    const findings = evaluateTypography([cleanParagraph({ fontSizePx: 11, lineHeightPx: 16.5 })]);
    expect(rulesOf(findings)).toContain("typo-font-size-small");
  });

  it("flags more than four typeface families", () => {
    const families = ["Georgia", "Arial", "Verdana", "Courier", "Impact"];
    const blocks = families.map((fontFamily, i) =>
      cleanParagraph({ fontFamily, selector: `p:nth-of-type(${i + 1})` })
    );
    expect(rulesOf(evaluateTypography(blocks))).toContain("typo-typeface-count");
  });

  it("all typography findings are design-clarity and never affect the score category", () => {
    const messy = cleanParagraph({
      letterSpacingPx: 1.5,
      textAlign: "justify",
      lineHeightPx: 17,
      fontSizePx: 16,
    });
    for (const finding of evaluateTypography([messy])) {
      expect(finding.category).toBe("design-clarity");
      expect(finding.source).toBe("automated");
    }
  });
});
