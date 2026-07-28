import sharp from "sharp";
import { BLANK_STDEV } from "./renderPage.js";
import type { BoundingBox } from "./renderPage.js";
import type { AccessibilityFinding, Severity } from "../../types/report.js";

const PADDING_PX = 12;
// The smallest crop worth showing. An icon is 16-20px square, and twelve
// pixels of padding around one still gives a frame nobody can read: measured
// on bundesregierung.de, 23 of 38 thumbnails came out narrower than the box
// they are displayed in, sixteen of them icons under 21px, blown up roughly
// elevenfold by the layout into the smudges that prompted this.
//
// The answer is context rather than magnification. A crop this size centred on
// a small element shows the icon *and* what sits around it, which is what
// tells the reader which icon is meant — and it arrives crisp, because it is
// never scaled up.
const MIN_CROP_WIDTH = 260;
const MIN_CROP_HEIGHT = 120;
const MAX_THUMB_WIDTH = 480;
const JPEG_QUALITY = 60;
const MAX_THUMBNAILS_PER_SCAN = 70;
const SEVERITY_PRIORITY: Record<Severity, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };

// Elements small and self-contained enough that a crop shows the thing itself:
// media, and the form controls people actually operate. A bare `div`, `a`,
// `section` or `p` is not here on purpose — those stand in for a region, and a
// generic tag with no qualifier resolves to the first one on the page, which
// is rarely the one the finding meant.
const CAPTURABLE_TAGS = /^(img|picture|figure|svg|input|select|textarea|button|form|label|fieldset)\b/i;

// Whether a selector names one discrete element rather than standing in for a
// region. Only the final segment matters — that's what the selector resolves
// to. An id makes any selector specific regardless of tag, since an id is
// unique in a valid document.
export function selectorTargetsOneElement(selector: string): boolean {
  const last = selector.split(/[>\s]+/).filter(Boolean).pop() ?? "";
  if (last.includes("#")) return true;
  return CAPTURABLE_TAGS.test(last);
}

// A control is short. A section is tall. Nothing else about a measured box
// separates "the search field" from "the page's whole header", and the box is
// evidence where the selector string is only a guess.
//
// Height alone, deliberately: plenty of real controls run the full width of
// their column (a newsletter field, a search bar), so width would reject the
// exact things we want. A crop this short can't swallow a section.
const MAX_COMPONENT_HEIGHT_PX = 220;

