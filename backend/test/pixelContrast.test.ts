import { describe, it, expect } from "vitest";
import { evaluatePixelContrast, glyphBackgrounds, judgePixelContrast } from "../src/services/contrast/pixelContrast.js";

const fill = (n: number, rgb: [number, number, number]) => Array.from({ length: n }, () => rgb);

describe("contrast measured from pixels", () => {
  it("reads the background only where the two pictures differ", () => {
    // Three pixels: the middle one is a black glyph on white; the others are untouched background.
    const withText = new Uint8Array([200, 200, 200, 0, 0, 0, 10, 20, 30]);
    const withoutText = new Uint8Array([200, 200, 200, 255, 255, 255, 10, 20, 30]);
    expect(glyphBackgrounds(withText, withoutText)).toEqual([[255, 255, 255]]);
  });

  it("passes white on near-black, fails pale grey on near-white, and leaves a split background undecided", () => {
    expect(judgePixelContrast([255, 255, 255], fill(100, [20, 20, 20]), 4.5)?.verdict).toBe("pass");
    const faint = judgePixelContrast([196, 196, 196], fill(100, [248, 248, 248]), 4.5)!;
    expect(faint.verdict).toBe("fail");
    expect(faint.high).toBeLessThan(2);
    expect(judgePixelContrast([255, 255, 255], [...fill(50, [255, 255, 255]), ...fill(50, [0, 0, 0])], 4.5)?.verdict).toBe("mixed");
  });

  it("uses the large-text bar it is given", () => {
    // #767676 on white is 4.54:1; #8c8c8c is about 3.4:1, enough only for large text.
    expect(judgePixelContrast([140, 140, 140], fill(100, [255, 255, 255]), 3)?.verdict).toBe("pass");
    expect(judgePixelContrast([140, 140, 140], fill(100, [255, 255, 255]), 4.5)?.verdict).toBe("fail");
  });

  it("refuses to judge from a handful of pixels", () => {
    expect(judgePixelContrast([0, 0, 0], fill(5, [255, 255, 255]), 4.5)).toBeNull();
  });

  it("scores only a failure, as 1.4.3 AA, with the measured range", () => {
    const f = evaluatePixelContrast([
      { selector: "#a", html: "<p>", verdict: "fail", low: 1.2, high: 1.6, required: 4.5, fg: "rgb(196, 196, 196)" },
      { selector: "#b", html: "<p>", verdict: "pass", low: 15, high: 17, required: 4.5, fg: "rgb(255, 255, 255)" },
      { selector: "#c", html: "<p>", verdict: "mixed", low: 1, high: 21, required: 4.5, fg: "rgb(255, 255, 255)" },
    ]);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ ruleId: "contrast-over-image", wcagCriterion: "1.4.3", wcagLevel: "AA", selector: "#a" });
    expect(f[0].description).toContain("between 1.2:1 and 1.6:1");
  });
});
