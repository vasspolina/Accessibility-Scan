import sharp from "sharp";

// The viewport screenshot is already captured for the AI review layer. The
// vision simulators need the same image client-side, so it's re-encoded small
// enough to ship in a JSON response — one image the widget then re-filters in
// the browser, rather than the server rendering a variant per condition.
const PREVIEW_WIDTH = 900;
const PREVIEW_QUALITY = 62;

export async function downscalePreview(base64Jpeg: string): Promise<string | undefined> {
  if (!base64Jpeg) return undefined;
  try {
    const out = await sharp(Buffer.from(base64Jpeg, "base64"))
      .resize({ width: PREVIEW_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: PREVIEW_QUALITY })
      .toBuffer();
    return out.toString("base64");
  } catch {
    // A missing preview just hides the simulators — never fail a scan for it.
    return undefined;
  }
}
