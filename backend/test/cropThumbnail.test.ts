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

// Sixteen of the thumbnails on one real report were icons under 21px square,
// displayed in a 216px box. The layout magnified them roughly elevenfold and
// they arrived as smudges. Padding the crop out to a legible frame fixes it at
// the source: the reader gets the icon and its surroundings, at a size that
// needs no magnification to read.
describe("cropElementThumbnail: elements too small to see", () => {
  it("pads a tiny element out to a legible frame", async () => {
    const page = await halfAndHalf(1280, 800);
    const out = await cropElementThumbnail(page, { x: 200, y: 380, width: 17, height: 17 }, 1280, 800);
    expect(out).not.toBeNull();
    const meta = await sharp(Buffer.from(out!, "base64")).metadata();
    expect(meta.width!).toBeGreaterThanOrEqual(240);
    expect(meta.height!).toBeGreaterThanOrEqual(100);
  });

  // The padding must not push the crop off the edge of the page image, which
  // would either throw or produce a frame of the wrong shape.
  it("keeps a tiny element in the corner inside the page", async () => {
    const page = await halfAndHalf(1280, 800);
    const out = await cropElementThumbnail(page, { x: 2, y: 396, width: 16, height: 16 }, 1280, 800);
    expect(out).not.toBeNull();
    const meta = await sharp(Buffer.from(out!, "base64")).metadata();
    expect(meta.width!).toBeLessThanOrEqual(1280);
  });

  // A crop already big enough keeps its own dimensions rather than being
  // grown to the minimum for no reason.
  it("leaves a large element alone", async () => {
    const page = await halfAndHalf(1280, 800);
    const out = await cropElementThumbnail(page, { x: 100, y: 340, width: 600, height: 200 }, 1280, 800);
    expect(out).not.toBeNull();
    const meta = await sharp(Buffer.from(out!, "base64")).metadata();
    // Downscaled to the 480 cap, so the aspect ratio is what identifies it.
    expect(meta.width! / meta.height!).toBeGreaterThan(2);
  });
});
