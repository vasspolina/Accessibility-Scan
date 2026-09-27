# EU top-sites accessibility scan — 26–27 Sep 2026

Every EU member's 40 most-visited ccTLD domains (Tranco top-1M, shorteners /
google / amazon mirrors / adult sites removed), homepage scanned with this
project's automated layer (no AI review) in headless Chromium.

- `domains.json` + `domains2.json` — the 1,057 domains, by country (first 15, then the next 25)
- `results.jsonl` — one line per site: score, provable A/AA fault count by severity, pass (= zero provable faults), or the error; `rules` holds the failing rule ids (all but 17 rows, which were reachable only on the first pass before the runner recorded rules)
- `scan.json` — per-country aggregate (n, pass %, mean score, median faults, sites, unreachable, top failing rules) plus an EU-wide total
- `eu-a11y-map.html` + `eu.json` — the interactive map, switchable between this scan, the Digital Trust Index 2026 (18 countries, % passing 61 automated tests) and the WebAIM Million 2026 (7 EU ccTLDs, errors per page) (published at https://claude.ai/artifact/K1osSL6WSxecZCupzPo6yn)
- `batch.mjs`, `aggregate.py` — the runner and the aggregation

Result: 827 of 1,057 scanned (230 blocked, bad cert, dead, or never loaded in 60 s).
Mean score 26.8/100, median 19 provable A/AA faults per homepage. Only 5 homepages
had zero provable faults: four near-empty placeholders and skynet.be. Sweden leads
at 53, Portugal is last at 16. Most common faults (810 sites with rule detail):
low-contrast text 60%, focus order 52%, mouse-only controls 48%, faint control edges
47%, unnamed links 45%.

Rerun: `cd backend && DOMAINS=domains2.json RENDER_TIMEOUT_MS=60000 CONC=3 node ../docs/eu-scan-2026-09/batch.mjs`
(resumable — it skips domains already in results.jsonl), then `python3 aggregate.py`.
