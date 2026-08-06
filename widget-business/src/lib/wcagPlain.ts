// The one place in this package that translates raw WCAG data into plain
// language — kept out of components so the reframing logic stays testable
// and in one spot. Grounded in https://www.w3.org/WAI/standards-guidelines/wcag/
//
// The register is the BarrierFreeWeb voice guide (docs/VOICE.md): titles of
// two to six words that name the problem, sentences under twenty words,
// jargon translated, at most one em dash per finding, no exclamation marks.
// test/voice.test.ts holds the deterministic backstops.

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
      "Anything people can't see or hear: text too faint to read, images with nothing written about them, and video with no captions.",
  },
  "2": {
    principle: "Operable",
    plainTitle: "Can people use it?",
    plainDescription:
      "Whether someone can actually get through your site, with a keyboard instead of a mouse, on a phone, or without fine control of their hands.",
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
  AAA: "Advanced (Level AAA): a good idea, not required or scored",
};

// Plain-English rewrites of the most common automated (axe-core) rules,
// keyed by the axe rule id on each finding. `plain` is the title — two to
// six words naming the problem, per the voice guide; `impact` says who it
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
  /**
   * One or two sentences of real, verifiable research context, from the
   * educational-insights module: WebAIM Million, WHO, Click-Away Pound,
   * Eurostat, NN/g, W3C/WAI. Curated by hand rather than generated at scan
   * time — a model asked for a statistic per scan is the invented-number
   * machine that module's own rules forbid. Written without digits on
   * purpose (numbers appear as words, and only where rock-solid), which a
   * test enforces; that is the structural guard against a made-up figure
   * ever reaching a reader.
   */
  research?: string;
}

