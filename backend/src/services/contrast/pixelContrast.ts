import sharp from "sharp";
import type { Page } from "playwright";
import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Contrast of text over a picture or a gradient, measured from the pixels.
//
// axe routes text it cannot settle to "incomplete": it can read the text's
// colour, and over a background image, a gradient or an overlapping element
// there is no single background colour to measure against. Those used to
// stay undecided whatever they were. Here each one is photographed twice:
// once as it renders, once with its letters made transparent. Where the two
// pictures differ is where the glyphs are, and the second picture at those
// pixels is exactly the background behind the letters. The contrast of the
// text's colour against each of those pixels is then measured.
//
//   pass   98% of the background behind the letters gives enough contrast:
//          the axe node is settled and leaves the undecided list.
//   fail   over 80% of it does not: a scored 1.4.3 finding, with the range.
//   mixed  anything between (text across the bright and the dark half of a
//          photo): it stays undecided, because which part matters is a
//          reader's judgement.
//
// Skipped, so left undecided: text with a shadow or a translucent colour
// (the shadow is often what makes it readable, and the blend is not one
// colour), text not on screen, an element too big to be one run of text, and
// a pair of pictures whose difference is not text-shaped (a carousel that
// moved between them).

export interface PixelContrastResult {
  selector: string;
  html: string;
  verdict: "pass" | "fail" | "mixed";
  low: number;
  high: number;
  required: number;
  fg: string;
}

const MAX_NODES = 12;
const MAX_AREA = 900 * 400;
// A pixel belongs to a glyph when the two pictures differ by more than this
// (sum of the three channel differences, 0–765): above JPEG-free PNG noise,
// below the faintest anti-aliased edge worth counting.
const DIFF_THRESHOLD = 48;
const PASS_SHARE = 0.98;
const FAIL_SHARE = 0.8;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function ratio(a: number, b: number): number {
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The backgrounds behind the glyphs: every pixel where the picture with text
 * and the picture without differ, read from the one without. Pure; both
 * buffers are raw RGB of the same size.
 */
export function glyphBackgrounds(withText: Uint8Array, withoutText: Uint8Array): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  const n = Math.min(withText.length, withoutText.length);
  for (let i = 0; i + 2 < n; i += 3) {
    const d =
      Math.abs(withText[i] - withoutText[i]) + Math.abs(withText[i + 1] - withoutText[i + 1]) + Math.abs(withText[i + 2] - withoutText[i + 2]);
    if (d > DIFF_THRESHOLD) out.push([withoutText[i], withoutText[i + 1], withoutText[i + 2]]);
  }
  return out;
}

/** Pure: the verdict for one run of text from the backgrounds behind its glyphs. */
export function judgePixelContrast(
  fg: [number, number, number],
  backgrounds: Array<[number, number, number]>,
  required: number
): { verdict: PixelContrastResult["verdict"]; low: number; high: number } | null {
  if (backgrounds.length < 20) return null;
  const fgL = luminance(...fg);
  const ratios = backgrounds.map((p) => ratio(fgL, luminance(...p))).sort((a, b) => a - b);
  const at = (q: number) => ratios[Math.min(ratios.length - 1, Math.max(0, Math.floor(q * (ratios.length - 1))))];
  const passing = ratios.filter((r) => r >= required).length / ratios.length;
  const low = Math.round(at(0.05) * 100) / 100;
  const high = Math.round(at(0.95) * 100) / 100;
  if (passing >= PASS_SHARE) return { verdict: "pass", low, high };
  if (1 - passing > FAIL_SHARE) return { verdict: "fail", low, high };
  return { verdict: "mixed", low, high };
}

