// Scans every domain in domains.json through the project's own pipeline and
// writes one summary line per site to results.jsonl (resumable).
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { scanUrlToReport } from "../../backend/dist/services/scanPipeline.js";

const dir = new URL(".", import.meta.url).pathname;
const domains = JSON.parse(readFileSync(dir + "domains.json", "utf8"));
const out = dir + "results.jsonl";
const done = new Set(existsSync(out) ? readFileSync(out, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l).domain) : []);

const queue = [];
for (const [country, list] of Object.entries(domains)) for (const domain of list) if (!done.has(domain)) queue.push({ country, domain });
const CONC = Number(process.env.CONC || 5);
let n = 0;

async function one({ country, domain }) {
  const t0 = Date.now();
  let rec = { country, domain };
  try {
    let r;
    try { r = await scanUrlToReport("https://" + domain, false, undefined, false, undefined, true); }
    catch (e1) { r = await scanUrlToReport("https://www." + domain, false, undefined, false, undefined, true); }
    const acc = r.findings.filter(f => f.category === "accessibility");
    const provable = acc.filter(f => f.wcagLevel === "A" || f.wcagLevel === "AA");
    const by = {};
    for (const f of provable) by[f.severity] = (by[f.severity] || 0) + 1;
    rec = { ...rec, ok: true, url: r.url, score: r.score, findings: acc.length, provable: provable.length, by,
      pass: provable.length === 0, incomplete: r.incomplete ?? null, ms: Date.now() - t0 };
  } catch (e) {
    rec = { ...rec, ok: false, error: String(e?.message || e).slice(0, 200), ms: Date.now() - t0 };
  }
  appendFileSync(out, JSON.stringify(rec) + "\n");
  console.log(`${++n}/${queue.length} ${domain} ${rec.ok ? `score ${rec.score} provable ${rec.provable}` : "FAIL " + rec.error} ${(rec.ms / 1000) | 0}s`);
}
await Promise.all(Array.from({ length: CONC }, async () => { while (queue.length) await one(queue.shift()); }));
console.log("done");
process.exit(0);
