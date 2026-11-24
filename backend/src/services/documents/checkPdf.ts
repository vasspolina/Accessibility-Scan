import { randomUUID } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { AccessibilityFinding } from "../../types/report.js";

// Accessibility checks for a PDF.
//
// The European Accessibility Act covers documents, not just web pages, and a
// council's application form or a bank's annual report is often the single
// most important thing on the site. No competitor checks documents in the same
// tool as the page, and pasting a PDF address into this one used to produce
// "Couldn't load or scan the page", because Chromium was being asked to
// render it as a web page.
//
// What is checked here is what makes the difference between a document a
// screen reader can read and one it cannot, in roughly that order of severity.
// PDF/UA (ISO 14289) is the full standard; these are the failures that account
// for most unusable documents in practice, and each is tied to the WCAG
// criterion it fails.

const MAX_BYTES = 20 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 20_000;
// Enough to characterise a document without reading a 400-page report.
const MAX_PAGES_INSPECTED = 10;

// A redirect chain longer than this is a loop or a tracker, not a document.
const MAX_REDIRECTS = 5;

export class PdfFetchError extends Error {
  constructor(
    message: string,
    /** The server's answer, when that is what went wrong. */
    readonly status?: number,
    /**
     * Whether the check stopped because its time ran out, as opposed to the
     * document being unreachable or unreadable. The two read the same to a
     * person pasting an address, and differently to the linked-document
     * sample, which must not report a slow file as a broken one.
     */
    readonly timedOut = false
  ) {
    super(message);
    this.name = "PdfFetchError";
  }
}

export interface PdfCheckResult {
  findings: AccessibilityFinding[];
  pageCount: number;
  /** How many of those pages were read. The rest were not looked at. */
  pagesRead: number;
  title: string | null;
  tagged: boolean;
}

export interface PdfCheckOptions {
  /** Stops the download and the reading when it fires. */
  signal?: AbortSignal;
  /**
   * Run on the address and on every redirect before it is fetched; it throws
   * to refuse. With a guard, redirects are followed one hop at a time so
   * none is fetched unseen.
   *
   * A scanned address has been through assertSafeUrl before it gets here, so
   * the direct path passes none. An address read off somebody's page has
   * been through nothing, which is the case this exists for.
   */
  guard?: (url: string) => Promise<unknown>;
  /** Largest download accepted. Defaults to the 20 MB of a direct check. */
  maxBytes?: number;
  /** Swapped in by tests so a fixture file is served with no socket. */
  fetchImpl?: typeof fetch;
}

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  wcagCriterion: string,
  wcagLevel: "A" | "AA",
  description: string,
  suggestedFix: string,
  helpUrl: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "accessibility",
    wcagCriterion,
    wcagLevel,
    // A document has no DOM, so there is no selector to give. The report shows
    // the finding without an element, which is correct: the fault is the
    // document's, not one element's.
    selector: "document",
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

/** Walks the tagged structure counting figures and how many carry alt text. */
function countFigures(node: unknown, acc: { total: number; withAlt: number }): void {
  if (!node || typeof node !== "object") return;
  const n = node as { role?: string; alt?: string; children?: unknown[] };
  if (n.role === "Figure") {
    acc.total += 1;
    if (typeof n.alt === "string" && n.alt.trim().length > 0) acc.withAlt += 1;
  }
  for (const child of n.children ?? []) countFigures(child, acc);
}

function hasHeading(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { role?: string; children?: unknown[] };
  if (typeof n.role === "string" && /^H[1-6]?$/.test(n.role)) return true;
  return (n.children ?? []).some((c) => hasHeading(c));
}

/**
 * Downloads the file, refusing anything over `maxBytes` without holding it.
 *
 * The size is checked on the declared length first and again as the bytes
 * arrive, since a server can declare nothing or declare wrongly. It used to
 * be checked only after the whole body was in memory, which put no bound at
 * all on what a single address could make this process hold.
 */
