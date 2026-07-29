import { randomUUID } from "node:crypto";
import { HtmlValidate } from "html-validate";
import { assertSafeUrl } from "../../middleware/ssrfGuard.js";
import { logger } from "../../utils/logger.js";
import type { AccessibilityFinding } from "../../types/report.js";

// HTML markup validation. Validates the RAW served HTML, not the rendered
// DOM — by the time Playwright serializes the page, the browser has already
// silently repaired unclosed tags and misnesting, hiding exactly the errors
// we want to surface. So this fetches the document source directly (the URL
// re-passes the SSRF guard first, and redirects are refused since only the
// already-validated final URL is trusted).
//
// axe covers the accessibility-critical subset of markup problems; this
// layer reports general markup validity as ONE grouped design-clarity note
// (never one finding per error — sloppy templates can have hundreds), so it
// informs without drowning the report or moving the accessibility score.

const MAX_HTML_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_EXAMPLES = 3;

// Style/lint-flavored rules filtered out post-hoc: they're opinions about
// how markup is written, not signs it's broken.
const IGNORED_RULES = new Set([
  "no-trailing-whitespace",
  "no-inline-style",
  "attr-quotes",
  "void-style",
  "doctype-style",
  "no-raw-characters",
  "long-title",
  "require-sri",
  "element-case",
  "attr-case",
  "attribute-boolean-style",
  "attribute-empty-style",
  "attr-delimiter",
  "no-implicit-button-type",
  "prefer-button",
  "tel-non-breaking",
  "no-redundant-for",
  "no-dup-class",
  // Says so itself: "strictly allowed but is not recommended". Allowed is not
  // invalid, and this was the single loudest rule in the set — 20 of the
  // messages across four sites.
  "aria-label-misuse",
  // "Prefer to use the native <section> element" is a preference about how to
  // build the same valid page. gov.uk was told it had "2 markup validity
  // issues" and both were this, on a page whose HTML is fine.
  "prefer-native-element",
  "no-redundant-role",
  // Accessibility rules, not validity rules, and axe already reports every one
  // of them properly — with a plain-language title, a fix, and a thumbnail.
  // Leaving them here counted the same problem twice and buried it inside a
  // finding about markup, where nobody would look for it.
  "text-content",
  "unique-landmark",
]);

// Everything html-validate namespaces under wcag/ is an accessibility check
// duplicating axe: wcag/h30 is link text, wcag/h37 is image alt, wcag/h71 is
// fieldset legends. This layer answers one question — is the HTML itself
// broken — and accessibility findings belong to the layers built for them.
function isAccessibilityRule(ruleId: string): boolean {
  return ruleId.startsWith("wcag/");
}

const validator = new HtmlValidate({ extends: ["html-validate:recommended"] });

/** Pure part, exported for tests: validate an HTML string into findings. */
export async function markupFindingsFromHtml(html: string): Promise<AccessibilityFinding[]> {
  const report = await validator.validateString(html);
  const messages = report.results
    .flatMap((r) => r.messages)
    .filter((m) => !IGNORED_RULES.has(m.ruleId) && !isAccessibilityRule(m.ruleId));

  if (messages.length === 0) return [];

  const examples = messages
    .slice(0, MAX_EXAMPLES)
    .map((m) => `${m.message} (line ${m.line})`)
    .join("; ");

  return [
    {
      id: randomUUID(),
      source: "automated",
      severity: "minor",
      // Counts towards the score, by the owner's decision, and the reasoning
      // holds: WCAG 2.2 retired 4.1.1 Parsing because browsers recover from
      // most bad markup, but the failures that survive that recovery are
      // assistive-technology failures. A duplicate id silently breaks every
      // aria reference pointing at it, and nothing else in this report would
      // catch that.
      //
      // Minor severity, deliberately unchanged: it is one point of penalty,
      // which is the weight of a thing worth knowing rather than a barrier.
      category: "accessibility",
      selector: "html",
      description: `The page's HTML has ${messages.length} markup validity issue${messages.length === 1 ? "" : "s"}. For example: ${examples}. Invalid markup forces browsers and assistive technology to guess at the page structure, and different ones guess differently.`,
      suggestedFix:
        "Run the page through the W3C markup validator and fix the reported errors — start with unclosed or misnested elements and duplicate attributes.",
      ruleId: "markup-validation",
      helpUrl: "https://validator.w3.org/",
    },
  ];
}

/**
 * Fetches the raw HTML for `finalUrl` and validates it. Fully best-effort:
 * any failure (unreachable, redirect, non-HTML, oversized, validator error)
 * just means no markup finding — never a failed scan.
 */
export async function validateMarkup(finalUrl: string): Promise<AccessibilityFinding[]> {
  try {
    await assertSafeUrl(finalUrl);
    const res = await fetch(finalUrl, {
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "text/html", "user-agent": "A11yCheckerBot/0.1 (+accessibility scan)" },
    });
    if (!res.ok) return [];
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) return [];
    const html = await res.text();
    if (html.length === 0 || html.length > MAX_HTML_BYTES) return [];
    return await markupFindingsFromHtml(html);
  } catch (err) {
    logger.warn({ err, url: finalUrl }, "Markup validation skipped");
    return [];
  }
}
