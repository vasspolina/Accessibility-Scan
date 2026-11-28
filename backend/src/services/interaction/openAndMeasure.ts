import type { Page, Route } from "playwright";
import { randomUUID } from "node:crypto";
import type { AccessibilityFinding, AccessibilityReport } from "../../types/report.js";
import type { AxeRunResult } from "../render/renderPage.js";

// Opens things before measuring them, the two ways a scan of a page as it
// loads cannot:
//
// 1. PANELS. Menus, accordions and tabs load closed, and axe skips what is
//    hidden, so whatever is inside them was never checked. Here each
//    disclosure (a button with aria-expanded="false" and aria-controls
//    naming a hidden panel) and each unselected tab is pressed, axe runs on
//    the panel alone, and the control is put back. Same scope rule as the
//    activation pass beside it: never inside a form, never a link, and a URL
//    watcher goes back and stops if a press navigates after all.
//
// 2. FORMS. No form was ever submitted, so error handling (3.3.1 Error
//    Identification, 3.3.3 Error Suggestion) had no evidence. Submitting a
//    form on a stranger's live site would send it real requests, so it is
//    done here with EVERY network request aborted for the length of the
//    test: the page's own script runs and shows what it shows, and nothing
//    leaves the browser. The form is submitted empty, once, and what changed
//    is read: the browser's own validation, new error text, fields marked
//    invalid, an error linked to its field, focus moved, a live region.
//    This runs last in the render, because it leaves error messages on the
//    page that no later probe should measure.
//
// What is scored is only what is proved: an error inside an opened panel
// (axe's own verdict), and a form that refused an empty submit without
// sending anything and without saying anything. The rest (errors that are
// shown but not linked to their fields, or not announced) goes to the
// undecided list with the counts, because a message can name its field in
// words and pass 3.3.1 without any markup.

export interface OpenedPanel {
  control: string;
  controlName: string;
  kind: "disclosure" | "tab";
  panel: string;
  violations: AxeRunResult["violations"];
}

export interface FormErrorProbe {
  form: string;
  formName: string;
  /** The browser's own validation stopped the submit and shows its own message. */
  native: boolean;
  /** The submit tried to send something (aborted here). */
  requestAttempted: boolean;
  requiredEmpty: number;
  /** Visible text that appeared after the submit (first few). */
  newText: string[];
  markedInvalid: number;
  /** Required fields whose error is linked by aria-describedby or aria-errormessage to visible text. */
  linked: number;
  focusMoved: boolean;
  announced: boolean;
}

export interface OpenAndMeasureResult {
  panels: OpenedPanel[];
  forms: FormErrorProbe[];
}

const MAX_PANELS = 6;
const MAX_FORMS = 2;

function selectorScript() {
  return (el: Element): string => {
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      if (node.id) {
        parts.unshift("#" + CSS.escape(node.id));
        break;
      }
      let sel = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const tag = node.tagName;
        const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === tag);
        if (siblings.length > 1) sel += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      }
      parts.unshift(sel);
      node = parent;
    }
    return parts.join(" > ");
  };
}

async function openPanels(page: Page, deadline: number): Promise<OpenedPanel[]> {
  const urlBefore = page.url();
  const targets = await page.evaluate(`(() => {
    const pathOf = (${selectorScript().toString()});
    const hidden = (el) => {
      if (!el) return false;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return el.hidden || cs.display === "none" || cs.visibility === "hidden" || r.height === 0;
    };
    const shown = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getBoundingClientRect().width > 0; };
    const out = [];
    const take = (el, kind) => {
      if (out.length >= ${MAX_PANELS} || !shown(el) || el.closest("form") || el.closest("a[href]")) return;
      if (el.disabled || el.getAttribute("aria-disabled") === "true") return;
      const id = (el.getAttribute("aria-controls") || "").split(/\\s+/)[0];
      const panel = id ? document.getElementById(id) : null;
      if (!panel || !hidden(panel)) return;
      const selected = kind === "tab" ? Array.from((el.closest('[role="tablist"]') || document).querySelectorAll('[role="tab"][aria-selected="true"]'))[0] : null;
      out.push({
        control: pathOf(el),
        controlName: (el.getAttribute("aria-label") || el.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
        kind,
        panel: "#" + CSS.escape(id),
        restore: selected ? pathOf(selected) : null,
      });
    };
    for (const el of Array.from(document.querySelectorAll('button[aria-expanded="false"][aria-controls], [role="button"][aria-expanded="false"][aria-controls]'))) take(el, "disclosure");
    for (const el of Array.from(document.querySelectorAll('[role="tab"][aria-selected="false"][aria-controls]'))) take(el, "tab");
    return out;
  })()`) as Array<{ control: string; controlName: string; kind: "disclosure" | "tab"; panel: string; restore: string | null }>;

  const panels: OpenedPanel[] = [];
  for (const t of targets) {
    if (Date.now() > deadline) break;
    try {
      await page.locator(t.control).first().click({ timeout: 1500 });
      await page.waitForTimeout(300);
      if (page.url() !== urlBefore) {
        await page.goBack({ waitUntil: "load", timeout: 8000 }).catch(() => {});
        break;
      }
      const opened = await page
        .locator(t.panel)
        .first()
        .isVisible()
        .catch(() => false);
      if (opened) {
        const result = (await page.evaluate(
          (sel) => (window as unknown as { axe: { run: (c: unknown) => Promise<unknown> } }).axe.run({ include: [[sel]] }),
          t.panel
        )) as AxeRunResult;
        panels.push({ control: t.control, controlName: t.controlName, kind: t.kind, panel: t.panel, violations: result.violations });
      }
      // Put it back the way it loaded.
      await page.locator(t.kind === "tab" && t.restore ? t.restore : t.control).first().click({ timeout: 1500 }).catch(() => {});
      await page.waitForTimeout(150);
    } catch {
      // A control that would not press, or a panel axe could not run on.
    }
  }
  return panels;
}

