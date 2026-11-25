import type { DetectedOverlay } from "../api/scanClient";
import { t, tf } from "../lib/strings";
import { Notification } from "./Feedback";

/**
 * The overlay note: one notice per third-party accessibility overlay the
 * scan saw on the page (the backend's meta.overlays,
 * services/overlay/analyzeOverlay.ts).
 *
 * A notice and not a card, for the reason the backend keeps it out of the
 * findings: it is a statement about how the page was measured, with no
 * severity and nothing to fix, and it does not move the score. It sits
 * with the other notices that qualify the reading (no AI review, checks
 * that did not finish).
 *
 * The wording states what was seen and stops there. Two cases, and the
 * difference matters: only when the vendor's widget element was on the
 * page does the note say the findings were measured with it running. A
 * script tag alone is a widget that had not started in the scan's browser,
 * and saying "measured with it on" there would be false.
 *
 * "Overlay" is glossed on first use, as every term of art in this report
 * is. No word about whether an overlay helps: that is an argument about a
 * product, not a measurement of this page.
 */
export function OverlayNotes({ overlays }: { overlays?: DetectedOverlay[] }) {
  if (!overlays || overlays.length === 0) return null;
  return (
    <>
      {overlays.map((o) => (
        <Notification
          key={o.vendor}
          kind="info"
          className="a11y-yellow-note"
          title={tf("This page loads an accessibility overlay: {vendor}", { vendor: o.vendor })}
          subtitle={
            <>
              {t(
                o.widgetOnPage
                  ? "It was running, so every finding was measured with it on."
                  : "Its script is on this page, and its widget had not started when we measured."
              )}
              {o.scriptUrl && (
                <>
                  <br />
                  {tf("Loaded from {url}", { url: o.scriptUrl })}
                </>
              )}
            </>
          }
        />
      ))}
    </>
  );
}
