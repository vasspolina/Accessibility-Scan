# Changelog

All notable changes to this project are documented here.

This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
The `backend`, `widget`, and `widget-business` packages are versioned together.

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
