# What the checker is missing

An audit of this product's own detection coverage, run on 21 August 2026
against commit `ba03ef6`.

## How this was produced, and how much to trust it

Five agents read the code and inventoried what the scanner actually detects —
152 distinct detections across 27 service areas. Four more took every WCAG
Level A and AA success criterion under one POUR principle each, across WCAG
2.0, 2.1 and 2.2, and judged coverage against that inventory. Four
adversarial skeptics then tried to *refute* every "not fully tested" claim,
because a false gap report wastes more time than no gap report; they
overturned three judgements, which are marked corrected in the data.

**Fifty-six criteria judged: 4 tested, 26 partial, 14 undecided-only, 12
absent.**

Findings below name a file and a line. Six of the most serious were then
verified by hand against the working tree before this document was written:

| Claim | Verified |
|---|---|
| `buildConformance` decides every row from `findings.length` alone | Confirmed — `buildConformance.ts:81-95`, the final `else` is `no-issues-found` |
| `incompleteChecks` has no reader | Confirmed — three writers, one comment, zero readers |
| 1.4.10 culprit fallback reaches for the 390px list | Confirmed — `analyzeMobile.ts:374-378` |
| `TextResizeSignals.failed` never set or read | Confirmed — line 39 only, the interface declaration |
| 1.3.5 finding omits its category arguments | Confirmed — `analyzeComponents.ts:151-157` ends at the URL |
| The skip-link decider is English-only | Confirmed — `/\bskip\b/i` at `analyzeComponents.ts:252` |

The rest carries agent authority plus an adversarial pass, not a hand check.
Treat a line number as a place to look, not as proof.

---

# WCAG coverage

## 1. Where it actually stands

Fifty-six A/AA criteria examined. **Four are genuinely tested** — 1.4.2 Audio Control, 1.4.12 Text Spacing, 2.4.2 Page Titled, 3.1.1 Language of Page: each has a deterministic detector that can flip its row to failed. **Twenty-six are partial** — a real detector exists but covers a fraction of the criterion, and in eleven of those the registry claims more than the code does. **Fourteen are undecided-only**: a signal is collected and surfaced as a question that can never become a finding. **Twelve are absent** — listed in `wcagCriteria.ts` or `wcag22Readiness.ts` and localised, with no probe, no axe rule and no prompt item behind them. Only **two** (1.2.4 Captions Live, 3.3.4 Error Prevention) are genuinely beyond automation. So the honest headline is: the product proves four criteria, gathers partial evidence on twenty-six, asks questions about fourteen, and says nothing about twelve — and its most serious defect is not any single missing probe but that **eleven rows print a Pass mark on evidence nobody gathered**, because `buildConformance.ts:72-95` decides every row from `findings.length` alone and reads neither `axe.incomplete` nor `meta.incompleteChecks`.

---

## 2. The real gaps

### 0. The one defect underneath eleven others: a check that did not run reads as a pass

`buildConformance` (verified lines 72-95) branches on `findingCount > 0` → failed, `coverage === "manual"` → needs-review, `aiAssisted && !aiRan` → needs-review, **else no-issues-found**. Nothing else is consulted. Meanwhile `grep -rn incompleteChecks backend/src` returns writers only — `renderPage.ts:3490` builds the array, `scanPipeline.ts:511` copies it into `meta`, and no reader exists anywhere. The same is true of `axe.incomplete`: `scanPipeline.ts:243` feeds it to `summariseUndecided` and nothing else.

Consequence, concretely: if the mobile pass throws, `mobileSignals` zero-defaults and **1.4.10 Reflow** (coverage `"automated"`) prints "no issues found". If the keyboard walk throws or truncates, **2.4.7** and **1.4.11** print Pass. If the text-resize override throws, `TextResizeSignals.failed` is set — and `grep -n failed backend/src/services/textResize/analyzeTextResize.ts` returns **line 39 only, the interface declaration** — so **1.4.4** and **1.4.12** print Pass. On a cookie-wall page axe returns `bgOverlap` incompletes for most text and **1.4.3** prints Pass. The professional view does not even show the warning banner (`App.tsx:627` gates it behind `!professional`).

**Build:** give `CriterionResult` a fourth status, `not-measured`, and pass `renderResult.incompleteChecks` plus the `axe.incomplete` rule ids into `buildConformance` with a map from check name → criterion ids. This is one function signature and one map. It fixes eleven rows at once and is the single highest-leverage change on this list.

---

### 1. 3.3.2 Labels or Instructions — declared `"automated"`, and no rule reaches the row

`wcagCriteria.ts:103` says coverage `"automated"`. In the installed axe-core 4.12.1, `grep -n wcag332 axe.js` returns **exactly one line, 32351** — `form-field-multiple-labels`, the rare two-`<label>` case. Every unlabelled-field rule (`label` at 32570, `select-name`, `aria-input-field-name`, `input-button-name`) carries `wcag412` as its first numbered tag, and `wcagTagsToLabel` (`mergeFindings.ts:15`) takes the first, so they all land on 4.1.2. Worse: axe's `label` rule lists `non-empty-placeholder` and `non-empty-title` in its `any` array (`axe.js:32573-32583`), so **a placeholder-only form is clean on both rows**. And `renderPage.ts:474` already records `hasProgrammaticLabel` on every field — a whole-tree grep across `backend/src` and `widget-business/src` finds **no reader**. The deciding signal is collected and thrown away.

