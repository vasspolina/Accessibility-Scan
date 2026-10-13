import { t, tf } from "./strings";
import type { AccessibilityFinding, FailureReason } from "../api/scanClient";

/**
 * Why a scan failed, in the reader's language.
 *
 * The backend's sentences are English, and those with no values in them are
 * keys in the strings table, so they translate as they are. The ones that
 * carry a host or a status arrive with those values as `reason` as well, and
 * are worded here, whole: a sentence stitched from translated fragments only
 * ever reads right in English.
 */
export function failureText(message: string, reason?: FailureReason): string {
  if (reason) {
    switch (reason.code) {
      case "refused":
        return tf(
          "{host} turned our scanner away (HTTP {status}). Its protection against automated visitors keeps tools like ours out, so this says nothing about how accessible the site is.",
          { host: reason.host, status: reason.status }
        );
      case "challenge":
        return tf(
          '{host} showed "{label}" instead of the page. Its protection against automated visitors keeps tools like ours out, so this says nothing about how accessible the site is.',
          { host: reason.host, label: reason.label }
        );
      case "page-status":
        if (reason.status === 404 || reason.status === 410)
          return tf("There is no page at that address (HTTP {status}). Check the address and try again.", {
            status: reason.status,
          });
        if (reason.status === 401)
          return tf("That page asks for a login first (HTTP {status}). The form can sign in with your details.", {
            status: reason.status,
          });
        return tf(
          "{host} answered with an error (HTTP {status}) instead of the page, so there was nothing to check. Try again later.",
          { host: reason.host, status: reason.status }
        );
      case "document-status":
        return tf("We could not download the document (HTTP {status}).", { status: reason.status });
    }
  }
  return t(message);
}

// The capture pass's reasons for a finding with no picture, in English. The
// last sentence of some is left off when the element sits in a consent
// frame, because the frame's own sentence says where to look instead.
const PICTURE_NOTES: Record<NonNullable<AccessibilityFinding["pictureReason"]>, string> = {
  hidden:
    "No picture: this was not visible on the page when it was scanned. Something reveals it, such as opening a panel or moving focus to it.",
  offscreen:
    "No picture: this sits off the edge of the screen until it is used. Skip links are built this way on purpose, so nothing is necessarily wrong with it being there.",
  "no-usable-image":
    "No picture: the element is there, but photographing it produced nothing worth showing. A blank rectangle, or whatever is sitting on top of it.",
  "too-large":
    "No picture: this covers a whole region of the page rather than one component, and a photograph of the entire section would not show you which part of it is at fault.",
  missing:
    "No picture: the element was on the page when we judged it, and gone when we went back to photograph it. Banners that appear once per visitor do this.",
  "not-attempted":
    "No picture: each scan photographs a limited number of elements, and this one was past that limit. Nothing about the element itself. Scanning again may reach it.",
  unreachable:
    "No picture: this element could not be located again on the return visit. Pages that rebuild themselves on every load do this.",
};

const POINTS_TO_DETAILS = new Set(["no-usable-image", "too-large"]);

/** The note on a finding that has no picture, in the reader's language.
 *  A report saved before the reason was sent has only the English note. */
export function pictureNoteText(finding: AccessibilityFinding): string | undefined {
  const reason = finding.pictureReason;
  if (!reason) return finding.pictureNote;
  const note = t(PICTURE_NOTES[reason]);
  if (finding.pictureFrame) {
    return `${note} ${tf(
      "This element lives inside the consent frame from {host}, so the selector in the technical details is a path within that frame rather than within your own page.",
      { host: finding.pictureFrame }
    )}`;
  }
  return POINTS_TO_DETAILS.has(reason)
    ? `${note} ${t("The technical details for this finding identify the exact element.")}`
    : note;
}
