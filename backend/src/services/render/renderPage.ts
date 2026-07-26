import type { ElementHandle, Locator, Page, Response } from "playwright";
import { createRequire } from "node:module";
import sharp from "sharp";
import { env } from "../../config/env.js";
import { withPage } from "./browserPool.js";
import { isPrivateOrReservedIp } from "../../middleware/ssrfGuard.js";
import {
  collectTypographyBlocksInPage,
  evaluateTypography,
  type TypographyBlock,
} from "../typography/analyzeTypography.js";
import { evaluateMotion } from "../motion/analyzeMotion.js";
import { evaluateComponents } from "../components/analyzeComponents.js";
import { evaluateDialogs } from "../dialog/analyzeDialogs.js";
import { collectMobileSignalsInPage, type MobileSignals } from "../mobile/analyzeMobile.js";
import {
  collectDarkPatternSignalsInPage,
  evaluateDarkPatterns,
  type DarkPatternSignals,
} from "../darkPatterns/analyzeDarkPatterns.js";
import {
  collectScreenReaderScriptInPage,
  condenseScreenReaderScript,
} from "../screenReader/analyzeScreenReader.js";
import {
  measureTextClippingInPage,
  TEXT_SPACING_CSS,
  TEXT_ZOOM_CSS,
  type ClipMeasurement,
  type TextResizeSignals,
} from "../textResize/analyzeTextResize.js";
import type { ScreenReaderScript } from "../../types/report.js";
import type { FocusStyles, KeyboardNavResult, TabStop } from "../keyboard/analyzeKeyboard.js";
import { logger } from "../../utils/logger.js";
import { authenticate, type AuthConfig } from "../auth/authenticate.js";

const require = createRequire(import.meta.url);

export interface DomSignals {
  pageTitle: string;
  headingTree: Array<{ level: number; text: string; selector: string }>;
  landmarks: Array<{ role: string; label: string | null; selector: string }>;
  images: Array<{ selector: string; alt: string | null; src: string }>;
  interactiveElements: Array<{
    type: string;
    selector: string;
    accessibleName: string;
    href?: string;
    hasVisibleText: boolean;
  }>;
  forms: Array<{
    selector: string;
    fields: Array<{
      selector: string;
      type: string;
      accessibleLabel: string | null;
      hasProgrammaticLabel: boolean;
      name: string | null;
      autocomplete: string | null;
      required: boolean;
    }>;
    errorMessages: Array<{ selector: string; text: string; isAssociatedWithField: boolean }>;
  }>;
  // Every link on the page with its accessible text and destination, kept
  // out of the Claude payload so it can be complete rather than capped at 60.
  // Feeds the vague-link-text check (WCAG 2.4.4).
  linkTexts: Array<{ selector: string; text: string; href: string }>;
  focusOrderSample: string[];
  animatedElements: Array<{
    selector: string;
    tag: string;
    animationName: string;
    animationIterationCount: string;
    isAutoplayMedia: boolean;
    hasPauseControls: boolean;
  }>;
  respectsReducedMotion: boolean;
  // Every same-document link with its text — used by the crawler to pick
  // which pages to audit. Separate from interactiveElements, which is capped
  // at 60 and mixes in buttons: a nav-heavy page would truncate the link list
  // before the pages worth auditing appeared in it.
  pageLinks: Array<{ href: string; text: string }>;
  // Modal/popup dialogs currently on the page (cookie banners, newsletter
  // pop-ups, age gates, etc.) — either explicitly marked (role="dialog",
  // <dialog>) or heuristically detected as a viewport-covering overlay.
  // Evaluated for the ARIA dialog pattern in services/dialog/analyzeDialogs.
  dialogs: Array<{
    selector: string;
    role: string; // "dialog" | "alertdialog" | "" (heuristic overlay)
    isNativeDialog: boolean; // a <dialog> element
    hasAccessibleName: boolean;
    ariaModal: boolean;
    looksLikeModalOverlay: boolean; // fixed/absolute, high z-index, covers viewport
    closeControl: { present: boolean; hasAccessibleName: boolean } | null;
  }>;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// axe-core's own types cover the shape well enough for our purposes without
// pulling in the full runtime dependency graph here.
export interface AxeRunResult {
  testEngine: { name: string; version: string };
  violations: Array<{
    id: string;
    impact: "critical" | "serious" | "moderate" | "minor" | null;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ target: string[]; html: string; failureSummary?: string }>;
  }>;
}