**Build:** an evaluator over `dom.forms[].fields` emitting `category: "accessibility"`, `wcagCriterion: "3.3.2"` for any visible field where `hasProgrammaticLabel === false`, treating placeholder-only as a failure. Half a day; the data is already in `DomSignals`.

---

### 2. 1.4.11 Non-text Contrast — declared `"automated"`, measures only focus rings

`grep -rn '"1.4.11"' backend/src` returns one emitter: `keyboard/analyzeKeyboard.ts:340`, `keyboard-faint-focus`. `contrastRatio` is imported outside `services/contrast/` by that one file. So button and input borders, icons, checkbox and toggle state indicators, custom control boundaries and chart strokes — the criterion's actual subject — are never measured, while `wcagCriteria.ts:66` prints the question "Are buttons and icons dark enough to make out?" and a Pass.

**Build:** extend the existing in-page collector to read `borderColor`/`borderWidth` and background against the parent background for `button, input, select, textarea, [role="button"], [role="checkbox"], [role="switch"]`, run it through the same `contrastRatio` used at line 340 with a 3:1 threshold. The compositing helper (alpha-flatten against nearest opaque ancestor) is already written in `analyzeKeyboard.ts`.

---

### 3. 1.4.3 Contrast (Minimum) — one state, one viewport, one frame, and a silent pass when nothing was measurable

axe `color-contrast` is the only contrast measurement in the product. `grep -rn "emulateMedia" backend/src/services` returns three lines — `renderPage.ts:2559, 2591, 2619` — `reducedMotion` and `forcedColors` only. **No `colorScheme` emulation exists**, so a dark-mode site is never rendered in dark mode. No `.hover()`, no `mouse.move`, no synthetic `mouseover` anywhere in `services/`, so hover/focus/visited/disabled states are unmeasured. axe runs once at 1280x900, before the consent banner is located (`renderPage.ts:2929` precedes `collectDarkPatternsAcrossFrames` at 2964), and never at 390 or 320.

**Build:** three separate wins, cheapest first. (a) Feed `bgOverlap`/`bgImage` incompletes into the not-measured status from §0 — that stops the false Pass. (b) `page.emulateMedia({ colorScheme: "dark" })` and a second axe `color-contrast`-only run, which costs one `runOnly` call alongside the one already at `renderPage.ts:3343`. (c) Re-run the same rule at 390 inside the existing mobile pass.

---

### 4. 1.3.2 Meaningful Sequence — passes on every AI-off scan, while the evidence exists and is routed elsewhere

`wcagCriteria.ts:52` sets `coverage: "partial"` and **does not set `aiAssisted`** — unlike 3.3.1 at line 102, which does. Its only coverage is `buildPrompt.ts` SYSTEM_PROMPT item 9. So when `aiRan === false` (the crawl default, and the state whenever no key is set or the review times out) the row falls through `buildConformance`'s final `else` and prints no-issues-found. Meanwhile `readingOrder/analyzeReadingOrder.ts:33` hardcodes `wcagCriterion: "2.4.3"` for CSS-reordered content — the textbook 1.3.2 failure — so the checker's own evidence is routed past the row it belongs to.

**Build:** add `aiAssisted: true` to line 52, and emit the reading-order finding against 1.3.2 as well as 2.4.3. Two lines.

---

### 5. 1.4.10 Reflow — a live logic bug that fabricates failures, plus the missing vertical half

`analyzeMobile.ts:374-378`: when the 320 test fails but every 320 culprit has been filtered out by the criterion's own 2D-content exception, `culprits` falls back to `m.overflowingElements` — **the 390px list, collected without that exception** — and each is emitted at severity `serious` with criterion `"1.4.10"` and `width = 320`. Elements the criterion explicitly exempts are reported as Level AA failures. Separately, 1.4.10 also forbids two-dimensional scrolling at 256 CSS px of height, and every `setViewportSize` call in the codebase uses height 844 or 900.

**Build:** when the 320 culprit list is empty, keep the single `body` fallback row that already exists at lines 379-388 rather than reaching for the 390 list. Add a 1280x256 measurement pass beside the existing `collectReflow320InPage` call at `renderPage.ts:3357`.

---

### 6. 2.4.1 Bypass Blocks — a Level A row decided by an English-only regex

I confirmed axe's `bypass` rule carries `reviewOnFail: true` (`axe.js:32139`), so it can only ever produce an incomplete. The sole decider is `component-skip-link` (`analyzeComponents.ts:250-267`): it fires unless one of the first six links has an accessible name matching `/\bskip\b/i` with an `href` starting `#`. "Zum Inhalt springen", "Aller au contenu" and "Naar de inhoud" all fail it. It accepts **no** alternative bypass mechanism — a page conforming via a `<main>` landmark (ARIA11) or heading structure (H69), both of which axe's own rule passes, is still marked "Fails 2.4.1". The product ships a German site and localises this table into three languages.

**Build:** widen the pattern per report language, and clear the finding when a `<main>`/`[role="main"]` landmark or an `<h1>` plus heading structure is present. Both are already in `DomSignals`.

---

