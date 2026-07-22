import { describe, it, expect } from "vitest";
import { evaluateKeyboardNav, type TabStop, type FocusStyles } from "../src/services/keyboard/analyzeKeyboard.js";

const base: FocusStyles = {
  outlineStyle: "none",
  outlineWidth: "0px",
  boxShadow: "none",
  backgroundColor: "rgb(255, 255, 255)",
  borderColor: "rgb(0, 0, 0)",
};

function stop(selector: string, focused: Partial<FocusStyles>, unfocused: Partial<FocusStyles> | null = {}): TabStop {
  return {
    selector,
    tag: "a",
    focused: { ...base, ...focused },
    unfocused: unfocused === null ? null : { ...base, ...unfocused },
  };
}

describe("evaluateKeyboardNav", () => {
  it("returns nothing when every stop shows a focus outline", () => {
    const stops = [
      stop("a.one", { outlineStyle: "solid", outlineWidth: "2px" }),
      stop("a.two", { outlineStyle: "solid", outlineWidth: "2px" }),
    ];
    expect(evaluateKeyboardNav({ stops, reachedEnd: true })).toEqual([]);
  });

  it("accepts a box-shadow change as a visible indicator", () => {
    const stops = [
      stop("a.one", { boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
      stop("a.two", { boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
    ];
    expect(evaluateKeyboardNav({ stops, reachedEnd: true })).toEqual([]);
  });

  it("flags invisible focus when multiple stops show no visual change", () => {
    const stops = [stop("a.one", {}), stop("a.two", {}), stop("a.three", { outlineStyle: "solid", outlineWidth: "2px" })];
    const findings = evaluateKeyboardNav({ stops, reachedEnd: true });
    expect(findings).toHaveLength(1);
    expect(findings[0].ruleId).toBe("keyboard-no-visible-focus");
    expect(findings[0].wcagCriterion).toBe("2.4.7");
    expect(findings[0].wcagLevel).toBe("AA");
    expect(findings[0].category).toBe("accessibility");
    expect(findings[0].description).toContain("2 of 3");
  });

  it("does not flag a single invisible stop among many (measurement noise)", () => {
    const stops = [
      stop("a.one", {}),
      stop("a.two", { outlineStyle: "solid", outlineWidth: "2px" }),
      stop("a.three", { outlineStyle: "solid", outlineWidth: "2px" }),
    ];
    expect(evaluateKeyboardNav({ stops, reachedEnd: true })).toEqual([]);
  });

  it("skips stops whose unfocused state could not be measured", () => {
    const stops = [stop("a.one", {}, null), stop("a.two", {}, null)];
    expect(evaluateKeyboardNav({ stops, reachedEnd: false })).toEqual([]);
  });

  it("flags a focus trap when the same element repeats three times", () => {
    const stops = [
      stop("input.trap", {}, null),
      stop("input.trap", {}, null),
      stop("input.trap", {}, null),
    ];
    const findings = evaluateKeyboardNav({ stops, reachedEnd: false });
    const trap = findings.find((f) => f.ruleId === "keyboard-focus-trap");
    expect(trap).toBeDefined();
    expect(trap!.severity).toBe("critical");
    expect(trap!.wcagCriterion).toBe("2.1.2");
    expect(trap!.selector).toBe("input.trap");
  });

  it("does not flag a trap for a single repeat", () => {
    const stops = [stop("a.one", {}, null), stop("a.one", {}, null), stop("a.two", {}, null)];
    const findings = evaluateKeyboardNav({ stops, reachedEnd: true });
    expect(findings.find((f) => f.ruleId === "keyboard-focus-trap")).toBeUndefined();
  });

  it("returns nothing for an empty walk", () => {
    expect(evaluateKeyboardNav({ stops: [], reachedEnd: false })).toEqual([]);
  });
});
