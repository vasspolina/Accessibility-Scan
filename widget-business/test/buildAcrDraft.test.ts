import { describe, it, expect } from "vitest";
import { buildAcrDraft } from "../src/lib/buildAcrDraft";
import type { AccessibilityFinding, ConformanceSummary, CriterionResult } from "../src/api/scanClient";

const criterion = (o: Partial<CriterionResult>): CriterionResult => ({
  id: "1.1.1",
  name: "Non-text Content",
  level: "A",
  coverage: "automated",
  plain: "Do images have a description?",
  failing: "Images are missing a description",
  status: "no-issues-found",
  findingCount: 0,
  ...o,
});

const conformance = (criteria: CriterionResult[]): ConformanceSummary => ({
  standard: "WCAG 2.1 Level AA (EN 301 549)",
  failed: criteria.filter((c) => c.status === "failed").length,
  noIssuesFound: criteria.filter((c) => c.status === "no-issues-found").length,
  needsReview: criteria.filter((c) => c.status === "needs-review").length,
  total: criteria.length,
  failedByLevel: { A: 0, AA: 0 },
  criteria,
});

const finding = (o: Partial<AccessibilityFinding>): AccessibilityFinding => ({
  id: "x",
  source: "automated",
  severity: "serious",
  category: "accessibility",
  selector: "img",
  description: "d",
  suggestedFix: "f",
  ...o,
});

const draft = (criteria: CriterionResult[], findings: AccessibilityFinding[] = []) =>
  buildAcrDraft({
    productName: "Acme Shop",
    productVersion: "2026.1",
    contact: "access@acme.test",
    siteUrl: "https://acme.test",
    date: "1 July 2026",
    conformance: conformance(criteria),
    findings,
  });

describe("the ACR draft", () => {
  // The whole reason this is a draft. VPAT 2.5 has four conformance levels and
  // "Not Evaluated" is not one of them, so anything a scan cannot evidence has
  // to stay blank rather than be filled with a claim.
  it("never claims Supports for any criterion", () => {
    const text = draft([
      criterion({ status: "no-issues-found" }),
      criterion({ id: "1.2.2", level: "A", coverage: "manual", status: "needs-review" }),
      criterion({ id: "1.4.3", level: "AA", status: "failed", findingCount: 3 }),
    ]);
    // The Terms section defines the word; no table row may use it as a verdict.
    const rows = text.split("\n").filter((l) => l.startsWith("| 1."));
    for (const row of rows) {
      expect(row, row).not.toMatch(/\|\s*(Partially )?Supports\s*\|/i);
    }
  });

  it("marks an evidenced failure as Does Not Support", () => {
    const text = draft([criterion({ id: "1.4.3", level: "AA", status: "failed", findingCount: 2 })]);
    expect(text).toMatch(/\| 1\.4\.3 [^|]*\| Does Not Support \|/);
  });

  it("leaves the conformance level blank for anything it could not evidence", () => {
    const text = draft([criterion({ status: "no-issues-found" })]);
    expect(text).toMatch(/\| 1\.1\.1 [^|]*\|\s*\|/);
  });

  it("says plainly that a clean automated result is not conformance", () => {
    expect(draft([criterion({ status: "no-issues-found" })])).toMatch(
      /not evidence of conformance/i
    );
  });

  it("distinguishes what software cannot judge from what it checked", () => {
    const text = draft([criterion({ id: "1.2.2", coverage: "manual", status: "needs-review" })]);
    expect(text).toMatch(/cannot be evaluated by software/i);
  });

  // An evaluator wants the fault and how widespread it is, not one row per
  // occurrence.
  it("summarises the real findings against the criterion that failed", () => {
    const text = draft(
      [criterion({ id: "1.1.1", status: "failed", findingCount: 4 })],
      [
        finding({ wcagCriterion: "1.1.1", ruleId: "image-alt", title: "Images have no description" }),
        finding({ wcagCriterion: "1.1.1", ruleId: "image-alt", title: "Images have no description" }),
        finding({ wcagCriterion: "1.1.1", ruleId: "image-alt", title: "Images have no description" }),
      ]
    );
    // Plain language, not axe's "Images must have alternative text": this
    // document is read by a procurement team, not by the developer fixing it.
    expect(text).toMatch(/Images have no text description behind them\. \(3 instances\)|Images have no text description behind them \(3 instances\)/);
    expect(text).not.toMatch(/must have alternative text/i);
  });

  it("falls back to the finding's own title when a rule has no plain wording", () => {
    const text = draft(
      [criterion({ id: "1.1.1", status: "failed", findingCount: 1 })],
      [
        finding({
          wcagCriterion: "1.1.1",
          source: "ai-review",
          ruleId: undefined,
          title: "Photo caption is a camera filename",
        }),
      ]
    );
    expect(text).toMatch(/Photo caption is a camera filename/);
  });

  it("refuses to be mistaken for a finished document", () => {
    const text = draft([criterion({})]);
    expect(text).toMatch(/unfinished draft/i);
    expect(text).toMatch(/Do not publish/i);
    expect(text).toMatch(/qualified evaluator/i);
  });

  it("defines all four permitted terms, since a reader may not know them", () => {
    const text = draft([criterion({})]);
    for (const term of ["Supports", "Partially Supports", "Does Not Support", "Not Applicable"]) {
      expect(text).toContain(`**${term}:**`);
    }
  });

  it("is honest about what was actually tested", () => {
    const text = draft([criterion({})]);
    expect(text).toMatch(/none of manual testing.*carried out/i);
    expect(text).toMatch(/single page/i);
    expect(text).toMatch(/Chapter 9/);
  });

  it("carries the header fields a VPAT requires", () => {
    const text = draft([criterion({})]);
    expect(text).toMatch(/Acme Shop 2026\.1/);
    expect(text).toMatch(/Report Date:\*\* 1 July 2026/);
    expect(text).toMatch(/access@acme\.test/);
    expect(text).toMatch(/Evaluation Methods Used/);
  });

  it("separates Level A and Level AA into their own tables", () => {
    const text = draft([
      criterion({ id: "1.1.1", level: "A" }),
      criterion({ id: "1.4.3", level: "AA" }),
    ]);
    const tableA = text.slice(text.indexOf("Table 1"), text.indexOf("Table 2"));
    expect(tableA).toContain("1.1.1");
    expect(tableA).not.toContain("1.4.3");
  });
});