### 7. 4.1.2 / 4.1.3 / 3.3.1 / 3.3.3 — nothing is ever activated, so no state ever changes

One root cause, four rows. `grep -rn "keyboard.press\|\.click(\|dispatchEvent" backend/src/services/render/renderPage.ts` returns four lines: `Tab` at 2057, 2713 and 3273, `Escape` at 2692. No Enter, no Space, no arrow keys, no click, no form submission, no Shift+Tab anywhere in the whole render. So: `aria-expanded` that never flips, `aria-checked`/`aria-pressed` out of sync, a slider whose `aria-valuenow` never moves — the entire "states, properties and values that can be set by the user" clause of **4.1.2** — is unreachable, and menus, tabs and accordions are only ever audited closed. **4.1.3** is about what happens after a state change and the pipeline never produces one; its only signal is a count of `[aria-live]` elements at `renderPage.ts:684`, which a single decorative live div sets to 1 and silences. **3.3.1** and **3.3.3** are about the error state, which is never brought into existence — `formErrorAssociationUndecided` sees only errors already rendered at load, and only inside a `<form>`.

**Build:** a bounded activation pass — for up to N elements matching `[aria-expanded], [role="tab"], [role="switch"], summary, [aria-haspopup]`, press Enter, snapshot the attribute plus a DOM hash before and after, restore. That single pass decides 4.1.2's dynamic half, gives 4.1.3 a real behavioural signal, and (extended to submitting a form on a same-origin page with no external action) 3.3.1 and 3.3.3. This is the largest item on the list and the one that converts four "partial" rows into real coverage.

---

### 8. 2.1.1 Keyboard — the commonest failure is filtered out before it is examined

`collectMouseOnlyControls`' `FOCUSABLE` list (`renderPage.ts:2183`) includes the bare attribute selector `[tabindex]`. So `<div tabindex="0" onclick>` with no keydown handler — the single most common 2.1.1 failure — is classified as reachable and dropped, and so is `tabindex="-1"`, which the keyboard cannot reach at all. The probe also only sees listeners bound through the `addEventListener` patch in `browserPool.ts:115`: inline `onclick=` attributes and `el.onclick = fn` assignments are invisible.

**Build:** change `[tabindex]` to `[tabindex]:not([tabindex="-1"])` and require a keyboard listener (`keydown`/`keyup`/`keypress`) on any element whose only recorded listener is a pointer one. Record inline handler attributes in the same in-page walk that already reads `hasProgrammaticLabel`.

---

### 9. 2.4.3 Focus Order — the tab sequence is recorded and never compared to anything

`captureKeyboardNavigation` records up to 25 tab stops with selectors (`KeyboardNavResult.stops`, `analyzeKeyboard.ts:47`). `grep -rn "tabStops\|stops" backend/src/services` outside the keyboard module finds **no consumer that compares them to DOM or visual order**. The 2.4.3 finding that exists (`reading-order-mismatch`) is pure geometry run separately at desktop width from an explicit CSS-reordering cause. Positive `tabindex`, the textbook failure, is untested for this row: axe's `tabindex` rule is tagged `cat.keyboard`/`best-practice` with no numbered WCAG tag, so `normalizeCriterionId` returns undefined and it lowers the score while mapping to no criterion.

**Build:** the stops carry selectors; resolve each back to a node, compare the recorded order against `compareDocumentPosition` order and against `getBoundingClientRect` reading order, and emit 2.4.3 on inversions. Retag the `tabindex` rule locally to 2.4.3. Both use data already in hand.

---

### 10. 2.4.11 Focus Not Obscured — the walk visits every stop and measures no geometry

`wcag22Readiness.ts:34` lists it with `coverage: "manual"` and maps no rule; the comment at line 102 correctly refuses to map `mobile-sticky-coverage` across. The tab walk reads seven computed style properties per stop and no `getBoundingClientRect` at all. This is the most decidable untested criterion in the product: a rect-versus-fixed/sticky-chrome intersection at the instant of focus settles it, and the walk is already standing on the element.

**Build:** add a rect read plus an `elementFromPoint` test against the pinned-chrome list the mobile pass already collects, inside the existing per-stop evaluation in `renderPage.ts`. Becomes a live AA obligation under EN 301 549 v4.1.1.

---

### 11. 1.1.1 and 2.4.4 — real name-quality detection exists and is discarded

`screenReader/analyzeScreenReader.ts:158-170` implements `looksLikeFilename` and `unhelpfulNameReason` (symbol-only names, ≤2 characters, raw URLs, "click here") and attaches an `issue` string per line. `screenReaderScript` is written at `scanPipeline.ts:475` and read by exactly one consumer: `App.tsx:757`, a preview panel. It reaches neither the score, nor the conformance table, nor the undecided list. So `alt="IMG_4821.jpg"` on every image leaves **1.1.1** reading no-issues-found, and a button named "×" cannot fail **4.1.2**. `link-text-vague` (`analyzeComponents.ts:269-300`) is a ten-language phrase list, and it sets `wcagCriterion` but leaves `wcagLevel` undefined, so the AAA filter in `scoreFindings` cannot see it.

**Build:** turn `unhelpfulNameReason` into findings — 1.1.1 for images, 2.4.4/4.1.2 for links and buttons. The detection is written and tested; only the emit is missing.

