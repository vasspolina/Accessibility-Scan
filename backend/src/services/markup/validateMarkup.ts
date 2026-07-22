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
]);

const validator = new HtmlValidate({ extends: ["html-validate:recommended"] });

/** Pure part, exported for tests: validate an HTML string into findings. */
export async function markupFindingsFromHtml(html: string): Promise<AccessibilityFinding[]> {
  const report = await validator.validateString(html);
  const messages = report.results
    .flatMap((r) => r.messages)
    .filter((m) => !IGNORED_RULES.has(m.ruleId));

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
      category: "design-clarity",
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
