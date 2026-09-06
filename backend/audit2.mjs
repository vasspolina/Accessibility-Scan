import { chromium } from "playwright";
const browser = await chromium.launch();
const deep = `(r => { const d = (x) => x.activeElement?.shadowRoot ? d(x.activeElement.shadowRoot) : x.activeElement; return d(r); })`;
for (const [fx, q, waitSel] of [["form","?fixture=form","h2"],["report","?fixture=report","#a11y-score-heading"],["pro","?fixture=report&audience=professional","#a11y-score-heading"]]) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:5174/${q}`); await page.locator(waitSel).first().waitFor({ timeout: 60000 }).catch(() => {}); await page.waitForTimeout(500);
  // keyboard walk: enter the widget, then walk until focus leaves it
  let entered = false, stops = 0, noRing = [], cycle = null; const seen = new Set();
  for (let i = 0; i < 500; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => { const d = (x) => x.activeElement?.shadowRoot ? d(x.activeElement.shadowRoot) : x.activeElement; const el = d(document); if (!el || el === document.body) return { outside: true, body: true }; const inWidget = Boolean(el.getRootNode().host); if (!inWidget) return { outside: true }; const c = getComputedStyle(el); const w = el.closest(".a11y-input-shell"); const cw = w && getComputedStyle(w); const ring = (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none" || (cw && cw.outlineStyle !== "none" && parseFloat(cw.outlineWidth) > 0); const r = el.getBoundingClientRect(); return { key: el.tagName + "|" + (el.id || el.className) + "|" + (el.textContent || "").trim().slice(0, 16), ring, zero: r.width === 0 || r.height === 0, tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) }; });
    if (info.outside) { if (entered) break; else continue; }
    entered = true;
    if (seen.has(info.key)) { cycle = info.key; break; }
    seen.add(info.key); stops++;
    if (!info.ring) noRing.push(`${info.tag}:${info.text}${info.zero ? " (0px)" : ""}`);
  }
  // hidden-but-focusable: does each have a display:none ancestor?
  const hf = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const root = host.shadowRoot; const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }; const items = [...root.querySelectorAll("a[href],button,input,select,textarea,[tabindex='0']")].filter((e) => !e.disabled && e.tabIndex >= 0 && !vis(e) && !e.closest("[hidden]") && !e.closest("[aria-hidden=true]") && !e.className.toString().includes("sr-only") && !e.className.toString().includes("skip")); const noneAncestor = (e) => { let p = e; while (p && p !== root) { if (getComputedStyle(p).display === "none") return true; p = p.parentElement; } return false; }; const truly = items.filter((e) => !noneAncestor(e)); return { hiddenCandidates: items.length, trulyFocusableWhileInvisible: truly.map((e) => e.outerHTML.slice(0, 90)) }; });
  console.log(`== ${fx}: keyboard ${stops} stops${cycle ? ", CYCLE at " + cycle : ", left the widget"}; no ring on: ${noRing.length ? noRing.join(" | ") : "none"}`);
  console.log(`   hidden-but-focusable: ${hf.hiddenCandidates} candidates, truly focusable while invisible: ${hf.trulyFocusableWhileInvisible.length} ${hf.trulyFocusableWhileInvisible.slice(0, 3).join(" | ")}`);
  if (fx === "pro") {
    const pro = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const root = host.shadowRoot; const ctl = root.querySelector('[aria-controls="panel-clean"]'); const divs = [...root.querySelectorAll("div[tabindex='0']")].map((d) => ({ cls: d.className, role: d.getAttribute("role"), h: Math.round(d.getBoundingClientRect().height), text: d.textContent.trim().slice(0, 30) })); const tables = [...root.querySelectorAll("table")].filter((t) => t.getBoundingClientRect().height > 0 && !t.querySelector("caption") && !t.getAttribute("aria-label") && !t.getAttribute("aria-labelledby")).map((t) => ({ cls: t.className, first: t.querySelector("th,td")?.textContent.trim().slice(0, 30) })); return { panelClean: ctl ? { tag: ctl.tagName, role: ctl.getAttribute("role"), text: ctl.textContent.trim().slice(0, 30), targetExists: Boolean(root.getElementById("panel-clean")) } : null, focusableDivs: divs, tables }; });
    console.log("   pro specifics:", JSON.stringify(pro));
  }
  await page.close();
}
// forced colours: the option card's radio mark
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: "active" });
  const page = await ctx.newPage(); await page.goto("http://localhost:5174/?fixture=form"); await page.waitForTimeout(800);
  const m = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const root = host.shadowRoot; const card = root.querySelector(".a11y-optioncard:has(> input:checked)"); const input = card.querySelector("input"); const ci = getComputedStyle(input); const mark = card.querySelector(".a11y-optioncard-mark, .a11y-radio-mark, span[aria-hidden]"); const cm = mark && getComputedStyle(mark); return { inputSize: `${Math.round(input.getBoundingClientRect().width)}x${Math.round(input.getBoundingClientRect().height)}`, inputOpacity: ci.opacity, inputAppearance: ci.appearance, markCls: mark?.className, markBorder: cm?.borderWidth, markSize: mark ? `${Math.round(mark.getBoundingClientRect().width)}x${Math.round(mark.getBoundingClientRect().height)}` : null, markBg: cm?.backgroundColor }; });
  console.log("== forced-colors option card:", JSON.stringify(m));
  await page.screenshot({ path: "/private/tmp/claude-501/-Users-polinavasilyeva-a11y-checker/58064946-6f64-4bf0-a80e-1b63240e2a59/scratchpad/forced-form.png", clip: { x: 0, y: 900, width: 1280, height: 500 }, fullPage: true });
  await ctx.close();
}
await browser.close();
