import { describe, it, expect } from "vitest";
import { coveredHeight, evaluateReflowHeight, type ReflowHeightSignals } from "../src/services/reflowHeight/analyzeReflowHeight.js";

const base = (over: Partial<ReflowHeightSignals>): ReflowHeightSignals => ({
  viewportWidth: 1280,
  viewportHeight: 256,
  pinned: [],
  stuckPanels: [],
  ...over,
});
const bar = (selector: string, topPx: number, heightPx: number, widthPx = 1280) => ({ selector, snippet: "", topPx, heightPx, widthPx });

describe("reflow at 256px tall", () => {
  it("scores a pinned panel whose controls are below the edge, naming them", () => {
    const f = evaluateReflowHeight(
      base({
        pinned: [bar("#consent", 16, 240, 320)],
        stuckPanels: [{ selector: "#consent", snippet: "", heightPx: 420, unreachable: ["Accept all", "Reject all"] }],
      })
    );
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "reflow-height-unreachable", wcagCriterion: "1.4.10", wcagLevel: "AA", severity: "serious", category: "accessibility" });
    expect(f[0].description).toContain("“Accept all”, “Reject all”");
  });

  it("says nothing of a tall panel with no control below the edge", () => {
    expect(evaluateReflowHeight(base({ stuckPanels: [{ selector: "#notice", snippet: "", heightPx: 400, unreachable: [] }] }))).toEqual([]);
  });

  it("scores bars that leave less than a line to read through", () => {
    const f = evaluateReflowHeight(base({ pinned: [bar("header", 0, 120), bar("footer", 136, 120)] }));
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "reflow-height-pinned", category: "accessibility", wcagCriterion: "1.4.10" });
    expect(f[0].description).toContain("16px");
  });

  it("makes bars over half the window, with room left, a design note", () => {
    const f = evaluateReflowHeight(base({ pinned: [bar("header", 0, 90), bar("footer", 196, 60)] }));
    expect(f[0]).toMatchObject({ ruleId: "reflow-height-pinned-advisory", category: "design-clarity" });
    expect(f[0].wcagCriterion).toBeUndefined();
  });

  it("leaves a slim header alone, and a narrow side panel out of the count", () => {
    expect(evaluateReflowHeight(base({ pinned: [bar("header", 0, 48)] }))).toEqual([]);
    expect(evaluateReflowHeight(base({ pinned: [bar("header", 0, 48), bar("#chat", 16, 224, 320)] }))).toEqual([]);
  });

  it("counts overlapping bars once", () => {
    expect(coveredHeight([bar("a", 0, 100), bar("b", 50, 100), bar("c", 200, 100)], 256)).toBe(206);
  });

  it("survives a pass that did not run", () => {
    expect(evaluateReflowHeight(undefined)).toEqual([]);
  });
});
