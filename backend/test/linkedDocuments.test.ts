import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkPdfDocument, PdfFetchError } from "../src/services/documents/checkPdf.js";
import { inventoryDocuments } from "../src/services/documents/inventoryDocuments.js";
import {
  checkLinkedPdfs,
  documentUndecidedRows,
  LINKED_PDF_SAMPLE,
} from "../src/services/documents/linkedDocuments.js";
import { accessibilityReportSchema } from "../src/types/report.js";
import { scoreFindings } from "../src/services/merge/scoring.js";

// The sample check, run against two PDFs on disk (test/fixtures, written by
// make-pdfs.mjs): one with tags, a heading, a title and a language, one with
// none of them. They are served through a stand-in fetch, so no socket is
// opened and the test says exactly which addresses were asked for.

const here = path.dirname(fileURLToPath(import.meta.url));
const UNTAGGED = readFileSync(path.join(here, "fixtures/linked-untagged.pdf"));
const TAGGED = readFileSync(path.join(here, "fixtures/linked-tagged.pdf"));

const BASE = "https://council.example/forms";
const link = (href: string, text = "") => ({ href, text });

/** A fetch that serves from a table and records what it was asked for. */
function fakeFetch(routes: Record<string, () => Response>) {
  const asked: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    asked.push(url);
    const route = routes[url];
    return route ? route() : new Response("not found", { status: 404 });
  }) as typeof fetch;
  return { impl, asked };
}

const pdf = (bytes: Buffer) => () =>
  new Response(new Uint8Array(bytes), { status: 200, headers: { "content-type": "application/pdf" } });

const allow = async (url: string) => new URL(url);

