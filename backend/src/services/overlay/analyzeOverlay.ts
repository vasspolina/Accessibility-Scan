import type { DetectedOverlay } from "../../types/report.js";

// Accessibility overlays: a third-party script a site owner pastes in, which
// adds a floating button and a panel of display settings and, for some
// vendors, rewrites the page's markup at run time.
//
// Why this probe exists. An owner who installed one often believes the site
// now conforms. This report measures the page as it was rendered, overlay
// script included, so the useful thing it can say is exactly that: an overlay
// is loaded here, and the findings below were measured with it on the page.
//
// What it does not say. Nothing here is a finding. An overlay being present
// is not a fault this scan can prove, and whether one helps or harms is an
// argument about a commercial product, not a measurement of this page. So the
// result carries a name and the evidence, and no severity, no criterion and
// no fix.
//
// Where the result goes: `meta.overlays` on the report, not a finding in the
// "design-clarity" category. Both were checked against the code before
// choosing.
//
// A design-clarity finding would also have stayed out of the score:
// summarizeSeverity (merge/scoring.ts) counts category "accessibility" only,
// and buildConformance reads criteria, which this has none of. But a finding
// is more than a row that does not score. Every finding needs a severity,
// which here would be an opinion about the vendor. It is counted in
// categorySummary.designClarity and listed among the design notes as advice
// about the page's design. It gets a fingerprint and a triage state, so an
// owner could mark a fact about their page "fixed" or "false positive". It
// is offered to the AI code fix and the plain-language rewrite, and the
// capture pass tries to photograph its selector. None of that fits a
// statement about the conditions the page was measured under.
//
// meta already holds statements of that kind: incompleteChecks ("these
// checks did not finish"), tabWalkStops ("the walk stopped here"),
// documentKind. They qualify how the findings are read and are never
// counted, scored or triaged. An overlay is the same kind of fact, so it
// sits beside them, and the score, the severity counts, the category counts
// and the conformance table are computed without ever seeing it.

/** What the render pass collects, in one page visit (render/renderPage.ts). */
export interface OverlaySignals {
  /** Every `<script src>` in the document as an absolute URL (http, https
   *  or file), query string and fragment removed, in document order, without
   *  repeats. */
  scriptSrcs: string[];
  /** Which of OVERLAY_MARKER_SELECTORS matched an element when the signals
   *  were read. */
  markers: string[];
}

interface OverlayVendor {
  /** The name as the vendor writes it. */
  vendor: string;
  /** Tested against `hostname + pathname` of each script URL. */
  script: RegExp;
  /** A selector for an element the vendor's script creates in the page's own
   *  document (not inside a shadow root), so its presence means the script
   *  ran and built its widget. */
  marker: string;
}

/* The vendors, each checked on 22 November 2026.
 *
 * Two kinds of evidence stand behind every row, and the rows say which.
 * "Docs" is the embed snippet read on the vendor's own documentation or help
 * pages. "Own site" is the vendor's public website running its own product in
 * a desktop browser, where the script URL was read from `document.scripts`
 * and the marker from the document. Every marker below was read that way,
 * except Eye-Able's, which is read from the vendor's own script (its site
 * serves a self-hosted copy and the widget did not start there).
 *
 * A vendor is left out when neither could be had. AllAccessible and Recite Me
 * publish their snippets (api.allaccessible.org/widget/<id>.js and
 * api.reciteme.com/asset/js) but their widget element was not observed, so
 * they wait for that. MaxAccess now redirects to AudioEye. Nothing here comes
 * from a technology-profiler list or from memory.
 *
 * The patterns are anchored on the host. A match on a path alone, such as
 * "/accessibility.js", would name a vendor on the strength of a filename
 * anyone could have chosen.
 */
