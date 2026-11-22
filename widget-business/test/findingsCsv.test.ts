import { afterEach, describe, it, expect } from "vitest";
import { findingsCsv, findingsCsvFilename, FINDINGS_CSV_COLUMNS } from "../src/lib/findingsCsv";
import { setLang } from "../src/lib/i18n";
import type { AccessibilityFinding, AccessibilityReport } from "../src/api/scanClient";

function finding(over: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "f1",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    wcagCriterion: "1.4.3 Contrast (Minimum)",
    wcagLevel: "AA",
    selector: "a.more",
    description: "Grey text on white measures 2.9:1.",
    suggestedFix: "Darken the text to #595959.",
    ruleId: "color-contrast",
    fingerprint: "abc123",
    ...over,
  };
}

function report(findings: AccessibilityFinding[], over: Partial<AccessibilityReport> = {}): AccessibilityReport {
  return {
    url: "https://www.example.com/shop?page=2",
    scannedAt: "2026-11-22T10:15:00.000Z",
    score: 71,
    summary: { critical: 0, serious: 1, moderate: 0, minor: 0, total: 1 },
    categorySummary: { accessibility: 1, designClarity: 0, darkPattern: 0 },
    findings,
    ...over,
  } as AccessibilityReport;
}

/** The file as rows of cells, read back the way a spreadsheet reads it. */
function parse(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let i = csv.charCodeAt(0) === 0xfeff ? 1 : 0;
  while (i < csv.length) {
    if (csv[i] !== '"') throw new Error(`cell does not open with a quote at ${i}`);
    let value = "";
    i += 1;
    for (;;) {
      if (i >= csv.length) throw new Error("a cell never closes");
      if (csv[i] === '"' && csv[i + 1] === '"') {
        value += '"';
        i += 2;
      } else if (csv[i] === '"') {
        i += 1;
        break;
      } else {
        value += csv[i];
        i += 1;
      }
    }
    row.push(value);
    if (csv[i] === ",") {
      i += 1;
    } else if (csv.startsWith("\r\n", i)) {
      rows.push(row);
      row = [];
      i += 2;
    } else {
      throw new Error(`unexpected character after a cell at ${i}`);
    }
  }
  return rows;
}

afterEach(() => setLang("en"));

