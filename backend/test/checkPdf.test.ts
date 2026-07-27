import { describe, it, expect } from "vitest";
import { checkPdfDocument, PdfFetchError } from "../src/services/documents/checkPdf.js";

// These hit the network on purpose. The value of this checker is entirely in
// what it concludes about real documents, and a mocked PDF would only prove the
// mock was shaped the way I imagined.
const UNTAGGED = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";
// Fittingly, the EU accessibility standard is itself an accessible document.
const TAGGED = "https://www.etsi.org/deliver/etsi_en/301500_301599/301549/03.02.01_60/en_301549v030201p.pdf";

describe("checkPdfDocument", () => {
  it("catches the failure that matters most, an untagged document", async () => {
    const r = await checkPdfDocument(UNTAGGED);
    expect(r.tagged).toBe(false);
    const rules = r.findings.map((f) => f.ruleId);
    expect(rules).toContain("pdf-not-tagged");
    // Untagged is a critical failure: without tags there is no reading order.
    expect(r.findings.find((f) => f.ruleId === "pdf-not-tagged")!.severity).toBe("critical");
  }, 60_000);

  it("reports a missing title and language separately from the tagging", async () => {
    const rules = (await checkPdfDocument(UNTAGGED)).findings.map((f) => f.ruleId);
    expect(rules).toContain("pdf-no-title");
    expect(rules).toContain("pdf-no-language");
  }, 60_000);

  // The positive control. Without this the checker could simply be flagging
  // everything and still look right.
  it("finds nothing wrong with a properly built document", async () => {
    const r = await checkPdfDocument(TAGGED);
    expect(r.tagged).toBe(true);
    expect(r.title).toBeTruthy();
    expect(r.findings).toEqual([]);
  }, 90_000);

  it("ties every finding to the criterion it fails", async () => {
    for (const f of (await checkPdfDocument(UNTAGGED)).findings) {
      expect(f.wcagCriterion, f.ruleId).toMatch(/^\d\.\d{1,2}\.\d{1,2}$/);
      expect(f.wcagLevel, f.ruleId).toMatch(/^A|AA$/);
      expect(f.helpUrl, f.ruleId).toMatch(/^https:\/\//);
      expect(f.suggestedFix.length, f.ruleId).toBeGreaterThan(30);
    }
  }, 60_000);

  it("says so plainly when the file cannot be fetched", async () => {
    await expect(checkPdfDocument("https://www.w3.org/nothing-here-at-all.pdf")).rejects.toBeInstanceOf(
      PdfFetchError
    );
  }, 30_000);

  it("says so plainly when the file is not a PDF", async () => {
    await expect(checkPdfDocument("https://www.w3.org/")).rejects.toBeInstanceOf(PdfFetchError);
  }, 30_000);
});
