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
          return tf("That page asks for a login first (HTTP {status}). Use the form's login option to sign in with a test account.", {
            status: reason.status,
          });
        return tf(
          "{host} answered with an error (HTTP {status}) instead of the page, so there was nothing to check. Try again later.",
          { host: reason.host, status: reason.status }
        );
      case "document-status":
        return tf("We couldn't download the document (HTTP {status}).", { status: reason.status });
    }
  }
  return t(message);
}

// The capture pass's reasons for a finding with no picture, in English. The
// last sentence of some is left off when the element sits in a consent
// frame, because the frame's own sentence says where to look instead.
const PICTURE_NOTES: Record<NonNullable<AccessibilityFinding["pictureReason"]>, string> = {
  hidden:
    "No picture: this element was hidden when we scanned, for example inside a closed menu, a folded section or a popup. Open that part of the page to see it.",
  offscreen:
    "No picture: this sits off the edge of the screen until the keyboard reaches it or a slider brings it into view. Skip links are built this way on purpose.",
  "no-usable-image":
    "No picture: the element is there, but its photograph came out blank or showed something covering it, such as a cookie banner.",
  "too-large":
    "No picture: this covers a whole region of the page, not one component. A photograph of the entire section would not show which part is at fault.",
  missing:
    "No picture: the element was on the page when we checked it, and gone when we went back to photograph it. Banners that appear once per visitor do this.",
  "not-attempted":
    "No picture: a scan photographs a limited number of elements in a limited time, and this one came after that limit.",
  unreachable:
    "No picture: this element couldn't be located again on the return visit. Pages that rebuild themselves on every load do this.",
};

const POINTS_TO_DETAILS = new Set(["hidden", "no-usable-image", "too-large", "not-attempted"]);

/** The note on a finding that has no picture, in the reader's language.
 *  A report saved before the reason was sent has only the English note. */
export function pictureNoteText(finding: AccessibilityFinding): string | undefined {
  const reason = finding.pictureReason;
  // The scan's own budget running out is not something the reader can act
  // on, and the note filled the opened finding where What we found belongs
  // (user's word, 26 Nov 2026, "this text is a slop"). No note at all.
  if (reason === "not-attempted") return undefined;
  if (!reason) return finding.pictureNote;
  const note = t(PICTURE_NOTES[reason]);
  if (finding.pictureFrame) {
    return `${note} ${tf(
      "This element is inside the consent frame from {host}, so the selector in the technical details is a path within that frame rather than within your own page.",
      { host: finding.pictureFrame }
    )}`;
  }
  return POINTS_TO_DETAILS.has(reason)
    ? `${note} ${t("The technical details for this finding identify the exact element.")}`
    : note;
}
