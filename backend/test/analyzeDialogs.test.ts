import { describe, it, expect } from "vitest";
import { evaluateDialogs } from "../src/services/dialog/analyzeDialogs.js";
import type { DialogKeyboardResult, DomSignals } from "../src/services/render/renderPage.js";

type Dialog = DomSignals["dialogs"][number];

function dialog(overrides: Partial<Dialog> = {}): Dialog {
  return {
    selector: "div.modal",
    role: "dialog",
    isNativeDialog: false,
    hasAccessibleName: true,
    ariaModal: true,
    looksLikeModalOverlay: true,
    closeControl: { present: true, hasAccessibleName: true },
    hasFocusInside: true,
    ...overrides,
  };
}

const rules = (ds: Dialog[]) => evaluateDialogs(ds).map((f) => f.ruleId);

describe("evaluateDialogs", () => {
  it("returns nothing when there are no dialogs", () => {
    expect(evaluateDialogs([])).toEqual([]);
  });

  it("returns nothing for a well-built, fully-labelled dialog", () => {
    expect(evaluateDialogs([dialog()])).toEqual([]);
  });

  it("flags an unlabelled close button as a serious accessibility issue", () => {
    const findings = evaluateDialogs([
      dialog({ closeControl: { present: true, hasAccessibleName: false } }),
    ]);
    const f = findings.find((x) => x.ruleId === "dialog-close-unlabeled");
    expect(f).toBeDefined();
    expect(f!.severity).toBe("serious");
    expect(f!.category).toBe("accessibility");
    expect(f!.wcagCriterion).toBe("4.1.2");
    expect(f!.helpUrl).toContain("dialog-modal");
  });

  it("does not flag a close button that has a real label", () => {
    expect(rules([dialog({ closeControl: { present: true, hasAccessibleName: true } })])).not.toContain(
      "dialog-close-unlabeled"
    );
  });

  it("flags an overlay that isn't marked up as a dialog (design-clarity)", () => {
    const findings = evaluateDialogs([
      dialog({ role: "", isNativeDialog: false, looksLikeModalOverlay: true, hasAccessibleName: false, closeControl: { present: true, hasAccessibleName: true } }),
    ]);
    const f = findings.find((x) => x.ruleId === "dialog-missing-role");
    expect(f).toBeDefined();
    expect(f!.category).toBe("design-clarity");
  });

  it("does not flag a role=dialog overlay for missing-role", () => {
    expect(rules([dialog({ role: "dialog" })])).not.toContain("dialog-missing-role");
  });

  it("flags a marked dialog with no accessible name", () => {
    const findings = evaluateDialogs([dialog({ role: "dialog", hasAccessibleName: false })]);
    const f = findings.find((x) => x.ruleId === "dialog-missing-name");
    expect(f).toBeDefined();
    expect(f!.wcagCriterion).toBe("4.1.2");
  });

  it("flags a pop-up with no identifiable close control", () => {
    expect(rules([dialog({ closeControl: null })])).toContain("dialog-no-close");
  });

  it("groups multiple offenders into one finding per rule with a count", () => {
    const findings = evaluateDialogs([
      dialog({ selector: "div.a", closeControl: { present: true, hasAccessibleName: false } }),
      dialog({ selector: "div.b", closeControl: { present: true, hasAccessibleName: false } }),
    ]);
    const close = findings.filter((f) => f.ruleId === "dialog-close-unlabeled");
    expect(close).toHaveLength(1);
    expect(close[0].description).toContain("2 pop-ups");
  });
});

describe("evaluateDialogs: what a real keyboard did to an open modal", () => {
  const probe = (o: Partial<DialogKeyboardResult> = {}): DialogKeyboardResult => ({
    selector: "#dlg",
    role: "dialog",
    focusMovedIn: true,
    closedByEscape: true,
    focusEscapes: true,
    focusLostAfterClose: false,
    ...o,
  });
  const ids = (p: DialogKeyboardResult) => evaluateDialogs([], [p]).map((f) => f.ruleId);

  it("says nothing about a modal that does everything right", () => {
    expect(ids(probe())).toEqual([]);
  });

  it("claims a keyboard trap only when Escape failed AND focus could not leave", () => {
    const findings = evaluateDialogs([], [probe({ closedByEscape: false, focusEscapes: false })]);
    const trap = findings.find((f) => f.ruleId === "dialog-keyboard-trap");
    expect(trap).toBeDefined();
    expect(trap!.severity).toBe("critical");
    expect(trap!.wcagCriterion).toBe("2.1.2");
    expect(trap!.wcagLevel).toBe("A");
  });

  it("does not claim a trap when Escape failed but focus could still leave", () => {
    // The distinction the whole probe exists to draw. Ignoring Escape is bad
    // manners; being unable to leave is a Level A failure. Reporting the
    // first as the second would be inventing a legal duty out of guidance.
    const found = ids(probe({ closedByEscape: false, focusEscapes: true }));
    expect(found).toContain("dialog-no-escape");
    expect(found).not.toContain("dialog-keyboard-trap");
    const noEscape = evaluateDialogs([], [probe({ closedByEscape: false, focusEscapes: true })])[0];
    expect(noEscape.wcagCriterion).toBeUndefined();
  });

  it("reports only the trap, not the lesser complaints about the same element", () => {
    expect(
      ids(probe({ closedByEscape: false, focusEscapes: false, focusMovedIn: false }))
    ).toEqual(["dialog-keyboard-trap"]);
  });

  it("flags a modal that appeared without taking focus", () => {
    expect(ids(probe({ focusMovedIn: false }))).toContain("dialog-focus-not-moved");
  });

  it("flags focus being dropped when the modal closes", () => {
    expect(ids(probe({ focusLostAfterClose: true }))).toContain("dialog-focus-lost-on-close");
  });

  it("does not complain about lost focus when the modal never closed", () => {
    // focusLostAfterClose is only meaningful once it actually closed.
    expect(
      ids(probe({ closedByEscape: false, focusEscapes: true, focusLostAfterClose: true }))
    ).not.toContain("dialog-focus-lost-on-close");
  });
});
