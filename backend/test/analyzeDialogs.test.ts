import { describe, it, expect } from "vitest";
import { evaluateDialogs } from "../src/services/dialog/analyzeDialogs.js";
import type { DomSignals } from "../src/services/render/renderPage.js";

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
