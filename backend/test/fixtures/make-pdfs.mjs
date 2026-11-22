// Writes the two PDFs the linked-document tests read, beside this file.
//
//   node test/fixtures/make-pdfs.mjs
//
// Written by hand rather than exported from an office program so the files
// hold exactly what the tests say they hold and nothing else: one page, one
// line of text, and either the whole of what the checker looks for (tags, a
// heading, a title, a language) or none of it. The cross-reference table is
// computed here, so an edit to an object cannot leave the offsets stale.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

function build(objects, trailerExtra = "") {
  let out = "%PDF-1.7\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${trailerExtra} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const stream = (content) => `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
const FONT = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

// No tags, no title, no language: what "Print to PDF" leaves behind.
const untagged = build([
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  stream("BT /F1 24 Tf 72 720 Td (Application form) Tj ET"),
  FONT,
]);

// Tagged, with one heading, a title and a language.
const tagged = build(
  [
    "<< /Type /Catalog /Pages 2 0 R /Lang (en) /MarkInfo << /Marked true >> /StructTreeRoot 6 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /StructParents 0 /Resources << /Font << /F1 5 0 R >> >> >>",
    stream("/H1 << /MCID 0 >> BDC BT /F1 24 Tf 72 720 Td (Application form) Tj ET EMC"),
    FONT,
    "<< /Type /StructTreeRoot /K [7 0 R] /ParentTree 8 0 R /ParentTreeNextKey 1 >>",
    "<< /Type /StructElem /S /H1 /P 6 0 R /Pg 3 0 R /K 0 >>",
    "<< /Nums [0 [7 0 R]] >>",
    "<< /Title (Application form) >>",
  ],
  " /Info 9 0 R"
);

writeFileSync(path.join(here, "linked-untagged.pdf"), untagged);
writeFileSync(path.join(here, "linked-tagged.pdf"), tagged);
console.log(`untagged ${untagged.length} bytes, tagged ${tagged.length} bytes`);
