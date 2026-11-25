import { describe, it, expect } from "vitest";
import { imageBlock, imageLoad, readImage, sniffImage, MAX_IMAGE_FILE_BYTES } from "../src/lib/chatImages";
import { settleTurn } from "../src/lib/chatArchive";

/**
 * Pictures attached in the chat: only the four types the server accepts,
 * told by their bytes rather than their names, held to the caps the server
 * holds them to, and never written into the localStorage archive.
 */

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]);
const GIF = new TextEncoder().encode("GIF89a\u0001\u0000\u0001\u0000");
const WEBP = new TextEncoder().encode("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');

describe("sniffImage", () => {
  it("names the four accepted types by their first bytes", () => {
    expect(sniffImage(PNG)).toBe("image/png");
    expect(sniffImage(JPEG)).toBe("image/jpeg");
    expect(sniffImage(GIF)).toBe("image/gif");
    expect(sniffImage(WEBP)).toBe("image/webp");
  });

  it("refuses anything else, an SVG included", () => {
    expect(sniffImage(SVG)).toBeNull();
    expect(sniffImage(new Uint8Array([0x42, 0x4d, 0, 0]))).toBeNull(); // BMP
    expect(sniffImage(new Uint8Array())).toBeNull();
  });
});

describe("readImage", () => {
  it("reads a picture as base64 under the type its bytes say, whatever its name", async () => {
    const img = await readImage(new File([JPEG], "shot.png", { type: "image/png" }));
    expect(typeof img).not.toBe("string");
    if (typeof img === "string") return;
    expect(img.mediaType).toBe("image/jpeg");
    expect(img.name).toBe("shot.png");
    expect(img.data).toBe(Buffer.from(JPEG).toString("base64"));
  });

  it("refuses a file that is not one of the four types", async () => {
    expect(await readImage(new File([SVG], "logo.svg", { type: "image/svg+xml" }))).toBe("type");
  });

  it("refuses a file over the size cap before reading it", async () => {
    const big = new File([new Uint8Array(MAX_IMAGE_FILE_BYTES + 1)], "huge.png", { type: "image/png" });
    expect(await readImage(big)).toBe("size");
  });
});

describe("images in the history", () => {
  it("are sent as base64 image blocks, never as an address", async () => {
    const img = await readImage(new File([PNG], "a.png", { type: "image/png" }));
    if (typeof img === "string") throw new Error(img);
    expect(imageBlock(img)).toEqual({ type: "image", source: { type: "base64", media_type: "image/png", data: img.data } });
  });

  it("are counted with their data size, so the words can be measured apart", () => {
    const history = [
      { role: "user" as const, content: [{ type: "image", source: { type: "base64", media_type: "image/png", data: "AAAA" } }, { type: "text", text: "hi" }] },
      { role: "assistant" as const, content: "hello" },
      { role: "user" as const, content: "plain words" },
    ];
    expect(imageLoad(history)).toEqual({ count: 1, chars: 4 });
  });

  it("are left out of the archive, which keeps the words", () => {
    const turn = { id: 1, who: "you", text: "what is wrong here?", images: [{ id: "i", name: "a.png", mediaType: "image/png", data: "A".repeat(500_000) }] };
    const kept = settleTurn(turn);
    expect("images" in kept).toBe(false);
    expect(kept.text).toBe("what is wrong here?");
  });
});
