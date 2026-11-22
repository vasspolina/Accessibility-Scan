import type { DocumentInventory, LinkedDocument } from "../../types/report.js";

// Which documents a page links to.
//
// A scan used to look at a document only when the scanned address itself
// ended in .pdf. A page that links to forty application forms produced a
// report with no mention of a document, and the crawl dropped the same links
// on purpose (SKIP_EXTENSIONS in crawl/discoverPages.ts) because they are not
// pages. So a council site whose forms are all PDFs read as a site with no
// documents. This is gap 2.6 in docs/CHECKER-GAPS.md.
//
// Pure: it takes the links the render already collected and a base address,
// and opens nothing. Opening a sample of the PDFs is linkedDocuments.ts.
//
// Two limits, both stated in the result and neither hidden:
//
//   The kind is read from the address's path, as looksLikePdf does for a
//   scanned address. A document served from /download?id=7 has no extension
//   to read and is not counted. Finding those would take a request per link.
//
//   The render reads the first 300 links of a page (pageLinks in
//   render/renderPage.ts). When the page has more, linksNotRead says how
//   many and the counts are a floor.

type Kind = LinkedDocument["kind"];

const KINDS: Array<[RegExp, Kind]> = [
  [/\.pdf$/i, "pdf"],
  [/\.docx?$/i, "word"],
  [/\.xlsx?$/i, "excel"],
  [/\.pptx?$/i, "powerpoint"],
];

function kindOf(url: URL): Kind | null {
  for (const [pattern, kind] of KINDS) if (pattern.test(url.pathname)) return kind;
  return null;
}

/**
 * Recounts an inventory from its items.
 *
 * Separate from the inventory itself because the sample check changes items
 * after they are listed, and the crawl builds a list of its own; both need
 * the same arithmetic and must not each keep a copy of it.
 */
export function tallyDocuments(items: LinkedDocument[], linksNotRead = 0): DocumentInventory {
  const counts = { pdf: 0, word: 0, excel: 0, powerpoint: 0 };
  for (const item of items) counts[item.kind] += 1;
  const pdfs = items.filter((i) => i.kind === "pdf");
  const pdfChecked = pdfs.filter((i) => i.status === "checked").length;
  return {
    counts,
    total: items.length,
    otherSites: items.filter((i) => !i.sameOrigin).length,
    pdfChecked,
    pdfNotChecked: pdfs.length - pdfChecked,
    pdfWithFaults: pdfs.filter((i) => (i.check?.findings.length ?? 0) > 0).length,
    ...(linksNotRead > 0 ? { linksNotRead } : {}),
    items,
  };
}

/**
 * The PDFs and office files among a page's links, one entry per document.
 *
 * `baseUrl` is the address the page ended up at, so a relative link resolves
 * the way the browser resolved it. `linksNotRead` is how many of the page's
 * links the render left unread, when it left any.
 *
 * Every entry starts as not checked, with the reason that holds before
 * anything is opened: an office file is never opened, a PDF on another
 * origin is somebody else's, and a PDF on this origin is beyond the sample
 * until the sample check opens it.
 */
export function inventoryDocuments(
  pageLinks: Array<{ href: string; text: string }>,
  baseUrl: string,
  linksNotRead = 0
): DocumentInventory {
  let base: URL | null = null;
  try {
    base = new URL(baseUrl);
  } catch {
    base = null;
  }

  const byUrl = new Map<string, LinkedDocument>();
  for (const link of base ? pageLinks : []) {
    let url: URL;
    try {
      url = new URL(link.href, base!);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    const kind = kindOf(url);
    if (!kind) continue;

    // The fragment names a place inside the document (#page=3), not another
    // document. The query stays: /file.pdf?v=2 and ?v=3 can be two files.
    url.hash = "";
    const key = url.toString();
    const seen = byUrl.get(key);
    if (seen) {
      seen.links += 1;
      // A logo linking to the file has no words; the text link after it does.
      if (!seen.text && link.text) seen.text = link.text;
      continue;
    }

    const sameOrigin = url.origin === base!.origin;
    byUrl.set(key, {
      url: key,
      kind,
      text: link.text,
      links: 1,
      sameOrigin,
      status: "not-checked",
      reason: kind !== "pdf" ? "office-file" : sameOrigin ? "beyond-sample" : "other-site",
    });
  }

  return tallyDocuments([...byUrl.values()], linksNotRead);
}

/**
 * One line of counts for a terminal, or null when the page links to none.
 *
 * "documents: 14 PDF (2 opened, 1 with faults, 12 not opened) · 3 Word,
 * Excel or PowerPoint (counted, never opened)"
 */
export function documentsLine(inventory: DocumentInventory | undefined): string | null {
  if (!inventory || inventory.total === 0) return null;
  const parts: string[] = [];
  if (inventory.counts.pdf > 0) {
    parts.push(
      `${inventory.counts.pdf} PDF (${inventory.pdfChecked} opened, ${inventory.pdfWithFaults} with faults, ${inventory.pdfNotChecked} not opened)`
    );
  }
  const office = inventory.counts.word + inventory.counts.excel + inventory.counts.powerpoint;
  if (office > 0) parts.push(`${office} Word, Excel or PowerPoint (counted, never opened)`);
  return (
    `documents: ${parts.join(" · ")}` +
    (inventory.linksNotRead ? ` · ${inventory.linksNotRead} of the page's links not read` : "")
  );
}
