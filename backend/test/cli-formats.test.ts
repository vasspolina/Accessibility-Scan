import { describe, it, expect } from "vitest";
import { toSarif, toJUnit, toCsv, toMarkdown, enClauseOf, pageKey, pageKeyer, CSV_COLUMNS } from "../src/cliFormats.js";
import { parseArgs, parseUrlList, buildPageList, judge, type Counted } from "../src/cli.js";
import { fingerprintFinding } from "../src/services/merge/fingerprint.js";
import type { AccessibilityFinding, AccessibilityReport } from "../src/types/report.js";

/**
 * What the command writes for other tools, and the gate over several pages.
 *
 * The formats are read by machines that fail without a word: a JUnit file
 * with one bad character shows no tests, a CSV with a formula in it runs
 * the formula. So the cases here are the awkward strings, taken from what a
 * real page puts into a selector or a snippet.
 */

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: Math.random().toString(),
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "main > a.cta",
    description: "The link has no name.",
    suggestedFix: "Give it text.",
    ruleId: "link-name",
    wcagCriterion: "2.4.4",
    wcagLevel: "A",
    ...overrides,
  };
}

function report(url: string, score: number, findings: AccessibilityFinding[]): AccessibilityReport {
  return {
    url,
    scannedAt: "2026-11-22T10:00:00.000Z",
    score,
    summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    meta: { axeVersion: "1", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
  };
}

const counted = (reports: AccessibilityReport[]): Counted[] =>
  reports.flatMap((r) => r.findings.filter((f) => f.category === "accessibility").map((f) => ({ report: r, f })));

describe("enClauseOf", () => {
  it("puts 9 in front of an A or AA criterion", () => {
    expect(enClauseOf(finding({ wcagCriterion: "1.4.3", wcagLevel: "AA" }))).toBe("9.1.4.3");
  });

  it("gives AAA no clause, because the standard gives it none", () => {
    expect(enClauseOf(finding({ wcagCriterion: "2.5.5", wcagLevel: "AAA" }))).toBeNull();
  });

  it("gives a placeholder criterion no clause", () => {
    expect(enClauseOf(finding({ wcagCriterion: "WCAG (see rule help)" }))).toBeNull();
    expect(enClauseOf(finding({ wcagCriterion: undefined }))).toBeNull();
  });
});

describe("toSarif", () => {
  it("keeps one page's fingerprints as they were, so GitHub's history holds", () => {
    const f = finding();
    const sarif = toSarif([report("https://example.com/", 80, [f])]) as any;
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs[0].results[0].partialFingerprints.primaryLocationLineHash).toBe(fingerprintFinding(f));
    expect(sarif.runs[0].results[0].properties).toEqual({ wcag: "2.4.4", en301549: "9.2.4.4" });
  });

  it("tells the same fault on two pages apart", () => {
    const sarif = toSarif([
      report("https://example.com/a", 80, [finding()]),
      report("https://example.com/b", 80, [finding()]),
    ]) as any;
    const prints = sarif.runs[0].results.map((r: any) => r.partialFingerprints.primaryLocationLineHash);
    expect(new Set(prints).size).toBe(2);
    expect(sarif.runs[0].results.map((r: any) => r.locations[0].physicalLocation.artifactLocation.uri)).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
    // One rule entry for the two results.
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(1);
  });

  it("leaves design notes and dark patterns out", () => {
    const sarif = toSarif([
      report("https://example.com/", 80, [finding(), finding({ category: "design-clarity" })]),
    ]) as any;
    expect(sarif.runs[0].results).toHaveLength(1);
  });
});

