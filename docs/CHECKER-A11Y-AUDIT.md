# Accessibility audit of the checker itself

**Date:** 26 August 2026 · **Scope:** the embeddable widget (`widget-business`)
in every state the fixture harness renders — form, report (everyone),
report (professional), site audit, error, blocked — plus the demo host page.
**Method:** measured, not read. Every check below ran in a real browser
against the rendered widget with the shadow root's elements counted, so a
"clean" result is never a probe that found nothing to test. Automated
rules (axe-core, WCAG 2.x A/AA) first, then the things automation cannot
see: keyboard, focus, semantics, language, spacing, zoom, motion, forced
colours, error handling.

## Verdict

No Level A or AA failure that axe can detect, in any state, in either
colour scheme. Four real defects that only a person or a structural probe
finds, one of them a Level A failure. Four advisory points.

## Findings

### 1. The widget never declares its language — 3.1.1 / 3.1.2, Level A
After the visitor switches to Deutsch, every string in the widget is
German and there is no `lang` attribute anywhere in it: not on the host
element, not on `.a11y-widget-inner`, not on any child. The document is
`lang="en"`. A screen reader reads German text with English pronunciation
rules. Measured on report and professional after a switch: `hostLang: null`,
zero elements with a `lang` attribute, heading text "Ihr Ergebnis".
**Fix:** set `lang={getLang()}` on the widget's root element and update it
on switch — one attribute.

### 2. `aria-controls="panel-clean"` points at nothing — 4.1.2, Level A
Professional mode. The tab "No issues found (2)" carries
`aria-controls="panel-clean"` and no element with that id exists while it
is unselected (the panel is rendered only when active). A screen reader
that follows the reference finds nothing. **Fix:** render both panels and
hide the inactive one, or drop `aria-controls` from a tab whose panel is
not in the DOM.

### 3. A data table without a name — 1.3.1, Level A
Professional mode's findings table (`.a11y-datatable`) has no caption,
`aria-label` or `aria-labelledby`, and its first header cell is empty (the
expand column). A screen reader's table list offers it as "table, 4
columns" with nothing to identify it. **Fix:** a visually-hidden caption
("Findings, most severe first" — the business table already has one).

### 4. A focusable tab panel with nothing to focus for — 2.4.3, advisory
Professional mode: `div[role="tabpanel"][tabindex="0"]` ("9 findings") is
22px tall and is a tab stop on its own before the table inside it. The
pattern is meant for panels with no focusable content; this one has a
table full of buttons. One extra, silent stop. **Fix:** drop `tabindex`
when the panel contains focusable content.

### Advisory
- **Empty submit keeps focus on the button.** The field gets
  `aria-invalid`, the message is in `aria-describedby` and announced through
  `role="alert"` — 3.3.1 is met. Moving focus to the field is the stronger
  pattern for keyboard and screen-reader users.
- **Professional title does not follow the language switch** ("example.com
  — scan results" stays English under Deutsch). Consistency, not a
  failure, and it becomes one once `lang` is declared and the text is not.
- **An unnamed `form` landmark** (the report-actions email form) and an
  `aside` named "Advertisement" (the plans bar). Both fine if intended;
  the aside's name is what a screen reader will say.
- **`aria-expanded` without `aria-controls`** on seven to ten toggles. Permitted; the
  panel follows the button in the DOM, so nothing is lost.

## Verified and clean
- **axe-core, WCAG 2.0/2.1/2.2 A and AA:** 0 violations in 6 states × 2
  schemes, 122–1,528 elements counted per state.
- **Keyboard:** focus enters the widget and leaves it; 82 stops on the
  report, 70 on professional, 11 on the form, no cycle or trap; every
  stop shows a focus indicator (outline on the control, or on the address
  field's shell). Order is column-by-column — bar, plans, rail, content —
  which preserves meaning (2.4.3).
- **Headings:** no skipped levels in any state; no h1 inside the widget
  (the host page owns it).
- **Names:** every focusable control has an accessible name; no positive
  `tabindex`; nothing focusable while invisible (the 9–21 candidates all
  sit under a `display:none` ancestor).
- **Images and icons:** every `img` has `alt`; every decorative SVG is
  `aria-hidden`.
- **Live regions:** 4 on the form, 14 on the report — scan progress,
  completion, copy confirmations, the simulator's condition.
- **Error handling:** empty submit sets `aria-invalid="true"`, associates
  "Enter a website address first. For example: example.com." through
  `aria-describedby`, and announces it through `role="alert"`.
- **Text spacing (1.4.12):** with 1.5 leading, 0.12em tracking, 0.16em
  word spacing and 2em paragraph spacing forced, nothing clips and the page
  does not overflow (the only "clipped" elements are the screen-reader-only
  ones, which are meant to be).
- **Reflow (1.4.10):** no horizontal overflow at 640px (200 % zoom) or
  320px (400 %), with text spacing applied; the repo's own 24-state reflow
  regression also passes.
- **Motion (2.3.3):** under `prefers-reduced-motion`, nothing animates or
  transitions longer than 200ms.
- **Forced colours (1.4.1 in Windows High Contrast):** the pressed chip,
  the current rail item and the pressed settings option all carry a
  weight or border difference, not colour alone; the option cards' state is
  the real 24×24 radio input, which the OS draws.
- **Targets (2.5.8):** every control at or above 24×24 except the tab
  panel above.
- **Accordions:** `aria-expanded` flips, the controlled panel exists and
  hides, focus stays on the button.

## Not covered here
Screen-reader output itself (VoiceOver/NVDA transcripts), and a
cognitive-load review of the copy beyond the slogan sweep already done.

## The clear-history dialog, reached by seeding a history entry
Measured after the audit above: `role="dialog"`, `aria-modal="true"`,
named "Delete this history?" through `aria-labelledby`; focus lands inside
on open and stays inside across six Tab presses; the rest of the widget is
`inert` while it is open and released after; Escape closes it and returns
focus to the "Delete this history" button; confirming clears storage and
moves focus to a `role="status"` paragraph that says so. Nothing to fix.

## Status, same day — fixed and re-measured

- **1 Language** — `lang` on the widget's root, following the switcher.
  Measured: `en` before, `de` after switching, on the element itself.
- **2 `aria-controls`** — set only on the tab whose panel is in the DOM.
  Measured: the selected tab references an existing panel, the other has no
  reference.
- **3 Table name** — the professional findings table has the caption
  "Findings, most severe first".
- **4 Tab panel** — a tab stop only when it has nothing focusable of its
  own; the panel measured here holds only the count line, so it keeps its
  stop, which is the pattern's intent.
- **Advisory: empty submit** — focus moves to the address field, which is
  `aria-invalid` and described by the error.
- **Advisory: professional title** — routed through the dictionary;
  "Scan-Ergebnisse" under Deutsch.

Axe over the form after an empty submit: 0 violations. Widget 180 tests,
lint clean.
