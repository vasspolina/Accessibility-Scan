import { describe, it, expect } from "vitest";
import type { AccessibilityFinding, AccessibilityReport, SiteAudit } from "../src/api/scanClient";
import { stepResult } from "../src/components/ScanChat";
import { digestAudit, digestReport } from "../src/lib/reportDigest";

/**
 * What the conversation says about a scan, held to the report's own rules:
 * never more than the scan proves, and every check that did not run
 * declared. The prompt asks the model to be honest; these hold the parts
 * the widget writes itself, and what it hands the model, to it.
 */

let n = 0;
function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: `f${n++}`,
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: `#el${n}`,
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

function report(findings: AccessibilityFinding[], meta: Partial<AccessibilityReport["meta"]> = {}, extra: Partial<AccessibilityReport> = {}): AccessibilityReport {
  return {
    url: "https://example.com/",
    scannedAt: "2026-10-06T00:00:00.000Z",
    score: 70,
    summary: { critical: 0, serious: findings.length, moderate: 0, minor: 0, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    meta: { axeVersion: "1", renderTimeMs: 24_000, aiReviewTimeMs: 0, aiReviewStatus: "completed", ...meta },
    ...extra,
  };
}

describe("the scan's step lines", () => {
  it("say a check did not finish, never that it found nothing", () => {
    const r = report([], { incompleteChecks: ["keyboard navigation", "phone-width contrast"] });
    expect(stepResult("keyboard", r)).toBe("Did not finish");
    expect(stepResult("phone", r)).toBe("Did not finish");
    expect(stepResult("text-resize", r)).toBe("Nothing found");
  });

  it("keep a count beside an unfinished check", () => {
    const r = report([finding({ ruleId: "keyboard-focus-not-visible" })], { incompleteChecks: ["keyboard navigation"] });
    expect(stepResult("keyboard", r)).toBe("1 found · Did not finish");
  });

  it("count phone-width contrast on the phone line", () => {
    expect(stepResult("phone", report([finding({ ruleId: "color-contrast-mobile" })]))).toBe("1 found");
  });

  it("count the cookie banner's focus failure on the keyboard line, and static dialog rules on the rules line", () => {
    const r = report([finding({ ruleId: "consent-blocks-reader" }), finding({ ruleId: "dialog-no-close" })]);
    expect(stepResult("keyboard", r)).toBe("1 found");
    expect(stepResult("rules", r)).toBe("1 found");
  });

  it("count each finding on one line only", () => {
    const r = report([
      finding({ ruleId: "image-alt" }),
      finding({ ruleId: "keyboard-focus-not-visible" }),
      finding({ ruleId: "text-zoom-clipped" }),
      finding({ ruleId: "mobile-horizontal-scroll" }),
    ]);
    const lines = ["rules", "keyboard", "text-resize", "phone"].map((s) => stepResult(s, r));
    expect(lines).toEqual(["1 found", "1 found", "1 found", "1 found"]);
  });

  it("say the AI review did not run when it was asked for and skipped", () => {
    for (const status of ["skipped_no_key", "skipped_timeout", "skipped_error"] as const) {
      expect(stepResult("ai-review", report([], { aiReviewStatus: status }))).toBe("Did not run");
    }
    expect(stepResult("ai-review", report([], { aiReviewStatus: "disabled_by_request" }))).toBeNull();
  });

  it("give the page's own load time, not the whole scan's", () => {
    expect(stepResult("load", report([], { renderPhaseMs: { goto: 1500, subresources: 700, axe: 9000 } }))).toBe("2.2s");
    // An older report without the phases shows no figure rather than 24s.
    expect(stepResult("load", report([]))).toBeNull();
  });

  it("say an empty screen-reader walk that failed did not finish", () => {
    const r = report([], { incompleteChecks: ["screen reader names"] }, { screenReaderScript: { lines: [], truncated: false } });
    expect(stepResult("screen-reader", r)).toBe("Did not finish");
  });
});

describe("what the assistant is given", () => {
  it("says a PDF had no AI review and what its check covers", () => {
    const d = digestReport(report([], { documentKind: "pdf", documentPages: 3, aiReviewStatus: "disabled_by_request" }));
    expect(d.aiReview).toMatch(/not run/);
    expect(d.document?.checked).toMatch(/first 10 pages/);
  });

  it("says why the AI review did not run", () => {
    expect(digestReport(report([], { aiReviewStatus: "skipped_no_key" })).aiReview).toMatch(/did not run/);
  });

  it("drops the level from a finding with no criterion", () => {
    const d = digestReport(report([finding({ ruleId: "mobile-horizontal-scroll-390", category: "design-clarity", wcagCriterion: "N/A", wcagLevel: "AA" })]));
    expect(d.notesOnTheDesign[0].level).toBeUndefined();
  });

  it("carries what the owner marked", () => {
    const triage = { state: "false-positive" as const, note: null, decidedBy: "a", decidedAt: "b" };
    const d = digestReport(report([finding({ ruleId: "image-alt", triage }), finding({ ruleId: "image-alt" })]));
    expect(d.whatPeopleCantUse[0].ownerMarked).toEqual({ "False positive": 1 });
  });

  it("marks a failing criterion only the AI review found", () => {
    const findings = [
      finding({ ruleId: "ai-vague-link", source: "ai-review", wcagCriterion: "2.4.4" }),
      finding({ ruleId: "image-alt", wcagCriterion: "1.1.1" }),
    ];
    const criteria = [
      { id: "2.4.4", name: "Link Purpose", level: "A", status: "failed", findingCount: 1 },
      { id: "1.1.1", name: "Non-text Content", level: "A", status: "failed", findingCount: 1 },
      { id: "1.4.10", name: "Reflow", level: "AA", status: "not-measured", findingCount: 0, notMeasured: ["320px reflow"] },
    ];
    const conformance = { standard: "WCAG 2.1 AA", failed: 2, noIssuesFound: 0, needsReview: 0, total: 3, failedByLevel: { A: 2, AA: 0 }, criteria };
    const d = digestReport(report(findings, {}, { conformance } as unknown as Partial<AccessibilityReport>));
    expect(d.conformance?.failingCriteria.find((c) => c.id === "2.4.4")?.onlyFromAiReview).toBe(true);
    expect(d.conformance?.failingCriteria.find((c) => c.id === "1.1.1")?.onlyFromAiReview).toBeUndefined();
    expect(d.conformance?.notMeasured).toEqual([{ id: "1.4.10", why: ["320px reflow"] }]);
  });

  it("does not pass a page that failed to load off as a clean one, and says the audit had no AI review", () => {
    const conformance = { standard: "WCAG 2.1 AA", failed: 0, noIssuesFound: 0, needsReview: 0, total: 0, failedByLevel: { A: 0, AA: 0 }, criteria: [] };
    const audit = {
      entryUrl: "https://example.com/",
      scannedAt: "2026-10-06T00:00:00.000Z",
      pagesScanned: 1,
      pagesFailed: 1,
      averageScore: 80,
      pages: [
        { url: "https://example.com/", score: 80, findingCount: 2 },
        { url: "https://example.com/broken", score: 0, findingCount: 0, error: "Timed out" },
      ],
      siteWide: [],
      conformance,
      incompleteChecks: ["text resizing"],
    } as unknown as SiteAudit;
    const d = digestAudit(audit);
    expect(d.pages[1]).toEqual({ url: "https://example.com/broken", notScanned: "Timed out" });
    expect(d.aiReview).toMatch(/never includes the AI review/);
    expect(d.checksThatDidNotFinish).toEqual(["text resizing"]);
  });
});
