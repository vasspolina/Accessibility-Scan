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
import { writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scanUrlToReport } from "./services/scanPipeline.js";
import { fingerprintFinding, legacyFingerprint } from "./services/merge/fingerprint.js";
import type { AccessibilityFinding, AccessibilityReport, Severity } from "./types/report.js";

const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

interface Options {
  url: string;
  minScore?: number;
  failOn?: Severity;
  maxNew?: number;
  json?: string;
  sarif?: string;
  baseline?: string;
  /** Save the report to a hosted instance's history. */
  server?: string;
  apiKey?: string;
  writeBaseline: boolean;
  quiet: boolean;
  ai: boolean;
}

export function parseArgs(argv: string[]): Options | { error: string } {
  const positional: string[] = [];
  const opts: Partial<Options> = { writeBaseline: false, quiet: false, ai: false };
  // A missing value is an error, never a silently-dropped option.
  //
  // It used to be the second thing. `--baseline` with nothing after it left
  // baseline undefined, which reads identically to not asking for a gate at
  // all — the run printed "no thresholds set" and exited 0. That is exactly
  // how it fails in a real pipeline: `--baseline $BASELINE_FILE` with the
  // variable unset expands to nothing, and the job goes green forever while
  // gating nothing. A value starting with "-" is refused for the same
  // reason: it is the next flag, not the argument.
  let missing: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v === "" || v.startsWith("-")) {
        missing ??= `${a} needs a value`;
        return "";
      }
      return v;
    };
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
      case "--sarif": opts.sarif = next(); break;
      case "--server": opts.server = next(); break;
      case "--api-key": opts.apiKey = next(); break;
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
  if (missing) return { error: missing };
  // The environment is the right place for a key in CI; a flag puts it in
  // the job log.
  opts.server ??= process.env.A11Y_SERVER || undefined;
  opts.apiKey ??= process.env.A11Y_API_KEY || undefined;
  if ((opts.server && !opts.apiKey) || (!opts.server && opts.apiKey)) {
    return { error: "Saving needs both --server and --api-key (or A11Y_SERVER and A11Y_API_KEY)." };
  }
  if (positional.length !== 1) return { error: "Give exactly one URL to scan." };
  // --max-new only ever applied inside the baseline comparison, so on its
  // own it was a threshold that quietly did nothing — the same green-forever
  // failure as above, arrived at from the other direction.
  if (opts.maxNew !== undefined && !opts.baseline && !opts.writeBaseline) {
    return { error: "--max-new counts new findings against a baseline. Add --baseline <file>." };
  }
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
  --sarif <file>        write the findings as SARIF 2.1.0 — GitHub shows
                        these inline on the pull request
  --server <url>        save the report to a hosted instance's history
  --api-key <key>       ...with this key (or A11Y_SERVER / A11Y_API_KEY)
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
  // The server mints it now (services/merge/fingerprint), so the CLI, the
  // triage table and the baseline all mean the same thing by "the same
  // finding". Computed here only for a report that somehow lacks it.
  return f.fingerprint ?? fingerprintFinding(f);
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

