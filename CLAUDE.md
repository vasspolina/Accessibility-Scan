# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no root package: each of `backend/`, `widget-business/`, `widget/` and `accessible-web-design/` has its own `package.json` and lockfile, and commands run from inside that directory. Node 24 (`backend` declares `engines >=24`; CI uses 24). Node is not on the shell's PATH here: the local runtime is `.tools/node/bin/` (gitignored), which also holds `npm`, `npx` and `railway`. `.claude/launch.json` starts the dev servers through it: `backend` (:8787), `widget-business` (:5174), `widget` (:5173), `accessible-web-design` (:5175).

```bash
# backend/
npm run dev                         # tsx watch src/server.ts, API on :8787
npx tsc --noEmit                    # CI runs types first
npm test                            # vitest run (~60 files in test/)
npx vitest run test/scoring.test.ts # one file; add -t "name" for one test
npm run build                       # tsc to dist/
npm run build:widget-business       # builds ../widget-business, copies the bundle into public/
node dist/cli.js https://example.com   # the a11y-scan CLI (docs/CLI.md: exit 0 ok, 1 threshold missed, 2 scan failed)

# widget-business/
npx vite                            # dev harness on :5174
npx tsc -b && npm test              # types, then vitest
npm run check:reflow                # every fixture state at 320/375px in en/de/es/fr (needs Playwright chromium); see the font caveat under Type
npm run lint:css                    # undefined var(--x) and same-specificity collisions
node scripts/check-styles.mjs       # dead selectors and unstyled classes

# accessible-web-design/  (the public marketing site)
npm run check                       # strict per-locale build, axe on each locale, pseudolocale expansion check
```

CI (`.github/workflows/`) runs only for the package whose path changed: backend is tsc, test, build, then a CLI smoke test from outside the repo; widget is `tsc -b`, test, `check:reflow`, `lint:css`; site is `npm run check`.

**Working on the widget without a backend:** open the dev harness with `?fixture` (stops at the form) or a named state: `?fixture=report`, `?fixture=error`, `?fixture=blocked`, plus `&audience=professional`, `&scope=site`, `&at=<section id>`. `dev-fixture.js` stubs `fetch` for `/api/scan` and `/api/audit`. Copy `backend/node_modules/axe-core/axe.min.js` to `widget-business/axe.dev.js` to axe-scan the rendered widget in place.

`backend/.env` (gitignored) takes `ANTHROPIC_API_KEY`; without it scans still run and the report says the AI layer was skipped. Optional features (mail via `MAIL_API_KEY`, storage via `DB_PATH`) follow the same contract: absent means the feature reports itself as not set up, never a silent failure. All env is validated in `backend/src/config/env.ts`.

## Architecture

**Three deployables, one service.** `backend/` is a Fastify server that renders pages in Playwright Chromium and returns a JSON report. It also serves the two embeddable widgets as static files from `backend/public/`. Both widgets are Vite library builds to one self-contained IIFE (React bundled in) that mounts into a shadow root, so host-page CSS cannot leak in. Styles are imported `?inline` and injected into the shadow root (`src/utils/shadowMount.ts`). `@font-face` is ignored inside a shadow root, so `src/index.tsx` declares the fonts at document level, served from the backend.

- `widget-business/` is the product: the plain-language owner's report, with a professional audience toggle over the same scan. Almost all UI work happens here.
- `widget/` is the older technical widget. It has no tests or CI.
- `accessible-web-design/` is the public site, built once per locale by `i18n/build.mjs`.
- `design-system/` is the vendored design system. The widget depends on `design-system/production` as `@verify/design-system` (a `file:` dependency). `system-guide.md` is the spec; the rules in this file override it where they differ.

**The scan pipeline** is `scanUrlToReport` in `backend/src/services/scanPipeline.ts`, called by `POST /api/scan` and by the CLI (`src/cli.ts`). The steps:

