# EU top-sites accessibility scan — 26–27 Sep 2026

Every EU member's 40 most-visited ccTLD domains (Tranco top-1M, shorteners /
google / amazon mirrors / adult sites removed), homepage scanned with this
project's automated layer (no AI review) in headless Chromium.

- `domains.json` + `domains2.json` — the 1,057 domains, by country (first 15, then the next 25)
- `results.jsonl` — one line per site: score, provable A/AA fault count by severity, pass (= zero provable faults), or the error; second-pass rows also carry `rules`, the failing rule ids
- `scan.json` — per-country aggregate (n, pass %, mean score, median faults, sites, unreachable, top failing rules) plus an EU-wide total
- `eu-a11y-map.html` + `eu.json` — the interactive map, switchable between this scan, the Digital Trust Index 2026 (18 countries, % passing 61 automated tests) and the WebAIM Million 2026 (7 EU ccTLDs, errors per page) (published at https://claude.ai/artifact/K1osSL6WSxecZCupzPo6yn)
- `batch.mjs`, `aggregate.py` — the runner and the aggregation

Result: 782 of 1,057 scanned (275 blocked, bad cert, dead, or never loaded in 60 s).
Mean score 27.4/100, median 19 provable A/AA faults per homepage. Only 4 homepages
had zero provable faults, all near-empty placeholders. Sweden leads at 51, Portugal
is last at 16. Most common faults (487 sites with rule detail): low-contrast text 59%,
focus order 52%, faint control edges 50%, unnamed links 45%, mouse-only controls 45%.

Rerun: `cd backend && DOMAINS=domains2.json RENDER_TIMEOUT_MS=60000 CONC=3 node ../docs/eu-scan-2026-09/batch.mjs`
(resumable — it skips domains already in results.jsonl), then `python3 aggregate.py`.
