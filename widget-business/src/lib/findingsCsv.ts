/**
 * Every accessibility finding of one report, as a spreadsheet.
 *
 * The report on screen is written for the site's owner. The person who fixes
 * the faults works from a list they can sort, filter and paste into a
 * tracker, and until this file the only ways out of the widget were a PDF
 * and an email. One row for each finding, not for each card: the report
 * folds forty images without alt text into one card, and a developer needs
 * the forty selectors.
 *
 * The columns, their order and the way a cell is written are the command
 * line's (`toCsv` and `CSV_COLUMNS` in backend/src/cliFormats.ts), so a file
 * saved here and a file written by `a11y-scan --format csv` open the same
 * way and can be joined on Fingerprint. Only the column titles differ: here
 * they follow the reader's language, there they are English.
 *
 * Accessibility findings only, for the reason the command line gives: design
 * notes and dark patterns are not failures of a standard, and they never
 * count towards the score.
 */
import type { AccessibilityFinding, AccessibilityReport } from "../api/scanClient";
import { enClauseFor } from "./audienceMode";
import { t } from "./strings";

/** The English column titles, which are also the keys t() looks up. WCAG and
 *  EN 301 549 are names of standards and read the same in every language. */
export const FINDINGS_CSV_COLUMNS = [
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

function cell(value: string): string {
  // A cell that begins with =, +, - or @ is run as a formula by Excel and
  // Sheets, and so is one that begins with a tab or a carriage return. These
  // cells hold text taken from a stranger's page (a selector, a snippet, a
  // link's words), so a leading apostrophe makes the spreadsheet show it as
  // text instead.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** Only a real criterion id. Some automated findings carry a placeholder
 *  here ("WCAG (see rule help)"), which is noise in a column people sort. */
function criterionOf(f: AccessibilityFinding): string {
  return f.wcagCriterion?.match(/^(\d+\.\d+\.\d+)/)?.[1] ?? "";
}

/** The clause alone: the column's title already says which standard. */
function enClauseOf(f: AccessibilityFinding): string {
  return enClauseFor(f.wcagCriterion, f.wcagLevel)?.replace(/^EN 301 549 /, "") ?? "";
}

export function findingsCsv(report: AccessibilityReport): string {
  const rows: string[][] = [FINDINGS_CSV_COLUMNS.map((column) => t(column))];
  for (const f of report.findings) {
    if (f.category !== "accessibility") continue;
    rows.push([
      report.url,
      // Severity and Found by keep the report's own words (critical,
      // automated): they are values to filter on, the same in every file.
      f.severity,
      f.ruleId ?? "",
      criterionOf(f),
      f.wcagLevel ?? "",
      enClauseOf(f),
      f.title ? `${f.title}. ${f.description}` : f.description,
      f.suggestedFix ?? "",
      f.selector ?? "",
      f.source,
      // Minted on the server. A report saved before it was sent has none,
      // and an empty cell is truer than one made up here by another rule.
      f.fingerprint ?? "",
    ]);
  }
  // The leading BOM is for Excel, which otherwise reads UTF-8 as Latin-1.
  return "﻿" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** The file's name: the site and the day, so two downloads do not collide
 *  and the file still says what it is once it has left the Downloads folder. */
export function findingsCsvFilename(report: AccessibilityReport): string {
  let host = "";
  try {
    host = new URL(report.url).hostname.replace(/^www\./, "");
  } catch {
    // A report whose address does not parse still gets a file.
  }
  const day = /^\d{4}-\d{2}-\d{2}/.exec(report.scannedAt ?? "")?.[0] ?? "";
  const safeHost = host.replace(/[^a-z0-9.-]/gi, "");
  return ["accessibility-findings", safeHost, day].filter(Boolean).join("-") + ".csv";
}