export interface RenderResult {
  pageTitle: string;
  finalUrl: string;
  axe: AxeRunResult;
  // YAML-style textual accessibility tree from Playwright's ariaSnapshot()
  // (the modern replacement for the removed page.accessibility.snapshot()
  // CDP API) — complementary to the hand-extracted domSignals below.
  ariaSnapshot: string;
  domSignals: DomSignals;
  renderTimeMs: number;
  // Base64 JPEG of the above-the-fold viewport, given to the AI review
  // layer as a vision input — visual clutter, fake urgency banners, and
  // confusing layouts are fundamentally perceptual and don't show up in a
  // DOM-only summary.
  screenshotBase64: string;
  // Full-page JPEG buffer used server-side only to crop small per-finding
  // thumbnails (see services/render/cropThumbnail.ts) — not sent to Claude
  // directly (the viewport screenshot above covers that) and not returned
  // to the API caller as-is, so kept as a Buffer rather than base64.
  fullPageScreenshot: Buffer | null;
  // Document-relative (not viewport-relative) bounding boxes for every
  // selector we might need to crop a thumbnail for, keyed by selector.
  boundingBoxes: Record<string, BoundingBox | null>;
  // Precise per-element thumbnails (base64 JPEG) captured directly via
  // Playwright while the page was open, keyed by selector — accurate
  // regardless of scroll architecture. Findings prefer these over
  // full-page crops (see cropThumbnail.ts / routes/scan.ts).
  elementScreenshots: Record<string, string>;
  // Computed-style metrics for the page's text blocks, evaluated server-side
  // into micro-typography findings (services/typography/analyzeTypography.ts).
  typographyBlocks: TypographyBlock[];
  // Result of a real Tab-through of the page (focus-visibility styles per
  // stop), evaluated server-side into keyboard findings
  // (services/keyboard/analyzeKeyboard.ts).
  keyboardNav: KeyboardNavResult;
  // Signals from a phone-width render pass (horizontal scroll, small tap
  // targets) — evaluated into mobile findings (services/mobile/analyzeMobile).
  mobileSignals: MobileSignals;
  // Manipulative-UX signals (consent-banner choice asymmetry, pre-ticked
  // opt-ins, confirmshaming, urgency claims) — evaluated into dark-pattern
  // findings (services/darkPatterns/analyzeDarkPatterns.ts).
  darkPatternSignals: DarkPatternSignals;
  // Approximation of what a screen reader announces, in reading order —
  // rendered as a playable preview in the widget.
  screenReaderScript: ScreenReaderScript;
  // Measurements of the page before and after the WCAG text-spacing and
  // 200%-text overrides — evaluated into resize findings
  // (services/textResize/analyzeTextResize.ts).
  textResizeSignals: TextResizeSignals;
  // Checks that did not complete on this run, in words a reader understands.
  //
  // Each of these passes catches its own failures and returns empty signals so
  // one broken check can not fail a whole scan. That is right, but it left the
  // report unable to tell "we looked and found nothing" from "we never
  // looked" — and the score counted the second as if it were the first.
  // Measured on moma.org against the deployed service: three identical scans
  // returned 73, 60 and 60 findings, scoring 4, 24 and 24, purely because the
  // keyboard, mobile and text-resize passes ran on one and silently gave up on
  // the others. A site must not look twenty points better because our own
  // checks fell over.
  incompleteChecks: string[];
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables).
function extractDomSignalsInPage(): DomSignals {
  function cssPath(el: Element): string {
    if (el.id) return `#${el.id}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let selector = node.tagName.toLowerCase();
      const currentTag = node.tagName;
      const parent: Element | null = node.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === currentTag);
        if (siblings.length > 1) {
          const index = siblings.indexOf(node) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      parts.unshift(selector);
      node = parent;
    }
    return parts.join(" > ");
  }

  function accessibleName(el: Element): string {
    const ariaLabel = el.getAttribute("aria-label");
    if (ariaLabel) return ariaLabel.trim();
    const labelledBy = el.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
        .join(" ")
        .trim();
      if (text) return text;
    }
    return (el.textContent ?? "").trim();
  }

  const headingTree = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.textContent ?? "").trim().slice(0, 200),
    selector: cssPath(h),
  }));

  const landmarkSelectors =
    "header, nav, main, footer, aside, [role=banner], [role=navigation], [role=main], [role=contentinfo], [role=complementary]";
  const landmarks = Array.from(document.querySelectorAll(landmarkSelectors)).map((el) => ({
    role: el.getAttribute("role") ?? el.tagName.toLowerCase(),
    label: el.getAttribute("aria-label"),
    selector: cssPath(el),
  }));

  // Capped: real e-commerce pages can have hundreds of images/links in
  // product grids — uncapped arrays would bloat the Claude context payload
  // and blow up the number of element thumbnails captured per scan.
  const images = Array.from(document.querySelectorAll("img"))
    .slice(0, 40)
    .map((img) => ({
      selector: cssPath(img),
      alt: img.hasAttribute("alt") ? img.getAttribute("alt") : null,
      src: img.getAttribute("src") ?? "",
    }));

  // Every link's accessible text, kept separately from interactiveElements.
  // That list is capped at 60 because it goes to Claude, and a nav-heavy page
  // exhausts the cap long before reaching the "Read more" links in the body —
  // so the vague-link-text check (WCAG 2.4.4) could only ever see the top of
  // the page. This one stays server-side, so it can afford to be complete.
  const linkTexts = Array.from(document.querySelectorAll("a[href]"))
    .slice(0, 300)
    .map((el) => ({
      selector: cssPath(el),
      text: accessibleName(el),
      href: el.getAttribute("href") ?? "",
    }));

  const interactiveElements = Array.from(document.querySelectorAll("a[href], button"))
    .slice(0, 60)
    .map((el) => {
      const name = accessibleName(el);
      return {
        type: el.tagName.toLowerCase() === "a" ? "link" : "button",
        selector: cssPath(el),
        accessibleName: name,
        href: el.tagName.toLowerCase() === "a" ? (el.getAttribute("href") ?? undefined) : undefined,
        hasVisibleText: (el.textContent ?? "").trim().length > 0,
      };
    });

  const forms = Array.from(document.querySelectorAll("form")).map((form) => {
    const fields = Array.from(form.querySelectorAll("input, select, textarea")).map((field) => {
      const id = field.getAttribute("id");
      const explicitLabel = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrappingLabel = field.closest("label");
      const label = explicitLabel ?? wrappingLabel;
      return {
        selector: cssPath(field),
        type: field.getAttribute("type") ?? field.tagName.toLowerCase(),
        accessibleLabel: label ? (label.textContent ?? "").trim() : null,
        hasProgrammaticLabel: Boolean(label) || field.hasAttribute("aria-label") || field.hasAttribute("aria-labelledby"),
        name: field.getAttribute("name"),
        autocomplete: field.getAttribute("autocomplete"),
        required: field.hasAttribute("required") || field.getAttribute("aria-required") === "true",
      };
    });

    const errorMessages = Array.from(
      form.querySelectorAll('[class*="error" i], [role="alert"], [aria-invalid="true"] ~ *')
    ).map((el) => {
      const describedByTarget = document.querySelector(`[aria-describedby~="${el.id}"]`);
      return {
        selector: cssPath(el),
        text: (el.textContent ?? "").trim().slice(0, 200),
        isAssociatedWithField: Boolean(el.id && describedByTarget),
      };
    });

    return { selector: cssPath(form), fields, errorMessages };
  });

  const focusable = Array.from(
    document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
  ).slice(0, 25);
  const focusOrderSample = focusable.map((el) => cssPath(el));

  // Elements with a running CSS animation, legacy <marquee>, or autoplaying
  // media — concrete signal for the AI layer to judge whether motion is
  // "properly built" (pausable, finite, respects reduced-motion) vs. an
  // uncontrollable auto-looping distraction.
  const candidateSelector =
    "*, marquee, video[autoplay], audio[autoplay]";
  const animatedElements = Array.from(document.querySelectorAll(candidateSelector))
    .filter((el) => {
      if (el.tagName === "MARQUEE") return true;
      if ((el.tagName === "VIDEO" || el.tagName === "AUDIO") && el.hasAttribute("autoplay")) return true;
      const cs = getComputedStyle(el);
      return cs.animationName !== "none" && cs.animationName !== "";
    })
    .slice(0, 20)
    .map((el) => {
      const cs = getComputedStyle(el);
      const isAutoplayMedia =
        (el.tagName === "VIDEO" || el.tagName === "AUDIO") && el.hasAttribute("autoplay");
      return {
        selector: cssPath(el),
        tag: el.tagName.toLowerCase(),
        animationName: el.tagName === "MARQUEE" ? "marquee-scroll" : cs.animationName,
        animationIterationCount: el.tagName === "MARQUEE" ? "infinite" : cs.animationIterationCount,
        isAutoplayMedia,
        hasPauseControls: isAutoplayMedia ? el.hasAttribute("controls") : false,
      };
    });

  let respectsReducedMotion = false;
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (
            rule instanceof CSSMediaRule &&
            /prefers-reduced-motion/i.test(rule.conditionText ?? "")
          ) {
            respectsReducedMotion = true;
            break;
          }
        }
      } catch {
        // Cross-origin stylesheet — cssRules access throws, skip it.
      }
      if (respectsReducedMotion) break;
    }
  } catch {
    // Ignore — leave as false.
  }

  // Modal / pop-up dialogs: cookie banners, newsletter overlays, age gates.
  // Two ways in — an explicit dialog (role or <dialog>), or a heuristic
  // overlay (fixed/absolute, high z-index, covering the viewport, or with a
  // modal-ish class/id) that carries interactive content.
  const dialogEls = new Set<Element>();
  document
    .querySelectorAll('[role="dialog"], [role="alertdialog"], dialog')
    .forEach((el) => dialogEls.add(el));

  const MODAL_HINT = /modal|popup|pop-up|dialog|overlay|lightbox|cookie|consent|gdpr|newsletter|subscribe|age[-\s]?gate/i;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("div, section, aside"))) {
    if (dialogEls.size > 40) break;
    try {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" && cs.position !== "absolute") continue;
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 120) continue;
      const z = parseInt(cs.zIndex, 10);
      const hintMatch = MODAL_HINT.test(`${el.className} ${el.id}`);
      const coversViewport =
        rect.width >= window.innerWidth * 0.5 && rect.height >= window.innerHeight * 0.3;
      const highLayer = Number.isFinite(z) && z >= 100;
      // Require a real modal signal AND some interactive content, so we don't
      // flag sticky headers, hero sections, or decorative overlays.
      if (!((hintMatch && highLayer) || (coversViewport && highLayer))) continue;
      if (!el.querySelector("button, a[href], input, [role='button']")) continue;
      dialogEls.add(el);
    } catch {
      // one bad element shouldn't stop detection
    }
  }

  function meaningfulCloseName(ctrl: Element): { present: boolean; hasAccessibleName: boolean } {
    const aria = (ctrl.getAttribute("aria-label") ?? ctrl.getAttribute("title") ?? "").trim();
    const labelledBy = ctrl.getAttribute("aria-labelledby");
    const text = (ctrl.textContent ?? "").trim();
    // A real name is an aria label, an aria-labelledby reference, or visible
    // text with an actual word — a bare "×"/"X" glyph does not count.
    const hasAccessibleName = Boolean(aria) || Boolean(labelledBy) || /[a-z]{3,}/i.test(text);
    return { present: true, hasAccessibleName };
  }

  const dialogs = Array.from(dialogEls)
    .slice(0, 8)
    .map((el) => {
      const role = el.getAttribute("role") ?? "";
      const isNativeDialog = el.tagName.toLowerCase() === "dialog";
      const hasAccessibleName =
        el.hasAttribute("aria-label") ||
        el.hasAttribute("aria-labelledby") ||
        el.hasAttribute("title");
      const ariaModal = el.getAttribute("aria-modal") === "true";
      const cs = getComputedStyle(el);
      const looksLikeModalOverlay = cs.position === "fixed" || cs.position === "absolute";

      // Find a close-like control inside the dialog.
      let closeControl: { present: boolean; hasAccessibleName: boolean } | null = null;
      const controls = Array.from(el.querySelectorAll('button, [role="button"], a[href]'));
      for (const ctrl of controls) {
        const hay = `${ctrl.getAttribute("aria-label") ?? ""} ${ctrl.getAttribute("title") ?? ""} ${(ctrl.textContent ?? "").trim()}`;
        if (/close|dismiss|no thanks|not now|✕|✖|⨯|╳|^\s*[x×]\s*$/i.test(hay)) {
          closeControl = meaningfulCloseName(ctrl);
          break;
        }
      }

      return {
        selector: cssPath(el),
        role,
        isNativeDialog,
        hasAccessibleName,
        ariaModal,
        looksLikeModalOverlay,
        closeControl,
      };
    });

  const pageLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .slice(0, 300)
    .map((a) => ({
      href: a.getAttribute("href") ?? "",
      text: (a.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
    }))
    .filter((l) => l.href && !l.href.startsWith("#") && !/^(javascript|mailto|tel):/i.test(l.href));

  return {
    pageTitle: document.title,
    headingTree,
    landmarks,
    images,
    interactiveElements,
    forms,
    linkTexts,
    focusOrderSample,
    animatedElements,
    respectsReducedMotion,
    pageLinks,
    dialogs,
  };
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained. Some sites keep the real document short (often
// `overflow: hidden` on <body>/<html>) and put all their actual content
// inside a nested `overflow: auto` container with a capped height —
// perfectly normal box-model layout, just clipped from view rather than
// flowing the document taller. Playwright's fullPage screenshot only ever
// captures the document's own scrollHeight, so that real content silently
// falls outside the image. Stripping the clip lets it reflow to its full
// height before we measure or screenshot anything, so bounding boxes and
// the full-page capture both agree on where content actually ends up.
// (This can't help genuine transform-driven "virtual scroll" — there the
// content's real box-model position never changes, only its rendered
// transform does — cropElementThumbnail's overflow guard still catches
// those cases.)
function neutralizeScrollClippingInPage(): void {
  try {
    document.documentElement.style.setProperty("overflow", "visible", "important");
    document.body.style.setProperty("overflow", "visible", "important");
    document.body.style.setProperty("height", "auto", "important");

    const all = Array.from(document.querySelectorAll<HTMLElement>("*"));
    for (const el of all) {
      try {
        if (el.scrollHeight <= el.clientHeight + 40) continue;
        const overflowY = getComputedStyle(el).overflowY;
        if (overflowY !== "auto" && overflowY !== "scroll") continue;
        el.style.setProperty("overflow", "visible", "important");
        el.style.setProperty("max-height", "none", "important");
        el.style.setProperty("height", "auto", "important");
      } catch {
        // One misbehaving element shouldn't stop the rest from being fixed up.
      }
    }
  } catch {
    // Best-effort only — a failure here just means we fall back to
    // whatever Playwright's own fullPage detection would have captured.
  }
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained. Returns document-relative (not viewport-relative)
// bounding boxes so they map correctly onto a full-page screenshot
// regardless of scroll position at capture time.
function collectBoundingBoxesInPage(selectors: string[]): Record<string, BoundingBox | null> {
  const result: Record<string, BoundingBox | null> = {};
  for (const sel of selectors) {
    if (sel in result) continue;
    try {
      const el = document.querySelector(sel);
      if (!el) {
        result[sel] = null;
        continue;
      }
      const rect = el.getBoundingClientRect();
      const box = {
        x: Math.round(rect.x + window.scrollX),
        y: Math.round(rect.y + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
      result[sel] = box;
      // Also key the box by "#id" when the element has one. Thumbnail cropping
      // looks boxes up by exact selector string, and the AI review names
      // elements the way a developer would — "#mce-EMAIL", not the generated
      // "form > div > input" the deterministic layers produce. Without this
      // alias an AI finding about a specific, obviously picturable field
      // silently gets no thumbnail, because nothing ever measured it under
      // the name the model used.
      const id = el.id;
      if (id && !(`#${id}` in result)) result[`#${id}`] = box;
    } catch {
      result[sel] = null;
    }
  }
  return result;
}

