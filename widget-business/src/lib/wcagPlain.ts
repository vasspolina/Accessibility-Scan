// The one place in this package that translates raw WCAG data into plain
// language — kept out of components so the reframing logic stays testable
// and in one spot. Grounded in https://www.w3.org/WAI/standards-guidelines/wcag/

export type Principle = "Perceivable" | "Operable" | "Understandable" | "Robust";

interface PrincipleInfo {
  principle: Principle;
  plainDescription: string;
}

// WCAG Success Criterion numbers always start with the principle number
// (1.x.x, 2.x.x, 3.x.x, 4.x.x) — true whether the string is a bare code
// like "1.1.1" (automated findings) or "1.1.1 Non-text Content (A)" (AI
// findings, which are asked to include the criterion name).
const PRINCIPLES: Record<string, PrincipleInfo> = {
  "1": { principle: "Perceivable", plainDescription: "Can people see or hear this content?" },
  "2": {
    principle: "Operable",
    plainDescription: "Can people navigate and interact with this using a keyboard, mouse, or assistive device?",
  },
  "3": { principle: "Understandable", plainDescription: "Is the content and behavior clear and predictable?" },
  "4": {
    principle: "Robust",
    plainDescription: "Will this keep working across browsers, devices, and assistive technology?",
  },
};

// Returns undefined for "N/A", "WCAG (see rule help)" (axe's best-practice
// fallback label), or a missing criterion — callers should bucket these
// separately rather than dropping them.
export function classifyWcag(wcagCriterion: string | undefined): PrincipleInfo | undefined {
  const match = wcagCriterion?.match(/^([1-4])\./);
  return match ? PRINCIPLES[match[1]] : undefined;
}

export const LEVEL_FRAMING: Record<"A" | "AA" | "AAA", string> = {
  A: "Basic requirement (Level A)",
  AA: "Required by law in most places (Level AA)",
  AAA: "Advanced (Level AAA)",
};

// Plain-English rewrites of the most common automated (axe-core) rules,
// keyed by the axe rule id on each finding. `plain` says what's actually
// wrong in words a non-technical owner understands; `impact` says who it
// hurts and why it costs the business. axe's own `description`/`help` text
// ("Elements must meet minimum color contrast ratio thresholds") is written
// for developers — this is the layer that makes a report readable by the
// person who owns the site. Anything not in this map falls back to the
// finding's original description, so coverage gaps degrade gracefully.
export interface PlainRule {
  plain: string;
  impact: string;
}