---

### 12. 1.3.5 Identify Input Purpose — detected precisely, then filed where the table cannot see it

`analyzeComponents.ts:147-159` finds identity fields with no `autocomplete` token exactly. It calls `makeFinding` without the trailing `category`/`wcagCriterion`/`wcagLevel` arguments, which default to `"design-clarity"` and `undefined` (lines 43-59). `buildConformance` counts only `category: "accessibility"` findings with a normalisable criterion. So the page gets a design-clarity card saying it has no autocomplete tokens while the 1.3.5 row prints no-issues-found. `makeFinding`'s own comment names this defect pattern — "That is how 2.4.1 shipped as a row that could never fail" — and the bug is still live three cases below the comment.

**Build:** pass `"accessibility", "1.3.5", "AA"` to that call. One line.

---

### 13. Two cards for one fault, three times over

Against the house rule, verified in the shipped code: (a) `dropBannerShadowedAriaHiddenFocus` (`mergeFindings.ts:286`) tests `findings.some(f => f.ruleId === "consent-blocks-reader")`, but runs inside `mergeFindings` at line 273 on `[...automated, ...aiReview]`, while `consent-blocks-reader` arrives in `deterministic`, pushed **after** at `scanPipeline.ts:429` — `bannerOwnsIt` is always false and the dedup is dead code. (b) A `<meta http-equiv="refresh">` produces both axe's `meta-refresh` (critical) and `timing-meta-refresh` (`interaction/analyzeTiming.ts:38`, serious), both category-accessibility, both tagged 2.2.1 — two cards and roughly 15 penalty points for one tag, because `mergeFindings` is "v1: concatenate" with no cross-layer dedup. (c) An uncaptioned video yields axe's `video-caption` incomplete row and `media-video-captions` — two undecided cards for one video.

**Build:** move `dropBannerShadowedAriaHiddenFocus` to after the `deterministic` push; add a `(ruleId-pair, selector)` suppression map to `mergeFindings` for the axe/own-probe overlaps.

---

## 3. Honest blind spots

Two criteria cannot be automated and the product is right to refuse them:

- **1.2.4 Captions (Live)** — nothing distinguishes live media from prerecorded, and no manifest or provider heuristic would decide the criterion. `wcagCriteria.ts:49` marks it `"manual"`, so it reads needs-review. Honest.
- **3.3.4 Error Prevention (Legal, Financial, Data)** — whether a submission is reversible, checked or confirmable is a judgement about a process, not a page. `"manual"`, needs-review. Honest, and the registry is right that calling "form with an immediate submit" a failure would be the overclaim its other mapping decisions refuse.

Two more are near-honest but the label misreports the work done in the direction of *understating* it: **3.2.3** and **3.2.4** are genuinely proven in crawl mode by `crawl/consistency.ts:89-160` feeding synthetic findings through `aggregateAudit.ts:178-195`, and the registry still calls them `"manual"`, so a crawl that compared five pages and found them consistent prints "Needs a person". Same shape at **3.1.2**, where `valid-lang` really does run and really can fail the row despite the `"manual"` label.

And one criterion is listed that cannot be failed at all: **4.1.1 Parsing** was removed in WCAG 2.2 and marked always-satisfied for 2.0/2.1 by W3C's 2023 erratum. Both axe rules for it are `enabled: false` and `deprecated`. `wcagCriteria.ts:112` still prints it as a Level A row with `coverage: "manual"`, inflating `needsReview` by one on every report and asking every reader to hand-audit something that can no longer be failed. Remove the row. While removing it, note that `wcag22Readiness.ts:141-145` sets `parsingNoLongerCounts` from a finding normalising to `"4.1.1"` — which nothing deterministic emits — so the widget's "One piece of good news…" paragraph (`Wcag22Readiness.tsx:187`) can only ever fire on an unvalidated free-form AI criterion string.

Two structural disclosure gaps worth fixing with them: `buildWcag22Readiness` is called only from `scanPipeline.ts:466`, so in crawl mode — the only mode where **3.2.6 Consistent Help** and **3.3.7 Redundant Entry** are answerable at all — the WCAG 2.2 block is absent from the report entirely. And AI findings carry a free-form criterion string through `mergeFindings.ts:203` with no allow-list, so a model can flip **any** row to "failed", including **2.3.1 Three Flashes** from a single still screenshot and **4.1.3**, which the product itself declares untestable.

---

## 4. What it does well

- **1.4.12 Text Spacing and 1.4.4 Resize Text** are real before/after experiments, not markup guesses: the render applies the criterion's own override, waits, re-measures against a baseline and reports only *newly* clipped elements, screenshotting while the override is live (`textResize/analyzeTextResize.ts:179, 201, 221`).
- **1.4.10's conformance claim is made at the width the criterion defines.** `renderPage.ts:3357` resizes to 320 specifically, and `analyzeMobile.ts:370-396` tags the 390 result `"N/A"` and routes it to design-clarity so it cannot move the score. The comment explains why. That discipline is rare.
- **2.5.8's spacing exception is implemented correctly** — an undersized target is cleared unless another target's centre is within 24px (`analyzeMobile.ts:414-437`) — and it is deliberately kept out of the 50-row checklist and surfaced through `wcag22Readiness.ts` instead.
- **The `aiAssisted` mechanism is sound where it is applied.** `buildConformance.ts:88-90` correctly degrades 1.4.1, 2.4.6, 3.3.1 and 3.3.3 to needs-review when the AI did not run. The defect at 1.3.2 is a missing flag, not a broken design.
- **`wcag22Readiness.ts:102` refuses to map `mobile-sticky-coverage` to 2.4.11** on the grounds that "only map a rule whose firing proves exactly that." That is the right call, and it is the standard the rest of the registry should be held to — 3.3.2, 1.4.11, 1.4.10 and 2.4.1 all currently claim `"automated"` on evidence that does not meet it.

