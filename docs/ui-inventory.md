# UI inventory

Every distinct element `widget-business` renders, for whoever builds the next
visual layer. Written against a tree with **no CSS at all** — `src/styles/global.css` is
empty and is the only stylesheet wired in (via `utils/shadowMount.ts`, inlined
into the shadow root; a plain component import would land in `document.head`
and never cross the boundary).

Five visual layers have been built and removed here. None needs rebuilding
from scratch if any is worth reusing:

| commit | what it was |
|---|---|
| `0d4611a` | the fullest one. Built from the design system's OWN stylesheet and component sources rather than from screenshots: the 12/24/48 spacing scale, the project type rules (literal px, 15/18 body, 0.01em tracking), ports of `.as-card` / `.as-head` / `.as-table` / `.as-row` / `.as-band` / `.as-pill` / `.as-sev`, the severity tone ramp, and the report sections' 5fr/7fr grid |
| `dadf555` | Foundations-v2 component sheets |
| `c5a2640` | the Pangram-direction system |
| `92b5a9b` | the reference-matched scan form |

**Take values from `reference/accessible-scan.css`, not from a screenshot.** It
is the design system's real stylesheet — 30KB, greppable, exact. Its companion
`reference/ui-kit.html` is 1.5MB, generates its strings at runtime so grep finds
nothing in it, and scales every page to `transform: scale(0)` until scrolled
into view, so readings taken at the wrong moment come back as zeros. Use the
HTML for composition and the CSS for values. Component sources are readable
through the design project itself, which is how the two screens that crash in
the exported HTML (`Perceivable`, `ReportSections`) were recovered.

**The webfont lives at document level, not in `global.css`.** `src/index.tsx`
injects two `@font-face` declarations for PP Telegraf 400/500 into
`document.head`, and that route is not optional: `@font-face` is **ignored
inside a shadow-root stylesheet**. The OTFs are served from
`backend/public/fonts/`. Only 400 and 500 exist — there is no other weight to
reach for, so a design calling for light or bold cannot be matched.

**Measuring against a screenshot: two traps.** `document.fonts.ready` resolves
even while faces are `unloaded`, so canvas will silently measure a *fallback*
and return confident, wrong numbers — always `await document.fonts.load()` and
print a real-vs-fallback width check beside anything you intend to trust. And
the screenshot tool emits at 800px regardless of viewport, so measure with
`getBoundingClientRect`, never by reading the image.

Two things to know before styling anything:

- **Class names are role-based already.** 453 distinct names, audited after
  every strip.
  Five described appearance or position rather than role and were renamed:
  `-band-left`/`-band-right` → `-band-heading`/`-band-summary`,
  `card-invert` → `card-emphasis`, `section-redflag` → `section-concern`,
  `sev-ondark` → `sev-on-emphasis`. Style the names as they are; do not invent
  parallel appearance classes.
- **The app passes an axe audit with zero CSS.** Landmarks, labels, heading
  order and control names all live in the markup. That is the baseline; a
  redesign that introduces contrast or target-size failures has regressed
  something that was working.

Paths are relative to `widget-business/src/`.

---

## Controls

| element | file | props |
|---|---|---|
| Button | `components/Button/Button.tsx` | `variant` (primary/secondary/ghost/danger/black), `size` (sm/md/lg), `type`, `disabled`, `onClick`, `children` |
| Radio | `components/Radio/Radio.tsx` | `id`, `name`, `value`, `label`, `description`, `meta`, `checked`, `defaultChecked`, `onChange`, `disabled` |
| Checkbox | `components/Checkbox/Checkbox.tsx` | `id`, `label`, `checked`, `defaultChecked`, `onChange`, `disabled`, + passthrough |
| Switch | `components/Switch/Switch.tsx` | `id`, `label`, `checked`, `onChange`, `disabled`, `size` (md/lg) |
| OptionCard | `components/OptionCard/OptionCard.tsx` | `id`, `name`, `value`, `label`, `description`, `meta`, `checked`, `onChange`, `disabled` |
| Input | `components/Input/Input.tsx` | `id`, `label`, `type`, `value`, `placeholder`, `helperText`, `invalid`, `invalidText`, `disabled`, `action`, `describedBy`, `variant` (filled/line), `size` (default/display), `inputProps` |
| Textarea | `components/Textarea/Textarea.tsx` | `id`, `label`, `value`, `placeholder`, `helperText`, `invalid`, `invalidText`, `disabled`, `rows` |
| Select | `components/Select2/Select2.tsx` | `id`, `label`, `options`, `value`, `onChange`, `helperText`, `disabled`, `variant` (filled/line) |
| Legacy form controls | `components/FormControls.tsx` | older `Radio`/`Select`. Superseded — see "Duplicates" below |
| PrintButton | `components/PrintButton.tsx` | `label`, `compact` |