async function probeForms(page: Page, deadline: number): Promise<FormErrorProbe[]> {
  const forms = (await page.evaluate(`(() => {
    const pathOf = (${selectorScript().toString()});
    const out = [];
    for (const form of Array.from(document.querySelectorAll("form"))) {
      if (out.length >= ${MAX_FORMS}) break;
      const cs = getComputedStyle(form);
      if (cs.display === "none" || cs.visibility === "hidden" || form.getBoundingClientRect().height === 0) continue;
      if (form.getAttribute("role") === "search" || form.closest('[role="search"]')) continue;
      const required = form.querySelectorAll('[required], [aria-required="true"]');
      if (required.length === 0) continue;
      const submit = form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]');
      if (!submit) continue;
      out.push({
        form: pathOf(form),
        submit: pathOf(submit),
        formName: (form.getAttribute("aria-label") || form.querySelector("legend, h2, h3")?.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 60),
      });
    }
    return out;
  })()`)) as Array<{ form: string; submit: string; formName: string }>;
  if (forms.length === 0) return [];

  const results: FormErrorProbe[] = [];
  const urlBefore = page.url();
  let attempted = false;
  // The page's own submit handlers run first (on the form); this one, on the
  // window, runs after them and stops the browser's own navigation, which
  // aborted would put Chromium's error page in place of the document.
  await page.evaluate(`window.__a11yHoldSubmit = (e) => e.preventDefault(); window.addEventListener("submit", window.__a11yHoldSubmit)`).catch(() => {});
  // Nothing leaves the browser while a form is being tested: every request,
  // the submit's own navigation included, is aborted and remembered.
  const block = (route: Route) => {
    attempted = true;
    return route.abort("blockedbyclient");
  };
  await page.route("**/*", block);
  try {
    for (const f of forms) {
      if (Date.now() > deadline) break;
      attempted = false;
      try {
        const before = (await page.evaluate(`(() => {
          const form = document.querySelector(${JSON.stringify(f.form)});
          const seen = new Set();
          for (const el of Array.from(document.body.querySelectorAll("*"))) {
            const t = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
            if (t) seen.add(t);
          }
          const required = Array.from(form.querySelectorAll('[required], [aria-required="true"]'));
          for (const el of required) { if ("value" in el && el.type !== "checkbox" && el.type !== "radio") el.value = ""; }
          window.__a11yFormSeen = seen;
          return { requiredEmpty: required.length };
        })()`)) as { requiredEmpty: number };
        await page.locator(f.submit).first().click({ timeout: 1500, noWaitAfter: true });
        await page.waitForTimeout(600);
        const after = (await page.evaluate(`(() => {
          const form = document.querySelector(${JSON.stringify(f.form)});
          if (!form) return null;
          const visible = (el) => { const cs = getComputedStyle(el); return cs.display !== "none" && cs.visibility !== "hidden" && el.getBoundingClientRect().height > 0; };
          const seen = window.__a11yFormSeen || new Set();
          const newText = [];
          let announced = false;
          for (const el of Array.from(document.body.querySelectorAll("*"))) {
            const t = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").trim();
            if (!t || seen.has(t) || !visible(el)) continue;
            if (newText.length < 4) newText.push(t.replace(/\\s+/g, " ").slice(0, 100));
            if (el.closest('[role="alert"], [aria-live="assertive"], [aria-live="polite"], [role="status"]')) announced = true;
          }
          const required = Array.from(form.querySelectorAll('[required], [aria-required="true"]'));
          const native = !form.noValidate && required.some((el) => el.matches(":invalid"));
          let markedInvalid = 0, linked = 0;
          for (const el of required) {
            if (el.getAttribute("aria-invalid") === "true") markedInvalid++;
            const ids = ((el.getAttribute("aria-errormessage") || "") + " " + (el.getAttribute("aria-describedby") || "")).trim().split(/\\s+/).filter(Boolean);
            if (ids.some((id) => { const m = document.getElementById(id); return m && visible(m) && (m.textContent || "").trim() && !seen.has((m.textContent || "").trim()); })) linked++;
          }
          const active = document.activeElement;
          const focusMoved = !!active && active !== document.body && (required.includes(active) || !!active.closest('[role="alert"]') || active.matches('[tabindex="-1"]'));
          return { native, newText, markedInvalid, linked, focusMoved, announced };
        })()`)) as Omit<FormErrorProbe, "form" | "formName" | "requestAttempted" | "requiredEmpty"> | null;
        if (!after) continue;
        results.push({ form: f.form, formName: f.formName, requiredEmpty: before.requiredEmpty, requestAttempted: attempted, ...after });
      } catch {
        // A submit that would not press, or a form that went away.
      }
    }
  } finally {
    await page.unroute("**/*", block).catch(() => {});
    await page.evaluate(`window.removeEventListener("submit", window.__a11yHoldSubmit)`).catch(() => {});
    // A script that called form.submit() itself still navigated; go back so
    // the render ends on the page it measured.
    if (page.url() !== urlBefore) await page.goto(urlBefore, { waitUntil: "load", timeout: 10_000 }).catch(() => {});
  }
  return results;
}

