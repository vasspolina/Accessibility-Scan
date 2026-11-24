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
      "Faint text, images with no description, video with no captions, audio with no transcript.",
  },
  "2": {
    principle: "Operable",
    plainTitle: "Can people use it?",
    plainDescription:
      "Whether people can get through your site with a keyboard, on a phone, by voice, or without fine hand control.",
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
      "Whether your site works in other browsers, on other devices and with screen readers.",
  },
};

// Returns undefined for "N/A", "WCAG (see rule help)" (axe's best-practice
// fallback label), or a missing criterion — callers should bucket these
// separately rather than dropping them.
//
// The title and description come back in the reader's language, because
// callers render them straight off this object. `principle` stays English:
// it is the key findings are grouped by, and the standard's own name.
// principleText() below has its translation for a caller that wants one.
export function classifyWcag(wcagCriterion: string | undefined): PrincipleInfo | undefined {
  const match = wcagCriterion?.match(/^([1-4])\./);
  if (!match) return undefined;
  const info = PRINCIPLES[match[1]];
  const lang = getLang();
  const hit = lang !== "en" ? PRINCIPLES_BY_LANG[lang]?.[match[1]] : undefined;
  return hit
    ? { principle: info.principle, plainTitle: hit.plainTitle, plainDescription: hit.plainDescription }
    : info;
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
  "reflow-height-unreachable": {
    plain: "Pinned panel hides its buttons",
    impact: "Someone who zooms in to read cannot reach these buttons at all.",
  },
  "reflow-height-pinned": {
    plain: "Pinned bars leave no reading room",
    impact: "Someone who zooms in sees the bars and almost nothing else.",
  },
  "reflow-height-pinned-advisory": {
    plain: "Pinned bars squeeze the zoomed page",
    impact: "Someone who zooms in sees a few lines at a time and loses their place.",
  },
  "contrast-over-image": {
    plain: "Text too faint on a picture",
    impact: "Readers with low vision lose words set on a busy or pale picture.",
  },
  "form-error-silent": {
    plain: "Form refuses without saying why",
    impact: "Someone who misses a field can't tell what went wrong, so many give up.",
  },
  "timing-meta-refresh": {
    plain: "The page reloads on a timer",
    impact: "Anyone still reading or filling in the form is thrown back to the start.",
  },
  "aria-allowed-role": {
    plain: "A role the element can't have",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} labelled in the code as something ${n === 1 ? "it" : "they"} can't be.`,
    impact: "Screen readers announce a link as a button, or a list as a heading.",
  },
  "aria-allowed-attr": {
    plain: "Screen-reader setting on the wrong element",
    found: (n) =>
      `${n} ${n === 1 ? "element carries settings its" : "elements carry settings their"} kind of tag is not allowed to have.`,
    impact: "Screen readers can announce nonsense, or skip the element entirely.",
  },
  "aria-prohibited-attr": {
    plain: "A label screen readers must ignore",
    found: (n) =>
      `${n} ${n === 1 ? "element carries" : "elements carry"} a label the code does not allow on that kind of tag.`,
    impact: "Screen readers ignore the label and announce whatever text is inside, often nothing.",
  },
  "aria-required-children": {
    plain: "Menus or lists missing their items",
    found: (n) =>
      `${n} ${n === 1 ? "control is labelled in the code as a menu or a list, but contains" : "controls are labelled in the code as menus or lists, but contain"} none of the items ${n === 1 ? "it needs" : "they need"}.`,
    impact: "Screen readers can't work out its structure, so people can't navigate it.",
  },
  "aria-required-parent": {
    plain: "List item outside its list",
    found: (n) =>
      `${n} ${n === 1 ? "element is labelled as part of a larger control, such as a tab, but sits" : "elements are labelled as parts of a larger control, such as a tab, but sit"} outside it.`,
    impact: "Screen readers can't say which one of how many it is.",
  },
  "landmark-unique": {
    plain: "Two page areas share one name",
    found: (n) =>
      `${n} ${n === 1 ? "region shares its name with another" : "regions share their names with others"}.`,
    impact: "Screen reader users get a list of identical entries and can't tell them apart.",
  },
  "landmark-no-duplicate-banner": {
    plain: "More than one page header",
    found: () =>
      `The page marks more than one area as its header.`,
    impact: "Screen readers list several headers, so nobody can tell which is the real one.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "More than one page footer",
    found: () =>
      `The page marks more than one area as its footer.`,
    impact: "Screen readers list several footers, and people can't tell which is which.",
  },
  "landmark-no-duplicate-main": {
    plain: "More than one main content area",
    found: () =>
      `More than one area is marked as the main content.`,
    impact: "\"Skip to main content\" can land people in the wrong part of the page.",
  },
  "landmark-banner-is-top-level": {
    plain: "Header nested inside another area",
    found: () =>
      `The header is tucked inside another region rather than alongside it.`,
    impact: "Screen reader users can't jump straight to it the way they expect.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Footer nested inside another area",
    found: () =>
      `The footer is tucked inside another region rather than alongside it.`,
    impact: "Screen reader users can't jump straight to it the way they expect.",
  },
  "skip-link": {
    plain: "Skip link goes nowhere",
    found: (n) =>
      `${n} skip ${n === 1 ? "link points" : "links point"} at something that is not on the page.`,
    impact: "Keyboard users press it and still tab through the whole menu.",
  },
  "component-skip-link-dead": {
    plain: "Skip link goes nowhere",
    found: (n) =>
      `${n} skip ${n === 1 ? "link points" : "links point"} at something that is not on the page.`,
    impact: "Keyboard users press it and still tab through the whole menu.",
  },
  "image-redundant-alt": {
    plain: "Image description repeats nearby text",
    found: (n) =>
      `${n} ${n === 1 ? "image repeats, in its alt text, the words already printed beside it" : "images repeat, in their alt text, the words already printed beside them"}.`,
    impact: "Screen reader users hear the same words twice.",
  },
  "color-contrast": {
    research:
      "WebAIM checks a million homepages every year. Low-contrast text is the most common failure it finds, year after year.",
    plain: "Text too faint to read",
    found: (n) =>
      `${n} ${n === 1 ? "piece" : "pieces"} of text on this page ${n === 1 ? "sits" : "sit"} too close in colour to the background behind ${n === 1 ? "it" : "them"}.`,
    impact: "Readers with weak eyesight, or in bright light, can't make out the words.",
  },
  "image-alt": {
    research:
      "WebAIM checks a million homepages every year. Images with no description sit among its most common failures, year after year.",
    plain: "Images have no description",
    found: (n) =>
      `${n} ${n === 1 ? "image has" : "images have"} no alt text at all.`,
    impact: "Screen reader users can't tell what these images show.",
  },
  "svg-img-alt": {
    plain: "Icons have no description",
    found: (n) =>
      `${n} ${n === 1 ? "icon is" : "icons are"} marked in the code as ${n === 1 ? "a picture" : "pictures"} but ${n === 1 ? "carries" : "carry"} no words saying what ${n === 1 ? "it shows" : "they show"}.`,
    impact: "Where the icon is the only label, screen readers have nothing to announce.",
  },
  "input-image-alt": {
    plain: "Image button has no description",
    found: (n) =>
      `${n} ${n === 1 ? "image used as a button has" : "images used as buttons have"} no alt text.`,
    impact: "Screen reader users can't tell what the button does.",
  },
  "link-name": {
    research:
      "Empty links are among the most common failures in WebAIM's annual survey of a million homepages.",
    plain: "Links have no readable text",
    found: (n) =>
      `${n} ${n === 1 ? "link has" : "links have"} no words and no label inside.`,
    impact: "Screen reader users hear only \"link\", with no clue where it goes.",
  },
  "link-text-vague": {
    plain: "Links say only \"read more\"",
    impact: "In a screen reader's list of links, they all read the same.",
  },
  // A finding of its own since axe-core 4.14.0 made the rule stable; before
  // that it reached the report only as an open question.
  "label-content-name-mismatch": {
    plain: "Spoken name differs from label",
    found: (n) =>
      `${n} ${n === 1 ? "control shows" : "controls show"} one set of words and ${n === 1 ? "carries" : "carry"} a different name in the code.`,
    impact: "People using voice control say the words they see, and nothing happens.",
  },
  "button-name": {
    research:
      "Unlabelled buttons sit near the top of WebAIM's annual survey of a million homepages, year after year. Usually they are icon-only controls that were obvious to whoever designed them.",
    plain: "Buttons have no label",
    found: (n) =>
      `${n} ${n === 1 ? "button has" : "buttons have"} no words inside and no name in the code.`,
    impact: "Screen reader users can't tell what it does before pressing it.",
  },
  label: {
    research:
      "Missing form labels sit near the top of WebAIM's annual survey of a million homepages. In the UK's Click-Away Pound research, most shoppers who met such a barrier left without a word.",
    plain: "Form fields have no label",
    found: (n) =>
      `${n} form ${n === 1 ? "field is" : "fields are"} not joined to a label in the code.`,
    impact: "Screen reader users don't know what goes in each box, so forms get abandoned.",
  },
  "select-name": {
    plain: "A dropdown has no label",
    found: (n) =>
      `${n} ${n === 1 ? "dropdown has" : "dropdowns have"} no label in the code.`,
    impact: "People can't tell what they're choosing.",
  },
  "document-title": {
    plain: "The page has no title",
    found: () =>
      `The page has no title, so the browser tab shows only the address.`,
    impact: "Tabs, bookmarks and search results show nothing useful.",
  },
  "html-has-lang": {
    research:
      "A missing document language is one of the few failures WebAIM finds on a majority of the web. It stays common because the failure is silent.",
    plain: "The page declares no language",
    found: () => `The page does not declare what language it is written in.`,
    impact: "People hear the content in the wrong accent, which is hard to follow.",
  },
  "html-lang-valid": {
    plain: "The declared language is invalid",
    found: () => `The page declares a language, but not one that software recognises.`,
    impact: "People hear the words in the wrong voice, mispronounced.",
  },
  "heading-order": {
    plain: "Headings skip levels",
    found: (n) =>
      `In ${n} ${n === 1 ? "place" : "places"} a heading level is skipped, such as an h2 followed by an h4.`,
    impact: "Screen reader users who navigate by headings lose the thread.",
  },
  "page-has-heading-one": {
    plain: "No main heading",
    found: () =>
      `The page has no top-level heading.`,
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
      `${n} ${n === 1 ? "link inside running text is" : "links inside running text are"} marked only by colour, with no underline.`,
    impact: "Readers who are colour blind can't tell a link from ordinary text.",
  },
  "meta-viewport": {
    plain: "Zooming is blocked",
    found: () =>
      `The page stops anyone enlarging it on a phone.`,
    impact: "Anyone who needs bigger text can't get it.",
  },
  "meta-viewport-large": {
    plain: "Zoom limited to a fixed level",
    found: () =>
      `Zooming works, but the page caps it below 500%.`,
    impact: "Anyone who needs very large text hits the cap and gets no further.",
  },
  "frame-title": {
    plain: "An embedded frame has no title",
    found: (n) =>
      `${n} embedded ${n === 1 ? "frame has" : "frames have"} no title, so ${n === 1 ? "it is" : "they are"} announced only as "frame".`,
    impact: "Screen reader users can't tell what's in it.",
  },
  "duplicate-id-active": {
    plain: "Two controls share one code id",
    found: (n) =>
      `${n} ${n === 1 ? "id is" : "ids are"} used more than once on controls.`,
    impact: "Screen readers can read out the wrong control's label.",
  },
  list: {
    plain: "A list not coded as one",
    found: (n) =>
      `${n} ${n === 1 ? "list is" : "lists are"} built with something other than list items inside.`,
    impact: "Screen reader users aren't told how many items there are.",
  },
  listitem: {
    plain: "List items outside any list",
    found: (n) =>
      `${n} list ${n === 1 ? "item sits" : "items sit"} outside any list.`,
    impact: "Screen reader users lose the grouping.",
  },
  "aria-required-attr": {
    plain: "A control missing a required state",
    found: (n) =>
      `${n} ${n === 1 ? "control is labelled as having a state, such as checked or expanded, but never says" : "controls are labelled as having a state, such as checked or expanded, but never say"} what it is.`,
    impact: "Screen reader users can't tell what state it's in.",
  },
  "aria-hidden-focus": {
    plain: "Hidden items still catch keyboard focus",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} hidden from screen readers while still reachable by keyboard.`,
    impact: "Keyboard users land on something their screen reader won't read.",
  },
  "aria-dialog-name": {
    plain: "A pop-up with no name",
    found: (n) =>
      `${n} ${n === 1 ? "pop-up has" : "pop-ups have"} nothing naming ${n === 1 ? "it" : "them"}, so ${n === 1 ? "it is" : "they are"} announced as "dialog" and nothing else.`,
    impact: "Screen reader users can't hear what has taken over the screen.",
  },
  "nested-interactive": {
    plain: "A control nested inside another",
    found: (n) =>
      `${n} ${n === 1 ? "control contains another control" : "controls each contain another control"}.`,
    impact: "The inner control is hidden from screen readers and can't be reached.",
  },
  "presentation-role-conflict": {
    plain: "A working control marked as decoration",
    found: (n) =>
      `${n} ${n === 1 ? "element is" : "elements are"} marked to be ignored while still being reachable and usable.`,
    impact: "Some screen readers ignore it, so their users never find it.",
  },
  region: {
    plain: "Page areas unnamed in the code",
    found: (n) =>
      `${n} ${n === 1 ? "block of content has" : "blocks of content have"} no header, nav, main or footer around ${n === 1 ? "it" : "them"}.`,
    impact: "Screen reader users can't skip ahead, so they hear everything every time.",
  },
  "landmark-one-main": {
    plain: "Nothing marks the main content",
    found: () =>
      `The page has no main region marking where the content starts, so there is nothing to skip to.`,
    impact: "Screen reader users sit through the whole menu on every page.",
  },
  tabindex: {
    plain: "Tab order jumps around",
    found: (n) =>
      `${n} ${n === 1 ? "element uses" : "elements use"} a positive tabindex, which pulls ${n === 1 ? "it" : "them"} to the front of the tab order.`,
    impact: "Keyboard users get thrown around the page.",
  },
  "scrollable-region-focusable": {
    plain: "Scrollable area unreachable by keyboard",
    found: (n) =>
      `${n} ${n === 1 ? "area scrolls" : "areas scroll"} but can't be reached with the keyboard.`,
    impact: "Without a mouse, there's no way to scroll to what's inside.",
  },

  // Keyboard walk-through checks (WCAG 2.4.7 Focus Visible, 2.1.2 No
  // Keyboard Trap, 2.1.1 Keyboard) — from real Tab presses during the scan.
  "keyboard-mouse-only": {
    research:
      "Decades of usability research, much of it from the Nielsen Norman Group, keeps reaching one conclusion. Keyboard access serves power users as much as people who can't hold a mouse.",
    // "Something on the page" was hedging about a thing we had measured. The
    // scan watched this element take a click handler and then watched Tab
    // never reach it, so it is a control — that is what a control is — and
    // saying so is both more accurate and more confident than "something".
    plain: "A control the keyboard can't reach",
    impact: "Anyone who can't use a mouse can't use this control at all.",
  },
  "keyboard-no-visible-focus": {
    plain: "You can't see which item has keyboard focus",
    impact: "Keyboard users can't see where they are, and give up.",
  },
  "readability-dense-prose": {
    plain: "The writing needs university-level reading",
    impact: "Readers with cognitive disabilities, or in a second language, can't follow it.",
  },
  "typo-leading-for-measure": {
    plain: "Lines set too close together",
    // No canned `found` here on purpose — unlike most rules, this one's
    // own finding.description already carries the actual measurement
    // (characters per line, the leading ratio, the comfortable value),
    // computed per block by analyzeTypography.ts. A generic line said less
    // than the number already sitting in the finding, so whatWeFound()
    // falls through to it instead.
    impact: "Readers jumping back to the start of each line land on the wrong one.",
  },
  "reading-order-mismatch": {
    plain: "Tab order differs from the order on screen",
    impact: "Keyboard users can end up on Submit when they meant Cancel.",
  },

  // Forced Colors Mode — Windows High Contrast. Checked by switching the mode
  // on and seeing what disappears.
  "forced-colors-focus-lost": {
    plain: "Focus marker vanishes in High Contrast",
    impact: "People using High Contrast mode can't see where the keyboard is.",
  },
  "forced-colors-icon-lost": {
    plain: "Icon button vanishes in High Contrast",
    impact: "In High Contrast mode the button shows as an empty box.",
  },
  "keyboard-faint-focus": {
    // "The outline" assumed the reader already knew which outline was meant.
    // "Keyboard marker" introduces the thing and names it in one phrase; the
    // paragraph below is where it gets explained.
    plain: "Keyboard marker too faint to see",
    impact: "Keyboard users can't tell what they are about to activate.",
  },
  "keyboard-focus-trap": {
    plain: "Keyboard focus gets stuck",
    impact: "A keyboard user who reaches this point can't go any further.",
  },

  // Component design suggestions (forms, menus) — from the ARIA Authoring
  // Practices. Framed as "here's a better way to build this."
  // The screen-reader name-quality rules. Each is one grouped card whose
  // count lives in the backend's description, so no found() here — the
  // fallback shows that description verbatim.
  "sr-filename-alt": {
    plain: "Image descriptions are filenames",
    impact: "Screen reader users hear a filename where the image's meaning should be.",
  },
  "sr-vague-link-name": {
    plain: "Links named \"click here\"",
    impact: "Screen reader users listing the links have nothing to choose by.",
  },
  "sr-symbol-button-name": {
    plain: "Buttons named only with a symbol",
    impact: "Screen reader users can't tell what pressing the button does.",
  },
  "sr-vague-button-name": {
    plain: "Button names that say nothing",
    impact: "Screen reader users hear \"times, button\" where others see a close cross.",
  },
  "form-field-placeholder-label": {
    plain: "Fields labelled only by placeholders",
    impact: "The hint vanishes as people type, so they can't check what went where.",
  },
  "component-form-autocomplete": {
    plain: "Form fields block autofill",
    impact: "Everyone retypes their details by hand, a real barrier for some.",
  },
  "component-input-type": {
    plain: "Email fields typed as plain text",
    impact: "Phone users get the wrong keyboard, so typing takes longer.",
  },
  "component-required-cue": {
    plain: "Required fields not visibly marked",
    impact:
      "Nobody knows a field was required until the form rejects them. Sign-ups fail.",
  },
  "component-submit-clarity": {
    plain: "No clearly labelled submit button",
    impact: "People aren't sure how to finish the form, so they don't.",
  },
  "component-table-no-headers": {
    plain: "A table with no header cells",
    impact: "Screen reader users hear bare values with no column or row names.",
  },
  "component-nav-labels": {
    plain: "Navigation menus with no names",
    impact: "Screen reader users can't tell the main menu from the footer links.",
  },
  "component-skip-link": {
    plain: "No \"skip to content\" link",
    impact: "Keyboard users tab through the whole menu on every page.",
  },

  // Mobile-only issues from the phone-width render pass.
  "mobile-target-spacing": {
    plain: "Tap targets sit too close",
    found: (n) =>
      `${n} pair${n === 1 ? "" : "s"} of controls ${n === 1 ? "sits" : "sit"} less than 8px apart at phone width.`,
    impact: "People with tremors or larger fingers tap the wrong thing.",
  },
  "consent-blocks-reader": {
    plain: "The cookie banner blocks screen readers",
    found: () =>
      `The cookie banner hides the whole page from screen readers, and keyboard focus never reaches the banner.`,
    impact: "Screen reader users hear silence and can't find the banner to clear it.",
  },
  "mobile-sticky-coverage": {
    plain: "Pinned bars crowd the phone screen",
    found: () =>
      `Pinned headers, banners or toolbars hold more than a third of the screen at phone width.`,
    impact: "Phone visitors read the page through a narrow gap.",
  },
  "mobile-horizontal-scroll": {
    plain: "The page scrolls sideways on phones",
    impact: "Phone visitors swipe sideways for every line, and many leave.",
  },
  "mobile-tap-target": {
    plain: "Tap targets too small",
    impact: "People with bigger fingers or shaky hands miss them.",
  },

  // Text resizing — WCAG 1.4.4 / 1.4.12, measured by actually applying the
  // reader's overrides and looking at what breaks.
  "text-spacing-clipped": {
    plain: "Text clipped at wider spacing",
    impact: "Dyslexic readers who widen spacing lose words behind a fixed box.",
  },
  "text-zoom-clipped": {
    plain: "Text clipped at larger sizes",
    impact: "People who enlarge text for weak eyesight lose the words.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Enlarged text scrolls sideways",
    impact: "People who enlarge text scroll sideways on every line, and most give up.",
  },

  // Dark patterns — manipulative marketing/UX. These don't affect the
  // accessibility score; they're trust and (for consent) legal red flags.
  "dark-consent-no-reject": {
    plain: "Cookie banner without a refuse option",
    impact: "Under GDPR, consent collected without an easy refusal can be invalid.",
  },
  "dark-consent-asymmetry": {
    plain: "Cookie banner plays down \"reject\"",
    impact: "Making refusal plain text nudges people to agree, and regulators look for it.",
  },
  "dark-preselected-optin": {
    plain: "Marketing opt-in ticked in advance",
    impact: "Under GDPR, a pre-ticked box isn't consent.",
  },
  "dark-confirmshaming": {
    plain: "\"No thanks\" worded to shame",
    impact: "Visitors read the wording as manipulation.",
  },
  "dark-fake-scarcity": {
    plain: "Low-stock claims used as pressure",
    impact: "Regulators pursue fake scarcity, and shoppers have learned to distrust it.",
  },
  "dark-fake-urgency": {
    plain: "Deadlines used as pressure",
    impact: "Once a fake countdown is noticed, nothing else the site claims is believed.",
  },

  // Modal / pop-up dialogs — ARIA dialog pattern.
  "dialog-close-unlabeled": {
    plain: "Close button with no label",
    impact: "Screen reader users hear only \"button\" and can't tell how to close it.",
  },
  "dialog-keyboard-trap": {
    plain: "Keyboard users can't leave a pop-up",
    impact: "Keyboard users are stuck, and closing the tab is the only way out.",
  },
  "dialog-no-escape": {
    plain: "Pop-up ignores the Escape key",
    impact: "Every keyboard user tries Escape first, and nothing happens.",
  },
  "dialog-focus-not-moved": {
    plain: "Pop-up opens without taking focus",
    impact: "Screen reader users are never told it opened.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Closing a pop-up loses your place",
    impact: "Keyboard users have to start again from the top.",
  },
  "dialog-no-close": {
    plain: "No obvious close button",
    impact: "If clicking outside is the only way out, keyboard users get stuck.",
  },
  "dialog-missing-role": {
    plain: "Overlay not marked as a dialog",
    impact: "Screen readers don't announce it, and people tab into the page behind.",
  },
  "dialog-missing-name": {
    plain: "Pop-up doesn't say what it's for",
    impact: "Screen reader users hear only \"dialog\", with no idea what it asks.",
  },

  // Raw-HTML markup validation.
  "markup-validation": {
    plain: "Invalid HTML in the page",
    impact: "Each browser guesses at the fix differently, so the page may break.",
  },

  // Motion/animation checks (WCAG 2.2.2 Pause, Stop, Hide).
  "motion-marquee": {
    plain: "Scrolling text that can't be paused",
    impact: "Moving text is unreadable for people with attention or balance problems.",
  },
  "motion-autoplay-media": {
    plain: "Media plays by itself",
    impact: "Nobody can stop it, and it drowns out screen readers.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "Animation ignores reduced-motion settings",
    impact: "Constant movement can make people with balance disorders dizzy or sick.",
  },

  // Micro-typography checks, grounded in Jost Hochuli's "Detail in
  // Typography" (Hyphen Press) — reported as design-clarity notes.
  "typo-caps-letterspacing": {
    plain: "Capitals set without letter spacing",
    impact: "Headings in tight capitals are hard to scan.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Extra space forced between letters",
    impact: "Spaced-out letters break up word shapes and slow everyone down.",
  },
  "typo-negative-letterspacing": {
    plain: "Letters squeezed until they touch",
    impact: "Cramped letters blur together for readers with low vision.",
  },
  "typo-line-length-long": {
    plain: "Lines run too long",
    impact: "Past about 75 characters, the eye loses its place on the way back.",
  },
  "typo-line-length-short": {
    plain: "Lines chopped too short",
    impact: "Reading rhythm falls apart when nearly every phrase starts a new line.",
  },
  "typo-justified-no-hyphens": {
    plain: "Justified text without hyphenation",
    impact: "Uneven word gaps form distracting rivers of white space.",
  },
  "typo-font-size-small": {
    plain: "Body text set very small",
    impact: "Small text is hard to read on a phone or with weak eyesight.",
  },
  "typo-typeface-count": {
    plain: "Too many typefaces",
    impact: "The page looks cluttered and less trustworthy.",
  },

  // Readability / neurodiversity checks — grounded in GOV.UK's accessibility
  // dos-and-don'ts and the Neurodiversity Design System (dyslexia, ADHD).
  "typo-underline-nonlink": {
    plain: "Underlined text that isn't a link",
    impact: "People click underlined text that goes nowhere.",
  },
  "typo-italic-body": {
    plain: "Whole passages in italics",
    impact: "Slanted letters tire readers with dyslexia or weak eyesight.",
  },
  "typo-allcaps-block": {
    plain: "Long passages in ALL CAPITALS",
    impact: "Capitals strip out word shapes, which slows dyslexic readers most.",
  },
  "typo-thin-weight": {
    plain: "Body text in hairline weight",
    impact: "Thin strokes fade on cheap screens and for weak eyesight, even when contrast passes.",
  },
  "activation-stale-state": {
    plain: "A control announces its old state",
    // No found line on purpose: English keeps the backend's own description,
    // which names the specific element. The other languages carry one.
    impact: "A screen reader user hears “collapsed” while the section is open.",
  },
  "control-faint-boundary": {
    plain: "Control edges too faint",
    // No found line on purpose: English keeps the backend's own description,
    // which names the specific element. The other languages carry one.
    impact: "People with low vision can't see where fields begin and end.",
  },
  "keyboard-positive-tabindex-advisory": {
    plain: "Tab order set by number",
    // No found line on purpose: English keeps the backend's own description,
    // which names the specific element. The other languages carry one.
    impact: "Keyboard users jump across the page in an order that makes no sense.",
  },
  "nav-name-inconsistent": {
    plain: "The same link under different names",
    // No found line on purpose: English keeps the backend's own description,
    // which names the specific element. The other languages carry one.
    impact: "Screen reader users searching for the familiar name don't find it.",
  },
  "color-contrast-mobile": {
    plain: "Text too faint at phone width",
    // No found line on purpose: English keeps the backend's own description,
    // which carries the count. The other languages carry one without it.
    impact: "On a phone in daylight, the text is hard to read even with good eyesight.",
  },
  "color-contrast-dark": {
    plain: "Text too faint in dark mode",
    impact: "People who use dark mode against glare or tired eyes get the faint version.",
  },
  "nav-order-inconsistent": {
    plain: "The menu changes its order",
    // No found line on purpose: English keeps the backend's own description,
    // which names the specific element. The other languages carry one.
    impact: "Someone who remembers a link's position lands on the wrong item.",
  },
};