---

# Product gaps

## 0. The root constraint: it is a stateless renderer, not a service

Everything below traces back to one fact. `/Users/polinavasilyeva/a11y-checker/backend/src/server.ts` registers four routes (`health`, `scan`, `audit`, `report/email`) and nothing else. There is **no database, no queue, no accounts, no API keys, no tenancy**. `backend/package.json` has no persistence dependency of any kind. The only state that survives a request is `MAX_CONCURRENT_RENDERS: 2` in the browser pool.

Consequences visible in the code itself:

- `/Users/polinavasilyeva/a11y-checker/widget-business/src/api/scanClient.ts` posts **the entire report back to the server** to email it, with the comment "nothing is stored server-side yet — there is no id to send instead."
- History lives in `localStorage` (`/Users/polinavasilyeva/a11y-checker/widget-business/src/lib/scanHistory.ts`), capped at 20 entries × 30 URLs, on one browser.
- `/api/scan` and `/api/audit` are unauthenticated public POSTs, protected only by an IP rate limit (default 5/min) and `ALLOWED_ORIGINS: "*"`.
- A scan blocks an HTTP request for 40–95s; a site audit blocks one for up to `AUDIT_BUDGET_MS = 240_000`.

Every competitor named in the brief is a *system of record*: it knows which sites belong to whom, what they looked like last week, and who owns each ticket. This is a very good scanner with no system of record around it. That is the single largest product gap, and roughly two-thirds of the individual gaps below are the same gap wearing different clothes.

---

## 1. Gaps blocked by the missing system of record

### 1.1 Scheduled re-scans — absent entirely
No cron, no scheduler, no worker, no job table (grepped: zero hits for schedule/cron/webhook in `backend/src`). Every scan is a human pressing a button.

**Commercially:** this is the recurring-revenue mechanic of Siteimprove, Silktide, axe Monitor and Level Access. One-shot scanning is a lead magnet; scheduled scanning is the subscription. Without it, the product has no reason to be paid for twice.

**Difficulty:** hard, but only because it is the *first* stateful feature. A job table + a worker loop + the existing `scanUrlToReport` is not much code; the work is choosing and standing up persistence, and the concurrency ceiling of 2 renders means a scheduler would immediately starve interactive scans unless the pool scales out.

### 1.2 Regression tracking — exists, but only as a single-browser toy
`scanHistory.ts` is genuinely thoughtful: `SCORING_VERSION` gating so a scoring change is not reported as a regression, `diffScans` producing fixed / appeared / unchanged. The limits are severe though, and some are undisclosed to the buyer:

- One browser. Clearing site data clears the record. No team view, no device sync.
- **Authenticated scans are never recorded at all** (`recordScan` returns early on `wasAuthenticated`) — so the checkout and account pages, the ones the login feature exists to reach, have no history by construction.
- **Site audits are never recorded.** `recordScan` takes an `AccessibilityReport`; a `SiteAudit` has no path into history. So the multi-page product has zero trend line.
- The diff is **by rule id only**. "Still one unlabelled button" and "a different button is now unlabelled" are indistinguishable.
- `/Users/polinavasilyeva/a11y-checker/widget-business/src/components/SinceLastTime/SinceLastTime.tsx` — the component designed for exactly this — carries the comment "Not yet wired."

**Difficulty:** the diff logic is done and pure. Server-side history is the persistence problem again. Fixing the diff granularity is separate and cheap — see 2.3.

### 1.3 Monitoring after a fix ships — absent
No webhook in, no alert out, no "re-scan this page when I deploy", no Slack/Teams/email notification on regression. `ScoreGauge.tsx` offers "Copy summary as plain text" so the reader can paste it into Slack themselves.

**Commercially:** this is the promise that converts a one-off audit buyer into a platform buyer — "you will know within a day if someone breaks it again." It is also the feature that makes the score meaningful over time rather than as a verdict.

**Difficulty:** trivial once 1.1 exists (an inbound `POST /api/hooks/deploy` plus an outbound webhook). Impossible before it.

### 1.4 Triage state — no ignore, no false positive, no assignment, no "fixed"
Grepped: nothing anywhere lets a user suppress, accept, assign, or resolve a finding. Every scan starts from zero.

**Commercially:** this is the thing that makes real teams abandon a scanner. A page with three accepted-risk findings shows three findings forever, the score never reaches the band the team agreed on, and the tool stops being consulted. Every serious tool has an ignore-list with an audit trail.

**Difficulty:** needs persistence plus 2.3 (stable finding identity). The UI vocabulary already exists — filter chips, fix-kind badges, severity tags.

