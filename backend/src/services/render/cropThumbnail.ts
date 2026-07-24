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
 *
 * Takes the full-page image's dimensions as a param rather than reading
 * them via sharp(...).metadata() itself — this gets called once per
 * finding (up to MAX_THUMBNAILS_PER_SCAN, concurrently), and re-decoding
 * the same (potentially multi-MB) buffer just to read its dimensions on
 * every call doubles the decode work for no reason.
 */
export async function cropElementThumbnail(
  fullPageScreenshot: Buffer,
  box: BoundingBox,
  imgWidth: number,
  imgHeight: number
): Promise<string | null> {
  if (box.width <= 0 || box.height <= 0 || imgWidth === 0 || imgHeight === 0) return null;

  // Some sites report a much shorter document.scrollHeight than their real
  // rendered content — typically `overflow: hidden` on <body> paired with a
  // custom virtual-scroll container (smooth-scroll libraries like Lenis are
  // a common cause). Playwright's fullPage screenshot relies on that height
  // to decide how much to capture, so on these sites it silently captures
  // far less than the actual page. An element whose box falls mostly (or
  // entirely) outside the captured image would otherwise get a truncated,
  // misleading partial crop instead of no crop — refuse rather than show a
  // wrong picture. Small overflow (~15%) is tolerated as ordinary rounding/
  // padding slop, not a sign of this problem.
  const verticalOverflow = Math.max(0, box.y + box.height - imgHeight) + Math.max(0, -box.y);
  const horizontalOverflow = Math.max(0, box.x + box.width - imgWidth) + Math.max(0, -box.x);
  if (verticalOverflow > box.height * 0.15 || horizontalOverflow > box.width * 0.15) {
    return null;
  }

  try {
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
 * possible. Prefers the precise per-element captures taken while the page
 * was open (see renderPage.ts's captureElementScreenshots) — accurate on any
 * page regardless of its scroll architecture — and only falls back to
 * cropping from the document-level full-page image for findings that weren't
 * pre-captured (AI-review findings, or axe findings past the per-element
 * cap). The crop fallback is itself capped and severity-prioritized so a
 * page with hundreds of minor violations doesn't spend the whole scan
 * cropping images nobody will look at first.
 */
export async function attachElementScreenshots(
  findings: AccessibilityFinding[],
  boundingBoxes: Record<string, BoundingBox | null>,
  fullPageScreenshot: Buffer | null,
  precaptured: Record<string, string> = {}
): Promise<void> {
  const needsCrop: AccessibilityFinding[] = [];
  for (const finding of findings) {
    // Page-level findings (e.g. "your HTML has errors", "the page mixes N
    // typefaces") point at the whole document, not one element — a thumbnail
    // of the entire page tells the owner nothing, so leave them imageless.
    if (finding.selector === "html" || finding.selector === "body") continue;
    // AI-review findings carry a model-chosen selector, which is a description
    // of where the problem is rather than a guaranteed handle on one element —
    // it often resolves to a parent, a sibling, or nothing. Cropping it yields
    // a picture of the wrong thing, and a confidently wrong thumbnail is worse
    // than none. These findings are prose and explain their own location.
    if (finding.source === "ai-review") continue;
    // Tiny tap targets are typically transparent icon controls sitting over a
    // photo or background — a crop of that box is a confusing blur of whatever
    // is behind them, not a recognizable control (and it changes shot to shot
    // as the background moves). The plain label ("“Toggle search” button")
    // identifies the element far better, so never show a thumbnail for these.
    if (finding.ruleId === "mobile-tap-target") continue;
    const shot = precaptured[finding.selector];
    if (shot) {
      finding.elementScreenshot = shot;
    } else if (!finding.ruleId?.startsWith("mobile-")) {
      // Mobile findings describe the phone layout; they only ever use the
      // mobile capture taken at phone width (in precaptured). Never crop them
      // from the desktop full-page image — that would picture the wrong
      // layout, the exact problem the mobile pass avoids. No mobile shot ⇒ no
      // thumbnail, which is correct.
      needsCrop.push(finding);
    }
  }

  if (!fullPageScreenshot || needsCrop.length === 0) return;

  const meta = await sharp(fullPageScreenshot)
    .metadata()
    .catch(() => null);
  const imgWidth = meta?.width ?? 0;
  const imgHeight = meta?.height ?? 0;
  if (imgWidth === 0 || imgHeight === 0) return;

  const candidates = needsCrop
    .sort((a, b) => SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity])
    .slice(0, MAX_THUMBNAILS_PER_SCAN);

  await Promise.all(
    candidates.map(async (finding) => {
      const box = boundingBoxes[finding.selector];
      if (!box) return;
      const thumbnail = await cropElementThumbnail(fullPageScreenshot, box, imgWidth, imgHeight);
      if (thumbnail) finding.elementScreenshot = thumbnail;
    })
  );
}