// tsx's dev-mode esbuild transform (keepNames: true, not user-configurable)
// wraps named function/const declarations with calls to a module-level
// `__name` helper for stack-trace friendliness. Playwright serializes
// in-page functions via toString() and runs that source in complete
// isolation in the browser, where `__name` doesn't exist — this shims it
// locally so the extracted source is self-contained regardless of whether
// it went through that transform (a plain `tsc` production build never
// injects these calls in the first place, so this is a harmless no-op there).
// `arg`, when provided, is baked into the generated source as a JSON
// literal rather than passed via Playwright's separate evaluate() argument
// — keeps this helper's signature simple and avoids relying on Playwright's
// string-vs-function evaluate() argument-passing semantics.
function toBrowserScript<A>(fn: (arg: A) => unknown, arg?: A): string {
  const argLiteral = arg === undefined ? "" : JSON.stringify(arg);
  return `(() => { const __name = (fn) => fn; return (${fn.toString()})(${argLiteral}); })()`;
}

// Every selector a finding could plausibly reference — axe violation
// targets plus everything surfaced in domSignals and the typography blocks —
// so we can pre-resolve bounding boxes for all of them in one pass while
// the page is still open.
function collectCandidateSelectors(
  axe: AxeRunResult,
  domSignals: DomSignals,
  typographyBlocks: TypographyBlock[]
): string[] {
  const selectors = new Set<string>();

  for (const violation of axe.violations) {
    for (const node of violation.nodes) selectors.add(node.target.join(" "));
  }
  for (const block of typographyBlocks) selectors.add(block.selector);
  for (const h of domSignals.headingTree) selectors.add(h.selector);
  for (const l of domSignals.landmarks) selectors.add(l.selector);
  for (const img of domSignals.images) selectors.add(img.selector);
  for (const el of domSignals.interactiveElements) selectors.add(el.selector);
  for (const form of domSignals.forms) {
    selectors.add(form.selector);
    for (const field of form.fields) selectors.add(field.selector);
    for (const err of form.errorMessages) selectors.add(err.selector);
  }
  for (const a of domSignals.animatedElements) selectors.add(a.selector);

  return Array.from(selectors);
}

// Screenshotting each flagged element directly, rather than cropping it out
// of one document-level full-page image, is the precise path: Playwright
// scrolls the element into view — inside inner scroll containers, fixed
// overlays, anywhere — and captures exactly that element, so the thumbnail
// is correct no matter how the page handles scrolling. The trade-off is one
// screenshot per element, so we cap the count, prioritize by severity
// (critical elements first), enforce an overall wall-clock budget, and make
// every capture best-effort — a single element that's detached, mid-animation,
// or slow to settle must never fail or stall the whole scan.
const MAX_ELEMENT_SHOTS = 45;
const ELEMENT_SHOT_BUDGET_MS = 12_000;
// Per-channel standard deviation below which a capture is essentially one
// solid colour — an invisible element, or one caught mid-reveal.
// Per-channel standard deviation below which an image is essentially one flat
// colour. Exported so every capture path applies the same bar — a threshold
// that lives in two places drifts, and the one place that lacked this check
// shipped white rectangles.
export const BLANK_STDEV = 2.5;
const ELEMENT_IMPACT_ORDER: Record<string, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

// axe rules that flag an image missing its text alternative. Their captures
// feed the alt-text suggester (aiReview/suggestAltText.ts), which needs the
// real image pixels — so these get capture priority and a load-wait.
const IMAGE_ALT_RULES = new Set(["image-alt", "input-image-alt", "role-img-alt", "svg-img-alt", "area-alt"]);