export const PLAIN_RULE_EXPLANATIONS: Record<string, PlainRule> = {
  "color-contrast": {
    plain: "Some text is too light against its background to read easily.",
    impact:
      "Anyone in bright light, on a cheap screen, or with less-than-perfect eyesight struggles to read it — so your message doesn't land.",
  },
  "image-alt": {
    plain: "Some images have no text description behind them.",
    impact:
      "People using screen readers hear nothing for these images, and search engines can't tell what they show — costing you both accessibility and SEO.",
  },
  "input-image-alt": {
    plain: "An image used as a button has no text description.",
    impact: "People using screen readers can't tell what the button does, so they can't complete the action.",
  },
  "link-name": {
    plain: "Some links have no readable text.",
    impact:
      "People using screen readers just hear \"link\" with no idea where it goes, so they can't navigate your site.",
  },
  "button-name": {
    plain: "Some buttons have no label.",
    impact: "People can't tell what the button does before clicking it — a common reason users abandon a task.",
  },
  label: {
    plain: "Some form fields have no label.",
    impact:
      "People using screen readers don't know what to type in each box, so forms — including checkout and contact forms — get abandoned.",
  },
  "select-name": {
    plain: "A dropdown menu has no label.",
    impact: "People can't tell what they're choosing, which leads to errors and dropped forms.",
  },
  "document-title": {
    plain: "Your page has no title.",
    impact: "Browser tabs, bookmarks, and search results show nothing useful — hurting both usability and SEO.",
  },
  "html-has-lang": {
    plain: "Your page doesn't say what language it's written in.",
    impact: "Screen readers may read your content with the wrong accent and pronunciation, making it hard to follow.",
  },
  "html-lang-valid": {
    plain: "Your page's declared language isn't a valid value.",
    impact: "Screen readers can't pick the right voice, so your content may be read out incorrectly.",
  },
  "heading-order": {
    plain: "Your headings jump levels instead of going in order.",
    impact: "People who navigate by headings (common with screen readers) lose track of how the page is organized.",
  },
  "page-has-heading-one": {
    plain: "Your page has no main heading.",
    impact: "Visitors and screen readers can't quickly tell what the page is about.",
  },
  "empty-heading": {
    plain: "A heading on the page is empty.",
    impact: "People navigating by headings hit a blank signpost that tells them nothing.",
  },
  "link-in-text-block": {
    plain: "Some links are shown only by color, with nothing else to set them apart.",
    impact: "People who can't distinguish those colors can't tell what's a link and what's plain text.",
  },
  "meta-viewport": {
    plain: "Your page stops people from zooming in.",
    impact: "Anyone who needs bigger text can't enlarge it, so they simply can't read your site on a phone.",
  },
  "frame-title": {
    plain: "An embedded frame (like a map or video) has no title.",
    impact: "People using screen readers can't tell what the embedded content is or whether it's worth exploring.",
  },
  "duplicate-id-active": {
    plain: "Two interactive elements share the same internal ID.",
    impact: "This can break assistive technology and interactive features, causing the wrong thing to respond.",
  },
  list: {
    plain: "A list isn't built as a proper list.",
    impact: "Screen readers can't announce how many items there are or let people jump through them.",
  },
  listitem: {
    plain: "A list item sits outside any real list.",
    impact: "Screen readers lose the list structure, so grouped content stops making sense.",
  },
  "aria-required-attr": {
    plain: "An interactive component is missing information assistive tech needs.",
    impact: "Screen reader users may not know the control's state or how to use it.",
  },
  "aria-hidden-focus": {
    plain: "Something hidden from screen readers can still be tabbed into.",
    impact: "Keyboard users land on an element that reads as invisible, which is confusing and feels broken.",
  },
  region: {
    plain: "Parts of your page aren't inside labelled sections.",
    impact: "People using screen readers can't jump between the main areas of the page, so they must wade through everything.",
  },
  "landmark-one-main": {
    plain: "Your page doesn't mark where its main content begins.",
    impact: "Screen reader users can't skip straight to the content and have to sit through the menus every time.",
  },
  tabindex: {
    plain: "The keyboard focus order has been forced out of its natural sequence.",
    impact: "Keyboard users get bounced around the page unpredictably, making it hard to fill in or navigate.",
  },
  "scrollable-region-focusable": {
    plain: "A scrollable area can't be reached with the keyboard.",
    impact: "People who don't use a mouse can't scroll to see the content inside it.",
  },

  // Keyboard walk-through checks (WCAG 2.4.7 Focus Visible, 2.1.2 No
  // Keyboard Trap) — from real Tab presses during the scan.
  "keyboard-no-visible-focus": {
    plain: "Moving through the page with the keyboard gives no visible sign of where you are.",
    impact:
      "Many people navigate entirely by keyboard — power users, people with motor disabilities, anyone whose mouse died. Without a visible highlight they are navigating blind and give up.",
  },
  "keyboard-focus-trap": {
    plain: "Keyboard focus gets stuck in one spot — you can't Tab past it.",
    impact:
      "A keyboard user who hits this point literally cannot reach the rest of your page. This is one of the most severe accessibility failures a site can have.",
  },

  // Raw-HTML markup validation.
  "markup-validation": {
    plain: "The page's underlying HTML code contains errors.",
    impact:
      "Browsers silently guess how to repair broken markup — and screen readers, search engines, and different browsers can all guess differently, so your page may not work the way you think it does.",
  },

  // Motion/animation checks (WCAG 2.2.2 Pause, Stop, Hide).
  "motion-marquee": {
    plain: "Text scrolls across the page in a moving ticker that can't be paused.",
    impact:
      "Moving text is hard to read for everyone, and for people with attention or vestibular (balance) disabilities it can make the page unusable.",
  },
  "motion-autoplay-media": {
    plain: "A video or audio starts playing by itself, with no controls to stop it.",
    impact:
      "Visitors can't stop the motion or sound — it's disorienting, drowns out screen readers, and is a common reason people leave a site immediately.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "Something on the page animates non-stop, even for visitors who asked their device for less motion.",
    impact:
      "Perpetual movement pulls attention away from your content, and for people with vestibular disorders it can cause dizziness or nausea.",
  },

  // Micro-typography checks, grounded in Jost Hochuli's "Detail in
  // Typography" (Hyphen Press) — reported as design-clarity notes.
  "typo-caps-letterspacing": {
    plain: "Text in ALL CAPITALS is set without extra letter spacing.",
    impact:
      "Capital letters form uniform blocks; without a little extra space between them, headings and labels become hard to scan.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Paragraph text has extra space forced between its letters.",
    impact:
      "Spacing out lowercase letters breaks up the word shapes people recognize when reading, slowing everyone down.",
  },
  "typo-negative-letterspacing": {
    plain: "Letters are squeezed so close together they can touch.",
    impact: "Cramped letters blur into one another — especially at small sizes or for readers with low vision.",
  },
  "typo-line-length-long": {
    plain: "Lines of text run too long across the page.",
    impact:
      "Past about 75 characters per line, the eye struggles to find the start of the next line — readers lose their place and give up sooner.",
  },
  "typo-line-length-short": {
    plain: "Text is squeezed into very short, choppy lines.",
    impact: "When almost every phrase breaks onto a new line, reading rhythm falls apart and content feels harder than it is.",
  },
  "typo-leading-tight": {
    plain: "Lines of text sit too close together.",
    impact: "Dense line spacing makes it easy to reread or skip lines — tiring for everyone, a real barrier for dyslexic readers.",
  },
  "typo-justified-no-hyphens": {
    plain: "Text is stretched edge-to-edge (justified) without hyphenation.",
    impact:
      "Justifying stretches the spaces between words to fill each line, creating uneven gaps and distracting \"rivers\" of white space running down the text.",
  },
  "typo-font-size-small": {
    plain: "Body text is set very small.",
    impact: "Small text pushes away anyone reading on a phone, in poor light, or with less-than-perfect eyesight.",
  },
  "typo-typeface-count": {
    plain: "The page mixes many different typefaces.",
    impact: "More than two or three typefaces reads as visual noise and makes the page feel less trustworthy.",
  },
};

export function plainForRule(ruleId: string | undefined): PlainRule | undefined {
  return ruleId ? PLAIN_RULE_EXPLANATIONS[ruleId] : undefined;
}

export const WCAG_LINK = "https://www.w3.org/WAI/standards-guidelines/wcag/";

export const PRINCIPLE_ORDER: Principle[] = ["Perceivable", "Operable", "Understandable", "Robust"];
