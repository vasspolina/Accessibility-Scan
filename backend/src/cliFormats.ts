/**
 * What the command writes for other tools to read.
 *
 * Each format exists because one kind of pipeline reads nothing else:
 *
 *   SARIF     GitHub code scanning, and Azure DevOps with its SARIF tab
 *   JUnit     GitLab, Jenkins, Azure Pipelines, CircleCI and Bitbucket all
 *             draw a test report from JUnit XML and from nothing else
 *   CSV       a spreadsheet, which is how findings reach a person who does
 *             not open a pipeline
 *   Markdown  a job summary or a pull request comment
 *
 * All four are pure functions over the reports, and all four take a list:
 * one page is a list of one.
 *
 * Only accessibility findings are written. Design notes and dark patterns
 * are not failures of a standard, and a build tool has no place to put a
 * result that is neither a pass nor a failure.
 */
import { fingerprintFinding } from "./services/merge/fingerprint.js";
import type { AccessibilityFinding, AccessibilityReport, Severity } from "./types/report.js";

export const SEVERITY_ORDER: Severity[] = ["critical", "serious", "moderate", "minor"];

export function fingerprintOf(f: AccessibilityFinding): string {
  // The server mints it now (services/merge/fingerprint), so the CLI, the
  // triage table and the baseline all mean the same thing by "the same
  // finding". Computed here only for a report that somehow lacks it.
  return f.fingerprint ?? fingerprintFinding(f);
}

/** Only a real criterion id. Some automated findings carry a placeholder
 *  string here rather than an id, and a column reading "WCAG (see rule
 *  help)" is noise in someone's dashboard. */
export function criterionOf(f: AccessibilityFinding): string | null {
  const m = f.wcagCriterion?.match(/^(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

/**
 * The EN 301 549 clause for a web finding.
 *
 * Chapter 9 of EN 301 549 takes the WCAG success criteria over one for one
 * and numbers them by putting 9 in front, so 1.4.3 is clause 9.1.4.3. That
 * holds for Level A and AA only: the standard gives AAA no clause, and
 * printing one would claim a legal anchor it does not provide. The same rule
 * as the widget's enClauseFor, kept in step with it by test.
 */
export function enClauseOf(f: AccessibilityFinding): string | null {
  const criterion = criterionOf(f);
  if (!criterion || f.wcagLevel === "AAA") return null;
  return `9.${criterion}`;
}

function accessibilityFindings(report: AccessibilityReport): AccessibilityFinding[] {
  return report.findings.filter((f) => f.category === "accessibility");
}

function ruleOf(f: AccessibilityFinding): string {
  return f.ruleId ?? f.wcagCriterion ?? "finding";
}

/**
 * SARIF 2.1.0, the format GitHub code scanning reads.
 *
 * Uploaded from a workflow, each finding appears on the pull request as an
 * annotation, which is where a developer meets it, rather than in a JSON
 * file nobody opens. A web page has no file and line, so the location is
 * the URL as an artifact and the CSS selector as its logical location;
 * that is what the format allows for and what GitHub renders.
 *
 * Several pages are one run. The fingerprint carries the page's path when
 * there is more than one, because the same rule on the same selector on two
 * pages is two results, and GitHub would otherwise fold them into one.
 */
export function toSarif(
  reports: AccessibilityReport[],
  several: boolean = reports.length > 1,
  keyOf: (url: string) => string = pageKeyer(reports.map((r) => r.url))
): unknown {
  const all = reports.flatMap((report) => accessibilityFindings(report).map((f) => ({ report, f })));
  const ruleIds = [...new Set(all.map(({ f }) => ruleOf(f)))];
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
        results: all.map(({ report, f }) => {
          const wcag = criterionOf(f);
          const en = enClauseOf(f);
          return {
            ruleId: ruleOf(f),
            level: level(f.severity),
            message: { text: f.suggestedFix ? `${f.description} ${f.suggestedFix}` : f.description },
            locations: [
              {
                physicalLocation: { artifactLocation: { uri: report.url } },
                ...(f.selector ? { logicalLocations: [{ name: f.selector, kind: "element" }] } : {}),
              },
            ],
            partialFingerprints: {
              primaryLocationLineHash: several ? `${keyOf(report.url)}|${fingerprintOf(f)}` : fingerprintOf(f),
            },
            ...(wcag ? { properties: { wcag, ...(en ? { en301549: en } : {}) } } : {}),
          };
        }),
      },
    ],
  };
}