function sizeLooksLikeOneElement(box: BoundingBox | null | undefined): boolean {
  if (!box) return false;
  // Zero-size elements are hidden or collapsed; there is nothing to picture.
  if (box.width < 8 || box.height < 8) return false;
  return box.height <= MAX_COMPONENT_HEIGHT_PX;
}

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
    // Pad out to a legible frame, keeping the element in the middle of it, and
    // never widening past the page image itself.
    const padX = Math.max(PADDING_PX, (MIN_CROP_WIDTH - box.width) / 2);
    const padY = Math.max(PADDING_PX, (MIN_CROP_HEIGHT - box.height) / 2);
    const left = Math.max(0, Math.floor(box.x - padX));
    const top = Math.max(0, Math.floor(box.y - padY));
    const right = Math.min(imgWidth, Math.ceil(box.x + box.width + padX));
    const bottom = Math.min(imgHeight, Math.ceil(box.y + box.height + padY));
    const width = right - left;
    const height = bottom - top;

    if (width <= 0 || height <= 0) return null;

    const cropped = await sharp(fullPageScreenshot)
      .extract({ left, top, width, height })
      .resize({ width: Math.min(MAX_THUMB_WIDTH, width), withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // Every element-capture path in renderPage rejects a frame that came out a
    // single flat colour; this one didn't, and it was the gap that shipped a
    // blank white box as a thumbnail. It happens for real reasons — a
    // lazy-loaded image that never entered the viewport before the full-page
    // shot, an element the capture didn't reach — and the crop succeeds
    // regardless, so nothing else catches it.
    //
    // The damage went further than an ugly thumbnail. The alt-text suggester
    // reads exactly these pixels, so a blank crop got sent to the model, which
    // dutifully reported the image "looks decorative" and advised alt="" on a
    // picture nobody had seen. Refusing the crop removes both: no thumbnail,
    // and no suggestion drawn from one.
    const stats = await sharp(cropped).stats().catch(() => null);
    const maxStdev = stats ? Math.max(...stats.channels.map((c) => c.stdev)) : 1;
    if (maxStdev < BLANK_STDEV) return null;

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
    // A layer that captured its own evidence keeps it. The text-resize checks
    // shoot the page while the override is applied, because once it's removed
    // the breakage is gone — replacing that with a normal-state capture would
    // show a perfectly healthy element and contradict the finding.
    if (finding.elementScreenshot) continue;
    // Page-level findings (e.g. "your HTML has errors", "the page mixes N
    // typefaces") point at the whole document, not one element — a thumbnail
    // of the entire page tells the owner nothing, so leave them imageless.
    if (finding.selector === "html" || finding.selector === "body") continue;
    // AI-review findings carry a model-chosen selector, which is a description
    // of where the problem is rather than a guaranteed handle on one element.
    // For layout and copy findings the model is explicitly told to fall back to
    // "the closest relevant selector (e.g. the containing section)" — cropping
    // that yields a picture of a whole section, which is why these were
    // suppressed.
    //
    // The exception is anything that resolves to one discrete element: a
    // photo, a search box, a newsletter field. There the picture IS the
    // evidence — "is this photo decorative or meaningful?" and "is this field
    // labelled?" are both unanswerable without seeing the thing.
    //
    // Two ways to qualify, because the selector string alone isn't enough. The
    // model often points at a small wrapper rather than the control inside it,
    // and "div:nth-of-type(1) > nav > div" is indistinguishable from a whole
    // section by name. The measured box tells us what the name can't: a search
    // box is tens of pixels tall, a section is hundreds. See sizeLooksLikeOneElement.
    if (
      finding.source === "ai-review" &&
      !selectorTargetsOneElement(finding.selector) &&
      !sizeLooksLikeOneElement(boundingBoxes[finding.selector])
    ) {
      continue;
    }
    // Tap targets are no longer skipped here. They get their picture from the
    // mobile pass, which shoots them at phone width with their neighbours in
    // frame — the only way a 30px control reads as anything. The `mobile-`
    // guard further down is what keeps them from being cropped out of the
    // desktop full-page image, which would picture a layout the finding isn't
    // about.
    // A link with no readable text is, by definition, one there is nothing to
    // see in: an empty anchor, or one wrapping an image the alt-text findings
    // already picture. The capture comes back an empty grey rectangle, which
    // takes up the most prominent space on the card and shows nothing. The
    // written label — "link to Accessible UX Research" — identifies it far
    // better, and where a link's text says nothing the label carries the
    // destination for exactly this reason.
    if (finding.ruleId === "link-name" || finding.ruleId === "link-text-vague") continue;
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

  // A few at a time, not all seventy at once.
  //
  // Every crop calls sharp(fullPageScreenshot), and a full-page shot is a
  // large image: smashingmagazine's is 1280x9570. Running seventy of those
  // through libvips simultaneously spikes memory for no benefit, because the
  // crops are quick and nothing downstream needs them sooner.
  //
  // Measured on that page, seventy at once against four at a time: peak node
  // RSS growth 156MB versus 28MB, for 297ms versus 338ms. So it costs about
  // 40ms and saves about 128MB per scan, which at three concurrent scans is
  // most of a third of a gigabyte off the peak.
  //
  // Worth recording that the arithmetic that prompted this was wrong. 1280 x
  // 9570 x 3 bytes is 35MB of raw pixels, which suggested 2.4GB for seventy —
  // and the measurement says 156MB. libvips shrinks on load and streams rather
  // than expanding the whole image per call, so the naive figure overstated it
  // roughly fifteenfold. The change is still worth having; it is not the
  // dramatic fix the estimate implied.
  const CONCURRENT_CROPS = 4;
  for (let i = 0; i < candidates.length; i += CONCURRENT_CROPS) {
    await Promise.all(
      candidates.slice(i, i + CONCURRENT_CROPS).map(async (finding) => {
        const box = boundingBoxes[finding.selector];
        if (!box) return;
        const thumbnail = await cropElementThumbnail(fullPageScreenshot, box, imgWidth, imgHeight);
        if (thumbnail) finding.elementScreenshot = thumbnail;
      })
    );
  }
}
