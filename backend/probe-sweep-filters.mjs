// FINAL sweep: filters/toggles that strand content.
import { chromium } from "playwright";

const HELPERS = `
  const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
  const vis = el => !!el && el.getClientRects().length > 0;
  const txt = el => el ? (el.innerText || "").trim() : "";
  const chain = el => {
    const parts = []; let cur = el;
    for (let k = 0; k < 4 && cur && cur.nodeType === 1; k++) {
      parts.push((cur.classList && cur.classList[0]) || cur.tagName);
      cur = cur.parentElement;
    }
    return parts.join(" < ");
  };
  const byId = id => sr.querySelector('[id="' + (id||"").replace(/"/g,'') + '"]');
  // findings table rows = TRs containing a .a11y-dt-toggle
  const issueRows = () => [...sr.querySelectorAll('tbody tr')].filter(tr => tr.querySelector('.a11y-dt-toggle')).filter(vis);
  const detailRows = () => [...sr.querySelectorAll('tr.a11y-dt-expand-row')].filter(vis);
`;
const ev = (page, body) => page.evaluate(`(() => { ${HELPERS} ${body} })()`);

async function load(browser, state, width) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  await page.goto("http://localhost:5174/" + state);
  await page.waitForFunction(() => document.getElementById("a11y-widget-business-root")?.shadowRoot?.querySelector(".a11y-section, .a11y-url-form"), { timeout: 15000 });
  await page.waitForTimeout(1200);
  return page;
}
async function openAll(page) {
  for (let pass = 0; pass < 2; pass++) {
    await page.evaluate(() => {
      const sr = document.getElementById("a11y-widget-business-root").shadowRoot;
      sr.querySelectorAll('[aria-expanded="false"]').forEach(el => el.click());
    });
    await page.waitForTimeout(400);
  }
}

const results = { counts: {}, findings: [], log: [] };
const count = (k, n) => { results.counts[k] = (results.counts[k] || 0) + n; };
const finding = (state, width, where, evidence, severity) => results.findings.push({ state, width, where, evidence, severity });

const browser = await chromium.launch();

async function checkExpanders(page, key, state, width) {
  const rows = await ev(page, `
    const out = [];
    sr.querySelectorAll('[aria-expanded][aria-controls]').forEach(el => {
      const cid = el.getAttribute('aria-controls');
      const ctrl = byId(cid);
      out.push({ chain: chain(el), text: txt(el).slice(0,50), expanded: el.getAttribute('aria-expanded'),
        selfVisible: vis(el), cid, ctrlExists: !!ctrl, ctrlVisible: vis(ctrl), ctrlTextLen: txt(ctrl).length });
    });
    return out;
  `);
  count(key, rows.length);
  for (const r of rows) {
    if (r.expanded === "true" && r.selfVisible) {
      if (!r.ctrlExists) finding(state, width, r.chain, `expander "${r.text}" aria-expanded=true, aria-controls=${r.cid} but no such id exists`, "real");
      else if (r.ctrlTextLen === 0) finding(state, width, r.chain, `expander "${r.text}" open but controlled #${r.cid} innerText empty (ctrlVisible=${r.ctrlVisible})`, "real");
      else if (!r.ctrlVisible) finding(state, width, r.chain, `expander "${r.text}" open but controlled #${r.cid} has 0 client rects (textLen=${r.ctrlTextLen})`, "real");
    }
  }
}

async function checkLive(page, key, state, width) {
  const rows = await ev(page, `
    return [...sr.querySelectorAll('[role="status"],[role="alert"]')].map(el => {
      const r = el.getBoundingClientRect();
      return { chain: chain(el), role: el.getAttribute('role'), textLen: txt(el).length,
        rects: el.getClientRects().length, w: Math.round(r.width), h: Math.round(r.height),
        srOnly: el.classList.contains('a11y-sr-only') };
    });
  `);
  count(key, rows.length);
  for (const r of rows) {
    if (r.textLen === 0 && r.rects > 0 && !r.srOnly && r.w > 4 && r.h > 4)
      finding(state, width, r.chain, `role=${r.role} visible (${r.w}x${r.h}px) but innerText empty`, "real");
  }
}

