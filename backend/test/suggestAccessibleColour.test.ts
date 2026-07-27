import { describe, it, expect } from "vitest";
import {
  parseColour,
  toHex,
  contrastRatio,
  relativeLuminance,
  suggestAccessibleForeground,
} from "../src/services/contrast/suggestAccessibleColour.js";

describe("colour parsing", () => {
  it("reads the forms axe reports", () => {
    expect(parseColour("#b9b9b9")).toEqual({ r: 185, g: 185, b: 185 });
    expect(parseColour("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseColour("rgb(18, 52, 86)")).toEqual({ r: 18, g: 52, b: 86 });
    expect(parseColour("rgba(18, 52, 86, 0.5)")).toEqual({ r: 18, g: 52, b: 86 });
  });

  it("returns null rather than guessing at anything else", () => {
    for (const bad of ["", "rebeccapurple", "#12345", "hsl(0,0%,0%)", "nonsense"]) {
      expect(parseColour(bad), bad).toBeNull();
    }
  });

  it("round-trips through hex", () => {
    expect(toHex({ r: 185, g: 185, b: 185 })).toBe("#b9b9b9");
    expect(toHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });
});

// Checked against the values in the WCAG definition itself.
describe("contrast maths", () => {
  it("puts black on white at 21:1", () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 2);
  });

  it("puts a colour against itself at 1:1", () => {
    expect(contrastRatio({ r: 80, g: 90, b: 100 }, { r: 80, g: 90, b: 100 })).toBeCloseTo(1, 5);
  });

  it("matches the luminance endpoints in the spec", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 5);
  });

  it("agrees with axe on the fixture's failing pair", () => {
    // axe reported 1.96:1 for #b9b9b9 on #ffffff.
    expect(contrastRatio({ r: 185, g: 185, b: 185 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(1.96, 1);
  });
});

describe("suggesting a colour that passes", () => {
  it("fixes the fixture's pale grey", () => {
    const s = suggestAccessibleForeground("#b9b9b9", "#ffffff", 4.5)!;
    expect(s).not.toBeNull();
    expect(s.ratio).toBeGreaterThanOrEqual(4.5);
    expect(s.darker).toBe(true);
  });

  // The point of the whole exercise: anyone can pass contrast by going black.
  it("keeps the hue, so it is still recognisably the same colour", () => {
    const s = suggestAccessibleForeground("#7fb2e5", "#ffffff", 4.5)!;
    const to = parseColour(s.to)!;
    // Blue stays the dominant channel.
    expect(to.b).toBeGreaterThan(to.r);
    expect(to.b).toBeGreaterThan(to.g);
  });

  it("lightens against a dark background instead of darkening", () => {
    const s = suggestAccessibleForeground("#3a3a3a", "#000000", 4.5)!;
    expect(s.darker).toBe(false);
    expect(s.ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("says nothing when the pair already passes", () => {
    expect(suggestAccessibleForeground("#000000", "#ffffff", 4.5)).toBeNull();
  });

  it("uses the lower bar for large text, and moves less to reach it", () => {
    // #b9b9b9 on white is 1.96:1, so it fails both bars and both produce a
    // suggestion. #949494 was a poor choice first time round: it already
    // passes 3:1, so the large-text answer is correctly "nothing to do".
    const large = suggestAccessibleForeground("#b9b9b9", "#ffffff", 3)!;
    const normal = suggestAccessibleForeground("#b9b9b9", "#ffffff", 4.5)!;
    expect(large.ratio).toBeGreaterThanOrEqual(3);
    expect(normal.ratio).toBeGreaterThanOrEqual(4.5);
    // The stricter bar has to move further from the original.
    expect(parseColour(normal.to)!.r).toBeLessThan(parseColour(large.to)!.r);
  });

  it("says nothing when the pair already clears the large-text bar", () => {
    expect(suggestAccessibleForeground("#949494", "#ffffff", 3)).toBeNull();
  });

  // Better said than fudged. At 4.5:1 there is nearly always an answer, since
  // black or white clears it against almost any background — measured, black
  // on #767676 is 4.62:1. At the AAA bar of 7:1 that stops being true, and the
  // honest response is silence rather than a colour that does not work.
  it("returns nothing when no lightness of this hue can reach the target", () => {
    expect(suggestAccessibleForeground("#808080", "#767676", 7)).toBeNull();
  });

  it("refuses unparseable input rather than inventing a colour", () => {
    expect(suggestAccessibleForeground("chartreuse", "#fff", 4.5)).toBeNull();
    expect(suggestAccessibleForeground("#fff", "not a colour", 4.5)).toBeNull();
  });

  it("always reaches the bar it reports, across a wide sample", () => {
    for (let r = 0; r < 256; r += 37) {
      for (let g = 0; g < 256; g += 53) {
        for (const bg of ["#ffffff", "#000000"]) {
          const from = toHex({ r, g, b: 128 });
          const s = suggestAccessibleForeground(from, bg, 4.5);
          if (s) expect(s.ratio, `${from} on ${bg}`).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
