# Accessibility audit — the checker widget itself

Audited 29 July 2026 against WCAG 2.2 Level AA plus 2.4.13/2.4.12/1.4.6 (AAA),
per the exhaustive layout prompt. This is the durable record that prompt asks
for: what was verified, how, what was fixed because of it, and what still
needs a human. **This document does not claim conformance.** It states what
was checked and what was found.

Stack: Vite + React + TypeScript, rendered into a shadow root on a host page.
No component library; every widget here is hand-rolled, so every keyboard
contract is ours to prove.

## Defects found by this audit, fixed the same day

1. **Live regions mounted with their message** (§4.1.3; forbidden-list item).
   The error paragraph carried `role="alert"` and mounted together with the
   error text; the waiting message carried `role="status"` and mounted when
   loading began. A region that arrives already full has not changed, so
   assistive technology may say nothing. Both announcements now flow through
   regions that are in the DOM from first render and empty until there is
   something to say. Verified in the deployed build: both regions present and
   empty before any interaction.

2. **Heading hierarchy** (1.3.1, 2.4.6). The undecided-checks section titled
   itself with `<h3>` while every sibling section uses `<h2>` — one section
   demoted a level for no structural reason. Now `<h2>`.

Previously fixed under the same standard, this week: `document.activeElement`
piercing for shadow roots (the walker reported a false critical on any web
component); three type sizes with a 16px floor; container queries so the
layout adapts to the panel rather than the viewport; `scale-down` thumbnails;
the score caveat; "A control" instead of "Something".

## Verification, stage by stage (§7)

**7.1 Automated.** The product's own pipeline runs axe-core 4.12.1 in real
Chromium against the deployed demo page. Result: zero violations, score
100/100 (was 72 before this week's fixes — the deficit was our own walker
misreading shadow DOM, plus real landmark and overflow faults on the host
page, all fixed).

The report state, which the pipeline cannot reach because it always scans
fresh, is scanned through the dev fixture: canned report rendered, every card
and drawer expanded, axe 4.12.1 against the shadow root with tags
wcag2a/2aa/21a/21aa/22aa/best-practice. **Zero violations and zero
incompletes, in light mode and in dark mode** — first run 29 July; re-run 30
July after the report grew age-inclusive notes, research lines and stacked
audit rows, with the same result. The evidence is re-earned when the report's
surfaces change, not assumed from the last pass. axe's coverage remains the
floor, not the finish line: it reaches roughly half of issues by volume.

**7.2 Keyboard.** Initial state: machine-verified by our own keyboard layer —
real CDP Tab presses, focus-visible detection, ring-contrast measurement at
3:1 against the composited backdrop. Zero findings. Report state: partially
verified — every stop that registered under real key focus in the browser
pane showed a visible ring, but the pane resets focus between tool calls, so
a full ordered walk was not possible here. **Needs human verification.**
Known-good by construction and spot-check: finding cards are
`<button aria-expanded aria-controls>` disclosures; the technical drawer is
native `<details>`; the vision simulator uses `aria-pressed` toggles; the
mode selector is two `aria-pressed` buttons in a labelled group; no positive
tabindex anywhere; `hidden` rather than conditional render for collapsible
card bodies, so `aria-controls` always resolves.

**7.3 Screen reader.** Not run — no real AT in this environment. Expected
announcements (from the accessibility tree):
- On scan completion, the persistent status region announces "Check complete
  in N seconds. Score N out of 100, N issues found. The full report follows."
- On error, the persistent alert region announces the error text.
- During a scan, the status region announces milestone messages only; the
  seconds counter is `aria-hidden` so it does not announce every second.
- Each finding header: "<plain title>, button, collapsed/expanded".
**All of this needs confirming with NVDA+Firefox and VoiceOver+Safari.**

**7.4 Manual criteria.** Verified by the product's own deterministic layers
against the deployed page: reflow at 390px (no horizontal scroll), 200% text
zoom (no clipped text), forced-colors focus visibility, focus-ring contrast,
reading order, tap targets. Verified by inspection: `prefers-reduced-motion`
disables every animation including the spinner (two independent CSS layers);
type in rem throughout; `autocomplete="url"` on the URL field; paste is not
blocked anywhere. Dark mode: axe-clean including contrast, measured through
the dev fixture with the report fully expanded (see 7.1).

**7.5 Self-audit.** Criteria the widget touches:

