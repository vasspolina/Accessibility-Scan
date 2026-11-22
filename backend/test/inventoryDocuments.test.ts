import { describe, it, expect } from "vitest";
import { documentsLine, inventoryDocuments } from "../src/services/documents/inventoryDocuments.js";

// The inventory is the half of the linked-document work that opens nothing,
// so all of it is checked here without a browser or a network.

const BASE = "https://council.example/services/planning";
const link = (href: string, text = "") => ({ href, text });

describe("inventoryDocuments", () => {
  it("counts PDFs and office files by kind, and nothing else", () => {
    const inv = inventoryDocuments(
      [
        link("/forms/apply.pdf", "Application form"),
        link("/forms/guidance.PDF", "Guidance"),
        link("/forms/fees.docx", "Fees"),
        link("/forms/old-fees.doc", "Fees 2019"),
        link("/data/budget.xlsx", "Budget"),
        link("/data/budget-2019.xls", "Budget 2019"),
        link("/talks/plan.pptx", "Slides"),
        link("/talks/plan-2019.ppt", "Slides 2019"),
        link("/contact", "Contact"),
        link("/logo.png", ""),
        link("/archive.zip", "Everything"),
      ],
      BASE
    );
    expect(inv.counts).toEqual({ pdf: 2, word: 2, excel: 2, powerpoint: 2 });
    expect(inv.total).toBe(8);
  });

  it("counts one document once, however many links point at it", () => {
    const inv = inventoryDocuments(
      [
        link("/forms/apply.pdf", ""),
        link("https://council.example/forms/apply.pdf", "Application form"),
        link("apply.pdf#page=2", "Section 2"),
        link("../forms/apply.pdf", "Apply"),
      ],
      "https://council.example/forms/index"
    );
    expect(inv.total).toBe(1);
    expect(inv.items[0].links).toBe(4);
    // The first link was an image with no words; the entry takes the first
    // words it meets rather than staying nameless.
    expect(inv.items[0].text).toBe("Application form");
    expect(inv.items[0].url).toBe("https://council.example/forms/apply.pdf");
  });

  it("keeps the query, which can name a different file", () => {
    const inv = inventoryDocuments([link("/get.pdf?id=1"), link("/get.pdf?id=2")], BASE);
    expect(inv.total).toBe(2);
  });

  it("tells this site's documents from another's", () => {
    const inv = inventoryDocuments(
      [
        link("/forms/apply.pdf"),
        link("https://assets.council.example/forms/map.pdf"),
        link("https://www.gov.example/law.pdf"),
        link("http://council.example/forms/plain-http.pdf"),
      ],
      BASE
    );
    // Origin, not domain: a subdomain and a different scheme are both
    // another origin, and whether they are the owner's is for a person.
    expect(inv.items.map((i) => i.sameOrigin)).toEqual([true, false, false, false]);
    expect(inv.otherSites).toBe(3);
  });

  it("says why each one has not been opened, before anything is", () => {
    const inv = inventoryDocuments(
      [link("/a.pdf"), link("https://elsewhere.example/b.pdf"), link("/c.docx")],
      BASE
    );
    expect(inv.items.map((i) => [i.status, i.reason])).toEqual([
      ["not-checked", "beyond-sample"],
      ["not-checked", "other-site"],
      ["not-checked", "office-file"],
    ]);
    expect(inv.pdfChecked).toBe(0);
    expect(inv.pdfNotChecked).toBe(2);
    expect(inv.pdfWithFaults).toBe(0);
  });

  it("reads the kind from the path only", () => {
    const inv = inventoryDocuments(
      [
        // The extension is in the query, not the path: not counted, and the
        // module's comment says so.
        link("/download?file=apply.pdf"),
        // A page about PDFs is a page.
        link("/help/how-to-read.pdf.html"),
        link("/pdf"),
      ],
      BASE
    );
    expect(inv.total).toBe(0);
  });

  it("ignores links that are not web addresses, and survives bad ones", () => {
    const inv = inventoryDocuments(
      [link("ftp://council.example/a.pdf"), link("file:///etc/a.pdf"), link("http://[bad/a.pdf"), link("/ok.pdf")],
      BASE
    );
    expect(inv.items.map((i) => i.url)).toEqual(["https://council.example/ok.pdf"]);
  });

  it("returns an empty inventory for a base it cannot read", () => {
    expect(inventoryDocuments([link("/a.pdf")], "not a url").total).toBe(0);
  });

  it("carries how many links the render left unread, only when it left any", () => {
    expect(inventoryDocuments([link("/a.pdf")], BASE).linksNotRead).toBeUndefined();
    expect(inventoryDocuments([link("/a.pdf")], BASE, 0).linksNotRead).toBeUndefined();
    expect(inventoryDocuments([link("/a.pdf")], BASE, 512).linksNotRead).toBe(512);
  });
});

describe("documentsLine", () => {
  it("is one line of counts", () => {
    const inv = inventoryDocuments([link("/a.pdf"), link("/b.pdf"), link("/c.docx"), link("/d.xlsx")], BASE);
    expect(documentsLine(inv)).toBe(
      "documents: 2 PDF (0 opened, 0 with faults, 2 not opened) · 2 Word, Excel or PowerPoint (counted, never opened)"
    );
  });

  it("says nothing for a page that links to none", () => {
    expect(documentsLine(inventoryDocuments([link("/contact")], BASE))).toBeNull();
    expect(documentsLine(undefined)).toBeNull();
  });

  it("says when the count is a floor", () => {
    expect(documentsLine(inventoryDocuments([link("/a.pdf")], BASE, 40))).toMatch(/40 of the page's links not read$/);
  });
});