async function checkTabs(page, key, state, width) {
  const tabs = await ev(page, `return [...sr.querySelectorAll('[role="tab"]')].map((el,i) => ({ i, text: txt(el).slice(0,40), chain: chain(el), visible: vis(el) }));`);
  count(key, tabs.length);
  for (const t of tabs) {
    if (!t.visible) continue;
    await ev(page, `[...sr.querySelectorAll('[role="tab"]')][${t.i}].click();`);
    await page.waitForTimeout(450);
    const m = await ev(page, `
      const tab = [...sr.querySelectorAll('[role="tab"]')][${t.i}];
      const panel = byId(tab.getAttribute('aria-controls'));
      return { sel: tab.getAttribute('aria-selected'), panelExists: !!panel, panelVisible: vis(panel),
        panelTextLen: txt(panel).length, panelSample: txt(panel).replace(/\\s+/g,' ').slice(0,80),
        nIssueRows: issueRows().length };
    `);
    results.log.push(`${key} tab "${t.text}": panelTextLen=${m.panelTextLen} sample="${m.panelSample}" issueRowsVisible=${m.nIssueRows}`);
    if (m.sel === "true" && (!m.panelExists || m.panelTextLen === 0 || !m.panelVisible))
      finding(state, width, t.chain, `tab "${t.text}" selected but its panel is ${!m.panelExists ? "missing" : !m.panelVisible ? "invisible" : "empty"}`, "real");
  }
  if (tabs.length) { await ev(page, `[...sr.querySelectorAll('[role="tab"]')][0].click();`); await page.waitForTimeout(300); }
}

async function dtToggles(page, key, state, width) {
  const n = await ev(page, `return [...sr.querySelectorAll('.a11y-dt-toggle')].filter(vis).length;`);
  count(key, n);
  for (let i = 0; i < n; i++) {
    await ev(page, `[...sr.querySelectorAll('.a11y-dt-toggle')].filter(vis)[${i}].click();`);
    await page.waitForTimeout(200);
    await ev(page, `const t=[...sr.querySelectorAll('.a11y-dt-toggle')].filter(vis)[${i}]; if(t.getAttribute('aria-expanded')!=='true') t.click();`);
    await page.waitForTimeout(300);
    const m = await ev(page, `
      const t = [...sr.querySelectorAll('.a11y-dt-toggle')].filter(vis)[${i}];
      const tr = t.closest('tr'); const next = tr && tr.nextElementSibling;
      const isDetail = next && next.classList.contains('a11y-dt-expand-row');
      return { expanded: t.getAttribute('aria-expanded'), isDetail, nextVisible: next ? vis(next) : false,
        nextTextLen: next ? txt(next).length : 0, rowText: tr ? txt(tr).replace(/\\s+/g,' ').slice(0,50) : '' };
    `);
    if (m.expanded === "true" && (!m.isDetail || !m.nextVisible || m.nextTextLen === 0))
      finding(state, width, "a11y-dt-toggle < a11y-dt-toggle-cell < TR < TBODY",
        `row "${m.rowText}" reopened (aria-expanded=true) but detail row present=${m.isDetail} visible=${m.nextVisible} textLen=${m.nextTextLen}`, "real");
  }
}