describe("checkLinkedPdfs", () => {
  it("opens the first two PDFs on this site and reports what each holds", async () => {
    const { impl, asked } = fakeFetch({
      "https://council.example/untagged.pdf": pdf(UNTAGGED),
      "https://council.example/tagged.pdf": pdf(TAGGED),
    });
    const inv = await checkLinkedPdfs(
      inventoryDocuments(
        [link("/untagged.pdf", "Apply"), link("/tagged.pdf", "Guidance"), link("/third.pdf"), link("/fees.docx")],
        BASE
      ),
      { limit: LINKED_PDF_SAMPLE, guard: allow, fetchImpl: impl }
    );

    expect(asked.sort()).toEqual(["https://council.example/tagged.pdf", "https://council.example/untagged.pdf"]);
    expect(inv.pdfChecked).toBe(2);
    expect(inv.pdfNotChecked).toBe(1);
    expect(inv.pdfWithFaults).toBe(1);

    const [untagged, tagged, third, office] = inv.items;
    expect(untagged.status).toBe("checked");
    expect(untagged.reason).toBeUndefined();
    expect(untagged.check?.tagged).toBe(false);
    expect(untagged.check?.findings.map((f) => f.ruleId).sort()).toEqual([
      "pdf-no-language",
      "pdf-no-title",
      "pdf-not-tagged",
    ]);

    // The positive control: a document built properly comes back clean, so
    // the check is not simply flagging whatever it is handed.
    expect(tagged.status).toBe("checked");
    expect(tagged.check).toMatchObject({ tagged: true, title: "Application form", pages: 1, pagesRead: 1 });
    expect(tagged.check?.findings).toEqual([]);

    expect([third.status, third.reason]).toEqual(["not-checked", "beyond-sample"]);
    expect([office.status, office.reason]).toEqual(["not-checked", "office-file"]);
  });

  it("never opens a document on another site, or an office file", async () => {
    const { impl, asked } = fakeFetch({});
    const inv = await checkLinkedPdfs(
      inventoryDocuments([link("https://elsewhere.example/a.pdf"), link("/b.docx"), link("/c.xlsx")], BASE),
      { limit: LINKED_PDF_SAMPLE, guard: allow, fetchImpl: impl }
    );
    expect(asked).toEqual([]);
    expect(inv.pdfChecked).toBe(0);
    expect(inv.items.map((i) => i.reason)).toEqual(["other-site", "office-file", "office-file"]);
  });

  it("puts every address through the guard before fetching it, redirects included", async () => {
    const { impl, asked } = fakeFetch({
      "https://council.example/moved.pdf": () =>
        new Response(null, { status: 302, headers: { location: "https://files.council.example/real.pdf" } }),
      "https://files.council.example/real.pdf": pdf(TAGGED),
    });
    const guarded: string[] = [];
    const inv = await checkLinkedPdfs(inventoryDocuments([link("/moved.pdf")], BASE), {
      limit: 1,
      guard: async (url) => {
        guarded.push(url);
        // Recorded before the fetch of the same address, or the guard would
        // be checking a door already walked through.
        expect(asked).not.toContain(url);
        return new URL(url);
      },
      fetchImpl: impl,
    });
    expect(guarded).toEqual(["https://council.example/moved.pdf", "https://files.council.example/real.pdf"]);
    expect(inv.items[0].status).toBe("checked");
  });

  it("does not follow a redirect the guard refuses", async () => {
    // The case the guard is there for: a public page links to its own PDF,
    // which answers with a redirect into the scanner's private network.
    const { impl, asked } = fakeFetch({
      "https://council.example/innocent.pdf": () =>
        new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data/" } }),
      "http://169.254.169.254/latest/meta-data/": pdf(TAGGED),
    });
    const inv = await checkLinkedPdfs(inventoryDocuments([link("/innocent.pdf")], BASE), {
      limit: 1,
      guard: async (url) => {
        if (url.includes("169.254.")) throw new Error("refused");
        return new URL(url);
      },
      fetchImpl: impl,
    });
    expect(asked).toEqual(["https://council.example/innocent.pdf"]);
    expect([inv.items[0].status, inv.items[0].reason]).toEqual(["not-checked", "could-not-open"]);
    expect(inv.items[0].check).toBeUndefined();
  });

  it("reports a file that will not open as not opened, and still resolves", async () => {
    const { impl } = fakeFetch({
      "https://council.example/page.pdf": () => new Response("<html>Sign in</html>", { status: 200 }),
    });
    const inv = await checkLinkedPdfs(inventoryDocuments([link("/gone.pdf"), link("/page.pdf")], BASE), {
      limit: 2,
      guard: allow,
      fetchImpl: impl,
    });
    expect(inv.items.map((i) => i.reason)).toEqual(["could-not-open", "could-not-open"]);
    expect(inv.pdfChecked).toBe(0);
    expect(inv.pdfWithFaults).toBe(0);
  });

  it("stops at its time allowance and says the time ran out, not that the file is broken", async () => {
    const hanging = ((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as typeof fetch;
    const started = Date.now();
    const inv = await checkLinkedPdfs(inventoryDocuments([link("/slow.pdf"), link("/slower.pdf")], BASE), {
      limit: 2,
      budgetMs: 60,
      guard: allow,
      fetchImpl: hanging,
    });
    expect(Date.now() - started).toBeLessThan(2000);
    expect(inv.items.map((i) => [i.status, i.reason])).toEqual([
      ["not-checked", "out-of-time"],
      ["not-checked", "out-of-time"],
    ]);
  });

  it("opens nothing when told the page sits behind a login or in a site audit", async () => {
    const { impl, asked } = fakeFetch({ "https://council.example/a.pdf": pdf(TAGGED) });
    const inventory = inventoryDocuments([link("/a.pdf"), link("https://elsewhere.example/b.pdf")], BASE);
    const login = await checkLinkedPdfs(inventory, { limit: 2, guard: allow, fetchImpl: impl, skip: "behind-login" });
    const audit = await checkLinkedPdfs(inventory, { limit: 2, guard: allow, fetchImpl: impl, skip: "site-audit" });
    expect(asked).toEqual([]);
    expect(login.items.map((i) => i.reason)).toEqual(["behind-login", "other-site"]);
    expect(audit.items.map((i) => i.reason)).toEqual(["site-audit", "other-site"]);
  });

  it("leaves the inventory it was given untouched", async () => {
    const { impl } = fakeFetch({ "https://council.example/a.pdf": pdf(UNTAGGED) });
    const before = inventoryDocuments([link("/a.pdf")], BASE);
    const after = await checkLinkedPdfs(before, { limit: 1, guard: allow, fetchImpl: impl });
    expect(before.items[0].status).toBe("not-checked");
    expect(after.items[0].status).toBe("checked");
  });
});

describe("a linked document and the page's score", () => {
  it("keeps the document's faults on the document", async () => {
    const { impl } = fakeFetch({ "https://council.example/untagged.pdf": pdf(UNTAGGED) });
    const documents = await checkLinkedPdfs(inventoryDocuments([link("/untagged.pdf")], BASE), {
      limit: 1,
      guard: allow,
      fetchImpl: impl,
    });
    const faults = documents.items[0].check!.findings;
    // Real faults, and scored as such when the PDF is itself what is scanned.
    expect(faults.length).toBeGreaterThan(0);
    expect(scoreFindings(faults)).toBeLessThan(100);

    // On a page report they ride on the inventory. The schema has one place
    // for them, and it is not `findings`.
    const report = accessibilityReportSchema.parse({
      url: BASE,
      scannedAt: new Date().toISOString(),
      score: scoreFindings([]),
      summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
      categorySummary: { accessibility: 0, designClarity: 0, darkPattern: 0 },
      findings: [],
      documents,
      undecidedChecks: documentUndecidedRows(documents),
      meta: { axeVersion: "test", renderTimeMs: 0, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
    });
    expect(report.score).toBe(100);
    expect(report.findings).toEqual([]);
    expect(report.documents?.pdfWithFaults).toBe(1);
  });

  it("still parses a report stored before the field existed", () => {
    const stored = {
      url: BASE,
      scannedAt: new Date().toISOString(),
      score: 80,
      summary: { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
      categorySummary: { accessibility: 0, designClarity: 0, darkPattern: 0 },
      findings: [],
      meta: { axeVersion: "4", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
    };
    expect(accessibilityReportSchema.safeParse(stored).success).toBe(true);
  });
});

describe("documentUndecidedRows", () => {
  it("says how many PDFs were opened and how many were not, with the reasons", async () => {
    const { impl } = fakeFetch({
      "https://council.example/1.pdf": pdf(TAGGED),
      "https://council.example/2.pdf": pdf(TAGGED),
    });
    const documents = await checkLinkedPdfs(
      inventoryDocuments(
        [link("/1.pdf"), link("/2.pdf"), link("/3.pdf"), link("/4.pdf"), link("https://elsewhere.example/5.pdf")],
        BASE
      ),
      { limit: 2, guard: allow, fetchImpl: impl }
    );
    const rows = documentUndecidedRows(documents);
    expect(rows).toHaveLength(1);
    expect(rows[0].ruleId).toBe("pdf-linked-not-checked");
    expect(rows[0].count).toBe(3);
    expect(rows[0].help).toBe(
      "This page links to 5 PDF documents. The scan opened 2 and did not open 3: 2 come after the first 2, which is all a page scan opens; 1 is on another site."
    );
  });

  it("names the faults found in the PDFs it opened, as the document's", async () => {
    const { impl } = fakeFetch({
      "https://council.example/a.pdf": pdf(UNTAGGED),
      "https://council.example/b.pdf": pdf(UNTAGGED),
    });
    const documents = await checkLinkedPdfs(inventoryDocuments([link("/a.pdf"), link("/b.pdf")], BASE), {
      limit: 2,
      guard: allow,
      fetchImpl: impl,
    });
    const rows = documentUndecidedRows(documents);
    // Both opened, so there is no not-checked row to write.
    expect(rows.map((r) => r.ruleId)).toEqual(["pdf-linked-faults"]);
    expect(rows[0].count).toBe(2);
    expect(rows[0].help).toBe(
      "The scan opened 2 linked PDF documents and 2 have faults: no tags (2), no title (2), no language set (2). They are the document's faults and are not in this page's score."
    );
  });

  it("says office files are counted and never opened", () => {
    const rows = documentUndecidedRows(inventoryDocuments([link("/a.docx"), link("/b.xlsx"), link("/c.pptx")], BASE));
    expect(rows).toEqual([
      {
        ruleId: "office-linked-not-checked",
        count: 3,
        help: "This page links to 3 Word, Excel or PowerPoint files. The scan counts these and does not open them.",
      },
    ]);
  });

  it("says a site audit opened none", async () => {
    const documents = await checkLinkedPdfs(inventoryDocuments([link("/a.pdf")], BASE), {
      limit: 2,
      skip: "site-audit",
    });
    expect(documentUndecidedRows(documents)[0].help).toBe(
      "This page links to 1 PDF document. The scan opened 0 and did not open 1: 1 is on this site, and a site audit counts documents without opening them."
    );
  });

  it("says when the page had more links than were read", () => {
    const rows = documentUndecidedRows(inventoryDocuments([link("/a.pdf"), link("/b.docx")], BASE, 120));
    expect(rows[0].help).toMatch(/not the 120 after them, so this counts the first 300 only\.$/);
    // Once, on the first row.
    expect(rows[1].help).not.toMatch(/first 300/);
  });

  it("adds nothing to a page that links to no documents", () => {
    expect(documentUndecidedRows(inventoryDocuments([link("/contact")], BASE))).toEqual([]);
    expect(documentUndecidedRows(undefined)).toEqual([]);
  });

  it("writes no long dashes, which the report never shows", async () => {
    const documents = inventoryDocuments([link("/a.pdf"), link("/b.docx")], BASE, 5);
    for (const row of documentUndecidedRows(documents)) expect(row.help).not.toMatch(/[—–]/);
  });
});

describe("checkPdfDocument limits", () => {
  it("refuses a file over the size it was given, from the declared length", async () => {
    const { impl } = fakeFetch({
      "https://council.example/big.pdf": () =>
        new Response(new Uint8Array(TAGGED), { status: 200, headers: { "content-length": "999999999" } }),
    });
    await expect(
      checkPdfDocument("https://council.example/big.pdf", { fetchImpl: impl, maxBytes: 1024 * 1024 })
    ).rejects.toThrow(/too large for this check \(over 1MB\)/);
  });

  it("refuses a file over the size it was given when the server declared nothing", async () => {
    const { impl } = fakeFetch({ "https://council.example/big.pdf": pdf(TAGGED) });
    await expect(
      checkPdfDocument("https://council.example/big.pdf", { fetchImpl: impl, maxBytes: 100 })
    ).rejects.toBeInstanceOf(PdfFetchError);
  });

  it("reads a fixture the same way with no options at all", async () => {
    const { impl } = fakeFetch({ "https://council.example/t.pdf": pdf(TAGGED) });
    const r = await checkPdfDocument("https://council.example/t.pdf", { fetchImpl: impl });
    expect(r).toMatchObject({ tagged: true, pageCount: 1, pagesRead: 1, findings: [] });
  });

  it("can be stopped while it is reading, and says the time ran out", async () => {
    // Stopped a tick after the response arrives, so the stop lands on the
    // body or on the reading of it. An untagged file is the dangerous one to
    // stop on: a read torn down part-way looks like "no tags" unless the
    // signal is checked, and that would be a verdict nobody reached.
    const controller = new AbortController();
    const impl = (async () => {
      setTimeout(() => controller.abort(), 0);
      return new Response(new Uint8Array(UNTAGGED), { status: 200 });
    }) as typeof fetch;
    const outcome = await checkPdfDocument("https://council.example/t.pdf", {
      fetchImpl: impl,
      signal: controller.signal,
    }).then(
      (r) => r,
      (e) => e
    );
    // Either it finished before the stop, with the whole verdict, or it was
    // stopped and says so. Never a partial verdict.
    if (outcome instanceof Error) {
      expect(outcome).toBeInstanceOf(PdfFetchError);
      expect((outcome as PdfFetchError).timedOut).toBe(true);
    } else {
      expect(outcome.findings.map((f: { ruleId?: string }) => f.ruleId)).toContain("pdf-not-tagged");
      expect(outcome.pagesRead).toBe(1);
    }
    // Let a torn-down read settle inside this test, where an unhandled
    // rejection would fail it.
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  it("does not turn a check cut short into a verdict on the document", async () => {
    const controller = new AbortController();
    controller.abort();
    const { impl } = fakeFetch({ "https://council.example/t.pdf": pdf(UNTAGGED) });
    const err = await checkPdfDocument("https://council.example/t.pdf", {
      fetchImpl: impl,
      signal: controller.signal,
    }).catch((e) => e);
    expect(err).toBeInstanceOf(PdfFetchError);
    expect((err as PdfFetchError).timedOut).toBe(true);
  });
});
