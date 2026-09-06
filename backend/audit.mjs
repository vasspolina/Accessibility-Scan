import { chromium } from "playwright";
const browser = await chromium.launch();
const S = (root) => root; // helper placeholder
const states = [["form","?fixture=form","h2"],["report","?fixture=report","#a11y-score-heading"],["pro","?fixture=report&audience=professional","#a11y-score-heading"],["site","?fixture=report&scope=site","#a11y-audit-pages-heading, #a11y-score-heading"],["error","?fixture=error","h2"]];
const findings = [];
const note = (state, rule, detail) => findings.push({ state, rule, detail });

for (const [fx, q, waitSel] of states) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:5174/${q}`);
  await page.locator(waitSel).first().waitFor({ timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(500);

  const structural = await page.evaluate(() => {
    const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner"));
    const root = host.shadowRoot; const out = {};
    const vis = (el) => { const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && c.display !== "none"; };
    // 1. heading outline
    const hs = [...root.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter(vis).map((h) => ({ l: +h.tagName[1], t: h.textContent.trim().replace(/\s+/g, " ").slice(0, 50) }));
    out.headings = hs; out.skips = []; for (let i = 1; i < hs.length; i++) if (hs[i].l > hs[i - 1].l + 1) out.skips.push(`${hs[i - 1].l}→${hs[i].l} at "${hs[i].t}"`);
    out.h1 = hs.filter((h) => h.l === 1).length;
    // 2. landmarks
    out.landmarks = [...root.querySelectorAll("main,nav,aside,header,footer,form,section[aria-label],section[aria-labelledby],[role=region],[role=navigation],[role=main]")].filter(vis).map((l) => { const name = l.getAttribute("aria-label") || (l.getAttribute("aria-labelledby") && root.getElementById(l.getAttribute("aria-labelledby"))?.textContent.trim().slice(0, 40)) || ""; return `${l.tagName.toLowerCase()}${l.getAttribute("role") ? "[" + l.getAttribute("role") + "]" : ""}:${name}`; });
    const navs = out.landmarks.filter((x) => x.startsWith("nav")); out.unnamedNavs = navs.filter((x) => x.endsWith(":")).length; out.dupNavNames = navs.length - new Set(navs).size;
    // 3. focusables
    const foc = [...root.querySelectorAll("a[href],button,input,select,textarea,[tabindex]")].filter((e) => !e.disabled && e.tabIndex >= 0 && vis(e) && !e.closest("[aria-hidden=true]"));
    const nameOf = (e) => (e.getAttribute("aria-label") || (e.getAttribute("aria-labelledby") && [...e.getAttribute("aria-labelledby").split(" ")].map((id) => root.getElementById(id)?.textContent || "").join(" ")) || (e.id && root.querySelector(`label[for="${e.id}"]`)?.textContent) || e.closest("label")?.textContent || e.textContent || e.getAttribute("title") || e.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ");
    out.focusables = foc.length;
    out.unnamed = foc.filter((e) => !nameOf(e)).map((e) => e.outerHTML.slice(0, 80));
    out.smallTargets = foc.filter((e) => { const r = e.getBoundingClientRect(); return (r.width < 24 || r.height < 24) && !(e.tagName === "A" && e.closest("p,li,td")); }).map((e) => `${e.tagName}:${nameOf(e).slice(0, 25)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    out.positiveTabindex = foc.filter((e) => e.tabIndex > 0).length;
    // hidden-but-focusable
    out.hiddenFocusable = [...root.querySelectorAll("a[href],button,input,select,textarea,[tabindex='0']")].filter((e) => !e.disabled && e.tabIndex >= 0 && !vis(e) && !e.closest("[hidden]") && !e.closest("[aria-hidden=true]") && getComputedStyle(e).display !== "none" && !e.className.includes("sr-only") && !e.className.includes("skip")).map((e) => e.outerHTML.slice(0, 70));
    // 6. aria-controls / expanded
    out.brokenControls = [...root.querySelectorAll("[aria-controls]")].flatMap((e) => e.getAttribute("aria-controls").split(" ")).filter((id) => !root.getElementById(id) && !document.getElementById(id));
    out.expandedWithoutControls = [...root.querySelectorAll("[aria-expanded]")].filter((e) => !e.hasAttribute("aria-controls")).length;
    // 7. live regions
    out.liveRegions = [...root.querySelectorAll("[role=status],[role=alert],[aria-live]")].length;
    // 12. images
    out.imgNoAlt = [...root.querySelectorAll("img")].filter((i) => !i.hasAttribute("alt")).length;
    out.svgNoHidden = [...root.querySelectorAll("svg")].filter((s) => s.getAttribute("aria-hidden") !== "true" && !s.getAttribute("role") && !s.querySelector("title")).length;
    // lang
    out.lang = { host: host.getAttribute("lang"), inner: root.querySelector(".a11y-widget-inner")?.getAttribute("lang"), doc: document.documentElement.lang };
    // tables
    out.tablesNoCaption = [...root.querySelectorAll("table")].filter(vis).filter((t) => !t.querySelector("caption") && !t.getAttribute("aria-label") && !t.getAttribute("aria-labelledby")).length;
    out.thNoScope = [...root.querySelectorAll("table th")].filter((th) => !th.getAttribute("scope")).length;
    // colour-only: current/pressed states must carry a non-colour cue
    const cue = (el) => { const c = getComputedStyle(el); return { weight: c.fontWeight, underline: c.textDecorationLine, border: c.borderBottomWidth + " " + c.borderWidth, bg: c.backgroundColor }; };
    out.currentRail = [...root.querySelectorAll('.a11y-shell-nav-link[aria-current="true"]')].map((e) => cue(e));
    out.railOther = root.querySelector('.a11y-shell-nav-link:not([aria-current="true"])') ? cue(root.querySelector('.a11y-shell-nav-link:not([aria-current="true"])')) : null;
    return out;
  });
  const s = structural;
  if (s.h1 > 1) note(fx, "1.3.1 headings", `${s.h1} h1s`);
  if (s.skips.length) note(fx, "1.3.1 heading levels skipped", s.skips.join("; "));
  if (s.unnamedNavs) note(fx, "1.3.1/2.4.1 nav without a name", `${s.unnamedNavs}`);
  if (s.dupNavNames) note(fx, "landmarks with the same name", `${s.dupNavNames}`);
  if (s.unnamed.length) note(fx, "4.1.2 control without an accessible name", s.unnamed.join(" | "));
  if (s.smallTargets.length) note(fx, "2.5.8 target under 24px", s.smallTargets.join(" | "));
  if (s.positiveTabindex) note(fx, "2.4.3 positive tabindex", `${s.positiveTabindex}`);
  if (s.hiddenFocusable.length) note(fx, "2.4.3 hidden but focusable", s.hiddenFocusable.join(" | "));
  if (s.brokenControls.length) note(fx, "aria-controls points nowhere", s.brokenControls.join(", "));
  if (s.expandedWithoutControls) note(fx, "aria-expanded without aria-controls", `${s.expandedWithoutControls}`);
  if (s.imgNoAlt) note(fx, "1.1.1 img without alt", `${s.imgNoAlt}`);
  if (s.svgNoHidden) note(fx, "1.1.1 svg neither hidden nor named", `${s.svgNoHidden}`);
  if (s.tablesNoCaption) note(fx, "1.3.1 table without caption/name", `${s.tablesNoCaption}`);
  if (s.thNoScope) note(fx, "1.3.1 th without scope", `${s.thNoScope}`);
  if (fx === "report" && s.currentRail.length) { const c = s.currentRail[0], o = s.railOther; if (o && c.weight === o.weight && c.underline === o.underline && c.border === o.border) note(fx, "1.4.1 current rail item by colour alone", JSON.stringify(c)); }
  console.log(`\n== ${fx}: ${s.focusables} focusables, ${s.headings.length} headings, ${s.liveRegions} live regions, lang=${JSON.stringify(s.lang)}`);
  console.log("   landmarks:", s.landmarks.join(" · ").slice(0, 400));

  // 4. keyboard walk: every stop gets a ring, no trap, focus leaves the widget
  const stops = []; let left = false; let lastKey = null; const seen = new Set();
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => { const d = (r) => r.activeElement?.shadowRoot ? d(r.activeElement.shadowRoot) : r.activeElement; const el = d(document); if (!el || el === document.body) return { body: true }; const inWidget = Boolean(el.getRootNode().host); const c = getComputedStyle(el); const w = el.closest(".a11y-input-shell"); const cw = w && getComputedStyle(w); const ring = (c.outlineStyle !== "none" && parseFloat(c.outlineWidth) > 0) || c.boxShadow !== "none" || (cw && cw.outlineStyle !== "none" && parseFloat(cw.outlineWidth) > 0); const r = el.getBoundingClientRect(); return { key: el.tagName + "|" + (el.id || el.className || "") + "|" + (el.textContent || "").trim().slice(0, 20), inWidget, ring, offscreen: r.width === 0 || r.height === 0, tag: el.tagName, text: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 30) }; });
    if (info.body) { left = true; break; }
    if (!info.inWidget) { left = true; break; }
    if (seen.has(info.key)) { note(fx, "2.1.2 keyboard trap or cycle", `focus returned to ${info.key} after ${stops.length} stops`); break; }
    seen.add(info.key); stops.push(info);
    if (!info.ring && !info.offscreen) note(fx, "2.4.7 focus not visible", `${info.tag}:${info.text}`);
  }
  console.log(`   keyboard: ${stops.length} stops, ${left ? "focus leaves the widget" : "DID NOT LEAVE"}`);
  if (!left) note(fx, "2.1.2 focus never leaves the widget", `${stops.length} stops`);

  // 10. reduced motion
  await page.emulateMedia({ reducedMotion: "reduce" });
  const anim = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); return [...host.shadowRoot.querySelectorAll("*")].filter((e) => { const c = getComputedStyle(e); return (c.animationName !== "none" && parseFloat(c.animationDuration) > 0) || parseFloat(c.transitionDuration) > 0.2; }).map((e) => e.className.toString().slice(0, 40)).slice(0, 5); });
  if (anim.length) note(fx, "2.3.3 motion still runs under prefers-reduced-motion", anim.join(", "));
  await page.emulateMedia({ reducedMotion: null });

  // 8. text spacing (1.4.12) and 9. zoom 200 / 400 (1.4.10)
  await page.addStyleTag({ content: `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }` });
  await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const st = document.createElement("style"); st.textContent = `* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }`; host.shadowRoot.appendChild(st); });
  await page.waitForTimeout(300);
  const clipped = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const out = []; for (const e of host.shadowRoot.querySelectorAll("p,li,dd,span,button,a,h1,h2,h3,label")) { const c = getComputedStyle(e); if ((c.overflow === "hidden" || c.overflowX === "hidden") && e.scrollWidth > e.clientWidth + 2 && c.textOverflow !== "ellipsis" && e.textContent.trim()) out.push(e.className.toString().slice(0, 30) + ":" + e.textContent.trim().slice(0, 20)); } return { clipped: out.slice(0, 5), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  if (clipped.clipped.length) note(fx, "1.4.12 text clipped under text spacing", clipped.clipped.join(" | "));
  if (clipped.overflow) note(fx, "1.4.12 page overflows under text spacing", `${clipped.overflow}px`);
  for (const w of [640, 320]) { await page.setViewportSize({ width: w, height: 800 }); await page.waitForTimeout(250); const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); if (o > 0) note(fx, `1.4.10 reflow at ${w}px (${w === 640 ? "200%" : "400%"} zoom) with text spacing`, `${o}px overflow`); }
  await ctx.close();
}