`Input` has two states worth designing together: `invalid` swaps the helper line
for the error text and sets `aria-invalid`, and `describedBy` overrides the
internal help id because the URL field points at one of four ids depending on
whether the address is empty, malformed, the server errored, or the scan was
blocked.

## Containers and cards

| element | file | props |
|---|---|---|
| Card | `components/Card/Card.tsx` | `tone` (default/invert), `eyebrow`, `title`, `meta`, `linkLabel`, `href`, `onLinkClick`, `children` |
| FactCard | `components/FactCard/FactCard.tsx` | `label`, `value`, `note`, `tone` (default/accent/invert), `children` |
| AppShell | `components/AppShell.tsx` | `sections`, `activeId`, `plans`, `contentRef`, `children` |
| SectionHeader | `components/SectionHeader.tsx` | `id`, `eyebrow`, `title`, `qualifier`, `chip`, `action`, `tone`, `navLabel`, `children` |
| ReportSection | `components/ReportSection.tsx` | `id`, `eyebrow`, `title`, `description`, `findings`, `variant`, `asNotes` |
| PlansBar | `components/PlansBar.tsx` | `name`, `price`, `note`, `href`, `featured` |

**Card nesting is the known anti-pattern.** `Card`'s own annotation says so, and
this repo has shipped it twice — a Card inside a Card reads as a mistake at
every width. The score list was made a plain `<div>` for exactly this reason.

## Data display

| element | file | props |
|---|---|---|
| DataTable | `components/DataTable/DataTable.tsx` | `caption`, `headers` (`key`, `label`, `align`), `rows` (`id`, `cells`, `expand`), `filters`, `filter`, `onFilterChange`, `framed` |
| IssueRow | `components/IssueRow/IssueRow.tsx` | `severity`, `title`, `criterion`, `selector`, `count`, `onClick` |
| SeverityTag | `components/SeverityTag/SeverityTag.tsx` | `severity` (critical/serious/moderate/minor/pass), `label`, `onDark` |
| ScoreDial | `components/ScoreDial/ScoreDial.tsx` | `score`, `label`, `size` |
| ScoreGauge | `components/ScoreGauge.tsx` | `findings`, `allFindings`, `outOf`, thresholds; owns the "Do this first" band |
| FindingDetail | `components/FindingDetail/FindingDetail.tsx` | `eyebrow`, `badge`, `meta`, `who`, `whatFound`, `whatToDo`, `affected`, `technical`, `actionLabel`, `onAction`, `tone` |
| FindingGroup / FindingsList | `components/FindingGroup.tsx`, `components/FindingsList.tsx` | `findings`, `asNotes` |
| RelatedChecks | `components/RelatedChecks/RelatedChecks.tsx` | `title`, `items` (`id`, `name`, `level`, `why`), `onOpen` |
| Tag | `components/Tag.tsx` | — |

`DataTable` rows carry `data-align` on both `<th>` and `<td>` (90 in a rendered
report). That replaced an inline `textAlign` and is the hook for column
alignment — it is data from the caller, not a style decision to remove.

## Report sections

`ConformanceView`, `ProfessionalTable`, `ProSummary`, `SiteAuditView`,
`UndecidedChecks`, `Wcag22Readiness`, `WhatsNextPanel`, `PrincipleGroup`,
`DocumentSummary`, `AccessibilityStatement`, `AcrDraft`, `ScanHistory`,
`ScreenReaderPreview`, `VisionSimulator`, `TrustIssues`, `SinceLastTime`,
`FixPreviews` — all in `components/`.