1. `assertSafeUrl` (SSRF guard).
2. `render/renderPage.ts` renders at desktop and phone width and runs axe-core. It collects the raw signals every probe needs, such as tab walk, bounding boxes, consent banner and frames, in one page visit.
3. Each `services/<probe>/analyze*.ts` exports a pure `evaluate*` function over those signals. That is why probes are unit-tested without a browser.
4. The optional AI review runs in `aiReview/`.
5. `merge/mergeFindings.ts` merges and filters. Axe, probe and AI findings are fingerprinted and merged, so one fault gives one card and a measured finding beats an AI one. Speculative or contradicted claims are dropped in code.
6. `merge/scoring.ts` scores only provable WCAG A/AA findings. `conformance/` builds the criterion table, with criterion text per language.
7. Thumbnails are cropped last. A second, capped browser visit pictures the findings the render pass could not.

Concurrency is bounded by `render/browserPool.ts` (`MAX_CONCURRENT_RENDERS`, default 2, deliberately low because of container memory). Progress streams over `GET /api/scan/progress/:id`, keyed by a client-chosen `progressId`. `POST /api/audit` crawls a site (`crawl/`) and aggregates per-page reports. `routes/chat.ts` is the report-scoped assistant.

**`buildApp()` in `src/app.ts` is separate from `server.ts`** so route tests `inject()` requests with no port or browser. Storage (`src/storage/`) is `node:sqlite` and opt-in: every route works without a database. `GET /api/storage` reports whether `DB_PATH` is durable.

**Fixture detection tests.** `backend/test/fixtureDetection.test.ts` scans `backend/public/qa-*.html` over `file://`. Each fixture holds known defects beside sections built to be correct, and several exist to prove a silence. A new probe needs one of these, not only unit tests.

**Widget internals.** `App.tsx` owns the scan flow and report state. `src/api/` holds the scan and chat clients. Reader-facing copy lives in `src/lib/strings.ts` with `strings.{de,es,fr}.ts` beside it, and WCAG plain-language text in `wcagPlain*.ts`. The language is a module-level value in `lib/i18n.ts`, read at render time, not React context; English is the fallback for any missing key. Tests in `widget-business/test/` enforce voice and honesty rules on that copy (`voice.test.ts`, `voice.de.test.ts`, `chatHonesty.test.ts`, `researchLines.test.ts`). A copy change that trips them is usually the copy's fault. `ACCESSIBILITY.md` is the widget's own audit against WCAG.

Comments in this codebase are long and record what was measured and why a value is what it is. Read them before changing a number such as a timeout, a limit, or a concurrency value.

---

# Accessible Scan — project constraints