async function captureElementScreenshots(
  page: Page,
  axe: AxeRunResult,
  // Extra element-specific selectors from the deterministic non-axe layers
  // (typography, motion, components, dialogs). Those findings are evaluated
  // after the page has closed, so they can't reach this capture on their own
  // — but their selectors are known during render, and this precise capture
  // (scroll + element screenshot) is far more reliable than cropping a small
  // element out of the full-page image. Page-level selectors ("body"/"html")
  // are filtered by the caller since there's no single element to picture.
  extraSelectors: string[] = []
): Promise<Record<string, string>> {
  const orderedSelectors: string[] = [];
  const seen = new Set<string>();
  const imageSelectors = new Set<string>();
  const pushUnique = (selector: string) => {
    if (selector && !seen.has(selector)) {
      seen.add(selector);
      orderedSelectors.push(selector);
    }
  };
  // Image-alt violations first (their pixels are needed downstream for
  // alt-text suggestions), then everything else by severity.
  const byImpact = [...axe.violations].sort((a, b) => {
    const aImg = IMAGE_ALT_RULES.has(a.id) ? 0 : 1;
    const bImg = IMAGE_ALT_RULES.has(b.id) ? 0 : 1;
    if (aImg !== bImg) return aImg - bImg;
    return (
      (ELEMENT_IMPACT_ORDER[a.impact ?? "minor"] ?? 3) -
      (ELEMENT_IMPACT_ORDER[b.impact ?? "minor"] ?? 3)
    );
  });
  // 1. Image-alt selectors — their captures feed the alt-text suggester.
  for (const violation of byImpact) {
    if (!IMAGE_ALT_RULES.has(violation.id)) continue;
    for (const node of violation.nodes) {
      const selector = node.target.join(" ");
      imageSelectors.add(selector);
      pushUnique(selector);
    }
  }
  // 2. Deterministic non-axe selectors (typography, motion, components,
  //    dialogs) next. There are only a handful, and each is the sole way its
  //    finding can be pictured (it's evaluated after the page closes) — so
  //    give them priority over the long tail of axe selectors rather than
  //    letting a violation-heavy page exhaust the capture budget first.
  for (const selector of extraSelectors) pushUnique(selector);
  // 3. The remaining axe selectors, by severity.
  for (const violation of byImpact) {
    for (const node of violation.nodes) pushUnique(node.target.join(" "));
  }

  const result: Record<string, string> = {};
  const deadline = Date.now() + ELEMENT_SHOT_BUDGET_MS;
  // Cap generously — the deterministic selectors plus axe findings — so
  // neither group is starved by a violation-heavy page.
  for (const selector of orderedSelectors.slice(0, MAX_ELEMENT_SHOTS + 15)) {
    if (Date.now() > deadline) break;
    try {
      const locator = page.locator(selector).first();
      if ((await locator.count()) === 0) continue;

      // Lazy-loaded images (loading="lazy", IntersectionObserver loaders)
      // only start fetching once scrolled into view — screenshotting right
      // away grabs an empty placeholder, which the blank-detector below then
      // discards, losing exactly the pixels the alt-text suggester needs.
      // Scroll first, then wait until the underlying <img> has actually
      // decoded real pixels (complete + naturalWidth) before shooting.
      if (imageSelectors.has(selector)) {
        await locator.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});
        await locator
          .evaluate(
            (el) =>
              new Promise<void>((resolve) => {
                const img =
                  el instanceof HTMLImageElement ? el : el.querySelector("img");
                if (!img || (img.complete && img.naturalWidth > 0)) return resolve();
                const done = () => resolve();
                img.addEventListener("load", done, { once: true });
                img.addEventListener("error", done, { once: true });
                setTimeout(done, 1_500);
              }),
            undefined,
            { timeout: 2_500 }
          )
          .catch(() => {});
      }

      const box = await locator.boundingBox();
      if (!box || box.width < 2 || box.height < 2) continue;
      // Laid out is not the same as visible. An element sitting behind a
      // full-page overlay reports a perfectly good box, and screenshotting it
      // returns the overlay's pixels — a thumbnail of the wrong thing, which
      // is worse than none in a report whose whole job is showing proof.
      //
      // Measured before adding: on a site whose real content sits in an
      // overlay above the document, 33 of 34 flagged elements were covered, so
      // nearly every thumbnail in that report pictured something else. On two
      // ordinary sites nothing was covered and nothing was lost. This also
      // protects the alt-text suggester downstream, which reads these pixels —
      // a covered <img> would otherwise get the overlay described instead.
      if (!(await isActuallyOnScreen(locator))) continue;
      const raw = await locator.screenshot({ type: "jpeg", quality: 72, timeout: 1_500, animations: "disabled" });
      const resized = await sharp(raw)
        .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 62 })
        .toBuffer();

      // Some flagged elements (invisible/covered overlay buttons, empty
      // transparent hit-targets, off-screen carousel slides) screenshot as a
      // flat blank rectangle — technically a valid capture but useless and
      // confusing to show a business owner. A near-zero per-channel standard
      // deviation means the image is essentially one solid color, so drop it
      // and let the finding show without a thumbnail rather than with a
      // meaningless white box.
      //
      // Measured, not assumed: an added scroll-into-view plus a settle-and-
      // retry for blank frames (on the theory that reveal animations were
      // being caught mid-fade) changed coverage on a scroll-animated test site
      // by exactly nothing while adding ~7s per scan. These elements really
      // are blank. Don't reintroduce it without evidence.
      const stats = await sharp(resized).stats().catch(() => null);
      const maxStdev = stats ? Math.max(...stats.channels.map((c) => c.stdev)) : 1;
      if (maxStdev < BLANK_STDEV) continue;

      result[selector] = resized.toString("base64");
    } catch {
      // Detached node, timed-out scroll-into-view, invalid selector, etc.
      // — skip this one element, keep capturing the rest.
    }
  }
  return result;
}

// How tall a thing can be and still be one element rather than a region. A
// search field is tens of pixels; a section is hundreds. Height only, on
// purpose: real controls often run the full width of their column, so a width
// test would reject exactly what we want to picture.
const MAX_COMPONENT_HEIGHT_PX = 220;
const SECOND_PASS_BUDGET_MS = 12_000;
const MAX_SECOND_PASS_SHOTS = 10;
// Below this, a tight crop of the element on its own is too small to read and
// too plain to survive the blank-frame check — photograph its surroundings
// instead. Above it, the element fills the frame on its own.
const REGION_CAPTURE_MAX_HEIGHT_PX = 120;

/**
 * Whether the element is the thing actually painted at its own coordinates.
 *
 * Hit-tests a few points across the element and asks what the browser says is
 * on top. A covered element still reports a perfectly good bounding box, so
 * this is the only reliable way to tell "on screen" from "laid out but hidden
 * behind an overlay" — and photographing the latter yields a picture of the
 * overlay, which is how a report ends up showing the wrong element.
 *
 * An ancestor counts as a hit: transparent or pointer-events:none elements
 * report their container, which is still the right part of the page.
 */
async function isActuallyOnScreen(locator: Locator): Promise<boolean> {
  try {
    return await locator.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return false;
      // Several points, because a partly-covered element is still worth a
      // picture — a fully covered one is not.
      const points: Array<[number, number]> = [
        [0.5, 0.5],
        [0.15, 0.5],
        [0.85, 0.5],
      ];
      return points.some(([fx, fy]) => {
        const hit = document.elementFromPoint(rect.left + rect.width * fx, rect.top + rect.height * fy);
        return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
      });
    });
  } catch {
    return false;
  }
}

/**
 * Walks up from a small element to the nearest ancestor that still reads as
 * one component, so the capture shows the thing in context — a field with the
 * space where its label should be, not a bare white box.
 *
 * Returns null when no ancestor qualifies, in which case the caller shoots the
 * element itself.
 */
async function contextAncestor(locator: Locator): Promise<ElementHandle<Node> | null> {
  try {
    const handle = await locator.evaluateHandle((el) => {
      let node = el as HTMLElement;
      let best: HTMLElement | null = null;
      // Walk up while the ancestor still reads as one component. Stop as soon
      // as the frame is wide enough to be legible — a thumbnail of a "…" link
      // and nothing else is technically the right element and completely
      // useless; the sentence around it is what makes the finding land.
      for (let i = 0; i < 6 && node.parentElement; i++) {
        node = node.parentElement;
        const rect = node.getBoundingClientRect();
        if (rect.height > 220 || rect.width < 8) break;
        best = node;
        if (rect.width >= 200 && rect.height >= 40) break;
      }
      return best;
    });
    return handle.asElement();
  } catch {
    return null;
  }
}

// Element-only capture: crop, downscale, and reject a frame that turned out to
// be a single flat colour (an invisible or covered element).
async function captureLocator(locator: Locator | ElementHandle<Node>): Promise<string | null> {
  try {
    const raw = await locator.screenshot({ type: "jpeg", quality: 72, timeout: 2_500, animations: "disabled" });
    // A frame this small can't show anything a reader could act on — it
    // renders as a blurry smudge next to the finding and undermines the very
    // point of showing evidence. The written element label does that job
    // better at this size.
    const rawMeta = await sharp(raw).metadata().catch(() => null);
    if (!rawMeta?.width || !rawMeta.height || rawMeta.width < 80 || rawMeta.height < 20) return null;
    const resized = await sharp(raw)
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 62 })
      .toBuffer();
    const stats = await sharp(resized).stats().catch(() => null);
    const maxStdev = stats ? Math.max(...stats.channels.map((c) => c.stdev)) : 1;
    if (maxStdev < BLANK_STDEV) return null;
    return resized.toString("base64");
  } catch {
    return null;
  }
}