`SinceLastTime`, `TrustIssues` and `FixPreviews` are UI-kit ports and are **not
wired**: they duplicate or await data the app already owns. Style them last.

## Feedback, empty and error states

| element | file | props |
|---|---|---|
| Notification / Toast / ProgressBar | `components/Feedback.tsx` | `kind` (success/error/warning/info), `title`, `subtitle`, `label`, `value`, `max` |
| Dialog | `components/Dialog.tsx` | `open`, `title`, `children`, `primaryLabel`, `secondaryLabel`, `danger`, `onPrimary`, `onClose` |
| BlockedNotice | `components/BlockedNotice.tsx` | — (bot-protection / CAPTCHA block) |
| Empty states | inline in `ConformanceView`, `FindingsList`, `TrustIssues` | e.g. "Nothing on this page fails." `TrustIssues` returns `null` on an empty list rather than rendering a heading over nothing |
| Form errors | `components/UrlForm.tsx` | persistent `role="alert"` region, empty until filled — a live region mounted with its message already inside never announces |
| Scan errors | `components/App.tsx` | `scanError`, `scanBlocked`, both reachable from the URL field |

**Dialog and Tabs collapse without CSS** and keep the minimum structure that
preserves interaction — see below.

## Navigation

| element | file | props |
|---|---|---|
| SideNav | `components/SideNav.tsx` | `label`; scroll-spy via `lib/useActiveSection.ts` |
| Tabs | `components/Tabs.tsx` | `id`, `items`, `label`, `defaultId`, `onChange`, `panel`, `panelOwns` |

---

## Layout that lives in the markup

Three places where a layout decision is fixed in JSX, so CSS alone cannot change
it. Each one constrains the redesign.

**RESOLVED — `UrlForm`'s two-column grid.** `.a11y-form-grid` and its two
`.a11y-form-col` children were replaced by a single `.a11y-form-single` column
in the markup, in DOM order: address → scope → report style → extras → submit.
Done in JSX rather than with CSS `order`, because reordering visually would
have left tab order following the DOM and put the submit button ahead of the
scan options. Kept here as the worked example: this is what resolving one of
these looks like.

**1. `AppShell.tsx:33-45` — header / nav / content are three fixed siblings.**
`.a11y-shell-header`, `.a11y-shell-main`, `.a11y-shell-content`, plus
`App.tsx:304` toggling `.a11y-shell-with-nav` when sections exist. The grid can
be re-drawn in CSS, but nav-below-content or a top tab bar means moving
elements.

**2. `FixPreviews.tsx` — grid spans are chosen per card in JSX.**
`span={2|3|6}` becomes `.a11y-fixcard-span2/3/6`. The six-column rhythm is baked
into each call site, so re-proportioning the grid means editing every card.

**3. RESOLVED — `DataTable` as spaced cards.** This entry used to say the
card-row pattern was "not reachable from CSS without losing the table
semantics". That is wrong and was disproved: `border-collapse: separate` with
`border-spacing: 0 8px` and radii on the first and last cells gives exactly it,
and nothing semantic is given up. One further thing the next layer will need —
a `<table>` does not shrink below its min-content inside a grid track, so it
needs `table-layout: fixed` or it bursts its column. Measured: 823px inside a
525px column.

Lesser: `ScoreDial` positions its 70/90 threshold ticks with inline `left`
percentages, and `TrustIssues` splits its band into two fixed children
(`-heading`, `-summary`). Both are cheap to change; both are markup, not CSS.

## Duplicates to resolve before styling

Styling both halves of these wastes work:

- `components/FormControls.tsx` still exports `Radio` and `Select`, superseded by
  `components/Radio/` and `components/Select2/`. `Select2` is named for
  coexistence and should lose the suffix once nothing imports the old one.
- `components/Tag.tsx` exists and the design system's `Tag` is unported.
- `SinceLastTime` duplicates `ScanHistory`; `TrustIssues` duplicates the app's
  dark-pattern findings rendering.

## Kept deliberately, do not "fix"

