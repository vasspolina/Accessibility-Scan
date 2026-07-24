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

  // Component design suggestions (forms, menus) — from the ARIA Authoring
  // Practices. Framed as "here's a better way to build this."
  "component-form-autocomplete": {
    plain: "Your form fields don't let browsers autofill personal details.",
    impact:
      "Without autocomplete, every visitor retypes their name, email, and address by hand — slow for everyone, and a real barrier for people with motor or memory difficulties.",
  },
  "component-input-type": {
    plain: "Email and phone fields use a plain text box instead of the proper input type.",
    impact:
      "On phones, visitors get the generic keyboard instead of one with \"@\" or a number pad — more taps, more mistakes, more abandoned forms.",
  },
  "component-required-cue": {
    plain: "Required fields are marked only in the code, not visibly in the label.",
    impact:
      "People don't learn a field was mandatory until the form rejects them — a frustrating loop that makes sign-ups and checkouts fail.",
  },
  "component-submit-clarity": {
    plain: "The form has no clearly-labelled submit button.",
    impact:
      "A button that just says \"Go\", shows only an icon, or is missing entirely leaves people unsure how to finish — so they don't.",
  },
  "component-nav-labels": {
    plain: "Your page has several menus, but they aren't individually labelled.",
    impact:
      "Screen-reader users hear \"navigation… navigation…\" with no way to tell the main menu from footer links, so getting around your site is guesswork.",
  },
  "component-skip-link": {
    plain: "There's no \"skip to main content\" link.",
    impact:
      "Keyboard and screen-reader users must tab through your whole menu on every page before reaching the content — dozens of extra key presses each visit.",
  },

  // Mobile-only issues from the phone-width render pass.
  "mobile-horizontal-scroll": {
    plain: "On a phone, your page scrolls sideways.",
    impact:
      "Most of your visitors are on phones. If they have to swipe left and right to read each line — or content spills off the edge — many just leave.",
  },
  "mobile-tap-target": {
    plain: "Some buttons or links are too small to tap reliably on a phone.",
    impact:
      "Tiny tap targets cause mis-taps and frustration, especially for people with larger fingers, tremors, or limited dexterity — and they cost you conversions.",
  },

  // Text resizing — WCAG 1.4.4 / 1.4.12, measured by actually applying the
  // reader's overrides and looking at what breaks.
  "text-spacing-clipped": {
    plain: "Text gets cut off when a reader increases spacing.",
    impact:
      "Many people with dyslexia widen line and letter spacing to read at all. On your page the words don't reflow — they disappear behind a fixed-size box, so the content is simply lost.",
  },
  "text-zoom-clipped": {
    plain: "Text gets cut off at larger font sizes.",
    impact:
      "Turning up the browser's font size is the most common adjustment people with low vision make — far more common than any screen reader. Here the container stays put while the words grow, so part of your content is hidden.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Enlarging text makes the page scroll sideways.",
    impact:
      "Readers who enlarge text have to drag left and right on every single line. It's exhausting, and most people give up rather than persist.",
  },

  // Dark patterns — manipulative marketing/UX. These don't affect the
  // accessibility score; they're trust and (for consent) legal red flags.
  "dark-consent-no-reject": {
    plain: "Your cookie banner lets people accept, but not refuse.",
    impact:
      "Under GDPR and UK PECR, refusing has to be as easy as accepting — consent collected this way can be invalid, and visitors read a missing \"Reject\" button as a trick.",
  },
  "dark-consent-asymmetry": {
    plain: "Your cookie banner pushes \"accept\" and plays down \"reject\".",
    impact:
      "Styling one choice as a solid button and the other as plain text nudges people into agreeing without really choosing — a recognised pattern regulators look for.",
  },
  "dark-preselected-optin": {
    plain: "A marketing opt-in is ticked before the visitor chooses.",
    impact:
      "Pre-ticked consent boxes are explicitly invalid under GDPR. People who don't spot them feel signed up without agreeing, which drives spam complaints and unsubscribes.",
  },
  "dark-confirmshaming": {
    plain: "The \"no thanks\" option is worded to make people feel bad.",
    impact:
      "Guilt-tripping visitors for declining ('No thanks, I don't want to save money') is memorable for the wrong reasons — it reads as manipulative and damages trust in your brand.",
  },
  "dark-fake-scarcity": {
    plain: "The page claims limited stock or high demand — worth verifying.",
    impact:
      "If the numbers aren't real, this is a deceptive practice regulators actively pursue. Shoppers have also learned to distrust these claims, so fake ones cost more sales than they win.",
  },
  "dark-fake-urgency": {
    plain: "The page applies time pressure — worth verifying it's real.",
    impact:
      "Countdowns that reset on reload, or deadlines that never arrive, are a deceptive practice. When visitors notice, it undermines confidence in everything else you claim.",
  },

  // Modal / pop-up dialogs — ARIA dialog pattern.
  "dialog-close-unlabeled": {
    plain: "A pop-up's close button is just an \"×\" with no readable label.",
    impact:
      "Screen-reader users hear only \"button\" and can't tell how to close the pop-up — it traps them, and many will simply leave your site.",
  },
  "dialog-no-close": {
    plain: "A pop-up appears to have no obvious close button.",
    impact:
      "If it can only be dismissed by clicking outside, keyboard and screen-reader users can get stuck behind it with no way forward.",
  },
  "dialog-missing-role": {
    plain: "A pop-up overlay isn't marked up as a dialog.",
    impact:
      "Assistive tech doesn't announce that the pop-up opened, doesn't keep focus inside it, and lets people tab off into the hidden page behind it.",
  },
  "dialog-missing-name": {
    plain: "A pop-up dialog has no name describing what it's for.",
    impact:
      "When it opens, a screen reader just says \"dialog\" — the visitor has no idea what it's asking or why.",
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

  // Readability / neurodiversity checks — grounded in GOV.UK's accessibility
  // dos-and-don'ts and the Neurodiversity Design System (dyslexia, ADHD).
  "typo-underline-nonlink": {
    plain: "Some text that isn't a link is underlined.",
    impact:
      "Underlines read as links, so people click text that goes nowhere — and the line cutting through the letters slows readers with dyslexia.",
  },
  "typo-italic-body": {
    plain: "Whole passages are set in italics.",
    impact:
      "Slanted, distorted letters are markedly harder to read over more than a few words — a real barrier for people with dyslexia or low vision.",
  },
  "typo-allcaps-block": {
    plain: "A long passage is set in ALL CAPITALS.",
    impact:
      "Capitals strip out the word shapes people read by, so long all-caps text is slow and tiring — hardest of all for dyslexic readers.",
  },
  "typo-thin-weight": {
    plain: "Body text is set in a very thin (hairline) weight.",
    impact:
      "Thin strokes fade out on cheaper screens, in bright sunlight, and for readers with low vision — even when the colour contrast technically passes.",
  },
};

