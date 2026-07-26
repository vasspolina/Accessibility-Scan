import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { cropElementThumbnail } from "../src/services/render/cropThumbnail.js";

// A crop that came out blank is worse than no crop. It shows the reader an
// empty box where the evidence should be, and the alt-text suggester reads
// exactly these pixels — a blank frame got described as "decorative", advising
// alt="" on an image nobody had seen.

async function solid(width: number, height: number, rgb: [number, number, number]) {
  return sharp({
    create: { width, height, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  })
    .jpeg()
    .toBuffer();
}

// A page image with real content: half white, half dark.
async function halfAndHalf(width: number, height: number) {
  const dark = await solid(width, height / 2, [10, 10, 10]);
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } },
  })
    .composite([{ input: dark, top: height / 2, left: 0 }])
    .jpeg()
    .toBuffer();
}

describe("cropElementThumbnail", () => {
  it("refuses a crop that is one flat colour", async () => {
    const page = await solid(400, 400, [255, 255, 255]);
    const shot = await cropElementThumbnail(page, { x: 50, y: 50, width: 200, height: 200 }, 400, 400);
    expect(shot).toBeNull();
  });

  it("refuses a flat crop whatever the colour, not just white", async () => {
    const page = await solid(400, 400, [18, 44, 90]);
    const shot = await cropElementThumbnail(page, { x: 50, y: 50, width: 200, height: 200 }, 400, 400);
    expect(shot).toBeNull();
  });

  it("returns a crop that actually shows something", async () => {
    const page = await halfAndHalf(400, 400);
    const shot = await cropElementThumbnail(page, { x: 20, y: 120, width: 360, height: 160 }, 400, 400);
    expect(shot).toBeTruthy();
    expect(shot!.length).toBeGreaterThan(100);
  });

  // Pre-existing guard, kept honest alongside the new one.
  it("refuses an element sitting outside the captured image", async () => {
    const page = await halfAndHalf(400, 400);
    const shot = await cropElementThumbnail(page, { x: 20, y: 900, width: 200, height: 200 }, 400, 400);
    expect(shot).toBeNull();
  });

  it("refuses a zero-sized box", async () => {
    const page = await halfAndHalf(400, 400);
    expect(await cropElementThumbnail(page, { x: 10, y: 10, width: 0, height: 50 }, 400, 400)).toBeNull();
  });
});
