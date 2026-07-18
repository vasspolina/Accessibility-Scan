import type { Page } from "playwright";
import { createRequire } from "node:module";
import { env } from "../../config/env.js";
import { withPage } from "./browserPool.js";

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

  const images = Array.from(document.querySelectorAll("img")).map((img) => ({
    selector: cssPath(img),
    alt: img.hasAttribute("alt") ? img.getAttribute("alt") : null,
    src: img.getAttribute("src") ?? "",
  }));

  const interactiveElements = Array.from(document.querySelectorAll("a[href], button")).map((el) => {
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

// tsx's dev-mode esbuild transform (keepNames: true, not user-configurable)
// wraps named function/const declarations with calls to a module-level
// `__name` helper for stack-trace friendliness. Playwright serializes
// in-page functions via toString() and runs that source in complete
// isolation in the browser, where `__name` doesn't exist — this shims it
// locally so the extracted source is self-contained regardless of whether
// it went through that transform (a plain `tsc` production build never
// injects these calls in the first place, so this is a harmless no-op there).
function toBrowserScript(fn: () => unknown): string {
  return `(() => { const __name = (fn) => fn; return (${fn.toString()})(); })()`;
}

export async function renderAndScan(url: string): Promise<RenderResult> {
  const start = Date.now();

  return withPage(async (page: Page) => {
    // "networkidle" is unreliable for real-world sites — persistent
    // background connections (analytics, chat widgets, ad beacons) mean it
    // never fires and the whole scan times out. Wait for "load" instead
    // (always resolves for a reachable page), then optimistically give SPA
    // content a brief extra moment to settle without failing the scan if
    // the page never goes fully idle.
    await page.goto(url, { waitUntil: "load", timeout: env.RENDER_TIMEOUT_MS });
    await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});

    await page.addScriptTag({ path: require.resolve("axe-core") });
    const axe = (await page.evaluate(() => (window as unknown as { axe: { run: () => Promise<unknown> } }).axe.run())) as AxeRunResult;

    const ariaSnapshot = await page.locator("body").ariaSnapshot();
    const domSignals = await page.evaluate<DomSignals>(toBrowserScript(extractDomSignalsInPage));
    const screenshotBuffer = await page.screenshot({ type: "jpeg", quality: 70 });

    return {
      pageTitle: domSignals.pageTitle,
      finalUrl: page.url(),
      axe,
      ariaSnapshot,
      domSignals,
      renderTimeMs: Date.now() - start,
      screenshotBase64: screenshotBuffer.toString("base64"),
    };
  });
}
