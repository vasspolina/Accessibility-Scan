# Verify — Accessibility Checker Design System

An accessibility-first, minimalistic design system for a professional
accessibility-checking tool: a product whose users audit websites and
applications against WCAG. The system is derived from **IBM Carbon Design
System** colors, spacing, motion and UX principles (Carbon is open source,
Apache 2.0), rendered in the user-supplied **PP Telegraf** typeface.

The product's own credibility depends on being accessible: every token,
component and screen in this system must itself pass the checks the product
performs.

## Sources

- **Typeface:** PP Telegraf (user-supplied OTFs, Regular 400 + Medium 500),
  in `assets/fonts/`. No other weights were provided.
- **Color / spacing / motion / UX principles:** IBM Carbon Design System
  (carbondesignsystem.com) — open source, Apache 2.0. Values are Carbon's
  published ramps; semantic naming follows Carbon's token vocabulary
  (`layer-01`, `text-primary`, `support-error`, …) so the system is legible
  to anyone who knows Carbon.
- No logo, brand mark, screenshots, Figma file or codebase were provided.
  **There is therefore no logo in this system** — the product name is set in
  plain PP Telegraf Medium wherever a mark would go.

## Product context

**Verify** is a working name for the accessibility checker this system
dresses. Core surfaces:

1. **Scan** — enter a URL or upload a file, choose a ruleset (WCAG 2.2 A /
   AA / AAA), run an audit.
2. **Results dashboard** — score, issue counts by severity, pass/fail
   breakdown by WCAG criterion.
3. **Issue list + detail** — each finding: severity, rule, affected
   elements, code snippet, how to fix, link to the WCAG success criterion.
4. **Report** — export/share a stakeholder-readable summary.
5. **Settings** — ruleset, theme (light/dark), motion and density
   preferences.

Audience is professional: accessibility specialists, QA engineers,
front-end developers, compliance leads. They work in the tool for hours,
scan long lists, and need density and precision over decoration.

## Accessibility rules (non-negotiable)

These are requirements, not guidance. A component that breaks one is a bug.

- **Contrast.** Body text ≥ 4.5:1 against its surface; large text (≥ 24px,
  or ≥ 19px medium) ≥ 3:1; UI component boundaries and state indicators
  ≥ 3:1. Both themes. Every semantic pair in `tokens/colors.css` was chosen
  against these floors.
- **Never color alone.** Severity, pass/fail and status are always
  encoded by an icon *and* a text label as well as color — the severity
  tokens are paired with a glyph and a word in every component.
- **Focus is always visible.** A 2px ring in `--focus` with a 1px inner
  contrast line, applied by default in `tokens/focus.css`. Never remove an
  outline without replacing it with something at least as visible.
- **Target size.** Interactive controls ≥ 24×24px (WCAG 2.2 minimum);
  40px is the default comfortable height, 48px on touch.
- **Motion.** All durations collapse to 0ms under
  `prefers-reduced-motion: reduce`. No parallax, no autoplay, no motion
  that conveys information on its own.
- **Semantics first.** Real `<button>`, `<a>`, `<input>`, `<table>`,
  headings in order, one `<h1>` per screen, labels tied to fields, live
  regions for scan progress and results. ARIA only where HTML cannot say
  it.
- **Keyboard parity.** Everything doable with a mouse is doable with a
  keyboard, in a sane order, with a skip link to main content.
- **Zoom and reflow.** Layouts survive 200% zoom and a 320px-wide viewport
  without horizontal scrolling. Type is sized in rem.

## Content fundamentals

The voice is **plain, specific, and unalarmed**. Users are told what is
wrong, where, and what to do — never scolded, never hyped.

- **Person.** Address the user as *you*; the product never says *I*. Rules
  and findings are stated impersonally: "Image is missing alternative
  text", not "You forgot alt text".
- **Casing.** Sentence case everywhere — buttons, headings, tabs, table
  headers, menu items. No Title Case, no ALL CAPS except the small
  letter-spaced `--type-label-size` eyebrow labels.
