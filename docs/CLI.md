# `a11y-scan` — the scanner in a pipeline

The hosted scanner can only reach what the public internet can reach. A pull
request preview on `localhost:3000` and a staging site behind a VPN are
exactly where a team wants the check to run, and no hosted service can see
either. So the same pipeline runs as a command, in your own process, against
whatever your network can reach.

```bash
a11y-scan https://example.com
```

## Installing

It is not on the npm registry yet, so `a11y-scan` does not work — the
earlier version of this page said it did. Until it is published, install
from a checkout:

```bash
git clone git@github.com:vasspolina/Accessibility-Scan.git
cd Accessibility-Scan/backend
npm ci                                    # builds dist/ via the prepare step
npx playwright install chromium --with-deps
npm link                                  # puts `a11y-scan` on your PATH
```

Node 24 or later. The backend's own CI runs exactly this from a temporary
directory and checks the three exit codes, so if that job is green the
install path works.

## Exit codes

These are the interface a CI job actually consumes:

| Code | Meaning |
| --- | --- |
| `0` | every threshold given was met |
| `1` | a threshold was not met — the output says which |
| `2` | the scan could not be completed (bad arguments, network, crash) |

**With no thresholds it reports and exits 0.** A first run should tell a team
where they stand, not fail their build on the day they add it.

`2` is deliberately not `1`. A build that fails because the site got worse and
a build that fails because the scanner could not load the page are different
events, and a job that cannot tell them apart will eventually treat a broken
scanner as a clean site.

## Options

| Option | What it does |
| --- | --- |
| `--min-score <0-100>` | fail when the score is below this |
| `--fail-on <severity>` | fail on any finding at `critical`, `serious`, `moderate` or `minor` and worse |
| `--baseline <file>` | compare against a saved baseline |
| `--max-new <n>` | allow up to n new findings against that baseline (default 0) |
| `--write-baseline` | write the baseline from this run and exit 0 |
| `--json <file>` | write the full report as JSON |
| `--sarif <file>` | write the findings as SARIF 2.1.0, which GitHub shows inline on the pull request |
| `--server <url>` | save the report into a hosted instance's history |
| `--api-key <key>` | with this key; or set `A11Y_SERVER` and `A11Y_API_KEY` in the environment |
| `--ai` | include the AI review (needs `ANTHROPIC_API_KEY`) |
| `--quiet` | print only the verdict line |

### Scanning localhost

The command does this and the HTTP API refuses to, on purpose. Over HTTP a
stranger names a URL and the *server* fetches it, so `127.0.0.1` and the
private ranges have to be blocked — that is a confused deputy. A command has
no stranger: the person who typed the URL owns the machine doing the
fetching, the same trust model as `curl`. Only the scheme is still checked,
because `file://` reads the local disk.

## Working with an existing site

A team that already has failures does not want a score gate on day one — it
wants "no worse than yesterday". That is the baseline:

```bash
a11y-scan https://staging.example.com --write-baseline --baseline .a11y-baseline.json
```

Commit that file. From then on:

```bash
a11y-scan https://staging.example.com --baseline .a11y-baseline.json
```

A finding's identity is its rule plus its selector, so re-ordering a page does
not read as a page full of new problems.

**One limit, measured rather than assumed.** A few rules card once for the
whole page — the screen-reader name rules, the faint-border rule — using the
first offending element as the selector. Adding a second offender to a page
that already has one grows that card's count without changing its
fingerprint, so the baseline comparison alone does not notice. This was
tested both ways: a new vague *link* (carded per element) trips the gate, a
new vague *button* (carded per page) does not. That is why the run also
prints the total when it moves without the fingerprints moving:

```
  vs baseline: 0 new · 0 fixed · total +1 (a page-level card changed size)
```

Read that line. A `--min-score` gate alongside the baseline catches the same
cases from the other direction.

## GitHub Actions

```yaml
name: accessibility

on:
  pull_request:
  push:
    branches: [main]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24

      - run: npm ci
      - run: npx playwright install chromium --with-deps

      # Build and serve the site the pull request actually produces. This is
      # the whole reason the scanner runs here rather than against production:
      # the version being reviewed does not exist on the internet yet.
      - run: npm run build
      - run: npx serve -l 3000 dist &
      - run: npx wait-on http://localhost:3000

      - name: Scan
        run: |
          a11y-scan http://localhost:3000 \
            --baseline .a11y-baseline.json \
            --json a11y-report.json

      # Uploaded whether or not the scan passed — the report is most wanted
      # on the run that failed.
      - if: always()
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: a11y-report.json
```

### Findings on the pull request

Add `--sarif a11y.sarif` to the scan line and upload it. Each finding then
appears as an annotation on the pull request, which is where a developer
actually meets it:

```yaml
      - if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: a11y.sarif
```

A web page has no file and line, so the location is the URL and the CSS
selector. The fingerprint is the same rule-plus-selector the baseline uses,
so GitHub keeps a finding's identity across runs the same way.

### Into the hosted history

A CLI report never passes through the hosted service, so on its own it is
never saved. With a key it joins the same record as a scan made through the
product — the same history, the same open questions, the same verdicts:

```yaml
      - name: Scan
        env:
          A11Y_SERVER: https://your-scanner
          A11Y_API_KEY: ${{ secrets.A11Y_API_KEY }}
        run: a11y-scan http://localhost:3000 --baseline .a11y-baseline.json
```

A save that fails is printed as a warning and does not change the exit
code: the scan completed and the thresholds still get their verdict.

Swap the baseline line for `--min-score 90 --fail-on serious` once the
backlog is cleared and you want to hold a standard rather than a position.

### Updating the baseline

When a pull request legitimately adds a finding — a third-party embed, a
change being shipped knowingly — re-run with `--write-baseline` and commit the
result in that same pull request. The diff shows what was accepted and who
accepted it, which is the point: an accepted failure should be visible in
review, not silently allowed by a raised `--max-new`.

## Checks that did not finish

The run prints this when a probe was cut short:

```
  NOTE: these checks did not finish — keyboard walk
```

A score computed from checks that did not all run is not comparable with one
that did. Treat a trend line built from both as measuring the weather, not
the site.