/* Per-language dictionaries. Fallback is per KEY, not per language: a rule
   the German file has not translated yet renders in English rather than
   vanishing, so translation coverage can grow without ever breaking a
   report. */
import { getLang, type Lang } from "./i18n";
import { PLAIN_DE, FIXES_DE, UNDECIDED_DE, PRINCIPLES_DE, LEVEL_FRAMING_DE } from "./wcagPlain.de";
import { PLAIN_ES, FIXES_ES, UNDECIDED_ES, PRINCIPLES_ES, LEVEL_FRAMING_ES } from "./wcagPlain.es";
import { PLAIN_FR, FIXES_FR, UNDECIDED_FR, PRINCIPLES_FR, LEVEL_FRAMING_FR } from "./wcagPlain.fr";

const PLAIN_BY_LANG: Partial<Record<Lang, Record<string, PlainRule>>> = {
  de: PLAIN_DE, es: PLAIN_ES, fr: PLAIN_FR,
};
const FIXES_BY_LANG: Partial<Record<Lang, Record<string, string | string[]>>> = {
  de: FIXES_DE, es: FIXES_ES, fr: FIXES_FR,
};
const UNDECIDED_BY_LANG: Partial<Record<Lang, Record<string, { what: string; ask: string }>>> = {
  de: UNDECIDED_DE, es: UNDECIDED_ES, fr: UNDECIDED_FR,
};
const PRINCIPLES_BY_LANG: Partial<
  Record<Lang, Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }>>