- **Five inline styles carry data, not decoration**: `ScoreDial` (score width,
  tick positions), `Feedback` (progress width), `FindingGroup` (the suggested
  colour swatches — the value *is* the finding), `VisionSimulator` (the CSS
  filter *is* the simulation).
- **Selectors JS depends on**: `.a11y-widget-inner` and `.a11y-dialog-root`
  (`ScanHistory.tsx:49,63`), `#a11y-url-input` (`App.tsx:188`),
  `#a11y-widget-business-root` (`index.tsx:96`), `[data-nav-label]`
  (`App.tsx:201`). Grep before renaming any of them.
- **The shadow root**, which is isolation and not appearance.
- **Data attributes that replaced style decisions**, kept because the rule is
  convert-not-delete: `data-align` on table cells (90 in a rendered report,
  was an inline `textAlign`) and `data-row-state` on conformance and
  screen-reader rows (`issue`/`current`/`pass`, was an inline `background`
  carrying a dead token and a hardcoded `#fff1f1`). Style these; do not
  reintroduce colours as props.


## New since the last strip

**Section heads are wrapped, and the wrapper is load-bearing.**
`.a11y-section-head` groups a section's title and lead. It is not decoration:
the report sections are a two-column grid, grid rows are shared between columns,
and with the head as loose siblings one tall content item pushed the lead
paragraphs below it — measured at 2,200px below their own heading. Ten of the
twelve sections now carry it. The two that do not are correct: the concern band
is full-width by design, and the CTA has no title to place.

**Steps are grouped the same way.** `.a11y-step-group` wraps a numeral and
`.a11y-step-body` in the scan form, so the body's left edge derives from the
numeral rather than a fixed gutter guess.

**`.a11y-widget-inner` is a container-query container** (`a11y-panel`). This is
not appearance and must survive: the widget is embedded at whatever width the
host gives it, so layout has to respond to that box and not to the viewport. A
media query would collapse a card pair on a phone and leave it squashed in a
400px sidebar on a desktop, which is the case that actually breaks.

## A checker, because selectors fail silently

`widget-business/scripts/check-styles.mjs` reports two things:

    dead      a selector in the stylesheet that no markup produces
    unstyled  a class in the markup that no rule matches

Run it with `node widget-business/scripts/check-styles.mjs`. It reports and
exits 0 — it does not gate.

It exists because four selectors shipped or nearly shipped in one session
matching nothing at all: `[data-band="middling"]`, `.a11y-notification`,
`.a11y-filter-row`, `.a11y-fix-none`. None errored. A selector that matches
nothing is silent and the page looks plausible without it.

Against the stripped tree everything reads as unstyled, which is correct and
expected. It becomes useful as the new layer lands: the number should fall, and
anything still listed should be a decision rather than a surprise.

## How to verify the new layer, and how not to

The mistakes worth not repeating, all from one session:

- **A synthetic probe is not verification.** Injecting a section into the shadow
  root and measuring it confirmed the grid rules parsed. Three real defects
  survived that check — a 274px table overflow, a 226px image overhang, and the
  2,200px displacement above — because the probe had one short content item and
  never produced a tall row. Verify against a rendered report.
- **Check the box you mean.** A clip check compared children against the panel's
  border box while they sit inside its padding, and reported 521 overflowing
  elements. A misalignment check measured a `hidden` panel whose rect is zero
  and reported −12,242px. Both were confident numbers about the wrong box.
- **Screenshots produce precise, wrong values.** A 13px radius, a 64px card gap
  and a 40px section numeral all came from reading images. This system has no
  13px radius; the real gap is 12; the numeral is 15 in the component.
- **`document.fonts.ready` resolves while faces are `unloaded`**, so canvas
  silently measures a fallback. `await document.fonts.load()` and print a
  real-vs-fallback width beside anything you intend to trust.
- **The screenshot tool emits at a fixed width regardless of viewport.** Measure
  with `getBoundingClientRect`, never by reading the image.
- **The dev fixture pins the audience from the URL.** `?fixture=report` is the
  business view and `&audience=professional` the pro view, deterministically.
  They have different roots — `.a11y-score` and `.a11y-pro-summary` — so a check
  keyed on the wrong one reports "the scan never ran" against a perfectly good
  report.