> **Restyled (user's instruction, 15 Oct 2026).** `global.css` was stripped to functional rules, then rebuilt from the Independent Publishing Fair poster: big plain ink-on-paper type in a tight block, with a marker highlight (orange, blue or green, yellow and pink end caps) laid over key phrases (severity words, rule ids, levels, status marks). **Highlights carry black text in both themes and every fill measures 7:1 or better**; this is the one place colour is allowed, so the black-and-white rule below still holds everywhere else. The per-section poster layout, round chat window and Hochuli chat typesetting below describe the previous design and are not currently in force.

## Type
- Three fonts: **PP Telegraf Light (300)**, **Regular (400)** and **Medium (500)**. Light is for **display sizes (40px and up) only** — big and thin, never small and thin (user's instruction, 21 Sep 2026; the served file is the family's Light cut, the thinnest we have). No other weights or families (mono is allowed only for meta/labels).
- Font sizes are **literal px values** in the markup — never font tokens or CSS variables for size, weight, or tracking.
- **Minimum size 14px.** Labels, buttons, pills, table headers and inputs use only two sizes: **15px** and **18px**.
- **Chat and report body text is 27px (20pt) at line-height 1.2** (user's instruction, 13 Oct 2026; 20pt rounded to a whole px so it stays literal). It is set on the `.a11y-widget-biz` root, so prose inherits it. Anything that is not prose declares its own size. Titles that sit above prose are **32px** so they stay above it. At 27px, a grid track or flex child needs `minmax(0, 1fr)` / `min-width: 0` and long words need `hyphens: auto; overflow-wrap: break-word`; `npm run check:reflow` catches the rest, **but only with the fallback font CI has**: this sandbox falls back to a narrow font and passed while CI failed in German at 320px. Run it with a wide default, e.g. a fontconfig file that prepends `DejaVu Sans` for `sans-serif` and `PP Telegraf`, via `FONTCONFIG_FILE=… CI=true npm run check:reflow`.
- **Letter-spacing follows the size** (Hochuli, *Detail in typography*, "The word" p.23–31; user's instruction, 18 Oct 2026, replacing "0.01em everywhere"). Measured on PP Telegraf: the space between two n is 0.13em against a counter of 0.29em, and the face is already fitted, so the 27px prose is **0**; 15px and 18px are **+0.01em**; 32px headings **-0.005em**; 40px display **-0.01em**. A run of capitals in prose (WCAG, ARIA, AA; `.a11y-caps`, wrapped in `ScanChat`) is **25px at +0.06em**, the least that leaves no hole in O, C or G. Kerning and common ligatures are on, synthesized bold and italic are off. The study page is `docs/letterspacing-study.html`.
- **Punctuation** is set by `smarten()` in `lib/typography.ts`, from the same book: **English takes the close em dash** (PP Telegraf's hyphen is 0.47em and its en dash 0.57em, so a spaced en dash reads as a hyphen), German, French and Spanish a spaced en dash after a no-break space; a span of figures (10–12, 10:00–18:00) is a closed en dash; English quotations take single marks first and double inside them, with a short quoted phrase's comma outside it; 1280 x 900 uses the face's x between no-break spaces. A spaced em dash is wrong everywhere: the interface strings were swept to the close form. Generated report text is separate: `replaceLongDashes` in `mergeFindings.ts` still removes long dashes from AI findings.

## Layout: the poster (user's instruction, 14 Oct 2026; layout only, from the symposium poster)
- **One hung gutter.** Every report section is two columns: a number in a 4.5em margin (a CSS counter, `content: counter(poster, decimal-leading-zero) / ""`, so it is a mark and not a word), everything else on one left edge beside it. The counter resets on `.a11y-report`, not on the shell: the shell is a size container, and style containment scopes counters, so a reset there never reached the sections. On a phone (`@container a11y-shell (max-width: 640px)`) the number sits above the title.
- **Titles are bold and tight, with small print under them.** Medium, line-height 1.05; a small label above where there is one (a severity word), small print below (criterion, who fixes it, level) at 15px. No rules, no boxes, no panels, no tinted slabs: space and size separate things. Colour that carries meaning keeps its box (severity edges, legal marks), and so do controls.
- **The findings are a schedule**: `DataTable schedule` draws the table as a grid (the count in the margin, severity word, title, small print) and states the table roles in the markup, because `display: grid` drops them in some readers. The header row stays for assistive technology and is clipped.
- **The arrow** (`PosterMark`): the page's word on a shaft and on both strokes of a head, tilted, at the top of the page. Decoration, `aria-hidden`; one word on the shaft on a phone, so it never runs off a 320px screen.
- **Round: buttons and the chat window, nothing else** (user's instruction, 14 Oct 2026). Every button is a pill (`--radius-pill`), the small row toggles are circles, and the conversation and the line you type in are two rounded panes (28px, 2px ink edge). Section bars, cards, tables and inputs outside the chat stay square: `--radius-sm/md/lg` are still 0.
- The poster layer is the last thing in `global.css` and every selector in it has **three roots** (`.a11y-widget-biz` ×3). Keep it exactly three: a bulk edit once made some four, and the desktop rules then out-ranked the phone rules inside the container query, so the phone layout silently never applied.
- **Before flattening any fill, measure the text on it, in light and dark.** A fill that looks decorative often carries the contrast: the notes panel is `rgb(22,22,22)`, the legal card sits on fixed yellow, and the failing stat tile, current screen-reader row and hovered related card invert. All four measured 1.00 to 1.10:1 when flattened.

- **No badges across the content** (user's instruction, 14 Oct 2026). A word is not boxed because it is short: no pills, chips or tags around counts, WCAG numbers, rule ids, fix types, standards or section labels, and no "Fastest" / "Most chosen" on controls. Colour that carries meaning keeps its box: severity, triage state, the legal status marks, round numbered markers. Before adding a bordered or filled span, ask what the box says that the word does not.
- **One of each.** One navigation: the Sections rail (the top bar is the brand and the run controls, no links). One set of report settings on screen at a time: the form owns Report style, Language, AI review and Scope while it is showing, so the rail does not repeat them; the conversation shows them as a block when asked. Before adding a control, search the page for one that already does the job.

## Chat typesetting (Hochuli, *Detail in typography*; user's reference, 14 Oct 2026)
- The conversation is set as an interview: the speaker hung in the 4.5em gutter on the first line's baseline (18px, roman, secondary ink), the words beside it at 27px/1.2 on a 60ch measure.
- Inside a turn, no space between paragraphs; every paragraph has a first-line indent (2em, 1.2em on a phone). Between turns, one line (1.2em) and nothing else: no rules, no grounds.
- List markers hang outside the block (an en dash, or the figure and its point); the list keeps its markers so it keeps its role. On a phone they come inside.
- Code is an inserted passage: 18px on the text's own 32.4px line, so it stays in register and the text after it returns to the grid; one line of space above and below.
- A soft rag: `text-wrap: pretty`, `hyphenate-limit-chars: 7 3 3`, hyphens on. Emphasis is Medium (500), never a synthesized bold; there is no italic cut, and a sloped roman is not an italic, so questions are told from answers by the label alone.
- Punctuation is set in `lib/typography.ts` `smarten()` on prose only (never code); the current rules are in the Punctuation bullet under Type above (the close em dash in English, single marks first), which replaces the spaced en dash and double marks this section was written with.

## Colour: strictly black and white (user's instruction, 14 Oct 2026)
- **The only colours are `#000` and `#fff`, in every state, light and dark.** No greys, no tints, no hue, no opacity below 1. The tokens keep their old names (`--purple-60`, `--red-*`, `--gray-*`) but every value is black or white; `--ink` and `--paper` are the two roles, and they swap in dark (`prefers-color-scheme` and `data-theme`), so ink is black on white and white on black.
- Every border, outline and rule is `var(--ink)`. A surface is paper or ink; text on it is the other one (21:1). A dark slab with light text is allowed (`.a11y-section-tint`, `.a11y-pro-scorecard`, the failing stat tile); a slab whose text depended on a mid-grey is paper with a 2px ink edge.
- **What colour used to say is said by shape.** Severity: Fix first is solid ink; Fix soon is a solid 2px edge on paper; Fix eventually is dashed; Minor polish is dotted. The legal marks follow the same ladder. The score dial is a solid arc on a dotted track, the meter a solid bar with ticks at 70 and 90. A disabled control is a dashed edge on paper, never faded (fading is grey). Focus is a paper ring then an ink ring, so one always shows. Pictures of the customer's page are `grayscale(1)`; the vision simulator is exempt because its colour is the point.
- Before adding a colour, a grey or an `opacity`, stop: there is nothing to add it to. To check a change, run the colour census (every computed colour in every state, light and dark, must be black, white or transparent) and a text-on-ground measurement; both were zero-failure when this rule was written.

## Everything else
- Colour, spacing, radius, motion still use tokens (`var(--…)`).

## Shipping
- Merging to `main` deploys the Railway service from `backend/` (Dockerfile, root directory `backend`). The widget is served from the committed `backend/public/widget-business.js`, which the image copies as-is: **rebuild and commit the bundle in the same change as any widget source edit** (`cd backend && npm run build:widget-business`). `/healthz` reports the deployed `commit` and a `widgetBundle` fingerprint; check it before concluding a deploy did not happen.