> = { de: PRINCIPLES_DE, es: PRINCIPLES_ES, fr: PRINCIPLES_FR };
const LEVEL_FRAMING_BY_LANG: Partial<Record<Lang, Partial<Record<"A" | "AA" | "AAA", string>>>> = {
  de: LEVEL_FRAMING_DE, es: LEVEL_FRAMING_ES, fr: LEVEL_FRAMING_FR,
};

export function plainForRule(ruleId: string | undefined): PlainRule | undefined {
  if (!ruleId) return undefined;
  const lang = getLang();
  if (lang !== "en") {
    const hit = PLAIN_BY_LANG[lang]?.[ruleId];
    if (hit) return hit;
  }
  return PLAIN_RULE_EXPLANATIONS[ruleId];
}

/** The level's framing line, in the report's language. */
export function levelFraming(level: "A" | "AA" | "AAA"): string {
  const lang = getLang();
  if (lang !== "en") {
    const hit = LEVEL_FRAMING_BY_LANG[lang]?.[level];
    if (hit) return hit;
  }
  return LEVEL_FRAMING[level];
}

/** Localised principle heading parts for a classified criterion. */
export function principleText(info: PrincipleInfo): {
  principleLabel: string;
  plainTitle: string;
  plainDescription: string;
} {
  const lang = getLang();
  if (lang !== "en") {
    // By principle, not by identity: classifyWcag hands back a translated
    // copy rather than the entry itself whenever the language is not English.
    const key = Object.keys(PRINCIPLES).find((k) => PRINCIPLES[k].principle === info.principle);
    const hit = key ? PRINCIPLES_BY_LANG[lang]?.[key] : undefined;
    if (hit) return hit;
  }
  return {
    principleLabel: info.principle,
    plainTitle: info.plainTitle,
    plainDescription: info.plainDescription,
  };
}