describe("toJUnit", () => {
  it("writes one suite for each page and one failed case for each finding", () => {
    const out = toJUnit([
      report("https://example.com/a", 70, [finding(), finding({ ruleId: "image-alt", selector: "img" })]),
      report("https://example.com/b", 100, []),
    ]);
    expect(out).toContain('<testsuites name="a11y-scan" tests="2" failures="2" errors="0">');
    expect(out).toContain('<testsuite name="https://example.com/a" tests="2" failures="2"');
    // A clean page is a suite of none. There is no passed case to tick.
    expect(out).toContain('<testsuite name="https://example.com/b" tests="0" failures="0"');
    expect(out.match(/<failure /g)).toHaveLength(2);
    expect(out).toContain("WCAG 2.4.4 A");
  });

  it("escapes what a page puts into a selector and a description", () => {
    const out = toJUnit([
      report("https://example.com/?a=1&b=2", 70, [
        finding({ selector: 'a[href="/x"] > b', description: "Uses <b> & \"quotes\"." }),
      ]),
    ]);
    expect(out).toContain("https://example.com/?a=1&amp;b=2");
    expect(out).toContain("a[href=&quot;/x&quot;] &gt; b");
    expect(out).toContain("Uses &lt;b&gt; &amp; &quot;quotes&quot;.");
    // Nothing raw is left between the tags.
    expect(out).not.toMatch(/<b>/);
  });

  it("drops control characters XML cannot carry", () => {
    const out = toJUnit([report("https://example.com/", 70, [finding({ description: "bad\u0000char\u0008here" })])]);
    expect(out).toContain("badcharhere");
  });

  it("writes a page that could not be scanned as an error, never as a clean page", () => {
    const out = toJUnit([report("https://example.com/a", 100, [])], [{ url: "https://example.com/b", error: "timed out" }]);
    expect(out).toContain('tests="1" failures="0" errors="1"');
    expect(out).toContain('<error type="scan-failed" message="timed out">');
  });
});

