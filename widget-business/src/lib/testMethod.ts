import type { AccessibilityFinding } from "../api/scanClient";
import { t } from "./strings";

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
  readonly label: string;
  readonly hint: string;
}

// The label and hint are getters so they are translated when they are read,
// at render time, in whatever language the reader has switched to. A plain
// t() call here would run once, when this module loads, before the widget
// has set a language at all.
export const FIX_KINDS: Record<FixOwner, FixKind> = {
  code: {
    key: "code",
    get label() {
      return t("Code fix");
    },
    // "Markup or the stylesheet" is two pieces of jargon in one sentence, on
    // a report written for the person who owns the site rather than the one
    // who builds it. They do not need the names of the files.
    get hint() {
      return t("Whoever builds or maintains your site. Send them this card, which names the element to change and what is wrong with it.");
    },
  },
  content: {
    key: "content",
    get label() {
      return t("Content fix");
    },
    get hint() {
      return t("Whoever writes the words on this page. They change the wording in the editor you publish pages with, and no developer is needed.");
    },
  },
  design: {
    key: "design",
    get label() {
      return t("Design fix");
    },
    // Somebody does eventually change a stylesheet, and saying "code fix"
    // sends it to the wrong desk anyway: a developer handed "make these
    // targets bigger" has to invent a size, a colour or a spacing, which is
    // not their decision to make. The decision comes first and belongs to
    // whoever owns how the page looks.
    get hint() {
      return t("Your designer chooses the new size, colour or spacing. Whoever builds the site then puts that value into the stylesheet.");
    },
  },
  document: {
    key: "document",
    get label() {
      return t("Document fix");
    },
    get hint() {
      return t("Whoever made the PDF. They fix it in the original file (Word, InDesign, Acrobat) and upload a new export. Editing the web page will not change it.");
    },
  },
};