// One clean, plain-English "what to do" per automated (axe) rule. axe's own
// failureSummary ("Fix all of the following: Element is in tab order and does
// not have accessible text Fix any of the following: …") is dense developer
// jargon repeated per element — this replaces it with a single instruction
// for the whole group. Our own deterministic layers (keyboard/component/
// dialog/typography/motion) already write plain fixes, so they aren't here
// and fall back to their own suggestedFix.
export const PLAIN_RULE_FIXES: Record<string, string | string[]> = {
  "reflow-height-unreachable": ["Let the panel scroll inside itself, or stop pinning it in a short window.", "Put its buttons above the long text so they are what shows."],
  "reflow-height-pinned": ["Stop pinning the top and bottom bars when the window is short.", "Or let the header scroll away and come back when scrolling up."],
  "reflow-height-pinned-advisory": "Stop pinning the bars when the window is short, so the page has the room.",
  "contrast-over-image": ["Put a solid or semi-transparent panel behind the text.", "Or darken the picture where the text sits, or move the text off it."],
  "form-error-silent": ["Say what is wrong next to each field, in words.", "Mark the field as invalid, link the message to it, and move focus to the first error."],
  // ── Written for the business report, not for the person who will type the
  // code. Every one of these rules used to fall through to the engineer's own
  // remediation text, which is how a site owner ended up reading "add
  // role='dialog' and aria-modal='true'" under a heading that promised to
  // tell them what to do. The code for each of these still exists and is
  // still exact; it lives in "The technical version" on the same card, which
  // is where the person doing the work will look.
  //
  // Steps, not paragraphs, wherever the fix has more than one action in it.
  //
  // Deliberately absent: the four typographic rules whose engine text carries
  // a number worked out from this page (the leading, line-length and
  // font-size checks). A general sentence here would replace "raise it to
  // about 1.43" with "make it bigger", which is a worse answer.
  "keyboard-mouse-only": [
    "Make it a real button or link, so the keyboard reaches it like everything else.",
    "Test it by putting the mouse aside and pressing Tab through the page.",
  ],
  "keyboard-faint-focus": [
    "Make the keyboard outline darker and thicker, so it stands out on the page behind it.",
    "Check it against every background it lands on.",
  ],
  "timing-meta-refresh": [
    "Take the automatic reload off the page.",
    "If it has to refresh, give people a button and let them choose when.",
  ],
  "aria-prohibited-attr": [
    "Put the wording inside the element itself, where it will be read.",
    "Where that is not possible, use an element built to carry a label.",
  ],
  "aria-required-parent": "Move each part back inside the control it belongs to.",
  "landmark-no-duplicate-main": [
    "Keep one main content area per page.",
    "Mark the others as ordinary sections.",
  ],
  "landmark-banner-is-top-level":
    "Move the site header out to the top level, beside the main content rather than inside it.",
  "svg-img-alt": [
    "Write a short description for each icon that carries meaning.",
    "Hide the purely decorative ones from screen readers instead.",
  ],
  "meta-viewport-large": [
    "Remove the setting that blocks zooming.",
    "Let the page enlarge to at least five times its normal size.",
  ],
  "aria-dialog-name": "Give the pop-up a name that says what it is for, so it is announced when it opens.",
  "nested-interactive": [
    "Take the inner control out, so one thing is clickable rather than two.",
    "Where both are needed, put them side by side instead of one inside the other.",
  ],
  "presentation-role-conflict": [
    "Remove the marking that calls this decoration.",
    "It is a working control, so let it be announced as one.",
  ],
  "keyboard-no-visible-focus": [
    "Show a clear outline on whatever the keyboard reaches, thick and bright enough for a busy page.",
    "Never take an outline away without putting a stronger one in its place.",
  ],
  "readability-dense-prose": [
    "Shorten sentences to around fifteen to twenty words.",
    "Swap technical words for everyday ones.",
    "Break long paragraphs up.",
    "Use headings and lists to carry the structure.",
  ],
  "reading-order-mismatch": [
    "Put the page's underlying order back in step with what people see.",
    "Move the content itself rather than nudging the tab order to compensate.",
  ],
  "forced-colors-focus-lost": [
    "Test the page in Windows High Contrast mode.",
    "Let the focus outline take the system's own colour rather than a fixed one.",
  ],
  "forced-colors-icon-lost": [
    "Test the page in Windows High Contrast mode.",
    "Give icon-only buttons a real border or text so they survive it.",
  ],
  "keyboard-focus-trap": [
    "Make sure Tab can always move on, and Escape always gets out.",
    "Test it by putting the mouse aside and using the keyboard alone.",
  ],
  "sr-filename-alt": [
    "Replace each filename with a sentence saying what the image shows.",
    "Mark purely decorative images with an empty alt so screen readers skip them.",
  ],
  "sr-vague-link-name": [
    "Name each link for its destination. \"View pricing\", not \"click here\".",
    "The visible words can stay short. Your developer can attach the fuller name invisibly, for screen readers only.",
  ],
  "sr-symbol-button-name": [
    "Label each button with its action: \"Close\", \"Next slide\", \"Search\", \"Play\".",
    "The icon-only look can stay: the words go on invisibly, for screen readers only.",
  ],
  "sr-vague-button-name": [
    "Label each button with its action: \"Close\", \"Next slide\", \"Search\", \"Play\".",
    "The icon-only look can stay: the words go on invisibly, for screen readers only.",
  ],
  "form-field-placeholder-label": [
    "Give each field a visible label tied to it with for and id.",
    "Keep the placeholder as a format example, never as the only label.",
  ],
  "component-form-autocomplete":
    "Label each field with what it collects, so browsers and password managers can fill it in.",
  "component-input-type": "Tell the page which fields hold an email address and which a phone number.",
  "component-required-cue": [
    "Mark required fields visibly, not only in the code.",
    "The word \"required\" next to the label is enough.",
  ],
  "component-submit-clarity":
    "Give the form one clearly labelled button that says what it does, such as \"Send enquiry\".",
  "component-table-no-headers": [
    "Mark the top row as header cells, and the first column too if the rows have names.",
    "If the table only arranges the layout, mark it as not a data table.",
  ],
  "component-nav-labels": "Name each menu for what it holds, such as \"Main menu\" or \"Footer links\".",
  "component-skip-link": [
    "Add a link at the very top that jumps straight to the main content.",
    "Show it when it receives keyboard focus, so people know it is there.",
  ],
  "mobile-target-spacing":
    "Put a little space between buttons and links, so a thumb can't hit two at once.",
  "consent-blocks-reader": [
    "Move keyboard focus into the banner when it opens, and keep it there until a choice is made.",
    "That is what justifies hiding the page. Or stop hiding it: a bottom banner needs none of this.",
  ],
  "mobile-sticky-coverage": [
    "Shrink the bars pinned to the top and bottom on phones.",
    "Leave most of the screen for the content people came to read.",
  ],
  "mobile-horizontal-scroll": [
    "Let the content reflow to the width of the screen.",
    "Look for a fixed width or an oversized image forcing the page wider.",
  ],
  "mobile-tap-target":
    "Make buttons and links at least as big as a fingertip, and give them room around the edge.",
  "text-spacing-clipped": [
    "Let boxes grow with the text inside them.",
    "A fixed height is usually what cuts the words off.",
  ],
  "text-zoom-clipped": [
    "Let containers grow when the reader enlarges the text.",
    "Check the page at twice its normal text size.",
  ],
  "text-zoom-horizontal-scroll": "Let the page reflow when text is enlarged, rather than running off to the side.",
  "dark-consent-no-reject": "Put a refuse option on the cookie banner, as easy to find as the accept one.",
  "dark-consent-asymmetry": "Give accept and refuse the same size, style and prominence.",
  "dark-preselected-optin": "Leave marketing and sharing boxes unticked.",
  "dark-confirmshaming": "Word the decline option plainly, such as \"No thanks\", with nothing that scolds.",
  "dark-fake-scarcity": [
    "Show stock and demand figures only where they are true and current.",
    "Take down any number that is not read from real data.",
  ],
  "dark-fake-urgency": [
    "Run countdowns only where the deadline is real.",
    "Take down any timer that resets itself when the page reloads.",
  ],
  "dialog-close-unlabeled": "Give the close button a name, so it is announced as \"Close\" rather than as a bare cross.",
  "dialog-keyboard-trap": [
    "Let Tab cycle within the pop-up while it is open.",
    "Let Escape close it and return to the page.",
  ],
  "dialog-no-escape": "Let the Escape key close the pop-up.",
  "dialog-focus-not-moved": "Move the cursor into the pop-up when it opens, so keyboard users start inside it.",
  "dialog-focus-lost-on-close": "Put the cursor back on whatever opened the pop-up when it closes.",
  "dialog-no-close": [
    "Give every pop-up a visible close button.",
    "Let Escape close it as well.",
  ],
  "dialog-missing-role": [
    "Mark the overlay as a dialog, so it is announced when it opens.",
    "Give it a name that says what it is for.",
    "Keep the keyboard inside it while it is open.",
    "Return the keyboard to whatever opened it when it closes.",
  ],
  "dialog-missing-name": "Give the pop-up a heading or name that says what it is for.",
  "markup-validation": "Run the page through the W3C validator and clear what it reports.",
  "motion-marquee": [
    "Replace the scrolling ticker with text that stays still.",
    "If it has to move, give people a way to pause it.",
  ],
  "motion-autoplay-media": [
    "Stop audio and video starting on their own.",
    "If something must play, keep it under three seconds or add a stop button.",
  ],
  "motion-infinite-no-reduced-motion": [
    "Honour the setting people use to ask for less movement.",
    "Animations should stop, or become a simple fade, when it is turned on.",
  ],
  "typo-caps-letterspacing":
    "Add a little space between letters in capitalised headings, so the words keep their shape.",
  "typo-lowercase-letterspaced": "Take the extra letter spacing off ordinary text.",
  "typo-negative-letterspacing": "Stop squeezing the letters together.",
  "typo-justified-no-hyphens": [
    "Set the text ranged left rather than justified.",
    "If it must be justified, turn hyphenation on so the word gaps stay even.",
  ],
  "typo-typeface-count": [
    "Settle on two typefaces, or three at most.",
    "Use weight and size for variety instead of another typeface.",
  ],
  "typo-underline-nonlink": [
    "Keep underlining for links only.",
    "Use bold or italic where you want emphasis.",
  ],
  "typo-italic-body": "Set long passages upright, and keep italics for a phrase at a time.",
  "typo-allcaps-block": [
    "Set long passages in ordinary sentence case.",
    "Keep capitals for short labels.",
  ],
  "typo-thin-weight": "Set body text in a regular weight.",

  "aria-allowed-role": [
    "Use an element that genuinely is the thing it claims to be.",
    "A button for a button, a navigation block for navigation.",
  ],
  "aria-allowed-attr": "Remove the settings that do not belong on this kind of element, or change it to one they fit.",
  "aria-required-children": [
    "Put the promised items inside: a list needs list items, a menu needs menu items.",
    "If the content is not really a list or a menu, take that marking off the container.",
  ],
  "landmark-unique": "Name each area for what it holds, such as \"Main menu\" or \"Footer links\".",
  "landmark-no-duplicate-banner": [
    "Keep one site header, at the top level of the page.",
    "Turn the others into ordinary containers.",
  ],
  "landmark-no-duplicate-contentinfo": [
    "Keep one site footer, at the top level of the page.",
    "Turn the others into ordinary containers.",
  ],
  "landmark-contentinfo-is-top-level": "Move the site footer out so it sits at the top level of the page, not inside another area.",
  "skip-link": [
    "Point the skip link at the main content, and check that target exists.",
    "Make sure the keyboard lands there when the link is used.",
  ],
  "component-skip-link-dead": [
    "Point the skip link at the main content, and check that target exists.",
    "Make sure the keyboard lands there when the link is used.",
  ],
  "image-redundant-alt": "Give the image an empty alt (alt=\"\") when the text beside it already says the same thing.",
  "color-contrast":
    [
    "Darken the text, or lighten what sits behind it.",
    "Ordinary text needs at least 4.5 to 1.",
    "Large text, about 24px or 19px bold, needs 3 to 1.",
  ],
  "image-alt": [
    "Describe what each meaningful image shows. The content, not the fact that it is a picture.",
    "Leave the description empty for images that are purely decorative.",
  ],
  "input-image-alt": "Describe what the image button does, such as \"Search\", rather than what it looks like.",
  "link-name":
    [
    "Put readable words inside every link.",
    "For an icon link, add a label naming where it goes, not what it looks like.",
    "Where the link already shows words, keep those exact words in the label.",
    "Voice control users say what they see, so the two have to match.",
  ],
  "link-text-vague":
    [
    "Write link text that makes sense on its own. \"Read the 2026 fee changes\", not \"Read more\".",
    "To keep the short version on screen, add the full wording as a label.",
  ],
  "label-content-name-mismatch": [
    "Keep the words shown on the control inside its name in the code.",
    "Start the name with those exact words, then add anything extra.",
    "Voice control users say what they see, so the two have to match.",
  ],
  "button-name":
    [
    "Give every button words that say what it does.",
    "For an icon button, add a label describing the action.",
    "Where the button already shows words, keep those exact words in the label.",
    "Voice control users say what they see, so the two have to match.",
  ],
  label: [
    "Give every field a visible label saying what goes in it.",
    "Make sure clicking the label puts the cursor in its field.",
  ],
  "select-name": [
    "Give the dropdown a visible label saying what it chooses.",
    "Where there is no room for one, add a name for screen readers instead.",
  ],
  "document-title": "Give the page a title that describes it. It is what shows in the browser tab and in search results.",
  "html-has-lang": "Tell the page which language it is written in, so screen readers use the right voice.",
  "html-lang-valid": "Correct the page's language setting to a real language code, such as en for English or de for German.",
  "heading-order": "Use headings in order, without skipping a level.",
  "page-has-heading-one": "Add one <h1> near the top that states what the page is about.",
  "empty-heading": "Put text in the heading, or remove the empty heading tag.",
  "link-in-text-block": "Give in-text links a second visual cue besides colour, usually an underline.",
  "meta-viewport": "Remove the setting that blocks zooming, so the page can grow to whatever size a reader needs.",
  "frame-title": "Give each embedded frame a name saying what it holds, such as \"Location map\".",
  "duplicate-id-active": "Make every id on the page unique. No two elements should share one.",
  list: "Mark real lists up as lists, with each item inside the same list.",
  listitem: "Put every list item inside a list, rather than leaving it on its own.",
  "aria-required-attr": [
    "Give the control the state it claims.",
    "Say in the code whether it is checked or unchecked, open or closed.",
    "A control that reports a value on a scale also has to state the value.",
  ],
  "aria-hidden-focus": "Either unhide it, or take it out of the tab order as well.",
  region: [
    "Put every part of the page inside a named area: header, navigation, main content, footer.",
    "Screen reader users jumping between sections skip any content left outside them.",
  ],
  "landmark-one-main": "Mark the primary content of the page as its main area, and use only one per page.",
  tabindex: 'Remove positive tabindex values (tabindex="1" or higher) and let the natural page order set focus order.',
  "scrollable-region-focusable": 'Add tabindex="0" to the scrollable container so keyboard users can scroll it.',
  "keyboard-positive-tabindex-advisory": "Ask your developer to remove the numbers that set the tab order by hand. The keyboard then follows the order of the page, including anything added later.",
  "nav-name-inconsistent": "Give each menu link one name, \"Basket\" or \"Cart\" but not both, and use it on every page.",
  "color-contrast-mobile": [
    "Find the phone-width media query that changes the text or background colour.",
    "Check that pairing against the same rule: ordinary text needs at least 4.5 to 1.",
  ],
  "color-contrast-dark": [
    "Check the dark palette's text and background colours the same way as the light ones.",
    "Ordinary text needs at least 4.5 to 1 in both themes.",
  ],
  "nav-order-inconsistent": "Keep the menu's links in the same order on every page. A page can show fewer links, but the ones it shares with others should not move.",
  "activation-stale-state": "Make each control announce its new state the moment it changes: open or closed, on or off. Your developer sets this in the same code that opens or switches the control.",
  "control-faint-boundary": "Darken the borders on fields and buttons. They need at least 3 to 1 against what sits behind them. Your designer can usually fix them all with one change to the shared style.",
};

