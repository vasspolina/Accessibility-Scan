/* axe-core over every built locale. The site is the proof of the service:
   a prospect will audit it, so it is audited here first — in each language,
   because a translation can break a name, a lang attribute or a contrast. */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const axeSrc = fs.readFileSync(
  path.resolve(ROOT, "../backend/node_modules/axe-core/axe.min.js"), "utf8");
const locales = process.argv.slice(2).length ? process.argv.slice(2) : ["en", "de", "en-XA"];
const b = await chromium.launch();
let failed = 0;
for (const loc of locales) {
  const file = path.join(ROOT, loc, "index.html");
  if (!fs.existsSync(file)) { console.log(`  ${loc}: not built`); continue; }
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto("file://" + file, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(400);
  await p.evaluate(axeSrc);
  const r = await p.evaluate(async () => {
    const res = await window.axe.run(document, { resultTypes: ["violations"] });
    return res.violations.map((v) => ({ id: v.id, n: v.nodes.length,
      sample: v.nodes[0]?.target?.[0] ?? "" }));
  });
  const lang = await p.evaluate(() => document.documentElement.lang);
  console.log(`  ${loc}  lang="${lang}"  ${r.length ? "" : "no violations"}`);
  for (const v of r) { console.log(`     ${v.id} ×${v.n}  ${v.sample}`); failed++; }
  await p.close();
}
await b.close();
process.exit(failed ? 1 : 0);
