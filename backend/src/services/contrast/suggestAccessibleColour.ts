// Turns a contrast failure into a colour you can paste.
//
// Every other tool in this space reports the ratio and leaves the reader to
// work out what to do about it. "1.96:1, needs 4.5:1" is a fact, not an
// action, and the person reading this report is usually not the person who
// picked the colour. Handing over "#b9b9b9 becomes #767676" is the whole
// difference between a report and a fix.
//
// The constraint that makes this worth doing carefully: the suggestion has to
// stay recognisably the same colour. Anyone can satisfy contrast by going to
// black. Keeping the hue and saturation and moving only lightness gives back
// something the designer will accept, which is the only version that actually
// gets applied.

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Accepts the forms axe reports: #rgb, #rrggbb, rgb(), rgba(). */
export function parseColour(input: string): Rgb | null {
  const s = input.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
  if (hex) {
    const h = hex[1];
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(s);
  if (rgb) {
    const [r, g, b] = [rgb[1], rgb[2], rgb[3]].map((n) => Math.round(Number(n)));
    if ([r, g, b].some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
    return { r, g, b };
  }
  return null;
}

export function toHex({ r, g, b }: Rgb): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return "#" + [r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("");
}

/** WCAG relative luminance. The channel transfer curve is from the spec. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue(p, q, h + 1 / 3) * 255),
    g: Math.round(hue(p, q, h) * 255),
    b: Math.round(hue(p, q, h - 1 / 3) * 255),
  };
}

export interface ColourSuggestion {
  from: string;
  to: string;
  /** The ratio the suggestion achieves against the same background. */
  ratio: number;
  /** The ratio it had to reach. */
  required: number;
  /** True when the colour had to get darker; false when it got lighter. */
  darker: boolean;
}

/**
 * Finds the smallest change in lightness that reaches the required ratio,
 * keeping hue and saturation exactly.
 *
 * Searches both directions and returns whichever lands closer to the original,
 * because on a dark background the fix is to lighten and on a light one to
 * darken, and hard-coding either would produce nonsense half the time.
 *
 * Returns null when no lightness of this hue can reach the target against this
 * background — which happens, and is better said than fudged. A mid-grey
 * background leaves no room in either direction, and the honest answer is that
 * the background has to change too.
 */
export function suggestAccessibleForeground(
  foreground: string,
  background: string,
  required: number
): ColourSuggestion | null {
  const fg = parseColour(foreground);
  const bg = parseColour(background);
  if (!fg || !bg) return null;
  if (contrastRatio(fg, bg) >= required) return null; // already fine

  const { h, s, l } = rgbToHsl(fg);

  // Walk lightness in small steps rather than binary search: the relationship
  // between HSL lightness and WCAG luminance is not linear, and stepping is
  // both simple to reason about and precise enough at 1/255.
  const search = (direction: -1 | 1): { rgb: Rgb; l: number } | null => {
    for (let step = 1; step <= 100; step++) {
      const nl = l + direction * step * 0.01;
      if (nl < 0 || nl > 1) break;
      const candidate = hslToRgb(h, s, nl);
      if (contrastRatio(candidate, bg) >= required) return { rgb: candidate, l: nl };
    }
    return null;
  };

  const darker = search(-1);
  const lighter = search(1);
  const best =
    darker && lighter
      ? Math.abs(darker.l - l) <= Math.abs(lighter.l - l)
        ? darker
        : lighter
      : (darker ?? lighter);
  if (!best) return null;

  return {
    from: toHex(fg),
    to: toHex(best.rgb),
    ratio: Math.round(contrastRatio(best.rgb, bg) * 100) / 100,
    required,
    darker: best.l < l,
  };
}