/**
 * What the reader should do, as steps rather than a paragraph.
 *
 * A fix with more than one action in it was being set as running prose, and
 * a business owner reading "add this, then label it, then move focus, then
 * put focus back" in one block has to hold four things in their head and
 * work out where each one starts. As a list they can count them, and they
 * can stop after the first if that is all they were checking.
 *
 * A single-step fix stays a sentence — a one-item bullet list is a paragraph
 * wearing a dot, and it makes a small fix look like a project.
 */
export function plainFixForRule(ruleId: string | undefined): string | string[] | undefined {
  if (!ruleId) return undefined;
  const lang = getLang();
  if (lang !== "en") {
    const hit = FIXES_BY_LANG[lang]?.[ruleId];
    if (hit) return hit;
  }
  return PLAIN_RULE_FIXES[ruleId];
}

export const WCAG_LINK = "https://www.w3.org/WAI/standards-guidelines/wcag/";

export const PRINCIPLE_ORDER: Principle[] = ["Perceivable", "Operable", "Understandable", "Robust"];

/**
 * Why the engine couldn't settle a check, and what a person should do.
 *
 * These are not faults. axe reports no false positives by refusing to call
 * anything it can't measure, and this is where those cases go. The reader
 * needs two things: why a machine couldn't answer, and what looking at it
 * themselves involves.
 *
 * Written for the rules a sweep of real sites actually produced.
 */
