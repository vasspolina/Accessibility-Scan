import { chromium } from "playwright";
import fs from "node:fs";
const src = fs.readFileSync("./node_modules/axe-core/axe.min.js", "utf8");
const b = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [w, aud] of [[1280,"business"],[414,"business"],[1280,"professional"]]) {
    const p = await b.newPage({ viewport: { width: w, height: 1000 }, colorScheme: theme });
    await p.goto(`http://localhost:5174/?fixture=report&audience=${aud}&theme=${theme}`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => document.getElementById("a11y-widget-business-root")?.shadowRoot?.querySelector(".a11y-report"), { timeout: 20000 });
    for (let k = 0; k < 2; k++) {
      await p.evaluate(() => { const sr=document.getElementById("a11y-widget-business-root").shadowRoot;
        sr.querySelectorAll('[aria-expanded="false"]').forEach(e=>e.click()); });
      await p.waitForTimeout(400);
    }
    await p.evaluate(src);
    const v = await p.evaluate(async () => {
      const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
      const r = await window.axe.run(sr, { resultTypes: ["violations"] });
      return r.violations.map(x => `${x.id}:${x.nodes.length}`);
    });
    console.log(`axe ${theme} ${w} ${aud}:`, JSON.stringify(v));
    await p.close();
  }
}
await b.close();
