import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "@verify/design-system";
import { clearHistory, diffScans, scoresComparable, type HistoryEntry } from "../lib/scanHistory";
import { plainForRule } from "../lib/wcagPlain";

// Shows whether the work actually moved anything. A score on its own is a
// verdict. A score with last month's beside it is progress, and progress is
// what gets the next fix done.

function formatDate(iso: string): string {
  // European format, house style.
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ruleLabel(ruleId: string): string {
  return plainForRule(ruleId)?.plain ?? ruleId;
}

export function ScanHistory({
  current,
  previous,
}: {
  current: HistoryEntry;
  previous: HistoryEntry[];
}) {
  const [cleared, setCleared] = useState(false);
  // Deleting history is irreversible and was firing on one click with no
  // way back — the system's own content rule for dialogs is "state
  // consequences plainly", and this is exactly the destructive action it
  // describes. The imported Dialog gates it now.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  // The imported Dialog is a scrim overlay, not a full modal: nothing marks
  // the page behind it inert, so a screen reader can still reach the report
  // underneath and — the finding that caught this — axe reported the
  // background text failing contrast against the scrim it sits behind.
  // Portalling the dialog to the shadow root's top level (rather than
  // leaving it nested inside this section) makes it possible to inert
  // everything else with one line instead of walking every ancestor's
  // siblings, which is what the loop below does while the dialog is open.
  useEffect(() => {
    const root = anchorRef.current?.getRootNode();
    const contentEl =
      root instanceof ShadowRoot ? root.querySelector<HTMLElement>(".a11y-widget-inner") : null;
    if (!contentEl) return;
    contentEl.inert = confirmOpen;
    return () => {
      contentEl.inert = false;
    };
  }, [confirmOpen]);

  const root = anchorRef.current?.getRootNode();
  const portalTarget =
    root instanceof ShadowRoot ? root.querySelector<HTMLElement>(".a11y-dialog-root") : null;

  if (previous.length === 0) return null;

  // The section doesn't vanish under the person who just pressed Delete —
  // that would drop keyboard focus to <body> and say nothing to a screen
  // reader. A confirmation stays where the section was.
  if (cleared) {
    return (
      <section className="a11y-section a11y-hist">
        <h2 className="a11y-section-title">Since last time</h2>
        <p className="a11y-section-desc" role="status" tabIndex={-1} ref={(el) => el?.focus()}>
          Scan history deleted from this browser.
        </p>
      </section>
    );
  }

  const last = previous[0];
  const diff = diffScans(last, current);
  const up = diff.scoreChange > 0;
  const flat = diff.scoreChange === 0;
  // Two scores are only comparable if they were counted the same way. When
  // what counts has changed under a site, the difference between the numbers
  // is our doing rather than theirs, and calling it "score is down" would name
  // a regression that never happened. The rule ids are unaffected, so the two
  // tiles beside this one stay exactly as true as they were.
  const comparable = scoresComparable(last, current);

  return (
    <section className="a11y-section a11y-hist">
      <h2 className="a11y-section-title">
        Since last time{" "}
        <span className="a11y-section-count">
          {previous.length === 1 ? "1 earlier scan" : `${previous.length} earlier scans`}
        </span>
      </h2>
      <p className="a11y-section-desc">
        Compared with {formatDate(last.scannedAt)}. Kept in this browser only, never sent anywhere.
        {!comparable && (
          <>
            {" "}
            How scores are worked out has changed since that scan — some checks that used to
            sit outside the number now count towards it — so the two scores are
            not a fair comparison and no change is claimed. What was fixed and
            what appeared is unaffected, and is shown below.
          </>
        )}
      </p>

      <div className="a11y-conf-tiles">
        <div className={`a11y-conf-tile${comparable && up ? " a11y-hist-up" : ""}`}>
          <span className="a11y-conf-num">
            {!comparable
              ? current.score
              : flat
                ? current.score
                : `${up ? "+" : ""}${diff.scoreChange}`}
          </span>
          <span className="a11y-conf-cap">
            {comparable ? (
              <>
                <strong>{flat ? "score unchanged" : up ? "score is up" : "score is down"}</strong>
                <em>
                  {last.score} then, {current.score} now
                </em>
              </>
            ) : (
              <>
                <strong>not comparable</strong>
                <em>the earlier scan was scored by different rules</em>
              </>
            )}
          </span>
        </div>
        <div className="a11y-conf-tile">
          <span className="a11y-conf-num">{diff.fixed.length}</span>
          <span className="a11y-conf-cap">
            <strong>problems gone</strong>
            <em>not found this time</em>
          </span>
        </div>
        <div className={`a11y-conf-tile${diff.appeared.length > 0 ? " a11y-conf-tile-fail" : ""}`}>
          <span className="a11y-conf-num">{diff.appeared.length}</span>
          <span className="a11y-conf-cap">
            <strong>new problems</strong>
            <em>weren't there before</em>
          </span>
        </div>
      </div>

      {diff.fixed.length > 0 && (
        <>
          <h3 className="a11y-hist-head">Fixed since {formatDate(last.scannedAt)}</h3>
          <ul className="a11y-hist-list">
            {diff.fixed.map((r) => (
              <li key={r} className="a11y-hist-fixed">
                {ruleLabel(r)}
              </li>
            ))}
          </ul>
        </>
      )}

      {diff.appeared.length > 0 && (
        <>
          <h3 className="a11y-hist-head">New since then</h3>
          <ul className="a11y-hist-list">
            {diff.appeared.map((r) => (
              <li key={r} className="a11y-hist-new">
                {ruleLabel(r)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="a11y-hist-head">Every scan of this page</h3>
      <ul className="a11y-hist-runs">
        <li>
          <span className="a11y-hist-score">{current.score}</span>
          <span>{formatDate(current.scannedAt)}</span>
          <em>just now</em>
        </li>
        {previous.map((e) => (
          <li key={e.scannedAt}>
            <span className="a11y-hist-score">{e.score}</span>
            <span>{formatDate(e.scannedAt)}</span>
          </li>
        ))}
      </ul>

      {/* The master's danger variant, on the checker's one genuinely
          destructive action — now gated by the imported Dialog rather than
          firing on one click. */}
      <button
        ref={anchorRef}
        type="button"
        className="a11y-show-all a11y-danger-btn"
        onClick={() => setConfirmOpen(true)}
      >
        Delete this history
      </button>

      {portalTarget &&
        createPortal(
          <Dialog
            open={confirmOpen}
            title="Delete this history?"
            primaryLabel="Delete"
            danger
            secondaryLabel="Cancel"
            onClose={() => setConfirmOpen(false)}
            onPrimary={() => {
              clearHistory();
              setCleared(true);
              setConfirmOpen(false);
            }}
          >
            This can&rsquo;t be undone. Every past scan of this page, kept
            only in this browser, will be gone — including the comparison
            above.
          </Dialog>,
          portalTarget
        )}
    </section>
  );
}