async function dnPanel(page, key, state, width) {
  const has = await ev(page, `return !!sr.querySelector('.a11y-dn-panel');`);
  if (!has) return;
  const measure = () => ev(page, `
    const panel = sr.querySelector('.a11y-dn-panel');
    const links = [...panel.querySelectorAll('.a11y-dn-link')];
    const visLinks = links.filter(vis).map(l => ({ text: txt(l).replace(/^×\\s*/,'').slice(0,50), expanded: l.getAttribute('aria-expanded') }));
    const detail = sr.querySelector('.a11y-dn-detail');
    const detailTitle = detail ? txt(detail.querySelector('.a11y-dn-detail-title')) : "";
    return { nLinksTotal: links.length, visLinks, detailExists: !!detail, detailVisible: vis(detail),
      detailTitle, detailBodyLen: detail ? Math.max(0, txt(detail).length - detailTitle.length) : 0,
      statusText: txt(panel.querySelector('.a11y-dn-status')) };
  `);
  const pills = await ev(page, `return [...sr.querySelectorAll('.a11y-dn-kind')].map((p,i)=>({i, text: txt(p)}));`);
  count(key, pills.length);
  const base = await measure();
  count(key, base.nLinksTotal);
  for (let li = 0; li < base.nLinksTotal; li++) {
    await ev(page, `[...sr.querySelectorAll('.a11y-dn-link')][${li}].click();`);
    await page.waitForTimeout(400);
    const m = await measure();
    if (!m.detailExists || !m.detailVisible || m.detailBodyLen < 20)
      finding(state, width, "a11y-dn-link < LI < a11y-dn-list < a11y-dn-panel",
        `note #${li} opened (no filter) but detail exists=${m.detailExists} visible=${m.detailVisible} bodyLen=${m.detailBodyLen}`, "real");
  }
  for (const p of pills) {
    await ev(page, `[...sr.querySelectorAll('.a11y-dn-kind')][${p.i}].click();`);
    await page.waitForTimeout(400);
    const m = await measure();
    count(key, m.visLinks.length + 1);
    if (m.visLinks.length === 0)
      finding(state, width, "a11y-dn-kind < LI < a11y-dn-kinds < a11y-dn-panel",
        `filter pill "${p.text}" pressed -> 0 visible notes (status: "${m.statusText}")`, "real");
    const claimed = (m.statusText.match(/Showing (\d+) of/) || [])[1];
    if (claimed && Number(claimed) !== m.visLinks.length)
      finding(state, width, "a11y-dn-status < a11y-dn-panel < a11y-section < DIV",
        `status claims ${claimed} notes but ${m.visLinks.length} visible after pressing "${p.text}"`, "real");
    for (let li = 0; li < m.visLinks.length; li++) {
      await ev(page, `[...sr.querySelectorAll('.a11y-dn-link')].filter(vis)[${li}].click();`);
      await page.waitForTimeout(400);
      const mm = await measure();
      if (!mm.detailVisible || mm.detailBodyLen < 20)
        finding(state, width, "a11y-dn-link < LI < a11y-dn-list < a11y-dn-panel",
          `filter "${p.text}" pressed, note "${(mm.visLinks[li]||{}).text}" opened but detail visible=${mm.detailVisible} bodyLen=${mm.detailBodyLen}`, "real");
    }
    await ev(page, `const el=[...sr.querySelectorAll('.a11y-dn-kind')][${p.i}]; if(el.getAttribute('aria-pressed')==='true') el.click();`);
    await page.waitForTimeout(300);
  }
  // cross: open note X unfiltered, press each pill, look for title-without-body or stranded body
  for (let li = 0; li < base.nLinksTotal; li++) {
    for (const p of pills) {
      await ev(page, `const el=[...sr.querySelectorAll('.a11y-dn-kind')].find(x=>x.getAttribute('aria-pressed')==='true'); if(el) el.click();`);
      await page.waitForTimeout(250);
      await ev(page, `const l=[...sr.querySelectorAll('.a11y-dn-link')][${li}]; if(l.getAttribute('aria-expanded')!=='true') l.click();`);
      await page.waitForTimeout(300);
      const before = await measure();
      await ev(page, `[...sr.querySelectorAll('.a11y-dn-kind')][${p.i}].click();`);
      await page.waitForTimeout(400);
      const after = await measure();
      count(key, 2);
      const openListed = after.visLinks.some(v => v.expanded === "true");
      if (openListed && (!after.detailVisible || after.detailBodyLen < 20) && before.detailVisible && before.detailBodyLen >= 20)
        finding(state, width, "a11y-dn-link < LI < a11y-dn-list < a11y-dn-panel",
          `open note "${before.detailTitle}" + press "${p.text}": title listed expanded but detail visible=${after.detailVisible} bodyLen=${after.detailBodyLen}`, "real");
      if (!openListed && after.detailVisible && after.detailBodyLen >= 20) {
        const t = before.detailTitle;
        const matches = after.visLinks.some(v => t && v.text.startsWith(t.slice(0, 20)));
        if (!matches)
          finding(state, width, "a11y-dn-detail < a11y-dn-panel < a11y-section < DIV",
            `open note "${before.detailTitle}" + press "${p.text}": detail body stays (len=${after.detailBodyLen}) but its title is filtered out of the list`, "borderline");
      }
    }
  }
  await ev(page, `const el=[...sr.querySelectorAll('.a11y-dn-kind')].find(x=>x.getAttribute('aria-pressed')==='true'); if(el) el.click();`);
  await page.waitForTimeout(250);
}

