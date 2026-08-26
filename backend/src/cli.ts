#!/usr/bin/env node
/**
 * The scanner as a command, for a pipeline.
 *
 * The whole market this product could not reach — Pa11y-CI, @axe-core/cli,
 * Lighthouse CI — lives here, and the reason is structural rather than
 * technical: a HOSTED scanner cannot see a PR preview on localhost or a
 * staging site behind a VPN. Those are exactly the places a team wants the
 * check to run. So this runs the pipeline in the caller's own process,
 * against whatever their network can reach.
 *
 *   npx a11y-scan https://example.com
 *   npx a11y-scan http://localhost:3000 --min-score 80
 *   npx a11y-scan https://example.com --fail-on serious --json report.json
 *   npx a11y-scan https://example.com --baseline .a11y-baseline.json
 *
 * Exit codes are the interface a CI job actually consumes:
 *   0  the run met every threshold given
 *   1  a threshold was not met — the report says which
 *   2  the scan could not be completed (network, crash, bad arguments)
 *
 * With no thresholds it reports and exits 0: a first run should tell you
 * where you stand without failing your build on the day you add it.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { scanUrlToReport } from "./services/scanPipeline.js";
import type { AccessibilityFinding, AccessibilityReport, Severity } from "./types/report.js";

const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

interface Options {
  url: string;
  minScore?: number;
  failOn?: Severity;
  maxNew?: number;
  json?: string;
  baseline?: string;
  writeBaseline: boolean;
  quiet: boolean;
  ai: boolean;
}

function parseArgs(argv: string[]): Options | { error: string } {
  const positional: string[] = [];
  const opts: Partial<Options> = { writeBaseline: false, quiet: false, ai: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case "--min-score": {
        const v = Number(next());
        if (!Number.isFinite(v) || v < 0 || v > 100) return { error: "--min-score takes a number from 0 to 100" };
        opts.minScore = v;
        break;
      }
      case "--fail-on": {
        const v = next() as Severity;
        if (!SEVERITY_ORDER.includes(v)) return { error: `--fail-on takes one of: ${SEVERITY_ORDER.join(", ")}` };
        opts.failOn = v;
        break;
      }
      case "--max-new": {
        const v = Number(next());
        if (!Number.isFinite(v) || v < 0) return { error: "--max-new takes a number" };
        opts.maxNew = v;
        break;
      }
      case "--json": opts.json = next(); break;
      case "--baseline": opts.baseline = next(); break;
      case "--write-baseline": opts.writeBaseline = true; break;
      case "--quiet": opts.quiet = true; break;
      case "--ai": opts.ai = true; break;
      case "-h":
      case "--help": return { error: "help" };
      default:
        if (a.startsWith("-")) return { error: `Unknown option ${a}` };
        positional.push(a);
    }
  }
  if (positional.length !== 1) return { error: "Give exactly one URL to scan." };
  return { ...(opts as Options), url: positional[0] };
}

const HELP = `a11y-scan — accessibility scan for a pipeline

  a11y-scan <url> [options]

  --min-score <0-100>   fail when the score is below this
  --fail-on <severity>  fail on any finding at this severity or worse
                        (critical, serious, moderate, minor)
  --max-new <n>         fail when more than n findings are new since the
                        baseline (needs --baseline)
  --baseline <file>     compare against a saved baseline
  --write-baseline      write the baseline file from this run and exit 0
  --json <file>         write the full report as JSON
  --ai                  include the AI review (needs ANTHROPIC_API_KEY)
  --quiet               only print the verdict line

  With no thresholds it reports and exits 0.
  Exit codes: 0 met, 1 threshold missed, 2 could not scan.`;

/** A finding's identity across runs, for the baseline comparison.
 *  Rule plus selector: the same fault on the same element is the same
 *  finding, and a re-ordered page must not read as a page full of new ones.
 *
 *  KNOWN LIMIT, measured rather than assumed. Some rules card once for the
 *  whole page — the screen-reader name rules, the faint-border rule — with
 *  the first offending element as the selector. Adding a second offender to
 *  a page that already has one grows that card's count without changing its
 *  fingerprint, so a baseline comparison alone will not notice. Tested: a
 *  new vague LINK (carded per element) trips the gate, a new vague BUTTON
 *  (carded per page) does not. The count line below is what catches those,
 *  which is why it prints even when the fingerprints match. */
function fingerprint(f: AccessibilityFinding): string {
  return `${f.ruleId ?? f.wcagCriterion ?? "unknown"}|${f.selector ?? ""}`;
}

function severityCounts(findings: AccessibilityFinding[]): Record<Severity, number> {
  const out = { critical: 0, serious: 0, moderate: 0, minor: 0 } as Record<Severity, number>;
  for (const f of findings) if (f.category === "accessibility") out[f.severity] += 1;
  return out;
}