// forced colours: pressed/current cues survive
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, forcedColors: "active" });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5174/?fixture=report"); await page.locator("#a11y-score-heading").waitFor({ timeout: 60000 }); await page.waitForTimeout(400);
  const fc = await page.evaluate(() => { const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const root = host.shadowRoot; const cue = (el) => { if (!el) return null; const c = getComputedStyle(el); return `w${c.fontWeight} ${c.textDecorationLine} bb${c.borderBottomWidth} b${c.borderWidth} ${c.outlineStyle}`; }; return { chipOn: cue(root.querySelector('.a11y-sim-btn[aria-pressed="true"]')), chipOff: cue(root.querySelector('.a11y-sim-btn[aria-pressed="false"]')), railOn: cue(root.querySelector('.a11y-shell-nav-link[aria-current="true"]')), railOff: cue(root.querySelector('.a11y-shell-nav-link:not([aria-current="true"])')), optOn: cue(root.querySelector(".a11y-optioncard:has(> input:checked)")), optOff: cue(root.querySelector(".a11y-optioncard:not(:has(> input:checked))")), settingsOn: cue(root.querySelector('.a11y-settings-opt[aria-pressed="true"]')), settingsOff: cue(root.querySelector('.a11y-settings-opt[aria-pressed="false"]')) }; });
  console.log("\n== forced-colors cues:", JSON.stringify(fc));
  for (const k of ["chip", "rail", "opt", "settings"]) if (fc[k + "On"] && fc[k + "On"] === fc[k + "Off"]) note("forced-colors", `1.4.1 ${k} state by colour alone in forced colours`, fc[k + "On"]);
  await ctx.close();
}

