# a11y-scan

An accessibility scan for a pipeline. It opens the page in a real browser
(Playwright Chromium), runs axe-core and the scanner's own probes (keyboard
walk, focus, reflow, contrast, forms, dialogs, media and more), and reports
WCAG 2.2 and EN 301 549 findings with a score, thresholds and a baseline.

```bash
npm install -g a11y-scan
npx playwright@1.61.1 install chromium --with-deps
a11y-scan https://example.com
```

Or with no install, in Docker:

```bash
docker run --rm -v "$PWD:/work" ghcr.io/vasspolina/a11y-scan https://example.com --json report.json
```

Or in GitHub Actions:

```yaml
- uses: vasspolina/Accessibility-Scan@v1
  with:
    url: http://localhost:3000
    args: --fail-on serious --sarif a11y.sarif
```

Exit codes: `0` every threshold met, `1` a threshold missed, `2` the scan
could not run. Outputs: JSON, SARIF (GitHub code scanning), JUnit, CSV,
Markdown and ticket text, and GitHub issues with `--github-issues`.

Node 24 or later. The full guide is
[docs/CLI.md](https://github.com/vasspolina/Accessibility-Scan/blob/main/docs/CLI.md).

Licensed under the EUPL-1.2.