async function downloadPdf(url: string, signal: AbortSignal, options: PdfCheckOptions): Promise<Uint8Array> {
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  const doFetch = options.fetchImpl ?? fetch;
  const tooLarge = () =>
    new PdfFetchError(`That document is too large for this check (over ${Math.round(maxBytes / (1024 * 1024))}MB).`);

  let current = url;
  let res: Response;
  for (let hop = 0; ; hop++) {
    if (options.guard) {
      try {
        await options.guard(current);
      } catch {
        throw new PdfFetchError("That document's address can't be checked.");
      }
    }
    res = await doFetch(current, {
      signal,
      headers: { accept: "application/pdf,*/*" },
      redirect: options.guard ? "manual" : "follow",
    });
    if (!options.guard || res.status < 300 || res.status >= 400) break;
    const location = res.headers.get("location");
    await res.body?.cancel().catch(() => undefined);
    if (!location || hop >= MAX_REDIRECTS) {
      throw new PdfFetchError("We couldn't download the document (too many redirects).");
    }
    current = new URL(location, current).toString();
  }

  if (!res.ok) throw new PdfFetchError(`We couldn't download the document (HTTP ${res.status}).`, res.status);
  if (Number(res.headers.get("content-length")) > maxBytes) {
    await res.body?.cancel().catch(() => undefined);
    throw tooLarge();
  }
  if (!res.body) {
    const buf = await res.arrayBuffer();
    if (buf.byteLength > maxBytes) throw tooLarge();
    return new Uint8Array(buf);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function checkPdfDocument(url: string, options: PdfCheckOptions = {}): Promise<PdfCheckResult> {
  // One signal for the whole check: this function's own download allowance,
  // and the caller's, whichever fires first.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", onOuterAbort, { once: true });
  const outOfTime = () => new PdfFetchError("We couldn't finish checking the document in time.", undefined, true);

  let bytes: Uint8Array;
  try {
    bytes = await downloadPdf(url, controller.signal, options);
  } catch (err) {
    options.signal?.removeEventListener("abort", onOuterAbort);
    if (err instanceof PdfFetchError) throw err;
    throw new PdfFetchError("We couldn't download the document.", undefined, controller.signal.aborted);
  } finally {
    clearTimeout(timer);
  }

  // verbosity 0 is errors only. Without it pdfjs writes a warning per page for
  // fonts it cannot substitute, which is noise: we read structure and text, and
  // never render a pixel, so font substitution is irrelevant here.
  if (options.signal?.aborted) throw outOfTime();
  const task = getDocument({ data: bytes, useSystemFonts: false, verbosity: 0 });
  // Tearing the task down rejects this promise whether or not anything is
  // still awaiting it. Unhandled, that rejection ends the process, so it is
  // given a handler here; readPdf awaits the same promise and sees the same
  // rejection where it can act on it.
  task.promise.catch(() => undefined);
  // Reading is not interruptible from outside, so the caller's signal tears
  // the document down and the awaits below reject or come back empty. Every
  // one of them is followed by a check of the signal, because "came back
  // empty" is also what an untagged page looks like, and a check cut short
  // must never be reported as a verdict on the document.
  const onAbortDuringRead = () => void task.destroy().catch(() => undefined);
  options.signal?.removeEventListener("abort", onOuterAbort);
  options.signal?.addEventListener("abort", onAbortDuringRead, { once: true });
  try {
    return await readPdf(task, options.signal, outOfTime);
  } finally {
    options.signal?.removeEventListener("abort", onAbortDuringRead);
    // Frees the parsed document here instead of leaving it to the collector.
    void task.destroy().catch(() => undefined);
  }
}

async function readPdf(
  task: ReturnType<typeof getDocument>,
  signal: AbortSignal | undefined,
  outOfTime: () => PdfFetchError
): Promise<PdfCheckResult> {
  if (signal?.aborted) throw outOfTime();
  const doc = await task.promise.catch(() => {
    throw signal?.aborted ? outOfTime() : new PdfFetchError("We couldn't read that file as a PDF.");
  });

  const findings: AccessibilityFinding[] = [];
  const meta = (await doc.getMetadata().catch(() => null)) as {
    info?: { Title?: string; Language?: string };
  } | null;
  const title = meta?.info?.Title?.trim() || null;
  const language = meta?.info?.Language?.trim() || null;

  const pagesToRead = Math.min(doc.numPages, MAX_PAGES_INSPECTED);
  let tagged = false;
  let textItems = 0;
  const figures = { total: 0, withAlt: 0 };
  let headingSeen = false;

  for (let i = 1; i <= pagesToRead; i++) {
    if (signal?.aborted) throw outOfTime();
    const page = await doc.getPage(i).catch(() => null);
    if (!page) continue;
    const struct = await page.getStructTree().catch(() => null);
    if (struct) {
      tagged = true;
      countFigures(struct, figures);
      if (!headingSeen) headingSeen = hasHeading(struct);
    }
    const text = await page.getTextContent().catch(() => null);
    textItems += text?.items.length ?? 0;
  }
  if (signal?.aborted) throw outOfTime();

  // Untagged is the one that matters most. Without tags there is no reading
  // order, no headings and no way to tell a caption from a heading — a screen
  // reader is left guessing at a wall of text.
  if (!tagged) {
    findings.push(
      makeFinding(
        "pdf-not-tagged",
        "critical",
        "1.3.1",
        "A",
        "This PDF has no tags.",
        "Re-export it from the original document with tagging turned on. In Word or Google Docs, use real heading styles and export as a tagged PDF rather than printing to PDF. Retagging an existing PDF by hand in Acrobat is possible but far slower than fixing the source.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF9"
      )
    );
  }

  // No extractable text at all means the pages are pictures of a document.
  if (textItems === 0) {
    findings.push(
      makeFinding(
        "pdf-scanned-image",
        "critical",
        "1.1.1",
        "A",
        "This document has no readable text.",
        "Run optical character recognition over it, or better, publish the original document it was scanned from. A scan with OCR is readable; a scan without it is a picture of words.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF7"
      )
    );
  }

  if (!title) {
    findings.push(
      makeFinding(
        "pdf-no-title",
        "serious",
        "2.4.2",
        "A",
        "This document has no title set.",
        "Set the document title in the file's properties, and set it to display in place of the filename. In Acrobat that is File, Properties, Description, and then Initial View, Show, Document Title.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF18"
      )
    );
  }

  if (!language) {
    findings.push(
      makeFinding(
        "pdf-no-language",
        "serious",
        "3.1.1",
        "A",
        "This document has no language set.",
        "Set the document language in the file's properties. In Acrobat that is File, Properties, Advanced, Reading Options, Language.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF16"
      )
    );
  }

  // Only meaningful once we know the document is tagged: in an untagged file
  // there are no figures to inspect, and reporting missing alt text there would
  // be a second complaint about the same fault.
  if (tagged && figures.total > 0 && figures.withAlt < figures.total) {
    const missing = figures.total - figures.withAlt;
    findings.push(
      makeFinding(
        "pdf-image-no-alt",
        "serious",
        "1.1.1",
        "A",
        `${missing} of the ${figures.total} images in this document have no description.`,
        "Add alternate text to each image in the source document before exporting, or in Acrobat's reading order tool. Mark purely decorative images as artifacts instead, so screen readers skip them rather than announcing them.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF1"
      )
    );
  }

  if (tagged && !headingSeen && doc.numPages > 1) {
    findings.push(
      makeFinding(
        "pdf-no-headings",
        "moderate",
        "1.3.1",
        "A",
        "This document is tagged but has no headings.",
        "Use real heading styles in the source document rather than making text large and bold, then re-export.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF9"
      )
    );
  }

  return { findings, pageCount: doc.numPages, pagesRead: pagesToRead, title, tagged };
}
