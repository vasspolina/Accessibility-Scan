import { describe, it, expect } from "vitest";
import {
  evaluateTypography,
  leadingNeededFor,
  type TypographyBlock,
} from "../src/services/typography/analyzeTypography.js";

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
    fontWeight: 400,
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

  it("flags hairline body weight but not a normal weight", () => {
    expect(rulesOf(evaluateTypography([cleanParagraph({ fontWeight: 100 })]))).toContain("typo-thin-weight");
    expect(rulesOf(evaluateTypography([cleanParagraph({ fontWeight: 400 })]))).not.toContain("typo-thin-weight");
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
    const findings = evaluateTypography([cleanParagraph({ lineHeightPx: 17.6 })]); // 1.1 at 16px
    expect(rulesOf(findings)).toContain("typo-leading-for-measure");
  });

  // The reported false positive, and the reason the two leading rules became
  // one. 1.10 is tight for 16px body text and unremarkable at 40px, and the
  // old absolute floor could not tell those apart because it never looked at
  // the size. Same ratio as the case above; opposite verdict.
  it("accepts at a display size the ratio it rejects at a body size", () => {
    const findings = evaluateTypography([
      cleanParagraph({ fontSizePx: 40, lineHeightPx: 44, textLength: 300, lineCount: 6 }),
    ]);
    expect(rulesOf(findings)).not.toContain("typo-leading-for-measure");
  });

  // The taper has a floor: no size makes overlapping lines acceptable.
  it("still flags display type set below solid", () => {
    const findings = evaluateTypography([
      cleanParagraph({ fontSizePx: 40, lineHeightPx: 36, textLength: 300, lineCount: 6 }),
    ]);
    expect(rulesOf(findings)).toContain("typo-leading-for-measure");
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

// Hochuli, "Detail in typography": the longer the line, the more linespacing
// it needs. The two existing rules cannot express that between them — one is
// an absolute floor on leading, the other an absolute ceiling on line length,
// and a paragraph can clear both while still being under-led for its measure.
describe("evaluateTypography — leading against measure", () => {
  it("flags a long line whose leading clears the absolute floor", () => {
    // 85 characters per line at 1.31 — passes the 1.25 floor, passes the
    // 90-character limit, and needs about 1.43 at this measure.
    const findings = evaluateTypography([
      cleanParagraph({ textLength: 850, lineCount: 10, lineHeightPx: 21, fontSizePx: 16 }),
    ]);
    expect(rulesOf(findings)).toContain("typo-leading-for-measure");
    expect(rulesOf(findings)).not.toContain("typo-leading-tight");
    expect(rulesOf(findings)).not.toContain("typo-line-length-long");
  });

  it("asks nothing extra of a narrow column at the same leading", () => {
    // Same 1.31 leading, 45 characters per line. Comfortable, and silence is
    // the correct answer — this is the half that stops the rule being a
    // disguised demand for 1.5 everywhere.
    const findings = evaluateTypography([
      cleanParagraph({ textLength: 450, lineCount: 10, lineHeightPx: 21, fontSizePx: 16 }),
    ]);
    expect(rulesOf(findings)).not.toContain("typo-leading-for-measure");
  });

  it("says nothing about a well-set paragraph", () => {
    expect(rulesOf(evaluateTypography([cleanParagraph()]))).not.toContain(
      "typo-leading-for-measure"
    );
  });

  // One fault, one card — and now literally one rule. Leading used to be
  // checked twice, by an absolute floor and by this measure-aware rule, which
  // meant a block could be reported for the same fault under two names.
  it("reports a badly-led block once", () => {
    const findings = evaluateTypography([
      cleanParagraph({ textLength: 850, lineCount: 10, lineHeightPx: 18, fontSizePx: 16 }),
    ]);
    expect(rulesOf(findings).filter((r) => r.startsWith("typo-leading"))).toEqual([
      "typo-leading-for-measure",
    ]);
  });

  // Runs from this project's existing floor at 50 characters to WCAG 1.4.8's
  // 1.5 at 70, and asks nothing more beyond that.
  it("scales the requirement with the measure, between two borrowed ends", () => {
    expect(leadingNeededFor(30)).toBeCloseTo(1.25, 2);
    expect(leadingNeededFor(50)).toBeCloseTo(1.25, 2);
    expect(leadingNeededFor(60)).toBeCloseTo(1.375, 2);
    expect(leadingNeededFor(70)).toBeCloseTo(1.5, 2);
    expect(leadingNeededFor(200)).toBeCloseTo(1.5, 2);
  });

  // Measured on bundesregierung.de, the one site of eight where this fires:
  // six paragraphs between 65 and 83 characters, all set at 1.42.
  it("flags the setting a real government site ships", () => {
    const findings = evaluateTypography([
      cleanParagraph({ textLength: 830, lineCount: 10, lineHeightPx: 22.72, fontSizePx: 16 }),
    ]);
    expect(rulesOf(findings)).toContain("typo-leading-for-measure");
  });
});