/** A page's identity inside a site: its path and query, without the host,
 *  so a baseline taken on localhost still matches the same page on staging. */
export function pageKey(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, "") : "/";
    return `${path}${parsed.search}`;
  } catch {
    return url;
  }
}

/**
 * How pages are named inside one run.
 *
 * On one site the path is enough, and leaving the host out is what lets a
 * baseline move between localhost and staging. A run across several hosts
 * needs the host as well: found by a real run of example.com with
 * example.org, where both pages were "/" and every fingerprint on the second
 * page collided with the same one on the first.
 */
export function pageKeyer(urls: string[]): (url: string) => string {
  const originOf = (url: string): string => {
    try {
      return new URL(url).origin;
    } catch {
      return "";
    }
  };
  return new Set(urls.map(originOf)).size > 1 ? (url) => `${originOf(url)}${pageKey(url)}` : pageKey;
}

function xml(value: string): string {
  return (
    value
      // Characters XML 1.0 has no way to carry at all, even escaped. A page's
      // own markup reaches these strings, and one stray control character
      // makes the whole file unreadable to the tool it was written for.
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  );
}

/**
 * JUnit XML: one suite for each page, one failed case for each finding.
 *
 * There are no passed cases, and a page with no findings is a suite of
 * none. The scanner never says a page passed (a scan proves faults, not
 * their absence), and a row of green ticks in a build's test tab would say
 * exactly that. A page that could not be scanned is one case with an error,
 * so it cannot be read as a clean page.
 */
