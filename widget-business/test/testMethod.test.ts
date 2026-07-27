import { describe, it, expect } from "vitest";
import { fixKindForFinding, isKeyboardCheck, FIX_KINDS } from "../src/lib/testMethod";
import type { AccessibilityFinding } from "../src/api/scanClient";

function finding(over: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "x",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "div",
    description: "d",
    suggestedFix: "f",
    ...over,
  } as AccessibilityFinding;
}

const fixOf = (ruleId: string, over: Partial<AccessibilityFinding> = {}) =>
  fixKindForFinding(finding({ ruleId, ...over })).key;
const kb = (ruleId: string) => isKeyboardCheck(finding({ ruleId }));

describe("fixKindForFinding", () => {
  // The default, and it is the honest one: this tool reads markup and
  // stylesheets, so almost everything it can see is changed in one or the
  // other. Anything whose instruction is "add an attribute" is code, however
  // much it is a screen reader user who suffers for it — that is what the
  // impact paragraph is for.
  it("calls markup and stylesheet faults code", () => {
    for (const rule of [
      "dialog-missing-name",
      "dialog-missing-role",
      "dialog-close-unlabeled",
      "image-alt",
      "button-name",
      "link-name",
      "label",
      "landmark-one-main",
      "heading-order",
      "component-skip-link",
      "color-contrast",
      "typo-leading-tight",
      "keyboard-faint-focus",
      "aria-hidden",
      "some-future-axe-rule",
    ]) {
      expect(fixOf(rule), rule).toBe("code");
    }
  });

  it("keeps wording and design decisions out of the developer's queue", () => {
    for (const rule of ["dark-fake-urgency", "readability-dense-prose", "link-text-vague"]) {
      expect(fixOf(rule), rule).toBe("content");
    }
  });

  it("sends PDF faults to the document, where they actually live", () => {
    expect(fixOf("pdf-not-tagged")).toBe("document");
    expect(fixOf("pdf-no-title")).toBe("document");
  });

  it("defaults to code when the rule id is missing", () => {
    expect(fixKindForFinding(finding({ ruleId: undefined })).key).toBe("code");
  });

  it("gives every kind a label and a plain explanation", () => {
    for (const k of Object.values(FIX_KINDS)) {
      expect(k.label.length).toBeGreaterThan(0);
      expect(k.hint.length).toBeGreaterThan(20);
    }
  });
});

describe("isKeyboardCheck", () => {
  // The separate axis: not who fixes it, but whether the owner can confirm it
  // themselves by putting the mouse aside.
  it("marks every keyboard-checklist rule this project implements", () => {
    for (const rule of [
      "keyboard-focus-trap",
      "keyboard-mouse-only",
      "keyboard-no-visible-focus",
      "keyboard-faint-focus",
      "dialog-keyboard-trap",
      "dialog-no-escape",
      "dialog-focus-not-moved",
      "dialog-focus-lost-on-close",
      "reading-order-mismatch",
      "forced-colors-focus-lost",
    ]) {
      expect(kb(rule), rule).toBe(true);
    }
  });

  // A keyboard pass finds a thing that behaves wrongly, not a thing that was
  // never built — there is nothing to tab to.
  it("does not claim a missing skip link is keyboard-checkable", () => {
    expect(kb("component-skip-link")).toBe(false);
    expect(kb("reading-order-mismatch")).toBe(true);
  });

  it("leaves code-only and on-screen faults unmarked", () => {
    for (const rule of ["image-alt", "color-contrast", "landmark-one-main", "dark-fake-urgency"]) {
      expect(kb(rule), rule).toBe(false);
    }
  });

  // Both marks appear together on a keyboard finding: it is a code fix AND
  // something the owner can verify unaided. Collapsing them into one badge is
  // what put the wrong word on the card in the first place.
  it("is independent of who fixes it", () => {
    expect(kb("keyboard-faint-focus")).toBe(true);
    expect(fixOf("keyboard-faint-focus")).toBe("code");
  });
});
