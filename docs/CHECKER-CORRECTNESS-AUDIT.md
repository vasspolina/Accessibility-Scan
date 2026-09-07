# Correctness audit: is what the checker says true?

**Date:** 26 August 2026 · **Question:** when the report states a fact,
is it right? Two halves: the findings, checked against a page whose
faults are known in advance; and the numbers and claims inside the report,
checked against their sources.

## Half one: findings against ground truth

A page was written with thirteen deliberate faults and six deliberately
correct controls beside them, served locally and scanned with the CLI. A
finding counts as correct only if it names the planted fault on the
planted element.

| # | planted fault | result |
| --- | --- | --- |
| 1 | image with no alt | caught, `image-alt`, 1.1.1, critical |
| 2 | grey text at 2.8:1 | caught, `color-contrast`, 1.4.3 |
| 3 | link reading "Read more" | caught, `link-text-vague`, 2.4.4 |
| 4 | button whose only name is an emoji | caught as a vague name, `sr-vague-button-name`, filed under 2.4.6 |
| 5 | input with a placeholder and no label | **missed** |
| 6 | heading jumps h1 → h3 | caught, `heading-order` (best practice, no criterion) |
| 7 | positive tabindex | caught, `keyboard-positive-tabindex`, 2.4.3 |
| 9 | duplicate id | caught, inside `markup-validation` |
| 10 | link with no text | caught, `link-name`, 2.4.4 |
| 11 | data table with no header cells | **missed** |
| 12 | 12×12 button standing alone | not flagged, **correctly**: WCAG 2.5.8's spacing exception passes an undersized target with nothing within a 24px circle, and the code applies exactly that |
| 13 | `div onclick` with no tabindex | **missed** |
| 14 | `aria-hidden` on a focusable link | caught, `aria-hidden-focus`, 4.1.2 |
| 15 | viewport with zoom disabled | caught, `meta-viewport`, 1.4.4 |

Controls: the alt-text image, the readable paragraph, the descriptive
link and the aria-labelled button were all left alone. The labelled name
field was flagged for a missing `autocomplete="name"`, which is a true
finding under 1.3.5 rather than a false alarm. Two advisory findings were
correct as written: the skip-link note says the landmarks meet the letter
of the law, and the tap-spacing note concerns the two emoji buttons 4px
apart, not the tiny one.

**Precision: 10 of 10 findings on planted faults were true; 0 false
alarms on the six controls. Recall: 10 of 13 planted faults, 3 missed.**

The three misses, and why:

- **Placeholder-only field.** The rule that cards these exists
  (`form-field-placeholder-label`) but treats visible text beside a field
  as its label, and the test page put another field's label beside it. On
  a real form the same heuristic could accept a neighbour's label. Worth
  tightening to text that is not already the `for` target of another field.
- **Header-less data table.** No rule, in axe or here. Two rows of `td`
  with no `th` is a 1.3.1 fault and a common one.
- **`div onclick` without tabindex.** The keyboard evidence looks at
  focusable elements and at key handlers; an inline click handler on a
  non-focusable element is invisible to it. The re-audit named this
  blind spot; it is still open.

## Half two: the report's own numbers and claims

- **Arithmetic.** Conformance rows: failed 8 + nothing found 16 + needs a
  person 26 + not measured 0 = 50, the table's stated total. The
  summary's "11 issues" counts accessibility findings only, and the two
  design-clarity items are excluded, which is the documented rule. The
  score is computed from the same eleven.
- **Criterion mapping.** Every finding with a criterion carried the right
  one (1.1.1, 1.4.3, 2.4.4, 2.4.3, 4.1.2, 1.4.4, 1.3.5). The emoji button
  under 2.4.6 is the one debatable choice: an unhelpful name is 4.1.2's
  subject as much as 2.4.6's.
- **Fix kinds.** Autocomplete and tabindex → code; contrast and target
  spacing → design; vague link → content. All as the rulebook defines.
- **Legal statements.** "In force since June 2025" for the BFSG: correct,
  28 June 2025. The statement's model follows Implementing Decision (EU)
  2018/1523: correct, that is the model statement under Directive (EU)
  2016/2102. Article 13(2) and Annex V of the European Accessibility Act:
  correct references for the information duty and its content.
- **Prevalence claims in the vision simulator.** "About one man in twelve
  is colour blind": the usual figure is around 8 % of men, so correct.
  Deuteranopia "~6 % of men" and protanopia "~1 % of men": within the
  published ranges. Tritanopia "rare": correct. Low vision "~1 in 30
  people": moderate-to-severe distance impairment is estimated at roughly
  3–4 % of people, so fair. Cataracts "common over 60": correct.
- **The scan's own limits.** "A scan of this kind reaches somewhere
  between a third and a half of accessibility problems": consistent with
  the published estimates for automated testing. "22 of the 50 items need
  a person": matches the registry's manual count for that page.

## Verdict

What the checker states is true: no false finding on the test page, every
criterion and fix kind right, every number consistent with the others,
every legal and medical claim checked. What it misses is the concern:
three of thirteen planted faults, each a common one, each with a known
cause. Those three are the work.

## Status, same day — the three misses closed

Re-run against the same ground-truth page after the changes: **13 of 13
planted faults caught, still no false alarm on the six controls.**

- **Placeholder-only field** — two causes, both in the "adjacent text"
  heuristic: a `<label for>` naming another field counted as this field's
  label, and a neighbouring button whose only text was an emoji counted
  because two code units passed the length test. Adjacent text now has to
  be words, and a label for another control is that control's.
- **Header-less data table** — a new rule, `component-table-no-headers`
  (1.3.1, Level A): a visible table with two or more rows and columns, at
  least three cells of text, no header cell or header role, and no
  presentation role. Layout tables stay out by role; one card per page
  with the count in it. Plain-language title, impact and fix in four
  languages, written without markup because the voice suite refuses it.
- **`div onclick` without tabindex** — the mouse-only evidence now unions
  the init script's tracked listeners with every element carrying an
  inline `onclick` attribute, the case the script could never see. Caught
  as `keyboard-mouse-only`, 2.1.1.