async function fetchTriage(
  server: string,
  apiKey: string,
  url: string
): Promise<{ ok: true; states: Map<string, string> } | { ok: false; error: string }> {
  try {
    const res = await fetch(new URL(`/api/findings/state?origin=${encodeURIComponent(url)}`, server), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = (await res.json().catch(() => ({}))) as { states?: Array<{ fingerprint: string; state: string }>; error?: string };
    if (!res.ok) return { ok: false, error: `${res.status} ${body.error ?? ""}`.trim() };
    return { ok: true, states: new Map((body.states ?? []).map((s) => [s.fingerprint, s.state])) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function saveToServer(
  server: string,
  apiKey: string,
  report: AccessibilityReport
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(new URL("/api/scans", server), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(report),
    });
    const body = (await res.json().catch(() => ({}))) as { savedAs?: string; error?: string; detail?: string };
    if (!res.ok || !body.savedAs) {
      return { ok: false, error: `${res.status} ${body.error ?? ""} ${body.detail ?? ""}`.trim() };
    }
    return { ok: true, id: body.savedAs };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * SARIF 2.1.0, the format GitHub code scanning reads.
 *
 * Uploaded from a workflow, each finding appears on the pull request as an
 * annotation — which is where a developer meets it, rather than in a JSON
 * file nobody opens. A web page has no file and line, so the location is
 * the URL as an artifact and the CSS selector as its logical location;
 * that is what the format allows for and what GitHub renders.
 */
export function toSarif(report: AccessibilityReport): unknown {
  const findings = report.findings.filter((f) => f.category === "accessibility");
  const ruleIds = [...new Set(findings.map((f) => f.ruleId ?? f.wcagCriterion ?? "finding"))];
  const level = (s: Severity) => (s === "critical" || s === "serious" ? "error" : s === "moderate" ? "warning" : "note");
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "a11y-scan",
            informationUri: "https://barrierfreeweb.de",
            rules: ruleIds.map((id) => ({ id, shortDescription: { text: id } })),
          },
        },
        results: findings.map((f) => ({
          ruleId: f.ruleId ?? f.wcagCriterion ?? "finding",
          level: level(f.severity),
          message: { text: f.suggestedFix ? `${f.description} ${f.suggestedFix}` : f.description },
          locations: [
            {
              physicalLocation: { artifactLocation: { uri: report.url } },
              ...(f.selector ? { logicalLocations: [{ name: f.selector, kind: "element" }] } : {}),
            },
          ],
          partialFingerprints: { primaryLocationLineHash: fingerprint(f) },
          // Only a real criterion id. Some automated findings carry a
          // placeholder string here rather than an id, and a property
          // reading "WCAG (see rule help)" is noise in someone's dashboard.
          ...(f.wcagCriterion && /^\d+\.\d+\.\d+$/.test(f.wcagCriterion) ? { properties: { wcag: f.wcagCriterion } } : {}),
        })),
      },
    ],
  };
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

  if (opts.sarif) {
    writeFileSync(opts.sarif, JSON.stringify(toSarif(report), null, 2));
    if (!opts.quiet) console.log(`  SARIF written to ${opts.sarif}`);
  }

  if (opts.server && opts.apiKey) {
    // Saved before the thresholds are judged, so a failing run is in the
    // history too — it is the one a person will want to look at.
    const saved = await saveToServer(opts.server, opts.apiKey, report);
    if (saved.ok) {
      if (!opts.quiet) console.log(`  saved to ${opts.server} as ${saved.id}`);
    } else {
      // Said, never swallowed: a job that believes its history is being
      // kept when it is not is the silent failure this command is built
      // to refuse. Not exit 2 though — the scan itself was completed and
      // the thresholds still deserve their verdict.
      console.error(`  WARNING: could not save to ${opts.server}: ${saved.error}`);
    }
  }

  // The owner's triage, when there is a server to ask. A finding marked
  // ignored or a false positive is left out of the thresholds — and SAID,
  // because a gate that quietly stopped counting things is the failure
  // this command exists to refuse. The score is untouched: triage is what
  // the owner decided, the score is what was measured.
  let counted = report.findings.filter((f) => f.category === "accessibility");
  if (opts.server && opts.apiKey) {
    const triage = await fetchTriage(opts.server, opts.apiKey, report.url);
    if (triage.ok) {
      const setAside = counted.filter((f) => ["ignored", "false-positive"].includes(triage.states.get(fingerprint(f)) ?? ""));
      if (setAside.length) {
        counted = counted.filter((f) => !setAside.includes(f));
        if (!opts.quiet) {
          console.log(`  ${setAside.length} finding${setAside.length === 1 ? "" : "s"} set aside by the site's triage (ignored or false positive) — not counted against thresholds`);
        }
      }
    } else if (!opts.quiet) {
      console.log(`  NOTE: could not read the site's triage (${triage.error}) — every finding counts`);
    }
  }

  const prints = counted.map(fingerprint);
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
    const counts = severityCounts(counted);
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
      // A baseline written before fingerprints were hashed holds the
      // rule|selector form. Both are recognised, so an existing gate keeps
      // working; --write-baseline rewrites it in the new form.
      const legacy = new Map(counted.map((f) => [legacyFingerprint(f), fingerprint(f)]));
      const currentForms = new Set([...prints, ...legacy.keys()]);
      const fresh = counted.filter((f) => !known.has(fingerprint(f)) && !known.has(legacyFingerprint(f))).map(fingerprint);
      const fixed = (saved.findings ?? []).filter((p) => !currentForms.has(p));
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

// Only when run as a command. Importing this file — which the argument
// tests do — must not start a scan or exit the process.
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  main()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err);
      process.exit(2);
    });
}