export function toJUnit(reports: AccessibilityReport[], failed: Array<{ url: string; error: string }> = []): string {
  const suites = reports.map((report) => {
    const findings = accessibilityFindings(report);
    const cases = findings.map((f) => {
      const wcag = criterionOf(f);
      const name = `${ruleOf(f)}${f.selector ? ` ${f.selector}` : ""}`;
      const head = `[${f.severity}]${wcag ? ` WCAG ${wcag}${f.wcagLevel ? ` ${f.wcagLevel}` : ""}` : ""}`;
      const body = [f.description, f.suggestedFix, f.selector ? `Element: ${f.selector}` : "", `Page: ${report.url}`]
        .filter(Boolean)
        .join("\n");
      return (
        `    <testcase classname="${xml(report.url)}" name="${xml(name)}">\n` +
        `      <failure type="${xml(f.severity)}" message="${xml(`${head} ${f.title ?? f.description}`.slice(0, 300))}">${xml(body)}</failure>\n` +
        `    </testcase>`
      );
    });
    return (
      `  <testsuite name="${xml(report.url)}" tests="${cases.length}" failures="${cases.length}" errors="0" timestamp="${xml(report.scannedAt)}">\n` +
      (cases.length ? `${cases.join("\n")}\n` : "") +
      `  </testsuite>`
    );
  });
  const errors = failed.map(
    (page) =>
      `  <testsuite name="${xml(page.url)}" tests="1" failures="0" errors="1">\n` +
      `    <testcase classname="${xml(page.url)}" name="scan">\n` +
      `      <error type="scan-failed" message="${xml(page.error.slice(0, 300))}">${xml(page.error)}</error>\n` +
      `    </testcase>\n` +
      `  </testsuite>`
  );
  const total = reports.reduce((n, r) => n + accessibilityFindings(r).length, 0);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<testsuites name="a11y-scan" tests="${total + failed.length}" failures="${total}" errors="${failed.length}">\n` +
    [...suites, ...errors].join("\n") +
    `\n</testsuites>\n`
  );
}

function csvCell(value: string): string {
  // A cell that begins with =, +, - or @ is run as a formula by Excel and
  // Sheets. These cells hold text taken from a stranger's page (a selector,
  // a snippet, a link's words), so a leading apostrophe makes the
  // spreadsheet show it as text instead.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export const CSV_COLUMNS = [
  "Page",
  "Severity",
  "Rule",
  "WCAG",
  "Level",
  "EN 301 549",
  "Issue",
  "What to do",
  "Element",
  "Found by",
  "Fingerprint",
] as const;

/**
 * One row for each finding, for a spreadsheet.
 *
 * The leading BOM is for Excel, which otherwise reads UTF-8 as Latin-1. The
 * widget's own export does the same, for the same reason.
 */
export function toCsv(reports: AccessibilityReport[]): string {
  const rows: string[][] = [[...CSV_COLUMNS]];
  for (const report of reports) {
    for (const f of accessibilityFindings(report)) {
      rows.push([
        report.url,
        f.severity,
        f.ruleId ?? "",
        criterionOf(f) ?? "",
        f.wcagLevel ?? "",
        enClauseOf(f) ?? "",
        f.title ? `${f.title}. ${f.description}` : f.description,
        f.suggestedFix ?? "",
        f.selector ?? "",
        f.source,
        fingerprintOf(f),
      ]);
    }
  }
  return "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

/**
 * A summary a person reads on the pull request: one line for each page,
 * then the most serious findings.
 *
 * Written for `$GITHUB_STEP_SUMMARY` and for a pull request comment, which
 * both render Markdown. Twenty findings at most: this is the page that says
 * where to look, and the JSON, SARIF or CSV beside it holds every finding.
 */
export function toMarkdown(reports: AccessibilityReport[], failed: Array<{ url: string; error: string }> = []): string {
  const keyOf = pageKeyer([...reports.map((r) => r.url), ...failed.map((p) => p.url)]);
  const lines: string[] = ["## Accessibility scan", ""];
  lines.push("| Page | Score | Critical | Serious | Moderate | Minor | WCAG criteria failing |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const report of reports) {
    const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 } as Record<Severity, number>;
    for (const f of accessibilityFindings(report)) counts[f.severity] += 1;
    lines.push(
      `| ${mdCell(report.url)} | ${report.score} | ${counts.critical} | ${counts.serious} | ${counts.moderate} | ${counts.minor} | ${report.conformance?.failed ?? ""} |`
    );
  }
  for (const page of failed) lines.push(`| ${mdCell(page.url)} | not scanned | | | | | |`);
  lines.push("");

  if (failed.length) {
    lines.push("### Not scanned", "");
    for (const page of failed) lines.push(`- ${mdCell(page.url)}: ${mdCell(page.error)}`);
    lines.push("");
  }

  const incomplete = [...new Set(reports.flatMap((r) => r.meta?.incompleteChecks ?? []))];
  if (incomplete.length) {
    // Said here for the reason the terminal output says it: a score from
    // checks that did not all run is not comparable with one that did.
    lines.push(`**Checks that did not finish on at least one page:** ${incomplete.join(", ")}`, "");
  }

  const ranked = reports
    .flatMap((report) => accessibilityFindings(report).map((f) => ({ report, f })))
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.f.severity) - SEVERITY_ORDER.indexOf(b.f.severity));
  if (ranked.length) {
    const shown = ranked.slice(0, 20);
    lines.push("### Most serious findings", "");
    lines.push("| Severity | WCAG | Issue | Element | Page |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const { report, f } of shown) {
      const wcag = criterionOf(f);
      lines.push(
        `| ${f.severity} | ${wcag ? `${wcag}${f.wcagLevel ? ` ${f.wcagLevel}` : ""}` : ""} | ${mdCell(f.title ?? f.description)} | ${f.selector ? `\`${mdCell(f.selector).replace(/`/g, "'")}\`` : ""} | ${mdCell(keyOf(report.url))} |`
      );
    }
    lines.push("");
    if (ranked.length > shown.length) {
      lines.push(`${ranked.length - shown.length} more in the full report.`, "");
    }
  }

  // The limit of the method, on the artefact a reviewer reads. Without it a
  // table of zeros is taken for a conformance claim.
  lines.push(
    "An automated scan finds faults it can prove. It cannot show that a page has none: the criteria that need a person are listed in the full report."
  );
  return lines.join("\n") + "\n";
}
