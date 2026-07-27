import type { AccessibilityFinding } from "../api/scanClient";

// How each finding was found — and, more usefully, how the owner could find
// it again themselves.
//
// The frame is the testing pyramid from Greg Gibson's keyboard-only method
// (Red Hat), which this checker's keyboard layer is built on: a keyboard pass
// first, because it needs no tools and catches the things that stop people
// dead; then a screen reader; then automated code checks; with judgement
// calls last. A report that mixes all of those into one list reads as one
// undifferentiated pile of work, and hides the fact that a third of it can be
// verified in five minutes with no software at all.
//
// This is deliberately about *method*, not about severity or category, both
// of which the report already shows. "Unplug your mouse and press Tab" is a
// different kind of instruction from "ask a developer to look at the markup",
// and grouping by it tells an owner who needs to do what.

export type MethodKey = "keyboard" | "code" | "document" | "screen" | "judgement" | "ai";

export interface TestMethod {
  key: MethodKey;
  /** Badge text. Short — it sits beside the conformance level. */
  label: string;
  /** How to reproduce it, in one line. */
  hint: string;
}

export const METHODS: Record<MethodKey, TestMethod> = {
  keyboard: {
    key: "keyboard",
    label: "Keyboard test",
    hint: "Found by putting the mouse aside and moving through the page with Tab, Enter and Escape. You can repeat this yourself in a few minutes, with nothing installed.",
  },
  code: {
    key: "code",
    label: "In the code",
    hint: "Nothing looks wrong on screen — the fault is in the markup, and the fix is an attribute or a tag. This one goes to whoever maintains the site.",
  },
  document: {
    key: "document",
    label: "In the document",
    hint: "The fault is inside the PDF rather than on the website. Fix it in the original — Word, InDesign, Acrobat — and export again; editing the site will not help.",
  },
  screen: {
    key: "screen",
    label: "Measured on screen",
    hint: "Measured from the page as it renders — colours, sizes, spacing, movement. Reproduce it by looking, or by resizing the window.",
  },
  judgement: {
    key: "judgement",
    label: "Judgement call",
    hint: "Not a pass-or-fail rule. Somebody has to decide whether the wording or the design is doing right by the reader.",
  },
  ai: {
    key: "ai",
    label: "AI review",
    hint: "Raised by the AI review pass, which reads the page the way a person might. Worth a second opinion before acting on it.",
  },
};

// Exact rule ids first, because several layers emit rules that belong to a
// different method than their prefix suggests: the dialog layer produces both
// keyboard findings — Escape, focus — and markup ones, like a dialog with no
// name, where there is nothing to press and only an attribute to add.
const BY_RULE: Record<string, MethodKey> = {
  // The keyboard-only checklist, item by item.
  "keyboard-focus-trap": "keyboard",
  "keyboard-mouse-only": "keyboard",
  "keyboard-no-visible-focus": "keyboard",
  "keyboard-faint-focus": "keyboard",
  "dialog-keyboard-trap": "keyboard",
  "dialog-no-escape": "keyboard",
  "dialog-focus-not-moved": "keyboard",
  "dialog-focus-lost-on-close": "keyboard",
  "reading-order-mismatch": "keyboard",
  "forced-colors-focus-lost": "keyboard",

  // A "Screen reader" method used to sit here, holding everything about what
  // gets announced: missing names, alt text, labels, roles. It was removed
  // because it answered the wrong question. This badge exists to tell an
  // owner who picks the work up, and every rule in that group was fixed by
  // editing markup — aria-label, alt, <label>, lang. Naming the affected
  // audience instead of the work put "Screen reader" on findings whose own
  // instruction was to add an attribute, which read as a contradiction and
  // was reported as one three times over.
  //
  // Who is affected has not been lost; it is what the impact paragraph of
  // every one of these findings is for.
  "dialog-missing-name": "code",
  "dialog-missing-role": "code",
  "dialog-close-unlabeled": "code",
  "component-nav-labels": "code",
  "image-alt": "code",
  "button-name": "code",
  "link-name": "code",
  label: "code",
  "empty-heading": "code",
  "frame-title": "code",
  "document-title": "code",
  "html-has-lang": "code",

  // Structural markup: nothing looks or sounds wrong element by element, and
  // the fault is only visible by reading the code.
  //
  // A missing skip link belongs here rather than with the keyboard tests, and
  // the line is worth stating: a keyboard pass can find a thing that behaves
  // wrongly, but not a thing that was never built. There is nothing to tab to
  // and nothing to observe — you notice its absence by reading the markup.
  // Reading order stays a keyboard finding by the same rule: the controls are
  // there, and tabbing them shows the order is wrong.
  "component-skip-link": "code",
  "heading-order": "code",
  listitem: "code",
  list: "code",
  "landmark-one-main": "code",
  "landmark-unique": "code",
  "landmark-complementary-is-top-level": "code",
  "landmark-no-duplicate-banner": "code",
  "landmark-no-duplicate-contentinfo": "code",
  region: "code",
  "duplicate-id": "code",
  bypass: "code",

  // Visible without any tooling.
  "color-contrast": "screen",
  "forced-colors-icon-lost": "screen",
  "dialog-no-close": "screen",

  // Wording and design.
  "link-text-vague": "judgement",
  "component-submit-clarity": "judgement",
  "component-required-cue": "judgement",
  "readability-dense-prose": "judgement",
};

// Prefixes, checked after the exact table above.
const BY_PREFIX: Array<[string, MethodKey]> = [
  ["keyboard-", "keyboard"],
  ["dialog-", "code"],
  ["aria-", "code"],
  ["pdf-", "document"],
  ["typo-", "screen"],
  ["motion-", "screen"],
  ["mobile-", "screen"],
  ["text-zoom-", "screen"],
  ["text-spacing-", "screen"],
  ["forced-colors-", "screen"],
  ["dark-", "judgement"],
  ["component-", "code"],
  ["markup-", "code"],
  ["html-validate", "code"],
];

export function methodForFinding(finding: AccessibilityFinding): TestMethod {
  if (finding.source === "ai-review") return METHODS.ai;
  const id = finding.ruleId ?? "";
  const exact = BY_RULE[id];
  if (exact) return METHODS[exact];
  for (const [prefix, key] of BY_PREFIX) {
    if (id.startsWith(prefix)) return METHODS[key];
  }
  // Everything left is an axe rule about the markup. That is the honest
  // default: axe reads the DOM, so anything it raises that is not in the
  // tables above is a code-level fault.
  return METHODS.code;
}
