# UI inventory

Every distinct element `widget-business` renders, for whoever builds the next
visual layer. Written immediately after the strip, against a tree with **no CSS
at all** — `src/styles/global.css` is empty and is the only stylesheet wired in
(via `utils/shadowMount.ts`, inlined into the shadow root; a plain component
import would land in `document.head` and never cross the boundary).

Two things to know before styling anything:

- **Class names are role-based already.** 412 distinct names, and an audit found
  only two describing position rather than role — both renamed. Style the names
  as they are; do not invent parallel appearance classes.
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

Four places where a layout decision is fixed in JSX, so CSS alone cannot change
it. Each one constrains the redesign.

**1. `UrlForm.tsx:140` — the scan form is a two-column grid in markup.**
`.a11y-form-grid` wraps two hard-coded `.a11y-form-col` divs, and which control
sits in which column is decided in JSX. A one-column or three-column form needs
the component edited, not restyled. This is the most likely thing a redesign
will want to move.

**2. `AppShell.tsx:33-45` — header / nav / content are three fixed siblings.**
`.a11y-shell-header`, `.a11y-shell-main`, `.a11y-shell-content`, plus
`App.tsx:304` toggling `.a11y-shell-with-nav` when sections exist. The grid can
be re-drawn in CSS, but nav-below-content or a top tab bar means moving
elements.

**3. `FixPreviews.tsx` — grid spans are chosen per card in JSX.**
`span={2|3|6}` becomes `.a11y-fixcard-span2/3/6`. The six-column rhythm is baked
into each call site, so re-proportioning the grid means editing every card.

**4. `DataTable` is a real `<table>`.** Correctly so — it is tabular data and the
semantics carry the accessibility. But the design system's own DataTable draws
rows as spaced cards, which a `<table>` can only approximate with
`border-spacing`. Reflowing to a card list at narrow widths is not reachable
from CSS without losing the table semantics. Decide this one deliberately.

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
