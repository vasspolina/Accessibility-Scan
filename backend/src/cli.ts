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
 *   npx a11y-scan --sitemap https://example.com/sitemap.xml --max-pages 20
 *   npx a11y-scan http://localhost:3000 http://localhost:3000/contact --junit a11y.xml
 *
 * Exit codes are the interface a CI job actually consumes:
 *   0  the run met every threshold given
 *   1  a threshold was not met — the report says which
 *   2  the scan could not be completed (network, crash, bad arguments),
 *      or one page of several could not be scanned and no threshold was
 *      missed
 *
 * With no thresholds it reports and exits 0: a first run should tell you
 * where you stand without failing your build on the day you add it.
 */
import { writeFileSync, readFileSync, existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { scanUrlToReport } from "./services/scanPipeline.js";
import { documentsLine } from "./services/documents/inventoryDocuments.js";
import { legacyFingerprint } from "./services/merge/fingerprint.js";
import { discoverFromSitemap, makeTextFetcher, readSitemap } from "./services/crawl/sitemap.js";
import { SEVERITY_ORDER, fingerprintOf, pageKeyer, toCsv, toJUnit, toMarkdown, toSarif } from "./cliFormats.js";
import type { AccessibilityFinding, AccessibilityReport, Severity } from "./types/report.js";

export { toSarif };

/** How many pages a sitemap may add to one run unless --max-pages says
 *  otherwise. A page takes 15 to 40 seconds, so 25 is a run of roughly ten
 *  minutes at two pages at a time. A sitemap of thousands scanned whole by
 *  default would be a pipeline that never finishes. */
export const DEFAULT_MAX_PAGES = 25;
/** Pages scanned at once. The browser pool allows two renders at a time
 *  (MAX_CONCURRENT_RENDERS), so a third would only wait in its queue. */
const PAGE_CONCURRENCY = 2;
/** How many addresses are read out of a sitemap before the reading stops.
 *  50,000 is the most one sitemap file may hold by its specification, so the
 *  count printed for an ordinary site is its real count. */
const SITEMAP_READ_CAP = 50_000;

interface Options {
  /** The first address named, kept for a run of one page. */
  url: string;
  /** Every address named on the command line, in order. */
  urls: string[];
  /** A sitemap to read page addresses from. */
  sitemap?: string;
  /** A text file with one address on each line. */
  urlsFile?: string;
  /** The most pages a sitemap may add. */
  maxPages?: number;
  minScore?: number;
  failOn?: Severity;
  maxNew?: number;
  json?: string;
  sarif?: string;
  junit?: string;
  csv?: string;
  markdown?: string;
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
      case "--max-pages": {
        const raw = next();
        const v = Number(raw);
        if (raw && (!Number.isInteger(v) || v < 1)) return { error: "--max-pages takes a whole number, 1 or more" };
        opts.maxPages = v;
        break;
      }
      case "--sitemap": opts.sitemap = next(); break;
      case "--urls": opts.urlsFile = next(); break;
      case "--json": opts.json = next(); break;
      case "--sarif": opts.sarif = next(); break;
      case "--junit": opts.junit = next(); break;
      case "--csv": opts.csv = next(); break;
      case "--markdown": opts.markdown = next(); break;
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
  if (positional.length === 0 && !opts.sitemap && !opts.urlsFile) {
    return { error: "Give a URL to scan, or --sitemap <url>, or --urls <file>." };
  }
  // --max-pages only limits what a sitemap adds. Without one it would be a
  // limit that applied to nothing: a person who wrote it to keep a run short
  // would get every address scanned anyway, and not be told.
  if (opts.maxPages !== undefined && !opts.sitemap) {
    return { error: "--max-pages limits the pages taken from a sitemap. Add --sitemap <url>." };
  }
  // --max-new only ever applied inside the baseline comparison, so on its
  // own it was a threshold that quietly did nothing — the same green-forever
  // failure as above, arrived at from the other direction.
  if (opts.maxNew !== undefined && !opts.baseline && !opts.writeBaseline) {
    return { error: "--max-new counts new findings against a baseline. Add --baseline <file>." };
  }
  return { ...(opts as Options), url: positional[0] ?? "", urls: positional };
}

const HELP = `a11y-scan — accessibility scan for a pipeline

  a11y-scan <url> [more urls] [options]

  --sitemap <url>       scan the pages a sitemap lists
  --max-pages <n>       take at most n pages from the sitemap (default ${DEFAULT_MAX_PAGES})
  --urls <file>         scan the addresses in a text file, one on each line

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
  --junit <file>        write the findings as JUnit XML, the test report
                        GitLab, Jenkins and Azure Pipelines read
  --csv <file>          write the findings as a spreadsheet
  --markdown <file>     write a summary for a job summary or a PR comment

  --server <url>        save the report to a hosted instance's history
  --api-key <key>       ...with this key (or A11Y_SERVER / A11Y_API_KEY)
  --ai                  include the AI review (needs ANTHROPIC_API_KEY)
  --quiet               only print the verdict line

  With no thresholds it reports and exits 0. With several pages a threshold
  applies to every page.
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
const fingerprint = fingerprintOf;

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
    // The PDFs and office files the page links to. Counts only: which ones,
    // and what was found in the PDFs that were opened, is in the JSON
    // report under `documents`. Never part of the score above.
    const documents = documentsLine(report.documents);
    if (documents) console.log(`  ${documents}`);
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
 * The addresses in a --urls file: one on each line, blank lines and lines
 * starting with # left out.
 */
export function parseUrlList(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export interface PageList {
  urls: string[];
  /** How many addresses the sitemap listed, when one was read. */
  sitemapListed?: number;
  /** How many of those this run scans: not over the cap, and not counting
   *  a page that was already named. */
  sitemapTaken?: number;
}

/**
 * Puts the three sources of addresses into one list, in the order a person
 * would expect: the ones they typed, the ones in their file, then the
 * sitemap's, cut to `maxPages`. Only the sitemap is ever cut: an address a
 * person named is scanned.
 *
 * The same page named twice is scanned once. "The same" is the address
 * without its fragment and without a trailing slash, as the crawl has it.
 */
export function buildPageList(named: string[], fromFile: string[], fromSitemap: string[], maxPages: number): PageList {
  const seen = new Set<string>();
  const urls: string[] = [];
  const add = (raw: string): boolean => {
    let key = raw;
    try {
      const parsed = new URL(raw);
      parsed.hash = "";
      if (parsed.pathname.length > 1) parsed.pathname = parsed.pathname.replace(/\/+$/, "");
      key = parsed.toString();
    } catch {
      // Kept as typed, so the run can refuse it by name further on.
    }
    if (seen.has(key)) return false;
    seen.add(key);
    urls.push(raw);
    return true;
  };
  for (const url of named) add(url);
  for (const url of fromFile) add(url);
  let taken = 0;
  for (const url of fromSitemap) {
    if (taken >= maxPages) break;
    if (add(url)) taken += 1;
  }
  return { urls, ...(fromSitemap.length ? { sitemapListed: fromSitemap.length, sitemapTaken: taken } : {}) };
}

/** The key a finding has in a baseline. One page: the fingerprint alone, as
 *  it has always been. Several: the page's path in front, because the same
 *  rule on the same selector on two pages is two findings. */
function baselineKey(
  report: AccessibilityReport,
  f: AccessibilityFinding,
  several: boolean,
  keyOf: (url: string) => string
): string {
  return several ? `${keyOf(report.url)}|${fingerprint(f)}` : fingerprint(f);
}

/** A finding with the page it was found on. */
export interface Counted {
  report: AccessibilityReport;
  f: AccessibilityFinding;
}

/**
 * The thresholds, judged. Pure, so the gate is tested without a scan: a
 * gate is the one part of this command a wrong answer from is expensive.
 *
 * `counted` is the findings that count, after the site's triage. With
 * several pages --min-score applies to every page, --fail-on to all of them
 * together, and the baseline to each finding on its own page.
 */
export function judge(
  reports: AccessibilityReport[],
  counted: Counted[],
  opts: { minScore?: number; failOn?: Severity; maxNew?: number },
  baselineFindings: string[] | null,
  // Whether the RUN was of several pages, which is not always whether
  // several were scanned: when one of two pages fails to load, the one left
  // must still be compared by its page key, or every finding on it reads
  // as new against a baseline that was written with page keys.
  several: boolean = reports.length > 1,
  // How a page is named: by its path on one site, with the host in front
  // when the run crosses hosts (see pageKeyer).
  keyOf: (url: string) => string = pageKeyer(reports.map((r) => r.url))
): { failures: string[]; baselineLine?: string } {
  const failures: string[] = [];
  let baselineLine: string | undefined;

  if (opts.minScore !== undefined) {
    const below = reports.filter((r) => r.score < (opts.minScore as number));
    if (below.length && !several) {
      failures.push(`score ${below[0].score} is below the required ${opts.minScore}`);
    } else if (below.length) {
      const named = below.slice(0, 5).map((r) => `${keyOf(r.url)} ${r.score}`);
      failures.push(
        `${below.length} page${below.length === 1 ? "" : "s"} below the required score of ${opts.minScore}: ${named.join(", ")}` +
          (below.length > named.length ? ` and ${below.length - named.length} more` : "")
      );
    }
  }

  if (opts.failOn) {
    const cutoff = SEVERITY_ORDER.indexOf(opts.failOn);
    const counts = severityCounts(counted.map((c) => c.f));
    const hit = SEVERITY_ORDER.slice(0, cutoff + 1).filter((s) => counts[s] > 0);
    if (hit.length) {
      failures.push(`found ${hit.map((s) => `${counts[s]} ${s}`).join(", ")} (--fail-on ${opts.failOn})`);
    }
  }

  if (baselineFindings) {
    const known = new Set(baselineFindings);
    // Three forms are recognised, so an existing gate keeps working:
    // the key this run writes; the bare fingerprint of a baseline taken
    // from one page (it names no page, so it matches that finding on any
    // page); and the rule|selector form from before fingerprints were
    // hashed. --write-baseline rewrites the file in the current form.
    const formsOf = (c: Counted) => [baselineKey(c.report, c.f, several, keyOf), fingerprint(c.f), legacyFingerprint(c.f)];
    const currentForms = new Set(counted.flatMap(formsOf));
    const fresh = counted.filter((c) => !formsOf(c).some((form) => known.has(form)));
    const fixed = baselineFindings.filter((p) => !currentForms.has(p));
    const countMoved = counted.length - baselineFindings.length;
    baselineLine =
      `  vs baseline: ${fresh.length} new · ${fixed.length} fixed` +
      // Prints whenever the total moved without the fingerprints
      // moving — the page-level cards described above.
      (countMoved !== 0 && fresh.length === 0 && fixed.length === 0
        ? ` · total ${countMoved > 0 ? "+" : ""}${countMoved} (a page-level card changed size)`
        : "");
    const allowed = opts.maxNew ?? 0;
    if (fresh.length > allowed) {
      failures.push(`${fresh.length} new findings since the baseline (allowed ${allowed})`);
    }
  }

  return { failures, baselineLine };
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

  // The addresses to scan, from the three places they can come from.
  let fromFile: string[] = [];
  if (opts.urlsFile) {
    try {
      fromFile = parseUrlList(readFileSync(opts.urlsFile, "utf8"));
    } catch (err) {
      console.error(`Could not read ${opts.urlsFile}: ${err instanceof Error ? err.message : String(err)}`);
      return 2;
    }
    if (!fromFile.length) {
      console.error(`No addresses in ${opts.urlsFile}.`);
      return 2;
    }
  }
  let fromSitemap: string[] = [];
  if (opts.sitemap) {
    // Read with the private-address guard off, for the reason given below:
    // the sitemap of a site on localhost is as much the caller's own as the
    // site is.
    const reading = { fetchText: makeTextFetcher(true), maxUrls: SITEMAP_READ_CAP, maxSitemaps: 20 };
    fromSitemap = await readSitemap(opts.sitemap, reading);
    if (!fromSitemap.length) {
      // A site's address given in place of its sitemap's: found the way
      // the crawl finds it, through robots.txt and then /sitemap.xml.
      fromSitemap = (await discoverFromSitemap(opts.sitemap, reading)).urls;
    }
    if (!fromSitemap.length) {
      // Exit 2, not a run of nothing. A sitemap address that moved would
      // otherwise turn the job into one that scans no pages and passes.
      console.error(`No page addresses found in ${opts.sitemap}.`);
      return 2;
    }
  }

  const list = buildPageList(opts.urls, fromFile, fromSitemap, opts.maxPages ?? DEFAULT_MAX_PAGES);
  const several = list.urls.length > 1;
  if (opts.sitemap && !opts.quiet) {
    const listed = list.sitemapListed ?? 0;
    const taken = list.sitemapTaken ?? 0;
    // Said, because a cap that is not announced reads as coverage.
    console.log(
      `  sitemap lists ${listed} page${listed === 1 ? "" : "s"}; scanning ${taken}` +
        (taken >= (opts.maxPages ?? DEFAULT_MAX_PAGES) && taken < listed ? ` (raise --max-pages to scan more)` : "")
    );
  }

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
  for (const url of list.urls) {
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      console.error(`Not a URL: ${url}`);
      return 2;
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      console.error(`Only http and https URLs can be scanned — got ${target.protocol}`);
      return 2;
    }
  }

  // One page that cannot be scanned ends a run of one, as it always has. In
  // a run of several it is recorded and the rest go on: the other pages'
  // findings are most wanted on exactly the run where one page broke.
  const slots: Array<AccessibilityReport | { error: string }> = new Array(list.urls.length);
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    for (;;) {
      const index = cursor++;
      if (index >= list.urls.length) return;
      const url = list.urls[index];
      try {
        // The last argument is the local-trust flag — see scanUrlToReport. It
        // is what lets this command scan http://localhost:3000, which is the
        // address a hosted scanner can never reach.
        slots[index] = await scanUrlToReport(url, opts.ai, undefined, true, undefined, true);
      } catch (err) {
        slots[index] = { error: err instanceof Error ? err.message : String(err) };
      }
      done += 1;
      if (several && !opts.quiet) {
        const slot = slots[index];
        console.log(`  [${done}/${list.urls.length}] ${url} ${"error" in slot ? "could not be scanned" : `score ${slot.score}`}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PAGE_CONCURRENCY, list.urls.length) }, worker));

  const reports: AccessibilityReport[] = [];
  const failedPages: Array<{ url: string; error: string }> = [];
  slots.forEach((slot, index) => {
    if ("error" in slot) failedPages.push({ url: list.urls[index], error: slot.error });
    else reports.push(slot);
  });

  if (!several && failedPages.length) {
    console.error(`Scan failed: ${failedPages[0].error}`);
    return 2;
  }
  for (const page of failedPages) console.error(`  Scan failed for ${page.url}: ${page.error}`);
  if (!reports.length) {
    console.error("No page could be scanned.");
    return 2;
  }

  for (const report of reports) summarise(report, opts.quiet);

  if (opts.json) {
    // One page writes the report itself, as it always has, so a job that
    // reads report.score keeps working. Several write them as a list.
    writeFileSync(opts.json, JSON.stringify(several ? { pages: reports, failed: failedPages } : reports[0], null, 2));
    if (!opts.quiet) console.log(`  report written to ${opts.json}`);
  }
  if (opts.sarif) {
    writeFileSync(opts.sarif, JSON.stringify(toSarif(reports, several, pageKeyer([...reports.map((r) => r.url), ...failedPages.map((p) => p.url)])), null, 2));
    if (!opts.quiet) console.log(`  SARIF written to ${opts.sarif}`);
  }
  if (opts.junit) {
    writeFileSync(opts.junit, toJUnit(reports, failedPages));
    if (!opts.quiet) console.log(`  JUnit written to ${opts.junit}`);
  }
  if (opts.csv) {
    writeFileSync(opts.csv, toCsv(reports));
    if (!opts.quiet) console.log(`  CSV written to ${opts.csv}`);
  }
  if (opts.markdown) {
    writeFileSync(opts.markdown, toMarkdown(reports, failedPages));
    if (!opts.quiet) console.log(`  summary written to ${opts.markdown}`);
  }

  if (opts.server && opts.apiKey) {
    // Saved before the thresholds are judged, so a failing run is in the
    // history too — it is the one a person will want to look at.
    for (const report of reports) {
      const saved = await saveToServer(opts.server, opts.apiKey, report);
      if (saved.ok) {
        if (!opts.quiet) console.log(`  saved to ${opts.server} as ${saved.id}`);
      } else {
        // Said, never swallowed: a job that believes its history is being
        // kept when it is not is the silent failure this command is built
        // to refuse. Not exit 2 though — the scan itself was completed and
        // the thresholds still deserve their verdict.
        console.error(`  WARNING: could not save ${report.url} to ${opts.server}: ${saved.error}`);
      }
    }
  }

  // The owner's triage, when there is a server to ask. A finding marked
  // ignored or a false positive is left out of the thresholds — and SAID,
  // because a gate that quietly stopped counting things is the failure
  // this command exists to refuse. The score is untouched: triage is what
  // the owner decided, the score is what was measured.
  //
  // Triage is kept for a site, so it is asked for once for each origin in
  // the run and not once for each page.
  let counted: Counted[] = reports.flatMap((report) =>
    report.findings.filter((f) => f.category === "accessibility").map((f) => ({ report, f }))
  );
  if (opts.server && opts.apiKey) {
    const byOrigin = new Map<string, Awaited<ReturnType<typeof fetchTriage>>>();
    for (const report of reports) {
      const origin = new URL(report.url).origin;
      if (!byOrigin.has(origin)) byOrigin.set(origin, await fetchTriage(opts.server, opts.apiKey, report.url));
    }
    const stateOf = (c: Counted): string | undefined => {
      const triage = byOrigin.get(new URL(c.report.url).origin);
      return triage && triage.ok ? triage.states.get(fingerprint(c.f)) : undefined;
    };
    for (const [origin, triage] of byOrigin) {
      if (!triage.ok && !opts.quiet) {
        console.log(`  NOTE: could not read the triage for ${origin} (${triage.error}) — every finding counts`);
      }
    }
    // "Fixed" is a claim the scan can test, and here it is being tested:
    // a finding marked fixed that is still found is worth a line of its
    // own, and still counts.
    const stillFound = counted.filter((c) => stateOf(c) === "fixed");
    if (stillFound.length && !opts.quiet) {
      console.log(`  ${stillFound.length} finding${stillFound.length === 1 ? "" : "s"} marked fixed ${stillFound.length === 1 ? "is" : "are"} still found — counted`);
    }
    const setAside = counted.filter((c) => ["ignored", "false-positive"].includes(stateOf(c) ?? ""));
    if (setAside.length) {
      counted = counted.filter((c) => !setAside.includes(c));
      if (!opts.quiet) {
        console.log(`  ${setAside.length} finding${setAside.length === 1 ? "" : "s"} set aside by the site's triage (ignored or false positive) — not counted against thresholds`);
      }
    }
  }

  const keyOf = pageKeyer([...reports.map((r) => r.url), ...failedPages.map((p) => p.url)]);
  const prints = counted.map((c) => baselineKey(c.report, c.f, several, keyOf));
  if (opts.writeBaseline) {
    if (failedPages.length) {
      // A baseline without a page's findings would call every one of them
      // new on the next run, and the gate would fail on a change nobody made.
      console.error(`Baseline not written: ${failedPages.length} page${failedPages.length === 1 ? "" : "s"} could not be scanned.`);
      return 2;
    }
    const file = opts.baseline ?? ".a11y-baseline.json";
    writeFileSync(
      file,
      JSON.stringify(
        several
          ? { urls: reports.map((r) => r.url), createdAt: reports[0].scannedAt, findings: prints }
          : { url: reports[0].url, createdAt: reports[0].scannedAt, score: reports[0].score, findings: prints },
        null,
        2
      )
    );
    console.log(`  baseline written to ${file} (${prints.length} findings)`);
    return 0;
  }

  let baselineFindings: string[] | null = null;
  if (opts.baseline) {
    if (!existsSync(opts.baseline)) {
      console.error(`No baseline at ${opts.baseline}. Create one with --write-baseline.`);
      return 2;
    }
    try {
      const saved = JSON.parse(readFileSync(opts.baseline, "utf8")) as { findings?: string[] };
      baselineFindings = saved.findings ?? [];
    } catch (err) {
      console.error(`Could not read the baseline: ${err instanceof Error ? err.message : String(err)}`);
      return 2;
    }
  }
  const verdict = judge(reports, counted, opts, baselineFindings, several, keyOf);
  if (verdict.baselineLine && !opts.quiet) console.log(verdict.baselineLine);
  const failures = verdict.failures;

  if (failures.length) {
    console.error(`FAIL — ${failures.join("; ")}`);
    return 1;
  }
  if (failedPages.length) {
    // Not 0, whatever the thresholds said about the pages that did scan. A
    // page nobody looked at is not a page that met a threshold, and a green
    // build would say it was. Not 1 either: nothing is known to have got
    // worse.
    console.error(
      `INCOMPLETE — ${failedPages.length} of ${list.urls.length} pages could not be scanned. The pages that were scanned met every threshold given.`
    );
    return 2;
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
