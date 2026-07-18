import sharp from "sharp";
import type { BoundingBox } from "./renderPage.js";
import type { AccessibilityFinding, Severity } from "../../types/report.js";

const PADDING_PX = 12;
const MAX_THUMB_WIDTH = 480;
const JPEG_QUALITY = 60;
const MAX_THUMBNAILS_PER_SCAN = 40;
const SEVERITY_PRIORITY: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

/**
 * Crops a small thumbnail of a flagged element out of the full-page
 * screenshot, so a finding can show what it's actually talking about
 * instead of just a CSS selector. Returns null (rather than throwing) for
 * anything unresolvable — a missing thumbnail should never fail a scan.
 */
export async function cropElementThumbnail(
  fullPageScreenshot: Buffer,
  box: BoundingBox
): Promise<string | null> {
  if (box.width <= 0 || box.height <= 0) return null;

  try {
    const image = sharp(fullPageScreenshot);
    const meta = await image.metadata();
    const imgWidth = meta.width ?? 0;
    const imgHeight = meta.height ?? 0;
    if (imgWidth === 0 || imgHeight === 0) return null;

    const left = Math.max(0, Math.floor(box.x - PADDING_PX));
    const top = Math.max(0, Math.floor(box.y - PADDING_PX));
    const right = Math.min(imgWidth, Math.ceil(box.x + box.width + PADDING_PX));
    const bottom = Math.min(imgHeight, Math.ceil(box.y + box.height + PADDING_PX));
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) return null;

    const cropped = await sharp(fullPageScreenshot)
      .extract({ left, top, width, height })
      .resize({ width: Math.min(MAX_THUMB_WIDTH, width), withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return cropped.toString("base64");
  } catch {
    return null;
  }
}

/**
 * Mutates findings in place, attaching an elementScreenshot thumbnail where
 * possible — capped and severity-prioritized so a page with hundreds of
 * minor violations doesn't spend the whole scan cropping images nobody
 * will look at first.
 */
export async function attachElementScreenshots(
  findings: AccessibilityFinding[],
  boundingBoxes: Record<string, BoundingBox | null>,
  fullPageScreenshot: Buffer | null
): Promise<void> {
  if (!fullPageScreenshot) return;

  const candidates = [...findings]
    .sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity])
    .slice(0, MAX_THUMBNAILS_PER_SCAN);

  await Promise.all(
    candidates.map(async (finding) => {
      const box = boundingBoxes[finding.selector];
      if (!box) return;
      const thumbnail = await cropElementThumbnail(fullPageScreenshot, box);
      if (thumbnail) finding.elementScreenshot = thumbnail;
    })
  );
}