async function raw(png: Buffer, width: number, height: number): Promise<Uint8Array> {
  const { data } = await sharp(png).resize(width, height, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return new Uint8Array(data);
}

const MARK = "data-a11y-pixel-contrast";

/**
 * Measures each undecided colour-contrast node of axe's that can be measured,
 * inside the time given. Never throws: a node that cannot be measured is
 * simply not settled.
 */
export async function measureUndecidedContrast(
  page: Page,
  nodes: Array<{ selector: string; html: string }>,
  deadline: number
): Promise<PixelContrastResult[]> {
  const results: PixelContrastResult[] = [];
  const style = await page
    .addStyleTag({
      content: `[${MARK}], [${MARK}] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; text-decoration-color: transparent !important; }`,
    })
    .catch(() => null);
  if (!style) return results;
  try {
    for (const node of nodes.slice(0, MAX_NODES)) {
      if (Date.now() > deadline) break;
      try {
        const locator = page.locator(node.selector).first();
        const info = await locator.evaluate((el) => {
          const cs = getComputedStyle(el);
          const m = cs.color.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
          return {
            rgb: m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null,
            alpha: m && m[4] !== undefined ? Number(m[4]) : 1,
            shadow: cs.textShadow !== "none",
            size: parseFloat(cs.fontSize),
            weight: Number(cs.fontWeight) || 400,
            visible: cs.visibility !== "hidden" && cs.display !== "none" && Number(cs.opacity) > 0,
          };
        }, undefined, { timeout: 1500 });
        if (!info.rgb || info.alpha < 1 || info.shadow || !info.visible) continue;
        const box = await locator.boundingBox({ timeout: 1500 });
        if (!box || box.width < 4 || box.height < 4 || box.width * box.height > MAX_AREA) continue;
        const large = info.size >= 24 || (info.size >= 18.66 && info.weight >= 700);
        const required = large ? 3 : 4.5;

        const shot = { animations: "disabled" as const, caret: "hide" as const, timeout: 3000 };
        const withText = await locator.screenshot(shot);
        await locator.evaluate((el, mark) => el.setAttribute(mark, ""), MARK);
        let withoutText: Buffer;
        try {
          withoutText = await locator.screenshot(shot);
        } finally {
          await locator.evaluate((el, mark) => el.removeAttribute(mark), MARK).catch(() => {});
        }
        const meta = await sharp(withText).metadata();
        const w = meta.width ?? 0;
        const h = meta.height ?? 0;
        if (!w || !h) continue;
        const backgrounds = glyphBackgrounds(await raw(withText, w, h), await raw(withoutText, w, h));
        // Text covers a minority of its box. A difference over most of it is
        // a picture that changed between the two shots, not letters.
        if (backgrounds.length > w * h * 0.6) continue;
        const verdict = judgePixelContrast(info.rgb as [number, number, number], backgrounds, required);
        if (!verdict) continue;
        results.push({
          selector: node.selector,
          html: node.html,
          ...verdict,
          required,
          fg: `rgb(${info.rgb.join(", ")})`,
        });
      } catch {
        // Gone, covered, off screen or slow: left undecided.
      }
    }
  } finally {
    await style.evaluate((el) => (el as Element).remove()).catch(() => {});
  }
  return results;
}

/** Scored findings for text that fails over most of its background. Pure. */
export function evaluatePixelContrast(results: PixelContrastResult[] | undefined): AccessibilityFinding[] {
  return (results ?? [])
    .filter((r) => r.verdict === "fail")
    .map((r) => ({
      id: randomUUID(),
      source: "automated" as const,
      severity: "serious" as const,
      category: "accessibility" as const,
      wcagCriterion: "1.4.3",
      wcagLevel: "AA" as const,
      selector: r.selector,
      elementSnippet: r.html.slice(0, 300),
      description: `This text sits on a picture or a gradient. Measured from the rendered pixels behind its letters, the contrast is between ${r.low}:1 and ${r.high}:1 across most of it, and text this size needs ${r.required}:1. Most of it is too faint for people with low vision, or anyone reading in sunlight.`,
      suggestedFix:
        "Put a solid or semi-opaque panel behind the text, darken or lighten the picture where the text sits, or move the text off the picture. Check it again at the narrowest width, where text often lands on a busier part of the image.",
      ruleId: "contrast-over-image",
      helpUrl: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html",
    }));
}
