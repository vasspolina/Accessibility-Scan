import { describe, it, expect } from "vitest";
import { selectPagesToAudit } from "../src/services/crawl/discoverPages.js";
import { aggregateAudit, type PageOutcome } from "../src/services/crawl/aggregateAudit.js";
import type { AccessibilityFinding, AccessibilityReport } from "../src/types/report.js";

const ENTRY = "https://example.com/";
const link = (href: string, text = "") => ({ href, text });

describe("selectPagesToAudit", () => {
  it("always includes the entry page first", () => {
    const pages = selectPagesToAudit(ENTRY, [], 5);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toEqual({ url: "https://example.com/", label: "Home page" });
  });

  it("resolves relative links against the entry url", () => {
    const pages = selectPagesToAudit(ENTRY, [link("/about", "About")], 5);
    expect(pages[1].url).toBe("https://example.com/about");
  });

  it("never leaves the origin", () => {
    const pages = selectPagesToAudit(ENTRY, [link("https://other.com/x", "Elsewhere")], 5);
    expect(pages).toHaveLength(1);
  });

  it("treats /about, /about/ and /about#team as one page", () => {
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/about", "a"), link("/about/", "b"), link("/about#team", "c")],
      5
    );
    expect(pages).toHaveLength(2);
  });

  it("keeps the query string, which often selects different content", () => {
    const pages = selectPagesToAudit(ENTRY, [link("/products?category=chairs", "Chairs")], 5);
    expect(pages[1].url).toBe("https://example.com/products?category=chairs");
  });

  it("skips files it cannot render as pages", () => {
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/brochure.pdf", "Brochure"), link("/logo.png", "Logo")],
      5
    );
    expect(pages).toHaveLength(1);
  });

  it("skips destructive or pointless endpoints", () => {
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/logout", "Log out"), link("/wp-admin/", "Admin"), link("/api/v1/things", "API")],
      5
    );
    expect(pages).toHaveLength(1);
  });

  it("skips anchors, mailto and tel links", () => {
    const pages = selectPagesToAudit(
      ENTRY,
      [link("mailto:a@b.com", "Email"), link("tel:+1234", "Call")],
      5
    );
    expect(pages).toHaveLength(1);
  });

  it("ranks pages by consequence, not by link order", () => {
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/blog/post-1", "A post"), link("/contact", "Contact us"), link("/about", "About")],
      3
    );
    // Contact outranks a blog post even though the post was linked first.
    expect(pages[1].url).toBe("https://example.com/contact");
  });

  it("respects the page limit", () => {
    const links = Array.from({ length: 40 }, (_, i) => link(`/p${i}`, `Page ${i}`));
    expect(selectPagesToAudit(ENTRY, links, 5)).toHaveLength(5);
  });

  it("returns nothing for an unparseable entry url", () => {
    expect(selectPagesToAudit("not a url", [link("/a", "a")], 5)).toEqual([]);
  });
});

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: Math.random().toString(),
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "a",
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

function report(score: number, findings: AccessibilityFinding[]): AccessibilityReport {
  return {
    url: "u",
    scannedAt: "t",
    score,
    summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    meta: { axeVersion: "1", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
  };
}

function page(url: string, score: number, ruleIds: string[]): PageOutcome {
  return { url, label: url, report: report(score, ruleIds.map((ruleId) => finding({ ruleId }))) };
}

describe("aggregateAudit", () => {
  it("averages the score over pages that actually scanned", () => {
    const audit = aggregateAudit(ENTRY, [
      page("/a", 80, []),
      page("/b", 60, []),
      { url: "/c", label: "c", error: "failed" },
    ]);
    expect(audit.averageScore).toBe(70);
    expect(audit.pagesScanned).toBe(2);
    expect(audit.pagesFailed).toBe(1);
  });

  it("identifies an issue on every page as site-wide", () => {
    const audit = aggregateAudit(ENTRY, [
      page("/a", 80, ["color-contrast", "link-name"]),
      page("/b", 70, ["color-contrast"]),
    ]);
    expect(audit.siteWide.map((s) => s.ruleId)).toEqual(["color-contrast"]);
    expect(audit.siteWide[0].pageCount).toBe(2);
  });

  // A single page is no evidence of a site-wide pattern.
  it("claims nothing is site-wide when only one page scanned", () => {
    const audit = aggregateAudit(ENTRY, [page("/a", 80, ["color-contrast"])]);
    expect(audit.siteWide).toEqual([]);
  });

  it("counts total occurrences across pages", () => {
    const audit = aggregateAudit(ENTRY, [
      page("/a", 80, ["color-contrast", "color-contrast"]),
      page("/b", 70, ["color-contrast"]),
    ]);
    expect(audit.siteWide[0].totalOccurrences).toBe(3);
  });

  it("names the worst-scoring page, ignoring failed ones", () => {
    const audit = aggregateAudit(ENTRY, [
      page("/a", 80, []),
      page("/b", 30, []),
      { url: "/c", label: "c", error: "failed" },
    ]);
    expect(audit.worstPage?.url).toBe("/b");
  });

  it("builds conformance from every page's findings combined", () => {
    const audit = aggregateAudit(ENTRY, [
      { url: "/a", label: "a", report: report(80, [finding({ ruleId: "r", wcagCriterion: "1.4.4" })]) },
      { url: "/b", label: "b", report: report(70, [finding({ ruleId: "r", wcagCriterion: "1.1.1" })]) },
    ]);
    expect(audit.conformance.failed).toBe(2);
    expect(audit.conformance.failedByLevel).toEqual({ A: 1, AA: 1 });
  });

  it("handles an audit where every page failed", () => {
    const audit = aggregateAudit(ENTRY, [{ url: "/a", label: "a", error: "nope" }]);
    expect(audit.averageScore).toBe(0);
    expect(audit.pagesScanned).toBe(0);
    expect(audit.worstPage).toBeUndefined();
    expect(audit.siteWide).toEqual([]);
  });
});
