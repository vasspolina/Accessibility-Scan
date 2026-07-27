import { describe, it, expect } from "vitest";
import { methodForFinding, METHODS } from "../src/lib/testMethod";
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

const keyOf = (ruleId: string, over: Partial<AccessibilityFinding> = {}) =>
  methodForFinding(finding({ ruleId, ...over })).key;

describe("methodForFinding", () => {
  // The point of the whole map: this group is checkable by hand, today,
  // with nothing installed. Every item of the keyboard-only checklist that
  // this project implements has to land here.
  it("puts every keyboard-checklist rule under the keyboard test", () => {
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
      expect(keyOf(rule), `${rule} should be a keyboard finding`).toBe("keyboard");
    }
  });

  // The dialog layer is the reason exact rules are checked before prefixes:
  // it emits both keyboard findings and markup ones, so a prefix rule alone
  // would file "Escape does nothing" under the wrong method.
  it("splits the dialog layer by what the finding is actually about", () => {
    expect(keyOf("dialog-no-escape")).toBe("keyboard");
    expect(keyOf("dialog-missing-name")).toBe("code");
    expect(keyOf("dialog-missing-role")).toBe("code");
  });

  // Likewise forced colours: a lost focus ring is something you find by
  // tabbing, a lost icon is something you find by looking.
  it("splits forced-colours findings by how you would notice them", () => {
    expect(keyOf("forced-colors-focus-lost")).toBe("keyboard");
    expect(keyOf("forced-colors-icon-lost")).toBe("screen");
  });

  // The line between a keyboard finding and a code one: a keyboard pass can
  // find a thing that behaves wrongly, but not a thing that was never built.
  it("files a missing skip link as code, and a wrong reading order as keyboard", () => {
    expect(keyOf("component-skip-link")).toBe("code");
    expect(keyOf("reading-order-mismatch")).toBe("keyboard");
  });

  // Structure affects screen reader users but is not found by listening, and
  // the landmark finding's own title says "aren't named in the code".
  it("files structural markup as code, not as a screen reader problem", () => {
    for (const rule of ["landmark-one-main", "region", "heading-order", "listitem", "list"]) {
      expect(keyOf(rule), rule).toBe("code");
    }
  });

  // Anything whose fix is an attribute or a tag is code, however much it is
  // a screen reader user who suffers for it. The badge says who picks the
  // work up; the impact paragraph says who it hurts.
  it("files missing names and labels as code, not as an audience", () => {
    for (const rule of ["image-alt", "button-name", "link-name", "label", "dialog-missing-name", "aria-hidden"]) {
      expect(keyOf(rule), rule).toBe("code");
    }
  });

  // A PDF is the exception: the fix is in the source document, and editing
  // the site will not help.
  it("sends PDF faults to the document rather than the code", () => {
    expect(keyOf("pdf-not-tagged")).toBe("document");
    expect(keyOf("pdf-no-title")).toBe("document");
  });

  it("files rendering measurements under what is on screen", () => {
    for (const rule of ["color-contrast", "typo-leading-tight", "mobile-tap-target", "motion-marquee"]) {
      expect(keyOf(rule), rule).toBe("screen");
    }
  });

  it("files wording and design choices as judgement calls", () => {
    for (const rule of ["dark-fake-urgency", "readability-dense-prose", "link-text-vague"]) {
      expect(keyOf(rule), rule).toBe("judgement");
    }
  });

  it("marks AI findings regardless of their rule id", () => {
    expect(methodForFinding(finding({ source: "ai-review", ruleId: "color-contrast" })).key).toBe("ai");
  });

  it("falls back to the code for anything unrecognised", () => {
    // Everything left is an axe rule read out of the DOM, so "in the code" is
    // the honest default rather than a guess.
    expect(keyOf("some-future-axe-rule")).toBe("code");
    expect(methodForFinding(finding({ ruleId: undefined })).key).toBe("code");
  });

  it("gives every method a label and a way to reproduce it", () => {
    for (const m of Object.values(METHODS)) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(m.hint.length).toBeGreaterThan(20);
    }
  });
});