- **Findings are named by the problem, not the rule number.** Headline:
  "Insufficient contrast between text and background". Subline carries the
  criterion: "WCAG 2.2 · 1.4.3 Contrast (Minimum) · Level AA".
- **Fixes are imperative and concrete.** "Set the text color to #525252 or
  darker to reach 4.5:1." Not "Consider improving contrast."
- **Numbers are exact.** "3.1:1 (needs 4.5:1)", "14 issues on 8 pages" —
  never "several" or "a few".
- **Buttons are verbs.** *Run scan*, *Export report*, *Mark as resolved*,
  *Rescan page*. Never *OK*, *Submit*, *Click here*.
- **Empty states are factual and next-step oriented.** "No issues found in
  this ruleset. Try WCAG 2.2 AAA for a stricter pass."
- **Errors say what happened and what to do.** "Couldn't reach
  example.com — the page returned 403. Check the URL or add credentials."
- **No emoji, ever.** Status is carried by icons and words.
- **Severity vocabulary is fixed:** Critical, Serious, Moderate, Minor,
  Pass. Never synonyms.

## Visual foundations

**Overall vibe.** Flat, dense, engineering-grade. Rectangular. Quiet
surfaces, loud only where a finding demands attention. It should read as an
instrument, not a marketing page.

- **Type.** PP Telegraf for everything; Regular 400 for body, Medium 500
  for headings, labels and buttons (no other weights exist — do not
  synthesize bold). There is no monospace face in this system: code
  snippets, selectors, hex values and ratios are set in PP Telegraf
  Regular, distinguished by a `--layer-01` background and a hairline
  border rather than by a different typeface. **Three type sizes only** — 28px heading, 18px body, 14px label
  (`tokens/typography.css`); hierarchy is carried by weight, color and
  space, never by a wider size ramp. Body text carries 1% (0.01em)
  letter-spacing for airiness at 18px. Legacy token names alias onto
  these three. Measure capped at 66ch. Tight
  tracking on display sizes, +0.04em on the small caps eyebrow.
- **Color.** Carbon Gray as the whole neutral structure; Carbon Blue 60 as
  the single interactive accent. Status/severity ramps are used *only* for
  findings, never decoratively. Maximum two surface levels visible at once
  (`--background` + `--layer-01`).
- **Light vs dark.** Light theme is white background, Gray 10 layers,
  Gray 100 text. Dark theme is Gray 100 background, Gray 90/80 layers,
  Gray 10 text — not pure black, not pure white text, to reduce halation
  during long sessions. Severity hues shift lighter in dark mode
  (`red-40`, `orange-40`) to hold contrast on dark surfaces.
- **Backgrounds.** Flat color only. No gradients, no photography, no
  patterns, no textures, no illustration.
- **Corners.** 0px is the default; 2px on inputs and cards where a hairline
  needs softening; pill only on severity tags and counters.
- **Borders.** 1px `--border-subtle` hairlines do the structural work —
  this system separates with lines and space, not with shadow. 2px
  `--border-strong` on the active/selected edge of a field or row.
- **Cards.** A card is a `--layer-01` rectangle with a 1px subtle border and
  no shadow. Shadow (`--shadow-overlay`) appears only on true overlays:
  menus, dialogs, tooltips, popovers.
- **Shadows.** Two only, both from `tokens/spacing.css`. No colored
  shadows, no glows.
- **Transparency and blur.** Used only for the dialog scrim (Gray 100 at
  50%). No frosted glass, no translucent panels.
- **Animation.** Carbon productive curves, 70–240ms. Fades and 2–4px
  translations only — no bounce, no scale-in, no spring. Scan progress is
  the one long-running animation and it is a determinate bar with a live
  numeric readout.
- **Hover.** Surfaces move one step (`--layer-hover`); buttons move to the
  next darker ramp step. Never opacity-based, never a color the user must
  compare to remember.
- **Press.** One further ramp step darker, no scale change, no shadow
  change.
- **Layout.** Fixed left navigation rail and a fixed top header; the
  results area is the only scrolling region. Content sits on Carbon's
  16-column-equivalent rhythm using the 2x spacing scale. Density is a
  user setting; the default is comfortable, not compact.

