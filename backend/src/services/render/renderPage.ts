import type { ElementHandle, Frame, Locator, Page, Response } from "playwright";
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
import { collectMobileSignalsInPage, collectReflow320InPage, type MobileSignals } from "../mobile/analyzeMobile.js";
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
import type { ReadabilitySignals } from "../readability/analyzeReadability.js";
import type {
  FocusStyles,
  KeyboardNavResult,
  MouseOnlyControl,
  TabStop,
} from "../keyboard/analyzeKeyboard.js";
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
  // Audio and video on the page, and third-party players embedded in an
  // iframe. WCAG 1.2.1-1.2.5 are the only criteria this scan had no signal
  // for at all — the renderer looked at media once, for autoplay, and never
  // asked whether any of it carried captions.
  //
  // Nothing here proves a failure and none of it is scored. Whether a video
  // needs captions depends on whether it carries speech, which cannot be
  // read off the DOM: a silent background loop needs none, and captions
  // burned into the picture satisfy the criterion while leaving no <track>
  // behind. What this does is turn "somebody must check your video" into
  // "you have three, here they are".
  mediaElements: Array<{
    selector: string;
    tag: "video" | "audio";
    // A <track> is the only caption mechanism visible to us. Kinds are kept
    // verbatim rather than reduced to a boolean so the analyzer can tell a
    // captions track from a descriptions or metadata one.
    trackKinds: string[];
    muted: boolean;
    hasControls: boolean;
    // A named video is far easier for the reader to go and find than a
    // selector, so the label is carried when the markup offers one.
    label: string;
  }>;
  mediaEmbeds: Array<{ selector: string; provider: string; title: string }>;
  // The navigation, in the order it appears. Meaningless on its own — a
  // single page cannot be inconsistent with itself — and collected purely so
  // the crawler can compare one page against another. WCAG 3.2.3 and 3.2.4
  // are the two criteria that cannot be judged from one page at all, which
  // is why they sat at "needs a person" while the crawler rendered several
  // pages and compared none of them.
  navigation: Array<{ text: string; href: string }>;
  // What the page listens for, recorded by the probe in browserPool.ts.
  // Listeners are invisible in markup, so this is the only evidence behind
  // 2.5.4, 2.1.4 and 2.5.2. Presence is all it establishes — see the probe's
  // own comment for why that stops short of a failure.
  listeners: {
    motion: boolean;
    keyboardGlobal: boolean;
    // Elements that act on the press without also handling the release, so
    // there is nothing to move away from before letting go.
    pressWithoutRelease: string[];
    // Controls that look like they act the moment their value changes —
    // WCAG 3.2.2. Read from the markup only: testing this properly would
    // mean changing form values on somebody's live site, which can submit a
    // form or fire a real action, and is not a thing a scan may do
    // uninvited. So this reports the shape, never the behaviour.
    actsOnChange: string[];
  };
  /* Places the page has set aside for announcing something that changes
     without a page load — WCAG 4.1.3. A live region is the only mechanism
     a screen reader has for hearing an update it did not cause, and its
     absence is the one half of this criterion that is visible from the
     markup. */
  liveRegions: number;
  /* Whether a stylesheet answers an orientation with a rotation or by
     hiding the page — WCAG 1.3.4. Somebody with a phone mounted to a
     wheelchair cannot turn it, so a page that only works one way up is a
     page they cannot use. */
  orientationLock: boolean;
  /* Elements whose only tooltip is a title attribute — WCAG 1.4.13. The
     browser's own tooltip cannot be dismissed with Escape, cannot be
     hovered onto to read a long one, and never appears at all for somebody
     using a keyboard or a touchscreen. */
  titleTooltips: number;
  /* Passages written in an alphabet the page's declared language does not
     use, carrying no language of their own — WCAG 3.1.2.

     Script is not language, and this deliberately claims only the part that
     is provable: a run of Cyrillic on a page declaring English is in some
     language, and it is not the one declared. A French passage on an
     English page shares the Latin alphabet and is invisible here — that
     half of the criterion still needs a person. */
  unmarkedScripts: number;
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
    // Whether focus was inside the dialog when the page finished loading.
    hasFocusInside: boolean;
    // On screen when the page settled. A dialog that is not cannot be
    // photographed, and mostly cannot be judged either.
    visible: boolean;
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
    nodes: Array<{
      // An entry is a plain selector, or — for an element inside a shadow
      // root — an array forming a piercing path: [host selector, inner
      // selector]. axe pierces open shadow roots natively, so any site built
      // from web components produces these.
      target: Array<string | string[]>;
      html: string;
      failureSummary?: string;
      // axe attaches per-check data here. For color-contrast it is the pair of
      // colours and the ratio required, which is everything needed to work out
      // a colour that would pass — see services/contrast.
      any?: Array<{ id: string; data?: unknown }>;
    }>;
  }>;
  /**
   * Checks that ran and could not reach a verdict.
   *
   * axe is built to report no false positives, and the way it earns that is by
   * routing anything it cannot settle here instead of into violations. Text
   * over a photograph or a gradient is the common case: the engine can read
   * the foreground colour and has no single background colour to measure it
   * against. Video captions are another — it can see a video element and
   * cannot watch it.
   *
   * We discarded this array, which quietly made those cases disappear rather
   * than pass. Measured across five sites: Wikipedia returned 4 violations and
   * 163 undecided nodes, and the Guardian three videos whose captions nobody
   * had confirmed either way.
   */
  incomplete: Array<{
    id: string;
    impact: "critical" | "serious" | "moderate" | "minor" | null;
    tags: string[];
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ target: Array<string | string[]>; html: string }>;
  }>;
}

/**
 * One selector string for an axe node target.
 *
 * target is an array, and its entries can themselves be arrays: a shadow-DOM
 * piercing path of [host, inner]. The old code joined the outer array with a
 * space, which coerces an inner array with commas — and a comma makes a CSS
 * selector LIST, "match the host OR the inner element". Every capture,
 * displayed selector, and deduplication key for a shadow element then pointed
 * at the component's host instead of the element axe flagged. Found by
 * auditing against the element-screenshot spec, which calls this exact case
 * out; our own demo widget is a web component and would have produced these.
 *
 * Flattened with spaces: Playwright's CSS engine pierces open shadow roots
 * with plain descendant selectors, so "my-panel img" resolves for capture.
 * document.querySelector does not pierce — in-page probes that miss simply
 * record their honest "unreachable"/"missing" reason, which the notes
 * machinery already explains.
 */