async function simButtons(page, key, state, width) {
  const btns = await ev(page, `return [...sr.querySelectorAll('.a11y-sim-btn')].map((b,i)=>({i, text: txt(b).split('\\n')[0]}));`);
  count(key, btns.length);
  for (const b of btns) {
    await ev(page, `[...sr.querySelectorAll('.a11y-sim-btn')][${b.i}].click();`);
    await page.waitForTimeout(450);
    const m = await ev(page, `
      const controls = sr.querySelector('.a11y-sim-controls');
      const section = controls ? controls.closest('.a11y-section') : null;
      const img = section ? section.querySelector('.a11y-sim-img, .a11y-sim-frame') : null;
      const imgR = img ? img.getBoundingClientRect() : null;
      return { imgExists: !!img, imgVisible: vis(img), imgW: imgR?Math.round(imgR.width):0, imgH: imgR?Math.round(imgR.height):0,
        captionText: txt(section ? section.querySelector('.a11y-sim-caption') : null).slice(0,80),
        statusText: txt(section ? section.querySelector('[role="status"]') : null).slice(0,80) };
    `);
    count(key, 2);
    if (!m.imgExists || !m.imgVisible || m.imgH < 10)
      finding(state, width, "a11y-sim-frame < a11y-section < a11y-report < a11y-shell-content",
        `sim "${b.text}" pressed -> preview exists=${m.imgExists} visible=${m.imgVisible} ${m.imgW}x${m.imgH}`, "real");
    if (!m.statusText && !m.captionText)
      finding(state, width, "a11y-sim-controls < a11y-section < a11y-report < a11y-shell-content",
        `sim "${b.text}" pressed -> caption and role=status both empty`, "real");
  }
  if (btns.length) { await ev(page, `[...sr.querySelectorAll('.a11y-sim-btn')][0].click();`); await page.waitForTimeout(300); }
}

async function modePills(page, key, state, width) {
  const pills = await ev(page, `return [...sr.querySelectorAll('.a11y-mode-btn')].map((b,i)=>({i, text: txt(b)}));`);
  if (!pills.length) return;
  count(key, pills.length);
  for (const p of pills) {
    await ev(page, `[...sr.querySelectorAll('.a11y-mode-btn')][${p.i}].click();`);
    await page.waitForTimeout(500);
    await openAll(page);
    const m = await ev(page, `
      const rows = issueRows(); const det = detailRows();
      const empty = [...sr.querySelectorAll('.a11y-empty')].filter(vis).map(e=>txt(e).slice(0,60));
      const emptyDetails = det.filter(d => txt(d).length === 0).length;
      return { nRows: rows.length, nDetails: det.length, emptyDetails, emptyMsgs: empty,
        rowSamples: rows.slice(0,3).map(r=>txt(r).replace(/\\s+/g,' ').slice(0,40)) };
    `);
    count(key, m.nRows + m.nDetails + 1);
    results.log.push(`${key} mode "${p.text}": issueRows=${m.nRows} detailRows=${m.nDetails} emptyDetailRows=${m.emptyDetails} emptyMsg="${m.emptyMsgs.join(';')}"`);
    if (m.nRows === 0 && m.emptyMsgs.length === 0)
      finding(state, width, "a11y-mode-btn < a11y-mode < a11y-report < a11y-shell-content",
        `mode "${p.text}" pressed -> 0 visible issue rows and no visible empty-state message`, "real");
    if (m.emptyDetails > 0)
      finding(state, width, "a11y-dt-expand-row < TBODY < TABLE < DIV",
        `mode "${p.text}" pressed -> ${m.emptyDetails} open detail rows with empty innerText`, "real");
  }
  // interplay: clean tab selected + each mode pill
  const hasTabs = await ev(page, `return [...sr.querySelectorAll('[role="tab"]')].length > 1;`);
  if (hasTabs) {
    for (const p of pills) {
      await ev(page, `[...sr.querySelectorAll('[role="tab"]')][1].click();`);
      await page.waitForTimeout(400);
      await ev(page, `[...sr.querySelectorAll('.a11y-mode-btn')][${p.i}].click();`);
      await page.waitForTimeout(500);
      const m = await ev(page, `
        const tab = [...sr.querySelectorAll('[role="tab"]')][1];
        const panel = byId(tab.getAttribute('aria-controls'));
        const cleanItems = panel ? [...panel.querySelectorAll('li, tr, [class*="clean"], [class*="pass"]')].filter(vis).filter(e=>txt(e).length>0) : [];
        const empty = [...sr.querySelectorAll('.a11y-empty')].filter(vis).map(e=>txt(e).slice(0,60));
        return { sel: tab.getAttribute('aria-selected'), panelVisible: vis(panel), panelTextLen: txt(panel).length,
          panelSample: txt(panel).replace(/\\s+/g,' ').slice(0,90), nItems: cleanItems.length, emptyMsgs: empty };
      `);
      count(key, m.nItems + 1);
      results.log.push(`${key} cleanTab+mode "${p.text}": sel=${m.sel} panelTextLen=${m.panelTextLen} items=${m.nItems} empty="${m.emptyMsgs.join(';')}" sample="${m.panelSample}"`);
      if (m.sel === "true" && m.panelVisible && m.panelTextLen === 0 && m.emptyMsgs.length === 0)
        finding(state, width, "a11y-tabpanel < a11y-tabs < a11y-report < a11y-shell-content",
          `clean tab selected + mode "${p.text}" -> tabpanel empty with no empty-state`, "real");
      // reset to issues tab + All
      await ev(page, `[...sr.querySelectorAll('[role="tab"]')][0].click();`);
      await page.waitForTimeout(250);
      await ev(page, `[...sr.querySelectorAll('.a11y-mode-btn')][0].click();`);
      await page.waitForTimeout(250);
    }
  }
  await ev(page, `const b=[...sr.querySelectorAll('.a11y-mode-btn')][0]; if(b) b.click();`);
  await page.waitForTimeout(300);
}

