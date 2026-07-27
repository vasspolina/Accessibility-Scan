import { describe, it, expect } from "vitest";
import { evaluateForcedColors } from "../src/services/forcedColors/analyzeForcedColors.js";
import type { FocusStyles, TabStop } from "../src/services/keyboard/analyzeKeyboard.js";
import type { UserPreferenceSignals } from "../src/services/render/renderPage.js";

const base: FocusStyles = {
  outlineStyle: "none",
  outlineWidth: "0px",
  outlineColor: "rgb(0, 0, 0)",
  boxShadow: "none",
  backgroundColor: "rgb(238, 238, 238)",
  borderColor: "rgb(0, 0, 0)",
  backdropColor: "rgb(255, 255, 255)",
};

function stop(selector: string, focused: Partial<FocusStyles>, unfocused: Partial<FocusStyles> = {}): TabStop {
  return {
    selector,
    tag: "button",
    focused: { ...base, ...focused },
    unfocused: { ...base, ...unfocused },
  };
}

const noSignals: UserPreferenceSignals = {
  motionIgnoringPreference: [],
  iconLostInForcedColors: [],
};

const ids = (stops: TabStop[], s: UserPreferenceSignals = noSignals) =>
  evaluateForcedColors(stops, s).map((f) => f.ruleId);

describe("evaluateForcedColors: focus indicators", () => {
  const shadowOnly = { boxShadow: "rgb(0, 170, 85) 0px 0px 0px 3px" };
  const outlined = { outlineStyle: "solid", outlineWidth: "3px" };

  it("flags a focus ring drawn only with a box-shadow", () => {
    // Measured: forced colours computes box-shadow to "none", so this
    // indicator does not exist for that user.
    const findings = evaluateForcedColors(
      [stop("button.a", shadowOnly), stop("button.b", shadowOnly)],
      noSignals
    );
    const f = findings.find((x) => x.ruleId === "forced-colors-focus-lost");
    expect(f).toBeDefined();
    expect(f!.wcagCriterion).toBe("2.4.7");
    expect(f!.wcagLevel).toBe("AA");
  });

  it("flags a focus style that only swaps background colour", () => {
    // Both the focused and unfocused colours become the same system colour,
    // so the swap stops distinguishing anything.
    const swap = { backgroundColor: "rgb(0, 51, 102)" };
    expect(ids([stop("button.a", swap), stop("button.b", swap)])).toContain(
      "forced-colors-focus-lost"
    );
  });

  it("says nothing when an outline is present, whatever else is going on", () => {
    expect(
      ids([stop("button.a", { ...outlined, ...shadowOnly }), stop("button.b", { ...outlined, ...shadowOnly })])
    ).toEqual([]);
  });

  it("clears the deliberate transparent-outline idiom", () => {
    // `outline: 3px solid transparent` with a box-shadow doing the visible
    // work is exactly what gov.uk and wikipedia.org write, and it is correct:
    // forced colours repaints that outline into a real, visible ring. The
    // visible-focus rules judge the transparent colour; this one must not.
    const idiom = {
      outlineStyle: "solid",
      outlineWidth: "3px",
      outlineColor: "rgba(0, 0, 0, 0)",
      boxShadow: "rgb(0, 51, 102) 0px 0px 0px 3px",
    };
    expect(ids([stop("button.a", idiom), stop("button.b", idiom)])).toEqual([]);
  });

  it("does not pile on where there is no indicator at all", () => {
    // keyboard-no-visible-focus already reports this. Two complaints about
    // one fault helps nobody.
    expect(ids([stop("button.a", {}), stop("button.b", {})])).toEqual([]);
  });

  it("does not report a single offender", () => {
    expect(ids([stop("button.a", shadowOnly), stop("button.b", outlined)])).toEqual([]);
  });

  it("ignores stops whose unfocused state could not be measured", () => {
    const unmeasurable: TabStop = {
      selector: "button.a",
      tag: "button",
      focused: { ...base, ...shadowOnly },
      unfocused: null,
    };
    expect(ids([unmeasurable, unmeasurable])).toEqual([]);
  });
});

describe("evaluateForcedColors: icons", () => {
  it("flags a control whose only content is a CSS background image", () => {
    const findings = evaluateForcedColors([], {
      motionIgnoringPreference: [],
      iconLostInForcedColors: [
        { selector: "#search", tag: "button", snippet: '<button aria-label="Search"></button>' },
      ],
    });
    expect(findings.map((f) => f.ruleId)).toEqual(["forced-colors-icon-lost"]);
    expect(findings[0].elementSnippet).toContain("Search");
    // No criterion claimed: the control keeps its accessible name and still
    // works, so this is a serious usability failure rather than a WCAG one.
    expect(findings[0].wcagCriterion).toBeUndefined();
  });

  it("returns nothing when the page has neither problem", () => {
    expect(evaluateForcedColors([], noSignals)).toEqual([]);
  });
});
