import type { AccessibilityReport, DocumentInventory, LinkedDocument } from "../../types/report.js";
import { checkPdfDocument, PdfFetchError, type PdfCheckOptions, type PdfCheckResult } from "./checkPdf.js";
import { tallyDocuments } from "./inventoryDocuments.js";

// Opens a small sample of the PDFs a page links to, and words what the
// report says about all of them.
//
// The inventory (inventoryDocuments.ts) says what a page links to. This says
// what is inside two of them, because "this page links to 14 PDFs" leaves the
// owner where they started, and "two were opened and neither has tags" is
// something they can act on today.
//
// Three rules hold everything here together:
//
//   A linked document's faults are the document's. Nothing from this file
//   reaches the page's findings, its summary or its score. The results ride
//   on the inventory entry, and the report mentions them as rows of
//   undecidedChecks, the list that is never scored.
//
//   The addresses come from the scanned page, which is to say from whoever
//   wrote it. Each one, and every redirect it answers with, goes through the
//   same guard a scanned address does before a byte is requested. Only PDFs
//   on the page's own origin are opened at all: a file on another host may
//   be somebody else's, and scanning it is not ours to decide.
//
//   It never fails a scan and never holds one up past its allowance. A file
//   that will not download is reported as one that was not opened.

/** How many PDFs a page scan opens. */
export const LINKED_PDF_SAMPLE = 2;

// The whole sample's allowance, both files together, download and reading.
//
// Measured on 22 Nov 2026 from a laptop, with checkPdfDocument and this
// file's guard and size limit, three rounds each. First request, then the
// two after it:
//
//   w3.org test file, 13 KB, 1 page, untagged          77 ms, then 19 ms
//   etsi.org EN 301 549, 2.2 MB, 186 pages (10 read)  464 ms, then about 210
//   irs.gov form 1040, 215 KB, 2 pages                1201 ms, then about 260
//   the first two at once                              190 ms for the pair
//
// So the check is well under a second and the slowest first request was
// 1.2 s. Twelve seconds is ten times that: five for the shared CPU of the
// deployed service (the moma.org note in scanPipeline.ts measured the same
// render at eight seconds here and forty-six there) and two more for a
// document server slower than these three. Whole page scans the same day,
// with the sample and then without: 14.3 s and 14.1 s on an etsi.org page
// (two PDFs opened), 16.5 s and 14.5 s on irs.gov/forms-instructions (two
// opened). A gov.uk page where nothing was opened differed by 0.7 s between
// its two runs, so most of that is what two scans of one page differ by
// anyway. With the AI review on, the sample runs beside it.
export const LINKED_PDF_BUDGET_MS = 12_000;

// Smaller than the 20 MB of a direct check. That limit is for a document a
// person chose to scan; this is for two the page happened to link to, held
// in memory at once, beside a browser.
//
// What reading costs, measured the same day with --expose-gc, resident
// memory before and after pairs of checks: reading two copies of the 13 KB
// file raised it by 57 MB, the 215 KB form by about 110 MB, and the 2.2 MB
// standard by 193 MB. Ten more pairs raised none of them further, so it is
// a high-water mark the process keeps and not a leak, and it is set by what
// is in the file more than by its size. A file over this limit is reported
// as not opened.
export const LINKED_PDF_MAX_BYTES = 10 * 1024 * 1024;

export interface LinkedPdfOptions {
  /** How many same-origin PDFs to open. Zero opens none. */
  limit: number;
  budgetMs?: number;
  /** See PdfCheckOptions.guard. Absent only for the CLI's local trust. */
  guard?: PdfCheckOptions["guard"];
  /**
   * Why nothing is opened, when the caller has decided that already: the
   * page was scanned signed in, or this is one page of a site audit.
   */
  skip?: Extract<NonNullable<LinkedDocument["reason"]>, "behind-login" | "site-audit">;
  /** Swapped in by tests. */
  check?: (url: string, options: PdfCheckOptions) => Promise<PdfCheckResult>;
  fetchImpl?: typeof fetch;
}

/**
 * The inventory again, with up to `limit` same-origin PDFs opened.
 *
 * The first ones in the page's own order, so the same page gives the same
 * sample twice and the choice needs no explaining. Resolves always.
 */
export async function checkLinkedPdfs(
  inventory: DocumentInventory,
  options: LinkedPdfOptions
): Promise<DocumentInventory> {
  const items = inventory.items.map((item) => ({ ...item }));
  const candidates = items.filter((i) => i.kind === "pdf" && i.sameOrigin);

  if (options.skip) {
    for (const item of candidates) item.reason = options.skip;
    return tallyDocuments(items, inventory.linksNotRead);
  }

  const sample = candidates.slice(0, Math.max(0, options.limit));
  if (sample.length === 0) return tallyDocuments(items, inventory.linksNotRead);

  const check = options.check ?? checkPdfDocument;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.budgetMs ?? LINKED_PDF_BUDGET_MS);
  try {
    await Promise.all(
      sample.map(async (item) => {
        try {
          const result = await check(item.url, {
            signal: controller.signal,
            guard: options.guard,
            maxBytes: LINKED_PDF_MAX_BYTES,
            fetchImpl: options.fetchImpl,
          });
          item.status = "checked";
          delete item.reason;
          item.check = {
            pages: result.pageCount,
            pagesRead: result.pagesRead,
            tagged: result.tagged,
            title: result.title,
            findings: result.findings,
          };
        } catch (err) {
          // Out of time and could not be opened are different facts about
          // the file, and only one of them is worth trying again.
          const timedOut = controller.signal.aborted || (err instanceof PdfFetchError && err.timedOut);
          item.reason = timedOut ? "out-of-time" : "could-not-open";
        }
      })
    );
  } finally {
    clearTimeout(timer);
  }
  return tallyDocuments(items, inventory.linksNotRead);
}

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];

