import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5174/";
const STATES = [
  "?fixture=report",
  "?fixture=report&audience=professional",
  "?fixture=report&scope=site",
  "?fixture",
  "?fixture=error",
  "?fixture=blocked",
];
const WIDTHS = [1280, 680, 414, 320];
const SHOTDIR =
  "/private/tmp/claude-501/-Users-polinavasilyeva-a11y-checker/58064946-6f64-4bf0-a80e-1b63240e2a59/scratchpad/shots";
fs.mkdirSync(SHOTDIR, { recursive: true });

const scan = () => {
  const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
  const all = [...sr.querySelectorAll("*")];
  let examined = 0;
  let capsules = 0;
  const findings = [];
  const parsePx = (v) => {
    const m = /^([\d.]+)px$/.exec(v);
    return m ? parseFloat(m[1]) : null;
  };
  const chain = (el) => {
    const parts = [];
    let cur = el;
    for (let i = 0; i < 4 && cur && cur.nodeType === 1; i++) {
      parts.push((cur.classList && cur.classList[0]) || cur.tagName);
      cur = cur.parentElement;
    }
    return parts.join(" < ");
  };
  // collect text line rects from all descendant text nodes
  const textLineRects = (el) => {
    const rects = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      const p = node.parentElement;
      if (p) {
        const pcs = getComputedStyle(p);
        if (pcs.display === "none" || pcs.visibility === "hidden") continue;
      }
      const r = document.createRange();
      r.selectNodeContents(node);
      for (const rect of r.getClientRects()) {
        if (rect.width > 1 && rect.height > 4) rects.push(rect);
      }
    }
    return rects;
  };
  const bandCount = (rects) => {
    const bands = [];
    for (const r of [...rects].sort((a, b) => a.top - b.top)) {
      let placed = false;
      for (const b of bands) {
        const overlap = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
        const minH = Math.min(b.bottom - b.top, r.height);
        if (overlap > 0.5 * minH) {
          b.top = Math.min(b.top, r.top);
          b.bottom = Math.max(b.bottom, r.bottom);
          placed = true;
          break;
        }
      }
      if (!placed) bands.push({ top: r.top, bottom: r.bottom });
    }
    return bands.length;
  };
  for (const el of all) {
    if (!el.getClientRects || el.getClientRects().length === 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    examined++;
    const corners = [
      cs.borderTopLeftRadius,
      cs.borderTopRightRadius,
      cs.borderBottomLeftRadius,
      cs.borderBottomRightRadius,
    ].map((v) => parsePx(v.split(" ")[0]));
    if (corners.some((c) => c === null)) continue;
    const rmin = Math.min(...corners);
    if (rmin < 900) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    capsules++;
    const fs2 = parseFloat(cs.fontSize) || 16;
    let lh = parsePx(cs.lineHeight);
    if (lh === null || lh === 0) lh = fs2 * 1.2;
    const rects = textLineRects(el);
    const rows = bandCount(rects);
    const extent = rects.length
      ? +(
          Math.max(...rects.map((r) => r.bottom)) - Math.min(...rects.map((r) => r.top))
        ).toFixed(1)
      : null;
    const multiRaw = rect.height > 1.6 * lh;
    const clipped = el.scrollWidth > el.clientWidth + 1;
    if ((multiRaw && rows >= 2) || clipped) {
      const bg = cs.backgroundColor;
      const hasBg = !/^rgba\(\d+, \d+, \d+, 0\)$/.test(bg) && bg !== "transparent";
      const hasBorder =
        parseFloat(cs.borderTopWidth) > 0 && !/rgba\(.*, 0\)$/.test(cs.borderTopColor);
      findings.push({
        chain: chain(el),
        radius: rmin,
        rectW: +rect.width.toFixed(1),
        rectH: +rect.height.toFixed(1),
        top: +rect.top.toFixed(0),
        left: +rect.left.toFixed(0),
        rows,
        extent,
        lh: +lh.toFixed(2),
        fs: fs2,
        ratio: +(rect.height / lh).toFixed(2),
        clipped,
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        hasBg,
        hasBorder,
        bg,
        borderW: cs.borderTopWidth,
        text: (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 90),
      });
    }
  }
  return { examined, capsules, findings };
};

const browser = await chromium.launch({ headless: true });
const out = { counts: {}, capsuleCounts: {}, raw: [] };
const shotTaken = new Set();

for (const state of STATES) {
  for (const width of WIDTHS) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(BASE + state, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForFunction(
        () =>
          document
            .getElementById("a11y-widget-business-root")
            ?.shadowRoot?.querySelector(".a11y-section, .a11y-url-form"),
        { timeout: 15000 }
      );
      await page.waitForTimeout(1200);
      for (let pass = 0; pass < 2; pass++) {
        await page.evaluate(() => {
          const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
          sr.querySelectorAll('[aria-expanded="false"]').forEach((el) => el.click());
        });
        await page.waitForTimeout(400);
      }
      const res = await page.evaluate(scan);
      const key = `${state}@${width}`;
      out.counts[key] = res.examined;
      out.capsuleCounts[key] = res.capsules;
      for (const f of res.findings) {
        out.raw.push({ state, width, ...f });
        // one screenshot per distinct chain@width
        const slug =
          (f.chain.split(" < ")[0] + "-" + width).replace(/[^a-z0-9-]/gi, "_") + ".png";
        if (!shotTaken.has(slug)) {
          shotTaken.add(slug);
          try {
            const pad = 12;
            await page.screenshot({
              path: SHOTDIR + "/" + slug,
              fullPage: true,
              clip: {
                x: Math.max(0, f.left - pad),
                y: Math.max(0, f.top - pad),
                width: Math.min(width, f.rectW + 2 * pad),
                height: Math.min(2200, f.rectH + 2 * pad),
              },
            });
          } catch (e) {}
        }
      }
    } catch (e) {
      out.counts[`${state}@${width}`] = 0;
      out.raw.push({ state, width, error: String(e).slice(0, 200) });
    } finally {
      await page.close();
    }
  }
}

await browser.close();
console.log(JSON.stringify(out, null, 1));