### 1.5 Shareable report links / client delivery
There is no report URL, because there is no stored report. Delivery is: print-to-PDF via `window.print()`, or email the whole report through Resend (`MAIL_RATE_LIMIT_MAX: 3` per 10 minutes).

**Commercially:** the professional view exists for agencies. An agency's core action is "send the client the report." Today that means a printed PDF attachment. No branding, no logo, no client dashboard, no multi-site rollup.

Worth flagging as a correctness problem, not just a feature gap: `App.tsx:627` renders the "some checks didn't finish" warning under `!professional &&`, so the **client-facing artefact is the one that hides which checks never ran**.

**Difficulty:** medium. Store report + short id + a read-only route is small; white-labelling and an agency account model is not.

### 1.6 Prioritisation by traffic — absent
Template prioritisation is partly there and is good work: `dominantComponent` in `/Users/polinavasilyeva/a11y-checker/widget-business/src/lib/componentCluster.ts` collapses thirteen contrast rows into "one topic link in a template," and `aggregateAudit.siteWide` marks rules present on every scanned page. Traffic is entirely absent — no GA4, Adobe, Plausible or Search Console connector, and no page-weighting beyond the keyword regex in `pageImportance`.

**Commercially:** the difference between a list and a plan. "Fix this one first, it is on the template behind 60% of your sessions" is the sentence a buyer pays for. Siteimprove's whole information architecture is built on it.

**Difficulty:** medium. The analytics connector is OAuth plumbing; the join key is the URL, which is clean; but "which pages matter" has to be stored per account.

### 1.7 Competitor / peer benchmarking — absent, and strategically conflicted
No industry baseline, no percentile, no peer set.

Note the tension: `scanHistory.ts` explicitly rejects server-side history keyed by URL because "one visitor could read another's scan activity, including a competitor's." Benchmarking requires exactly the cross-site corpus that comment refuses to build. This is a genuine strategic fork, not an oversight — an account model resolves it (your own sites are yours; aggregate statistics are anonymised), but it needs deciding rather than drifting.

**Difficulty:** hard and slow — it needs volume before it produces a number worth showing, and this codebase's ethics would not permit shipping an invented baseline.

### 1.8 Rule configuration — nothing is tunable
No way to disable a rule, change a severity, set a score threshold, or add a house rule. All hardcoded across `wcagCriteria.ts`, `scoring.ts` and the probe modules.

**Commercially:** enterprise policy teams need this, and so do agencies with a house standard. It also blocks the CI story below — a build gate needs a configurable threshold.

**Difficulty:** medium. Per-account config → persistence again.

---

## 2. Gaps that are *not* blocked, and are cheap

These are the highest return per unit of work in the whole list, because the pipeline is already a pure function and the report is already good.

### 2.1 There is no findings export at all
The only CSV in the product exports the **undecided** list (`/Users/polinavasilyeva/a11y-checker/widget-business/src/components/UndecidedChecks.tsx`, columns: No / What the checker saw / What to ask for / Call / Places). The findings themselves — the actual product — can be printed or emailed, and that is it. No CSV, no JSON download, no XLSX.

**Commercially:** every buyer evaluating against WAVE/axe/Pa11y will try to export and fail. It reads as unfinished.

**Difficulty:** an afternoon. The CSV helper already exists in that file; point it at `report.findings` with the professional-view columns (rule id, criterion, level, severity, selector, snippet, fix kind).

### 2.2 Issue-tracker export — absent
No Jira, GitHub Issues, Azure DevOps, Linear or Asana. No webhook. Deque, Level Access and Siteimprove all ship this and it is frequently the deciding line item in a procurement comparison.

**Difficulty:** a one-way "create issues from selected findings" against the GitHub and Jira REST APIs is a few days *if* you accept per-request tokens (the same pattern `authenticate.ts` already uses for credentials: accepted per request, never stored). Two-way sync — status flowing back, dedup on re-scan — needs persistence and 2.3.

### 2.3 Finding identity is not stable across scans
`AccessibilityFinding.id` is assigned during merge and means nothing across runs. That is why `diffScans` falls back to rule ids.

This blocks 1.2 precision, 1.4 ignore-lists, and 2.2 dedup simultaneously — three features gated on one small piece of work.

**Difficulty:** small, and the primitive already exists. `componentSignature()` in `componentCluster.ts` already normalises away `:nth-child`, attribute values and ids. A fingerprint of `ruleId + componentSignature(selector) + normalised page path` would be stable across template re-renders and is testable without a browser.

### 2.4 The screen-reader probe computes real findings and throws them away
`/Users/polinavasilyeva/a11y-checker/backend/src/services/screenReader/analyzeScreenReader.ts` already detects filename alt text, symbol-only names, names of two characters or fewer, raw URLs as link text, and "click here"/"read more" — attaching an `issue` string to each line. `screenReaderScript` goes into the report and **is read by nothing except the preview player**. None of it reaches findings, the score, or the undecided list.

This is the tool's answer to the single most-cited weakness of automated checkers ("alt text is present but useless"), already built, already measured, and invisible.

**Difficulty:** very small — roll the annotated lines up per issue kind into `undecidedChecks`, which is exactly the channel the house rules designed for "we saw something, a person must judge it."