const PDF_TECHNIQUES_URL = "https://www.w3.org/WAI/WCAG21/Techniques/#pdf";

// The faults checkPdf can find, in the few words a count needs.
const FAULT_NAMES: Record<string, string> = {
  "pdf-not-tagged": "no tags",
  "pdf-scanned-image": "no readable text",
  "pdf-no-title": "no title",
  "pdf-no-language": "no language set",
  "pdf-image-no-alt": "images with no description",
  "pdf-no-headings": "no headings",
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "7 come after the first 2, which is all a page scan opens; 2 are on other sites". */
function whyNotOpened(pdfs: LinkedDocument[]): string {
  const count = (reason: LinkedDocument["reason"]) => pdfs.filter((p) => p.reason === reason).length;
  const is = (n: number) => (n === 1 ? "is" : "are");
  const parts: string[] = [];
  const beyond = count("beyond-sample");
  if (beyond) {
    parts.push(
      `${beyond} ${beyond === 1 ? "comes" : "come"} after the first ${LINKED_PDF_SAMPLE}, which is all a page scan opens`
    );
  }
  const other = count("other-site");
  if (other) parts.push(`${other} ${is(other)} on ${other === 1 ? "another site" : "other sites"}`);
  const failed = count("could-not-open");
  if (failed) parts.push(`${failed} would not open`);
  const late = count("out-of-time");
  if (late) parts.push(`${late} ${late === 1 ? "was" : "were"} still loading when the time for this ran out`);
  const login = count("behind-login");
  if (login) parts.push(`${login} ${is(login)} behind the login, which the document check does not have`);
  const audit = count("site-audit");
  if (audit) parts.push(`${audit} ${is(audit)} on this site, and a site audit counts documents without opening them`);
  return parts.join("; ");
}

function floorNote(inventory: DocumentInventory): string {
  return inventory.linksNotRead
    ? ` The scan read the first 300 links of this page and not the ${inventory.linksNotRead} after them, so this counts the first 300 only.`
    : "";
}

/**
 * The inventory as rows for a person to act on.
 *
 * Three rows, because there are three different jobs and a count should
 * mean one thing: PDFs nobody opened, PDFs that were opened and have
 * faults, and office files, which are never opened. A PDF that was opened
 * with nothing found gets no row; it is in the inventory, and in the first
 * row's sentence as one of the opened.
 *
 * The widget words these rows itself, by ruleId, in the reader's language.
 * `help` is what every other reader gets (the CLI, the MCP digest, the
 * assistant's digest, a widget older than the row), so it carries the
 * numbers in full.
 */
export function documentUndecidedRows(inventory: DocumentInventory | undefined): UndecidedRow[] {
  if (!inventory || inventory.total === 0) return [];
  const rows: UndecidedRow[] = [];
  const pdfs = inventory.items.filter((i) => i.kind === "pdf");
  const notOpened = pdfs.filter((p) => p.status !== "checked");

  if (notOpened.length > 0) {
    rows.push({
      ruleId: "pdf-linked-not-checked",
      count: notOpened.length,
      help:
        `This page links to ${plural(pdfs.length, "PDF document", "PDF documents")}. ` +
        `The scan opened ${inventory.pdfChecked} and did not open ${notOpened.length}: ${whyNotOpened(notOpened)}.` +
        floorNote(inventory),
      helpUrl: PDF_TECHNIQUES_URL,
    });
  }

  const withFaults = pdfs.filter((p) => (p.check?.findings.length ?? 0) > 0);
  if (withFaults.length > 0) {
    const byFault = new Map<string, number>();
    for (const pdf of withFaults) {
      for (const finding of pdf.check!.findings) {
        const name = FAULT_NAMES[finding.ruleId ?? ""] ?? finding.ruleId ?? "a fault";
        byFault.set(name, (byFault.get(name) ?? 0) + 1);
      }
    }
    const faults = [...byFault.entries()].map(([name, n]) => `${name} (${n})`).join(", ");
    rows.push({
      ruleId: "pdf-linked-faults",
      count: withFaults.length,
      help:
        `The scan opened ${plural(inventory.pdfChecked, "linked PDF document", "linked PDF documents")} and ` +
        `${withFaults.length} ${withFaults.length === 1 ? "has" : "have"} faults: ${faults}. ` +
        "They are the document's faults and are not in this page's score.",
      helpUrl: PDF_TECHNIQUES_URL,
    });
  }

  const office = inventory.counts.word + inventory.counts.excel + inventory.counts.powerpoint;
  if (office > 0) {
    rows.push({
      ruleId: "office-linked-not-checked",
      count: office,
      help:
        `This page links to ${plural(office, "Word, Excel or PowerPoint file", "Word, Excel or PowerPoint files")}. ` +
        "The scan counts these and does not open them." +
        // Said once: on the PDF row when there is one.
        (notOpened.length > 0 ? "" : floorNote(inventory)),
    });
  }
  return rows;
}