export function plainForRule(ruleId: string | undefined): PlainRule | undefined {
  return ruleId ? PLAIN_RULE_EXPLANATIONS[ruleId] : undefined;
}

// One clean, plain-English "what to do" per automated (axe) rule. axe's own
// failureSummary ("Fix all of the following: Element is in tab order and does
// not have accessible text Fix any of the following: …") is dense developer
// jargon repeated per element — this replaces it with a single instruction
// for the whole group. Our own deterministic layers (keyboard/component/
// dialog/typography/motion) already write plain fixes, so they aren't here
// and fall back to their own suggestedFix.
const PLAIN_RULE_FIXES: Record<string, string> = {
  "color-contrast":
    "Darken the text or lighten its background until they contrast strongly — aim for a 4.5:1 ratio for normal text, 3:1 for large text.",
  "image-alt":
    'Add an alt attribute to each image describing what it shows. Use empty alt (alt="") only for purely decorative images.',
  "input-image-alt": 'Add an alt attribute to the image button describing its action (e.g. alt="Search").',
  "link-name":
    "Give each link readable text — visible text inside the link, or an aria-label describing where it goes.",
  "button-name":
    "Give each button a clear label — visible text inside it, or an aria-label describing what it does.",
  label: "Connect a visible <label> to each field (the label's for matches the field's id), or add an aria-label.",
  "select-name": "Add a <label> tied to the dropdown, or an aria-label describing what it selects.",
  "document-title": "Add a <title> in the page's <head> that describes the page.",
  "html-has-lang": 'Add a lang attribute to the <html> tag (e.g. <html lang="en">).',
  "html-lang-valid": 'Set the <html> lang attribute to a valid language code (e.g. "en", "de", "fr").',
  "heading-order": "Use headings in order without skipping levels — don't jump from <h2> straight to <h4>.",
  "page-has-heading-one": "Add one <h1> near the top that states what the page is about.",
  "empty-heading": "Put text in the heading, or remove the empty heading tag.",
  "link-in-text-block": "Give in-text links a second visual cue besides colour — usually an underline.",
  "meta-viewport": "Remove user-scalable=no and any maximum-scale limit from the viewport meta tag so people can zoom.",
  "frame-title": 'Add a title attribute to each <iframe> describing its content (e.g. title="Location map").',
  "duplicate-id-active": "Make every id on the page unique — no two elements should share the same id.",
  list: "Wrap the items in a proper <ul> or <ol>, with only <li> as direct children.",
  listitem: "Put each <li> inside a <ul> or <ol> parent.",
  "aria-required-attr": "Add the ARIA attributes this component's role requires — see the Learn more link for the exact set.",
  "aria-hidden-focus":
    'Remove aria-hidden from focusable elements, or make them unfocusable (tabindex="-1") so hidden content can\'t be tabbed to.',
  region: "Wrap page content in landmark regions — <header>, <nav>, <main>, <footer> — so nothing sits outside a labelled area.",
  "landmark-one-main": "Wrap the primary content of the page in a single <main> element.",
  tabindex: 'Remove positive tabindex values (tabindex="1" or higher) and let the natural page order set focus order.',
  "scrollable-region-focusable": 'Add tabindex="0" to the scrollable container so keyboard users can scroll it.',
};

export function plainFixForRule(ruleId: string | undefined): string | undefined {
  return ruleId ? PLAIN_RULE_FIXES[ruleId] : undefined;
}

export const WCAG_LINK = "https://www.w3.org/WAI/standards-guidelines/wcag/";

export const PRINCIPLE_ORDER: Principle[] = ["Perceivable", "Operable", "Understandable", "Robust"];
