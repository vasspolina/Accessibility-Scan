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
  // Says plainly that this one is advice rather than obligation. The score
  // counts A and AA only, so a reader who fixes an AAA finding and sees the
  // number stay put deserves to know why before they go looking for a bug.
  AAA: "Advanced (Level AAA): worth doing, not required, not scored",
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
  /**
   * What was actually found on this page, given how many times it occurred.
   *
   * Only needed where the finding's own description is unusable, which for
   * axe rules is most of them: axe states the requirement — "Links must have
   * discernible text" — and the report shows that under a heading promising
   * what we found. A requirement is not a finding, and reading one where the
   * other was expected is the same fault the conformance rows were pulled up
   * for. Where this is absent the description is used as it always was.
   */
  found?: (count: number) => string;
}

export const PLAIN_RULE_EXPLANATIONS: Record<string, PlainRule> = {
  "aria-allowed-role": {
    plain: "Parts of the page are labelled in the code as something they cannot be.",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} labelled in the code as something ${n === 1 ? "it cannot be" : "they cannot be"} — a role that does not belong on that kind of tag.`,
    impact:
      "Screen readers announce the wrong thing, so people are told they have reached a button when it is a link, or a heading when it is a list.",
  },
  "aria-allowed-attr": {
    plain: "An element carries code settings that do not belong on it.",
    impact: "Screen readers can announce nonsense, or skip the element entirely.",
  },
  "aria-prohibited-attr": {
    plain: "An element carries a name that the code will not let it keep.",
    found: (n) =>
      `${n} ${n === 1 ? "element has" : "elements have"} been given a label in the code that is not allowed on that kind of tag, so the label is thrown away rather than read out.`,
    impact:
      "This one is quietly worse than it sounds: the element looks named in your source, so nobody notices it is missing. Screen readers ignore the label and announce whatever text happens to be inside instead — often nothing.",
  },
  "aria-required-children": {
    plain: "A menu or list is missing the parts it needs to work.",
    impact: "Screen readers cannot work out its structure, so people cannot navigate it.",
  },
  "aria-required-parent": {
    plain: "Part of a control has been separated from the control it belongs to.",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} labelled in the code as ${n === 1 ? "a piece" : "pieces"} of a larger control — a tab, a menu item, a list option — without being inside the control ${n === 1 ? "it belongs" : "they belong"} to.`,
    impact:
      "A tab outside its tab strip is not a tab to anything. Screen readers cannot say which one of how many it is, and the arrow keys people use to move through these controls have nothing to move through.",
  },
  "landmark-unique": {
    plain: "Two areas of the page share the same name.",
    found: (n) =>
      `${n} ${n === 1 ? "region shares its name with another" : "regions share their names with others"}, so a list of regions reads as repeats with no way to tell which is which.`,
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
  "landmark-no-duplicate-main": {
    plain: "The page marks more than one area as its main content.",
    impact:
      "\"Skip to main content\" has to pick one, and there is no way for it to know which you meant. People land in the wrong half of the page.",
  },
  "landmark-banner-is-top-level": {
    plain: "The page header sits nested inside another area instead of standing on its own.",
    impact: "People using screen readers cannot jump straight to it the way they expect.",
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
    found: (n) =>
      `${n} ${n === 1 ? "image repeats, in its alt text, the words already printed beside it" : "images repeat, in their alt text, the words already printed beside them"}, so a screen reader says the same thing twice.`,
    impact: "People using screen readers hear the same thing twice, which slows them down for nothing.",
  },
  "color-contrast": {
    plain: "Text is too light against its background to read easily.",
    found: (n) =>
      `${n} ${n === 1 ? "piece" : "pieces"} of text on this page ${n === 1 ? "sits" : "sit"} too close in colour to the background behind ${n === 1 ? "it" : "them"}. Each one is listed below, and the technical version gives the measured ratio.`,
    impact:
      "Hard to read in bright light, on a cheap screen, or with imperfect eyesight. Your message doesn't land.",
  },
  "image-alt": {
    plain: "Images have no text description behind them.",
    found: (n) =>
      `${n} ${n === 1 ? "image has" : "images have"} no alt text at all — not even an empty one to mark ${n === 1 ? "it" : "them"} decorative. A screen reader falls back to reading the filename aloud, or skips ${n === 1 ? "it" : "them"} in silence.`,
    impact:
      "People using screen readers hear nothing for these images, and search engines can't tell what they show. Costing you both accessibility and SEO.",
  },
  "svg-img-alt": {
    plain: "Icons drawn in the page's code have nothing describing them.",
    found: (n) =>
      `${n} ${n === 1 ? "icon is" : "icons are"} marked in the code as ${n === 1 ? "a picture" : "pictures"} but ${n === 1 ? "carries" : "carry"} no words saying what ${n === 1 ? "it shows" : "they show"}.`,
    impact:
      "Where the icon is the only thing labelling a control — a magnifying glass for search, a cross for close, a basket for the cart — a screen reader reaches it and has nothing to announce.",
  },
  "input-image-alt": {
    plain: "An image used as a button has no text description.",
    found: (n) =>
      `${n} ${n === 1 ? "image used as a button has" : "images used as buttons have"} no alt text, so there is nothing to announce and nothing to read.`,
    impact: "People using screen readers can't tell what the button does, so they can't finish.",
  },
  "link-name": {
    plain: "Some links have nothing a screen reader can read out.",
    found: (n) =>
      `${n} ${n === 1 ? "link has" : "links have"} no readable text inside — no words, no label, nothing to announce. Usually these are icons, arrows or images used as links, where the picture carries the meaning and the code carries none of it.`,
    impact:
      "Screen reader users rarely read a page top to bottom. They pull up a list of every link on it and pick from that, the way a sighted visitor scans a menu. A link with no text appears in that list as the single word \"link\" — no destination, no clue. Several of them turn the list into \"link, link, link\", and the only way through is to open each one and see where it lands.",
  },
  "link-text-vague": {
    plain: "Links say only \"read more\" or similar.",
    impact:
      "People using screen readers can pull up a list of every link on the page. When they all read the same, the list is no help at all.",
  },
  "button-name": {
    plain: "Buttons have no label.",
    found: (n) =>
      `${n} ${n === 1 ? "button has" : "buttons have"} no label of any kind: no words inside, no aria-label. Nearly always an icon button, where the symbol carries the meaning and the code carries none of it.`,
    impact: "Nobody can tell what it does before clicking. A common reason people give up.",
  },
  label: {
    plain: "Form fields have no label.",
    found: (n) =>
      `${n} form ${n === 1 ? "field is" : "fields are"} not joined to a label in the code. The words may sit right beside the field on screen — nothing connects the two, so a screen reader announces the field with no idea what it is for.`,
    impact:
      "People using screen readers don't know what goes in each box, so forms get abandoned, checkout included.",
  },
  "select-name": {
    plain: "A dropdown menu has no label.",
    found: (n) =>
      `${n} ${n === 1 ? "dropdown has" : "dropdowns have"} no label in the code, so ${n === 1 ? "it is" : "they are"} announced as a list of options with no indication of what is being chosen.`,
    impact: "People can't tell what they're choosing. Errors and dropped forms follow.",
  },
  "document-title": {
    plain: "Your page has no title.",
    found: (n) =>
      `The page has no title, so a browser tab and a screen reader both fall back to the address.`,
    impact: "Tabs, bookmarks and search results show nothing useful.",
  },
  "html-has-lang": {
    plain: "Your page doesn't say what language it's written in.",
    found: (n) =>
      `The page does not declare what language it is written in.`,
    impact: "People hear your content in the wrong accent, which is hard to follow.",
  },
  "html-lang-valid": {
    plain: "Your page's declared language isn't a valid value.",
    found: (n) =>
      `The page declares a language, but not one that software recognises.`,
    impact: "People hear your words in the wrong voice, mispronounced.",
  },
  "heading-order": {
    plain: "Your headings jump levels instead of going in order.",
    found: (n) =>
      `The heading levels jump instead of stepping — ${n === 1 ? "one place" : `${n} places`} where a level is skipped, an h2 followed straight by an h4 or similar.`,
    impact: "Most screen reader users navigate by headings. They lose the thread.",
  },
  "page-has-heading-one": {
    plain: "Your page has no main heading.",
    found: (n) =>
      `The page has no top-level heading, so there is nothing naming what it is about.`,
    impact: "Nobody can tell at a glance what the page is about.",
  },
  "empty-heading": {
    plain: "A heading on the page is empty.",
    found: (n) =>
      `${n} ${n === 1 ? "heading is" : "headings are"} empty: the tag is there, the words are not.`,
    impact: "People navigating by headings hit a blank signpost that tells them nothing.",
  },
  "link-in-text-block": {
    plain: "Links are shown by colour alone, with nothing else to set them apart.",
    found: (n) =>
      `${n} ${n === 1 ? "link inside running text is" : "links inside running text are"} marked only by colour, with no underline, so anyone who cannot separate those colours cannot see there is a link there.`,
    impact: "Colour-blind readers can't tell a link from ordinary text.",
  },
  "meta-viewport": {
    plain: "Your page stops people from zooming in.",
    found: (n) =>
      `The page blocks zooming, so anyone who needs to enlarge it on a phone cannot.`,
    impact: "Anyone who needs bigger text can't get it. On a phone, they just leave.",
  },
  "meta-viewport-large": {
    plain: "The page puts a ceiling on how far it can be zoomed.",
    found: (n) =>
      `Zooming works, but the page caps it below the 500% that people with low vision are entitled to reach.`,
    impact:
      "Milder than blocking zoom outright, and it fails the same people: anyone who needs very large text gets as far as the cap and no further.",
  },
  "frame-title": {
    plain: "An embedded frame (like a map or video) has no title.",
    found: (n) =>
      `${n} embedded ${n === 1 ? "frame has" : "frames have"} no title, so ${n === 1 ? "it is" : "they are"} announced only as "frame".`,
    impact: "People using screen readers can't tell what's in it, or whether it's worth their time.",
  },
  "duplicate-id-active": {
    plain: "Two interactive elements share the same hidden name in the code.",
    found: (n) =>
      `${n} ${n === 1 ? "id is" : "ids are"} used more than once on controls, so labels and references can point at the wrong element.`,
    impact: "Screen readers get confused and the wrong thing responds when someone clicks.",
  },
  list: {
    plain: "A list looks like a list on screen but isn't coded as one.",
    found: (n) =>
      `${n} ${n === 1 ? "list is" : "lists are"} built with something other than list items inside, so the grouping exists visually and not in the code.`,
    impact: "People using screen readers aren't told how many items there are, and can't skip through them.",
  },
  listitem: {
    plain: "A list item sits on its own, outside any list.",
    found: (n) =>
      `${n} list ${n === 1 ? "item sits" : "items sit"} outside any list, so a screen reader never announces how many there are or where the group starts.`,
    impact: "People using screen readers lose the grouping, so the content stops making sense.",
  },
  "aria-required-attr": {
    plain: "A menu or slider is missing information screen readers need.",
    impact: "People using screen readers can't tell what state it's in, or how to work it.",
  },
  "aria-hidden-focus": {
    plain: "Something hidden from screen readers can still be reached with the Tab key.",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} hidden from screen readers while still being reachable by keyboard, so focus lands somewhere that announces nothing.`,
    impact: "Someone tabbing through lands on something their screen reader won't read. The page feels broken.",
  },
  "aria-dialog-name": {
    plain: "A pop-up has no name in the code.",
    impact:
      "It is announced as \"dialog\" and nothing else. Something has taken over the screen and there is no way to hear what it is.",
  },
  "nested-interactive": {
    plain: "One control sits inside another — a button within a link, or similar.",
    found: (n) =>
      `${n} ${n === 1 ? "control contains another control" : "controls each contain another control"}, so what looks like one thing to click is two things wrapped around each other.`,
    impact:
      "Screen readers announce the outer one and hide what is inside it, so the inner control is unreachable. Which of the two a click or a keypress activates is anyone's guess.",
  },
  "presentation-role-conflict": {
    plain: "Something is marked in the code as decoration while still working as a control.",
    impact:
      "The code says to ignore it and the element says to use it. Screen readers resolve that inconsistently, so some people never find it.",
  },
  region: {
    plain: "The main areas of your page aren't named in the code.",
    found: (n) =>
      `Some of this page sits outside any named region — ${n === 1 ? "one block" : `${n} blocks`} of content with no header, nav, main or footer around ${n === 1 ? "it" : "them"}.`,
    impact: "People using screen readers can't skip ahead. They hear everything, every time.",
  },
  "landmark-one-main": {
    plain: "Your page doesn't say where the main content starts.",
    found: (n) =>
      `The page has no main region marking where the content starts, so there is nothing to skip to.`,
    impact: "People using screen readers sit through the whole menu on every single page.",
  },
  tabindex: {
    plain: "Tabbing jumps around the page instead of following the order things appear.",
    found: (n) =>
      `${n} ${n === 1 ? "element uses" : "elements use"} a positive tabindex, which forces ${n === 1 ? "it" : "them"} to the front of the tab order regardless of where ${n === 1 ? "it sits" : "they sit"} on the page.`,
    impact: "People who can't use a mouse get thrown around the page.",
  },
  "scrollable-region-focusable": {
    plain: "A scrollable area can't be reached with the keyboard.",
    found: (n) =>
      `${n} ${n === 1 ? "area scrolls" : "areas scroll"} but cannot be reached with the keyboard, so whatever has scrolled out of view is unreachable without a mouse.`,
    impact: "Without a mouse, you can't scroll to what's inside.",
  },

  // Keyboard walk-through checks (WCAG 2.4.7 Focus Visible, 2.1.2 No
  // Keyboard Trap, 2.1.1 Keyboard) — from real Tab presses during the scan.
  "keyboard-mouse-only": {
    plain: "Something on the page works when clicked but cannot be reached with the keyboard at all.",
    impact:
      "There is no workaround for this one. Anyone who cannot use a mouse simply cannot do whatever this control does — and if it's a Buy button or a form step, that's the end of the visit.",
  },
  "keyboard-no-visible-focus": {
    plain: "Nothing shows where you are when you move through the page with the keyboard.",
    impact:
      "Plenty of people never touch a mouse. Without a visible highlight they're navigating blind, and they give up.",
  },
  "readability-dense-prose": {
    plain: "The writing needs about a first-year-university reading level.",
    impact:
      "Not a legal requirement, and the change with the widest reach in this whole report. It helps people with cognitive disabilities, anyone reading in a second language, and everyone skimming on a phone with one bar of signal. GOV.UK writes at roughly a nine-year-old's reading age deliberately — that isn't a simple site, it's a well-written one.",
  },
  "typo-leading-for-measure": {
    plain: "Lines this long need more room between them.",
    found: (n) =>
      `${n === 1 ? "A block of text sets" : `${n} blocks of text set`} long lines close together. The spacing would be comfortable in a narrow column and is tight at this width.`,
    impact:
      "Reading is not a glide along the line, it is a series of jumps, and the hardest one is the jump back to the start of the next line. The further left it travels, the more space it needs to land on the right line — get it wrong and you reread the line you just finished, or skip one.",
  },
  "reading-order-mismatch": {
    plain: "Two controls sitting side by side are tabbed to in the opposite order.",
    impact:
      "CSS moved them on screen without moving them in the page's code, and the Tab key follows the code. Where this bites hardest is a pair like Cancel and Submit: the button under your cursor is not the one the keyboard has landed on. Screen reader users get the same mismatch, because they are read the code order too.",
  },

  // Forced Colors Mode — Windows High Contrast. Checked by switching the mode
  // on and seeing what disappears.
  "forced-colors-focus-lost": {
    plain: "In Windows High Contrast mode, your focus highlight disappears completely.",
    impact:
      "High contrast mode is what people use when they can't make out low-contrast detail — and it throws away shadows and colours, which is how most focus highlights are drawn. So the users who most need to see where they are are the exact ones who see nothing. Your page looks perfect until that mode is switched on.",
  },
  "forced-colors-icon-lost": {
    plain: "An icon button vanishes entirely in Windows High Contrast mode.",
    impact:
      "The icon is drawn as a background image, and that mode removes background images. The button still works, but it renders as an empty box — no picture, no label, no hint that it's a button at all.",
  },
  "keyboard-faint-focus": {
    // "The outline" assumed the reader already knew which outline was meant,
    // and the fix for that — two sentences opening "Tab through your page" —
    // read as an instruction rather than as the name of a fault. A title has
    // to say what is wrong. "The marker showing where you are on the keyboard"
    // introduces the thing and names it in one clause; the paragraph below is
    // where it gets explained.
    plain: "The marker showing where you are on the keyboard is too faint to see.",
    impact:
      "Pressing Tab moves an invisible cursor from one control to the next, and this outline is the only thing showing where it has got to. Too faint, and someone using a keyboard instead of a mouse cannot tell what they are about to activate — so they press Enter and hope, or start again from the top. It slips through testing easily, because there genuinely is an outline there; it only shows up when you put the mouse down and try to get through the page yourself.",
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
  "dialog-keyboard-trap": {
    plain: "A pop-up traps keyboard users — they can't close it or get past it.",
    impact:
      "Someone using only a keyboard hits this pop-up and stops there. Escape doesn't close it, and Tab just cycles around the buttons inside it, so they can't reach your page and can't get out of the pop-up either. Closing the tab is the only way out. If this is your cookie banner, it happens before they have seen anything at all.",
  },
  "dialog-no-escape": {
    plain: "A pop-up doesn't close when you press the Escape key.",
    impact:
      "Escape is the key everyone reaches for first. Nobody is stuck here — you can still tab away — but every keyboard user tries it, and nothing happens.",
  },
  "dialog-focus-not-moved": {
    plain: "A pop-up appears without moving the cursor into it.",
    impact:
      "Someone using a screen reader is never told it opened. A keyboard user has to tab through the entire page underneath before reaching the thing now covering their screen.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Closing a pop-up drops you back at the very top of the page.",
    impact:
      "Anyone who had tabbed halfway down has to start again from the beginning. It is the web equivalent of a page you were reading snapping shut.",
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
    "Darken the text or lighten its background until they contrast strongly. Aim for a 4.5:1 ratio for normal text and 3:1 for large text — large meaning about 24px, or 19px if it is bold.",
  "image-alt":
    'Add an alt attribute to each image describing what it shows. Use empty alt (alt="") only for purely decorative images.',
  "input-image-alt": 'Add an alt attribute to the image button describing its action (e.g. alt="Search").',
  "link-name":
    "Put readable words inside the link. Where the link is an icon or an image, `aria-label` on the link does it — or alt text on the image, if that is what the link contains. Describe the destination rather than the picture: `aria-label=\"Major partnerships\"` tells somebody where they are going, `aria-label=\"arrow\"` tells them nothing. Write it to make sense read on its own, because in that list of links it will be.\n\nWhere the link already shows words, keep those words inside the label you write. A label replaces the visible text for software instead of adding to it, so someone using voice control who says what they can see will otherwise get no response at all.",
  "link-text-vague":
    "Write link text that makes sense on its own: \"Read the 2026 fee changes\", not \"Read more\". To keep the short version on screen, add the full wording with aria-label.",
  "button-name":
    "Give each button a clear label. Visible text inside it, or an `aria-label` describing what it does.\n\nOne trap worth knowing if the button already shows words: an `aria-label` replaces them for software rather than adding to them, so the visible words have to appear inside it. Someone using voice control says what they can see — \"click Send\" — and if the label underneath says something else, nothing happens and they have no way to find out why.",
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

/**
 * Why the engine could not settle a check, and what a person should do.
 *
 * These are not faults. axe reports no false positives by refusing to call
 * anything it cannot measure, and this is where those cases go. The reader
 * needs two things: why a machine could not answer, and what looking at it
 * themselves involves.
 *
 * Written for the rules a sweep of real sites actually produced.
 */
export const UNDECIDED_EXPLANATIONS: Record<string, { what: string; youCheck: string }> = {
  "color-contrast": {
    what: "Text sitting on a photograph, a video or a gradient. The checker can read the colour of the text but there is no single colour behind it to measure against, so it will not guess.",
    youCheck:
      "Look at each one on a bright screen and on a dim one. If the text disappears into the picture anywhere behind it, it needs a solid panel behind the words, a shadow, or a different position.",
  },
  "link-in-text-block": {
    what: "Links inside a paragraph that may be marked only by their colour. The checker cannot tell whether the difference is strong enough on its own.",
    youCheck:
      "Imagine the page in grey. If a link in the middle of a sentence still looks like a link, it passes. If it only stands out by being a different colour, underline it.",
  },
  "video-caption": {
    what: "A video the checker can see and cannot watch. It has no way to tell whether captions exist or whether they are any good.",
    youCheck:
      "Play each one with the sound off. If you cannot follow it, it needs captions — and auto-generated ones count only if somebody has corrected them.",
  },
  "aria-valid-attr-value": {
    what: "Code labels that point at another part of the page. The checker cannot always tell whether the thing they point at is really there.",
    youCheck:
      "One for whoever maintains the site: check that every id referenced by an aria attribute exists on the page and is not inside a hidden or removed block.",
  },
  "aria-allowed-role": {
    what: "Parts of the page labelled in the code as something they may not be able to be. Whether it is wrong depends on how the component behaves.",
    youCheck:
      "One for whoever maintains the site: confirm each of these behaves the way its role promises, keyboard included, or drop the role and use the native element.",
  },
  "aria-prohibited-attr": {
    what: "An element carrying a name the code may not let it keep. Whether it survives depends on the element's role.",
    youCheck:
      "One for whoever maintains the site: check that each of these is announced with the name you intended, and move the name onto an element allowed to carry one if not.",
  },
  "duplicate-id-aria": {
    what: "An id that may be used more than once. Every code label pointing at it follows only the first, so a name can silently attach to the wrong thing.",
    youCheck:
      "One for whoever maintains the site: make each id on the page unique, starting with any referenced by an aria attribute.",
  },
};

export function undecidedExplanation(ruleId: string) {
  return UNDECIDED_EXPLANATIONS[ruleId];
}
