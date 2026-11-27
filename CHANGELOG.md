# Changelog

All notable changes to this project are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The `backend`, `widget`, and `widget-business` packages are versioned together.

## Unreleased

### Changed

- **The pilot's barrier form is a short conversation.** One question at a
  time (what you use, which page, what happened), each with answers to
  pick, so a report can be made without typing. The model picks at most one
  follow-up from seven questions written in each language
  (`POST /api/pilot/followup`; "Where on the page was it?" when it is off
  or slow), then writes the report. Under the report, "Anything wrong?"
  takes a change in the person's words and the report is written again
  (`previous` and `change` on `POST /api/pilot/draft`). What was asked and
  answered is stored with their words, and a picked sentence is marked as
  picked.
- The pilot's barrier form no longer asks for an invitation code, and
  `PILOT_CODES` is gone: anyone can report, bounded by the rate limits, and
  the pilot is open whenever reports can be stored or mailed. Participants
  are counted by a random id kept in their browser and stored as a hash.
  "Which one, and with which browser" is now a list to pick from.
- The self-hosted model is used by the pilot only, unless
  `PLAIN_LANGUAGE_IN_SCANS=true`. Public scans no longer call it by
  default, so a paid GPU worker is not kept awake by scanner traffic.

### Added

- **A page scan says what documents the page links to.** PDFs and Word,
  Excel and PowerPoint files are counted, one entry per document, on the
  report's new `documents` field. A page scan opens the first two PDFs on
  the page's own origin and runs the PDF check on each (12 s for both, 10 MB
  each, every address and redirect through the same guard as a scanned
  address); the rest, PDFs on other origins and every office file are
  counted with the reason they were not opened. A linked document's faults
  stay on the document: they are never among the page's findings and never
  in its score. The report mentions them as up to three rows of
  `undecidedChecks` (`pdf-linked-not-checked`, `pdf-linked-faults`,
  `office-linked-not-checked`), the command prints one `documents:` line,
  and the MCP digest carries the same line. The widget words the three
  rows in English, German, Spanish and French, each marked Document fix.
- **A site audit counts the site's documents.** `documents` on the audit is
  the union across the scanned pages, each file once with the number of
  pages that link to it. An audit opens none of them; the measurement
  behind that is beside `AUDIT_BUDGET_MS` in `routes/audit.ts`.
- **The command scans several pages.** `a11y-scan` takes more than one
  address, a file of them (`--urls`) or a sitemap (`--sitemap`, cut to
  `--max-pages`, 25 by default). Thresholds apply to every page, the
  baseline keys findings by page path, and a page that could not be scanned
  makes the run exit 2 where it would have passed.
- **JUnit, CSV and Markdown output** beside JSON and SARIF (`--junit`,
  `--csv`, `--markdown`), so GitLab, Jenkins and Azure Pipelines show the
  findings and a spreadsheet can hold them. The CSV and the SARIF carry the
  EN 301 549 clause of each Level A and AA finding.
- **The site audit reads the sitemap and robots.txt.** `POST /api/audit`
  ranks the pages in the site's sitemap with the links on the entry page,
  so a page the home page does not link to can be picked. Pages the site's
  robots.txt disallows are left out, and the audit's `discovery` field says
  how many. The page limit is unchanged.
- **`a11y-scan-mcp`**, the scanner as a Model Context Protocol server with
  two tools, `scan_page` and `scan_site`, for a coding assistant working on
  a local site. See `docs/MCP.md`.
- **Plain-language rewrite by a self-hosted model.** With `LOCAL_LLM_URL` set
  (Ollama, llama.cpp or vLLM; default model Qwen2.5 7B Instruct), each axe
  rule's findings get a plain title, an explanation about this page's
  elements and a fix, in the report's language. Words only: severity,
  criterion and score stay measured. `meta.plainLanguage` reports how it went.
- **Assistive-technology pilot** at `/pilot.html`: invited screen-reader and
  keyboard users report a barrier, the same model drafts a finding, and the
  participant checks it before it is sent. Closed unless `PILOT_CODES` is set.
  See `docs/PLAIN-LANGUAGE-AND-PILOT.md`.

## [1.0.0] — 2026-07-25

First stable release. The web accessibility check tool scans a page (or a whole
site), reports what's wrong in plain language, and shows the visitor's-eye
evidence for each finding.

### Scanning

- `POST /api/scan` renders a URL in Playwright and returns a scored report.
- `POST /api/audit` crawls a site, scans the discovered pages, and aggregates
  the findings into a single report.
- Every page is checked twice — desktop and phone width — so mobile-only
  reflow and tap-target problems surface.
- Bot-block and error pages are detected and reported as such instead of being
  scanned as if they were real content.

### Checks

- **Automated rules** via axe-core, plus HTML markup validation.
- **Keyboard** — a real tab-through walk of the page, reporting traps and
  unreachable controls.
- **Screen reader** — what each element actually announces, including
  color-only cues that carry meaning nowhere else.
- **Dialogs and pop-ups** — the ARIA dialog pattern, checked deterministically.
- **Dark patterns** — detected by rule, across frames, without needing the AI
  layer.
- **Motion** — marquee, autoplay, and endless animation.
- **Typography and readability** — micro-typography, hairline body-text weight,
  and neurodiversity-oriented readability checks.
- **Text resizing** — WCAG 1.4.4 and 1.4.12.
- **Components** — form and menu markup measured against the ARIA Authoring
  Practices Guide.

### AI judgment layer

- An optional per-scan review (opt in or out with a checkbox) that reads the
  rendered page and judges what rules can't, grounded in accessibility
  research.
- Requires `ANTHROPIC_API_KEY`. Without a key the layer is skipped and reports
  contain automated findings only.

### Reports

- **WCAG 2.1 AA conformance view** mapped to EN 301 549.
- **Vision simulators** — see the page as visitors with low vision do.
- **Screen-reader preview** — a playable walkthrough of the page.
- Per-finding element screenshots, captured at true size, so each flagged
  element is legible.
- Findings named by the text they actually contain, grouped by title, with
  repeats above five summarized.
- Ready-to-use suggested alt text for every image missing one.
- Every finding links to its official rule documentation.

### Widgets

- `widget` — the developer-facing embeddable checker.
- `widget-business` — a business-owner-facing version with plain-language
  explanations, the conformance view, vision simulators, and the site audit UI.
- Both are host-themeable and served from the backend as a single script.

### Security and reliability

- SSRF guard hardened against DNS rebinding.
- Browser pool fixes: no cached launch failures, no leaked concurrency slots.
- Scan requests retry on transient connection and gateway failures.
- Rate limiting, CORS, and Helmet on all routes.
