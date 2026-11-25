import type { ChatBlock, ChatMessage } from "../api/chatClient";

// Pictures the reader attaches to a message in the chat, most often a
// screenshot of a barrier they ran into. They go to the assistant as
// Anthropic image blocks, base64 data and never an address, so the API
// fetches nothing.
//
// The caps mirror backend/src/routes/chat.ts, which checks them again: the
// widget's check is the reader's early answer, the server's is the rule.
// Change them in both places or in neither.

export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];

/** A file larger than this is refused before it is read. Phone screenshots
 *  run to a few MB; this leaves room for them before they are scaled. */
export const MAX_IMAGE_FILE_BYTES = 10 * 1024 * 1024;
/** The server's per-image cap on the base64, which is the API's. */
export const MAX_IMAGE_BASE64 = 5_000_000;
export const MAX_IMAGES_PER_MESSAGE = 4;
export const MAX_IMAGES_PER_CONVERSATION = 12;
export const MAX_IMAGE_CHARS_TOTAL = 12_000_000;
/** The long edge the model reads a picture at; a larger one is scaled down
 *  on its side anyway, so it is scaled here before it is sent and the
 *  request carries a few hundred kilobytes, not a camera's megabytes. */
export const LONG_EDGE = 1568;

export interface ChatImage {
  id: string;
  /** The file's name, which is also the picture's text alternative. */
  name: string;
  mediaType: ImageType;
  /** Base64, no data: prefix. */
  data: string;
}

export type ImageRefusal = "type" | "size" | "unreadable";

/** The type a file's first bytes say it is, or null for anything else.
 *  The browser's own type comes from the file's name; a renamed file would
 *  be refused by the server and lose the whole message. */
export function sniffImage(head: Uint8Array): ImageType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (head.length >= 8 && head[0] === 0x89 && ascii(1, 4) === "PNG" && head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a) return "image/png";
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "image/jpeg";
  if (head.length >= 4 && ascii(0, 4) === "GIF8") return "image/gif";
  if (head.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

function base64Of(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  return btoa(binary);
}

async function bytesOf(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === "function") return new Uint8Array(await blob.arrayBuffer());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/** The picture at LONG_EDGE on its long side, or null when it is already
 *  that small or the browser cannot draw it (a test, an old browser): the
 *  original is sent then. A GIF comes back as a PNG of its first frame,
 *  which is all the model reads of one. */
async function scaledDown(blob: Blob, type: ImageType): Promise<{ blob: Blob; type: ImageType } | null> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    return null;
  }
  const long = Math.max(bitmap.width, bitmap.height);
  if (long <= LONG_EDGE) {
    bitmap.close();
    return null;
  }
  const scale = LONG_EDGE / long;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const outType: ImageType = type === "image/gif" ? "image/png" : type;
  const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outType, 0.9));
  // toBlob falls back to PNG for a type it cannot write (WebP in Safari):
  // the blob's own type is the truth.
  return out ? { blob: out, type: (IMAGE_TYPES as readonly string[]).includes(out.type) ? (out.type as ImageType) : "image/png" } : null;
}

let nextImageId = 0;

/** A file the reader picked or pasted, ready to send, or why it cannot be. */
export async function readImage(file: File): Promise<ChatImage | ImageRefusal> {
  if (file.size > MAX_IMAGE_FILE_BYTES) return "size";
  let bytes: Uint8Array;
  try {
    bytes = await bytesOf(file);
  } catch {
    return "unreadable";
  }
  const type = sniffImage(bytes.subarray(0, 16));
  if (!type) return "type";
  const scaled = await scaledDown(file, type);
  if (scaled) {
    try {
      bytes = await bytesOf(scaled.blob);
    } catch {
      return "unreadable";
    }
  }
  const data = base64Of(bytes);
  if (data.length > MAX_IMAGE_BASE64) return "size";
  return { id: `img${nextImageId++}`, name: file.name || "image", mediaType: scaled?.type ?? type, data };
}

export function imageBlock(image: ChatImage): ChatBlock {
  return { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } };
}

export function imageSrc(image: ChatImage): string {
  return `data:${image.mediaType};base64,${image.data}`;
}

/** The images a history holds and the size of their data, which the
 *  history's own size cap leaves out: one screenshot is larger than a
 *  conversation of words. */
export function imageLoad(history: ChatMessage[]): { count: number; chars: number } {
  let count = 0;
  let chars = 0;
  for (const m of history) {
    if (m.role !== "user" || typeof m.content === "string") continue;
    for (const b of m.content) {
      const data = b.type === "image" ? (b.source as { data?: unknown } | undefined)?.data : undefined;
      if (typeof data === "string") {
        count += 1;
        chars += data.length;
      }
    }
  }
  return { count, chars };
}