### 2.5 The site audit cannot go behind a login
`auditBodySchema` in `/Users/polinavasilyeva/a11y-checker/backend/src/routes/audit.ts` has **no `auth` field**, and the route passes `undefined` as the auth argument to every page scan. So the login feature — which `LoginFields.tsx` justifies on the grounds that "checkout, account settings and booking flows are where an accessibility failure actually costs a business money" — works on exactly one page at a time. The crawl also cannot discover pages that only exist once signed in, since discovery reads links from an unauthenticated entry render.

**Difficulty:** small-to-medium. Thread the auth config into the audit body and into each `scanUrlToReport` call; the harder half is authenticating once and reusing the context across the worker pool rather than logging in five times.

### 2.6 No PDF inventory during a crawl
`SKIP_EXTENSIONS` in `/Users/polinavasilyeva/a11y-checker/backend/src/services/crawl/discoverPages.ts` excludes `.pdf`, `.docx`, `.xlsx`, `.pptx`. A page scan never counts the documents it links to either. The PDF checker is reachable only by pasting a URL ending `.pdf`.

For public-sector buyers — whose PDFs are the bulk of their accessibility exposure, and whose council application form is the example in `checkPdf.ts`'s own header — a site audit that reports zero documents is misleading by omission.

**Difficulty:** small for the inventory ("this site links to 47 PDFs; none were checked" as an undecided row), medium to actually scan a sample of them within the audit budget.

### 2.7 Robots.txt is not consulted
Zero references anywhere. The SSRF guard covers the security case, not the courtesy/legal one. For a tool an agency points at third-party sites, and one that markets itself on honesty, this is an odd omission.

**Difficulty:** an hour.

---

## 3. Structural gaps — real work, real market consequences

### 3.1 No CI integration, no CLI, no npm package
`.github/workflows/` contains the product's own tests, not anything a customer runs. There is no CLI, no exit code, no baseline file, no `--threshold`.

**Commercially:** this is the entire market Pa11y-CI, `@axe-core/cli` and Lighthouse CI occupy, and the reason axe won developer mindshare. It is also where accessibility budget is increasingly spent — shift-left, in the pipeline, before the page ships.

There is a structural problem beyond effort: a **hosted** scanner cannot reach a PR preview on localhost or behind a VPN. CI integration realistically means shipping the pipeline as a runnable package, not exposing an endpoint.

**Difficulty:** medium and well-shaped. `scanUrlToReport` is already a pure `(url, options) => report` function with HTTP concerns kept out of it (the comment in `scan.ts` says so explicitly). A CLI wrapper, JSON output, and a fail-on-threshold exit code is a contained job. Packaging Playwright + Chromium for other people's runners is the fiddly part.

### 3.2 The API is an internal endpoint, not a product
`/api/scan` returns the full report JSON, which is the hard part done. Missing: API keys, docs, OpenAPI schema, versioning, an async job model, and webhooks. A 95-second synchronous POST with `bodyLimit: 1MB` and base64 screenshots in the response is not an API anyone integrates against.

**Difficulty:** medium. Job id + poll + `MAX_CONCURRENT_RENDERS` as a real queue is the same infrastructure the scheduler needs — build once, unlock both.

### 3.3 No browser extension or devtools panel
This is a market exclusion rather than a feature gap. The product can only see URLs its own server can reach. Localhost, staging behind SSO, a design-system branch preview, a logged-in state a form login cannot reproduce — all invisible. That is precisely where axe DevTools and WAVE's extension live, and it is where developers actually work.

**Difficulty:** medium-hard, but the architecture is unusually friendly to it: most probes are already self-contained `page.evaluate` functions written with no closures over outer scope (the comment in `analyzeScreenReader.ts` says the collector must be fully self-contained). Those port to a content script nearly as-is. The AI review, server-side screenshot cropping and PDF checking would not.

### 3.4 Crawling is a sample, not site coverage
Depth 1, same-origin, `MAX_PAGES = 10` (default 5), links from the entry page only, ranked by a keyword regex. No sitemap.xml, no URL include/exclude patterns, no template-based sampling, no pagination handling. `discoverPages.ts` states the constraint honestly and gives a good reason (~15s per page).

**Commercially:** "audit my site" against a 4,000-page site returning five pages is not the same product Siteimprove sells. It is a legitimate SMB product; it is not a site-audit product, and the naming currently promises the latter.

**Difficulty:** sitemap.xml ingestion and URL patterns are small and would multiply the value of the existing aggregation. Actual scale (hundreds of pages) needs the queue, the worker fleet and persistence — i.e. it is gated on section 1.

### 3.5 No flow or multi-step testing
Nothing clicks, submits, or walks a checkout. `analyzeInteraction.ts` and `buildPrompt.ts` refuse on principle: "on a stranger's live site that can submit a form, place an order or fire an analytics event."

That principle is right for a public scanner and wrong for a customer scanning their own site with consent — and it is why 3.3.1, 3.3.3, 3.3.4 and 2.5.7 have no evidence path. Competitors solve it with a recorded flow the customer authorises.

**Difficulty:** medium-hard. Playwright is right there; the work is a step DSL, a consent model that distinguishes "my site" from "any site" (which needs accounts), and a story for what happens when a step goes stale.

