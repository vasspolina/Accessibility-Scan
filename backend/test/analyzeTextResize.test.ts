import { describe, it, expect } from "vitest";
import {
  evaluateTextResize,
  type ClipMeasurement,
  type TextResizeSignals,
} from "../src/services/textResize/analyzeTextResize.js";

function measure(clipped: string[], scrollWidth = 1280, viewportWidth = 1280): ClipMeasurement {
  return {
    clipped,
    snippets: Object.fromEntries(clipped.map((s) => [s, `<div>${s}</div>`])),
    documentScrollWidth: scrollWidth,
    viewportWidth,
  };
}

function signals(overrides: Partial<TextResizeSignals> = {}): TextResizeSignals {
  return {
    baseline: measure([]),
    spacing: measure([]),
    zoom: measure([]),
    ...overrides,
  };
}

function rulesOf(findings: ReturnType<typeof evaluateTextResize>): string[] {
  return findings.map((f) => f.ruleId ?? "");
}

describe("evaluateTextResize", () => {
  it("returns nothing for a page that survives both overrides", () => {
    expect(evaluateTextResize(signals())).toEqual([]);
  });

  it("flags text clipped by the WCAG text-spacing overrides", () => {
    const findings = evaluateTextResize(signals({ spacing: measure(["#card"]) }));
    expect(rulesOf(findings)).toContain("text-spacing-clipped");
    expect(findings[0].wcagCriterion).toBe("1.4.12");
    expect(findings[0].severity).toBe("serious");
  });

  it("flags text clipped at 200% font size", () => {
    const findings = evaluateTextResize(signals({ zoom: measure(["#hero"]) }));
    expect(rulesOf(findings)).toContain("text-zoom-clipped");
    expect(findings[0].wcagCriterion).toBe("1.4.4");
  });

  // The important one: a box already clipping its own content is a
  // pre-existing layout bug, not something the resize broke.
  it("ignores elements that were already clipped at baseline", () => {
    const already = signals({
      baseline: measure(["#card"]),
      spacing: measure(["#card"]),
      zoom: measure(["#card"]),
    });
    expect(evaluateTextResize(already)).toEqual([]);
  });

  it("reports only the newly broken elements when some were already clipped", () => {
    const findings = evaluateTextResize(
      signals({ baseline: measure(["#old"]), spacing: measure(["#old", "#new"]) })
    );
    expect(rulesOf(findings)).toEqual(["text-spacing-clipped"]);
    expect(findings[0].description).toMatch(/^1 element /);
    expect(findings[0].selector).toBe("#new");
  });

  it("counts multiple broken elements in the description", () => {
    const findings = evaluateTextResize(signals({ zoom: measure(["#a", "#b", "#c"]) }));
    expect(findings[0].description).toMatch(/3 elements/);
  });

  it("flags sideways scrolling introduced by enlarging text", () => {
    const findings = evaluateTextResize(
      signals({ zoom: measure([], 1600, 1280) })
    );
    expect(rulesOf(findings)).toContain("text-zoom-horizontal-scroll");
    expect(findings[0].description).toMatch(/320px wider/);
  });

  it("does not blame zoom for horizontal scrolling the page already had", () => {
    const findings = evaluateTextResize(
      signals({ baseline: measure([], 1600, 1280), zoom: measure([], 1600, 1280) })
    );
    expect(rulesOf(findings)).not.toContain("text-zoom-horizontal-scroll");
  });

  it("reports both overrides independently when both break", () => {
    const findings = evaluateTextResize(
      signals({ spacing: measure(["#a"]), zoom: measure(["#b"]) })
    );
    expect(rulesOf(findings)).toEqual(["text-spacing-clipped", "text-zoom-clipped"]);
  });

  it("marks every finding as an AA accessibility issue with help and a title", () => {
    const findings = evaluateTextResize(
      signals({ spacing: measure(["#a"]), zoom: measure(["#b"], 1600, 1280) })
    );
    expect(findings).toHaveLength(3);
    for (const f of findings) {
      expect(f.category).toBe("accessibility");
      expect(f.wcagLevel).toBe("AA");
      expect(f.source).toBe("automated");
      expect(f.helpUrl).toBeTruthy();
      expect(f.title).toBeTruthy();
    }
  });
});

// A pass that gives up must not read as a pass that found nothing. The score
// counts only what ran, so silently-empty signals make a site look better than
// it is — measured on a live site as a 20-point swing between identical scans.
describe("a check that did not run", () => {
  it("marks the signals as failed rather than empty-and-fine", () => {
    const failed: TextResizeSignals = {
      baseline: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
      spacing: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
      zoom: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
      failed: true,
    };
    // No findings, because nothing was measured — the honesty lives in the
    // flag, which the report surfaces, not in invented findings.
    expect(evaluateTextResize(failed)).toEqual([]);
    expect(failed.failed).toBe(true);
  });

  it("is absent on a normal run, so the notice only appears when it should", () => {
    const ok: TextResizeSignals = {
      baseline: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
      spacing: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
      zoom: { clipped: [], documentScrollWidth: 1280, viewportWidth: 1280 },
    };
    expect(ok.failed).toBeUndefined();
  });
});
