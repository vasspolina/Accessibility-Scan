# NLnet Restack proposal: outline

Deadline: **3 January 2027, 12:00 CET**, at <https://nlnet.nl/propose/> (fund: "Restack Fund").
First grant: €5,000 to €50,000. Applicant type: Individual. Country: Spain.

These are notes, not answers. NLnet asks for plain text "in your own words" and says
proposals "should be made by humans, not AI". Write each answer yourself from the
points below; keep them short. Character limits are the form's.

---

## Before you submit

- [x] Licence: EUPL-1.2, in `LICENSE`; `NOTICE.md` lists the files it does not cover.
- [ ] Take the trial fonts out of anything published (Jokker, Saans, Serrif in
      `backend/public/fonts/` and `accessible-web-design/fonts/`; PP Telegraf in
      `design-system/`). Swap in an open (OFL) face.
- [ ] Check whether `design-system/` and `reference/` (vendored from claude.ai/design)
      can be published under the EUPL. If not, leave them out of the public repo.
- [ ] Remove `design-library/koerber/` (values taken from koerber.com).
- [ ] The git history still holds those files. Publish a fresh repository without that
      history, or rewrite it, rather than flipping the current repo to public.
- [ ] Make it public, or link a public mirror. The form asks for
      "Project website(s) / repositories".
- [ ] Decide how you answer the two AI-disclosure questions (did you use generative AI
      to write the proposal; does the codebase contain a significant amount of
      AI-generated code). Answer both truthfully; read NLnet's Generative AI policy first.

---

## Proposal title

Short and plain. Something that names the thing and who it is for, e.g. an open
accessibility scanner whose report a site owner can read.

## Summary (max 1000 characters)

Points to cover:
- The European Accessibility Act now applies (Spain: Ley 11/2023; Germany: BFSG).
  Small businesses must comply but cannot read a WCAG audit.
- What exists: an open scanner that renders a page in a real browser at desktop and
  phone width, runs axe-core plus its own probes, and writes a report the owner
  can act on, in four languages (en, de, es, fr).
- What this grant delivers: the scan engine as a standalone, self-hostable open
  component anyone can run, embed or put in CI, with no proprietary service needed.
- Expected results: published package, container image, CI integration, the fixture
  corpus as an open test suite, more EU languages.

## Requested amount and budget breakdown (max 4000 characters)

Give each task, its hours, and the rate. Pick one rate and state it (e.g. €50/h, the
figure the Prototype Fund uses; NLnet asks you to name yours). Example split to adjust:

| Task | What comes out | Hours |
|---|---|---|
| 1. Open release | Licence, open fonts, public repo, contributor guide, security policy | |
| 2. Standalone engine | `scanUrlToReport` and the probes as a library with a documented JSON report schema; no Anthropic dependency in the core | |
| 3. Self-hosting | Container image and docs to run the API and widget on your own server | |
| 4. CI | Publish the CLI to npm (docs/CLI.md says it is not there yet); GitHub Action and GitLab CI template using its exit codes | |
| 5. Open test corpus | Publish the `qa-*.html` fixtures (18 today) as a benchmark: known faults beside correct sections, including ones that prove a silence | |
| 6. Languages | Report and WCAG plain-language text in more EU languages (e.g. it, pt, nl, pl) with a translation workflow | |
| 7. Upstream | Offer probes that fit axe-core's model back to axe-core as rules | |

Expenses: hosting for a public demo, if any. Say so even if it is zero.

## Comparison with other efforts (max 4000 characters)

Name each and say what is different. Things you can check and cite:
- **axe-core** (Deque, open source): the rule engine. Accessible Scan builds on it,
  and keeps axe's "incomplete" results that most tools drop, routing each to a person.
- **Pa11y, Lighthouse, IBM Equal Access Checker** (open): developer tools; output is
  rule ids and selectors for engineers.
- **WAVE** (free, closed), **Siteimprove, axe Monitor** (paid, closed): monitoring
  products.
- **Overlays** (accessiBe, UserWay etc.): closed scripts that claim to fix sites
  automatically; widely criticised by disabled users and the accessibility field.
- What is new here: probes axe cannot run (real Tab walk, focus-ring contrast,
  dialog behaviour, reflow at 320px in phone emulation, text resize, forced colours,
  reduced motion, tap targets, reading order, consent banners read in nine languages);
  a report written for the owner; one fault gives one finding; the score counts only
  provable WCAG A/AA faults, and the report says a 100 is not a conformance claim.
- "Have you considered contributing to the others?" Answer with task 7.

## Technical challenges (max 4000 characters)

- Keeping one browser visit for every probe while making the engine a library others
  call (today the render pass and the probes share state inside one pipeline).
- Memory: Chromium per scan; the hosted service caps concurrent renders at 2. A
  self-hosted package needs sane defaults and documented limits.
- A stable report schema other tools can depend on, versioned.
- Translating the report without losing its rules (the copy has tests for voice and
  honesty in English and German).
- Consent banners inside third-party iframes across many consent platforms.

## Ecosystem and users (max 2000 characters)

- Depends on: axe-core, Playwright/Chromium, Fastify, React (widget).
- Users: small business owners and the freelancers and agencies who build their
  sites; public bodies with their own accessibility duties; developers who want a
  check in CI.
- How you reach them: disability organisations, web agencies, the accessibility
  community in Spain and Germany; the cookie-banner research (below) as an entry point.

## Why you (max 2000 characters)

In your own words: your design and accessibility background, what you built and
measured here. Things from this repo you could point to:
- About 680 commits since July 2026; about 60 backend test files; 18 fixture pages.
- The cookie-banner study in `research/cookie-block` (EU consent banners and screen
  readers). Re-check the sample size and findings before quoting any figure.
- The EU scan in `docs/eu-scan-2026-09`.
- `widget-business/ACCESSIBILITY.md`: the tool's own audit of itself against WCAG.

## Other funding (max 1000 characters)

State plainly: none so far, if that is true. Mention any pending application (for
example if a team applies to the Prototype Fund).

---

## Leave out of this proposal

- **The AI review layer.** Restack says AI-related projects are out of scope unless
  already used by over a million people. The AI layer is optional today (no API key,
  no AI); describe the deterministic engine only, and do not ask money for the AI parts.
- The report-scoped chat, for the same reason.
