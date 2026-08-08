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
  textDecorationLine: string;
  fontStyle: string;
  fontWeight: number;
  // A short excerpt of the block's actual text, so a finding can point at
  // "the paragraph starting 'Rijksakademie offers…'" rather than just "P".
  // Optional: older callers/tests construct blocks without it.
  textSample?: string;
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
      textDecorationLine: cs.textDecorationLine || cs.textDecoration || "none",
      fontStyle: cs.fontStyle || "normal",
      fontWeight: parseInt(cs.fontWeight, 10) || 400,
      textSample: text.replace(/\s+/g, " ").slice(0, 80),
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
  "typo-leading-for-measure": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-justified-no-hyphens": "https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html",
  "typo-font-size-small": "https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html",
  // Neurodiversity / readability checks — grounded in GOV.UK's accessibility
  // dos-and-don'ts, the Neurodiversity Design System, and Typotheque's
  // readability research: avoid underlining non-links, italic body text, and
  // large all-caps blocks, all of which slow dyslexic and low-vision readers.
  "typo-underline-nonlink": "https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/",
  "typo-italic-body": "https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/",
  "typo-allcaps-block": "https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/",
  "typo-thin-weight": "https://accessibility.blog.gov.uk/2016/09/02/dos-and-donts-on-designing-for-accessibility/",
};

/**
 * The leading a block of text needs, as a multiple of its font size.
 *
 * Hochuli names two dependencies and this models both. A single ratio models
 * neither, which is why the first version of this rule flagged large type set
 * at 1.10 — a setting that is not merely acceptable there but conventional.
 *
 * Measure. The longer the line, the more linespacing it needs; Hochuli takes
 * this from Tinker, who measured it. The reason is in how reading works: the
 * eye does not glide along a line, it lands in fixations and jumps between
 * them, and the hardest jump is the one back to the start of the next line.
 * The further left that return sweep travels, the more vertical separation it
 * needs to land on the right line. Land wrong and the reader regresses.
 *
 * Size. Leading need falls as type grows, and falls faster than the size
 * rises. The return sweep is a physical movement across a physical distance;
 * set the same words larger and the line gets longer in millimetres but
 * shorter in characters, and the gap between lines grows in millimetres
 * without the ratio changing at all. This is why display type can be set
 * solid and still read, and why a rule that asks 1.25 of a 40px line asks
 * for something no typographer would set.
 *
 * So: the measure fixes the requirement, and the size tapers it. Body sizes
 * carry the full requirement; by display sizes it has fallen to roughly a
 * tenth above solid.
 *
 * The measure scale runs 1.25 at 50 characters to 1.5 at 70, then holds. The
 * top is WCAG 1.4.8, which asks 1.5 within paragraphs; by 70 characters its
 * concern plainly applies. The bottom is the floor below which a body-sized
 * setting is dense at any width.
 *
 * x-height is the third dependency Hochuli names and this does not model it:
 * a large x-height needs more leading than a small one at the same size. It
 * is not readable from computed styles without measuring glyphs, so the rule
 * is silent about it rather than guessing.
 */
const LEADING_FLOOR = 1.25;
const LEADING_CEILING = 1.5;
const MEASURE_AT_FLOOR = 50;
const MEASURE_AT_CEILING = 70;

/* Where the taper starts and ends. Up to 20px is body text and carries the
   full requirement. By 36px the requirement has fallen to 40% of what it
   was — at a 50-character measure that is 1.10, which is what the reported
   false positive was set at. */
const SIZE_FULL_UP_TO = 20;
const SIZE_TAPERED_FROM = 36;
const TAPER_FLOOR = 0.4;