export function axeTargetToSelector(target: Array<string | string[]>): string {
  return target.flat().join(" ");
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
  /**
   * Milliseconds spent in each named phase of the render.
   *
   * Added after two separate timing problems were diagnosed by guesswork
   * before measurement corrected them: probes suspected of costing seconds
   * that cost about one between them, and a budget that failed on a shared
   * CPU for arithmetic reasons rather than because any page was slow. A
   * render that takes seventy-nine seconds should be able to say where they
   * went without anyone rebuilding it to find out.
   */
  phaseMs: Record<string, number>;
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
  // Selectors whose findings were measured inside an iframe, mapped to that
  // frame's origin. The capture pass resolves these inside the frame, and the
  // report's picture notes say where the element actually lives.
  frameSelectors: Record<string, string>;
  // Approximation of what a screen reader announces, in reading order —
  // rendered as a playable preview in the widget.
  screenReaderScript: ScreenReaderScript;
  // Measurements of the page before and after the WCAG text-spacing and
  // 200%-text overrides — evaluated into resize findings
  // (services/textResize/analyzeTextResize.ts).
  textResizeSignals: TextResizeSignals;
  // What a real keyboard does to a modal that was open on arrival — Escape,
  // and where focus sits (services/dialog/analyzeDialogs.ts).
  dialogKeyboard: DialogKeyboardResult[];
  // How the page answers reduced-motion and forced-colours, measured by
  // asking for them rather than reading the stylesheet
  // (services/motion/analyzeMotion.ts).
  userPreferences: UserPreferenceSignals;
  // Rows where CSS reordering made the tab order disagree with what is on
  // screen (services/readingOrder/analyzeReadingOrder.ts).
  readingOrder: ReadingOrderSignals;
  // Main-content prose and the declared language, for the reading-level
  // advisory (services/readability/analyzeReadability.ts).
  readability: ReadabilitySignals;
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
    // CSS.escape, because an id is not automatically a valid CSS identifier.
    // Generated markup routinely produces ids starting with a digit, and
    // "#6a67b23825139" is a syntax error rather than a selector — every
    // querySelector for it throws. Nothing downstream could resolve those
    // elements, so a consent dialog with a hashed id was reported with no
    // screenshot and no measurable box, and the failure was silent because
    // each caller catches and carries on.
    if (el.id) return `#${CSS.escape(el.id)}`;
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

  // Capped like every other list collected here. A page with more than
  // twenty players has a pattern, not twenty separate problems, and the
  // analyzer reports the count either way.
  const mediaElements = Array.from(document.querySelectorAll("video, audio"))
    .slice(0, 20)
    .map((el) => {
      const media = el as HTMLMediaElement;
      return {
        selector: cssPath(el),
        tag: el.tagName.toLowerCase() as "video" | "audio",
        trackKinds: Array.from(el.querySelectorAll("track")).map(
          (t) => t.getAttribute("kind") ?? "subtitles" // the HTML default
        ),
        muted: media.hasAttribute("muted") || media.muted,
        hasControls: el.hasAttribute("controls"),
        label:
          el.getAttribute("aria-label") ??
          el.getAttribute("title") ??
          "",
      };
    });

  // Players that live inside an iframe. We cannot see whether the video
  // playing in one has captions — the document belongs to the provider, not
  // the page — so these are counted and named, never judged.
  const EMBED_HOSTS: Array<[RegExp, string]> = [
    [/(?:^|\.)youtube(?:-nocookie)?\.com$|(?:^|\.)youtu\.be$/i, "YouTube"],
    [/(?:^|\.)vimeo\.com$/i, "Vimeo"],
    [/(?:^|\.)wistia\.(?:com|net)$/i, "Wistia"],
    [/(?:^|\.)loom\.com$/i, "Loom"],
    [/(?:^|\.)dailymotion\.com$/i, "Dailymotion"],
    [/(?:^|\.)brightcove\.(?:com|net)$/i, "Brightcove"],
    [/(?:^|\.)soundcloud\.com$/i, "SoundCloud"],
    [/(?:^|\.)spotify\.com$/i, "Spotify"],
  ];
  const mediaEmbeds = Array.from(document.querySelectorAll("iframe[src]"))
    .map((el) => {
      let host = "";
      try {
        host = new URL((el as HTMLIFrameElement).src, location.href).hostname;
      } catch {
        return null;
      }
      const match = EMBED_HOSTS.find(([re]) => re.test(host));
      // A named provider, or a player this page hosts itself. The list above
      // covers the big eight and missed every broadcaster and publisher
      // running its own player — measured on bbc.co.uk/news, which is full
      // of video and reported none.
      //
      // The fallback keys on the permissions an iframe asks for rather than
      // its URL. A video player requests fullscreen or autoplay; the embeds
      // that would otherwise be swept up here — maps, posts, comment
      // widgets — ask for neither, and a map reported as an uncaptioned
      // video is worse than the video being missed.
      if (!match) {
        const allow = (el.getAttribute("allow") ?? "").toLowerCase();
        const fullscreen =
          /fullscreen|autoplay/.test(allow) || el.hasAttribute("allowfullscreen");
        if (!fullscreen) return null;
        return { selector: cssPath(el), provider: host, title: el.getAttribute("title") ?? "" };
      }
      return {
        selector: cssPath(el),
        provider: match[1],
        title: el.getAttribute("title") ?? "",
      };
    })
    .filter((e): e is { selector: string; provider: string; title: string } => e !== null)
    .slice(0, 20);

  // Navigation landmarks first, header only as a fallback: a great many
  // sites still wrap their menu in a bare <header> with no nav landmark, and
  // skipping those would leave this check silent on exactly the templates
  // most likely to be inconsistent.
  const navScopes = Array.from(
    document.querySelectorAll('nav, [role="navigation"]')
  );
  const scopes = navScopes.length > 0 ? navScopes : Array.from(document.querySelectorAll("header"));
  const navSeen = new Set<string>();
  const navigation: Array<{ text: string; href: string }> = [];
  for (const scope of scopes) {
    for (const a of Array.from(scope.querySelectorAll("a[href]"))) {
      if (navigation.length >= 40) break;
      const link = a as HTMLAnchorElement;
      // The resolved URL, minus the fragment: /about and /about#top are the
      // same destination, and a menu that differs only by anchor is not an
      // inconsistency anybody experiences.
      let href = "";
      try {
        const u = new URL(link.href, location.href);
        u.hash = "";
        href = u.toString();
      } catch {
        continue;
      }
      const text = (link.getAttribute("aria-label") ?? link.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim();
      if (!text || navSeen.has(href)) continue;
      navSeen.add(href);
      navigation.push({ text, href });
    }
  }

  const probe = (window as unknown as {
    __a11yListeners?: {
      globals: Record<string, number>;
      pointerTargets: Array<{ el: Element; down: boolean; up: boolean }>;
      changeTargets: Element[];
    };
  }).__a11yListeners;

  // Two signals, both narrow on purpose. 3.2.2 is about a control that
  // changes your context the instant you set its value, and the honest
  // trouble is that most controls reacting to change are perfectly ordinary
  // — a filter that repaints a list below it breaks nothing. Reporting every
  // select with a change handler would put a row on nearly every site and
  // teach the reader to skip this one.
  const actsOnChangeSet = new Set<string>();

  // 1. The handler says so itself. An inline onchange that submits, or sets
  //    location, is the behaviour written down in the markup — no inference.
  const ACTS = /\b(submit|location|\.href|window\.open|\.click\(\))/i;
  for (const el of Array.from(document.querySelectorAll("[onchange], [oninput]"))) {
    const code = (el.getAttribute("onchange") ?? "") + ";" + (el.getAttribute("oninput") ?? "");
    if (ACTS.test(code)) actsOnChangeSet.add(cssPath(el));
  }

  // 2. A select that reacts to change, inside a form with no way to submit
  //    it. The missing submit button is what makes this the auto-submit
  //    menu rather than an ordinary filter: if choosing an option is the
  //    only way to send the form, choosing one must be sending it.
  for (const el of probe?.changeTargets ?? []) {
    if (!el.isConnected || el.tagName !== "SELECT") continue;
    const form = (el as HTMLSelectElement).form;
    if (!form) continue;
    if (form.querySelector('button:not([type="button"]), input[type="submit"], input[type="image"]')) {
      continue;
    }
    actsOnChangeSet.add(cssPath(el));
  }
  const listeners = {
    motion: Boolean(probe?.globals.devicemotion || probe?.globals.deviceorientation),
    keyboardGlobal: Boolean(probe?.globals.keydown || probe?.globals.keypress),
    pressWithoutRelease: (probe?.pointerTargets ?? [])
      .filter((e) => e.down && !e.up && e.el.isConnected)
      .slice(0, 20)
      .map((e) => cssPath(e.el)),
    actsOnChange: Array.from(actsOnChangeSet).slice(0, 20),
  };

  // aria-live="off" is an explicit opt-out and is not a place anything gets
  // announced, so it does not count.
  const liveRegions = Array.from(
    document.querySelectorAll(
      '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"], [role="log"], output'
    )
  ).length;

  // The lock has a shape: an orientation media query whose body rotates the
  // page back, or hides it and shows a "please rotate" panel instead. A
  // query that merely adjusts a layout is the normal, good use of one, so
  // the rule text has to say more than "orientation" to count.
  let orientationLock = false;
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules ?? [])) {
          if (!(rule instanceof CSSMediaRule)) continue;
          if (!/orientation\s*:/i.test(rule.conditionText ?? "")) continue;
          const body = Array.from(rule.cssRules ?? [])
            .map((r) => r.cssText)
            .join(" ");
          if (/transform\s*:[^;]*rotate|display\s*:\s*none/i.test(body)) {
            orientationLock = true;
            break;
          }
        }
      } catch {
        // Cross-origin sheet — unreadable, and not ours to judge.
      }
      if (orientationLock) break;
    }
  } catch {
    orientationLock = false;
  }

  // iframe and frame are excluded: there, title is the accessible name and
  // the right thing to have. Same for anything where the title is doing the
  // naming because nothing else does — flagging those would be telling a
  // page to remove the only name an element has.
  const titleTooltips = Array.from(document.querySelectorAll("[title]")).filter((el) => {
    const tag = el.tagName.toLowerCase();
    if (tag === "iframe" || tag === "frame" || tag === "svg" || tag === "title") return false;
    const title = (el.getAttribute("title") ?? "").trim();
    if (!title) return false;
    // A title that duplicates the element's own text is a tooltip, not a
    // name. A title on an element with no text at all is carrying the name.
    const text = (el.textContent ?? "").trim();
    const labelled =
      el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby");
    return text.length > 0 || labelled;
  }).length;

  const SCRIPTS: Array<[string, RegExp]> = [
    ["latin", /[A-Za-z\u00C0-\u024F]/],
    ["cyrillic", /[\u0400-\u04FF]/],
    ["greek", /[\u0370-\u03FF]/],
    ["arabic", /[\u0600-\u06FF]/],
    ["hebrew", /[\u0590-\u05FF]/],
    ["cjk", /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/],
    ["devanagari", /[\u0900-\u097F]/],
  ];
  const LANG_SCRIPT: Record<string, string> = {
    en: "latin", fr: "latin", de: "latin", es: "latin", it: "latin", pt: "latin",
    nl: "latin", pl: "latin", sv: "latin", da: "latin", no: "latin", fi: "latin",
    cs: "latin", tr: "latin", vi: "latin", id: "latin", ms: "latin", ro: "latin",
    ru: "cyrillic", uk: "cyrillic", bg: "cyrillic", sr: "cyrillic",
    el: "greek", ar: "arabic", fa: "arabic", ur: "arabic", he: "hebrew",
    zh: "cjk", ja: "cjk", ko: "cjk", hi: "devanagari", mr: "devanagari",
  };
  const pageLang = (document.documentElement.getAttribute("lang") ?? "")
    .slice(0, 2)
    .toLowerCase();
  const expected = LANG_SCRIPT[pageLang];

  let unmarkedScripts = 0;
  if (expected) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? "").trim();
      // Short runs are names, codes and stray glyphs, not passages.
      if (text.length < 12) continue;
      const el = node.parentElement;
      if (!el || seen.has(el)) continue;
      // Already declared — the page is doing the right thing here.
      if (el.closest("[lang]") !== document.documentElement) continue;
      // The dominant script of the run, by how many letters each matches.
      let best = ""; let bestCount = 0;
      for (const [name, re] of SCRIPTS) {
        const g = new RegExp(re.source, "g");
        const n = (text.match(g) ?? []).length;
        if (n > bestCount) { bestCount = n; best = name; }
      }
      // Half the run has to be in the other script, so a quoted word or a
      // brand name does not make a passage foreign.
      if (best && best !== expected && bestCount >= text.length / 2) {
        seen.add(el);
        unmarkedScripts += 1;
      }
    }
  }

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
        // The close control, in the languages this report is read in. An
        // English-only match meant a German banner's "Schließen" was not
        // recognised as a close control at all, so the dialog was reported as
        // having no way out when it plainly had one.
        if (
          /(?<!\p{L})(close|dismiss|no thanks|not now|schlie(ß|ss)en|fermer|sluiten|cerrar|chiudi|fechar|zamknij|st\u00e4ng|lukke?|sulje)(?!\p{L})/iu.test(hay) ||
          /✕|✖|⨯|╳|^\s*[x×]\s*$/i.test(hay)
        ) {
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
        // Read here, at load, and nowhere later. The keyboard walk blurs the
        // page and presses Tab dozens of times, so by the end of the scan
        // this answer is about our own instrumentation rather than the site:
        // measured after the walk, a correct dialog reported focus outside it
        // and a focus-trapping one reported focus inside, both backwards.
        hasFocusInside: (() => {
          // Same shadow-host problem as the keyboard walk: contains() is false
          // for a node living in a shadow tree, and the host is what
          // activeElement hands back.
          let active: Element | null = document.activeElement;
          while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
          return !!active && active !== document.body && el.contains(active);
        })(),
        // Whether this dialog was actually on screen when the page settled.
        //
        // The heuristic overlay path below already required visibility, but
        // the explicit path above takes every [role="dialog"] and <dialog> in
        // the document, and a site commonly ships several that stay hidden
        // until something opens them. Those were being reported as pop-ups
        // the visitor meets, counted in "(4 pop-ups)", and picked as the
        // element to photograph — which is why a finding could arrive with no
        // picture and nothing to identify it by.
        visible: (() => {
          try {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            if (parseFloat(cs.opacity) === 0) return false;
            const r = el.getBoundingClientRect();
            return r.width > 1 && r.height > 1;
          } catch (e) {
            return false;
          }
        })(),
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
    mediaElements,
    mediaEmbeds,
    navigation,
    listeners,
    liveRegions,
    orientationLock,
    titleTooltips,
    unmarkedScripts,
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
      // Same escaping as cssPath above — these keys are looked up by selector,
      // so an unescaped alias would simply never match.
      const idSel = id ? `#${CSS.escape(id)}` : "";
      if (idSel && !(idSel in result)) result[idSel] = box;
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
    for (const node of violation.nodes) selectors.add(axeTargetToSelector(node.target));
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
// Kept clear at the end of the render budget for the unbudgeted tail: the
// dialog probe, the preference probe, and assembling the result. Without it
// the last budgeted phase can run right up to the deadline and the steps
// after it push past.
const RENDER_TAIL_MARGIN_MS = 6_000;
// How long to let images, fonts and third-party scripts finish after the
// document is ready. Generous enough for a normal page to complete, short
// enough that one unreachable tracker cannot take the scan down with it.
const SUBRESOURCE_WAIT_MS = 12_000;
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
// Below this, on either side, an element cannot be identified from a picture
// of itself. Icons, checkboxes, radio buttons, close crosses.
const TINY_ELEMENT_PX = 48;

const IMAGE_ALT_RULES = new Set(["image-alt", "input-image-alt", "role-img-alt", "svg-img-alt", "area-alt"]);

async function captureElementScreenshots(
  page: Page,
  // Absolute time this phase must not run past, shared with the rest of the
  // render. Its own budget still applies; whichever is sooner wins.
  hardDeadline: number,
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
      const selector = axeTargetToSelector(node.target);
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
    for (const node of violation.nodes) pushUnique(axeTargetToSelector(node.target));
  }

  const result: Record<string, string> = {};
  const deadline = Math.min(Date.now() + ELEMENT_SHOT_BUDGET_MS, hardDeadline);
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

      // An element too small to be identified on its own is photographed with
      // its surroundings instead. Measured on bundesregierung.de: 21 of 38
      // thumbnails came back narrower than the box the report shows them in,
      // sixteen of those icons under 21px square, which the layout magnified
      // into smudges. The icon alone could not have been identified at any
      // size — what tells the reader which one is meant is the button it sits
      // in and the text beside it.
      //
      // The alt-text suggester reads these same pixels, and it gains here for
      // the same reason: seventeen pixels of glyph is not something to write a
      // description from either.
      const elBox = await locator.boundingBox().catch(() => null);
      if (elBox && (elBox.width < TINY_ELEMENT_PX || elBox.height < TINY_ELEMENT_PX)) {
        const withContext = await captureRegionAround(page, selector, 260, 120);
        if (withContext) result[selector] = withContext;
        continue;
      }
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
        if (!hit) return false;
        if (hit === el || el.contains(hit) || hit.contains(el)) return true;
        // elementFromPoint called on the document stops at a shadow host: for
        // an element inside a web component it returns the host, and
        // contains() does not cross the boundary in either direction — so
        // every visible shadow element failed this check and was refused a
        // picture as "missing". Walk the composed tree instead: if the hit is
        // among el's shadow-crossing ancestors (or vice versa), the point
        // genuinely lands on this element's slab of the page.
        // Inline loops, no named inner function — esbuild's keepNames rewrites
        // those into __name calls that do not exist in the page.
        let n: Node | null = el;
        while (n) {
          if (n === hit) return true;
          n = n.parentNode instanceof ShadowRoot ? n.parentNode.host : n.parentNode;
        }
        let m: Node | null = hit;
        while (m) {
          if (m === el) return true;
          m = m.parentNode instanceof ShadowRoot ? m.parentNode.host : m.parentNode;
        }
        return false;
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
async function captureWithContext(
  scope: Page | Frame,
  selector: string
): Promise<string | null> {
  const locator = scope.locator(selector).first();
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
// Origin of a URL, or the string itself if it will not parse. Frame identity
// across two visits is an origin question: the path and query of a consent
// frame change per visit, the host does not.
function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

export interface FreshCaptureResult {
  shots: Record<string, string>;
  /**
   * Why a selector could not be photographed, where the page could tell us.
   * "hidden" and "offscreen" are usually correct behaviour rather than a
   * fault — the report just has to say so instead of showing a blank.
   */
  unpicturable: Record<
    string,
    | "hidden"
    | "offscreen"
    | "missing"
    | "too-large"
    | "no-usable-image"
    // The loop never reached it: the per-scan shot cap or the time budget ran
    // out first. Not a fact about the element at all, and the report has to
    // say so rather than leave the card bare — this was the last silent way
    // out of this function, found by counting seven bare cards on moma.org.
    | "not-attempted"
    // Locating it threw: a selector the engine accepts but the browser's
    // querySelector does not, or a node that detached mid-visit.
    | "unreachable"
  >;
}

export async function captureSelectorsFresh(
  url: string,
  selectors: string[],
  // Selectors that name a discrete element by tag or id are worth capturing at
  // any height (a tall product photo is still one photo). Everything else has
  // to prove it's component-sized, because the model is told to fall back to
  // the containing section for layout findings and a picture of a section
  // tells the reader nothing.
  alwaysCapture: (selector: string) => boolean,
  // Selectors measured inside an iframe rather than the main document, keyed
  // to the frame they came from. A consent banner is very often one of these:
  // Sourcepoint, OneTrust and Didomi all render theirs in a third-party frame.
  // Its selector is a path through that frame's document, and run against the
  // main document it does not mean nothing -- it means something else. On
  // spiegel.de the banner's path matched two unrelated elements in the host
  // page, and the first of them is what we photographed.
  frameForSelector: Record<string, string> = {}
): Promise<FreshCaptureResult> {
  if (selectors.length === 0) return { shots: {}, unpicturable: {} };

  return withPage(async (page: Page) => {
    const result: FreshCaptureResult = { shots: {}, unpicturable: {} };
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
        // Match the frame by origin, not by full URL. CMP frame URLs carry a
        // per-visit message id -- spiegel.de's ends "?message_id=142" -- so an
        // exact comparison would miss on the second visit every time.
        const wantOrigin = frameForSelector[selector];
        // Main frame excluded for the same reason as the frame audit: every
        // file:// document's origin is the literal string "null", and an
        // origin match would hand a fixture's selectors to the host page.
        const scope: Page | Frame = wantOrigin
          ? (page.frames().find((f) => f !== page.mainFrame() && originOf(f.url()) === wantOrigin) ?? page)
          : page;
        // The frame is gone on this visit (consent already given, a different
        // CMP flight, a frame that failed to load). Photographing the same
        // path against the main document would produce a picture of something
        // else entirely, so take none.
        if (wantOrigin && scope === page) {
          result.unpicturable[selector] = "missing";
          continue;
        }
        // A selector that doesn't name one discrete element has to prove it's
        // component-sized before we spend a shot on it — the model is told to
        // fall back to the containing section for layout findings, and a
        // picture of a whole section tells the reader nothing.
        if (!alwaysCapture(selector)) {
          const box = await scope.locator(selector).first().boundingBox().catch(() => null);
          if (box && box.height > MAX_COMPONENT_HEIGHT_PX) {
            // Skipped for being a whole region rather than a component, and
            // that used to happen in silence — the card arrived with no
            // picture and no reason, which is the thing this whole mechanism
            // exists to stop. A reason is recorded even though the skip is
            // correct: a picture of an entire page section shows the reader
            // nothing about which part of it is at fault.
            result.unpicturable[selector] = "too-large";
            continue;
          }
        }
        const shot = await captureWithContext(scope, selector);
        if (shot) {
          result.shots[selector] = shot;
          continue;
        }
        // No picture. Find out why, because a finding with nothing to look at
        // and no explanation is one the reader cannot place — which is how a
        // hidden dialog came to be reported as an unidentifiable "Dialog".
        // Most of these are entirely correct: a skip link lives off-screen
        // until it takes focus, and a search panel has no size until it is
        // opened. Saying so turns an apparent malfunction into information.
        const why = await scope
          .evaluate(([sel]) => {
            try {
              const el = document.querySelector(sel);
              if (!el) return "missing";
              const cs = getComputedStyle(el);
              if (cs.display === "none" || cs.visibility === "hidden") return "hidden";
              if (parseFloat(cs.opacity) === 0) return "hidden";
              const r = el.getBoundingClientRect();
              if (r.width < 2 || r.height < 2) return "hidden";
              // Deliberately off to one side — the standard way a skip link is
              // kept out of sight until somebody tabs to it.
              if (r.right < 0 || r.bottom < 0 || r.left > window.innerWidth) return "offscreen";
              // Resolvable, on screen, sized — and the capture still produced
              // nothing usable. Blank frames are discarded on purpose (a flat
              // rectangle of one colour tells the reader nothing and has been
              // shipped as a "screenshot" before), and an element hidden
              // behind an overlay photographs the overlay. Either way there
              // is no picture, and saying so beats a silent blank: the last
              // card on the Guardian sat bare for exactly this reason after
              // three other causes had been explained.
              return "no-usable-image";
            } catch (e) {
              return "missing";
            }
          }, [selector] as const)
          .catch(() => "");
        if (why) result.unpicturable[selector] = why as FreshCaptureResult["unpicturable"][string];
      } catch {
        // Invalid selector, detached node, timeout. Skip it and keep going —
        // but on the record: an exception here used to leave the finding with
        // no picture and no reason, indistinguishable from never having been
        // tried.
        result.unpicturable[selector] = "unreachable";
      }
    }
    // Whatever the loop never reached — past the shot cap, or past the
    // deadline — gets the honest reason rather than silence.
    for (const selector of selectors) {
      if (!(selector in result.shots) && !(selector in result.unpicturable)) {
        result.unpicturable[selector] = "not-attempted";
      }
    }
    return result;
  }).catch(() => ({ shots: {}, unpicturable: {} }));
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
        // Remember where it was found. Its selector is a path through this
        // frame's document, and the capture pass runs against the host page
        // unless it is told otherwise.
        if (frame !== page.mainFrame()) {
          merged.consentBanner.frameUrl = frame.url();
        }
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

async function captureRegionAround(
  page: Page,
  selector: string,
  // Smallest frame worth returning. An icon is 16-20px square and a fixed
  // 48px of padding still yields something no reader can identify, so callers
  // picturing small controls ask for a frame that holds enough around it to
  // say which control is meant.
  minWidth = 0,
  minHeight = 0
): Promise<string | null> {
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
    const padX = Math.max(REGION_PADDING_PX, (minWidth - box.width) / 2);
    const padY = Math.max(REGION_PADDING_PX, (minHeight - box.height) / 2);
    const left = Math.max(0, Math.floor(box.x - padX));
    const top = Math.max(0, Math.floor(box.y - padY));
    const right = Math.min(viewport.width, Math.ceil(box.x + box.width + padX));
    const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height + padY));
    const width = right - left;
    const height = bottom - top;
    if (width < 8 || height < 8) return null;

    const raw = await page.screenshot({
      type: "jpeg",
      quality: 70,
      clip: { x: left, y: top, width, height },
      timeout: 3_000,
      animations: "disabled",
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
  hardDeadline: number,
  selectors: string[]
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const seen = new Set<string>();
  const deadline = Math.min(Date.now() + MOBILE_SHOT_BUDGET_MS, hardDeadline);
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

async function captureKeyboardNavigation(
  page: Page,
  hardDeadline: number
): Promise<KeyboardNavResult> {
  const stops: TabStop[] = [];
  let reachedEnd = false;
  let failed = false;
  let truncated = false;

  const readActive = () =>
    page.evaluate(() => {
      // document.activeElement stops at a shadow host: focus anywhere inside a
      // web component reports the host itself. Every Tab press then returns the
      // same element and the walk concludes focus is stuck.
      //
      // Measured on this project's own widget, which renders into a shadow
      // root: the scan reported a critical keyboard trap and "1 of 1 stops
      // show no focus outline", for a component that traps nothing and draws
      // a ring on every control. Any site built from web components would have
      // received the same two findings, both false, and a critical one at
      // that. Descending into the shadow root reads what is really focused.
      let el: Element | null = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && node.nodeType === 1 && parts.length < 6) {
        let sel = node.tagName.toLowerCase();
        if (node.id) {
          // Escaped for the same reason as cssPath: readUnfocused looks the
          // element up again by this selector, and an invalid one throws, so
          // the stop was recorded with unfocused: null and quietly dropped
          // from every focus-indicator check.
          parts.unshift(`#${CSS.escape(node.id)}`);
          break;
        }
        // parentElement is null for a node sitting directly in a shadow root:
        // its parent is the ShadowRoot, which is a DocumentFragment. Without
        // this the three buttons in a component all produced the bare string
        // "button", three identical stops in a row, and the trap rule fires on
        // exactly that. Counting siblings through parentNode keeps them apart,
        // and stepping to the host keeps the path going instead of stopping at
        // the boundary.
        const parent: ParentNode | null = node.parentElement ?? node.parentNode;
        if (parent && "children" in parent) {
          const tag = node.tagName;
          const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
          if (siblings.length > 1) sel += `:nth-of-type(${siblings.indexOf(node) + 1})`;
        }
        parts.unshift(sel);
        const root = node.parentNode as ShadowRoot | null;
        node = node.parentElement ?? (root && "host" in root ? (root.host as Element) : null);
      }
      const cs = getComputedStyle(el);
      // The colour the focus ring is actually seen against. An outline is
      // drawn outside the element's border box, so it sits on whatever is
      // behind the element, not on the element's own background — and that is
      // what 1.4.11 means by "adjacent background". Walk up for the first
      // ancestor with a non-transparent background, defaulting to white.
      // Written as an inline loop with no named inner function: esbuild's
      // keepNames rewrites those into __name calls that do not exist here.
      let backdropColor = "rgb(255, 255, 255)";
      let bgNode: Element | null = el.parentElement;
      while (bgNode) {
        const bg = getComputedStyle(bgNode).backgroundColor;
        if (bg && bg !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg)) {
          backdropColor = bg;
          break;
        }
        bgNode = bgNode.parentElement;
      }
      return {
        selector: parts.join(" > "),
        tag: el.tagName.toLowerCase(),
        styles: {
          outlineStyle: cs.outlineStyle,
          outlineWidth: cs.outlineWidth,
          outlineColor: cs.outlineColor,
          boxShadow: cs.boxShadow,
          backgroundColor: cs.backgroundColor,
          borderColor: cs.borderColor,
          backdropColor,
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
          outlineColor: cs.outlineColor,
          boxShadow: cs.boxShadow,
          backgroundColor: cs.backgroundColor,
          borderColor: cs.borderColor,
          // Only read while focused: the unfocused state never draws a ring,
          // so its backdrop is not needed and is left at the same default.
          backdropColor: "rgb(255, 255, 255)",
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

    const deadline = Math.min(Date.now() + KEYBOARD_BUDGET_MS, hardDeadline);
    let pending: { selector: string; tag: string; styles: FocusStyles } | null = null;

    for (let i = 0; i < MAX_TAB_STOPS; i++) {
      if (Date.now() > deadline) {
        // Out of time rather than out of page. Only counts as truncation if
        // the cycle had not already wrapped round to the start.
        truncated = !reachedEnd;
        break;
      }
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
        // Focus is on <body>. What that means depends entirely on whether the
        // walk has started.
        //
        // After a stop has been recorded it means the cycle wrapped round, and
        // the walk is done. Before that it means the press went nowhere, and
        // treating it as a completed cycle ends the walk having seen nothing.
        //
        // Which is what happened on any page whose consent dialog takes focus
        // at load — a great many of them. Measured on theguardian.com: focus
        // starts inside the Sourcepoint iframe, the blur that begins the walk
        // moves it to <body>, and the first Tab press is absorbed getting back
        // into the document. The second press lands on a link and everything
        // afterwards works normally. The walk was giving up one press early
        // and reporting a page with 391 focusable elements as having none.
        //
        // Pressing on costs at most the loop's own cap, and a page that
        // genuinely has nothing to focus simply exhausts it.
        //
        // Verified against theguardian.com rather than a fixture, and that is
        // not laziness. A local fixture with an iframe that takes focus does
        // not reproduce it: blurring in the main document is enough there, and
        // the first Tab lands on a link. The absorbed press needs a
        // cross-origin subframe holding focus, which a file:// page cannot
        // have. A fixture was written, found to pass with the fix removed, and
        // deleted — a test that cannot fail is worse than none.
        if (stops.length === 0 && !pending) continue;
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

  // A walk that recorded nothing did not succeed, whatever reachedEnd says.
  //
  // The first Tab press landing on <body> is read as the cycle having wrapped
  // round, which is right on a page with one focusable element and wrong on a
  // page whose focus is somewhere the main document cannot see. Measured on
  // theguardian.com, whose consent iframe holds focus at load: zero stops,
  // reachedEnd true, walk over in five milliseconds — and every focus check
  // downstream then found nothing to complain about and said so. A silent
  // pass on a page nobody tested is the failure mode `failed` exists to
  // prevent, so an empty walk counts as one.
  if (stops.length === 0) failed = true;

  const mouseOnly = await collectMouseOnlyControls(page);
  return { stops, reachedEnd, failed, truncated, mouseOnly };
}

/**
 * Reads back the elements the click-listener probe recorded (see
 * CLICK_LISTENER_PROBE in browserPool.ts) and keeps only those a keyboard
 * genuinely cannot reach.
 *
 * Every filter below removes a pattern that is correct but looks suspicious,
 * and each was put here because it fired on a real page:
 *
 *   - the handler is on <html>/<body>: event delegation, the standard way a
 *     framework routes clicks for the whole page
 *   - the element is focusable, or sits inside something focusable: the
 *     keyboard reaches it by tabbing to that
 *   - it contains a focusable element: a wrapper listening for clicks on the
 *     real control inside it
 *   - pointer-events: none, or hidden: not clickable either, so not a case of
 *     mouse-only access
 *   - larger than half the viewport: a backdrop or page shell, where the click
 *     handler is a dismiss shortcut rather than the only way to do something
 *
 * Verified against qa-layers.html, which holds both faults and the five
 * correct patterns beside them: both faults reported, all five rejected, and
 * removing any single filter above makes that test fail.
 *
 * On real sites it is quiet, which is the point. gov.uk, smashingmagazine.com,
 * rijksakademie.nl and kunsthallebern.ch reported nothing at all — their
 * candidates were a delegation root, a pointer-events:none overlay and a
 * hidden sidebar. moma.org reported one, and it is real: a carousel's
 * pagination bullets, clickable, with no role and no tabindex, so the slide
 * controls cannot be reached by keyboard at all.
 */
async function collectMouseOnlyControls(page: Page): Promise<MouseOnlyControl[]> {
  try {
    return (await page.evaluate(String.raw`(() => {
      const __name = (fn) => fn;
      const FOCUSABLE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,details,[tabindex],[contenteditable=""],[contenteditable="true"]';
      const MAX_REPORTED = 8;
      const tracked = window.__a11yClickTargets;
      if (!Array.isArray(tracked)) return [];

      const cssPath = (el) => {
        if (el.id) return "#" + CSS.escape(el.id);
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 6) {
          let selector = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (siblings.length > 1) selector += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
          }
          parts.unshift(selector);
          node = parent;
        }
        return parts.join(" > ");
      };

      // Unlike the other snippet builders here, this one keeps the class
      // attribute (truncated). These elements are the ones with no text, no
      // href and no accessible name — that is what makes them findings — so
      // stripping class leaves literally "<div></div>", which tells the
      // developer nothing about which div is meant. Measured on moma.org,
      // where the offender is a carousel's pagination bullets and the class
      // "custom-swiper-pagination-clickable" is the entire identification.
      const snippetOf = (el) => {
        try {
          const clone = el.cloneNode(false);
          for (const attr of Array.from(clone.attributes)) {
            if (/^style$/i.test(attr.name) || /^data-/i.test(attr.name)) clone.removeAttribute(attr.name);
          }
          if (clone.getAttribute("class") && clone.getAttribute("class").length > 80) {
            clone.setAttribute("class", clone.getAttribute("class").slice(0, 80) + "…");
          }
          const open = clone.outerHTML.replace(/<\/[a-z-]+>$/i, "");
          const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
          return (open + text + "</" + el.tagName.toLowerCase() + ">").slice(0, 220);
        } catch (e) {
          return "";
        }
      };

      const out = [];
      for (const el of tracked) {
        if (out.length >= MAX_REPORTED) break;
        try {
          if (!el.isConnected) continue; // detached by a re-render
          const tag = el.tagName.toLowerCase();
          if (tag === "body" || tag === "html") continue;
          if (el.matches(FOCUSABLE)) continue;
          // parentElement first because closest() starts at the element
          // itself, which the line above already covers — walking from the
          // parent keeps the two filters independent and separately testable.
          if (el.parentElement?.closest(FOCUSABLE)) continue;
          if (el.querySelector(FOCUSABLE)) continue;
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || cs.pointerEvents === "none") continue;
          if (parseFloat(cs.opacity) === 0) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) continue;
          if (r.width * r.height > window.innerWidth * window.innerHeight * 0.5) continue;
          out.push({
            selector: cssPath(el),
            snippet: snippetOf(el),
            tag,
            label: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60),
          });
        } catch (e) {
          // skip a bad element
        }
      }
      return out;
    })()`)) as MouseOnlyControl[];
  } catch (err) {
    logger.warn({ err }, "Mouse-only control probe failed — reporting without it");
    return [];
  }
}

/**
 * Finds places where CSS has reordered controls, so the order you see and the
 * order you tab through disagree (WCAG 2.4.3 Focus Order).
 *
 * The approach is deliberately not geometric guesswork, which is what made
 * earlier attempts at this too noisy to ship. It starts from the cause: only
 * a handful of CSS features can reorder anything — `order`, a reversed
 * flex-direction or flex-wrap, explicit grid placement, and grid-auto-flow:
 * dense. A container using none of them cannot have this fault, and most of
 * the page is dismissed before any measuring happens.
 *
 * Two further constraints came from measuring against real sites, and both
 * removed whole classes of false positive:
 *
 * 1. Two focusable elements must themselves be out of order relative to each
 *    other. Reordering children is common and usually harmless — gov.uk swaps
 *    the image and text of a card, the BBC places grid items explicitly — and
 *    with one focusable per card there is no sequence to get wrong. Requiring
 *    a genuine pair took gov.uk from four findings to none and the BBC from
 *    five. The work is done by the pair comparison below, which cannot fire
 *    on a lone control; the length test is only an early exit.
 *
 * 2. Only elements on the same visual row are compared. Down a column,
 *    reading order is genuinely ambiguous: a three-column footer is read
 *    column by column, so sorting everything row-major reports a fault that
 *    is not there. That was the last false positive standing, on moma.org's
 *    `divided-columns` and kunsthallebern.ch's front page grid.
 *
 * What remains is the case with no ambiguity at all: two controls side by
 * side on one line, where the one that reads first is reached second.
 */
export interface ReadingOrderSignals {
  /** Set when the probe could not run — see the note on incompleteChecks. */
  failed?: boolean;
  reorderedRows: Array<{
    selector: string;
    reason: string;
    firstInDom: string;
    firstOnScreen: string;
  }>;
}

/** Prose from the main content, plus the declared language, for 3.1.5. */
async function collectReadability(page: Page): Promise<ReadabilitySignals> {
  try {
    return (await page.evaluate(String.raw`(() => {
      const __name = (fn) => fn;
      const root =
        document.querySelector("main") ||
        document.querySelector('[role="main"]') ||
        document.querySelector("article") ||
        document.body;
      if (!root) return { text: "", lang: "" };
      const parts = [];
      let total = 0;
      // Paragraphs and list items only. Headings, nav labels and button text
      // are fragments, and counting them as sentences wrecks the average.
      for (const el of Array.from(root.querySelectorAll("p, li"))) {
        if (total > 20000) break;
        if (el.closest("nav, header, footer, aside, form")) continue;
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (t.length < 40) continue;   // skip captions and stray fragments
        parts.push(t);
        total += t.length;
      }
      return {
        text: parts.join(" "),
        lang: (document.documentElement.getAttribute("lang") || "").toLowerCase().trim(),
      };
    })()`)) as ReadabilitySignals;
  } catch (err) {
    logger.warn({ err }, "Readability probe failed — reporting without it");
    return { text: "", lang: "", failed: true };
  }
}

async function collectReadingOrder(page: Page): Promise<ReadingOrderSignals> {
  try {
    const reorderedRows = (await page.evaluate(String.raw`(() => {
      const __name = (fn) => fn;
      const FOCUSABLE = 'a[href],button,input:not([type="hidden"]),select,textarea,summary,[tabindex]';
      const out = [];
      const label = (el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        return (t || el.getAttribute("aria-label") || el.getAttribute("title") || el.tagName.toLowerCase()).slice(0, 40);
      };
      for (const el of Array.from(document.querySelectorAll("*"))) {
        if (out.length >= 5) break;
        try {
          const cs = getComputedStyle(el);
          if (!/flex|grid/.test(cs.display)) continue;
          const kids = Array.from(el.children).filter((c) => {
            const k = getComputedStyle(c);
            if (k.position === "absolute" || k.position === "fixed") return false;
            const r = c.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          });
          if (kids.length < 2) continue;

          // Which reordering feature is in play, if any.
          let reason = "";
          if (/reverse/.test(cs.flexDirection)) reason = "flex-direction: " + cs.flexDirection;
          else if (/reverse/.test(cs.flexWrap)) reason = "flex-wrap: " + cs.flexWrap;
          else if (/dense/.test(cs.gridAutoFlow)) reason = "grid-auto-flow: dense";
          else {
            for (const c of kids) {
              const k = getComputedStyle(c);
              if (k.order && k.order !== "0") { reason = "order: " + k.order; break; }
              if (/grid/.test(cs.display) &&
                  ((k.gridRowStart && k.gridRowStart !== "auto") ||
                   (k.gridColumnStart && k.gridColumnStart !== "auto"))) {
                reason = "explicit grid placement";
                break;
              }
            }
          }
          if (!reason) continue;

          // Focusable descendants, in the order the keyboard will reach them.
          const foci = [];
          for (const c of kids) {
            const found = c.matches(FOCUSABLE) ? [c] : Array.from(c.querySelectorAll(FOCUSABLE));
            for (const f of found) {
              const r = f.getBoundingClientRect();
              if (r.width > 0 && r.height > 0) {
                foci.push({ el: f, top: r.top, left: r.left });
              }
            }
          }
          if (foci.length < 2) continue;

          const rtl = cs.direction === "rtl";
          for (let a = 0; a < foci.length; a++) {
            let hit = null;
            for (let b = a + 1; b < foci.length; b++) {
              const A = foci[a], B = foci[b];
              if (Math.abs(A.top - B.top) > 6) continue; // different rows
              // A is reached first by Tab. If it sits after B along the
              // reading direction, the row is walked backwards.
              const backwards = rtl ? A.left < B.left : A.left > B.left;
              if (backwards && Math.abs(A.left - B.left) > 12) { hit = B; break; }
            }
            if (!hit) continue;
            const parts = [];
            let node = el;
            while (node && node.nodeType === 1 && parts.length < 6) {
              if (node.id) { parts.unshift("#" + CSS.escape(node.id)); break; }
              let sel = node.tagName.toLowerCase();
              const parent = node.parentElement;
              if (parent) {
                const sib = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
                if (sib.length > 1) sel += ":nth-of-type(" + (sib.indexOf(node) + 1) + ")";
              }
              parts.unshift(sel);
              node = parent;
            }
            out.push({
              selector: parts.join(" > "),
              reason,
              firstInDom: label(foci[a].el),
              firstOnScreen: label(hit.el),
            });
            break;
          }
        } catch (e) {
          // skip a bad container
        }
      }
      return out;
    })()`)) as ReadingOrderSignals["reorderedRows"];
    return { reorderedRows };
  } catch (err) {
    logger.warn({ err }, "Reading-order probe failed — reporting without it");
    return { reorderedRows: [], failed: true };
  }
}

/**
 * Re-renders the page as two kinds of user actually receive it, by switching
 * the media features Chromium exposes and re-reading what changed.
 *
 * Everything here was measured rather than assumed, on a fixture built for
 * the purpose. Under `forced-colors: active`:
 *
 *   box-shadow      -> none          (removed outright)
 *   background-image-> none          (removed outright)
 *   background-color-> system Canvas (every author colour collapses to one)
 *   border-color    -> system text colour
 *   outline         -> kept, recoloured
 *
 * Which is the whole finding: an outline is the only focus indicator that
 * survives. A ring drawn with box-shadow — the single most popular way to do
 * it — is simply not there for someone using Windows High Contrast, and
 * neither is one drawn by swapping a background or border colour, because
 * both states end up the same system colour.
 *
 * Under `prefers-reduced-motion: reduce` nothing is forced at all: the page's
 * own stylesheet either answers or it does not. That is what makes it worth
 * measuring instead of inferring. The existing check searches stylesheets for
 * the string "prefers-reduced-motion" and believes any match, so one
 * unrelated media query anywhere marks a page as respecting a preference it
 * may still ignore on the animation that matters. Asking the page directly
 * replaces a guess with an observation.
 */
export interface UserPreferenceSignals {
  /** Animations still running when reduced motion is asked for. */
  motionIgnoringPreference: Array<{ selector: string; tag: string; animationName: string }>;
  /** Controls whose only visible content is a CSS background image. */
  iconLostInForcedColors: Array<{ selector: string; tag: string; snippet: string }>;
  failed?: boolean;
}

async function probeUserPreferences(
  page: Page,
  animated: Array<{ selector: string; tag: string; animationName: string }>
): Promise<UserPreferenceSignals> {
  const empty: UserPreferenceSignals = {
    motionIgnoringPreference: [],
    iconLostInForcedColors: [],
  };
  // Which controls are drawn only with a CSS background image, read while
  // the page is still rendering normally.
  //
  // This half has to happen first, and getting it wrong was instructive:
  // the check originally ran only under forced colours and flagged any
  // control computing `background-image: none`, on the reasoning that the
  // mode had removed it. It had not — that value is equally true of an
  // element that never had a background image, and on kunsthallebern.ch it
  // reported six `absolute inset-0` overlay links, the stretched-link
  // pattern where a transparent anchor covers a card whose picture and text
  // are siblings. Nothing was lost there because nothing was ever drawn.
  // A disappearance can only be established by seeing the thing first.
  const CANDIDATES = String.raw`(() => {
    const __name = (fn) => fn;
    const out = [];
    const controls = Array.from(
      document.querySelectorAll('button, a[href], [role="button"], summary')
    );
    for (const el of controls) {
      if (out.length >= 8) break;
      try {
        const cs = getComputedStyle(el);
        if (cs.backgroundImage === "none") continue; // nothing to lose
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        if ((el.textContent || "").trim().length > 0) continue;
        if (el.querySelector("img, svg, picture, video, canvas")) continue;
        const glyph = (c) => c && c !== "none" && c !== "normal" && c !== '""';
        if (glyph(getComputedStyle(el, "::before").content)) continue;
        if (glyph(getComputedStyle(el, "::after").content)) continue;
        const parts = [];
        let node = el;
        while (node && node.nodeType === 1 && parts.length < 6) {
          if (node.id) { parts.unshift("#" + CSS.escape(node.id)); break; }
          let sel = node.tagName.toLowerCase();
          const parent = node.parentElement;
          if (parent) {
            const sib = Array.from(parent.children).filter((c) => c.tagName === node.tagName);
            if (sib.length > 1) sel += ":nth-of-type(" + (sib.indexOf(node) + 1) + ")";
          }
          parts.unshift(sel);
          node = parent;
        }
        const name = el.getAttribute("aria-label") || el.getAttribute("title") || "";
        const tag = el.tagName.toLowerCase();
        out.push({
          selector: parts.join(" > "),
          tag,
          snippet: "<" + tag + (name ? ' aria-label="' + name + '"' : "") + "></" + tag + ">",
        });
      } catch (e) {
        // skip
      }
    }
    return out;
  })()`;

  try {
    const candidates = (await page.evaluate(CANDIDATES)) as UserPreferenceSignals["iconLostInForcedColors"];

    // 1. Ask for reduced motion and see which animations carry on regardless.
    //
    // No wait afterwards, and that is measured rather than assumed. There
    // used to be 250ms here "to let the cascade re-resolve", which was a
    // guess: emulateMedia is awaited, and getComputedStyle forces a style
    // flush before it returns anything, so a computed value read after it is
    // never stale. Tested against the fixture at 0, 10, 25, 50, 100 and
    // 250ms — the reduced-motion and forced-colours results were identical at
    // every one, including none at all. Two of these cost half a second of
    // every scan for nothing.
    await page.emulateMedia({ reducedMotion: "reduce" });
    const stillMoving = await page.evaluate(
      (items) => {
        const out: Array<{ selector: string; tag: string; animationName: string }> = [];
        for (const item of items) {
          try {
            const el = document.querySelector(item.selector);
            if (!el) continue;
            const cs = getComputedStyle(el);
            // Respecting the preference means the animation stops. Any of
            // these is a stop: the name is dropped, the duration collapses,
            // or it is explicitly paused.
            const name = cs.animationName;
            const stopped =
              name === "none" ||
              name === "" ||
              parseFloat(cs.animationDuration) === 0 ||
              cs.animationPlayState === "paused";
            if (!stopped) {
              out.push({ selector: item.selector, tag: item.tag, animationName: name });
            }
          } catch {
            // skip
          }
        }
        return out;
      },
      animated.filter((a) => a.animationName && a.animationName !== "none")
    );

    // 2. Now switch to forced colours and confirm each candidate actually
    //    lost its image. Only a before-and-after establishes that.
    await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
    const lostIcons = await page.evaluate(
      (items) => {
        const out: typeof items = [];
        for (const item of items) {
          try {
            const el = document.querySelector(item.selector);
            if (!el) continue;
            // It had one a moment ago; if it has none now, the mode took it.
            if (getComputedStyle(el).backgroundImage === "none") out.push(item);
          } catch {
            // skip
          }
        }
        return out;
      },
      candidates
    );

    return {
      motionIgnoringPreference: stillMoving as UserPreferenceSignals["motionIgnoringPreference"],
      iconLostInForcedColors: lostIcons as UserPreferenceSignals["iconLostInForcedColors"],
    };
  } catch (err) {
    logger.warn({ err }, "User-preference probe failed — reporting without it");
    return { ...empty, failed: true };
  } finally {
    // Always hand the page back as it was found; the dialog probe runs next.
    await page.emulateMedia({ reducedMotion: null, forcedColors: null }).catch(() => {});
  }
}

/**
 * Drives a real keyboard at a modal that is already open, and reports what
 * happens. Covers the last three items of the keyboard checklist: focus moves
 * into the dialog, Escape closes it, and closing leaves focus somewhere sane.
 *
 * Only dialogs already open when the page loads are probed — cookie walls,
 * newsletter overlays, age gates. That is a real limitation and it is
 * deliberate: reaching a dialog that opens on click means clicking a control
 * on somebody else's site, and a scan should not be pressing buttons whose
 * effects it cannot predict. What is covered is the case that blocks people
 * before they have done anything at all, which is also the most common.
 *
 * Runs last in the pipeline, after the mobile pass, because it is the only
 * step that deliberately changes the page: dismissing a cookie banner would
 * otherwise alter what every later layer measures.
 */
export interface DialogKeyboardResult {
  selector: string;
  role: string;
  /** Was focus inside the dialog while it was open? */
  focusMovedIn: boolean;
  closedByEscape: boolean;
  /** Only measured when Escape failed: can Tab move focus out at all? */
  focusEscapes: boolean;
  /** Only meaningful when it closed: focus fell back to nothing. */
  focusLostAfterClose: boolean;
}

async function probeDialogKeyboard(
  page: Page,
  dialogs: Array<{ selector: string; hasFocusInside: boolean }>
): Promise<DialogKeyboardResult[]> {
  if (dialogs.length === 0) return [];
  // Whether the element is still on screen, and whether focus sits inside it.
  const inspect = (selector: string) =>
    page.evaluate(
      ([sel]) => {
        const el = document.querySelector(sel);
        if (!el) return { visible: false, focusInside: false, activeIsBody: true };
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        const visible =
          cs.display !== "none" &&
          cs.visibility !== "hidden" &&
          parseFloat(cs.opacity) > 0 &&
          r.width > 0 &&
          r.height > 0;
        let active: Element | null = document.activeElement;
        while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
        return {
          visible,
          focusInside: !!active && el.contains(active),
          activeIsBody: !active || active === document.body || active === document.documentElement,
        };
      },
      [selector] as const
    );

  const results: DialogKeyboardResult[] = [];
  for (const dialog of dialogs.slice(0, 2)) {
    const selector = dialog.selector;
    try {
      const before = await inspect(selector);
      if (!before.visible) continue; // never opened, or already dismissed

      const role = await page
        .evaluate(([s]) => document.querySelector(s)?.getAttribute("role") ?? "", [selector] as const)
        .catch(() => "");

      await page.keyboard.press("Escape");
      await page.waitForTimeout(450); // closing is usually animated
      const after = await inspect(selector);

      if (!after.visible) {
        results.push({
          selector,
          role,
          focusMovedIn: dialog.hasFocusInside,
          closedByEscape: true,
          focusEscapes: true,
          focusLostAfterClose: after.activeIsBody,
        });
        continue;
      }

      // Escape did nothing. Whether that is merely awkward or an outright
      // trap depends on one further question: can the keyboard get out at
      // all? Tab around and find out, rather than assuming either way.
      let focusEscapes = false;
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press("Tab");
        const probe = await inspect(selector);
        if (!probe.focusInside && !probe.activeIsBody) {
          focusEscapes = true;
          break;
        }
      }
      results.push({
        selector,
        role,
        focusMovedIn: dialog.hasFocusInside,
        closedByEscape: false,
        focusEscapes,
        focusLostAfterClose: false,
      });
    } catch {
      // A dialog that tears itself down mid-probe tells us nothing; skip it.
    }
  }
  return results;
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
    // One clock for the whole render, shared by every phase that has its own
    // budget. Each of those budgets was sound in isolation and the sum was
    // not: element screenshots may take twelve seconds, the keyboard walk
    // six, the mobile pass its own, and nothing was checking the total
    // against the allowance the whole render has. On a slow machine they add
    // up past it and the scan fails outright with "took too long", which is
    // the worst possible outcome — the findings were all there, only the
    // pictures were slow.
    //
    // With a shared deadline a phase takes the smaller of its own budget and
    // whatever is actually left, so a heavy page loses screenshots instead of
    // losing the report. A margin is held back for the work after the last
    // budgeted phase.
    const renderDeadline = budgetMs ? start + budgetMs - RENDER_TAIL_MARGIN_MS : Infinity;
    const remaining = () => renderDeadline - Date.now();

    const phaseMs: Record<string, number> = {};
    // Times a phase and hands its value straight back, so wrapping a call
    // never changes what the call returns.
    const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
      const began = Date.now();
      try {
        return await fn();
      } finally {
        phaseMs[name] = (phaseMs[name] ?? 0) + (Date.now() - began);
      }
    };
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
      // Wait for the document, then give subresources a bounded chance to
      // finish — rather than blocking on all of them.
      //
      // "load" does not fire until every image, font, iframe, advert and
      // tracker has settled, and on a news site that is dozens of third-party
      // requests the page itself does not need. Locally the Guardian's load
      // completes in under half a second; from the deployed service the same
      // scan took seventy-nine, and the page was not the slow part — waiting
      // on other people's servers was.
      //
      // "domcontentloaded" returns the same main response, so the status
      // check below is unaffected. The load wait that follows is best-effort:
      // when it expires the scan carries on with the document it has, because
      // a report measured on a fully-built page missing one advert beats no
      // report at all. settleLayout further down then waits for the geometry
      // to stop moving, which is the thing measurement actually depends on.
      const mainResponse = await timed("goto", () =>
        page.goto(url, { waitUntil: "domcontentloaded", timeout: env.RENDER_TIMEOUT_MS })
      );
      await timed("subresources", () =>
        page.waitForLoadState("load", { timeout: SUBRESOURCE_WAIT_MS }).catch(() => {})
      );
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
      const axeBegan = Date.now();
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
      phaseMs.axe = Date.now() - axeBegan;
      const axe = axeResult;

      // Supplementary context for the AI layer, not something the report
      // depends on — so it must never be able to fail a scan. It normally
      // costs tens of milliseconds, but on a heavy page on a loaded container
      // it hit Playwright's 30s default and took the whole scan of moma.org
      // down with it. Short budget, and an empty snapshot on failure.
      const ariaSnapshot = await timed("ariaSnapshot", () =>
        page.locator("body").ariaSnapshot({ timeout: 8_000 }).catch(() => "")
      );
      const domSignals = await timed("domSignals", () =>
        page.evaluate<DomSignals>(toBrowserScript(extractDomSignalsInPage))
      );
      const typographyBlocks = await timed("typography", () =>
        page
          .evaluate<TypographyBlock[]>(toBrowserScript(collectTypographyBlocksInPage))
          .catch(() => [] as TypographyBlock[])
      );
      // Collected while the page is in its initial desktop state, before the
      // keyboard walk-through and mobile pass mutate it — consent banners and
      // opt-in forms are exactly what those later passes disturb.
      const darkPatternSignals = await timed("darkPatterns", () =>
        collectDarkPatternsAcrossFrames(page)
      );

      // axe injected into the page never sees inside an iframe — and on a
      // large share of European sites the iframe is where the consent
      // banner's own controls live, rendered there by Sourcepoint, OneTrust
      // or Didomi. An unlabeled toggle inside that frame is exactly the kind
      // of fault this product is sold on catching, and it was invisible to
      // every deterministic rule. The whole frame tree is deliberately NOT
      // scanned — ad frames would flood the report with third-party noise
      // the owner cannot fix — only the one frame we already identified as
      // holding the consent banner.
      const frameSelectors: Record<string, string> = {};
      if (darkPatternSignals.consentBanner?.frameUrl) {
        await timed("axeConsentFrame", async () => {
          try {
            const frameUrl = darkPatternSignals.consentBanner!.frameUrl!;
            const wantOrigin = originOf(frameUrl);
            // Never the main frame, and exact URL beats origin: every file://
            // document has the literal origin "null", so an origin match on a
            // fixture would select the host page and audit it twice.
            const frame = page
              .frames()
              .find((f) => f !== page.mainFrame() && (f.url() === frameUrl || originOf(f.url()) === wantOrigin));
            if (!frame) return;
            await frame.addScriptTag({ path: require.resolve("axe-core") });
            const frameAxe = (await frame.evaluate(() =>
              (window as unknown as { axe: { run: () => Promise<unknown> } }).axe.run()
            )) as AxeRunResult;
            for (const violation of frameAxe.violations) {
              // Cap per rule: one consent dialog can hold forty toggle rows,
              // and the report shows one card per rule anyway.
              violation.nodes = violation.nodes.slice(0, 8);
              for (const node of violation.nodes) {
                frameSelectors[axeTargetToSelector(node.target)] = wantOrigin;
              }
              axe.violations.push(violation);
            }
          } catch {
            // A slow or detached frame costs the frame audit, never the scan.
          }
        });
      }
      // Reading-order walk of the accessibility tree, collected in the same
      // pristine desktop state. Best-effort: an empty script just hides the
      // preview rather than costing the report.
      const screenReaderScript = await timed("screenReader", () =>
        page
          .evaluate<ScreenReaderScript>(toBrowserScript(collectScreenReaderScriptInPage))
          .then(condenseScreenReaderScript)
          .catch(() => ({ lines: [], truncated: false }) as ScreenReaderScript)
      );
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
      await timed("settleLayout", () => settleLayout(page));

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
      // Fonts still loading render as invisible or fallback text, and this
      // image is both the report's preview and the AI review's only view of
      // the page. Bounded: a page that never settles its fonts costs two
      // seconds here, not the scan.
      await Promise.race([
        page.evaluate(() => document.fonts?.ready).catch(() => {}),
        new Promise((r) => setTimeout(r, 2_000)),
      ]);
      const screenshotBuffer = await timed("viewportShot", () =>
        page.screenshot({
          type: "jpeg",
          quality: 70,
          animations: "disabled",
        })
      );

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
      const fullPageScreenshot = await timed("fullPageShot", () =>
        page
          .screenshot({ type: "jpeg", quality: 60, fullPage: true, timeout: 10_000, animations: "disabled" })
          .catch(() => null)
      );

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
        ...evaluateDialogs(domSignals.dialogs, []),
        ...evaluateDarkPatterns(darkPatternSignals),
      ]
        .map((f) => f.selector)
        .filter((s) => s && s !== "body" && s !== "html");

      // Precise per-element thumbnails — captured after the screenshots
      // because each one scrolls the page. Best-effort as a whole: if this
      // throws for any reason, fall back to full-page crops rather than
      // failing.
      const elementScreenshots = await timed("elementShots", () =>
        captureElementScreenshots(page, renderDeadline, axe, deterministicSelectors).catch(
          () => ({})
        )
      );

      // Real keyboard walk-through — after the screenshots, because Tab
      // presses scroll the page and flip elements into their :focus styles.
      const keyboardNav = await timed("keyboard", () =>
        captureKeyboardNavigation(page, renderDeadline)
      );

      // Visual-versus-source order. Geometry only, so it changes nothing and
      // has to run at desktop width, before the mobile pass reflows the page.
      //
      // Both are skipped when the render has already overrun. They are worth
      // roughly twenty milliseconds between them on the pages measured, so
      // this will almost never trigger — but a report that arrives without a
      // reading-order check beats one that does not arrive.
      const readingOrder =
        remaining() > 0 ? await collectReadingOrder(page) : { reorderedRows: [] };
      const readability =
        remaining() > 0 ? await collectReadability(page) : { text: "", lang: "" };

      // Text-resize passes — done at desktop width, before the viewport is
      // changed for the mobile pass below.
      const textResizeSignals = await timed("textResize", () => collectTextResizeSignals(page));

      // Mobile pass — resize to a phone width, let the layout reflow, and
      // measure mobile-only problems (sideways scrolling, tiny tap targets).
      // Done last: it changes the viewport, invalidating everything above.
      // Best-effort — a failure just means no mobile findings.
      let mobileSignals: MobileSignals = {
        viewportWidth: 390,
        documentScrollWidth: 0,
        overflowingElements: [],
        crowdedPairs: [],
        stickyCoverage: { totalPx: 0, viewportHeight: 844, elements: [] },
        smallTapTargets: [],
      };
      // Thumbnails for mobile findings, captured at phone width (see
      // captureMobileElementScreenshots). Merged over the desktop captures so
      // a mobile-only element is pictured as it actually renders on a phone.
      let mobileFailed = false;
      let mobileElementScreenshots: Record<string, string> = {};
      let mobileSelectors: string[] = [];
      try {
        await timed("mobileSwitch", async () => {
          await page.setViewportSize({ width: 390, height: 844 });
          // A resized desktop browser is not a phone. mobile:true and touch
          // emulation are what flip `pointer: coarse` and `hover: none`
          // media queries — the difference between the layout a phone
          // renders and the one a narrow desktop window does. Done over CDP
          // on the live page: Playwright fixes isMobile at context creation,
          // and a fresh context would mean a second full page load inside a
          // scan that promises about fifteen seconds. The user agent stays
          // truthful and unchanged — the server already answered it, and
          // swapping it mid-page would misrepresent what was actually
          // served. deviceScaleFactor stays 1: DPR 2 doubles screenshot
          // memory, and this service has hit its memory ceiling before.
          const cdp = await page.context().newCDPSession(page);
          await cdp.send("Emulation.setDeviceMetricsOverride", {
            mobile: true,
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            screenOrientation: { type: "portraitPrimary", angle: 0 },
          });
          await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
          await page.waitForTimeout(400); // let CSS media queries / reflow settle
        });
        mobileSignals = await timed("mobile", () =>
          page.evaluate<MobileSignals>(toBrowserScript(collectMobileSignalsInPage))
        );

        // The 1.4.10 measurement, at the width the criterion is defined at.
        // 390 is a typical phone; 320 is the conformance line, and measuring
        // at 390 alone meant the reflow claim was made at the wrong width.
        await timed("reflow320", async () => {
          await page.setViewportSize({ width: 320, height: 844 });
          await page.waitForTimeout(300);
          mobileSignals.reflow320 = await page.evaluate(toBrowserScript(collectReflow320InPage));
          await page.setViewportSize({ width: 390, height: 844 });
          await page.waitForTimeout(200);
        }).catch(() => {});

        // Orientation lock (1.3.4) — axe's css-orientation-lock rule, which
        // is experimental and off by default. Experimental rules cry wolf,
        // so its results go to the undecided channel for a person to judge
        // rather than into the findings as confident claims.
        await timed("orientationLock", async () => {
          const lock = (await page.evaluate(() =>
            (window as unknown as { axe: { run: (c: unknown, o: unknown) => Promise<unknown> } }).axe.run(
              document,
              { runOnly: { type: "rule", values: ["css-orientation-lock"] } }
            )
          )) as AxeRunResult;
          for (const v of lock.violations) {
            if (v.nodes.length > 0) (axe.incomplete ?? (axe.incomplete = [])).push(v);
          }
        }).catch(() => {});
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
          ...(mobileSignals.reflow320?.overflowingElements.map((o) => o.selector) ?? []),
          ...mobileSignals.smallTapTargets.slice(0, 8).map((t) => t.selector),
          ...mobileSignals.crowdedPairs.slice(0, 4).map((c) => c.selector),
          ...mobileSignals.stickyCoverage.elements.slice(0, 2).map((e) => e.selector),
        ].filter((s) => s && s !== "body" && s !== "html");
        if (mobileSelectors.length > 0) {
          mobileElementScreenshots = await timed("mobileShots", () =>
            captureMobileElementScreenshots(page, renderDeadline, mobileSelectors)
          );
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

      // Escape / focus behaviour of any modal that was open on arrival.
      // Deliberately the very last thing done to the page: it is the only
      // step that sets out to change what is on screen, so nothing measured
      // above can be disturbed by it. The viewport goes back to desktop
      // first, so the dialog is driven at the size everything else saw.
      // How the page answers two user preferences. Non-destructive — it
      // switches media features and reads back, changing no DOM — so it goes
      // before the dialog probe, which does change things.
      let userPreferences: UserPreferenceSignals = {
        motionIgnoringPreference: [],
        iconLostInForcedColors: [],
      };

      let dialogKeyboard: DialogKeyboardResult[] = [];
      try {
        // These two are the tail the margin was reserved for: about a second
        // of deliberate waiting between them, for switching media features
        // and for a dialog's closing animation. If the render is already over
        // its allowance, hand back what exists rather than spending more.
        if (remaining() > -RENDER_TAIL_MARGIN_MS / 2) {
          // Undo the phone emulation along with the phone viewport, so the
          // preference probes and dialog probe below run in the same desktop
          // conditions everything before the mobile pass measured.
          try {
            const cdp = await page.context().newCDPSession(page);
            await cdp.send("Emulation.clearDeviceMetricsOverride");
            await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
          } catch {
            // Emulation cleanup is best-effort; the resize below still runs.
          }
          await page.setViewportSize({ width: 1280, height: 900 });
          await page.waitForTimeout(300);
          userPreferences = await timed("prefsProbe", () =>
            probeUserPreferences(page, domSignals.animatedElements)
          );
          dialogKeyboard = await timed("dialogProbe", () => probeDialogKeyboard(
            page,
            domSignals.dialogs.filter((d) => d.selector)
          ));
        }
      } catch (err) {
        logger.warn({ err }, "Dialog keyboard probe failed — reporting without it");
      }

      // Final check — a late subresource (lazy-loaded image, polling XHR)
      // could have triggered a rebind after the initial navigation settled.
      if (rebindingDetected) throw rebindingDetected;

      return {
        dialogKeyboard,
        userPreferences,
        readingOrder,
        readability,
        pageTitle: domSignals.pageTitle,
        finalUrl: page.url(),
        axe,
        ariaSnapshot,
        domSignals,
        renderTimeMs: Date.now() - start,
        phaseMs,
        screenshotBase64: screenshotBuffer.toString("base64"),
        fullPageScreenshot,
        boundingBoxes,
        elementScreenshots: mergedElementScreenshots,
        typographyBlocks,
        keyboardNav,
        mobileSignals,
        darkPatternSignals,
        frameSelectors,
        screenReaderScript,
        textResizeSignals,
        incompleteChecks: [
          ...(keyboardNav.failed || keyboardNav.truncated ? ["keyboard navigation"] : []),
          ...(mobileFailed ? ["phone layout"] : []),
          ...(textResizeSignals.failed ? ["text resizing"] : []),
          ...(userPreferences.failed ? ["display preferences"] : []),
          // A crashed renderer takes out every probe after it, each caught and
          // logged so the scan still returns a report. That resilience is
          // right, and silently dropping the checks is not: a reader would be
          // told nothing about reading order on a page where the check never
          // ran. Anything that could not run says so here.
          ...(readingOrder.failed ? ["reading order"] : []),
          ...(readability.failed ? ["reading level"] : []),
        ],
      };
    } finally {
      page.off("response", onResponse);
    }
  }, budgetMs);
}
