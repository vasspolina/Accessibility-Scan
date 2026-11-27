import type { AccessibilityFinding } from "../../api/scanClient";
import { t } from "../../lib/strings";

/**
 * The picture of a flagged element, with the evidence a reader needs to act on it.
 *
 * Three things the bare <img> it replaces could not do:
 *
 *  1. Say which part of the frame is the element. Captures of small elements
 *     are padded out for context (a 17px icon arrives with its neighbours), so
 *     the frame shows a neighbourhood. `box` is the element's rectangle inside
 *     it as fractions of the frame, and is drawn as a two-ring outline: black
 *     inside, white outside, so one of them shows on any photograph and both
 *     print without "background graphics" (borders and outlines always print).
 *  2. Keep the outline on the element at every size. The frame shrink-wraps the
 *     image (width: fit-content, the image sized by max-width / max-height with
 *     the other side auto) so percentages resolve against the pixels actually
 *     painted. `object-fit: contain` in a fixed box letterboxes the image, and
 *     a percentage box then lands beside the element instead of on it.
 *  3. Give a developer the handle: the selector under the picture, in the
 *     professional view, as selectable text that wraps instead of overflowing.
 *
 * The outline is decoration (aria-hidden): what it points at is already named
 * by the occurrence's label and, for developers, by the selector line.
 */
export function ElementShot({
  finding,
  showLocator = false,
  bubble,
}: {
  finding: AccessibilityFinding;
  showLocator?: boolean;
  /** The element's name, set as a speech bubble over the picture's top-left
   *  corner (user's instruction, 21 Nov 2026, "add bubbles to the finding
   *  screenshots too"). Real text, before the picture in reading order; the
   *  occurrence then leaves its own label out, so the name is said once. */
  bubble?: string;
}) {
  if (!finding.elementScreenshot) return null;
  const box = finding.elementBox;
  const shows = finding.pictureShows ? t(PICTURE_SHOWS[finding.pictureShows]) : null;
  return (
    <figure className={bubble ? "a11y-shot a11y-shot-has-bubble" : "a11y-shot"}>
      {bubble && <span className="a11y-shot-bubble">{bubble}</span>}
      <span className="a11y-shot-frame">
        <img
          className="a11y-shot-img"
          src={`data:image/jpeg;base64,${finding.elementScreenshot}`}
          alt=""
          decoding="async"
        />
        {box && box.width > 0 && box.height > 0 && (
          <span
            className="a11y-shot-box"
            aria-hidden="true"
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.width * 100}%`,
              height: `${box.height * 100}%`,
            }}
          />
        )}
      </span>
      {(shows || (showLocator && finding.selector)) && (
        <figcaption className="a11y-shot-caption">
          {shows && <span className="a11y-shot-shows">{shows}</span>}
          {showLocator && finding.selector && (
            <span className="a11y-shot-locator">
              <strong>{t("Selector:")}</strong> <code>{finding.selector}</code>
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}

/* Every element the report points at is pictured (user's instruction, 25 Nov
   2026). Where the element could not be photographed on its own, the backend
   took a second kind of picture and says which; this line says it to the
   reader, so a picture of a menu bar is not read as the link folded inside. */
const PICTURE_SHOWS: Record<NonNullable<AccessibilityFinding["pictureShows"]>, string> = {
  container: "Hidden when we scanned. This is the part of the page it is folded into.",
  focused: "Shown with the keyboard on it, the only time it appears.",
  top: "The top of the region this covers.",
  covered: "Something lay over it when we photographed it. The outline marks where it is.",
};