describe("toCsv", () => {
  it("writes a header and one row for each finding, with the page in front", () => {
    const csv = toCsv([report("https://example.com/a", 70, [finding({ title: "Link without a name" })])]);
    const rows = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toBe(CSV_COLUMNS.map((c) => `"${c}"`).join(","));
    expect(rows[1]).toContain('"https://example.com/a","serious","link-name","2.4.4","A","9.2.4.4"');
    expect(rows[1]).toContain('"Link without a name. The link has no name."');
  });

  it("starts with a BOM, so Excel reads it as UTF-8", () => {
    expect(toCsv([]).charCodeAt(0)).toBe(0xfeff);
  });

  it("doubles quotes and keeps commas and line breaks inside one cell", () => {
    const csv = toCsv([report("https://example.com/", 70, [finding({ description: 'Says "hi", then\nbreaks.' })])]);
    expect(csv).toContain('"Says ""hi"", then\nbreaks."');
  });

  it("stops a cell from a stranger's page being run as a formula", () => {
    const csv = toCsv([
      report("https://example.com/", 70, [
        finding({ selector: '=HYPERLINK("http://evil.test","x")', description: "+1 more", suggestedFix: "@fix" }),
      ]),
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil.test"",""x"")"`);
    expect(csv).toContain(`"'+1 more"`);
    expect(csv).toContain(`"'@fix"`);
  });
});

describe("toMarkdown", () => {
  it("gives one line for each page and the most serious findings first", () => {
    const md = toMarkdown([
      report("https://example.com/a", 70, [
        finding({ severity: "minor", title: "Small thing" }),
        finding({ severity: "critical", title: "Big thing" }),
      ]),
    ]);
    expect(md).toContain("| https://example.com/a | 70 | 1 | 0 | 0 | 1 |");
    expect(md.indexOf("Big thing")).toBeLessThan(md.indexOf("Small thing"));
  });

  it("keeps a pipe in a selector from breaking the table", () => {
    const md = toMarkdown([report("https://example.com/", 70, [finding({ selector: "a[lang|=en]" })])]);
    expect(md).toContain("`a[lang\\|=en]`");
  });

  it("names the pages that were not scanned", () => {
    const md = toMarkdown([report("https://example.com/a", 90, [])], [{ url: "https://example.com/b", error: "timed out" }]);
    expect(md).toContain("| https://example.com/b | not scanned |");
    expect(md).toContain("- https://example.com/b: timed out");
  });

  it("says what a scan cannot show, on a page with nothing found as well", () => {
    expect(toMarkdown([report("https://example.com/", 100, [])])).toContain("cannot show that a page has none");
  });

  it("stops at twenty findings and says how many are left", () => {
    const many = Array.from({ length: 23 }, (_, i) => finding({ selector: `a.n${i}` }));
    expect(toMarkdown([report("https://example.com/", 10, many)])).toContain("3 more in the full report.");
  });
});

describe("pageKey", () => {
  it("is the path and query without the host, so localhost and staging agree", () => {
    expect(pageKey("http://localhost:3000/contact/?a=1")).toBe("/contact?a=1");
    expect(pageKey("https://staging.example.com/contact?a=1")).toBe("/contact?a=1");
    expect(pageKey("https://example.com")).toBe("/");
  });
});

describe("a run across several hosts", () => {
  // Found by scanning example.com with example.org: both pages are "/", and
  // with the host left out every finding on the second collided with the
  // same finding on the first.
  const com = report("https://example.com/", 77, [finding()]);
  const org = report("https://example.org/", 77, [finding()]);

  it("puts the host in the page key, and leaves it out on one site", () => {
    const across = pageKeyer([com.url, org.url]);
    expect(across(com.url)).toBe("https://example.com/");
    expect(across(org.url)).toBe("https://example.org/");
    const oneSite = pageKeyer(["http://localhost:3000/", "http://localhost:3000/contact"]);
    expect(oneSite("http://localhost:3000/contact")).toBe("/contact");
  });

  it("gives the same fault on two hosts two SARIF fingerprints", () => {
    const sarif = toSarif([com, org]) as any;
    const prints = sarif.runs[0].results.map((r: any) => r.partialFingerprints.primaryLocationLineHash);
    expect(new Set(prints).size).toBe(2);
  });

  it("names the page by its host in the summary and in the failure", () => {
    expect(toMarkdown([com, org])).toContain("| https://example.org/ |\n");
    const { failures } = judge([com, org], counted([com, org]), { minScore: 100 }, null);
    expect(failures).toEqual([
      "2 pages below the required score of 100: https://example.com/ 77, https://example.org/ 77",
    ]);
  });

  it("does not take one host's baseline entry for the other's finding", () => {
    const key = `https://example.com/|${fingerprintFinding(com.findings[0])}`;
    expect(judge([com, org], counted([com, org]), {}, [key]).failures).toEqual([
      "1 new findings since the baseline (allowed 0)",
    ]);
  });
});

describe("the page list", () => {
  it("accepts several addresses, a sitemap or a file", () => {
    const several = parseArgs(["https://a.test", "https://a.test/b"]);
    expect("error" in several ? several.error : several.urls).toEqual(["https://a.test", "https://a.test/b"]);
    const map = parseArgs(["--sitemap", "https://a.test/sitemap.xml", "--max-pages", "5"]);
    expect("error" in map ? map.error : [map.sitemap, map.maxPages, map.urls]).toEqual([
      "https://a.test/sitemap.xml",
      5,
      [],
    ]);
    const file = parseArgs(["--urls", "pages.txt"]);
    expect("error" in file ? file.error : file.urlsFile).toBe("pages.txt");
  });

  it("refuses a run with nothing to scan", () => {
    const r = parseArgs([]);
    expect("error" in r && r.error).toContain("Give a URL to scan");
  });

  it("refuses --max-pages where it would limit nothing", () => {
    const r = parseArgs(["https://a.test", "--max-pages", "5"]);
    expect("error" in r && r.error).toContain("--sitemap");
    const zero = parseArgs(["--sitemap", "https://a.test/s.xml", "--max-pages", "0"]);
    expect("error" in zero && zero.error).toContain("whole number");
  });

  it("reads a file of addresses, without its comments and blank lines", () => {
    expect(parseUrlList("# the shop\nhttps://a.test/\n\n  https://a.test/cart  \n#https://a.test/old\n")).toEqual([
      "https://a.test/",
      "https://a.test/cart",
    ]);
  });

  it("cuts only the sitemap's pages, never one a person named", () => {
    const sitemap = Array.from({ length: 10 }, (_, i) => `https://a.test/p${i}`);
    const list = buildPageList(["https://a.test/", "https://a.test/x"], ["https://a.test/y"], sitemap, 3);
    expect(list.urls).toEqual([
      "https://a.test/",
      "https://a.test/x",
      "https://a.test/y",
      "https://a.test/p0",
      "https://a.test/p1",
      "https://a.test/p2",
    ]);
    expect(list.sitemapListed).toBe(10);
    expect(list.sitemapTaken).toBe(3);
  });

  it("scans a page once when it is named twice, and does not spend the cap on it", () => {
    const list = buildPageList(["https://a.test/contact"], [], ["https://a.test/contact/", "https://a.test/contact#form", "https://a.test/about"], 1);
    expect(list.urls).toEqual(["https://a.test/contact", "https://a.test/about"]);
    expect(list.sitemapTaken).toBe(1);
  });
});

describe("judge, over several pages", () => {
  const a = report("https://example.com/a", 90, [finding({ selector: "a.one" })]);
  const b = report("https://example.com/b", 60, [finding({ selector: "a.one" }), finding({ severity: "minor", selector: "p" })]);

  it("holds every page to --min-score and names the ones below it", () => {
    const { failures } = judge([a, b], counted([a, b]), { minScore: 80 }, null);
    expect(failures).toEqual(["1 page below the required score of 80: /b 60"]);
  });

  it("keeps the old sentence for a run of one page", () => {
    const { failures } = judge([b], counted([b]), { minScore: 80 }, null);
    expect(failures).toEqual(["score 60 is below the required 80"]);
  });

  it("counts --fail-on across every page", () => {
    const { failures } = judge([a, b], counted([a, b]), { failOn: "serious" }, null);
    expect(failures).toEqual(["found 2 serious (--fail-on serious)"]);
  });

  it("passes when nothing is asked", () => {
    expect(judge([a, b], counted([a, b]), {}, null).failures).toEqual([]);
  });

  it("tells a new page's finding from the same finding on a known page", () => {
    // The baseline knows the fault on /a only. The same rule and selector on
    // /b is a second finding, and it is new.
    const key = `/a|${fingerprintFinding(a.findings[0])}`;
    const verdict = judge([a, b], counted([a, b]), {}, [key]);
    expect(verdict.failures).toEqual(["2 new findings since the baseline (allowed 0)"]);
    expect(verdict.baselineLine).toContain("2 new · 0 fixed");
    expect(judge([a, b], counted([a, b]), { maxNew: 2 }, [key]).failures).toEqual([]);
  });

  it("reports a baseline entry that is no longer found as fixed", () => {
    const keys = counted([a]).map((c) => `/a|${fingerprintFinding(c.f)}`);
    const verdict = judge([a, b], counted([a]), {}, [...keys, "/gone|0000000000000000"]);
    expect(verdict.baselineLine).toContain("0 new · 1 fixed");
  });

  it("still reads a baseline written from one page, with no page in its keys", () => {
    const bare = fingerprintFinding(a.findings[0]);
    // One page, as before: the bare fingerprint is the key.
    expect(judge([a], counted([a]), {}, [bare]).failures).toEqual([]);
    // Several pages: it names no page, so it matches that finding anywhere.
    const verdict = judge([a, b], counted([a, b]), {}, [bare]);
    expect(verdict.failures).toEqual(["1 new findings since the baseline (allowed 0)"]);
  });

  it("compares by page when one page of a run of several could not be scanned", () => {
    // Two pages asked for, one scanned. The baseline has page keys, and the
    // page that did scan must be found in it: without the last argument its
    // finding was compared by bare fingerprint and read as new.
    const key = `/a|${fingerprintFinding(a.findings[0])}`;
    expect(judge([a], counted([a]), {}, [key], true).failures).toEqual([]);
    expect(judge([a], counted([a]), {}, [key]).failures).toEqual(["1 new findings since the baseline (allowed 0)"]);
  });

  it("still reads a baseline from before fingerprints were hashed", () => {
    expect(judge([a], counted([a]), {}, ["link-name|a.one"]).failures).toEqual([]);
  });
});
