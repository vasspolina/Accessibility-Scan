/* Computed-style snapshot of the whole report, for proving a CSS refactor
   is inert. Styles only, never geometry: an earlier geometry-carrying
   version was noisier than the signal it was meant to catch. Four states,
   every disclosure opened twice so nested ones open too. */
import { chromium } from "playwright";
import fs from "node:fs";
const OUT = process.argv[2];
const SCHEME = process.argv[3] ?? "light";
const PROPS = ["display","color","background-color","font-size","font-weight","letter-spacing",
  "line-height","text-align","text-transform","padding","margin","border-radius","gap",
  "grid-template-columns","flex-direction","border","outline-style","white-space","max-width"];
const b = await chromium.launch();
const snap = {};
for (const [w, aud] of [[1280,"business"],[600,"business"],[414,"business"],[1280,"professional"]]) {
  const p = await b.newPage({ viewport: { width: w, height: 1400 }, colorScheme: SCHEME });
  await p.goto(`http://localhost:5174/?fixture=report&audience=${aud}`, { waitUntil: "networkidle" });
  await p.waitForFunction(() => document.getElementById("a11y-widget-business-root")
    ?.shadowRoot?.querySelector(".a11y-w22-panel"), { timeout: 20000 });
  for (let k = 0; k < 2; k++) {
    await p.evaluate(() => { const sr=document.getElementById("a11y-widget-business-root").shadowRoot;
      sr.querySelectorAll('[aria-expanded="false"]').forEach(e=>e.click()); });
    await p.waitForTimeout(500);
  }
  snap[`${w}-${aud}`] = await p.evaluate((props) => {
    const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
    const out = []; let i = 0;
    for (const el of sr.querySelectorAll("*")) {
      const cs = getComputedStyle(el);
      const key = `${i++}:${el.tagName}.${typeof el.className === "string" ? el.className.split(" ")[0] : ""}`;
      out.push([key, props.map((p) => cs.getPropertyValue(p)).join("|")]);
    }
    return out;
  }, PROPS);
  await p.close();
}
await b.close();
fs.writeFileSync(OUT, JSON.stringify(snap));
console.log("snapshot:", Object.keys(snap).length, "states,",
  Object.values(snap).reduce((n, a) => n + a.length, 0), "elements");