// How long to keep waiting for a page to hold still. Generous enough for a
// slow hero to finish, short enough that a permanently animating page costs
// this much and no more.
const LAYOUT_SETTLE_TIMEOUT_MS = 3_000;
const LAYOUT_SETTLE_INTERVAL_MS = 250;

/**
 * Resolves once the page's geometry stops changing, or when the budget runs
 * out — whichever comes first. Best-effort: a page that never settles simply
 * costs the budget and gets photographed anyway.
 */
async function settleLayout(page: Page): Promise<void> {
  await page
    .evaluate(
      async ({ timeout, interval }) => {
        // Written without a named inner function on purpose. tsx's esbuild
        // transform (keepNames) rewrites named declarations into calls to a
        // module-level __name helper, which doesn't exist in the page — the
        // evaluate then throws ReferenceError, and because this whole call is
        // best-effort the failure would be swallowed and the settling would
        // silently never happen in dev. Inline callbacks are left alone.
        const deadline = Date.now() + timeout;
        let previous = "";
        let first = true;
        while (Date.now() < deadline) {
          // A cheap signature of where things are: positions and widths only,
          // enough to notice a panel sliding or resizing without reading every
          // element on a large page.
          const current = Array.from(document.querySelectorAll("body *"))
            .slice(0, 80)
            .map((el) => {
              const r = el.getBoundingClientRect();
              return `${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}`;
            })
            .join("|");
          if (!first && current === previous) return;
          previous = current;
          first = false;
          await new Promise((resolve) => setTimeout(resolve, interval));
        }
      },
      { timeout: LAYOUT_SETTLE_TIMEOUT_MS, interval: LAYOUT_SETTLE_INTERVAL_MS }
    )
    .catch(() => {});
}

/**
 * Photographs one selector the way a reader needs to see it: scrolled into
 * view, verified as actually on screen, and framed with enough around it to
 * be legible.
 *
 * The framing is the point. A tap target flagged as too small is 30px of
 * transparent icon — shot on its own it's a smudge, which is why these used
 * to be left imageless. Shot together with its neighbours you can see both
 * the control and how little room it has, which is the finding.
 *
 * Returns null whenever there's nothing worth showing, which callers treat as
 * "no thumbnail" rather than an error.
 */
async function captureWithContext(page: Page, selector: string): Promise<string | null> {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) return null;
  await locator.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});

  const box = await locator.boundingBox();
  if (!box || box.width < 2 || box.height < 2) return null;
  if (!(await isActuallyOnScreen(locator))) return null;

  const target =
    box.height <= REGION_CAPTURE_MAX_HEIGHT_PX ? await contextAncestor(locator) : null;
  return captureLocator(target ?? locator);
}

/**
 * Photographs a handful of selectors on a freshly opened page.
 *
 * Exists because AI-review findings are produced after the render pass has
 * closed its page, and the model writes its own selectors — "li:nth-of-type(6)
 * > div > a > div > figure > img" — which almost never match the selector
 * strings measured during render. Those findings could therefore only ever get
 * a thumbnail by coincidence, when the model happened to name an element the
 * same way the deterministic layers did. Cropping can't fix that: with no
 * measured box there is nothing to crop.
 *
 * A second visit is the honest cost of picturing what the model actually
 * pointed at. It reuses the pooled browser, so this is one navigation rather
 * than a browser launch, and it is capped by both count and wall-clock so a
 * slow page can't stretch the scan.
 *
 * Best-effort throughout: any failure yields no thumbnail, never a failed scan.
 */
export async function captureSelectorsFresh(
  url: string,
  selectors: string[],
  // Selectors that name a discrete element by tag or id are worth capturing at
  // any height (a tall product photo is still one photo). Everything else has
  // to prove it's component-sized, because the model is told to fall back to
  // the containing section for layout findings and a picture of a section
  // tells the reader nothing.
  alwaysCapture: (selector: string) => boolean
): Promise<Record<string, string>> {
  if (selectors.length === 0) return {};

  return withPage(async (page: Page) => {
    const result: Record<string, string> = {};
    try {
      await page.goto(url, { waitUntil: "load", timeout: 20_000 });
      // Same brief settle the main render allows for SPA content.
      await page.waitForTimeout(1_200);
      // Deliberately NOT running neutralizeScrollClippingInPage here, even
      // though the main render pass does. That helper un-clips inner scroll
      // containers so the document-level full-page screenshot can see past
      // them — necessary for cropping, actively harmful here. On a page whose
      // real scroller is an inner `overflow:auto` div, removing the overflow
      // stops that div scrolling, so scrollIntoViewIfNeeded can no longer
      // bring the element into the viewport: measured on rijksakademie.nl, the
      // newsletter field went from y=438 (a clean 673x121 capture) to y=2064
      // and a negative clip height, i.e. no picture at all. This path doesn't
      // need the helper anyway — Playwright scrolls inner containers by itself.
    } catch {
      // Couldn't get back to the page at all. No thumbnails, no harm.
      return result;
    }

    const deadline = Date.now() + SECOND_PASS_BUDGET_MS;
    for (const selector of selectors.slice(0, MAX_SECOND_PASS_SHOTS)) {
      if (Date.now() > deadline) break;
      try {
        // A selector that doesn't name one discrete element has to prove it's
        // component-sized before we spend a shot on it — the model is told to
        // fall back to the containing section for layout findings, and a
        // picture of a whole section tells the reader nothing.
        if (!alwaysCapture(selector)) {
          const box = await page.locator(selector).first().boundingBox().catch(() => null);
          if (box && box.height > MAX_COMPONENT_HEIGHT_PX) continue;
        }
        const shot = await captureWithContext(page, selector);
        if (shot) result[selector] = shot;
      } catch {
        // Invalid selector, detached node, timeout — skip it, keep going.
      }
    }
    return result;
  }).catch(() => ({}));
}

// Dark-pattern signals, gathered from every frame rather than just the main
// document. This matters more here than for any other layer: the single most
// common dark pattern is a consent banner, and the major consent-management
// platforms (Sourcepoint, TrustArc, Quantcast, …) render theirs inside an
// iframe, where page.evaluate never sees it. Playwright drives the browser
// directly, so it can evaluate inside cross-origin frames too.
//
// The main frame wins for the consent banner (a CMP iframe usually holds the
// only one, but if both have a candidate the top-level page is the honest
// one to report). Per-pattern caps are re-applied after merging so a page of
// many frames can't flood the report. Wholly best-effort: any frame that is
// detached, blocked, or slow is skipped rather than failing the scan.
const MAX_FRAMES_SCANNED = 12;

async function collectDarkPatternsAcrossFrames(page: Page): Promise<DarkPatternSignals> {
  const merged: DarkPatternSignals = {
    consentBanner: null,
    confirmshaming: [],
    preCheckedOptIns: [],
    urgencyClaims: [],
  };
  const frames = page.frames().slice(0, MAX_FRAMES_SCANNED);
  for (const frame of frames) {
    try {
      const signals = await frame.evaluate<DarkPatternSignals>(
        toBrowserScript(collectDarkPatternSignalsInPage)
      );
      if (!merged.consentBanner && signals.consentBanner) {
        merged.consentBanner = signals.consentBanner;
      }
      merged.confirmshaming.push(...signals.confirmshaming);
      merged.preCheckedOptIns.push(...signals.preCheckedOptIns);
      merged.urgencyClaims.push(...signals.urgencyClaims);
    } catch {
      // Detached frame, navigation mid-evaluate, or a context we can't reach.
    }
  }
  merged.confirmshaming = merged.confirmshaming.slice(0, 6);
  merged.preCheckedOptIns = merged.preCheckedOptIns.slice(0, 8);
  merged.urgencyClaims = merged.urgencyClaims.slice(0, 6);
  return merged;
}

// Captures a padded region of the viewport around an element, rather than the
// element's own box. Used by the text-resize passes, where the element being
// flagged is one whose text has been pushed out of its own bounds — so the box
// alone is empty and the evidence lives in what surrounds it.
//
// Returns null rather than a blank image: a white rectangle presented as proof
// of a problem is worse than no picture, the same rule the desktop and mobile
// capture paths follow.
const REGION_PADDING_PX = 48;