function summarise(report: AccessibilityReport, quiet: boolean): void {
  const acc = report.findings.filter((f) => f.category === "accessibility");
  const counts = severityCounts(report.findings);
  if (!quiet) {
    console.log(`\n  ${report.url}`);
    console.log(`  score ${report.score}/100 · ${acc.length} accessibility findings`);
    console.log(
      `  ${SEVERITY_ORDER.map((s) => `${counts[s]} ${s}`).join(" · ")}`
    );
    const c = report.conformance;
    if (c) {
      console.log(
        `  WCAG: ${c.failed} failing · ${c.noIssuesFound} nothing found · ${c.needsReview} need a person` +
          (c.notMeasured ? ` · ${c.notMeasured} not measured` : "")
      );
    }
    const incomplete = report.meta?.incompleteChecks ?? [];
    if (incomplete.length) {
      // Said loudly: a score computed from checks that did not all run is
      // not comparable with one that did, and a CI trend built on the two
      // together is measuring the weather.
      console.log(`  NOTE: these checks did not finish — ${incomplete.join(", ")}`);
    }
    for (const f of acc.slice(0, 10)) {
      console.log(`    [${f.severity}] ${f.ruleId ?? f.wcagCriterion ?? ""} ${f.selector ?? ""}`);
    }
    if (acc.length > 10) console.log(`    …and ${acc.length - 10} more`);
    console.log("");
  }
}

async function main(): Promise<number> {
  const parsed = parseArgs(process.argv.slice(2));
  if ("error" in parsed) {
    if (parsed.error === "help") {
      console.log(HELP);
      return 0;
    }
    console.error(`${parsed.error}\n\n${HELP}`);
    return 2;
  }
  const opts = parsed;

  // Deliberately NOT the server's assertSafeUrl, and the difference is the
  // point of this command.
  //
  // That guard blocks localhost and private ranges because the HTTP route is
  // a confused-deputy risk: a stranger sends a URL and the SERVER fetches it,
  // so a request for 127.0.0.1 or 10.0.0.5 reaches the host's own network.
  // None of that applies here. This runs on the developer's machine, or in
  // their CI runner, against a URL they typed themselves — the same trust
  // model as curl. Applying the server's policy would block http://localhost
  // and every VPN-side staging host, which are precisely the addresses a
  // hosted scanner cannot reach and the reason this command exists.
  //
  // What remains worth refusing is a scheme Playwright should not be pointed
  // at: file:// reads the local disk, and the rest are not web pages.
  let target: URL;
  try {
    target = new URL(opts.url);
  } catch {
    console.error(`Not a URL: ${opts.url}`);
    return 2;
  }
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    console.error(`Only http and https URLs can be scanned — got ${target.protocol}`);
    return 2;
  }

  let report: AccessibilityReport;
  try {
    // The last argument is the local-trust flag — see scanUrlToReport. It
    // is what lets this command scan http://localhost:3000, which is the
    // address a hosted scanner can never reach.
    report = await scanUrlToReport(opts.url, opts.ai, undefined, true, undefined, true);
  } catch (err) {
    console.error(`Scan failed: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  summarise(report, opts.quiet);
  if (opts.json) {
    writeFileSync(opts.json, JSON.stringify(report, null, 2));
    if (!opts.quiet) console.log(`  report written to ${opts.json}`);
  }

  const prints = report.findings.filter((f) => f.category === "accessibility").map(fingerprint);
  if (opts.writeBaseline) {
    const file = opts.baseline ?? ".a11y-baseline.json";
    writeFileSync(file, JSON.stringify({ url: report.url, createdAt: report.scannedAt, score: report.score, findings: prints }, null, 2));
    console.log(`  baseline written to ${file} (${prints.length} findings)`);
    return 0;
  }

  const failures: string[] = [];

  if (opts.minScore !== undefined && report.score < opts.minScore) {
    failures.push(`score ${report.score} is below the required ${opts.minScore}`);
  }

  if (opts.failOn) {
    const cutoff = SEVERITY_ORDER.indexOf(opts.failOn);
    const counts = severityCounts(report.findings);
    const hit = SEVERITY_ORDER.slice(0, cutoff + 1).filter((s) => counts[s] > 0);
    if (hit.length) {
      failures.push(`found ${hit.map((s) => `${counts[s]} ${s}`).join(", ")} (--fail-on ${opts.failOn})`);
    }
  }

  if (opts.baseline) {
    if (!existsSync(opts.baseline)) {
      console.error(`No baseline at ${opts.baseline}. Create one with --write-baseline.`);
      return 2;
    }
    try {
      const saved = JSON.parse(readFileSync(opts.baseline, "utf8")) as { findings: string[] };
      const known = new Set(saved.findings ?? []);
      const fresh = prints.filter((p) => !known.has(p));
      const fixed = (saved.findings ?? []).filter((p) => !prints.includes(p));
      const countMoved = prints.length - (saved.findings ?? []).length;
      if (!opts.quiet) {
        console.log(
          `  vs baseline: ${fresh.length} new · ${fixed.length} fixed` +
            // Prints whenever the total moved without the fingerprints
            // moving — the page-level cards described above.
            (countMoved !== 0 && fresh.length === 0 && fixed.length === 0
              ? ` · total ${countMoved > 0 ? "+" : ""}${countMoved} (a page-level card changed size)`
              : "")
        );
      }
      const allowed = opts.maxNew ?? 0;
      if (fresh.length > allowed) {
        failures.push(`${fresh.length} new findings since the baseline (allowed ${allowed})`);
      }
    } catch (err) {
      console.error(`Could not read the baseline: ${err instanceof Error ? err.message : String(err)}`);
      return 2;
    }
  }

  if (failures.length) {
    console.error(`FAIL — ${failures.join("; ")}`);
    return 1;
  }
  console.log(
    opts.minScore === undefined && !opts.failOn && !opts.baseline
      ? "OK — reported, no thresholds set."
      : "OK — every threshold met."
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(2);
  });
