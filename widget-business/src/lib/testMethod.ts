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

export type FixOwner = "code" | "content" | "design" | "document";

export interface FixKind {
  key: FixOwner;
  label: string;
  hint: string;
}

export const FIX_KINDS: Record<FixOwner, FixKind> = {
  code: {
    key: "code",
    label: "Code fix",
    // "Markup or the stylesheet" is two pieces of jargon in one sentence, on
    // a report written for the person who owns the site rather than the one
    // who builds it. They do not need the names of the files.
    hint: "This is a change in the site's own code. It goes to whoever builds or maintains the site for you.",
  },
  content: {
    key: "content",
    label: "Content fix",
    hint: "No code needs to change — this is a decision about wording. It belongs with whoever writes the page rather than with a developer.",
  },
  design: {
    key: "design",
    label: "Design fix",
    // Somebody does eventually change a stylesheet, and saying "code fix"
    // sends it to the wrong desk anyway: a developer handed "make these
    // targets bigger" has to invent a size, a colour or a spacing, which is
    // not their decision to make. The decision comes first and belongs to
    // whoever owns how the page looks.
    hint: "This is a decision about how the page looks: a size, a colour, a spacing. It belongs with whoever designs the site. Someone will change a stylesheet afterwards, but the choice comes first.",
  },
  document: {
    key: "document",
    label: "Document fix",
    hint: "The fault is inside the PDF, not the website. Fix it in the original file (Word, InDesign, Acrobat) and export again. Editing the site will not help.",
  },
};

// Wording decisions. Everything not listed here or below is code, which is
// the honest default rather than a guess.
const CONTENT_RULES = new Set([
  "link-text-vague",
  "video-caption",
  "component-submit-clarity",
  "readability-dense-prose",
]);

// media- joins dark- here because captioning a video is not a code change.
// It is done by whoever made the recording, or in the account of whichever
// site hosts it — a developer handed "add captions" has nothing to edit.
const CONTENT_PREFIXES = ["dark-", "media-"];

// interaction- is the opposite case to media-: what a page listens for, and
// what it does when the event fires, is decided in code and nowhere else.
// It falls to the code default below, which is stated here because the
// prefix sits next to one that deliberately does not.

// Decisions about how the page looks: a size, a colour, a spacing, a weight.
// These do end in a stylesheet, and that is not the useful thing to say about
// them — a developer given "make the tap targets bigger" has to pick a size,
// which is somebody else's decision. Reported as a design fix so it reaches
// that person first.
//
// The typography notes are all of this kind, and every one of them carried a
// "Code fix" mark while sitting under a heading that called them notes on the
// design.
const DESIGN_RULES = new Set([
  "mobile-tap-target",
  "mobile-target-spacing",
  "mobile-sticky-coverage",
  "link-in-text-block",
  "color-contrast",
  "keyboard-faint-focus",
  "keyboard-no-visible-focus",
  "component-required-cue",
]);

const DESIGN_PREFIXES = ["typo-"];

/**
 * Which desk a rule belongs to, from its id alone.
 *
 * Split out from fixKindForFinding for the undecided checks, which are rolled
 * up per rule and never become findings — they still have to say who acts on
 * them, and the answer is the same one the findings use.
 */
export function fixKindForRule(ruleId: string | undefined): FixKind {
  const id = ruleId ?? "";
  if (id.startsWith("pdf-")) return FIX_KINDS.document;
  if (CONTENT_RULES.has(id) || CONTENT_PREFIXES.some((p) => id.startsWith(p))) {
    return FIX_KINDS.content;
  }
  if (DESIGN_RULES.has(id) || DESIGN_PREFIXES.some((p) => id.startsWith(p))) {
    return FIX_KINDS.design;
  }
  return FIX_KINDS.code;
}

export function fixKindForFinding(finding: AccessibilityFinding): FixKind {
  // Category before rule id. A dark pattern is a marketing decision whatever
  // produced the finding, and routing by rule id alone sent two kinds of them
  // to a developer: AI-written ones, which carry no rule id at all and fell
  // through to the "code" default, and any deterministic rule not spelled
  // with the dark- prefix. Reported on a countdown-pressure card wearing
  // "Code fix" — a ticking timer that resets on reload is a marketing trick,
  // and removing it is not a developer's call to make.
  if (finding.category === "dark-pattern") return FIX_KINDS.content;
  return fixKindForRule(finding.ruleId);
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

/**
 * Whether a model wrote this finding rather than a rule.
 *
 * Kept as its own mark, next to the keyboard one, because it answers the same
 * kind of question: how much to trust it before acting. The AI pass reads a
 * page the way a person might and catches things no rule can express, and it
 * is also the only part of this report that can be confidently wrong.
 *
 * It had a marker until the badge was split in two, and then lost it — the
 * fix-kind badge asks who does the work, and for an AI finding the answer is
 * usually "a developer", which is true and says nothing about where it came
 * from. Provenance and workload are different questions, as that split was
 * supposed to establish.
 */
export function isAiFinding(finding: AccessibilityFinding): boolean {
  return finding.source === "ai-review";
}

export const AI_HINT =
  "Raised by the AI review, which reads the page the way a person might rather than checking a rule. It catches things no rule can express. It is also the one part of this report that can be confidently wrong. Take a second look before acting.";

export const KEYBOARD_HINT =
  "You can confirm this one yourself in a few minutes, with nothing installed. Put the mouse aside and move through the page using Tab, Enter and Escape.";

export function isKeyboardCheck(finding: AccessibilityFinding): boolean {
  return KEYBOARD_CHECKS.has(finding.ruleId ?? "");
}
