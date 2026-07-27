import { randomUUID } from "node:crypto";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { AccessibilityFinding } from "../../types/report.js";

// Accessibility checks for a PDF.
//
// The European Accessibility Act covers documents, not just web pages, and a
// council's application form or a bank's annual report is often the single
// most important thing on the site. No competitor checks documents in the same
// tool as the page, and pasting a PDF address into this one used to produce
// "Could not load or scan the page", because Chromium was being asked to
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

export class PdfFetchError extends Error {}

export interface PdfCheckResult {
  findings: AccessibilityFinding[];
  pageCount: number;
  title: string | null;
  tagged: boolean;
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

export async function checkPdfDocument(url: string): Promise<PdfCheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let bytes: Uint8Array;
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/pdf,*/*" },
    });
    if (!res.ok) throw new PdfFetchError(`The document could not be downloaded (HTTP ${res.status}).`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) {
      throw new PdfFetchError("That document is too large for this check (over 20MB).");
    }
    bytes = new Uint8Array(buf);
  } catch (err) {
    if (err instanceof PdfFetchError) throw err;
    throw new PdfFetchError("The document could not be downloaded.");
  } finally {
    clearTimeout(timer);
  }

  // verbosity 0 is errors only. Without it pdfjs writes a warning per page for
  // fonts it cannot substitute, which is noise: we read structure and text, and
  // never render a pixel, so font substitution is irrelevant here.
  const doc = await getDocument({ data: bytes, useSystemFonts: false, verbosity: 0 }).promise.catch(() => {
    throw new PdfFetchError("That file could not be read as a PDF.");
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
        "This PDF has no tags, so its structure exists only visually. A screen reader has no headings to navigate by, no reading order it can rely on, and no way to tell a heading from a caption.",
        "Re-export it from the original document with tagging turned on. In Word or Google Docs that means using real heading styles and exporting as a tagged PDF, not printing to PDF. Retagging an existing PDF by hand in Acrobat is possible but far slower than fixing the source.",
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
        "There is no readable text in this document. The pages appear to be images, most likely a scan, so screen readers and search have nothing to work with at all.",
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
        "This document has no title set, so it is announced by its filename. Someone with several documents open hears something like \"final-v3-web.pdf\" instead of what it is.",
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
        "This document does not say what language it is written in, so a screen reader reads it in whatever voice it happens to be set to. English read in a Dutch voice is close to unintelligible.",
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
        `${missing} of the ${figures.total} images in this document have no description. Anyone using a screen reader is told an image is there and nothing about what it shows.`,
        "Add alternate text to each image in the source document before exporting, or in Acrobat's reading order tool. Images that are purely decorative should be marked as artifacts instead, so they are skipped rather than announced.",
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
        "This document is tagged but has no headings. Screen reader users navigate long documents by jumping between headings, and without any they have to read from the top.",
        "Use real heading styles in the source document rather than making text large and bold, then re-export.",
        "https://www.w3.org/WAI/WCAG21/Techniques/pdf/PDF9"
      )
    );
  }

  return { findings, pageCount: doc.numPages, title, tagged };
}