// form error handling and dialog behaviour
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto("http://localhost:5174/?fixture=form"); await page.waitForTimeout(800);
  await page.getByRole("button", { name: /Start the scan/ }).click();
  await page.waitForTimeout(300);
  const err = await page.evaluate(() => { const d = (r) => r.activeElement?.shadowRoot ? d(r.activeElement.shadowRoot) : r.activeElement; const el = d(document); const host = [...document.querySelectorAll("*")].find((e) => e.shadowRoot?.querySelector(".a11y-widget-inner")); const root = host.shadowRoot; const input = root.querySelector("input[type=url], input[type=text]"); const desc = input?.getAttribute("aria-describedby"); const descText = desc ? desc.split(" ").map((i) => root.getElementById(i)?.textContent || "").join(" ").trim() : ""; const alert = root.querySelector("[role=alert],[aria-live=assertive]"); return { focusOn: el?.tagName + (el?.id ? "#" + el.id : ""), invalid: input?.getAttribute("aria-invalid"), descText: descText.slice(0, 80), alertText: alert?.textContent.trim().slice(0, 80) }; });
  console.log("\n== empty submit:", JSON.stringify(err));
  if (err.focusOn !== "INPUT" && !err.focusOn.startsWith("INPUT")) note("form", "3.3.1 focus not moved to the invalid field on submit", err.focusOn);
  if (err.invalid !== "true") note("form", "3.3.1 aria-invalid not set on empty submit", String(err.invalid));
  if (!err.descText && !err.alertText) note("form", "3.3.1 no error text associated or announced", "");
  await ctx.close();
}
console.log("\n==== FINDINGS", findings.length);
for (const f of findings) console.log(`- [${f.state}] ${f.rule}: ${f.detail}`);
await browser.close();
