# EU top-sites accessibility scan — 26 Sep 2026

Every EU member's 15 most-visited ccTLD domains (Tranco top-1M, shorteners /
google / amazon mirrors / adult sites removed), homepage scanned with this
project's automated layer (no AI review) in headless Chromium.

- `domains.json` — the 405 domains, by country
- `results.jsonl` — one line per site: score, provable A/AA fault count by severity, pass (= zero provable faults), or the error
- `scan.json` — per-country aggregate (n, pass %, mean score, median faults, sites, unreachable)
- `eu-a11y-map.html` + `eu.json` — the interactive map (published at https://claude.ai/artifact/K1osSL6WSxecZCupzPo6yn)
- `batch.mjs`, `aggregate.py` — the runner and the aggregation

Result: 295 of 405 scanned (110 blocked, bad cert, or never loaded in 60 s).
Mean score 25.9/100. Only 2 homepages had zero provable A/AA faults, both
empty placeholder pages. Belgium leads at 58, Croatia is last at 7.

Rerun: `cd backend && RENDER_TIMEOUT_MS=60000 CONC=3 node ../docs/eu-scan-2026-09/batch.mjs`
(resumable — it skips domains already in results.jsonl), then `python3 aggregate.py`.