## Tables (Carbon data-table rules)

Any list of findings, pages, or records is a `DataTable`
(`components/core/DataTable.jsx`) — never a stack of bespoke divs. Rules,
after Carbon's data table:

- **Structure.** A real `<table>`: header row followed by data rows,
  minimum three columns. Column headers are `<th scope="col">` in
  label size, Medium 500, on `--layer-01` over a `--border-strong` rule.
- **Dividers, not stripes.** 1px `--border-subtle` row dividers; no zebra
  striping, no shadows, flat surfaces only.
- **Row hover** moves the row to `--layer-hover` even when rows aren't
  interactive — it helps scanning across columns.
- **Alignment.** Text left-aligned; numbers right-aligned with the header
  matching its column.
- **Casing.** Sentence case for headers and cells alike (the system's
  global rule overrides Carbon's Title Case headers).
- **Expandable rows** are the detail pattern: a 44px chevron `<button>`
  with `aria-expanded`, opening a full-width `--layer-01` panel under the
  row. One row open at a time; never a separate detail screen for a
  finding.
- **Never color alone** applies in cells: severity and status render as
  `SeverityTag`/`Tag` (glyph + word), not a colored dot.
- **Density.** Default row height ≈ 56px (two-line content allowed);
  padding from the 2x spacing scale (`--space-04` vertical,
  `--space-05` horizontal).
- Sorting, when added, lives in the column header with an arrow shown
  only on the sorted column; global actions (filter, export) belong in a
  toolbar above the table, not inside it.

## Iconography

No icon assets were provided. The system uses **IBM Carbon Icons** (open
source, Apache 2.0) — the natural companion to Carbon's color and UX
foundations, and a 16/20/24/32px grid with a flat, single-weight, filled-
and-outline mix that suits an instrument-like UI.

- **Substitution flag:** this is a *substitution*, not a supplied asset
  set. If the product has its own icon set, supply it and this section
  should be replaced.
- Delivery: CDN (`@carbon/icons` via unpkg) rather than copied binaries,
  since no local set exists to copy.
- Default size 16px inline with body text, 20px in navigation and buttons,
  32px in empty states.
- Icons are decorative unless they carry meaning: `aria-hidden="true"` when
  paired with a visible label; an accessible name when standing alone
  (icon-only buttons always carry one).
- Severity glyphs are fixed so they can be learned: error-filled
  (Critical), warning-filled (Serious), warning-alt (Moderate),
  information (Minor), checkmark-filled (Pass).
- No emoji. No unicode glyphs standing in for icons. No hand-drawn SVG.

## Index

- `styles.css` — the entry point; imports everything below.
- `tokens/fonts.css` — PP Telegraf `@font-face` rules.
- `tokens/colors.css` — ramps, semantic light theme, `[data-theme="dark"]`.
- `tokens/typography.css` — families, weights, type scale, measure.
- `tokens/spacing.css` — 2x grid, radii, borders, target sizes, shadows.
- `tokens/motion.css` — Carbon easings, durations, reduced-motion.
- `tokens/focus.css` — focus ring defaults, skip link, visually-hidden.
- `assets/fonts/` — PPTelegraf Regular + Medium OTFs.
- `guidelines/` — 15 foundation specimen cards (colors, type, spacing, focus, motion).
- `components/forms/` — Input, Select, Checkbox, Radio, Switch.
- `components/core/` — Button, IconButton, Card, Tag, Badge, Tabs, DataTable.
- `components/feedback/` — Notification, Dialog, Toast, Tooltip, ProgressBar.
- `components/a11y/` — SeverityTag, IssueRow, ScoreDial, SkipLink.
- `ui_kits/verify/index.html` — interactive click-through: Scan → Dashboard → Issue detail, with light/dark switch.
- `SKILL.md` — agent-skill entry point.

**Intentional additions** (no source defined an inventory): the `a11y/`
group — SeverityTag, IssueRow, ScoreDial, SkipLink — exists because the
product's core object is a WCAG finding.
