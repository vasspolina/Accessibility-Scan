import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Micro-typography checks grounded in Jost Hochuli's "Detail in Typography"
// (Hyphen Press, ed. Robin Kinross) — the classic treatment of letterspacing,
// wordspacing, leading, and line length. Each rule here is a mechanical,
// deterministic reading of one of the book's principles applied to computed
// styles. Findings go into the "design-clarity" category: they're readability
// craft, not WCAG violations, so they never move the accessibility score.

export interface TypographyBlock {
  selector: string;
  tag: string;
  textLength: number;
  fontSizePx: number;
  // null when the computed line-height is "normal" (browser default ~1.2) —
  // deliberately not flagged to keep noise down.
  lineHeightPx: number | null;
  letterSpacingPx: number;
  textAlign: string;
  hyphens: string;
  fontFamily: string;
  widthPx: number;
  lineCount: number | null;
  isUppercase: boolean;
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables).
export function collectTypographyBlocksInPage(): TypographyBlock[] {
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

  const TAGS =
    "p, li, blockquote, dd, dt, figcaption, h1, h2, h3, h4, h5, h6, button, a, label, th, legend";
  const blocks: TypographyBlock[] = [];

  for (const el of Array.from(document.querySelectorAll(TAGS))) {
    if (blocks.length >= 150) break;
    // Skip containers whose text really lives in a nested block element
    // (an <li> wrapping a <p> would otherwise be measured twice).
    if (el.querySelector("p, li, blockquote, dd, figcaption")) continue;

    const rect = el.getBoundingClientRect();
    if (rect.width < 40 || rect.height < 8) continue;

    const text = (el.textContent ?? "").trim();
    if (text.length < 4) continue;

    const cs = getComputedStyle(el);
    const fontSizePx = parseFloat(cs.fontSize) || 0;
    const lineHeightPx = cs.lineHeight === "normal" ? null : parseFloat(cs.lineHeight) || null;
    const letterSpacingPx = cs.letterSpacing === "normal" ? 0 : parseFloat(cs.letterSpacing) || 0;
    const hyphens =
      cs.hyphens || (cs as unknown as Record<string, string>)["webkitHyphens"] || "manual";
    const fontFamily = (cs.fontFamily.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
    const lineCount = lineHeightPx ? Math.max(1, Math.round(rect.height / lineHeightPx)) : null;

    const lettersOnly = text.replace(/[^A-Za-zÀ-ž]/g, "");
    const isAllCapsText = lettersOnly.length >= 6 && lettersOnly === lettersOnly.toUpperCase();

    blocks.push({
      selector: cssPath(el),
      tag: el.tagName.toLowerCase(),
      textLength: text.length,
      fontSizePx,
      lineHeightPx,
      letterSpacingPx,
      textAlign: cs.textAlign,
      hyphens,
      fontFamily,
      widthPx: rect.width,
      lineCount,
      isUppercase: cs.textTransform === "uppercase" || isAllCapsText,
    });
  }

  return blocks;
}

// Tags that carry running body text — the rules about measure, leading, and
// body letterspacing only make sense there, not on buttons or headings.
const BODY_TAGS = new Set(["p", "li", "blockquote", "dd", "figcaption"]);

function charsPerLine(block: TypographyBlock): number | null {
  if (!block.lineCount || block.lineCount < 1) return null;
  return block.textLength / block.lineCount;
}

// Closest official W3C guidance for each typography rule — WCAG's
// visual-presentation (1.4.8) covers line length, leading, and justification;
// text-spacing (1.4.12) covers letterspacing; resize-text (1.4.4) covers
// small text. Rendered as "Learn more" links in the widgets.
const HELP_URLS: Record<string, string> = {
  "typo-caps-letterspacing": "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html",
  "typo-lowercase-letterspaced": "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html",
  "typo-negative-letterspacing": "https://www.w3.org/WAI/WCAG21/Understanding/text-spacing.html",
  "typo-line-length-long": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-line-length-short": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-leading-tight": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-justified-no-hyphens": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-font-size-small": "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html",
};

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  selector: string,
  description: string,
  suggestedFix: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "design-clarity",
    selector,
    description,
    suggestedFix,
    ruleId,
    helpUrl: HELP_URLS[ruleId],
  };
}

