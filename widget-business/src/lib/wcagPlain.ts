// The one place in this package that translates raw WCAG data into plain
// language — kept out of components so the reframing logic stays testable
// and in one spot. Grounded in https://www.w3.org/WAI/standards-guidelines/wcag/

export type Principle = "Perceivable" | "Operable" | "Understandable" | "Robust";

interface PrincipleInfo {
  principle: Principle;
  // The heading a reader actually sees. "Perceivable" is the standard's own
  // word and means nothing to someone who hasn't read it, so the plain
  // question leads and the formal term follows in smaller type.
  plainTitle: string;
  plainDescription: string;
}

// WCAG Success Criterion numbers always start with the principle number
// (1.x.x, 2.x.x, 3.x.x, 4.x.x) — true whether the string is a bare code
// like "1.1.1" (automated findings) or "1.1.1 Non-text Content (A)" (AI
// findings, which are asked to include the criterion name).
const PRINCIPLES: Record<string, PrincipleInfo> = {
  "1": {
    principle: "Perceivable",
    plainTitle: "Can people see and hear it?",
    plainDescription:
      "Anything people can't see or hear. Text too faint to read, images with nothing written about them, video with no captions.",
  },
  "2": {
    principle: "Operable",
    plainTitle: "Can people use it?",
    plainDescription:
      "Whether someone can actually get through your site. With a keyboard instead of a mouse, on a phone, or without fine control of their hands.",
  },
  "3": {
    principle: "Understandable",
    plainTitle: "Can people follow it?",
    plainDescription:
      "Whether your wording and layout make sense, and whether the site behaves the way people expect it to.",
  },
  "4": {
    principle: "Robust",
    plainTitle: "Will it keep working?",
    plainDescription:
      "Whether your site still works properly in other browsers, on other devices, and with the software blind visitors use to read it aloud.",
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
  "aria-allowed-role": {
    plain: "Parts of the page are labelled in the code as something they cannot be.",
    impact:
      "Screen readers announce the wrong thing, so people are told they have reached a button when it is a link, or a heading when it is a list.",
  },
  "aria-allowed-attr": {
    plain: "An element carries code settings that do not belong on it.",
    impact: "Screen readers can announce nonsense, or skip the element entirely.",
  },
  "aria-required-children": {
    plain: "A menu or list is missing the parts it needs to work.",
    impact: "Screen readers cannot work out its structure, so people cannot navigate it.",
  },
  "landmark-unique": {
    plain: "Two areas of the page share the same name.",
    impact: "People using screen readers get a list of identical entries and cannot tell them apart.",
  },
  "landmark-no-duplicate-banner": {
    plain: "The page has more than one header area.",
    impact: "Screen readers list several headers, so nobody can tell which is the real one.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "The page has more than one footer area.",
    impact: "Screen readers list several footers, and people cannot tell which is which.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "The footer sits nested inside another area instead of standing on its own.",
    impact: "People using screen readers cannot jump straight to it the way they expect.",
  },
  "skip-link": {
    plain: "The \"skip to content\" link does not go anywhere.",
    impact:
      "Keyboard users press it and stay exactly where they were, then tab through the whole menu anyway.",
  },
  "image-redundant-alt": {
    plain: "An image description repeats the words printed next to it.",
    impact: "People using screen readers hear the same thing twice, which slows them down for nothing.",
  },
  "color-contrast": {
    plain: "Text is too light against its background to read easily.",
    impact:
      "Hard to read in bright light, on a cheap screen, or with imperfect eyesight. Your message doesn't land.",
  },
  "image-alt": {
    plain: "Images have no text description behind them.",
    impact:
      "People using screen readers hear nothing for these images, and search engines can't tell what they show. Costing you both accessibility and SEO.",
  },
  "input-image-alt": {
    plain: "An image used as a button has no text description.",
    impact: "People using screen readers can't tell what the button does, so they can't finish.",
  },
  "link-name": {
    plain: "Links have no readable text at all.",
    impact:
      "People using screen readers hear only \"link\", with no idea where it goes.",
  },
  "link-text-vague": {
    plain: "Links say only \"read more\" or similar.",
    impact:
      "People using screen readers can pull up a list of every link on the page. When they all read the same, the list is no help at all.",
  },
  "button-name": {
    plain: "Buttons have no label.",
    impact: "Nobody can tell what it does before clicking. A common reason people give up.",
  },
  label: {
    plain: "Form fields have no label.",
    impact:
      "People using screen readers don't know what goes in each box, so forms get abandoned, checkout included.",
  },
  "select-name": {
    plain: "A dropdown menu has no label.",
    impact: "People can't tell what they're choosing. Errors and dropped forms follow.",
  },
  "document-title": {
    plain: "Your page has no title.",
    impact: "Tabs, bookmarks and search results show nothing useful.",
  },
  "html-has-lang": {
    plain: "Your page doesn't say what language it's written in.",
    impact: "People hear your content in the wrong accent, which is hard to follow.",
  },
  "html-lang-valid": {
    plain: "Your page's declared language isn't a valid value.",
    impact: "People hear your words in the wrong voice, mispronounced.",
  },
  "heading-order": {
    plain: "Your headings jump levels instead of going in order.",
    impact: "Most screen reader users navigate by headings. They lose the thread.",
  },
  "page-has-heading-one": {
    plain: "Your page has no main heading.",
    impact: "Nobody can tell at a glance what the page is about.",
  },
  "empty-heading": {
    plain: "A heading on the page is empty.",
    impact: "People navigating by headings hit a blank signpost that tells them nothing.",
  },
  "link-in-text-block": {
    plain: "Links are shown by colour alone, with nothing else to set them apart.",
    impact: "Colour-blind readers can't tell a link from ordinary text.",
  },
  "meta-viewport": {
    plain: "Your page stops people from zooming in.",
    impact: "Anyone who needs bigger text can't get it. On a phone, they just leave.",
  },
  "frame-title": {
    plain: "An embedded frame (like a map or video) has no title.",
    impact: "People using screen readers can't tell what's in it, or whether it's worth their time.",
  },
  "duplicate-id-active": {
    plain: "Two interactive elements share the same hidden name in the code.",
    impact: "Screen readers get confused and the wrong thing responds when someone clicks.",
  },
  list: {
    plain: "A list isn't built as a proper list.",
    impact: "People using screen readers aren't told how many items there are, and can't skip through them.",
  },
  listitem: {
    plain: "A list item sits outside any real list.",
    impact: "People using screen readers lose the grouping, so the content stops making sense.",
  },
  "aria-required-attr": {
    plain: "A menu or slider is missing information screen readers need.",
    impact: "People using screen readers can't tell what state it's in, or how to work it.",
  },
  "aria-hidden-focus": {
    plain: "Something hidden from screen readers can still be reached with the Tab key.",
    impact: "Someone tabbing through lands on something their screen reader won't read. The page feels broken.",
  },
  region: {
    plain: "The main areas of your page aren't named in the code.",
    impact: "People using screen readers can't skip ahead. They hear everything, every time.",
  },
  "landmark-one-main": {
    plain: "Your page doesn't say where the main content starts.",
    impact: "People using screen readers sit through the whole menu on every single page.",
  },
  tabindex: {
    plain: "Tabbing jumps around the page instead of following the order things appear.",
    impact: "People who can't use a mouse get thrown around the page.",
  },
  "scrollable-region-focusable": {
    plain: "A scrollable area can't be reached with the keyboard.",
    impact: "Without a mouse, you can't scroll to what's inside.",
  },

  // Keyboard walk-through checks (WCAG 2.4.7 Focus Visible, 2.1.2 No
  // Keyboard Trap) — from real Tab presses during the scan.
  "keyboard-no-visible-focus": {
    plain: "Moving through the page with the keyboard gives no visible sign of where you are.",
    impact:
      "Plenty of people never touch a mouse. Without a visible highlight they're navigating blind, and they give up.",
  },
  "keyboard-focus-trap": {
    plain: "Keyboard focus gets stuck in one spot. You can't Tab past it.",
    impact:
      "A keyboard user who reaches this point cannot go further. One of the worst failures a site can have.",
  },

  // Component design suggestions (forms, menus) — from the ARIA Authoring
  // Practices. Framed as "here's a better way to build this."
  "component-form-autocomplete": {
    plain: "Your form fields don't let browsers autofill personal details.",
    impact:
      "Everyone retypes their name, email and address by hand. Slow for all, a real barrier for some.",
  },
  "component-input-type": {
    plain: "Email and phone fields use a plain text box instead of the proper input type.",
    impact:
      "On phones, visitors get the generic keyboard instead of one with \"@\" or a number pad. More taps, more mistakes, more abandoned forms.",
  },
  "component-required-cue": {
    plain: "Required fields are marked only in the code, not visibly in the label.",
    impact:
      "Nobody knows a field was required until the form rejects them. Sign-ups fail.",
  },
  "component-submit-clarity": {
    plain: "The form has no clearly-labelled submit button.",
    impact:
      "A button that just says \"Go\", shows only an icon, or is missing entirely leaves people unsure how to finish, so they don't.",
  },
  "component-nav-labels": {
    plain: "Your page has several menus, but they aren't individually labelled.",
    impact:
      "People using screen readers hear \"navigation… navigation…\" with no way to tell the main menu from footer links, so getting around your site is guesswork.",
  },
  "component-skip-link": {
    plain: "There's no \"skip to main content\" link.",
    impact:
      "Keyboard users tab through your entire menu on every page. Dozens of extra presses each visit.",
  },

  // Mobile-only issues from the phone-width render pass.
  "mobile-horizontal-scroll": {
    plain: "On a phone, your page scrolls sideways.",
    impact:
      "Most visitors are on phones. Swiping sideways to read each line makes them leave.",
  },
  "mobile-tap-target": {
    plain: "Buttons and links are too small to tap reliably on a phone.",
    impact:
      "Mis-taps and frustration. Worst for bigger fingers, tremors, or shaky hands. It costs you sales.",
  },

  // Text resizing — WCAG 1.4.4 / 1.4.12, measured by actually applying the
  // reader's overrides and looking at what breaks.
  "text-spacing-clipped": {
    plain: "Text gets cut off when a reader increases spacing.",
    impact:
      "Many dyslexic readers widen spacing just to read. Here the words don't reflow. They disappear behind a fixed box.",
  },
  "text-zoom-clipped": {
    plain: "Text gets cut off at larger font sizes.",
    impact:
      "Turning up font size is the commonest fix for weak eyesight. Far more common than screen readers. Your boxes stay put, so the words vanish.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Enlarging text makes the page scroll sideways.",
    impact:
      "Dragging left and right on every line is exhausting. Most people give up.",
  },

  // Dark patterns — manipulative marketing/UX. These don't affect the
  // accessibility score; they're trust and (for consent) legal red flags.
  "dark-consent-no-reject": {
    plain: "Your cookie banner lets people accept, but not refuse.",
    impact:
      "Under GDPR, refusing has to be as easy as accepting. Consent collected this way can be invalid. Visitors read a missing \"Reject\" button as a trick.",
  },
  "dark-consent-asymmetry": {
    plain: "Your cookie banner pushes \"accept\" and plays down \"reject\".",
    impact:
      "Making one option a button and the other plain text nudges people into agreeing. Regulators look for this.",
  },
  "dark-preselected-optin": {
    plain: "A marketing opt-in is ticked before the visitor chooses.",
    impact:
      "GDPR says a pre-ticked box isn't consent. People who miss it feel signed up without agreeing.",
  },
  "dark-confirmshaming": {
    plain: "The \"no thanks\" option is worded to make people feel bad.",
    impact:
      "\"No thanks, I don't want to save money\" is memorable for the wrong reasons. It reads as manipulation.",
  },
  "dark-fake-scarcity": {
    plain: "The page claims limited stock or high demand, worth verifying.",
    impact:
      "Regulators pursue fake scarcity. Shoppers have learned to distrust it. Invented numbers cost more sales than they win.",
  },
  "dark-fake-urgency": {
    plain: "The page applies time pressure. Worth verifying it's real.",
    impact:
      "Countdowns that reset on reload are a deceptive practice. Once noticed, nothing else you claim is believed.",
  },

  // Modal / pop-up dialogs — ARIA dialog pattern.
  "dialog-close-unlabeled": {
    plain: "A pop-up's close button is just an \"×\" with no readable label.",
    impact:
      "People using screen readers hear only \"button\" and can't tell how to close the pop-up. It traps them, and many will simply leave your site.",
  },
  "dialog-no-close": {
    plain: "A pop-up appears to have no obvious close button.",
    impact:
      "If clicking outside is the only way out, keyboard users get stuck behind it.",
  },
  "dialog-missing-role": {
    plain: "A pop-up overlay isn't marked up as a dialog.",
    impact:
      "Screen readers don't announce it opened, and people tab straight off into the hidden page behind.",
  },
  "dialog-missing-name": {
    plain: "A pop-up dialog has no name describing what it's for.",
    impact:
      "When it opens, a screen reader just says \"dialog\". The visitor has no idea what it's asking or why.",
  },

  // Raw-HTML markup validation.
  "markup-validation": {
    plain: "The page's underlying HTML code contains errors.",
    impact:
      "Browsers quietly guess how to fix it, and each one guesses differently. Your page may not work the way you think.",
  },

  // Motion/animation checks (WCAG 2.2.2 Pause, Stop, Hide).
  "motion-marquee": {
    plain: "Text scrolls across the page in a moving ticker that can't be paused.",
    impact:
      "Moving text is hard for everyone. For anyone with attention or balance problems it's unusable.",
  },
  "motion-autoplay-media": {
    plain: "A video or audio starts playing by itself, with no controls to stop it.",
    impact:
      "Nobody can stop it. It's disorienting, it drowns out screen readers, and people leave.",
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
    impact: "Cramped letters blur into one another. Especially at small sizes or for readers with low vision.",
  },
  "typo-line-length-long": {
    plain: "Lines of text run too long across the page.",
    impact:
      "Past about 75 characters a line, the eye loses its place jumping back.",
  },
  "typo-line-length-short": {
    plain: "Text is squeezed into very short, choppy lines.",
    impact: "When almost every phrase breaks onto a new line, reading rhythm falls apart and content feels harder than it is.",
  },
  "typo-leading-tight": {
    plain: "Lines of text sit too close together.",
    impact: "Cramped lines make it easy to reread or skip one. Tiring for everyone, a real barrier for dyslexic readers.",
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
    plain: "Underlined text that isn't a link looks clickable.",
    impact:
      "Underlines read as links, so people click text that goes nowhere.",
  },
  "typo-italic-body": {
    plain: "Whole passages are set in italics.",
    impact:
      "Slanted letters get hard past a few words. A real barrier with dyslexia or weak eyesight.",
  },
  "typo-allcaps-block": {
    plain: "A long passage is set in ALL CAPITALS.",
    impact:
      "Capitals strip out the word shapes we read by. Slow and tiring, worst for dyslexic readers.",
  },
  "typo-thin-weight": {
    plain: "Body text is set in a very thin (hairline) weight.",
    impact:
      "Thin strokes fade on cheap screens, in sunlight, and for weak eyesight. Even when contrast passes.",
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
  "aria-allowed-role": "Remove the role attribute, or use an element that genuinely is that thing (a <button> for a button, a <nav> for navigation).",
  "aria-allowed-attr": "Remove the aria-* attributes that do not apply to this element, or change the element to one that supports them.",
  "aria-required-children": "Give the component the child elements its role requires, e.g. a role=\"list\" needs role=\"listitem\" children.",
  "landmark-unique": "Give each area a distinct aria-label, so \"Main menu\" and \"Footer links\" are told apart.",
  "landmark-no-duplicate-banner": "Keep one <header> at the top level of the page and turn the others into plain containers.",
  "landmark-no-duplicate-contentinfo": "Keep one <footer> at the top level of the page and turn the others into plain containers.",
  "landmark-contentinfo-is-top-level": "Move the <footer> out so it is a direct child of <body>, not nested inside another landmark.",
  "skip-link": "Point the skip link at an id that exists on the main content, and make sure that target can take focus.",
  "image-redundant-alt": "Give the image an empty alt (alt=\"\") when the text beside it already says the same thing.",
  "color-contrast":
    "Darken the text or lighten its background until they contrast strongly. Aim for a 4.5:1 ratio for normal text, 3:1 for large text.",
  "image-alt":
    'Add an alt attribute to each image describing what it shows. Use empty alt (alt="") only for purely decorative images.',
  "input-image-alt": 'Add an alt attribute to the image button describing its action (e.g. alt="Search").',
  "link-name":
    "Give each link readable text. Visible text inside the link, or an aria-label describing where it goes.",
  "link-text-vague":
    "Write link text that makes sense on its own: \"Read the 2026 fee changes\", not \"Read more\". To keep the short version on screen, add the full wording with aria-label.",
  "button-name":
    "Give each button a clear label. Visible text inside it, or an aria-label describing what it does.",
  label: "Connect a visible <label> to each field (the label's for matches the field's id), or add an aria-label.",
  "select-name": "Add a <label> tied to the dropdown, or an aria-label describing what it selects.",
  "document-title": "Add a <title> in the page's <head> that describes the page.",
  "html-has-lang": 'Add a lang attribute to the <html> tag (e.g. <html lang="en">).',
  "html-lang-valid": 'Set the <html> lang attribute to a valid language code (e.g. "en", "de", "fr").',
  "heading-order": "Use headings in order without skipping levels. Don't jump from <h2> straight to <h4>.",
  "page-has-heading-one": "Add one <h1> near the top that states what the page is about.",
  "empty-heading": "Put text in the heading, or remove the empty heading tag.",
  "link-in-text-block": "Give in-text links a second visual cue besides colour, usually an underline.",
  "meta-viewport": "Remove user-scalable=no and any maximum-scale limit from the viewport meta tag so people can zoom.",
  "frame-title": 'Add a title attribute to each <iframe> describing its content (e.g. title="Location map").',
  "duplicate-id-active": "Make every id on the page unique. No two elements should share the same id.",
  list: "Wrap the items in a proper <ul> or <ol>, with only <li> as direct children.",
  listitem: "Put each <li> inside a <ul> or <ol> parent.",
  "aria-required-attr": "Add the ARIA attributes this component's role requires. See the Learn more link for the exact set.",
  "aria-hidden-focus":
    'Remove aria-hidden from focusable elements, or make them unfocusable (tabindex="-1") so hidden content can\'t be tabbed to.',
  region: "Wrap page content in landmark regions. <header>, <nav>, <main>, <footer>, so nothing sits outside a labelled area.",
  "landmark-one-main": "Wrap the primary content of the page in a single <main> element.",
  tabindex: 'Remove positive tabindex values (tabindex="1" or higher) and let the natural page order set focus order.',
  "scrollable-region-focusable": 'Add tabindex="0" to the scrollable container so keyboard users can scroll it.',
};

export function plainFixForRule(ruleId: string | undefined): string | undefined {
  return ruleId ? PLAIN_RULE_FIXES[ruleId] : undefined;
}

export const WCAG_LINK = "https://www.w3.org/WAI/standards-guidelines/wcag/";

export const PRINCIPLE_ORDER: Principle[] = ["Perceivable", "Operable", "Understandable", "Robust"];