export const PLAIN_RULE_EXPLANATIONS: Record<string, PlainRule> = {
  "timing-meta-refresh": {
    plain: "The page reloads on a timer",
    impact:
      "Anyone still reading, or part way through the form, is thrown back to the start with no warning. Reading slowly is not a fault, and this punishes it.",
  },
  "aria-allowed-role": {
    plain: "Elements labelled as what they aren't",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} labelled in the code as something ${n === 1 ? "it" : "they"} cannot be. The role does not belong on that kind of tag.`,
    impact:
      "Screen readers announce the wrong thing. People are told they reached a button when it is a link, or a heading when it is a list.",
  },
  "aria-allowed-attr": {
    plain: "Code settings on the wrong element",
    found: (n) =>
      `${n} ${n === 1 ? "element carries settings its" : "elements carry settings their"} kind of tag is not allowed to have. The browser and the screen reader disagree about what ${n === 1 ? "it is" : "they are"}.`,
    impact: "Screen readers can announce nonsense, or skip the element entirely.",
  },
  "aria-prohibited-attr": {
    plain: "A label the code discards",
    found: (n) =>
      `${n} ${n === 1 ? "element carries" : "elements carry"} a label the code does not allow on that kind of tag. The label is thrown away rather than read out.`,
    impact:
      "The element looks named in your source, so nobody notices anything wrong. Screen readers ignore the label and announce whatever text sits inside — often nothing.",
  },
  "aria-required-children": {
    plain: "Menus or lists missing their items",
    found: (n) =>
      `${n} ${n === 1 ? "control is labelled in the code as a menu or a list, but contains" : "controls are labelled in the code as menus or lists, but contain"} none of the items ${n === 1 ? "it needs" : "they need"}. ${n === 1 ? "It is" : "Each is"} announced as having nothing in it.`,
    impact: "Screen readers cannot work out its structure, so people cannot navigate it.",
  },
  "aria-required-parent": {
    plain: "Control parts separated from their control",
    found: (n) =>
      `${n} ${n === 1 ? "element is labelled as a piece" : "elements are labelled as pieces"} of a larger control: a tab, a menu item, a list option. ${n === 1 ? "It does not sit" : "None sits"} inside the control ${n === 1 ? "it belongs" : "they belong"} to.`,
    impact:
      "A tab outside its tab strip is not a tab to anything. Screen readers cannot say which one of how many it is. The arrow keys people use to move through these controls have nothing to move through.",
  },
  "landmark-unique": {
    plain: "Two page areas share one name",
    found: (n) =>
      `${n} ${n === 1 ? "region shares its name with another" : "regions share their names with others"}. A list of regions reads as repeats, with no way to tell them apart.`,
    impact: "Screen reader users get a list of identical entries and cannot tell them apart.",
  },
  "landmark-no-duplicate-banner": {
    plain: "More than one page header",
    found: () =>
      `The page marks more than one area as its header, so a list of regions offers several and none of them is the header.`,
    impact: "Screen readers list several headers, so nobody can tell which is the real one.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "More than one page footer",
    found: () =>
      `The page marks more than one area as its footer, so there is no single place to jump to for contact details or terms.`,
    impact: "Screen readers list several footers, and people cannot tell which is which.",
  },
  "landmark-no-duplicate-main": {
    plain: "More than one main content area",
    found: () =>
      `More than one area is marked as the main content. "Skip to main content" has to pick one, and cannot know which you meant.`,
    impact: "People land in the wrong half of the page.",
  },
  "landmark-banner-is-top-level": {
    plain: "Header nested inside another area",
    found: () =>
      `The header is tucked inside another region rather than alongside it. It is not where someone jumping between regions expects to find it.`,
    impact: "Screen reader users cannot jump straight to it the way they expect.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Footer nested inside another area",
    found: () =>
      `The footer is tucked inside another region rather than alongside it. It is not where someone jumping between regions expects it.`,
    impact: "Screen reader users cannot jump straight to it the way they expect.",
  },
  "skip-link": {
    plain: "Skip link goes nowhere",
    found: (n) =>
      `${n} skip ${n === 1 ? "link points" : "links point"} at something that is not on the page, so pressing ${n === 1 ? "it" : "them"} moves nobody anywhere.`,
    impact:
      "Keyboard users press it and stay exactly where they were, then tab through the whole menu anyway.",
  },
  "image-redundant-alt": {
    plain: "Image description repeats nearby text",
    found: (n) =>
      `${n} ${n === 1 ? "image repeats, in its alt text, the words already printed beside it" : "images repeat, in their alt text, the words already printed beside them"}. A screen reader says the same thing twice.`,
    impact: "Screen reader users hear the same thing twice, which slows them down for nothing.",
  },
  "color-contrast": {
    research:
      "WebAIM checks a million homepages every year. Low-contrast text is the most common failure it finds, year after year. The World Health Organization estimates about one in six people worldwide lives with significant disability. Far more see less sharply than a design team's monitors assume.",
    plain: "Text too faint to read",
    found: (n) =>
      `${n} ${n === 1 ? "piece" : "pieces"} of text on this page ${n === 1 ? "sits" : "sit"} too close in colour to the background behind ${n === 1 ? "it" : "them"}. ${n === 1 ? "It is" : "Each one is"} listed below, and the technical version gives the measured ratio.`,
    impact:
      "Hard to read in bright light, on a cheap screen, or with imperfect eyesight. Your message doesn't land.",
  },
  "image-alt": {
    research:
      "WebAIM checks a million homepages every year. Images with no description sit among its most common failures, year after year. It is also one of the simplest to resolve.",
    plain: "Images have no description",
    found: (n) =>
      `${n} ${n === 1 ? "image has" : "images have"} no alt text at all — not even an empty one to mark ${n === 1 ? "it" : "them"} decorative. A screen reader falls back to reading the filename aloud, or skips ${n === 1 ? "it" : "them"} in silence.`,
    impact:
      "Screen reader users hear nothing for these images, and search engines can't tell what they show. It costs you both accessibility and SEO.",
  },
  "svg-img-alt": {
    plain: "Icons have no description",
    found: (n) =>
      `${n} ${n === 1 ? "icon is" : "icons are"} marked in the code as ${n === 1 ? "a picture" : "pictures"} but ${n === 1 ? "carries" : "carry"} no words saying what ${n === 1 ? "it shows" : "they show"}.`,
    impact:
      "Often the icon is the only label on a control: a magnifying glass for search, a basket for the cart. A screen reader reaches it and has nothing to announce.",
  },
  "input-image-alt": {
    plain: "Image button has no description",
    found: (n) =>
      `${n} ${n === 1 ? "image used as a button has" : "images used as buttons have"} no alt text, so there is nothing to announce and nothing to read.`,
    impact: "Screen reader users can't tell what the button does, so they can't finish.",
  },
  "link-name": {
    research:
      "Empty links are among the most common failures in WebAIM's annual survey of a million homepages. Screen reader users navigate by pulling up a list of links. One silent link costs more than it looks.",
    plain: "Links have no readable text",
    found: (n) =>
      `${n} ${n === 1 ? "link has" : "links have"} no readable text inside — no words, no label, nothing to announce. ${n === 1 ? "Usually this is an icon, arrow or image used as a link." : "Usually these are icons, arrows or images used as links."} The picture carries the meaning and the code carries none of it.`,
    impact:
      "Screen reader users rarely read a page top to bottom. They pull up a list of every link and pick from it, the way you scan a menu. A link with no text appears in that list as the single word \"link\": no destination, no clue. Several of them turn the list into \"link, link, link\". The only way through is to open each one and see where it lands.",
  },
  "link-text-vague": {
    plain: "Links say only \"read more\"",
    impact:
      "Screen reader users can pull up a list of every link on the page. When they all read the same, the list is no help at all.",
  },
  "button-name": {
    research:
      "Unlabelled buttons sit near the top of WebAIM's annual survey of a million homepages, year after year. Usually they are icon-only controls that were obvious to whoever designed them.",
    plain: "Buttons have no label",
    found: (n) =>
      `${n} ${n === 1 ? "button has" : "buttons have"} no label of any kind: no words inside, no aria-label. Nearly always an icon button, where the symbol carries the meaning and the code carries none of it.`,
    impact: "Nobody can tell what it does before clicking. A common reason people give up.",
  },
  label: {
    research:
      "Missing form labels sit near the top of WebAIM's annual survey of a million homepages. In the UK's Click-Away Pound research, most shoppers who met such a barrier left without a word. They took their spending elsewhere.",
    plain: "Form fields have no label",
    found: (n) =>
      `${n} form ${n === 1 ? "field is" : "fields are"} not joined to a label in the code. The words may sit right beside the field on screen, but nothing connects the two. A screen reader announces the field with no idea what it is for.`,
    impact:
      "Screen reader users don't know what goes in each box, so forms get abandoned, checkout included.",
  },
  "select-name": {
    plain: "A dropdown has no label",
    found: (n) =>
      `${n} ${n === 1 ? "dropdown has" : "dropdowns have"} no label in the code. ${n === 1 ? "It is" : "Each is"} announced as a list of options, with nothing saying what is being chosen.`,
    impact: "People can't tell what they're choosing. Errors and dropped forms follow.",
  },
  "document-title": {
    plain: "The page has no title",
    found: () =>
      `The page has no title, so a browser tab and a screen reader both fall back to the address.`,
    impact: "Tabs, bookmarks and search results show nothing useful.",
  },
  "html-has-lang": {
    research:
      "A missing document language is one of the few failures WebAIM finds on a majority of the web. It stays common largely because nobody notices it working badly.",
    plain: "The page declares no language",
    found: () => `The page does not declare what language it is written in.`,
    impact: "People hear your content in the wrong accent, which is hard to follow.",
  },
  "html-lang-valid": {
    plain: "The declared language is invalid",
    found: () => `The page declares a language, but not one that software recognises.`,
    impact: "People hear your words in the wrong voice, mispronounced.",
  },
  "heading-order": {
    plain: "Headings skip levels",
    found: (n) =>
      `The heading levels jump instead of stepping. In ${n} ${n === 1 ? "place" : "places"} a level is skipped — an h2 followed straight by an h4, or similar.`,
    impact: "Most screen reader users navigate by headings. They lose the thread.",
  },
  "page-has-heading-one": {
    plain: "No main heading",
    found: () =>
      `The page has no top level heading, so there is nothing naming what it is about.`,
    impact: "Nobody can tell at a glance what the page is about.",
  },
  "empty-heading": {
    plain: "An empty heading",
    found: (n) =>
      `${n} ${n === 1 ? "heading is" : "headings are"} empty: the tag is there, the words are not.`,
    impact: "People navigating by headings land on an entry that says nothing.",
  },
  "link-in-text-block": {
    plain: "Links marked by colour alone",
    found: (n) =>
      `${n} ${n === 1 ? "link inside running text is" : "links inside running text are"} marked only by colour, with no underline. Anyone who cannot separate those colours cannot see a link there.`,
    impact: "Readers who are colour blind can't tell a link from ordinary text.",
  },
  "meta-viewport": {
    plain: "Zooming is blocked",
    found: () => `The page blocks zooming, so anyone who needs to enlarge it on a phone cannot.`,
    impact: "Anyone who needs bigger text can't get it. On a phone, they just leave.",
  },
  "meta-viewport-large": {
    plain: "Zooming is capped",
    found: () =>
      `Zooming works, but the page caps it below the 500% that people with low vision are entitled to reach.`,
    impact:
      "Milder than blocking zoom outright, and it fails the same people. Anyone who needs very large text gets to the cap and no further.",
  },
  "frame-title": {
    plain: "An embedded frame has no title",
    found: (n) =>
      `${n} embedded ${n === 1 ? "frame has" : "frames have"} no title, so ${n === 1 ? "it is" : "they are"} announced only as "frame".`,
    impact: "Screen reader users can't tell what's in it, or whether it's worth their time.",
  },
  "duplicate-id-active": {
    plain: "Two controls share one code id",
    found: (n) =>
      `${n} ${n === 1 ? "id is" : "ids are"} used more than once on controls, so labels and references can point at the wrong element.`,
    impact: "Screen readers get confused and the wrong thing responds when someone clicks.",
  },
  list: {
    plain: "A list not coded as one",
    found: (n) =>
      `${n} ${n === 1 ? "list is" : "lists are"} built with something other than list items inside. The grouping exists on screen and not in the code.`,
    impact: "Screen reader users aren't told how many items there are, and can't skip through them.",
  },
  listitem: {
    plain: "List items outside any list",
    found: (n) =>
      `${n} list ${n === 1 ? "item sits" : "items sit"} outside any list. A screen reader never announces how many there are, or where the group starts.`,
    impact: "Screen reader users lose the grouping, so the content stops making sense.",
  },
  "aria-required-attr": {
    plain: "A control missing its state",
    found: (n) =>
      `${n} ${n === 1 ? "control is" : "controls are"} labelled as something with a state: checked, expanded, a value on a scale. ${n === 1 ? "It never says" : "None of them says"} what that state is.`,
    impact: "Screen reader users can't tell what state it's in, or how to work it.",
  },
  "aria-hidden-focus": {
    plain: "Hidden items still catch keyboard focus",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} hidden from screen readers while still reachable by keyboard. Focus lands somewhere that announces nothing.`,
    impact: "Someone tabbing through lands on something their screen reader won't read. The page feels broken.",
  },
  "aria-dialog-name": {
    plain: "A pop-up with no name",
    found: (n) =>
      `${n} ${n === 1 ? "pop-up has" : "pop-ups have"} nothing naming ${n === 1 ? "it" : "them"}, so ${n === 1 ? "it is" : "they are"} announced as "dialog" and nothing else.`,
    impact:
      "It is announced as \"dialog\" and nothing else. Something has taken over the screen and there is no way to hear what it is.",
  },
  "nested-interactive": {
    plain: "One control inside another",
    found: (n) =>
      `${n} ${n === 1 ? "control contains another control" : "controls each contain another control"}. What looks like one thing to click is two wrapped around each other.`,
    impact:
      "Screen readers announce the outer one and hide what is inside it, so the inner control is unreachable. Which of the two a click or a keypress activates is anyone's guess.",
  },
  "presentation-role-conflict": {
    plain: "A working control marked as decoration",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} marked to be ignored while still being reachable and usable. The code contradicts itself about whether ${n === 1 ? "it exists" : "they exist"}.`,
    impact:
      "The code says to ignore it and the element says to use it. Screen readers resolve that inconsistently, so some people never find it.",
  },
  region: {
    plain: "Page areas unnamed in the code",
    found: (n) =>
      `Some of this page sits outside any named area. ${n} ${n === 1 ? "block of content has" : "blocks of content have"} no header, nav, main or footer around ${n === 1 ? "it" : "them"}.`,
    impact: "Screen reader users can't skip ahead. They hear everything, every time.",
  },
  "landmark-one-main": {
    plain: "Nothing marks the main content",
    found: () =>
      `The page has no main region marking where the content starts, so there is nothing to skip to.`,
    impact: "Screen reader users sit through the whole menu on every single page.",
  },
  tabindex: {
    plain: "Tab order jumps around",
    found: (n) =>
      `${n} ${n === 1 ? "element uses" : "elements use"} a positive tabindex. It forces ${n === 1 ? "the element" : "them"} to the front of the tab order, wherever ${n === 1 ? "it sits" : "they sit"} on the page.`,
    impact: "People who can't use a mouse get thrown around the page.",
  },
  "scrollable-region-focusable": {
    plain: "Scrollable area unreachable by keyboard",
    found: (n) =>
      `${n} ${n === 1 ? "area scrolls" : "areas scroll"} but cannot be reached with the keyboard. Whatever has scrolled out of view is unreachable without a mouse.`,
    impact: "Without a mouse, you can't scroll to what's inside.",
  },

  // Keyboard walk-through checks (WCAG 2.4.7 Focus Visible, 2.1.2 No
  // Keyboard Trap, 2.1.1 Keyboard) — from real Tab presses during the scan.
  "keyboard-mouse-only": {
    research:
      "Decades of usability research, much of it from the Nielsen Norman Group, keeps reaching one conclusion. Keyboard access serves power users as much as people who cannot hold a mouse.",
    // "Something on the page" was hedging about a thing we had measured. The
    // scan watched this element take a click handler and then watched Tab
    // never reach it, so it is a control — that is what a control is — and
    // saying so is both more accurate and more confident than "something".
    plain: "A control the keyboard can't reach",
    impact:
      "There is no workaround for this one. Anyone who cannot use a mouse cannot do whatever this control does. If it's a Buy button or a form step, that's the end of the visit.",
  },
  "keyboard-no-visible-focus": {
    plain: "Nothing shows where the keyboard is",
    impact:
      "Plenty of people never touch a mouse. Without a visible highlight they're navigating blind, and they give up.",
  },
  "readability-dense-prose": {
    plain: "The writing needs university-level reading",
    impact:
      "Not a legal requirement, and the change with the widest reach in this whole report. It helps people with cognitive disabilities and anyone who reads in a second language. GOV.UK deliberately writes at roughly the reading age of a nine year old. That isn't a simple site; it's one that's well written.",
  },
  "typo-leading-for-measure": {
    plain: "Long lines set too close together",
    // No canned `found` here on purpose — unlike most rules, this one's
    // own finding.description already carries the actual measurement
    // (characters per line, the leading ratio, the comfortable value),
    // computed per block by analyzeTypography.ts. A generic line said less
    // than the number already sitting in the finding, so whatWeFound()
    // falls through to it instead.
    impact:
      "The eye doesn't glide along a line, it jumps. The hardest jump is back to the start of the next one. The longer the line, the more room the eye needs to land on the right one. Get it wrong and you reread a line, or skip one.",
  },
  "reading-order-mismatch": {
    plain: "Tab order contradicts the visible order",
    impact:
      "CSS moved them on screen without moving them in the page's code, and the Tab key follows the code. It bites hardest on a pair like Cancel and Submit. The button under your cursor is not the one the keyboard is on. Screen reader users get the same mismatch — they are read the code order too.",
  },

  // Forced Colors Mode — Windows High Contrast. Checked by switching the mode
  // on and seeing what disappears.
  "forced-colors-focus-lost": {
    plain: "Focus marker vanishes in High Contrast",
    impact:
      "High contrast mode is for people who can't make out detail at low contrast. It strips away the shadows and colours most focus highlights are drawn with. So the people who most need to see where they are see nothing. Your page looks perfect until that mode is switched on.",
  },
  "forced-colors-icon-lost": {
    plain: "Icon button vanishes in High Contrast",
    impact:
      "The icon is drawn as a background image, and that mode removes background images. The button still works, but renders as an empty box: no picture, no label, no hint that it is a button.",
  },
  "keyboard-faint-focus": {
    // "The outline" assumed the reader already knew which outline was meant.
    // "Keyboard marker" introduces the thing and names it in one phrase; the
    // paragraph below is where it gets explained.
    plain: "Keyboard marker too faint to see",
    impact:
      "Tab moves an invisible cursor from one control to the next. The outline is the only thing that shows where it has got to. Too faint, and a keyboard user cannot tell what they are about to activate. So they press Enter and hope, or start again from the top. It slips through testing easily, because there genuinely is an outline there. It only shows up when you put the mouse down and try the page yourself.",
  },
  "keyboard-focus-trap": {
    plain: "Keyboard focus gets stuck",
    impact:
      "A keyboard user who reaches this point cannot go further. One of the worst failures a site can have.",
  },

  // Component design suggestions (forms, menus) — from the ARIA Authoring
  // Practices. Framed as "here's a better way to build this."
  "component-form-autocomplete": {
    plain: "Form fields block autofill",
    impact:
      "Everyone retypes their name, email and address by hand. Slow for all, a real barrier for some.",
  },
  "component-input-type": {
    plain: "Plain boxes for email and phone",
    impact:
      "On phones, visitors get the generic keyboard instead of one with \"@\" or a number pad. More taps, more mistakes.",
  },
  "component-required-cue": {
    plain: "Required fields not visibly marked",
    impact:
      "Nobody knows a field was required until the form rejects them. Signups fail.",
  },
  "component-submit-clarity": {
    plain: "No clearly labelled submit button",
    impact:
      "A button that just says \"Go\", shows only an icon, or is missing entirely leaves people unsure how to finish. So they don't.",
  },
  "component-nav-labels": {
    plain: "Several menus, none labelled",
    impact:
      "Screen reader users hear \"navigation… navigation…\" with no way to tell the main menu from the footer links. Getting around your site becomes guesswork.",
  },
  "component-skip-link": {
    plain: "No \"skip to content\" link",
    impact:
      "Keyboard users tab through your entire menu on every page. Dozens of extra presses each visit.",
  },

  // Mobile-only issues from the phone-width render pass.
  "mobile-target-spacing": {
    plain: "Tap targets sit too close",
    found: (n) =>
      `${n} pair${n === 1 ? "" : "s"} of controls sit less than 8px apart at phone width. Each is big enough on its own; together they leave no room to miss.`,
    impact:
      "A thumb is not a cursor. A finger that aims for one control and lands on its neighbour taps or buys the wrong thing. People with tremors or larger fingers meet it first.",
  },
  "mobile-sticky-coverage": {
    plain: "Pinned bars crowd the phone screen",
    found: () =>
      `Pinned headers, banners or toolbars hold more than a third of the screen at phone width.`,
    impact:
      "Every pinned pixel is one the visitor cannot read the page through. Anything the keyboard focuses can end up hidden behind the bars. The next version of the standard, WCAG 2.2, makes exactly that a requirement.",
  },
  "mobile-horizontal-scroll": {
    plain: "The page scrolls sideways on phones",
    impact:
      "Most visitors are on phones. Swiping sideways to read each line makes them leave.",
  },
  "mobile-tap-target": {
    plain: "Tap targets too small",
    impact:
      "Taps that miss, and frustration. Worst for bigger fingers, tremors, or shaky hands. It costs you sales.",
  },

  // Text resizing — WCAG 1.4.4 / 1.4.12, measured by actually applying the
  // reader's overrides and looking at what breaks.
  "text-spacing-clipped": {
    plain: "Text clipped at wider spacing",
    impact:
      "Many dyslexic readers widen spacing just to read. Here the words don't reflow. They disappear behind a fixed box.",
  },
  "text-zoom-clipped": {
    plain: "Text clipped at larger sizes",
    impact:
      "A bigger font size is the commonest fix for weak eyesight, far more common than screen readers. Your boxes stay put, so the words vanish.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Enlarged text scrolls sideways",
    impact:
      "Every line forces you sideways. That's exhausting, and most people give up.",
  },

  // Dark patterns — manipulative marketing/UX. These don't affect the
  // accessibility score; they're trust and (for consent) legal red flags.
  "dark-consent-no-reject": {
    plain: "Cookie banner without a refuse option",
    impact:
      "Under GDPR, refusing has to be as easy as accepting. Consent collected this way can be invalid. Visitors read a missing \"Reject\" button as a trick.",
  },
  "dark-consent-asymmetry": {
    plain: "Cookie banner plays down \"reject\"",
    impact:
      "One option as a button and the other as plain text nudges people to agree. Regulators look for this.",
  },
  "dark-preselected-optin": {
    plain: "Marketing opt-in ticked in advance",
    impact:
      "GDPR says a pre-ticked box isn't consent. People who miss it feel signed up without agreeing.",
  },
  "dark-confirmshaming": {
    plain: "\"No thanks\" worded to shame",
    impact:
      "\"No thanks, I don't want to save money\" is memorable for the wrong reasons. It reads as manipulation.",
  },
  "dark-fake-scarcity": {
    plain: "Scarcity claims worth verifying",
    impact:
      "Regulators pursue fake scarcity. Shoppers have learned to distrust it. Invented numbers cost more sales than they win.",
  },
  "dark-fake-urgency": {
    plain: "Time pressure worth verifying",
    impact:
      "Countdowns that reset on reload are a deceptive practice. Once noticed, nothing else you claim is believed.",
  },

  // Modal / pop-up dialogs — ARIA dialog pattern.
  "dialog-close-unlabeled": {
    plain: "Close button with no label",
    impact:
      "Screen reader users hear only \"button\" and can't tell how to close the pop-up. It traps them, and many will simply leave your site.",
  },
  "dialog-keyboard-trap": {
    plain: "A pop-up traps keyboard users",
    impact:
      "Someone using only a keyboard hits this pop-up and stops there. Escape doesn't close it. Tab just cycles around the buttons inside, so they can't reach the page or leave the pop-up. Closing the tab is the only way out. If this is your cookie banner, it happens before they have seen anything at all.",
  },
  "dialog-no-escape": {
    plain: "Pop-up ignores the Escape key",
    impact:
      "Escape is the key everyone reaches for first. Nobody is stuck here, since you can still tab away. But every keyboard user tries it, and nothing happens.",
  },
  "dialog-focus-not-moved": {
    plain: "Pop-up never receives the cursor",
    impact:
      "Someone using a screen reader is never told it opened. A keyboard user has to tab through the entire page underneath before reaching the thing now covering their screen.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Closing a pop-up loses your place",
    impact:
      "Anyone who had tabbed halfway down has to start again from the beginning.",
  },
  "dialog-no-close": {
    plain: "No obvious close button",
    impact:
      "If clicking outside is the only way out, keyboard users get stuck behind it.",
  },
  "dialog-missing-role": {
    plain: "Overlay not marked as a dialog",
    impact:
      "Screen readers don't announce it opened, and people tab straight off into the hidden page behind.",
  },
  "dialog-missing-name": {
    plain: "Pop-up doesn't say what it's for",
    impact:
      "When it opens, a screen reader just says \"dialog\". The visitor has no idea what it's asking or why.",
  },

  // Raw-HTML markup validation.
  "markup-validation": {
    plain: "Errors in the page's code",
    impact:
      "Browsers quietly guess how to fix it, and each one guesses differently. Your page may not work the way you think.",
  },

  // Motion/animation checks (WCAG 2.2.2 Pause, Stop, Hide).
  "motion-marquee": {
    plain: "Scrolling text that can't be paused",
    impact:
      "Text that moves is hard for everyone to read. For anyone with attention or balance problems it's unusable.",
  },
  "motion-autoplay-media": {
    plain: "Media plays by itself",
    impact:
      "Nobody can stop it. It's disorienting, and it drowns out screen readers.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "Animation ignores reduced-motion settings",
    impact:
      "Perpetual movement pulls attention away from your content. For people with balance disorders it can bring on dizziness or nausea.",
  },

  // Micro-typography checks, grounded in Jost Hochuli's "Detail in
  // Typography" (Hyphen Press) — reported as design-clarity notes.
  "typo-caps-letterspacing": {
    plain: "Capitals set without letter spacing",
    impact:
      "Capital letters form uniform blocks; without a little extra space between them, headings and labels become hard to scan.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Extra space forced between letters",
    impact:
      "Extra space between lowercase letters breaks up the word shapes people recognise, and that slows everyone down.",
  },
  "typo-negative-letterspacing": {
    plain: "Letters squeezed until they touch",
    impact: "Cramped letters blur into one another. Especially at small sizes or for readers with low vision.",
  },
  "typo-line-length-long": {
    plain: "Lines run too long",
    impact:
      "Past about 75 characters a line, the eye loses its place jumping back.",
  },
  "typo-line-length-short": {
    plain: "Lines chopped too short",
    impact: "When almost every phrase breaks onto a new line, reading rhythm falls apart. The content feels harder than it is.",
  },
  "typo-leading-tight": {
    plain: "Lines set too close together",
    impact: "Cramped lines make it easy to reread or skip one. Tiring for everyone, a real barrier for dyslexic readers.",
  },
  "typo-justified-no-hyphens": {
    plain: "Justified text without hyphenation",
    impact:
      "Justified text stretches the spaces between words to fill each line. The uneven gaps form distracting \"rivers\" of white space down the page.",
  },
  "typo-font-size-small": {
    plain: "Body text set very small",
    impact: "Small text pushes away anyone reading on a phone, in poor light, or with eyesight that isn't perfect.",
  },
  "typo-typeface-count": {
    plain: "Too many typefaces",
    impact: "More than two or three typefaces looks cluttered and makes the page feel less trustworthy.",
  },

  // Readability / neurodiversity checks — grounded in GOV.UK's accessibility
  // dos-and-don'ts and the Neurodiversity Design System (dyslexia, ADHD).
  "typo-underline-nonlink": {
    plain: "Underlined text that isn't a link",
    impact:
      "Underlines read as links, so people click text that goes nowhere.",
  },
  "typo-italic-body": {
    plain: "Whole passages in italics",
    impact:
      "Slanted letters get hard past a few words. A real barrier with dyslexia or weak eyesight.",
  },
  "typo-allcaps-block": {
    plain: "Long passages in ALL CAPITALS",
    impact:
      "Capitals strip out the word shapes we read by. Slow and tiring, worst for dyslexic readers.",
  },
  "typo-thin-weight": {
    plain: "Body text in hairline weight",
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
export const PLAIN_RULE_FIXES: Record<string, string> = {
  "aria-allowed-role": "Remove the role attribute, or use an element that genuinely is that thing. A <button> for a button, a <nav> for navigation.",
  "aria-allowed-attr": "Remove the aria-* attributes that do not apply to this element, or change the element to one that supports them.",
  "aria-required-children": "Give the component the child elements its role requires, e.g. a role=\"list\" needs role=\"listitem\" children.",
  "landmark-unique": "Give each area a distinct aria-label, so \"Main menu\" and \"Footer links\" are told apart.",
  "landmark-no-duplicate-banner": "Keep one <header> at the top level of the page and turn the others into plain containers.",
  "landmark-no-duplicate-contentinfo": "Keep one <footer> at the top level of the page and turn the others into plain containers.",
  "landmark-contentinfo-is-top-level": "Move the <footer> out so it is a direct child of <body>, not nested inside another region.",
  "skip-link": "Point the skip link at an id that exists on the main content. Make sure that target can take keyboard focus.",
  "image-redundant-alt": "Give the image an empty alt (alt=\"\") when the text beside it already says the same thing.",
  "color-contrast":
    "Darken the text or lighten its background until they contrast strongly. Aim for 4.5:1 for normal text and 3:1 for large text. Large means about 24px, or 19px if it is bold.",
  "image-alt":
    'Add an alt attribute to each image describing what it shows. Use empty alt (alt="") only for purely decorative images.',
  "input-image-alt": 'Add an alt attribute to the image button describing its action (e.g. alt="Search").',
  "link-name":
    "Put readable words inside the link. For an icon or image link, add `aria-label` on the link, or alt text on the image. Describe the destination rather than the picture: `aria-label=\"Major partnerships\"` says where you are going, `aria-label=\"arrow\"` says nothing. Write it to read on its own, because in that list of links it will.\n\nWhere the link already shows words, keep those words inside the label. A label replaces the visible text for software instead of adding to it. Someone using voice control says what they can see. A label that says something else gives them no response at all.",
  "link-text-vague":
    "Write link text that makes sense on its own: \"Read the 2026 fee changes\", not \"Read more\". To keep the short version on screen, add the full wording with aria-label.",
  "button-name":
    "Give each button a clear label: visible text inside it, or an `aria-label` describing what it does.\n\nOne trap if the button already shows words: an `aria-label` replaces them for software rather than adding to them. The visible words must appear inside the label. Someone using voice control says what they can see — \"click Send\". If the label underneath says something else, nothing happens, with no way to find out why.",
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
    'Remove aria-hidden from anything reachable with the Tab key, or take it out of the tab order with tabindex="-1".',
  region: "Wrap page content in named sections: <header>, <nav>, <main>, <footer>, so nothing sits outside one.",
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
export const UNDECIDED_EXPLANATIONS: Record<string, { what: string; ask: string }> = {
  "color-contrast": {
    what: "Text sitting on a photograph, a video or a gradient. The checker can read the colour of the text. There is no single colour behind it to measure against, so it will not guess.",
    ask: "Ask your designer to check each one against the picture behind it, at its lightest and at its darkest. Where the words get lost, add a solid panel, a dark wash over the image, or move the text.",
  },
  "link-in-text-block": {
    what: "Links inside a paragraph that may be marked only by their colour. The checker cannot tell whether the difference is strong enough to stand on its own.",
    ask: "Ask your designer whether these links are still findable with the colour taken away. If colour is the only thing marking them, they need an underline or another visible cue.",
  },
  "video-caption": {
    what: "A video the checker can see and cannot watch. It has no way to tell whether captions exist, or whether they are any good.",
    ask: "Ask whoever made the video whether it carries captions and whether a person corrected them. Auto-generated captions on their own do not count.",
  },
  // The four media rows. Each says what was counted and what to ask,
  // because the checker cannot watch or listen to any of it — the count and
  // the location are the whole of what it can offer.
  "media-video-captions": {
    what: "Video on the page carrying no captions file. That is not proof it needs one: a silent clip needs nothing, and captions burned into the picture count but leave no file behind.",
    ask: "Ask whoever made each video whether anyone speaks in it. Where somebody does, it needs captions, corrected by a person. Auto-generated captions on their own do not count.",
  },
  "media-video-descriptions": {
    what: "Captioned video with nothing describing what is on screen. Captions carry the words; they do not carry the picture.",
    ask: "Ask whether anything in these videos is shown rather than said — a chart, a demonstration, text on screen. If so, that content needs describing in the audio or written out on the page.",
  },
  "media-audio-transcript": {
    what: "Audio on the page. A transcript is ordinary page text, so the checker has no way to tell whether one is here.",
    ask: "Check each recording has its words written out on the page near the player, and that the writing covers everything said.",
  },
  "media-embedded-player": {
    what: "Video played through another company's player. The video lives on their site, so the checker cannot look inside it.",
    ask: "Open each one and turn captions on. If the option is missing or the captions are wrong, fix them where the video is hosted.",
  },
  // Three rows about what the page listens for. A listener leaves no mark on
  // the page, so the checker can say one is there and nothing about what it
  // does when it fires.
  "interaction-motion-actuation": {
    what: "The page responds to the phone being tilted or shaken. Somebody who keeps their phone in a stand, or whose hands shake, cannot do that.",
    ask: "Ask your developer whether every action that needs a tilt or a shake can also be done by tapping something on screen.",
  },
  "interaction-key-shortcuts": {
    what: "The page watches for key presses across the whole screen. Where a plain letter is a shortcut, anyone speaking to their computer sets it off by talking.",
    ask: "Ask your developer whether any shortcut is a single letter or number on its own. Each one needs to be switchable off, changeable, or only active while the control is focused.",
  },
  "interaction-unmarked-language": {
    what: "Passages written in a different alphabet from the rest of the page, with nothing marking what language they are. A screen reader reads them with the wrong pronunciation, which can make them unintelligible.",
    ask: "Ask your developer to mark each passage with its language. Only a change of alphabet can be spotted automatically, so ask about passages in another language that shares ours too.",
  },
  "interaction-title-tooltip": {
    what: "Tooltips built from the title attribute. They appear only on hover, so a keyboard or touchscreen visitor never sees them. They also cannot be dismissed, and vanish if you move towards them to finish reading.",
    ask: "Ask your developer whether anything important is hidden in these. If it is, put it on the page, or build a tooltip that stays put and closes with Escape.",
  },
  "interaction-orientation-lock": {
    what: "A stylesheet here rotates the page back, or hides it, when the phone is turned. That is the shape of a page locked to one orientation. It can also be a deliberate landscape view for something wide.",
    ask: "Ask your developer whether the page works both ways up. Somebody whose phone is fixed to a wheelchair or a stand cannot turn it to suit the site.",
  },
  "interaction-no-status-region": {
    what: "Nothing on this page is set aside for announcing a change. Pages update without reloading all the time: a filter narrows a list, a form says it saved. Somebody using a screen reader hears that only if the page has somewhere to say it.",
    ask: "Ask your developer whether anything here updates without a page load. If it does, that update needs a live region so it is spoken as well as shown.",
  },
  "interaction-acts-on-change": {
    what: "Menus or tick boxes that look like they act the moment you set them, rather than waiting for a button. We read this from the code and did not try it: setting controls on your live site could place a real order.",
    ask: "Ask your developer whether choosing an option here submits or moves the page. If it does, add a button that does it instead, or warn people before the control that it will.",
  },
  "interaction-pointer-cancellation": {
    what: "Controls that act the moment they are pressed rather than when released. Press one by mistake and there is no way to slide off it and let go.",
    ask: "Ask your developer to make these act on release instead. Anyone whose hand slips, or who takes a moment to aim, can then move away before lifting.",
  },
  "aria-valid-attr-value": {
    what: "Code labels that point at another part of the page. The checker cannot always tell whether the thing they point at is really there.",
    ask: "Ask your developer to confirm every id referenced by an aria attribute exists on the page. None should sit inside a block that gets hidden or removed.",
  },
  "aria-allowed-role": {
    what: "Parts of the page labelled in the code as something they may not be able to be. Whether it is wrong depends on how the component behaves.",
    ask: "Ask your developer to confirm each behaves the way its role promises, keyboard included. Otherwise drop the role and use the native element.",
  },
  "aria-prohibited-attr": {
    what: "An element carrying a name the code may not let it keep. Whether it survives depends on the element's role.",
    ask: "Ask your developer to check each is announced with the name you intended. Where it is not, move the name onto an element allowed to carry one.",
  },
  "css-orientation-lock": {
    what: "Styles that may lock the page to portrait or landscape. The check that found this is experimental, which is why it is a question rather than a finding.",
    ask: "Ask your developer whether the page rotates with the device. Some people mount a phone or wheelchair tablet in one orientation and cannot turn it.",
  },
  "duplicate-id-aria": {
    what: "An id that may be used more than once. Every code label pointing at it follows only the first, so a name can silently attach to the wrong thing.",
    ask: "Ask your developer to make every id on the page unique, starting with any that an aria attribute refers to.",
  },
};

export function undecidedExplanation(ruleId: string) {
  return UNDECIDED_EXPLANATIONS[ruleId];
}
