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
}: {
  finding: AccessibilityFinding;
  showLocator?: boolean;
}) {
  if (!finding.elementScreenshot) return null;
  const box = finding.elementBox;
  return (
    <figure className="a11y-shot">
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
      {showLocator && finding.selector && (
        <figcaption className="a11y-shot-locator">
          <strong>{t("Selector:")}</strong> <code>{finding.selector}</code>
        </figcaption>
      )}
    </figure>
  );
}
