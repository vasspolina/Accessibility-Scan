import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { scanUrlToReport } from "../src/services/scanPipeline.js";
import { scoreFindings } from "../src/services/merge/scoring.js";

// The whole path, in a real browser: a page is rendered, its links are read,
// two of its PDFs are downloaded and checked, and the report comes back.
//
// The unit tests beside this one prove each half. This proves the join, and
// the one claim that cannot be made from the halves: that a page linking to
// a broken PDF scores exactly what the same page scores without it.
//
// Served from a local port, so it needs a browser and a socket and runs in
// CI and a terminal, not in a sandbox that allows neither. The private-host
// trust is the CLI's, passed here for the same reason the CLI has it: the
// address is this machine's own.

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) => readFileSync(path.join(here, "fixtures", name));

const page = (links: string) => `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><title>Planning forms</title></head>
  <body>
    <main>
      <h1>Planning forms</h1>
      <p>Everything you need to apply.</p>
      ${links}
    </main>
  </body>
</html>`;

const LINKS = `<ul>
  <li><a href="/files/untagged.pdf">Application form</a></li>
  <li><a href="/files/tagged.pdf">Guidance notes</a></li>
  <li><a href="/files/third.pdf">Fees</a></li>
  <li><a href="/files/untagged.pdf#page=2">Application form, section 2</a></li>
  <li><a href="/files/budget.xlsx">Budget</a></li>
  <li><a href="https://elsewhere.example/law.pdf">The regulation</a></li>
</ul>`;

let server: Server;
let origin: string;
const requested: string[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    requested.push(req.url ?? "");
    const pdf = (name: string) => {
      res.writeHead(200, { "content-type": "application/pdf" });
      res.end(fixture(name));
    };
    if (req.url === "/with-documents") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(page(LINKS));
    } else if (req.url === "/without-documents") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      // The same list with the same words, pointing at pages, so the two
      // pages differ in what they link to and in nothing a rule measures.
      res.end(page(LINKS.replace(/\.(pdf|xlsx)/g, "")));
    } else if (req.url === "/files/untagged.pdf") pdf("linked-untagged.pdf");
    else if (req.url === "/files/tagged.pdf") pdf("linked-tagged.pdf");
    else if (req.url === "/files/third.pdf") pdf("linked-untagged.pdf");
    else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

describe("a page scan and the documents it links to (real browser)", () => {
  it("counts them, opens two PDFs, and scores the page as if they were not there", async () => {
    const scan = (pathname: string) => scanUrlToReport(`${origin}${pathname}`, false, undefined, false, undefined, true);
    const withDocs = await scan("/with-documents");
    const without = await scan("/without-documents");

    const documents = withDocs.documents!;
    expect(documents.counts).toEqual({ pdf: 4, word: 0, excel: 1, powerpoint: 0 });
    expect(documents.total).toBe(5);
    expect(documents.otherSites).toBe(1);
    expect(documents.pdfChecked).toBe(2);
    expect(documents.pdfNotChecked).toBe(2);
    expect(documents.pdfWithFaults).toBe(1);

    const byPath = (suffix: string) => documents.items.find((i) => i.url.endsWith(suffix))!;
    // Two links, one document.
    expect(byPath("/files/untagged.pdf").links).toBe(2);
    expect(byPath("/files/untagged.pdf").check?.findings.map((f) => f.ruleId)).toContain("pdf-not-tagged");
    expect(byPath("/files/tagged.pdf").check?.findings).toEqual([]);
    expect(byPath("/files/third.pdf").reason).toBe("beyond-sample");
    expect(byPath("/law.pdf").reason).toBe("other-site");
    expect(byPath("/files/budget.xlsx").reason).toBe("office-file");

    // Only the two sampled files were asked for, and the third never was.
    expect(requested.filter((r) => r.startsWith("/files/")).sort()).toEqual([
      "/files/tagged.pdf",
      "/files/untagged.pdf",
    ]);

    // The score. The untagged PDF carries a critical fault of its own, and
    // none of it is on the page: no pdf- rule among the findings, the score
    // is what the page's own findings give, and it is the score of the same
    // page with no documents on it.
    expect(withDocs.findings.some((f) => f.ruleId?.startsWith("pdf-"))).toBe(false);
    expect(withDocs.score).toBe(scoreFindings(withDocs.findings));
    expect(withDocs.score).toBe(without.score);
    expect(withDocs.summary).toEqual(without.summary);

    // And the report says so, in the list that is never scored.
    const rows = Object.fromEntries((withDocs.undecidedChecks ?? []).map((r) => [r.ruleId, r]));
    expect(rows["pdf-linked-not-checked"].count).toBe(2);
    expect(rows["pdf-linked-not-checked"].help).toContain("The scan opened 2 and did not open 2");
    expect(rows["pdf-linked-faults"].count).toBe(1);
    expect(rows["office-linked-not-checked"].count).toBe(1);

    expect(without.documents).toBeUndefined();
    expect((without.undecidedChecks ?? []).some((r) => /linked/.test(r.ruleId))).toBe(false);
  }, 180_000);

  it("counts and opens nothing when it is one page of a site audit", async () => {
    requested.length = 0;
    const report = await scanUrlToReport(
      `${origin}/with-documents`,
      false,
      undefined,
      false,
      undefined,
      true,
      undefined,
      "count-for-site-audit"
    );
    expect(report.documents?.total).toBe(5);
    expect(report.documents?.pdfChecked).toBe(0);
    expect(requested.some((r) => r.startsWith("/files/"))).toBe(false);
    expect(report.documents?.items.filter((i) => i.reason === "site-audit")).toHaveLength(3);
  }, 120_000);
});
