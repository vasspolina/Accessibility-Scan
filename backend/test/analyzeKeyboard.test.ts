import { describe, it, expect } from "vitest";
import { evaluateKeyboardNav, type TabStop, type FocusStyles } from "../src/services/keyboard/analyzeKeyboard.js";

const base: FocusStyles = {
  outlineStyle: "none",
  outlineWidth: "0px",
  outlineColor: "rgb(0, 0, 0)",
  boxShadow: "none",
  backgroundColor: "rgb(255, 255, 255)",
  borderColor: "rgb(0, 0, 0)",
  backdropColor: "rgb(255, 255, 255)",
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
    expect(evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true })).toEqual([]);
  });

  it("accepts a box-shadow change as a visible indicator", () => {
    const stops = [
      stop("a.one", { boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
      stop("a.two", { boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
    ];
    expect(evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true })).toEqual([]);
  });

  it("flags invisible focus when multiple stops show no visual change", () => {
    const stops = [stop("a.one", {}), stop("a.two", {}), stop("a.three", { outlineStyle: "solid", outlineWidth: "2px" })];
    const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
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
    expect(evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true })).toEqual([]);
  });

  it("skips stops whose unfocused state could not be measured", () => {
    const stops = [stop("a.one", {}, null), stop("a.two", {}, null)];
    expect(evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: false })).toEqual([]);
  });

  it("flags a focus trap when the same element repeats three times", () => {
    const stops = [
      stop("input.trap", {}, null),
      stop("input.trap", {}, null),
      stop("input.trap", {}, null),
    ];
    const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: false });
    const trap = findings.find((f) => f.ruleId === "keyboard-focus-trap");
    expect(trap).toBeDefined();
    expect(trap!.severity).toBe("critical");
    expect(trap!.wcagCriterion).toBe("2.1.2");
    expect(trap!.selector).toBe("input.trap");
  });

  it("does not flag a trap for a single repeat", () => {
    const stops = [stop("a.one", {}, null), stop("a.one", {}, null), stop("a.two", {}, null)];
    const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
    expect(findings.find((f) => f.ruleId === "keyboard-focus-trap")).toBeUndefined();
  });

  // A ring that exists but is too pale to see. The exemption cases matter as
  // much as the positive one: 1.4.11 excuses the browser's own focus style,
  // so reporting it would invent a fault the standard explicitly allows.
  describe("faint focus indicator", () => {
    const pale = { outlineStyle: "solid", outlineWidth: "1px", outlineColor: "rgb(230, 230, 230)" };
    const strong = { outlineStyle: "solid", outlineWidth: "2px", outlineColor: "rgb(20, 20, 20)" };

    it("flags an author outline too pale against its backdrop", () => {
      const stops = [stop("a.one", pale), stop("a.two", pale)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      const f = findings.find((x) => x.ruleId === "keyboard-faint-focus");
      expect(f).toBeDefined();
      expect(f!.wcagCriterion).toBe("1.4.11");
      expect(f!.wcagLevel).toBe("AA");
    });

    it("exempts the browser default ring, which 1.4.11 excludes by name", () => {
      // outline-style: auto is what Chrome computes for its own focus ring.
      // Its colour can sit below 3:1 and the standard still permits it.
      const uaDefault = { outlineStyle: "auto", outlineWidth: "1px", outlineColor: "rgb(230, 230, 230)" };
      const stops = [stop("a.one", uaDefault), stop("a.two", uaDefault)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
    });

    it("says nothing when a box-shadow ring is doing the visible work", () => {
      const stops = [
        stop("a.one", { ...pale, boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
        stop("a.two", { ...pale, boxShadow: "0 0 0 3px blue" }, { boxShadow: "none" }),
      ];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
    });

    it("says nothing about a ring that clears 3:1", () => {
      const stops = [stop("a.one", strong), stop("a.two", strong)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
    });

    it("does not report a single pale stop", () => {
      const stops = [stop("a.one", pale), stop("a.two", strong), stop("a.three", strong)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
    });

    it("takes the backdrop into account, not just the element's background", () => {
      // A white ring is invisible on a white page and obvious on a dark one.
      // Only backdropColor differs between these two cases.
      const white = { outlineStyle: "solid", outlineWidth: "2px", outlineColor: "rgb(255, 255, 255)" };
      const onWhite = [
        stop("a.one", { ...white, backdropColor: "rgb(255, 255, 255)" }),
        stop("a.two", { ...white, backdropColor: "rgb(255, 255, 255)" }),
      ];
      const onDark = [
        stop("a.one", { ...white, backdropColor: "rgb(17, 17, 17)" }),
        stop("a.two", { ...white, backdropColor: "rgb(17, 17, 17)" }),
      ];
      expect(
        evaluateKeyboardNav({ mouseOnly: [], stops: onWhite, reachedEnd: true }).find(
          (x) => x.ruleId === "keyboard-faint-focus"
        )
      ).toBeDefined();
      expect(
        evaluateKeyboardNav({ mouseOnly: [], stops: onDark, reachedEnd: true }).find(
          (x) => x.ruleId === "keyboard-faint-focus"
        )
      ).toBeUndefined();
    });

    it("treats a transparent background as absent, not as black", () => {
      // How a computed style reports "no background". Parsed naively it is
      // pure black, which a pale ring contrasts with beautifully — so the
      // check went silent on precisely the elements most likely to be wrong.
      // A link is the common case: transparent by default.
      const paleOnTransparent = {
        outlineStyle: "solid",
        outlineWidth: "1px",
        outlineColor: "rgb(232, 232, 232)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        backdropColor: "rgb(255, 255, 255)",
      };
      const stops = [stop("a.one", paleOnTransparent), stop("a.two", paleOnTransparent)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeDefined();
    });

    it("calls a fully transparent ring absent, not faint", () => {
      // gov.uk and wikipedia.org both draw `outline: solid transparent` so
      // Windows High Contrast Mode has something to recolour. Naming that a
      // contrast failure would describe the wrong fault — there is no ring.
      // With nothing else changing on focus, the right complaint is that
      // focus is invisible.
      const invisibleRing = {
        outlineStyle: "solid",
        outlineWidth: "3px",
        outlineColor: "rgba(0, 0, 0, 0)",
      };
      const stops = [stop("a.one", invisibleRing), stop("a.two", invisibleRing)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
      expect(findings.find((x) => x.ruleId === "keyboard-no-visible-focus")).toBeDefined();
    });

    it("composites a translucent background rather than reading it as black", () => {
      // smashingmagazine.com layers rgba(0, 0, 0, 0.15) over its red banner.
      // Read as opaque black that surface is wrong in both directions; what
      // is actually on screen is a slightly darkened red.
      const overRed = {
        outlineStyle: "solid",
        outlineWidth: "3px",
        outlineColor: "rgb(211, 58, 44)",
        backgroundColor: "rgba(0, 0, 0, 0.15)",
        backdropColor: "rgb(211, 58, 44)",
      };
      const stops = [stop("a.one", overRed), stop("a.two", overRed)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      // A red ring on its own red banner, darkened a little: still nowhere
      // near 3:1, so this stays a finding.
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeDefined();
    });

    it("does not flag a ring that is legible against either surface it touches", () => {
      // A dark ring hugging a dark button, on a pale page. Judged only
      // against the button it looks invisible; in reality the ring is drawn
      // outside the button, against the page, where it reads clearly. This is
      // the false positive that measuring both surfaces exists to prevent.
      const darkOnDarkButton = {
        outlineStyle: "solid",
        outlineWidth: "2px",
        outlineColor: "rgb(20, 20, 20)",
        backgroundColor: "rgb(26, 26, 26)",
        backdropColor: "rgb(255, 255, 255)",
      };
      const stops = [stop("a.one", darkOnDarkButton), stop("a.two", darkOnDarkButton)];
      const findings = evaluateKeyboardNav({ mouseOnly: [], stops, reachedEnd: true });
      expect(findings.find((x) => x.ruleId === "keyboard-faint-focus")).toBeUndefined();
    });
  });

  it("returns nothing for an empty walk", () => {
    expect(evaluateKeyboardNav({ mouseOnly: [], stops: [], reachedEnd: false })).toEqual([]);
  });
});

describe("an empty walk is not a clean pass", () => {
  // The evaluator's own guard: with no stops there is nothing to judge, so it
  // must not emit focus findings. The render side marks such a walk failed so
  // the report says the check was incomplete rather than implying it passed —
  // measured on theguardian.com, whose consent iframe holds focus at load, so
  // the first Tab press lands on <body> and the walk ends having seen nothing.
  it("emits no focus findings when nothing was measured", () => {
    const findings = evaluateKeyboardNav({
      mouseOnly: [],
      stops: [],
      reachedEnd: true,
      failed: true,
    });
    expect(findings.find((f) => f.ruleId === "keyboard-no-visible-focus")).toBeUndefined();
    expect(findings.find((f) => f.ruleId === "keyboard-faint-focus")).toBeUndefined();
  });

  // Mouse-only controls are collected separately from the tab walk, so they
  // survive a walk that recorded nothing.
  it("still reports controls the keyboard cannot reach", () => {
    const findings = evaluateKeyboardNav({
      mouseOnly: [{ selector: "div.buy", snippet: "<div>Buy</div>", tag: "div", label: "Buy" }],
      stops: [],
      reachedEnd: true,
      failed: true,
    });
    expect(findings.map((f) => f.ruleId)).toContain("keyboard-mouse-only");
  });
});