export const UNDECIDED_EXPLANATIONS: Record<string, { what: string; ask: string }> = {
  "form-error-unlinked": {
    what: "A form shows an error after an empty submit but does not tie it to the field. Nothing was sent to the site.",
    ask: "Ask your developer to mark each field in error as invalid. Connect its message with aria-describedby, so a screen reader reads both together.",
  },
  "form-error-unannounced": {
    what: "A form shows errors without moving focus or announcing them. Nothing was sent to the site.",
    ask: "Ask your developer to move focus to the first error or to a summary. A live region also works.",
  },
  "media-embed-no-captions": {
    what: "An embedded YouTube or Vimeo video has no captions at all, its own site says. A silent or music-only video needs none.",
    ask: "Play it. If anyone speaks, add captions in the account the video is hosted on, corrected by a person.",
  },
  "media-embed-auto-captions": {
    what: "An embedded YouTube or Vimeo video has only automatic captions, its own site says. These often get names and numbers wrong.",
    ask: "Play it with captions on. If words are wrong, correct them in the video's account, or upload a captions file.",
  },
  "color-contrast": {
    what: "Text laid over a photo, a video or a colour fade. Its contrast changes from spot to spot, so the checker could not give it one number.",
    ask: "Ask your designer to check each one where the image behind it is lightest. Body text needs a contrast of 4.5:1, large text 3:1. Where it falls short, put a solid panel or a dark wash behind the words.",
  },
  "link-in-text-block": {
    what: "Links inside paragraphs marked out by colour alone, with no underline. The checker could not measure whether their colour differs enough from the text around them.",
    ask: "Ask your designer to underline these links. That is the simplest fix. A colour 3:1 apart from the text also passes, if the link is underlined on hover and keyboard focus.",
  },
  "video-caption": {
    what: "A video on the page. The checker cannot play it, so it cannot tell whether captions exist or whether they match what is said.",
    ask: "Play it with captions on. If anyone speaks, every word should appear, corrected by a person. Auto-generated captions alone do not count.",
  },
  // The four media rows. Each says what was counted and what to ask,
  // because the checker can't watch or listen to any of it — the count and
  // the location are the whole of what it can offer.
  "media-video-captions": {
    what: "A video with no captions file attached. A silent clip needs none, and captions burned into the picture leave no file. So this is not yet a fault.",
    ask: "Play each video. If anyone speaks and no captions appear, ask whoever made it to add captions, corrected by a person. Auto-generated captions alone do not count.",
  },
  "media-video-descriptions": {
    what: "A captioned video with nothing describing what is on screen. Captions carry the words but not the picture, such as a chart or text shown on screen.",
    ask: "Watch each video with your eyes closed. If you miss anything, such as a chart, a demonstration or text on screen, the soundtrack needs to describe it. A written version on the page meets only Level A.",
  },
  "form-error-association": {
    what: "Form error messages that are not tied to their field in the code. A screen reader announces the field, but not the error sitting beside it.",
    ask: "Ask your developer to connect each message to its field with aria-describedby. The reader then hears the problem at the moment it hears the field.",
  },
  "media-audio-transcript": {
    what: "Audio on the page. A transcript would be ordinary text, so the checker cannot tell whether one exists.",
    ask: "Look beside each player for a written version of everything said. If there is none, ask whoever made the recording for one and put it on the page.",
  },
  "media-embedded-player": {
    what: "A video playing in another company's player, such as YouTube or Vimeo. The video lives on their site, so the checker cannot look inside it.",
    ask: "Play each one and turn captions on with the CC button. If there is no button or the captions are wrong, fix them in the account the video is hosted on.",
  },
  // Three rows about the documents a page links to. The scan counts them
  // all, opens the first two PDFs on the page's own site, and never opens
  // an office file. What it finds in a PDF is the document's fault and is
  // kept out of the page's score, which is why it is listed here and not
  // among the findings. Wording approved by the owner, 22 Nov 2026; the
  // second row's first sentence was then cut in two to fit the voice
  // test's twenty words.
  "pdf-linked-not-checked": {
    what: "PDF documents this page links to that the scan did not open. A page scan opens the first two on your own site and counts the rest.",
    ask: "Paste a document's address into the scan to check it on its own. A PDF needs tags, a title and its language set before a screen reader can read it properly.",
  },
  "pdf-linked-faults": {
    what: "A PDF this page links to. The scan opened it and found faults, such as no tags or no title. They are the document's faults, so they are not in this page's score.",
    ask: "Paste the document's address into the scan for its own report. Then ask whoever made it to fix the original file and upload it again.",
  },
  "office-linked-not-checked": {
    what: "Word, Excel or PowerPoint files this page links to. The scan counts them and never opens them.",
    ask: "Open each one and run the accessibility checker built into Office, under Review. Better still, put what it says on a web page, which everyone can read.",
  },
  // Three rows about what the page listens for. A listener leaves no mark on
  // the page, so the checker can say one is there and nothing about what it
  // does when it fires.
  // Two rows about the cookie layer's manners. Both are real screen-reader
  // harm and neither is a provable violation — a banner div without a dialog
  // role is legal markup — so they sit here for a person to rule on.
  "consent-layer-in-frame": {
    what: "The cookie banner loads inside a frame from another company's site. The scan cannot check what a screen reader hears in it.",
    ask: "Ask someone to open the page with a screen reader, such as VoiceOver on a Mac or NVDA on Windows. The banner should be read out first and Tab should reach its buttons. Refusing should take as many steps as accepting.",
  },
  "consent-layer-unheralded": {
    what: "A cookie banner a screen reader is never told about. It has no dialog role and no name, and pressing Tab never reaches it.",
    ask: "Ask your developer to mark the banner as a dialog named, for example, ‘Cookie settings’. Keyboard focus should move into it when it opens.",
  },
  "consent-trap-unnamed": {
    what: "Pressing Tab stays inside the cookie banner, but the banner never says what it is. A screen reader user is held in something with no name.",
    ask: "Ask your developer to mark the banner as a dialog and name it, such as ‘Cookie settings’.",
  },
  "interaction-motion-actuation": {
    what: "The page responds to the phone being tilted or shaken. Somebody who keeps their phone in a stand, or whose hands shake, can't do that.",
    ask: "Ask your developer whether every tilt or shake action can also be done by tapping something on screen. Then ask whether the motion response can be switched off, so a shaking hand can't fire it by accident.",
  },
  "interaction-gesture-listeners": {
    what: "The page listens for swipes or drags. People with a tremor, or using voice or switch control, may not be able to make one.",
    ask: "Try each carousel, slider or map with single taps only. Anything that needs a swipe or drag also needs a button, such as arrows beside a carousel.",
  },
  "interaction-key-shortcuts": {
    what: "The page watches for key presses across the whole screen. Where a plain letter is a shortcut, anyone speaking to their computer sets it off by talking.",
    ask: "Ask your developer whether any shortcut is a single letter or number on its own. Each one needs a way to be switched off or changed. A shortcut active only while its control is focused passes too.",
  },
  "interaction-unmarked-language": {
    what: "Passages written in a different alphabet from the rest of the page, with nothing marking what language they are. A screen reader reads them with the wrong pronunciation, which can make them unintelligible.",
    ask: "Ask your developer to mark each passage with its language. Only a change of alphabet can be spotted automatically, so ask about foreign passages that share the page's alphabet.",
  },
  "interaction-title-tooltip": {
    what: "Tooltips that appear only when a mouse hovers over something. Keyboard and touchscreen users never see them, and they vanish when you move towards them.",
    ask: "Hover over each one and read it. If it says anything a visitor needs, put that text on the page. Or ask for a tooltip that also opens on focus and closes with Escape.",
  },
  "interaction-orientation-lock": {
    what: "The page's styles turn it back or hide it when the phone is rotated. That usually means it is locked to one orientation, unless a wide view is meant for landscape only.",
    ask: "Open the page on a phone and turn it both ways. Everything should still work, for people whose phone is fixed to a wheelchair or a stand.",
  },
  "interaction-no-status-region": {
    what: "Nothing here announces changes made without a reload, such as a filtered list or a ‘Saved’ message. A screen reader stays silent while they happen.",
    ask: "Ask your developer whether anything here updates without a page load. If it does, that update needs a live region so it is spoken as well as shown.",
  },
  "interaction-acts-on-change": {
    what: "Menus or tick boxes whose code suggests they act the moment you set them, without a button. We did not try them, as that could place a real order.",
    ask: "Try each one on a test copy of the site. If choosing an option submits a form or opens a new page, add a button for that. A warning beside the control also works.",
  },
  "interaction-pointer-cancellation": {
    what: "Controls that act the moment they are pressed rather than when released. Press one by mistake and there is no way to slide off it and let go.",
    ask: "Ask your developer to make these act on release instead. Anyone whose hand slips, or who takes a moment to aim, can then move away before lifting.",
  },
  "aria-valid-attr-value": {
    what: "Code labels that point to another part of the page by its id. The checker could not confirm that the part they point to is there.",
    ask: "Ask your developer to confirm every id an aria attribute names exists on the page. None may be hidden or removed.",
  },
  "aria-allowed-role": {
    what: "Elements given a role in the code, such as button or tab, that may not fit them. Whether it is wrong depends on how they behave.",
    ask: "Ask your developer to check that each works the way its role promises, keyboard included. If not, remove the role and use the matching native element, such as a real button.",
  },
  "aria-prohibited-attr": {
    what: "Elements given a name in the code that their type may not allow. A screen reader may then ignore that name.",
    ask: "Ask your developer to check that each is read out with the intended name. Where it is not, move the name onto an element allowed to carry one.",
  },
  "css-orientation-lock": {
    what: "Styles that may lock the page to portrait or landscape. The check that found this is still experimental, so it may be wrong.",
    ask: "Open the page on a phone and turn it both ways. Everything should still work, for people whose phone or tablet is fixed in one position.",
  },
  "label-content-name-mismatch": {
    what: "Controls whose name in the code may not contain the words shown on them. The checker could not decide, usually because the control is named by its current value.",
    ask: "Ask your developer to compare what each one shows with the name a screen reader speaks. The spoken name should contain the visible words, in the same order.",
  },
  "duplicate-id-aria": {
    what: "An id that may be used more than once. Every code label pointing at it follows only the first, so a name can silently attach to the wrong thing.",
    ask: "Ask your developer to make every id on the page unique, starting with any that an aria attribute refers to.",
  },
};

export function undecidedExplanation(ruleId: string) {
  const lang = getLang();
  if (lang !== "en") {
    const hit = UNDECIDED_BY_LANG[lang]?.[ruleId];
    if (hit) return hit;
  }
  return UNDECIDED_EXPLANATIONS[ruleId];
}
