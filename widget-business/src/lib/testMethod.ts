import type { AccessibilityFinding } from "../api/scanClient";

// Two questions about a finding, answered separately because they are
// separate questions — and trying to answer both with one badge is what kept
// putting the wrong word on the card.
//
//   1. Who picks this up, and where is the change made?
//   2. Is this one of the things the owner could check themselves?
//
// An earlier version had a single "method" badge carrying both, with values
// like "Screen reader" and "Keyboard test". It read as a contradiction on any
// finding whose own instruction was to add an attribute: a dialog with no
// name is fixed in the markup, whoever suffers when it is missing. Four
// findings in a row were reported for being labelled wrongly, and the fault
// was the single axis rather than the four rules on it.
//
// So the badge now answers the first question, where nearly every answer is
// "code" — this tool reads markup and stylesheets, so almost everything it
// can see is fixed in one or the other. What is *not* fixed in code is worth
// naming precisely, because sending a copywriting problem to a developer
// wastes both of them. The keyboard mark answers the second question on its
// own, alongside.

export type FixOwner = "code" | "content" | "document";

export interface FixKind {
  key: FixOwner;
  label: string;
  hint: string;
}

export const FIX_KINDS: Record<FixOwner, FixKind> = {
  code: {
    key: "code",
    label: "Code fix",
    hint: "Changed in the markup or the stylesheet. This one goes to whoever maintains the site.",
  },
  content: {
    key: "content",
    label: "Content fix",
    hint: "No code needs to change — this is a decision about wording or design. It belongs with whoever writes and designs the page rather than with a developer.",
  },
  document: {
    key: "document",
    label: "Document fix",
    hint: "The fault is inside the PDF, not the website. Fix it in the original — Word, InDesign, Acrobat — and export again; editing the site will not help.",
  },
};

// Wording and design decisions. Everything not listed here is code, which is
// the honest default rather than a guess.
const CONTENT_RULES = new Set([
  "link-text-vague",
  "component-submit-clarity",
  "readability-dense-prose",
]);

const CONTENT_PREFIXES = ["dark-"];

export function fixKindForFinding(finding: AccessibilityFinding): FixKind {
  const id = finding.ruleId ?? "";
  if (id.startsWith("pdf-")) return FIX_KINDS.document;
  if (CONTENT_RULES.has(id) || CONTENT_PREFIXES.some((p) => id.startsWith(p))) {
    return FIX_KINDS.content;
  }
  return FIX_KINDS.code;
}

/**
 * Whether a keyboard-only pass would find this.
 *
 * Kept as its own mark rather than folded into the badge above, because it
 * answers the other question: not who fixes it — these are code fixes like
 * most of the report — but whether the owner can confirm it themselves, right
 * now, by putting the mouse aside. That group is the first tier of the
 * testing pyramid this checker's keyboard layer is built on, and it is the
 * only part of the report that needs no tools and nobody else to verify.
 *
 * A missing skip link is deliberately not here. A keyboard pass can find a
 * thing that behaves wrongly, but not a thing that was never built: there is
 * nothing to tab to. Reading order stays, by the same test — the controls are
 * there, and tabbing them shows the order is wrong.
 */
const KEYBOARD_CHECKS = new Set([
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
]);

export const KEYBOARD_HINT =
  "You can confirm this one yourself in a few minutes, with nothing installed: put the mouse aside and move through the page using Tab, Enter and Escape.";

export function isKeyboardCheck(finding: AccessibilityFinding): boolean {
  return KEYBOARD_CHECKS.has(finding.ruleId ?? "");
}