| SC | Level | Verdict | Evidence |
|---|---|---|---|
| 1.1.1 | A | Pass | Icons aria-hidden inside labelled controls; thumbnails alt="" (decorative — adjacent text describes); simulator SVG filters aria-hidden |
| 1.3.1 | A | Pass | Sections+headings; h2 hierarchy repaired this audit; lists are ul/li; axe clean |
| 1.3.2 | A | Pass | No CSS reordering; audit-row stacking uses wrap+order on one row's children, count announced after text either way |
| 1.3.5 | AA | Pass | autocomplete="url"; login fields deliberately off (third-party site credentials, not user data — keeping managers from mis-saving them against our origin) |
| 1.4.1 | A | Pass | Severity has text chips, not colour alone; links underlined |
| 1.4.3 | AA | Pass | Carbon tokens 4.5:1 in light; dark scheme axe-clean via the dev fixture, report state fully expanded |
| 1.4.4 / 1.4.10 / 1.4.12 | AA | Pass | rem type; measured at 200% zoom and 390px by our own scanner; no fixed text heights |
| 1.4.11 | AA | Pass | Focus ring measured ≥3:1 by our own contrast layer |
| 1.4.13 | AA | N/A | No hover-revealed content; no title-attribute tooltips |
| 2.1.1 / 2.1.2 | A | Pass (initial) / **Needs human (report state)** | CDP walk zero findings; no traps by construction (no modals in the widget) |
| 2.1.4 | A | N/A | No character-key shortcuts |
| 2.2.1 / 2.2.2 | A | Pass | No timeouts; spinner is an essential activity indicator and stops under reduced motion; nothing else moves |
| 2.4.1 | A | Pass (technique) | Landmarks + headings per section — the WCAG-sufficient technique; no skip link inside the widget (host page's concern) |
| 2.4.3 | A | Pass | DOM order = visual order; no positive tabindex |
| 2.4.6 | AA | Pass | Distinct section headings; distinct card titles |
| 2.4.7 | AA | Pass | :focus-visible rings, :focus fallback on inputs; forced-colors uses outline not box-shadow |
| 2.4.11 | AA | Pass | No sticky chrome inside the widget |
| 2.5.2 | A | Pass | All actions on click, none on pointerdown |
| 2.5.3 | A | Pass | No aria-label contradicting visible text (checked by grep and by our own label-in-name guidance) |
| 2.5.7 | AA | N/A | No drag interactions |
| 2.5.8 | AA | Pass | Buttons padded ≥24px; measured by our own tap-target layer |
| 3.2.1 / 3.2.2 | A | Pass | Nothing changes context on focus or input; mode buttons change state only |
| 3.2.6 | A | N/A | Single view |
| 3.3.1 / 3.3.2 | A | Pass | Visible labels via htmlFor; errors in text through a persistent alert region |
| 3.3.7 | A | Pass | Nothing re-asked |
| 3.3.8 | AA | Pass | No authentication to use the tool; paste never blocked |
| 4.1.2 | A | Pass | Native elements throughout; aria-expanded/pressed state on every toggle |
| 4.1.3 | AA | Pass | Persistent regions, empty until filled — repaired this audit |
| 2.4.13 | AAA | **Partial** | 2px rings with offset; not yet audited against the "area of a 2px perimeter" formula on every control |
| 1.4.6 | AAA | Not attempted | Palette is Carbon AA; 7:1 not pursued |

## Known gaps and the human test plan

1. **Report state under real AT.** Scan any site, then: NVDA+Firefox and
   VoiceOver+Safari; confirm the completion announcement fires once; H
   through headings (expect h2 sections, h3 only inside history/principles);
   Tab through ~30 stops confirming visible rings and no trap; expand a card
   with Enter, confirm "expanded" is announced; open the technical drawer.
2. **2.4.13 (AAA)** formal check if pursued.

Closed since first written: axe on the report state, and dark-mode contrast —
both run 29 July through the dev fixture (`?fixture` on the dev harness),
every state expanded, zero violations and zero incompletes in both colour
schemes. The 1.4.3 dark-mode verdict above is upgraded on that evidence.
Re-earned 1 August after the audience-mode toggle shipped: both audience
modes, both colour schemes, cards collapsed and expanded — the expanded run
caught the professional snippet `<pre>` as a keyboard-unreachable scrollable
region (our own rule), fixed with `tabindex="0"` and a `group` label before
release; a first attempt with `role="region"` failed `landmark-unique` and
was corrected. Zero violations in every state after the fix. The site-audit view, which
later gained the same audience treatment (rule-id chips, BFSG sentence),
was re-run the same way: clean in both modes and both schemes — after one
false alarm from a stale hot-reloaded stylesheet inside the shadow root,
which a full page reload resolved. Axe runs after CSS edits need a fresh
mount, not hot module replacement. Re-earned once more on 1 August after
the Verify design-system restyle (PP Telegraf, 18/28 type scale, tinted
severity tags, focus ring with inner contrast line): the full matrix —
both audience modes, both colour schemes, collapsed and expanded — zero
violations, and the deployed demo self-scans at 100 with no findings.
The system's 14px label size was deliberately not adopted; the 16px
floor in styles.css explains why, and the system's own readme concurs
(every component must pass the product's checks). The self-scan then
drove three more rounds on its own product — the worded "✓ Selected"
tag on option cards (1.4.1), the gov.pl exception moved onto its button
and then trimmed to a short name, the AI-review checkbox split into a
four-word label plus aria-describedby description — each deployed,
re-scanned, and back at 100 before the next began.

## Forward-looking (non-normative, WCAG 3 Working Draft)

The one direction worth naming: task-level testing. The task a disabled user
must complete here is "scan a site and act on one finding" — the machine
walk covers the controls but not the task. The human plan above is written as
that task. Nothing was restructured for the draft.