// Wording decisions. Everything not listed here or below is code, which is
// the honest default rather than a guess.
const CONTENT_RULES = new Set([
  "link-text-vague",
  "video-caption",
  "component-submit-clarity",
  "readability-dense-prose",
  // Naming an image, a link or a button is a wording decision. A developer
  // handed "describe the image" has to invent the description, which is
  // somebody else's call — same reasoning as link-text-vague above.
  "sr-filename-alt",
  "sr-vague-link-name",
  "sr-vague-button-name",
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

/**
 * The "Who fixes this" sentence for one rule, where the desk's own sentence
 * would be too general to act on.
 *
 * The four desk sentences above answer "which kind of person". Read on a
 * card about a vague link, "whoever writes the page" left the owner asking
 * who that is and what they should change; on a video it named the wrong
 * person outright, since captions are added where the video is hosted. So a
 * rule whose answer is narrower than its desk names the person and the
 * change. Everything not listed keeps its desk's sentence. English keys,
 * translated through t() at render time like the desk sentences.
 */
const LINK_WORDS =
  "Whoever writes the page. In your editor, they rewrite each link to say where it goes, such as ‘Opening hours’ instead of ‘Read more’.";
const VIDEO_CAPTIONS =
  "Whoever made the video, or runs the account it is on, such as YouTube or Vimeo. They add captions there, not in your site's code.";
const CONSENT_BANNER_SETTINGS =
  "Whoever runs your cookie banner, often in your consent tool's settings. They make refusing as easy to see and click as accepting.";
const PRESSURE_WARNING =
  "Whoever runs your offers and promotions. They remove the stock or time warning, or tie it to real stock and a real deadline.";
const FOCUS_OUTLINE =
  "Your designer draws the outline that shows where the keyboard is, with its colour and thickness. Whoever builds the site then adds it.";
const TARGET_SIZE =
  "Your designer makes these buttons and links bigger on phones, or puts more space between them. Whoever builds the site then applies it.";
const TYPE_SETTINGS =
  "Your designer sets the type: its size, weight, line spacing and line length. Whoever builds the site then changes the stylesheet to match.";
const MARKETING_DECISION =
  "Whoever decides your marketing and sales tactics. Taking out a pressure tactic is their decision, not the developer's.";

export const RULE_HINTS: Record<string, string> = {
  "link-text-vague": LINK_WORDS,
  "sr-vague-link-name": LINK_WORDS,
  "sr-vague-button-name":
    "Whoever writes the page picks words that say what the button does, such as ‘Book a table’. A developer then puts them on the button.",
  "sr-filename-alt":
    "Whoever adds images to the page. In your editor, they replace the file name in the image's alt text field with what the picture shows.",
  "video-caption": VIDEO_CAPTIONS,
  "media-video-captions": VIDEO_CAPTIONS,
  "media-embedded-player": VIDEO_CAPTIONS,
  "media-audio-transcript":
    "Whoever made the recording writes out what is said. Whoever writes the page then puts that text beside the audio.",
  "media-video-descriptions":
    "Whoever made the video. They add a spoken description of what is shown, or publish a text version of the whole video beside it.",
  "component-submit-clarity":
    "Whoever writes the form decides what its button promises, such as ‘Send my booking’. A developer then changes the button's label.",
  "readability-dense-prose":
    "Whoever writes the page. In your editor, they shorten long sentences and split long paragraphs, with no change to the code.",
  "dark-consent-no-reject":
    "Whoever runs your cookie banner, often in your consent tool's settings. They add a ‘Reject all’ button as plain as ‘Accept all’.",
  "dark-consent-asymmetry": CONSENT_BANNER_SETTINGS,
  "dark-preselected-optin":
    "Whoever owns the form or checkout. They untick the boxes that sign people up, so each visitor chooses for themselves.",
  "dark-confirmshaming":
    "Whoever writes your marketing copy. They word the way to decline plainly, such as ‘No thanks’, without guilt or mockery.",
  "dark-fake-scarcity": PRESSURE_WARNING,
  "dark-fake-urgency": PRESSURE_WARNING,
  "color-contrast":
    "Your designer picks a colour with more contrast against its background. Whoever builds the site then swaps it into the stylesheet.",
  "link-in-text-block":
    "Your designer decides how links stand out in a paragraph without relying on colour, such as an underline. Whoever builds the site then adds it.",
  "keyboard-faint-focus": FOCUS_OUTLINE,
  "keyboard-no-visible-focus": FOCUS_OUTLINE,
  "mobile-tap-target": TARGET_SIZE,
  "mobile-target-spacing": TARGET_SIZE,
  "mobile-sticky-coverage":
    "Your designer decides how much of a phone screen the fixed bar may cover. Whoever builds the site then makes it smaller.",
  "component-required-cue":
    "Your designer decides how required fields are marked, such as the word ‘required’ beside the label. Whoever builds the site then adds it.",
};

/** The "Who fixes this" sentence for a finding, in the reader's language:
 *  the rule's own where it has one, the desk's otherwise. A dark pattern
 *  with no rule of its own (the AI review writes those) names the people
 *  who decide marketing, for the reason fixKindForFinding gives. */
export function fixHint(finding: AccessibilityFinding): string {
  const id = finding.ruleId ?? "";
  if (RULE_HINTS[id]) return t(RULE_HINTS[id]);
  if (id.startsWith("typo-")) return t(TYPE_SETTINGS);
  if (finding.category === "dark-pattern") return t(MARKETING_DECISION);
  return fixKindForFinding(finding).hint;
}

/** Every rule-specific sentence, for the voice tests. */
export const ALL_RULE_HINTS: string[] = [...new Set([...Object.values(RULE_HINTS), TYPE_SETTINGS, MARKETING_DECISION])];

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
  "Our AI review wrote this, not a rule check, and it can be wrong while sounding sure. Look at the element yourself before changing anything.";

export const KEYBOARD_HINT =
  "You can confirm this one yourself in a few minutes, with nothing installed. Put the mouse aside and move through the page using Tab, Enter and Escape.";

// The two hints above, in the reader's language. The constants stay English
// because each one is also its own key in t(), and a constant cannot follow
// the language switcher: it is fixed when this module loads. Render these
// instead of the constants.
export function aiHint(): string {
  return t(AI_HINT);
}

export function keyboardHint(): string {
  return t(KEYBOARD_HINT);
}

export function isKeyboardCheck(finding: AccessibilityFinding): boolean {
  return KEYBOARD_CHECKS.has(finding.ruleId ?? "");
}
