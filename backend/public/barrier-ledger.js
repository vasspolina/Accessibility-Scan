// The barrier-report ledger (barrier-ledger.html). Reads GET
// /api/pilot/reports with the admin token and writes the scan's mark with
// POST /api/pilot/reports/:id/check. Every word a participant or the model
// wrote is set with textContent, never as HTML, and only http(s) addresses
// become links.

const TOKEN_KEY = "barrier-ledger-token";
const NAME_KEY = "barrier-ledger-name";
/** The Site filter's value for a report with no page. Not a possible host. */
const NO_PAGE = "(none)";

const TECH_NAMES = {
  "screen-reader": "Screen reader",
  "keyboard-only": "Keyboard only",
  "screen-magnifier": "Screen magnifier",
  "voice-control": "Voice control",
  switch: "Switch device",
  other: "Something else",
};
const CHECK_WORDS = { caught: "Caught", missed: "Missed", unclear: "Can’t tell" };
const IMPACT_WORDS = {
  blocked: "It stopped them",
  slowed: "It slowed them down",
  annoyed: "It got in their way",
  unrated: "Not rated",
};

const $ = (id) => document.getElementById(id);
const state = { token: "", reports: [], totals: null, open: new Set() };

// ---------- small helpers ----------

function store(kind, key, value) {
  try {
    const s = kind === "session" ? sessionStorage : localStorage;
    if (value === undefined) return s.getItem(key) ?? "";
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // A private window or blocked storage: the page works, it only forgets.
  }
  return "";
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

function safeHref(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** "screen-reader: NVDA with Firefox" → kind and the words they typed. */
function techOf(raw) {
  const i = raw.indexOf(": ");
  const key = i === -1 ? raw : raw.slice(0, i);
  const detail = i === -1 ? "" : raw.slice(i + 2);
  return { key, name: TECH_NAMES[key] ?? raw, detail };
}

const dateShort = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const dateYear = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateLong = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
function shortDate(iso) {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? dateShort.format(d) : dateYear.format(d);
}

function firstWords(text, max = 160) {
  const line = text.split("\n")[0].replace(/\s+\(picked from the suggested answers, not typed\)$/, "");
  return line.length > max ? `${line.slice(0, max).replace(/\s+\S*$/, "")} …` : line;
}

function scanKey(r) {
  return r.check ? r.check.result : "none";
}

// ---------- the request ----------

async function api(path, init = {}) {
  const res = await fetch(path, {
    ...init,
    headers: { authorization: `Bearer ${state.token}`, ...(init.body ? { "content-type": "application/json" } : {}) },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    // Not JSON: the status says enough.
  }
  return { status: res.status, body };
}

async function load() {
  const status = $("signin-status");
  status.textContent = "Loading the reports …";
  let res;
  try {
    res = await api("/api/pilot/reports");
  } catch {
    status.textContent = "The server could not be reached. Check your connection and try again.";
    return false;
  }
  if (res.status === 403) {
    status.textContent = res.body?.error === "Closed" ? "Reading the reports is closed: ADMIN_TOKEN is not set on the server." : "That token was refused.";
    store("session", TOKEN_KEY, null);
    showSignin();
    return false;
  }
  if (res.status === 501) {
    status.textContent = `Storage is not set up, so no reports are kept. ${res.body?.detail ?? ""}`.trim();
    showSignin();
    return false;
  }
  if (res.status !== 200 || !res.body) {
    status.textContent = `The server answered ${res.status}. Try again in a moment.`;
    return false;
  }
  state.reports = res.body.reports;
  state.totals = res.body.totals;
  status.textContent = "";
  store("session", TOKEN_KEY, state.token);
  showLedger();
  return true;
}

function showSignin() {
  $("ledger").hidden = true;
  $("signin").hidden = false;
}

function showLedger() {
  $("signin").hidden = true;
  $("ledger").hidden = false;
  renderTotals();
  renderFilters();
  renderRows();
}

// ---------- totals ----------

function tallyItem(n, label) {
  return el("li", {}, el("span", { class: "n", text: String(n) }), el("span", { class: "l", text: label }));
}

function renderTotals() {
  const r = state.reports;
  const t = state.totals;
  const count = (k) => r.filter((x) => scanKey(x) === k).length;
  $("totals").replaceChildren(
    tallyItem(t.reports, t.reports === 1 ? "Report" : "Reports"),
    tallyItem(t.participants, t.participants === 1 ? "Person" : "People"),
    tallyItem(t.confirmed, "Drafts sent as written"),
    tallyItem(count("caught"), "Caught by the scan"),
    tallyItem(count("missed"), "Missed by the scan"),
    tallyItem(count("unclear"), "Can’t tell"),
    tallyItem(count("none"), "Not checked yet")
  );
  const byTech = new Map();
  for (const x of r) {
    const { name } = techOf(x.assistiveTech);
    byTech.set(name, (byTech.get(name) ?? 0) + 1);
  }
  const items = [...byTech].sort((a, b) => b[1] - a[1]).map(([name, n]) => tallyItem(n, name));
  $("by-tech").replaceChildren(...(items.length ? items : [el("li", {}, el("span", { class: "l", text: "No reports yet." }))]));
}

// ---------- filters ----------

function options(select, values, keep) {
  select.replaceChildren(...values.map(([value, label]) => el("option", { value, text: label })));
  if (values.some(([v]) => v === keep)) select.value = keep;
}

function renderFilters() {
  const techs = new Map();
  const sites = new Map();
  for (const r of state.reports) {
    const t = techOf(r.assistiveTech);
    techs.set(t.key, t.name);
    const h = r.pageUrl ? hostOf(r.pageUrl) : null;
    sites.set(h ?? NO_PAGE, h ?? "No page given");
  }
  options($("f-tech"), [["", "Everything"], ...[...techs].sort((a, b) => a[1].localeCompare(b[1]))], $("f-tech").value);
  options($("f-site"), [["", "Every site"], ...[...sites].sort((a, b) => a[1].localeCompare(b[1]))], $("f-site").value);
  options(
    $("f-scan"),
    [["", "All"], ["none", "Not checked yet"], ["caught", "Caught"], ["missed", "Missed"], ["unclear", "Can’t tell"]],
    $("f-scan").value
  );
}

function shownReports() {
  const tech = $("f-tech").value;
  const site = $("f-site").value;
  const scan = $("f-scan").value;
  return state.reports.filter((r) => {
    if (tech && techOf(r.assistiveTech).key !== tech) return false;
    if (site && ((r.pageUrl ? hostOf(r.pageUrl) : null) ?? NO_PAGE) !== site) return false;
    if (scan && scanKey(r) !== scan) return false;
    return true;
  });
}

// ---------- rows ----------

function scanMark(r) {
  if (!r.check) return el("span", { class: "mark mark-none", text: "Not checked" });
  return el("span", { class: `mark mark-${r.check.result}`, text: CHECK_WORDS[r.check.result] ?? r.check.result });
}

function renderRows() {
  const shown = shownReports();
  const all = state.reports.length;
  $("shown").textContent = shown.length === all ? `${all} ${all === 1 ? "report" : "reports"}.` : `Showing ${shown.length} of ${all} reports.`;
  const rows = [];
  if (!shown.length) {
    rows.push(el("div", { role: "row", class: "empty" }, el("span", { role: "cell", text: all ? "No report matches these filters." : "No reports yet." })));
  }
  for (const r of shown) {
    const open = state.open.has(r.id);
    const tech = techOf(r.assistiveTech);
    const host = r.pageUrl ? hostOf(r.pageUrl) : null;
    const detailId = `detail-${r.id}`;
    const toggle = el(
      "button",
      { type: "button", class: "toggle", "aria-expanded": open ? "true" : "false", "aria-controls": detailId },
      el("span", { class: "caret", "aria-hidden": "true" }),
      el("span", { class: "words", text: firstWords(r.barrier) })
    );
    toggle.addEventListener("click", () => {
      if (state.open.has(r.id)) state.open.delete(r.id);
      else state.open.add(r.id);
      renderRows();
      document.querySelector(`[aria-controls="${detailId}"]`)?.focus();
    });
    rows.push(
      el(
        "div",
        { role: "row", class: "row", "data-open": open },
        el("span", { role: "cell", class: "cell c-date num", "data-label": "Reported", text: shortDate(r.createdAt) }),
        el("span", { role: "cell", class: "cell c-tech", "data-label": "Uses" }, tech.name, tech.detail ? el("span", { class: "sub", text: tech.detail }) : null),
        el("span", { role: "cell", class: "cell c-site", "data-label": "Site", text: host ?? "No page given" }),
        el("span", { role: "cell", class: "cell c-what" }, toggle),
        el("span", { role: "cell", class: "cell c-scan" }, scanMark(r))
      )
    );
    if (open) rows.push(el("div", { role: "row", id: detailId, class: "detail" }, el("div", { role: "cell", "aria-colspan": "5" }, detail(r))));
  }
  $("rows").replaceChildren(...rows);
}

// ---------- an opened report ----------

function kv(pairs) {
  const dl = el("dl", { class: "kv" });
  for (const [k, v] of pairs) if (v) dl.append(el("dt", { text: k }), el("dd", {}, v));
  return dl;
}

function detail(r) {
  const tech = techOf(r.assistiveTech);
  const href = r.pageUrl ? safeHref(r.pageUrl) : null;

  const theirs = el(
    "div",
    { class: "side" },
    el("h3", { text: "In their words" }),
    el("p", { class: "words-said", text: r.barrier }),
    kv([
      ["Doing", r.task || null],
      ["Uses", tech.detail ? `${tech.name}: ${tech.detail}` : tech.name],
      ["Held back", IMPACT_WORDS[r.impact] ?? r.impact],
      ["Page", href ? el("a", { href, target: "_blank", rel: "noopener noreferrer", text: r.pageUrl }) : r.pageUrl || "No page given"],
      ["Reported", dateLong.format(new Date(r.createdAt))],
      ["Person", el("span", { class: "num", text: r.participant.slice(0, 8) })],
    ])
  );

  const d = r.draft;
  const draft = el("div", { class: "side" }, el("h3", { text: "The model’s draft" }));
  if (!d) {
    draft.append(el("p", { text: "No draft. They sent their own words only." }));
  } else {
    draft.append(el("p", {}, el("strong", { text: d.title })));
    if (d.fromScan) draft.append(el("p", { class: "small", text: "Drafted from a scan of the page, not from their words." }));
    draft.append(el("span", { class: "part-label", text: "What happens" }), el("p", { text: d.explanation }));
    if (d.whoItStops) draft.append(el("span", { class: "part-label", text: "Who it stops" }), el("p", { text: d.whoItStops }));
    if (d.steps?.length) draft.append(el("span", { class: "part-label", text: "Check it yourself" }), el("ol", {}, ...d.steps.map((s) => el("li", { text: s }))));
    draft.append(el("span", { class: "part-label", text: "What to change" }), el("p", { text: d.fix }));
    draft.append(
      kv([
        ["Criterion", d.wcagCriterion ? `${d.wcagCriterion}, the model’s guess, not checked` : null],
        ["Estimate", d.impact ? `${IMPACT_WORDS[d.impact] ?? d.impact}, the model’s estimate${d.impactCapped ? ", lowered by rule for a link" : ""}` : null],
        ["Model", r.draftModel],
        ["Sent", r.confirmed ? "They read the draft and sent it as written." : "They sent it without confirming the draft."],
      ])
    );
  }

  return el("div", {}, el("div", { class: "pair" }, theirs, draft), checkForm(r, href));
}

function checkForm(r, href) {
  const id = r.id;
  const wrap = el("div", { class: "check" }, el("h3", { text: "Did the scan catch it?" }));
  const now = el("p", { class: "now" });
  if (r.check) {
    now.append(
      "Marked ",
      scanMark(r),
      ` by ${r.check.decidedBy}, ${dateLong.format(new Date(r.check.decidedAt))}.`,
      r.check.note ? ` ${r.check.note}` : ""
    );
  } else {
    now.textContent = "Not checked yet. Scan the page, read the findings beside their words, then mark it.";
  }
  wrap.append(now);

  const links = el("div", { class: "links" });
  if (href) links.append(el("a", { class: "btn", href, target: "_blank", rel: "noopener noreferrer", text: "Open the page" }));
  links.append(el("a", { class: "btn", href: "/demo.html", target: "_blank", rel: "noopener", text: "Open the scanner" }));
  if (r.check) {
    const historyBtn = el("button", { type: "button", "aria-expanded": "false", "aria-controls": `history-${id}`, text: "Earlier marks" });
    const list = el("ul", { class: "history", id: `history-${id}`, hidden: true });
    historyBtn.addEventListener("click", async () => {
      const opening = list.hidden;
      historyBtn.setAttribute("aria-expanded", opening ? "true" : "false");
      list.hidden = !opening;
      if (!opening || list.childElementCount) return;
      list.append(el("li", { text: "Loading …" }));
      const res = await api(`/api/pilot/reports/${encodeURIComponent(id)}/checks`).catch(() => null);
      const checks = res?.body?.checks ?? [];
      list.replaceChildren(
        ...(checks.length
          ? checks.map((c) => el("li", { text: `${CHECK_WORDS[c.result] ?? c.result}, by ${c.decidedBy}, ${dateLong.format(new Date(c.decidedAt))}.${c.note ? ` ${c.note}` : ""}` }))
          : [el("li", { text: res ? "No marks." : "The marks could not be loaded." })])
      );
    });
    links.append(historyBtn);
    wrap.append(links, list);
  } else {
    wrap.append(links);
  }

  const form = el("form", { novalidate: true });
  const fs = el("fieldset", {}, el("legend", { text: "What the scan did" }));
  const choices = el("div", { class: "choices" });
  for (const [value, label] of Object.entries(CHECK_WORDS)) {
    const input = el("input", { type: "radio", name: `result-${id}`, value, checked: r.check?.result === value });
    choices.append(el("label", {}, input, label));
  }
  fs.append(choices);
  const noteId = `note-${id}`;
  const nameId = `name-${id}`;
  const note = el("textarea", { id: noteId, rows: "2" });
  const name = el("input", { id: nameId, type: "text", autocomplete: "name", value: store("local", NAME_KEY) || undefined });
  const msg = el("span", { class: "small", role: "status" });
  form.append(
    fs,
    el(
      "div",
      { class: "fields" },
      el("div", {}, el("label", { for: noteId, text: "Note (which finding, or why not)" }), note),
      el("div", {}, el("label", { for: nameId, text: "Your name" }), name)
    ),
    el("div", { class: "save" }, el("button", { type: "submit", class: "btn-primary", text: "Save the mark" }), msg)
  );
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = form.querySelector(`input[name="result-${id}"]:checked`)?.value;
    if (!result) {
      msg.textContent = "Choose what the scan did first.";
      choices.querySelector("input")?.focus();
      return;
    }
    if (!name.value.trim()) {
      msg.textContent = "Add your name: a mark nobody signed is not kept.";
      name.focus();
      return;
    }
    store("local", NAME_KEY, name.value.trim());
    msg.textContent = "Saving …";
    const res = await api(`/api/pilot/reports/${encodeURIComponent(id)}/check`, {
      method: "POST",
      body: JSON.stringify({ result, note: note.value.trim() || undefined, decidedBy: name.value.trim() }),
    }).catch(() => null);
    if (!res || res.status !== 200) {
      msg.textContent = res?.status === 403 ? "The token was refused. Sign in again." : "The mark was not saved. Try again.";
      return;
    }
    const report = state.reports.find((x) => x.id === id);
    if (report) report.check = res.body.check;
    renderTotals();
    renderRows();
    const toggle = document.querySelector(`[aria-controls="detail-${CSS.escape(id)}"]`);
    toggle?.focus();
    $("shown").textContent = `Marked ${CHECK_WORDS[result].toLowerCase()}. ${$("shown").textContent}`;
  });
  wrap.append(form);
  return wrap;
}

// ---------- CSV ----------

function csvCell(v) {
  const s = v === null || v === undefined ? "" : String(v);
  // A leading =, +, - or @ is read as a formula by spreadsheets: these are
  // other people's words, so they are kept as text.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function downloadCsv() {
  const head = ["reported", "uses", "uses_detail", "page", "doing", "in_their_words", "held_back", "draft_title", "draft_fix", "draft_criterion", "sent_as_written", "scan", "scan_note", "marked_by", "marked_at"];
  const lines = [head.join(",")];
  for (const r of shownReports()) {
    const t = techOf(r.assistiveTech);
    lines.push(
      [r.createdAt, t.name, t.detail, r.pageUrl, r.task, r.barrier, r.impact, r.draft?.title, r.draft?.fix, r.draft?.wcagCriterion, r.confirmed ? "yes" : "no", r.check?.result ?? "not checked", r.check?.note, r.check?.decidedBy, r.check?.decidedAt]
        .map(csvCell)
        .join(",")
    );
  }
  const blob = new Blob([`﻿${lines.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `barrier-reports-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------- wiring ----------

$("signin-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const token = $("token").value.trim();
  if (!token) {
    $("signin-status").textContent = "Paste the admin token first.";
    $("token").focus();
    return;
  }
  state.token = token;
  if (await load()) $("totals-title").focus?.();
});
$("reload").addEventListener("click", () => load());
$("signout").addEventListener("click", () => {
  store("session", TOKEN_KEY, null);
  state.token = "";
  state.reports = [];
  state.open.clear();
  $("token").value = "";
  $("signin-status").textContent = "Signed out.";
  showSignin();
  $("token").focus();
});
$("csv").addEventListener("click", downloadCsv);
for (const id of ["f-tech", "f-site", "f-scan"]) $(id).addEventListener("change", renderRows);

const saved = store("session", TOKEN_KEY);
if (saved) {
  state.token = saved;
  load();
}
