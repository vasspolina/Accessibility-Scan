import type { Page, Response } from "playwright";
import { createRequire } from "node:module";
import { env } from "../../config/env.js";
import { withPage } from "./browserPool.js";
import { isPrivateOrReservedIp } from "../../middleware/ssrfGuard.js";
import { logger } from "../../utils/logger.js";

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
    }>;
    errorMessages: Array<{ selector: string; text: string; isAssociatedWithField: boolean }>;
  }>;
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

  return {
    pageTitle: document.title,
    headingTree,
    landmarks,
    images,
    interactiveElements,
    forms,
    focusOrderSample,
    animatedElements,
    respectsReducedMotion,
  };
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
      result[sel] = {
        x: Math.round(rect.x + window.scrollX),
        y: Math.round(rect.y + window.scrollY),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
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
// targets plus everything surfaced in domSignals — so we can pre-resolve
// bounding boxes for all of them in one pass while the page is still open.
function collectCandidateSelectors(axe: AxeRunResult, domSignals: DomSignals): string[] {
  const selectors = new Set<string>();

  for (const violation of axe.violations) {
    for (const node of violation.nodes) selectors.add(node.target.join(" "));
  }
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

export class RebindingDetectedError extends Error {
  constructor(host: string, ip: string) {
    super(`Blocked mid-navigation: ${host} resolved to a private/internal address (${ip})`);
    this.name = "RebindingDetectedError";
  }
}

export async function renderAndScan(url: string): Promise<RenderResult> {
  const start = Date.now();

  return withPage(async (page: Page) => {
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
      await page.goto(url, { waitUntil: "load", timeout: env.RENDER_TIMEOUT_MS });
      await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
      if (rebindingDetected) throw rebindingDetected;

      await page.addScriptTag({ path: require.resolve("axe-core") });
      const axe = (await page.evaluate(() => (window as unknown as { axe: { run: () => Promise<unknown> } }).axe.run())) as AxeRunResult;

      const ariaSnapshot = await page.locator("body").ariaSnapshot();
      const domSignals = await page.evaluate<DomSignals>(toBrowserScript(extractDomSignalsInPage));
      const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 70 });

      const candidateSelectors = collectCandidateSelectors(axe, domSignals);
      const boundingBoxes = await page.evaluate<Record<string, BoundingBox | null>>(
        toBrowserScript(collectBoundingBoxesInPage, candidateSelectors)
      );

      // Full-page capture used only for server-side thumbnail cropping (see
      // cropThumbnail.ts) — best-effort: some very long/complex pages can
      // fail or time out on a full-page screenshot, and that should degrade
      // to "no thumbnails" rather than failing the whole scan.
      const fullPageScreenshot = await page
        .screenshot({ type: "jpeg", quality: 60, fullPage: true, timeout: 10_000 })
        .catch(() => null);

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
      };
    } finally {
      page.off("response", onResponse);
    }
  });
}