async function captureRegionAround(page: Page, selector: string): Promise<string | null> {
  try {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) return null;
    await locator.scrollIntoViewIfNeeded({ timeout: 1_000 }).catch(() => {});

    const box = await locator.boundingBox();
    if (!box) return null;

    const viewport = page.viewportSize();
    if (!viewport) return null;

    // Clamp to the viewport: boundingBox is viewport-relative after the
    // scroll, and a clip outside those bounds fails.
    const left = Math.max(0, Math.floor(box.x - REGION_PADDING_PX));
    const top = Math.max(0, Math.floor(box.y - REGION_PADDING_PX));
    const right = Math.min(viewport.width, Math.ceil(box.x + box.width + REGION_PADDING_PX));
    const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + REGION_PADDING_PX));
    const width = right - left;
    const height = bottom - top;
    if (width < 8 || height < 8) return null;

    const raw = await page.screenshot({
      type: "jpeg",
      quality: 70,
      clip: { x: left, y: top, width, height },
      timeout: 3_000,
    });
    const resized = await sharp(raw)
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 62 })
      .toBuffer();

    const stats = await sharp(resized).stats().catch(() => null);
    const maxStdev = stats ? Math.max(...stats.channels.map((c) => c.stdev)) : 1;
    if (maxStdev < BLANK_STDEV) return null;

    return resized.toString("base64");
  } catch {
    return null;
  }
}

// WCAG 1.4.4 (Resize Text) and 1.4.12 (Text Spacing) are both defined by what
// happens when the reader changes something, so neither can be judged from
// static markup — the only honest test is to apply the change and measure.
// Runs after the screenshots and the keyboard walk (both would be disturbed by
// restyling the page) and before the mobile pass, while still at desktop width.
// Best-effort throughout: a failure here costs these findings, nothing else.
async function collectTextResizeSignals(page: Page): Promise<TextResizeSignals> {
  const empty: ClipMeasurement = {
    clipped: [],
    snippets: {},
    documentScrollWidth: 0,
    viewportWidth: 0,
  };
  const measure = () =>
    page
      .evaluate<ClipMeasurement>(toBrowserScript(measureTextClippingInPage))
      .catch(() => empty);

  // Baseline first: anything already clipping its own content is a
  // pre-existing layout bug, not something the resize broke.
  const baseline = await measure();

  const baselineClipped = new Set(baseline.clipped);
  let resizeFailed = false;

  const withCss = async (css: string, captureViewport: boolean): Promise<ClipMeasurement> => {
    try {
      const handle = await page.addStyleTag({ content: css });
      // Let the restyle settle before measuring — reflow is not synchronous
      // with the style tag being appended.
      await page.waitForTimeout(200);
      const result = await measure();

      // Capture the evidence NOW, while the page is still broken. Once the
      // override comes off, the clipping is gone and any later screenshot
      // would show a perfectly healthy element, contradicting the finding.
      // Only the one element the finding will actually name is shot — the
      // report shows a single thumbnail, so capturing more is pure cost.
      const firstBroken = result.clipped.find((sel) => !baselineClipped.has(sel));
      if (firstBroken) {
        // Photograph a padded region around the element, not the element box.
        //
        // The box is exactly the wrong thing to capture here: the override has
        // pushed the text outside it, so an element-only screenshot returns a
        // blank white rectangle. That was shipping as "evidence" of clipping
        // and showed nothing at all. The region around it is what makes the
        // truncation legible.
        const shot = await captureRegionAround(page, firstBroken);
        if (shot) result.shots = { [firstBroken]: shot };
      }

      // Sideways scrolling belongs to the page, not to any element, so the
      // viewport itself is the only thing that can show it.
      if (captureViewport && result.documentScrollWidth > result.viewportWidth + 5) {
        const viewportShot = await page
          .screenshot({ type: "jpeg", quality: 60, timeout: 3_000, animations: "disabled" })
          .then((buf) =>
            sharp(buf)
              .resize({ width: 640, withoutEnlargement: true })
              .jpeg({ quality: 62 })
              .toBuffer()
          )
          .catch(() => null);
        if (viewportShot) {
          const vStats = await sharp(viewportShot).stats().catch(() => null);
          const vMax = vStats ? Math.max(...vStats.channels.map((c) => c.stdev)) : 1;
          if (vMax >= BLANK_STDEV) result.viewportShot = viewportShot.toString("base64");
        }
      }

      await handle.evaluate((el) => (el as Element).remove()).catch(() => {});
      await page.waitForTimeout(80);
      return result;
    } catch {
      resizeFailed = true;
      return empty;
    }
  };

  const spacing = await withCss(TEXT_SPACING_CSS, false);
  const zoom = await withCss(TEXT_ZOOM_CSS, true);

  return { baseline, spacing, zoom, failed: resizeFailed };
}

// Captures thumbnails for mobile-only findings while the page is at phone
// width. Mobile findings (tiny tap targets, breakout elements) are about
// elements as they render on a narrow screen — a hamburger toggle hidden on
// desktop, a menu that only appears in the mobile layout — so a desktop
// capture of the same selector is blank or shows the wrong thing. This runs
// during the mobile pass so each element is shot in the layout the finding is
// actually describing. Element-level (not cropped from a full-page image)
// because the mobile layout's scroll architecture is unknown here too.
const MAX_MOBILE_SHOTS = 20;
const MOBILE_SHOT_BUDGET_MS = 4_000;

async function captureMobileElementScreenshots(
  page: Page,
  selectors: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const seen = new Set<string>();
  const deadline = Date.now() + MOBILE_SHOT_BUDGET_MS;
  for (const selector of selectors) {
    if (result[selector] || seen.has(selector)) continue;
    seen.add(selector);
    if (Object.keys(result).length >= MAX_MOBILE_SHOTS || Date.now() > deadline) break;
    try {
      const shot = await captureWithContext(page, selector);
      if (shot) result[selector] = shot;
    } catch {
      // skip this element, keep going
    }
  }
  return result;
}

// Walks the page with real Tab key presses — the check most automated
// scanners skip because it needs interaction, not static analysis. At each
// stop we record the focused element's indicator styles (outline,
// box-shadow, background, border), and once focus moves on we re-read the
// same element unfocused, so the evaluator can tell whether focusing it
// produced any visible change at all. Runs LAST in the scan: pressing Tab
// scrolls the page and mutates :focus styles, which would disturb the
// screenshots and style measurements taken earlier.
const MAX_TAB_STOPS = 25;
const KEYBOARD_BUDGET_MS = 6_000;

async function captureKeyboardNavigation(page: Page): Promise<KeyboardNavResult> {
  const stops: TabStop[] = [];
  let reachedEnd = false;
  let failed = false;

  const readActive = () =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 6) {
        let sel = node.tagName.toLowerCase();
        if (node.id) {
          parts.unshift(`#${node.id}`);
          break;
        }
        const parent: Element | null = node.parentElement;
        if (parent) {
          const tag = node.tagName;
          const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
          if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        node = node.parentElement;
      }
      const cs = getComputedStyle(el);
      return {
        selector: parts.join(" > "),
        tag: el.tagName.toLowerCase(),
        styles: {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
          backgroundColor: cs.backgroundColor,
          borderColor: cs.borderColor,
        },
      };
    });

  const readUnfocused = (selector: string) =>
    page.evaluate((sel: string) => {
      try {
        const el = document.querySelector(sel);
        if (!el || el === document.activeElement) return null;
        const cs = getComputedStyle(el);
        return {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          boxShadow: cs.boxShadow,
          backgroundColor: cs.backgroundColor,
          borderColor: cs.borderColor,
        };
      } catch {
        return null;
      }
    }, selector);

  try {
    await page.evaluate(() => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      window.scrollTo(0, 0);
    });

    const deadline = Date.now() + KEYBOARD_BUDGET_MS;
    let pending: { selector: string; tag: string; styles: FocusStyles } | null = null;

    for (let i = 0; i < MAX_TAB_STOPS; i++) {
      if (Date.now() > deadline) break;
      await page.keyboard.press("Tab");
      const active = await readActive();

      // Focus moved on (or left the page) — now the previous element can be
      // measured in its unfocused state.
      if (pending && (!active || active.selector !== pending.selector)) {
        stops.push({
          selector: pending.selector,
          tag: pending.tag,
          focused: pending.styles,
          unfocused: await readUnfocused(pending.selector),
        });
        pending = null;
      }

      if (!active) {
        // Wrapped around to <body>: the full tab cycle has been seen.
        reachedEnd = true;
        break;
      }

      if (pending && active.selector === pending.selector) {
        // Focus did not move — record the repeat so the evaluator can
        // detect a trap (unfocused styles are unknowable while stuck).
        stops.push({ selector: active.selector, tag: active.tag, focused: active.styles, unfocused: null });
      } else {
        pending = active;
      }
    }

    if (pending) {
      stops.push({ selector: pending.selector, tag: pending.tag, focused: pending.styles, unfocused: null });
    }
  } catch (err) {
    logger.warn({ err }, "Keyboard walk-through failed — reporting without keyboard findings");
    failed = true;
  }

  return { stops, reachedEnd, failed };
}

