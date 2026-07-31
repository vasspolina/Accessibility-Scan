# Accessibility-Scan

Accessibility Scan checks a page, or a whole site, in a real browser at desktop and phone width. Rule-based tests plus an optional AI review, mapped to WCAG 2.1 AA. You get a score, plain-language findings, a screenshot of every problem, and a screen-reader walkthrough of your own page. Not a fix. A clear picture of where you stand.

**Try it:** https://a11y-checker-v2-production.up.railway.app/demo.html

## What a scan runs

Every scan renders the page in headless Chromium and layers:

- **axe-core** for the rules it owns — including its *undecided* results, which
  most tools discard. Anything the engine refused to judge (text over a
  photograph, a video it cannot watch) is reported as a decision for a person,
  marked with whose desk it lands on.
- **Deterministic probes** for what axe cannot see: a real keyboard walk with
  Tab presses (shadow-DOM aware), focus-ring contrast against the composited
  backdrop, dialog behaviour (Escape, focus, close controls), forced-colors
  mode, reduced-motion, text resize to 200%, reflow measured at the 320px width
  WCAG defines (in a real phone emulation: touch on, coarse pointer), tap
  targets and the spacing between them, pinned chrome coverage,
  reading order versus source order, typography (including leading judged
  against line length), markup validity, and GDPR consent banners — read in
  nine languages, inside consent-platform iframes if that is where they live.
- **An optional AI review** that reads the page the way a person might,
  including an age-inclusive lens: the decisions that pass every rule and
  still cost a visitor in their sixties or eighties the task. Its findings
  are marked as such, its hedged or low-confidence claims are dropped, its
  framing rules are enforced in code rather than requested in prose, and
  where a deterministic rule proved the same fault the measured finding wins
  — one fault, one card.

Common findings also carry a hand-curated "what the research shows" line —
WebAIM Million, WHO, Click-Away Pound and their peers, written without a
single digit so an invented or stale figure can never reach a reader. A test
enforces that, along with the vocabulary the report refuses across all its
copy.

The score counts only findings groundable in WCAG A/AA. Design notes, dark
patterns, and AAA advice are reported but never move the number, and the
report says so rather than letting a 100 read as a conformance claim.

## The two widgets

Both embed with a script tag and render into a shadow root, so host-page CSS
cannot leak in.

- **`widget-business/`** — written for the person who owns the site. Plain
  language, POUR grouping, severity as "Fix first / Fix soon", fix routing
  (code / content / design / document), a printable report, an accessibility
  statement generator and a VPAT/ACR draft.
- **`widget/`** — the technical original: rule ids, selectors, WCAG numbers.

```html
<div id="a11y-widget-business-root" data-api-base="https://your-backend"></div>
<script src="https://your-backend/widget-business.js" defer></script>
```

## Running it locally

Node 20+. Three packages: `backend/` (Fastify + Playwright + axe-core),
`widget/`, `widget-business/` (Vite + React + TypeScript).

```bash
cd backend && npm install && npm run dev        # API on :8787
cd widget-business && npm install && npx vite   # dev harness on :5174
```

`backend/.env` takes `ANTHROPIC_API_KEY` for the AI review; without it, scans
still run and the report says the AI layer was skipped.

To work on the widgets without a backend at all, open the dev harness with
`?fixture` in the URL: canned reports for every state (findings, error,
bot-wall, site audit), with obviously-fake SAMPLE screenshots. Copy
`backend/node_modules/axe-core/axe.min.js` to `widget-business/axe.dev.js`
and the rendered widget can be axe-scanned in place — that is how the report
state and dark mode were verified.

## Tests

```bash
cd backend && npx vitest run          # unit + fixture-detection suites
cd widget-business && npx vitest run
```

The fixture suite scans `backend/public/qa-*.html` over `file://` — pages
built to contain known defects next to sections built to be correct, because
on a real site you cannot tell a false positive from a finding you had not
thought of. Several fixtures exist to prove a *silence*: a correct Polish
consent banner, a well-behaved shadow-DOM component, a dialog that does
everything right.

## The checker, checked

The widget is audited against the standard it enforces —
[widget-business/ACCESSIBILITY.md](widget-business/ACCESSIBILITY.md) holds
per-criterion verdicts with evidence, what each verification stage actually
ran, and an honest list of what still needs a human with a screen reader. It
does not claim conformance, which is a habit the report itself keeps too:
what was measured is stated, what was not is named.