export function leadingNeededFor(charsPerLine: number, fontSizePx = 16): number {
  const slope = (LEADING_CEILING - LEADING_FLOOR) / (MEASURE_AT_CEILING - MEASURE_AT_FLOOR);
  const byMeasure = Math.min(
    LEADING_CEILING,
    Math.max(LEADING_FLOOR, LEADING_FLOOR + (charsPerLine - MEASURE_AT_FLOOR) * slope)
  );

  // The taper applies to the requirement above solid, not to the ratio
  // itself: 1.0 is the floor of the thing being asked for, and no amount of
  // size makes lines overlapping acceptable.
  const span = SIZE_TAPERED_FROM - SIZE_FULL_UP_TO;
  const over = Math.min(Math.max(fontSizePx - SIZE_FULL_UP_TO, 0), span);
  const factor = 1 - (over / span) * (1 - TAPER_FLOOR);
  return 1 + (byMeasure - 1) * factor;
}

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
        `Text is spaced so tightly that letters can touch (${negativeSpacing.length} place${negativeSpacing.length === 1 ? "" : "s"}, letter-spacing below -0.4px).`,
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

  // Leading, as one rule rather than two.
  //
  // There used to be an absolute floor at 1.25 alongside the measure-aware
  // rule, and the floor was wrong: it flagged large type set at 1.10, which
  // is conventional at that size and not a fault. A ratio means nothing on
  // its own — it has to be read against the measure and the size together,
  // which is what leadingNeededFor now does.
  const underLed = bodyBlocks.filter((b) => {
    if (b.lineCount === null || b.lineCount < 3) return false;
    if (b.lineHeightPx === null || b.fontSizePx <= 0) return false;
    const cpl = charsPerLine(b);
    if (cpl === null) return false;
    return b.lineHeightPx / b.fontSizePx < leadingNeededFor(cpl, b.fontSizePx);
  });
  if (underLed.length > 0) {
    const deficit = (x: TypographyBlock) =>
      leadingNeededFor(charsPerLine(x) ?? 0, x.fontSizePx) - (x.lineHeightPx ?? 0) / x.fontSizePx;
    const worst = underLed.reduce((a, b) => (deficit(b) > deficit(a) ? b : a));
    const cpl = Math.round(charsPerLine(worst) ?? 0);
    const ratio = ((worst.lineHeightPx ?? 0) / worst.fontSizePx).toFixed(2);
    const needed = leadingNeededFor(cpl, worst.fontSizePx).toFixed(2);
    const size = Math.round(worst.fontSizePx);
    findings.push(
      makeFinding(
        "typo-leading-for-measure",
        "minor",
        worst.selector,
        `Lines here are ${size}px, run about ${cpl} characters long, and sit ${ratio} times the text size apart (${underLed.length} block${underLed.length === 1 ? "" : "s"}). At this size and length about ${needed} would be comfortable.`,
        `Two fixes work and you only need one. Raise line-height to about ${needed} on this text, or narrow the column so the lines are shorter. A max-width of around 65 characters is the usual way.`
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
        'Either switch to left-aligned (ragged-right) text, or enable hyphenation (hyphens: auto with a lang attribute) wherever you set text-align: justify.'
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

  // Underlined text that isn't a link (GOV.UK dyslexia don't): underlines
  // read as links and, on body text, slow reading by cutting descenders.
  const underlinedNonLink = blocks.filter(
    (b) =>
      b.tag !== "a" &&
      b.textLength >= 20 &&
      b.textDecorationLine.includes("underline")
  );
  if (underlinedNonLink.length > 0) {
    findings.push(
      makeFinding(
        "typo-underline-nonlink",
        "minor",
        longest(underlinedNonLink).selector,
        `Text that isn't a link is underlined (${underlinedNonLink.length} place${underlinedNonLink.length === 1 ? "" : "s"}). Underlines read as links, confusing for everyone, and the line cutting through letters' descenders slows dyslexic readers.`,
        "Reserve underlines for links. Use bold, colour, or spacing to emphasise other text."
      )
    );
  }

  // Italic body text (GOV.UK / Neurodiversity Design System): italics distort
  // letterforms and are markedly harder for dyslexic readers over a passage.
  const italicBody = blocks.filter(
    (b) => BODY_TAGS.has(b.tag) && b.fontStyle.startsWith("italic") && b.textLength >= 120
  );
  if (italicBody.length > 0) {
    findings.push(
      makeFinding(
        "typo-italic-body",
        "minor",
        longest(italicBody).selector,
        `Whole passages of body text are set in italics (${italicBody.length} block${italicBody.length === 1 ? "" : "s"}). Slanted, distorted letterforms are noticeably harder for people with dyslexia and low vision to read beyond a few words.`,
        "Keep italics for short emphasis only. Set running text upright; emphasise with weight or colour instead."
      )
    );
  }

  // Large all-caps blocks (GOV.UK / dyslexia): capitals remove the word-shape
  // cues readers rely on, so long all-caps runs are slow and tiring to read.
  const allCapsBlocks = blocks.filter(
    (b) => BODY_TAGS.has(b.tag) && b.isUppercase && b.textLength >= 60
  );
  if (allCapsBlocks.length > 0) {
    findings.push(
      makeFinding(
        "typo-allcaps-block",
        "minor",
        longest(allCapsBlocks).selector,
        `A long passage is set in ALL CAPITALS (${allCapsBlocks.length} block${allCapsBlocks.length === 1 ? "" : "s"}). Capitals form uniform rectangles that strip out the word shapes people read by. Long all-caps text is slow and tiring, especially for dyslexic readers.`,
        "Use normal sentence case for anything longer than a short label or heading. Emphasise with weight or size instead of capitals."
      )
    );
  }

  // Thin / hairline weight on body text. The essay's "weight balance" point,
  // and Microsoft's readability work: parallel letter recognition needs the
  // strokes to actually register. Hairline weights (100–200) thin out to near
  // nothing on low-quality screens, in bright light, or for low-vision
  // readers — a legibility problem distinct from raw colour contrast.
  const thinBody = blocks.filter(
    (b) => BODY_TAGS.has(b.tag) && b.textLength >= 60 && b.fontWeight > 0 && b.fontWeight <= 200
  );
  if (thinBody.length > 0) {
    const worst = thinBody.reduce((a, b) => (b.fontWeight < a.fontWeight ? b : a));
    findings.push(
      makeFinding(
        "typo-thin-weight",
        "minor",
        worst.selector,
        `Body text is set in a very thin (hairline) weight — font-weight ${worst.fontWeight} (${thinBody.length} block${thinBody.length === 1 ? "" : "s"} at 200 or lighter). Thin strokes fade out on cheaper screens, in bright light, and for readers with low vision. This happens even when the colour contrast passes.`,
        "Use a regular weight (around 400) for running text. Reserve hairline weights for large display headings, not paragraphs."
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
        `The page mixes ${families.size} different typefaces (${Array.from(families).slice(0, 6).join(", ")}${families.size > 6 ? ", …" : ""}). More than two or three families makes the page look cluttered.`,
        "Consolidate to one or two typeface families and use weights/sizes for hierarchy."
      )
    );
  }

  attachTextSamples(findings, blocks);
  return findings;
}

// Typography findings identify their element by CSS selector alone, which
// surfaces to a non-technical reader as a bare tag ("P"). Attach a snippet of
// the block's real text so the report can name the actual paragraph — the
// widget reads elementSnippet and renders e.g. “Rijksakademie offers…”
// paragraph. Page-level findings (selector "body"/"html") match no block and
// are left alone.
function attachTextSamples(findings: AccessibilityFinding[], blocks: TypographyBlock[]): void {
  const bySelector = new Map(blocks.map((b) => [b.selector, b]));
  for (const finding of findings) {
    const block = bySelector.get(finding.selector);
    if (!block?.textSample) continue;
    finding.elementSnippet = `<${block.tag}>${escapeHtml(block.textSample)}</${block.tag}>`;
  }
}

// Escapes the sample so it can't inject stray angle brackets into the
// synthesized snippet the widget parses.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