export class RebindingDetectedError extends Error {
  constructor(host: string, ip: string) {
    super(`Blocked mid-navigation: ${host} resolved to a private/internal address (${ip})`);
    this.name = "RebindingDetectedError";
  }
}

// Thrown when the target site refuses the scanner (bot protection, WAF,
// geo-block). Without this, the scan would dutifully analyze the "Access
// Denied" error page itself and return a report about a page the site's
// real visitors never see — worse than failing, because it looks like a
// genuine result.
export class SiteBlockedError extends Error {
  constructor(host: string, detail: string) {
    super(
      `${host} turned our scanner away (${detail}). This says nothing about how accessible the site is. It blocks automated tools from visiting at all.`
    );
    this.name = "SiteBlockedError";
  }
}

// Block and challenge pages that come back with HTTP 200 anyway, which most
// WAFs do. Deliberately specific phrases rather than generic words, so a
// legitimate article *about* CAPTCHAs never matches.
//
// Checked against the body text as well as the title, because a challenge
// page often keeps the site's ordinary title while the body says "Let's
// confirm you are human" — that combination reported a museum site as having
// zero failures when the scanner had never seen the site.
const BLOCK_PAGE_PATTERNS =
  /access denied|attention required|just a moment|pardon our interruption|request blocked|are you a robot|(?:verify|confirm|checking) (?:that )?you(?:'re| are)? (?:a )?human|checking your browser|enable javascript and cookies|additional security check|ddos protection|verifying you are human/i;

// A challenge page is characteristically tiny: a line of text, a widget, no
// navigation. Requiring that alongside the wording keeps a real page that
// happens to discuss bot protection from being mistaken for one.
const CHALLENGE_MAX_TEXT_LENGTH = 1200;

export async function renderAndScan(
  url: string,
  // Optional sign-in, applied before navigating. Credentials are used here and
  // nowhere else: they are never stored, never logged, never put in the
  // report, and never sent to the AI layer (see services/auth/authenticate.ts
  // and contextExtraction/extractContext.ts).
  auth?: AuthConfig,
  // Times the render itself. Passed down so the clock starts once a page
  // exists rather than when the request arrived — see withPage.
  budgetMs?: number
): Promise<RenderResult> {


  return withPage(async (page: Page) => {
    // Started here, not before the call: everything above is waiting for a
    // free scanner, and reporting queue time as render time overstated it by
    // more than the whole budget on a busy service.
    const start = Date.now();
    if (auth) {
      // Before the target navigation, so the session is live when we arrive.
      // Throws AuthError, which the route surfaces as a clear message.
      await authenticate(page, auth);
    }
    // assertSafeUrl() (routes/scan.ts) resolves DNS once before this call
    // and rejects private/internal IPs — but that's a check against a
    // separate DNS lookup, and Chromium resolves the hostname again
    // independently when actually navigating. A DNS-rebinding attacker can
    // return a safe public IP on the first lookup (passing the guard) and a
    // private IP on the second (this navigation), a well-known SSRF bypass.
    // We can't prevent the resulting TCP connection — the resolved IP isn't
    // knowable until after it's already made — but we CAN detect it via the
    // actual connection address on every response (main navigation,
    // redirects, subresources) and abort before any page content is
    // extracted or returned, closing off the exfiltration path even though
    // the connection itself briefly happened.
    let rebindingDetected: RebindingDetectedError | null = null;
    const onResponse = async (response: Response) => {
      // This whole body must never throw: it's a fire-and-forget event
      // listener (page.on doesn't await or catch what listeners return), so
      // any uncaught exception here becomes an unhandled promise rejection
      // — which crashes the entire Node process with no way to recover.
      // Previously only response.serverAddr() was guarded; new URL(...) and
      // everything else below was one bad response away from taking down
      // the whole server on any scan.
      try {
        if (rebindingDetected) return;
        const addr = await response.serverAddr().catch(() => null);
        if (addr && isPrivateOrReservedIp(addr.ipAddress)) {
          rebindingDetected = new RebindingDetectedError(new URL(response.url()).hostname, addr.ipAddress);
        }
      } catch (err) {
        logger.warn({ err }, "SSRF response check failed — ignoring this response, scan continues");
      }
    };
    page.on("response", onResponse);

    try {
      // "networkidle" is unreliable for real-world sites — persistent
      // background connections (analytics, chat widgets, ad beacons) mean it
      // never fires and the whole scan times out. Wait for "load" instead
      // (always resolves for a reachable page), then optimistically give SPA
      // content a brief extra moment to settle without failing the scan if
      // the page never goes fully idle.
      const mainResponse = await page.goto(url, { waitUntil: "load", timeout: env.RENDER_TIMEOUT_MS });
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      if (rebindingDetected) throw rebindingDetected;

      // Refuse to scan a bot-block/error page as if it were the real site.
      const status = mainResponse?.status() ?? 0;
      const host = new URL(page.url()).hostname;
      if (status === 403 || status === 429 || status === 503) {
        throw new SiteBlockedError(host, `HTTP ${status} — automated-visitor protection`);
      }
      if (status >= 400) {
        throw new SiteBlockedError(host, `the page returned HTTP ${status}`);
      }
      const pageTitle = await page.title().catch(() => "");
      if (BLOCK_PAGE_PATTERNS.test(pageTitle)) {
        throw new SiteBlockedError(host, `it served a "${pageTitle.slice(0, 60)}" page instead of content`);
      }

      // The title can look ordinary while the body is a challenge. Only treat
      // it as a block when the page is also nearly empty, so an article about
      // CAPTCHAs stays scannable.
      const bodyText = await page
        .evaluate(() => (document.body?.innerText ?? "").replace(/\s+/g, " ").trim())
        .catch(() => "");
      if (bodyText.length <= CHALLENGE_MAX_TEXT_LENGTH && BLOCK_PAGE_PATTERNS.test(bodyText)) {
        const phrase = bodyText.match(BLOCK_PAGE_PATTERNS)?.[0] ?? "a security check";
        throw new SiteBlockedError(host, `it served a "${phrase}" check instead of the page`);
      }

      // Injecting axe is the step most exposed to a page that hasn't finished
      // moving. Plenty of sites navigate again after load — a consent
      // redirect, a locale route, a client-side router settling — and doing
      // that mid-injection destroys the execution context and throws. Measured
      // on bbc.co.uk/news, which lost an entire scan to it and reported only
      // "Could not load or scan the page".
      //
      // The page is fine; we were simply early. Wait for it to come to rest
      // and go again. Once, because a page that navigates twice more is not
      // settling and the render timeout should have the last word.
      let axeResult: AxeRunResult;
      try {
        await page.addScriptTag({ path: require.resolve("axe-core") });
        axeResult = (await page.evaluate(() =>
          (window as unknown as { axe: { run: () => Promise<unknown> } }).axe.run()
        )) as AxeRunResult;
      } catch (err) {
        if (!/execution context was destroyed|navigation/i.test(String(err))) throw err;
        logger.info("Page navigated while injecting axe — waiting for it to settle and retrying");
        await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
        await page.waitForTimeout(800);
        await page.addScriptTag({ path: require.resolve("axe-core") });
        axeResult = (await page.evaluate(() =>
          (window as unknown as { axe: { run: () => Promise<unknown> } }).axe.run()
        )) as AxeRunResult;
      }
      const axe = axeResult;

      // Supplementary context for the AI layer, not something the report
      // depends on — so it must never be able to fail a scan. It normally
      // costs tens of milliseconds, but on a heavy page on a loaded container
      // it hit Playwright's 30s default and took the whole scan of moma.org
      // down with it. Short budget, and an empty snapshot on failure.
      const ariaSnapshot = await page
        .locator("body")
        .ariaSnapshot({ timeout: 8_000 })
        .catch(() => "");
      const domSignals = await page.evaluate<DomSignals>(toBrowserScript(extractDomSignalsInPage));
      const typographyBlocks = await page
        .evaluate<TypographyBlock[]>(toBrowserScript(collectTypographyBlocksInPage))
        .catch(() => [] as TypographyBlock[]);
      // Collected while the page is in its initial desktop state, before the
      // keyboard walk-through and mobile pass mutate it — consent banners and
      // opt-in forms are exactly what those later passes disturb.
      const darkPatternSignals = await collectDarkPatternsAcrossFrames(page);
      // Reading-order walk of the accessibility tree, collected in the same
      // pristine desktop state. Best-effort: an empty script just hides the
      // preview rather than costing the report.
      const screenReaderScript = await page
        .evaluate<ScreenReaderScript>(toBrowserScript(collectScreenReaderScriptInPage))
        .then(condenseScreenReaderScript)
        .catch(() => ({ lines: [], truncated: false }) as ScreenReaderScript);
      // Wait for the layout to stop moving before photographing it.
      //
      // Found on usbank.com, whose hero is a JS-driven carousel: the preview
      // came back with the headline panel squeezed to about 90px, one word per
      // line, and a login card overlapping the photo — a frame that exists for
      // a fraction of a second while a slide expands. It reads as "your site
      // is broken", and it is also the AI review's only view of the page, so
      // it invites the model to report overlapping text no visitor ever sees.
      //
      // Playwright's animations:"disabled" does not help here (verified): it
      // handles CSS animations, transitions and Web Animations, and this
      // carousel moves elements from JavaScript. Sampling geometry catches it
      // regardless of what drives it. A carousel that rotates forever never
      // settles, but it dwells on each slide far longer than it spends moving
      // between them, so two matching samples land on a settled slide.
      await settleLayout(page);

      // Web fonts change line heights and wrapping, so a shot taken before
      // they land shows a layout no visitor ever sees.
      await page
        .evaluate(() => (document as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready)
        .catch(() => {});

      // animations: "disabled" is doing real work here, not tidying up. A
      // rotating hero carousel never settles, so without it this shot lands
      // mid-transition: a slide half in frame, buttons overlapping text,
      // headlines squeezed into a column that exists for one twentieth of a
      // second. Measured on usbank.com, which renders as a mangled page.
      //
      // That matters twice over. This image is the report's preview, so a
      // broken frame reads as "your site is broken" — and it is also the AI
      // review's only view of the page, so a mid-transition capture invites
      // the model to report overlapping text that no visitor will ever see.
      // Playwright fast-forwards finite animations to their end state and
      // resets infinite ones, giving the layout a visitor actually gets.
      const screenshotBuffer = await page.screenshot({
        type: "jpeg",
        quality: 70,
        animations: "disabled",
      });

      // Runs after the above-the-fold screenshot (which should show the page
      // exactly as a visitor sees it) but before anything used for
      // thumbnail cropping, so bounding boxes and the full-page capture
      // below both reflect the same, fully-unclipped layout.
      await page.evaluate(toBrowserScript(neutralizeScrollClippingInPage)).catch(() => {});

      const candidateSelectors = collectCandidateSelectors(axe, domSignals, typographyBlocks);
      const boundingBoxes = await page.evaluate<Record<string, BoundingBox | null>>(
        toBrowserScript(collectBoundingBoxesInPage, candidateSelectors)
      );

      // Full-page capture used only for server-side thumbnail cropping (see
      // cropThumbnail.ts) — best-effort: some very long/complex pages can
      // fail or time out on a full-page screenshot, and that should degrade
      // to "no thumbnails" rather than failing the whole scan.
      const fullPageScreenshot = await page
        .screenshot({ type: "jpeg", quality: 60, fullPage: true, timeout: 10_000, animations: "disabled" })
        .catch(() => null);

      // Element-specific selectors from the deterministic non-axe layers, so
      // their findings get the same reliable precise capture as axe findings.
      // This precise path scrolls each element into view before shooting, so
      // it works even on sites whose scroll architecture defeats the full-page
      // crop (e.g. a footer form on a smooth-scroll page). Re-running these
      // pure evaluators here is cheap; page-level selectors ("body"/"html",
      // e.g. typeface-count or markup) are dropped since there's no single
      // element to picture. Mobile findings are excluded — their signals are
      // measured later, and their selectors are captured against the phone
      // viewport, not this one.
      const deterministicSelectors = [
        ...evaluateTypography(typographyBlocks),
        ...evaluateMotion(domSignals.animatedElements, domSignals.respectsReducedMotion, new Set()),
        ...evaluateComponents(domSignals),
        ...evaluateDialogs(domSignals.dialogs),
        ...evaluateDarkPatterns(darkPatternSignals),
      ]
        .map((f) => f.selector)
        .filter((s) => s && s !== "body" && s !== "html");

      // Precise per-element thumbnails — captured after the screenshots
      // because each one scrolls the page. Best-effort as a whole: if this
      // throws for any reason, fall back to full-page crops rather than
      // failing.
      const elementScreenshots = await captureElementScreenshots(
        page,
        axe,
        deterministicSelectors
      ).catch(() => ({}));

      // Real keyboard walk-through — after the screenshots, because Tab
      // presses scroll the page and flip elements into their :focus styles.
      const keyboardNav = await captureKeyboardNavigation(page);

      // Text-resize passes — done at desktop width, before the viewport is
      // changed for the mobile pass below.
      const textResizeSignals = await collectTextResizeSignals(page);

      // Mobile pass — resize to a phone width, let the layout reflow, and
      // measure mobile-only problems (sideways scrolling, tiny tap targets).
      // Done last: it changes the viewport, invalidating everything above.
      // Best-effort — a failure just means no mobile findings.
      let mobileSignals: MobileSignals = {
        viewportWidth: 390,
        documentScrollWidth: 0,
        overflowingElements: [],
        smallTapTargets: [],
      };
      // Thumbnails for mobile findings, captured at phone width (see
      // captureMobileElementScreenshots). Merged over the desktop captures so
      // a mobile-only element is pictured as it actually renders on a phone.
      let mobileFailed = false;
      let mobileElementScreenshots: Record<string, string> = {};
      let mobileSelectors: string[] = [];
      try {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400); // let CSS media queries / reflow settle
        mobileSignals = await page.evaluate<MobileSignals>(toBrowserScript(collectMobileSignalsInPage));
        // Breakout (overflow) elements first — they're large regions that crop
        // into a useful picture on their own.
        //
        // Tap targets follow, and they used to be skipped entirely: a 30px
        // transparent icon shot on its own is a smudge of whatever sits behind
        // it. Capturing it with its neighbours in frame changes that — you see
        // the control and how little room it has, which is the whole finding.
        // Capped well below the overflow list because a phone layout can flag
        // dozens of them and they're the less important half.
        mobileSelectors = [
          ...mobileSignals.overflowingElements.map((o) => o.selector),
          ...mobileSignals.smallTapTargets.slice(0, 8).map((t) => t.selector),
        ].filter((s) => s && s !== "body" && s !== "html");
        if (mobileSelectors.length > 0) {
          mobileElementScreenshots = await captureMobileElementScreenshots(page, mobileSelectors);
        }
      } catch (err) {
        logger.warn({ err }, "Mobile pass failed — reporting without mobile findings");
        mobileFailed = true;
      }

      // A mobile finding must never borrow the desktop capture of its selector
      // (that's exactly the wrong-layout image this pass exists to avoid): drop
      // any desktop entry for a mobile selector, then layer on the mobile shots
      // that actually succeeded. Result: mobile findings show a phone-layout
      // thumbnail or none at all.
      const mergedElementScreenshots = { ...elementScreenshots };
      for (const s of mobileSelectors) delete mergedElementScreenshots[s];
      Object.assign(mergedElementScreenshots, mobileElementScreenshots);

      // Final check — a late subresource (lazy-loaded image, polling XHR)
      // could have triggered a rebind after the initial navigation settled.
      if (rebindingDetected) throw rebindingDetected;

      return {
        pageTitle: domSignals.pageTitle,
        finalUrl: page.url(),
        axe,
        ariaSnapshot,
        domSignals,
        renderTimeMs: Date.now() - start,
        screenshotBase64: screenshotBuffer.toString("base64"),
        fullPageScreenshot,
        boundingBoxes,
        elementScreenshots: mergedElementScreenshots,
        typographyBlocks,
        keyboardNav,
        mobileSignals,
        darkPatternSignals,
        screenReaderScript,
        textResizeSignals,
        incompleteChecks: [
          ...(keyboardNav.failed ? ["keyboard navigation"] : []),
          ...(mobileFailed ? ["phone layout"] : []),
          ...(textResizeSignals.failed ? ["text resizing"] : []),
        ],
      };
    } finally {
      page.off("response", onResponse);
    }
  }, budgetMs);
}
