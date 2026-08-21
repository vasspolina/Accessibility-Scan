/* Every visible text node's contrast against its effective background, in
   whichever theme the harness is pinned to. Alpha-composited; sr-only and
   aria-hidden excluded. The product's own standard: 4.5:1 body, 3:1 large. */
import { chromium } from "playwright";
const THEME = process.argv[2] ?? "dark";
const b = await chromium.launch();
const all = [];
for (const [w, aud] of [[1280,"business"],[414,"business"],[1280,"professional"]]) {
  const p = await b.newPage({ viewport: { width: w, height: 1400 }, colorScheme: THEME });
  await p.goto(`http://localhost:5174/?fixture=report&audience=${aud}&theme=${THEME}`, { waitUntil: "networkidle" });
  await p.waitForFunction(() => document.getElementById("a11y-widget-business-root")?.shadowRoot?.querySelector(".a11y-report"), { timeout: 20000 });
  for (let k = 0; k < 2; k++) {
    await p.evaluate(() => { const sr=document.getElementById("a11y-widget-business-root").shadowRoot;
      sr.querySelectorAll('[aria-expanded="false"]').forEach(e=>e.click()); });
    await p.waitForTimeout(400);
  }
  const rows = await p.evaluate(() => {
    const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
    const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.slice(0,4).map(Number) : null; };
    const over = (fg, bg) => fg[3] === undefined || fg[3] === 1 ? fg
      : [0,1,2].map(i => fg[i]*fg[3] + bg[i]*(1-fg[3]));
    const lum = (c) => { const f = c.slice(0,3).map(v => { v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; });
      return 0.2126*f[0] + 0.7152*f[1] + 0.0722*f[2]; };
    const ratio = (a,bq) => { const [x,y]=[lum(a),lum(bq)].sort((m,n)=>n-m); return (x+0.05)/(y+0.05); };
    const bgOf = (el) => { let n = el;
      while (n) { const c = parse(getComputedStyle(n).backgroundColor);
        if (c && (c[3] === undefined || c[3] > 0.95)) return c;
        n = n.parentElement ?? (n.getRootNode()?.host ?? null); }
      return [22,22,22]; };
    const out = [];
    for (const el of sr.querySelectorAll("*")) {
      if (!el.getClientRects().length) continue;
      if (el.closest("[aria-hidden='true'], .a11y-sr-only")) continue;
      const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.opacity === "0") continue;
      const fg = parse(cs.color); if (!fg) continue;
      const bg = bgOf(el);
      const r = ratio(over(fg, bg), bg);
      const size = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 700;
      const need = (size >= 24 || (size >= 18.66 && bold)) ? 3 : 4.5;
      if (r < need) out.push({ cls: el.className.toString().split(" ")[0] || el.tagName,
        text: (el.textContent||"").trim().slice(0,40), ratio: Math.round(r*100)/100, need, size,
        fg: cs.color, bg: `rgb(${bg.slice(0,3).map(Math.round).join(",")})` });
    }
    return out;
  });
  all.push(...rows.map(r => ({ state: `${w}-${aud}`, ...r })));
  await p.close();
}
await b.close();
const seen = new Set();
const uniq = all.filter(r => { const k = r.cls + r.ratio; if (seen.has(k)) return false; seen.add(k); return true; });
console.log(`${THEME}: ${all.length} failing pairs, ${uniq.length} distinct`);
for (const r of uniq.sort((a,b)=>a.ratio-b.ratio).slice(0, 25)) console.log(JSON.stringify(r));
