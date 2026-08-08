---
paths: ["src/components/**", "src/app/**"]
---

# Design system

The source of truth is the Claude Design export ("Accessible Scan Design
System"), and the sync is one way: design → code. Never edit the export from
here. `.design-sync/NOTES.md` says the same thing and means it.

## Where things live

- **Tokens:** `widget-business/src/styles/tokens.css` — Foundations v2, ported
  verbatim and verified against the export programmatically (131 light, 38
  dark). Semantic names only: `--surface-raised`, `--content-secondary`,
  `--action-primary`, `--status-danger-surface`. The private ramp
  (`--_sand-*`, `--_ember-*`) exists to feed those and is not for direct use.
- **Components:** `widget-business/src/components/<Name>/` containing
  `<Name>.tsx`, `<Name>.css` and `index.ts`.
- **Stylesheet manifest:** `widget-business/src/styles/components.css`.

## Import convention

`import { Button } from "./Button"` resolves to the directory's `index.ts`.
When a flat `Name.tsx` is replaced by a `Name/` directory, delete the flat
file — every existing call site then keeps working untouched.

## The four rules that are not obvious

These were each found by breaking something.

**1. A component must not import its own CSS.**
`import "./Button.css"` makes Vite inject it into `document.head`. This widget
renders inside a shadow root, so that stylesheet can never cross the boundary
inward, and it *does* leak onto the host page — the one thing the shadow root
exists to prevent. Add one `@import` line to `src/styles/components.css`
instead. Forgetting renders the component unstyled with no error.

**2. No literal values in component files.**
Every colour, size, space, radius, shadow and duration references a token.
Two exceptions exist, both documented at the point of use:
- `SeverityTag`'s five fills are fixed hex on purpose — white-on-fill is
  verified AA per fill, and a theme token would flip lighter in dark mode and
  break the pair.
- Values Foundations v2 has no token for. Flag them in a comment saying what
  is missing; do not round to the nearest token. Known gaps: font weights,
  control heights (nothing lands on 40px), fluid display sizes, and a
  narrow-measure label leading.

**3. Each port adds itself to the blanket-button `:not()` list.**
`styles.css` has `.a11y-widget-biz.a11y-widget-biz button { border-radius:
999px }` at (0,2,1), which outranks any component class and silently turned
`IssueRow`'s 10px card into a lozenge. The rule still serves every button the
migration has not reached, so it stays; ported components opt out by name.

**4. Delete the legacy rules, or the port is inert.**
Porting a component achieves nothing until its old rules are removed from
`styles.css` and `styles.system.css`. The button rendered the old colour at
the old size until 24 legacy `.a11y-btn` rules were deleted. Check for
`!important` written to beat the *previous* component's inline styles — a
ported component has none, so that `!important` is now actively wrong.

## Verify before claiming a port is done

- `npx tsc -b` and `npx vitest run` in `widget-business`.
- Measure computed styles in the browser. Reload with a cache-busting query —
  a plain reload has served stale CSS more than once, and HMR does not
  reliably apply custom-property changes.
- Compute contrast for every foreground/background pair the component can
  produce, including hover and selected states. **axe does not evaluate hover
  states.** A row inversion shipped at 1.10:1 and axe was clean.
- Check both themes and at 375px as well as desktop.

## Inversion is not free

Several components invert to black on hover or when chosen. That is safe when
a component owns everything it renders (`IssueRow`, `OptionCard`, a filter
pill). It is not safe for a shell around other people's content: a findings
table row holds severity pills, rule chips and links coloured for a light
ground, and each needs an on-dark treatment or it fails contrast. Where the
content is not the component's own, use a tint.

## A new component needs approval first

Do not add a component to `src/components/` without asking. The design system
has thirty; the app does not need all of them, and one invented locally is a
divergence that no sync will ever reconcile.

## Report defects upstream, do not absorb them

The export has real bugs. Deviate where correctness demands it, say so in a
comment at the point of deviation, and tell the user. Open items:
- `FactCard`'s note on an accent card is 3.98:1 in the source (fixed here to
  6.09:1).
- `OptionCard`'s radio takes `accent-color: var(--interactive)`, which is
  near-black on a card that turns black when chosen.
- `Dialog` has no focus trap, does not restore focus, and hardcodes
  `id="dlg-title"` — a duplicate id when two exist, which this report flags
  on other sites.
- `Card.prompt.md` and `guidelines/radius-borders.html` still describe the
  retired Carbon-flat corners.
- `SeverityTag.prompt.md` quotes contrast figures up to 0.4 below measured.

## Composition rules

These come from the export's own annotations and cannot be enforced by a
component, because a component only ever sees itself. They belong in review.

**The scan section has a fixed order**, because it is the reading order of a
report: SectionHead (index + title + lead) → findings list → the number row →
metadata → related checks.

- **SectionHead** opens each section. Indices run in document order across the
  whole report and never restart.
- **IssueRow** carries the findings, ordered by what to fix first, not by
  criterion number. Reach for DataTable instead when the findings need
  columns, sorting or expansion.
- **FactCard row:** one accent-red card (the score), one black card (the good
  news), the rest flat grey. **Never two accent cards in a row.**
- **SpecList** sits under the numbers as read-only metadata — standard, pages,
  date, what still needs a person.
- **RelatedChecks** closes the section with two to four onward links, each
  with a reason.
- **SeverityTag** is the only place severity is expressed, and the row never
  relies on colour alone.

Other annotated anti-patterns worth knowing:

- Two primary buttons side by side. One primary, everything else secondary or
  ghost.
- Cards nested inside cards for hierarchy. One card, sections inside it
  separated by space.
- Hairline dividers plus zebra plus borders on one table. Spacing separates;
  a single hover state highlights.
- Five option cards in a wrapping grid. Two or three per row, or a Select.
- A dense 32px list row with 12px type to fit more findings. Fewer rows at
  full size — the count column carries the scale.
- Deltas shown without the baseline date. The header names the scan being
  compared against.