async function audienceSwitch(page, key, state, width) {
  const opts = await ev(page, `return [...sr.querySelectorAll('.a11y-settings-opt')].map((b,i)=>({i, text: txt(b), pressed: b.getAttribute('aria-pressed')}));`);
  if (!opts.length) return;
  count(key, opts.length);
  const other = opts.find(o => o.pressed !== "true");
  if (!other) return;
  await ev(page, `[...sr.querySelectorAll('.a11y-settings-opt')][${other.i}].click();`);
  await page.waitForTimeout(900);
  const m = await ev(page, `
    const secs = [...sr.querySelectorAll('.a11y-section')].filter(vis);
    return { nSections: secs.length, totalTextLen: txt(sr.querySelector('.a11y-report') || sr).length };
  `);
  count(key, m.nSections);
  if (m.nSections === 0 || m.totalTextLen < 200)
    finding(state, width, "a11y-settings-opt < a11y-settings-switch < a11y-settings-row < a11y-settings",
      `audience switch to "${other.text}" -> sections=${m.nSections}, textLen=${m.totalTextLen}`, "real");
  results.log.push(`${key} audience->"${other.text}": sections=${m.nSections} textLen=${m.totalTextLen}`);
}

const REPORT_STATES = ["?fixture=report", "?fixture=report&audience=professional", "?fixture=report&scope=site"];
const OTHER_STATES = ["?fixture", "?fixture=error", "?fixture=blocked"];

for (const width of [1280, 414]) {
  for (const state of REPORT_STATES) {
    const key = `${state}@${width}`;
    try {
      const page = await load(browser, state, width);
      await openAll(page);
      await checkExpanders(page, key, state, width);
      await checkLive(page, key, state, width);
      await checkTabs(page, key, state, width);
      await dtToggles(page, key, state, width);
      await dnPanel(page, key, state, width);
      await simButtons(page, key, state, width);
      await modePills(page, key, state, width);
      await audienceSwitch(page, key, state, width);
      await page.close();
    } catch (e) { results.log.push(`ERROR ${key}: ${e.message.slice(0, 300)}`); }
  }
}
for (const state of OTHER_STATES) {
  const key = `${state}@1280`;
  try {
    const page = await load(browser, state, 1280);
    await openAll(page);
    await checkExpanders(page, key, state, 1280);
    await checkLive(page, key, state, 1280);
    await page.close();
  } catch (e) { results.log.push(`ERROR ${key}: ${e.message.slice(0, 300)}`); }
}

await browser.close();
console.log(JSON.stringify(results, null, 1));