describe("the findings as a spreadsheet", () => {
  it("opens with a BOM, so Excel reads it as UTF-8", () => {
    expect(findingsCsv(report([finding()])).charCodeAt(0)).toBe(0xfeff);
  });

  it("ends every row, the last one too, with CRLF", () => {
    const csv = findingsCsv(report([finding(), finding({ id: "f2" })]));
    expect(csv.endsWith("\r\n")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(4);
    expect(csv.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  // The command line writes the same file (backend/src/cliFormats.ts,
  // CSV_COLUMNS). If this list changes, that one changes with it.
  it("has the command line's columns, in its order", () => {
    expect([...FINDINGS_CSV_COLUMNS]).toEqual([
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
    ]);
    expect(parse(findingsCsv(report([])))).toEqual([[...FINDINGS_CSV_COLUMNS]]);
  });

  it("writes one row for each finding, cell by cell", () => {
    const rows = parse(findingsCsv(report([finding({ title: "Low contrast" })])));
    expect(rows[1]).toEqual([
      "https://www.example.com/shop?page=2",
      "serious",
      "color-contrast",
      "1.4.3",
      "AA",
      "9.1.4.3",
      "Low contrast. Grey text on white measures 2.9:1.",
      "Darken the text to #595959.",
      "a.more",
      "automated",
      "abc123",
    ]);
  });

  it("doubles a quote and keeps a comma or a line break inside its cell", () => {
    const snippet = 'a[title="Read, then\nbuy"]';
    const csv = findingsCsv(report([finding({ selector: snippet })]));
    expect(csv).toContain('"a[title=""Read, then\nbuy""]"');
    expect(parse(csv)[1][8]).toBe(snippet);
  });

  // These cells hold text from a stranger's page. A spreadsheet runs a cell
  // that starts with one of these as a formula.
  it.each(["=", "+", "-", "@", "\t", "\r"])("puts an apostrophe before a cell that starts with %j", (first) => {
    const hostile = `${first}HYPERLINK("https://evil.example","Click")`;
    const rows = parse(
      findingsCsv(report([finding({ selector: hostile, description: hostile, suggestedFix: hostile, title: undefined })]))
    );
    expect(rows[1][6]).toBe(`'${hostile}`);
    expect(rows[1][7]).toBe(`'${hostile}`);
    expect(rows[1][8]).toBe(`'${hostile}`);
  });

  it("leaves a cell alone when the sign is not its first character", () => {
    const rows = parse(findingsCsv(report([finding({ selector: "a[href^=mailto]", suggestedFix: "Use 4.5:1 - or more." })])));
    expect(rows[1][7]).toBe("Use 4.5:1 - or more.");
    expect(rows[1][8]).toBe("a[href^=mailto]");
  });

  // EN 301 549 takes over Level A and AA only. A clause printed against a
  // AAA finding would claim a legal anchor the standard does not give.
  it("gives a AAA finding no EN 301 549 clause", () => {
    const rows = parse(
      findingsCsv(report([finding({ wcagCriterion: "1.4.6 Contrast (Enhanced)", wcagLevel: "AAA", ruleId: "color-contrast-enhanced" })]))
    );
    expect(rows[1][3]).toBe("1.4.6");
    expect(rows[1][4]).toBe("AAA");
    expect(rows[1][5]).toBe("");
  });

  it("leaves WCAG and EN 301 549 empty for a criterion that is not an id", () => {
    const rows = parse(findingsCsv(report([finding({ wcagCriterion: "WCAG (see rule help)", wcagLevel: undefined })])));
    expect(rows[1].slice(3, 6)).toEqual(["", "", ""]);
  });

  it("leaves design notes and dark patterns out", () => {
    const rows = parse(
      findingsCsv(
        report([
          finding({ id: "a" }),
          finding({ id: "d", category: "design-clarity", ruleId: "design-note", description: "The headline is small." }),
          finding({ id: "p", category: "dark-pattern", ruleId: "confirmshaming", description: "The refusal is worded as a fault." }),
          finding({ id: "b", selector: "img.hero", ruleId: "image-alt" }),
        ])
      )
    );
    expect(rows).toHaveLength(3);
    expect(rows.slice(1).map((r) => r[2])).toEqual(["color-contrast", "image-alt"]);
  });

  it("writes empty cells, never 'undefined', for what a finding lacks", () => {
    const csv = findingsCsv(report([finding({ ruleId: undefined, fingerprint: undefined, title: undefined })]));
    expect(csv).not.toContain("undefined");
    const rows = parse(csv);
    expect(rows[1][2]).toBe("");
    expect(rows[1][10]).toBe("");
    expect(rows[1]).toHaveLength(FINDINGS_CSV_COLUMNS.length);
  });

  it("titles the columns in the reader's language and leaves the values alone", () => {
    setLang("de");
    const rows = parse(findingsCsv(report([finding()])));
    expect(rows[0]).toEqual([
      "Seite",
      "Schweregrad",
      "Regel",
      "WCAG",
      "Stufe",
      "EN 301 549",
      "Problem",
      "Was zu tun ist",
      "Element",
      "Gefunden durch",
      "Fingerabdruck",
    ]);
    expect(rows[1][1]).toBe("serious");
    expect(rows[1][9]).toBe("automated");
  });
});

describe("the file's name", () => {
  it("says the site and the day", () => {
    expect(findingsCsvFilename(report([]))).toBe("accessibility-findings-example.com-2026-11-22.csv");
  });

  it("still names a file when the address does not parse", () => {
    expect(findingsCsvFilename(report([], { url: "not an address", scannedAt: "" }))).toBe("accessibility-findings.csv");
  });
});
