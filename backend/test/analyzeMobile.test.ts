import { describe, it, expect } from "vitest";
import { evaluateMobile, type MobileSignals } from "../src/services/mobile/analyzeMobile.js";

function signals(overrides: Partial<MobileSignals> = {}): MobileSignals {
  return {
    viewportWidth: 390,
    documentScrollWidth: 390,
    overflowingElements: [],
    smallTapTargets: [],
    ...overrides,
  };
}

const rules = (m: MobileSignals) => evaluateMobile(m).map((f) => f.ruleId);

describe("evaluateMobile", () => {
  it("returns nothing when the page fits and targets are fine", () => {
    expect(evaluateMobile(signals())).toEqual([]);
  });

  it("does not flag scroll for a few pixels of tolerance", () => {
    expect(rules(signals({ documentScrollWidth: 393 }))).not.toContain("mobile-horizontal-scroll");
  });

  it("flags horizontal scroll and lists each breakout element", () => {
    const m = signals({
      documentScrollWidth: 640,
      overflowingElements: [
        { selector: "div.wide", snippet: "<div class='wide'>", overflowPx: 250 },
        { selector: "img.hero", snippet: "<img class='hero'>", overflowPx: 120 },
      ],
    });
    const findings = evaluateMobile(m);
    const scroll = findings.filter((f) => f.ruleId === "mobile-horizontal-scroll");
    expect(scroll).toHaveLength(2);
    expect(scroll[0].category).toBe("accessibility");
    expect(scroll[0].wcagCriterion).toBe("1.4.10");
    expect(scroll[0].wcagLevel).toBe("AA");
    expect(scroll[0].elementSnippet).toContain("wide");
  });

  it("falls back to a body-level finding when no specific culprit is found", () => {
    const findings = evaluateMobile(signals({ documentScrollWidth: 640, overflowingElements: [] }));
    const scroll = findings.filter((f) => f.ruleId === "mobile-horizontal-scroll");
    expect(scroll).toHaveLength(1);
    expect(scroll[0].selector).toBe("body");
  });

  it("flags each too-small tap target", () => {
    const m = signals({
      smallTapTargets: [
        { selector: "button.x", snippet: "<button class='x'>×</button>", width: 16, height: 16 },
        { selector: "a.icon", snippet: "<a class='icon'>", width: 20, height: 20 },
      ],
    });
    const findings = evaluateMobile(m);
    const tap = findings.filter((f) => f.ruleId === "mobile-tap-target");
    expect(tap).toHaveLength(2);
    // 2.5.5, not 2.5.8: this report measures WCAG 2.1, and 2.5.8 belongs to
    // 2.2. This assertion previously encoded the wrong value.
    expect(tap[0].wcagCriterion).toBe("2.5.5");
    expect(tap[0].description).toContain("16×16");
    expect(tap[0].suggestedFix).toMatch(/24×24/);
  });

  it("all mobile findings are accessibility category", () => {
    const m = signals({
      documentScrollWidth: 640,
      overflowingElements: [{ selector: "div", snippet: "<div>", overflowPx: 250 }],
      smallTapTargets: [{ selector: "button", snippet: "<button>", width: 16, height: 16 }],
    });
    for (const f of evaluateMobile(m)) {
      expect(f.category).toBe("accessibility");
      expect(f.helpUrl).toBeTruthy();
    }
  });
});

// This report measures WCAG 2.1. Claiming a criterion that only exists in 2.2,
// at a level 2.1 does not require, tells an owner they have a legal duty they
// do not have — the same fault as overclaiming conformance, pointed the other
// way.
describe("what a tap-target finding is allowed to claim", () => {
  const tiny = {
    viewportWidth: 390,
    documentScrollWidth: 390,
    overflowingElements: [],
    smallTapTargets: [{ selector: "a.x", snippet: "<a>x</a>", width: 18, height: 18 }],
  };

  it("cites the criterion WCAG 2.1 actually has for target size", () => {
    const f = evaluateMobile(tiny).find((x) => x.ruleId === "mobile-tap-target")!;
    expect(f.wcagCriterion).toBe("2.5.5");
  });

  it("does not present it as a legal requirement, because at 2.1 it isn't one", () => {
    const f = evaluateMobile(tiny).find((x) => x.ruleId === "mobile-tap-target")!;
    expect(f.wcagLevel).toBe("AAA");
    expect(f.wcagLevel).not.toBe("AA");
  });

  it("still reports it, and says where the requirement does bite", () => {
    const f = evaluateMobile(tiny).find((x) => x.ruleId === "mobile-tap-target")!;
    expect(f.description).toMatch(/WCAG 2\.2/);
    expect(f.description).toMatch(/24×24/);
  });

  it("points at 2.1 guidance rather than 2.2 guidance", () => {
    const f = evaluateMobile(tiny).find((x) => x.ruleId === "mobile-tap-target")!;
    expect(f.helpUrl).toMatch(/WCAG21/);
  });
});

// WCAG 2.5.5 and 2.5.8 both state a spacing exception: an undersized target
// passes if a 24px-diameter circle centred on it does not intersect another
// target's circle. Without it the check flagged correct pages — a default
// button is about 21px tall, and an isolated one is not a problem.
//
// The collector runs in the page, so these exercise the same geometry through
// the evaluator's contract: what it is handed is what survived the exception.
describe("the spacing exception", () => {
  const signals = (targets: Array<{ selector: string; width: number; height: number }>) => ({
    viewportWidth: 390,
    documentScrollWidth: 390,
    overflowingElements: [],
    smallTapTargets: targets.map((t) => ({ ...t, snippet: `<a>${t.selector}</a>` })),
  });

  it("reports the targets the collector judged crowded", () => {
    const found = evaluateMobile(signals([{ selector: "a.one", width: 18, height: 18 }]));
    expect(found.filter((f) => f.ruleId === "mobile-tap-target")).toHaveLength(1);
  });

  it("says nothing when the collector exempted them all", () => {
    expect(evaluateMobile(signals([])).filter((f) => f.ruleId === "mobile-tap-target")).toEqual([]);
  });

  it("keeps reporting the size that was measured, so the advice is concrete", () => {
    const f = evaluateMobile(signals([{ selector: "a.x", width: 12, height: 9 }]))
      .find((x) => x.ruleId === "mobile-tap-target")!;
    expect(f.description).toMatch(/12×9px/);
  });
});
