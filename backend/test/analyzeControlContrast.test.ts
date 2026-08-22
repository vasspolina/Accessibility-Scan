import { describe, it, expect } from "vitest";
import {
  evaluateControlContrast,
  type ControlBoundarySample,
} from "../src/services/contrast/analyzeControlContrast.js";

function sample(overrides: Partial<ControlBoundarySample> = {}): ControlBoundarySample {
  return {
    selector: "input",
    snippet: "<input>",
    tag: "input",
    borderColor: "rgb(118, 118, 118)", // the UA default — 3.94:1 on white
    borderWidth: 1,
    backgroundColor: "rgb(255, 255, 255)",
    surfaceColor: "rgb(255, 255, 255)",
    disabled: false,
    ...overrides,
  };
}

describe("1.4.11: control boundaries the criterion is actually about", () => {
  it("flags a border measured below 3:1 against its surface", () => {
    // #ddd on white is about 1.35:1 — visible enough to prove a boundary was
    // intended, nowhere near visible enough to serve as one.
    const f = evaluateControlContrast([sample({ borderColor: "rgb(221, 221, 221)" })]);
    expect(f).toHaveLength(1);
    expect(f[0].wcagCriterion).toBe("1.4.11");
    expect(f[0].ruleId).toBe("control-faint-boundary");
  });

  it("one card for a whole form of faint borders", () => {
    const faint = { borderColor: "rgb(221, 221, 221)" };
    const f = evaluateControlContrast([
      sample({ ...faint, selector: "input.a" }),
      sample({ ...faint, selector: "input.b" }),
      sample({ ...faint, selector: "select.c" }),
    ]);
    expect(f).toHaveLength(1);
    expect(f[0].description).toContain("3 form controls");
  });

  it("passes a border at or above 3:1", () => {
    expect(evaluateControlContrast([sample()])).toEqual([]); // 3.94:1
  });

  it("judges against the better surface, like the focus ring", () => {
    // Faint against the page, clear against the control's own dark fill.
    const f = evaluateControlContrast([
      sample({ borderColor: "rgb(230, 230, 230)", backgroundColor: "rgb(20, 20, 20)" }),
    ]);
    expect(f).toEqual([]);
  });

  it("does not judge the no-boundary cases: transparent, matching, disabled", () => {
    expect(evaluateControlContrast([sample({ borderColor: "rgba(0, 0, 0, 0)" })])).toEqual([]);
    expect(evaluateControlContrast([sample({ borderColor: "rgb(255, 255, 255)" })])).toEqual([]);
    expect(
      evaluateControlContrast([sample({ borderColor: "rgb(221, 221, 221)", disabled: true })])
    ).toEqual([]);
  });

  it("an absent sample set is a dead probe, not a clean page", () => {
    expect(evaluateControlContrast(undefined)).toEqual([]);
  });
});