function longest(blocks: TypographyBlock[]): TypographyBlock {
  return blocks.reduce((a, b) => (b.textLength > a.textLength ? b : a));
}

/**
 * Pure and deterministic: one finding per triggered rule (with the worst
 * offender's selector and a count), never one per element — a page with 40
 * over-long paragraphs has one problem, not forty.
 */
export function evaluateTypography(blocks: TypographyBlock[]): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];

  // Capitals need extra letterspacing (Hochuli: all-caps settings read as
  // uniform rectangles without it).
  const capsNoSpacing = blocks.filter(
    (b) => b.isUppercase && b.textLength >= 6 && b.letterSpacingPx < 0.5
  );
  if (capsNoSpacing.length > 0) {
    findings.push(
      makeFinding(
        "typo-caps-letterspacing",
        "minor",
        longest(capsNoSpacing).selector,
        `Text set in ALL CAPITALS has no extra letterspacing (${capsNoSpacing.length} place${capsNoSpacing.length === 1 ? "" : "s"}). Capital letters form uniform rectangles and need slight extra spacing to stay comfortably readable.`,
        "Add letter-spacing of roughly 0.05em–0.1em to uppercase text (headings, labels, buttons)."
      )
    );
  }

  // Lowercase running text should not be letterspaced — it destroys the
  // word shapes readers recognize.
  const lowercaseSpaced = blocks.filter(
    (b) => BODY_TAGS.has(b.tag) && !b.isUppercase && b.textLength >= 80 && b.letterSpacingPx >= 1
  );
  if (lowercaseSpaced.length > 0) {
    findings.push(
      makeFinding(
        "typo-lowercase-letterspaced",
        "minor",
        longest(lowercaseSpaced).selector,
        `Body text has extra space forced between lowercase letters (${lowercaseSpaced.length} block${lowercaseSpaced.length === 1 ? "" : "s"}). Letterspacing lowercase running text breaks up the word shapes people read by.`,
        "Remove letter-spacing (or reduce it to under ~0.05em) on paragraph text."
      )
    );
  }

  // Negative tracking makes letters touch or overlap.
  const negativeSpacing = blocks.filter((b) => b.textLength >= 40 && b.letterSpacingPx <= -0.4);
  if (negativeSpacing.length > 0) {
    findings.push(
      makeFinding(
        "typo-negative-letterspacing",
        "moderate",
        longest(negativeSpacing).selector,
        `Text is tracked so tightly that letters can touch (${negativeSpacing.length} place${negativeSpacing.length === 1 ? "" : "s"}, letter-spacing below -0.4px).`,
        "Remove the negative letter-spacing, or keep it above roughly -0.02em."
      )
    );
  }

  // Measure: past ~75-90 characters the eye loses its place returning to
  // the next line; Hochuli's comfortable range is roughly 50-70.
  const bodyBlocks = blocks.filter((b) => BODY_TAGS.has(b.tag));
  const longLines = bodyBlocks.filter((b) => {
    const cpl = charsPerLine(b);
    return b.lineCount !== null && b.lineCount >= 3 && cpl !== null && cpl > 90;
  });
  if (longLines.length > 0) {
    const worst = longLines.reduce((a, b) => ((charsPerLine(b) ?? 0) > (charsPerLine(a) ?? 0) ? b : a));
    findings.push(
      makeFinding(
        "typo-line-length-long",
        "moderate",
        worst.selector,
        `Lines of body text run too long — about ${Math.round(charsPerLine(worst) ?? 0)} characters per line (${longLines.length} block${longLines.length === 1 ? "" : "s"} over 90). Comfortable reading is roughly 50–75 characters per line.`,
        "Constrain the text column, e.g. max-width: 65ch on paragraphs."
      )
    );
  }

  const shortLines = bodyBlocks.filter((b) => {
    const cpl = charsPerLine(b);
    return b.lineCount !== null && b.lineCount >= 4 && b.textLength >= 120 && cpl !== null && cpl < 25;
  });
  if (shortLines.length > 0) {
    findings.push(
      makeFinding(
        "typo-line-length-short",
        "minor",
        longest(shortLines).selector,
        `Body text is squeezed into very short lines — under 25 characters per line (${shortLines.length} block${shortLines.length === 1 ? "" : "s"}). Reading becomes choppy when almost every phrase breaks.`,
        "Widen the text column or reduce the font size slightly so lines carry more words."
      )
    );
  }

  // Leading: multi-line text set tighter than ~1.25 becomes dense and hard
  // to track. (WCAG 1.4.8 recommends at least 1.5 for body text.)
  const tightLeading = bodyBlocks.filter(
    (b) =>
      b.lineCount !== null &&
      b.lineCount >= 3 &&
      b.lineHeightPx !== null &&
      b.fontSizePx > 0 &&
      b.lineHeightPx / b.fontSizePx < 1.25
  );
  if (tightLeading.length > 0) {
    const worst = tightLeading.reduce((a, b) =>
      (b.lineHeightPx ?? 0) / b.fontSizePx < (a.lineHeightPx ?? 0) / a.fontSizePx ? b : a
    );
    const ratio = ((worst.lineHeightPx ?? 0) / worst.fontSizePx).toFixed(2);
    findings.push(
      makeFinding(
        "typo-leading-tight",
        "moderate",
        worst.selector,
        `Lines of body text sit too close together — line-height is ${ratio}× the font size (${tightLeading.length} block${tightLeading.length === 1 ? "" : "s"} under 1.25). Dense settings make it easy to reread or skip lines.`,
        "Raise line-height on body text to roughly 1.4–1.6 (WCAG's visual-presentation guidance suggests 1.5)."
      )
    );
  }

  // Justified text without hyphenation produces gappy word spacing and
  // "rivers" — Hochuli treats hyphenation as a precondition for justifying.
  const justifiedNoHyphens = bodyBlocks.filter(
    (b) => b.textAlign === "justify" && b.hyphens !== "auto" && b.lineCount !== null && b.lineCount >= 3
  );
  if (justifiedNoHyphens.length > 0) {
    findings.push(
      makeFinding(
        "typo-justified-no-hyphens",
        "moderate",
        longest(justifiedNoHyphens).selector,
        `Text is justified without hyphenation (${justifiedNoHyphens.length} block${justifiedNoHyphens.length === 1 ? "" : "s"}). Justification stretches word spaces to fill each line; without hyphenation this creates uneven gaps and distracting "rivers" of white space.`,
        'Either switch to left-aligned (ragged-right) text, or enable hyphenation (hyphens: auto with a lang attribute) wherever text-align: justify is used.'
      )
    );
  }

  // Very small body text.
  const smallText = bodyBlocks.filter((b) => b.textLength >= 120 && b.fontSizePx > 0 && b.fontSizePx < 13);
  if (smallText.length > 0) {
    const worst = smallText.reduce((a, b) => (b.fontSizePx < a.fontSizePx ? b : a));
    findings.push(
      makeFinding(
        "typo-font-size-small",
        "moderate",
        worst.selector,
        `Body text is set very small — ${Math.round(worst.fontSizePx)}px (${smallText.length} block${smallText.length === 1 ? "" : "s"} under 13px). Small settings that work in print are hard to read on screens.`,
        "Raise body text to at least 14–16px."
      )
    );
  }

  // Typeface discipline: mixing many families reads as visual noise.
  const families = new Set(blocks.map((b) => b.fontFamily).filter((f) => f.length > 0));
  if (families.size > 4) {
    findings.push(
      makeFinding(
        "typo-typeface-count",
        "minor",
        "body",
        `The page mixes ${families.size} different typefaces (${Array.from(families).slice(0, 6).join(", ")}${families.size > 6 ? ", …" : ""}). More than two or three families reads as visual noise.`,
        "Consolidate to one or two typeface families and use weights/sizes for hierarchy."
      )
    );
  }

  return findings;
}