/** Panels first (they need the page as it loaded), then forms (they leave errors behind). */
export async function openAndMeasure(page: Page, budgetMs: number, phase: "panels" | "forms"): Promise<OpenedPanel[] | FormErrorProbe[]> {
  const deadline = Date.now() + budgetMs;
  return phase === "panels" ? openPanels(page, deadline) : probeForms(page, deadline);
}

/**
 * The panel violations as an axe result of their own, for axeToFindings, and
 * the note that says where each was found. Pure.
 */
export function panelViolations(panels: OpenedPanel[] | undefined): {
  axe: Pick<AxeRunResult, "violations" | "incomplete" | "testEngine">;
  foundIn: Map<string, string>;
} {
  const foundIn = new Map<string, string>();
  const violations: AxeRunResult["violations"] = [];
  for (const p of panels ?? []) {
    for (const v of p.violations) {
      violations.push(v);
      for (const n of v.nodes) foundIn.set(`${v.id}|${n.target.flat().join(" ")}`, p.controlName || p.control);
    }
  }
  return { axe: { violations, incomplete: [], testEngine: { name: "axe-core", version: "" } }, foundIn };
}

/** Says, on a finding from an opened panel, which control opened it. */
export function notePanelFindings(findings: AccessibilityFinding[], foundIn: Map<string, string>): AccessibilityFinding[] {
  return findings.map((f) => {
    const by = foundIn.get(`${f.ruleId}|${f.selector}`);
    return by ? { ...f, description: `${f.description} Found inside the panel that “${by}” opens, which is closed when the page loads.` } : f;
  });
}

type UndecidedRow = NonNullable<AccessibilityReport["undecidedChecks"]>[number];
const ERROR_URL = "https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html";

/** What the form test proves, and what it leaves for a person. Pure. */
export function evaluateFormErrors(probes: FormErrorProbe[] | undefined): { findings: AccessibilityFinding[]; undecided: UndecidedRow[] } {
  const findings: AccessibilityFinding[] = [];
  let unlinked = 0;
  let unannounced = 0;
  for (const p of probes ?? []) {
    if (p.native) continue; // The browser stopped it and says why in its own words.
    const said = p.newText.length > 0 || p.markedInvalid > 0 || p.linked > 0;
    if (!said && !p.requestAttempted) {
      findings.push({
        id: randomUUID(),
        source: "automated",
        severity: "serious",
        category: "accessibility",
        wcagCriterion: "3.3.1",
        wcagLevel: "A",
        selector: p.form,
        description: `Submitted with its ${p.requiredEmpty} required field${p.requiredEmpty === 1 ? "" : "s"} empty, this form${p.formName ? ` (“${p.formName}”)` : ""} refused to send and said nothing: no message appeared, no field was marked, focus stayed put. People who missed a field have no way to find out which one, or that anything went wrong.`,
        suggestedFix:
          "When a submit is refused, say so next to each field in text (‘Enter your email address’), mark the field with aria-invalid=\"true\", link the message with aria-describedby, and move focus to the first field in error or to a summary of the errors.",
        ruleId: "form-error-silent",
        helpUrl: ERROR_URL,
      });
      continue;
    }
    if (!said) continue; // It tried to send; the server's answer is unknown (it was not let through).
    if (p.markedInvalid + p.linked === 0) unlinked++;
    if (!p.announced && !p.focusMoved) unannounced++;
  }
  const undecided: UndecidedRow[] = [];
  if (unlinked > 0) {
    undecided.push({
      ruleId: "form-error-unlinked",
      count: unlinked,
      help: "Form errors shown in text but not tied to their fields (tested with an empty submit, nothing sent)",
      helpUrl: ERROR_URL,
    });
  }
  if (unannounced > 0) {
    undecided.push({
      ruleId: "form-error-unannounced",
      count: unannounced,
      help: "Form errors that appear without moving focus or being announced (tested with an empty submit, nothing sent)",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html",
    });
  }
  return { findings, undecided };
}