### 3.6 Guided manual testing — named, never resolvable
This is the gap I would rank highest after persistence, because it is the one this product is *most* set up to win and has left on the table.

The tool is unusually good at naming what it cannot decide: `needs-review` rows, `undecidedChecks`, `undecidedExplanation` giving a "what we saw" and a "what to ask for," and a CSV to hand to a designer. What it offers is a **list of open questions with no way to close any of them**. `HUMAN_QUESTIONS` in `ConformanceView.tsx` is three hardcoded strings. Nothing records an answer, attaches evidence, assigns an owner, or produces a completed audit.

The compounding consequence: `/Users/polinavasilyeva/a11y-checker/widget-business/src/lib/buildAcrDraft.ts` deliberately leaves the Conformance Level blank for every non-failing row, because a scan can never justify "Supports." Correct — but it means **the VPAT draft can never be completed inside the product**, no matter how much human work is done. A recorded human verdict is the missing piece that would let it.

**Commercially:** axe DevTools' Intelligent Guided Tests and Level Access's manual workflows are sold on exactly this, and they are how those vendors bridge from "we found 30% of issues" to "here is a defensible audit." This product has already built the harder half — a rigorous, honest map of what needs a person.

**Difficulty:** medium, and mostly UI plus a small verdict model, once there is somewhere to store a verdict. The reporting side already knows how to render three-state criterion rows.

### 3.7 No native mobile app support
No Appium, XCUITest, Espresso, or React Native. "Mobile" here means Chromium emulation at 390px and 320px, which is well done for the web but is not app testing.

**Commercially:** the EAA covers mobile apps, and Level Access, Deque and Evinced all sell native testing into the same budget. It closes off enterprise deals wholesale.

**Difficulty:** hard — a different runtime, different rules engine, different distribution. Realistically a separate product, not a feature.

### 3.8 PDF: detection only, no remediation
`checkPdf.ts` finds six real faults, in the first 10 pages, and routes them as "Document fix" with the honest advice to fix the source file. There is no tagging, no reading-order repair, no output document, no Word/Excel/PowerPoint checker at all.

**Difficulty:** remediation is genuinely someone else's product (Acrobat, axesPDF, CommonLook). The reachable improvements are the inventory (2.6) and widening detection to tables, form fields and reading order.

### 3.9 Component and design-system auditing — absent as a mode
`componentSignature` clusters repeats *within one report*, which is the seed. Missing: a way to point the scanner at a Storybook or a set of component URLs, per-component pass/fail, cross-page component rollup, or any design-token/Figma awareness.

This is the odd one, because the raw material is sitting in the repo: a vendored design system in `/Users/polinavasilyeva/a11y-checker/design-system/`, and a fixture harness (`?fixture`) that already renders every widget state without a backend and is already axe-scannable in place.

**Commercially:** the highest-leverage sale in accessibility — fix the button once, fix it on 4,000 pages — and the one that gets you into the design org rather than the compliance org.

**Difficulty:** medium and unusually cheap here. `scanUrlToReport` takes a URL; a list-of-story-URLs mode plus per-component aggregation reuses `aggregateAudit` with the grouping key changed from page to component.

---

## 4. Where it is already ahead (so the gaps can be priced)

Worth stating plainly, because these are expensive things competitors do badly and they change which gaps are worth closing first:

- **Per-issue user impact is a genuine strength.** `PlainRule.impact` for 99 rules, curated `research` lines with a digit-free rule enforced by test, `ageNote` from the age-inclusive review, a screen-reader preview, and a vision simulator. Most competitors give you axe's developer-facing help text. The remaining gap is structural: impact is prose, not facets — you cannot filter by "affects screen reader users," and nothing estimates how many of *this* site's visitors are affected.
- **Undecided results are surfaced rather than discarded.** `undecidedChecks` is the raw material for the guided-manual-testing product in 3.6 and nobody else in this list has it lying around already written.
- **Localisation across en/de/es/fr** for plain language, criterion text and voice rules, with CI enforcing the German voice. Competitors are largely English-first.
- **Dark patterns and GDPR consent analysis** — a genuinely differentiated adjacent product sitting inside an accessibility scanner, deliberately kept out of the score.
- **The honesty discipline itself** (no "pass" status, undecided ≠ needs-review, one fault one card, AAA excluded from the score) is a defensible market position against tools that inflate scores. It is also what makes 3.6 the natural next product rather than a bolt-on.

---

## 5. Ordering, if it helps

1. **Persistence + accounts + a job queue.** Not a feature; the precondition for eleven of the gaps above. Everything commercial is downstream of it.
2. **Findings export (2.1), stable finding ids (2.3), screen-reader issues into undecided (2.4), audit-behind-login (2.5), PDF inventory (2.6).** Days of work each, no architectural change, and each closes a gap a buyer will notice in the first ten minutes.
3. **CLI + CI (3.1)** — the pipeline is already shaped for it and it opens the developer market the current form factor cannot reach.
4. **Guided manual testing (3.6)** — the largest differentiated opportunity, and the thing that would finally let the VPAT draft be finished.
5. **Scheduled scans + monitoring + regression alerts (1.1, 1.3)** — the subscription.
6. Component/design-system mode (3.9) and the browser extension (3.3) as the two strategic bets.