const VENDORS: OverlayVendor[] = [
  {
    // Docs (support.accessibe.com, "How to uninstall accessWidget"): an
    // inline loader that sets s.src = 'https://acsbapp.com/apps/app/dist/js/
    // app.js' and calls acsbJS.init(). Own site: the same URL, and four
    // <access-widget-ui> elements under <body>, each with a shadow root.
    vendor: "accessiBe",
    script: /^acsbapp\.com\/apps\/app\//i,
    marker: "access-widget-ui",
  },
  {
    // Docs (help.userway.org): a script with data-account and src
    // "https://cdn.userway.org/widget.js"; the pinned variant loads
    // cdn.userway.org/widgetapp/<date>/widget_app_<n>.js. Own site: both,
    // and div#userwayAccessibilityIcon.
    //
    // widget.js does not start the widget for a user agent matching
    // /(bot|crawler)/i, read in the loader's own source. This scanner
    // declares itself as A11yCheckerBot (render/browserPool.ts), so on a
    // UserWay site the script tag is there and the widget is not. That is
    // the case widgetOnPage exists for: the report must not say the findings
    // were measured with the widget on when it never started.
    vendor: "UserWay",
    script: /^cdn\.userway\.org\/widget(?:\.js|app\/)/i,
    marker: "#userwayAccessibilityIcon",
  },
  {
    // Own site only: AudioEye's help pages describe the install and show no
    // code (the snippet comes from the customer dashboard). audioeye.com
    // loads https://wsmcdn.audioeye.com/aem.js, which injects
    // https://wsv3cdn.audioeye.com/bootstrap.js, and builds div#ae_app under
    // <body> with .ae-module children. The marker asks for both, since
    // "ae_app" alone is a short id another site could plausibly use.
    vendor: "AudioEye",
    script: /^ws(?:m|v3)cdn\.audioeye\.com\//i,
    marker: "#ae_app > .ae-module",
  },
  {
    // Docs (login.equalweb.com, "Equalweb documentation") give the
    // window.interdeal config; equalweb.com's install page shows
    // https://aacdn.equalweb.com/widget.js. Own site: an inline snippet
    // loading https://cdn.equalweb.com/core/5.2.8/accessibility.js, and
    // div#INDshadowRootWrap under <body>.
    vendor: "EqualWeb",
    script: /^(?:cdn\.equalweb\.com\/core\/[^/]+\/accessibility\.js|aacdn\.equalweb\.com\/widget\.js)/i,
    marker: "#INDshadowRootWrap",
  },
  {
    // Own site only: the help articles show no code. equally.ai loads
    // https://widget.equally.ai/equally-widget.min.js and the page holds an
    // <equally-widget-ui> element with a shadow root.
    vendor: "Equally AI",
    script: /^widget\.equally\.ai\//i,
    marker: "equally-widget-ui",
  },
  {
    // Docs (accessiblyapp.com platform guides):
    // https://dash.accessibly.app/widget/<id>/autoload.js. Own site:
    // https://dash.accessiblyapp.com/widget/<id>/autoload.js and
    // https://cdn.accessibly.app/accessibly/2.0.3/accessibly.js, and
    // div#accessiblyAppWidgetButton.
    vendor: "Accessibly",
    script: /^(?:dash\.accessibly(?:app\.com|\.app)\/widget\/|cdn\.accessibly\.app\/accessibly\/)/i,
    marker: "#accessiblyAppWidgetButton",
  },
  {
    // Docs (services.eye-able.com/en/installation and the vendor's blog):
    // https://cdn.eye-able.com/public/js/eyeAble.js with a per-domain file
    // under /configs/, and the same two paths on www.eye-able-cdn.com. Both
    // hosts served an identical file. That file creates a div with id
    // "eyeAble_container_ID" and attaches a shadow root to it
    // (eyeAble_createShadowDOM).
    vendor: "Eye-Able",
    script: /^(?:cdn\.eye-able\.com|www\.eye-able-cdn\.com)\/(?:public\/js\/|configs\/)/i,
    marker: "#eyeAble_container_ID",
  },
  {
    // Own site only: the vendor's install guides are screenshots.
    // digiaccess.org loads https://download.digiaccess.org/digiaccess and
    // .../digiaccess/tool, and the page holds a <digiaccess-widget> element.
    vendor: "DIGIaccess",
    script: /^download\.digiaccess\.org\/digiaccess/i,
    marker: "digiaccess-widget",
  },
];

/** The selectors the render pass asks the page about. Passed into the
 *  in-page collector as data, so the vendor table lives in this file alone
 *  and the collector stays free of any reference to outer scope. */
export const OVERLAY_MARKER_SELECTORS: string[] = VENDORS.map((v) => v.marker);

/** `host/path` of a script URL, or "" for anything that is not http(s). A
 *  file:, data: or blob: script has no host to recognise a vendor by. */
function hostAndPath(src: string): string {
  try {
    const u = new URL(src);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    return u.hostname + u.pathname;
  } catch {
    return "";
  }
}

/**
 * Which known overlays the page carries, and what was seen of each.
 *
 * A vendor is named on either piece of evidence, and the result says which
 * it had:
 *
 * - its script is in the document (`scriptUrl`), which is what the owner
 *   pasted or a tag manager injected;
 * - the element its script builds is in the document (`widgetOnPage`),
 *   which is the only proof the script ran in this browser.
 *
 * The two come apart in both directions, which is why neither is required.
 * A script tag without the element is a widget that did not start: blocked
 * by a consent tool, still loading, or declining this scanner's user agent
 * as UserWay's loader does. The element without a recognised script is a
 * site serving the vendor's file from its own address, as eye-able.com
 * itself does. Each marker is a name only that vendor's script produces, so
 * the element alone is enough to name it.
 *
 * Pure: signals in, a list out. An absent signal (an older render, a probe
 * that failed) is an empty list, never a throw.
 */
export function evaluateOverlay(signals: OverlaySignals | undefined): DetectedOverlay[] {
  if (!signals) return [];
  const scripts = (signals.scriptSrcs ?? []).map((src) => ({ src, key: hostAndPath(src) }));
  const markers = new Set(signals.markers ?? []);
  const found: DetectedOverlay[] = [];
  for (const v of VENDORS) {
    // The first match in document order: the loader the owner pasted comes
    // before the files that loader goes on to fetch.
    const script = scripts.find((s) => s.key && v.script.test(s.key));
    const widgetOnPage = markers.has(v.marker);
    if (!script && !widgetOnPage) continue;
    found.push({
      vendor: v.vendor,
      ...(script ? { scriptUrl: script.src } : {}),
      widgetOnPage,
    });
  }
  return found;
}

/**
 * One line per overlay for terminal output (the CLI). States what was seen
 * and nothing about the product. The widget words its own note in the
 * reader's language from the same fields.
 */
export function describeOverlay(o: DetectedOverlay): string {
  const from = o.scriptUrl ? ` (${o.scriptUrl})` : "";
  return o.widgetOnPage
    ? `${o.vendor}${from}, widget on the page during the scan`
    : `${o.vendor}${from}, widget not on the page during the scan`;
}
