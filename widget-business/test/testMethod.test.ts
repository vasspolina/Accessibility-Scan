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
  // The one this was reported on: a card reading "Buttons and links are too
  // small to tap reliably on a phone", marked Code fix. A developer handed
  // that has to invent a size, which is not their decision to make.
  it("sends a decision about size, colour or spacing to design", () => {
    for (const rule of [
      "mobile-tap-target",
      "color-contrast",
      "keyboard-faint-focus",
      "keyboard-no-visible-focus",
      "component-required-cue",
    ]) {
      expect(fixOf(rule), rule).toBe("design");
    }
  });

  // Every typography note is a design decision, and all of them wore a code
  // mark while sitting under a heading calling them notes on the design.
  it("treats the whole typography set as design", () => {
    for (const rule of [
      "typo-caps-letterspacing",
      "typo-leading-tight",
      "typo-leading-for-measure",
      "typo-line-length-short",
      "typo-line-length-long",
      "typo-italic-body",
      "typo-thin-weight",
    ]) {
      expect(fixOf(rule), rule).toBe("design");
    }
  });

  // Design and content are separate desks, and were sharing a badge.
  it("does not sweep wording into design", () => {
    expect(fixOf("link-text-vague")).toBe("content");
    expect(fixOf("dark-consent-no-reject")).toBe("content");
  });

  it("gives design its own label and its own hint", () => {
    expect(FIX_KINDS.design.label).toBe("Design fix");
    expect(FIX_KINDS.design.hint).not.toBe(FIX_KINDS.content.hint);
    // The content hint used to claim design as well, which is what made the
    // wrong badge readable as correct.
    expect(FIX_KINDS.content.hint).not.toMatch(/design/i);
  });

  // The default, and it is still the honest one. The boundary is no longer
  // "does it end in a stylesheet" — nearly everything does — but whether
  // somebody has to make a visual decision first. Add a missing name, a role,
  // an alt attribute, a skip link: there is one right answer and a developer
  // can supply it. Those are code, however much it is a screen reader user
  // who suffers for it, which is what the impact paragraph is for.
  it("calls markup and structure faults code", () => {
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
      "aria-hidden",
      "some-future-axe-rule",
    ]) {
      expect(fixOf(rule), rule).toBe("code");
    }
  });

  it("keeps wording decisions out of the developer's queue", () => {
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

  // Both marks appear together on a keyboard finding: the owner can verify it
  // unaided, and somebody else does the work. Collapsing them into one badge
  // is what put the wrong word on the card in the first place, and the case
  // below shows why one badge could never have carried both — two findings
  // the owner checks the same way, going to two different desks.
  it("is independent of who fixes it", () => {
    expect(kb("keyboard-faint-focus")).toBe(true);
    expect(fixOf("keyboard-faint-focus")).toBe("design");

    expect(kb("dialog-no-escape")).toBe(true);
    expect(fixOf("dialog-no-escape")).toBe("code");
  });
});
