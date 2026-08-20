import { Fragment, useEffect, useRef, useState } from "react";
import { t } from "../lib/strings";
import { createPortal } from "react-dom";
import { Dialog } from "./Dialog";
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

/**
 * The runs, newest first, grouped under the year they happened in.
 *
 * Two scans on the same day are common — someone fixes something and runs
 * it again — and a column that says "10 Aug 2026" twice with no other
 * difference is a column the reader has to distrust. The newest carries
 * "just now"; the one below it carries "earlier", which is true of every
 * same-day run and claims no more precision than the date already does.
 */
function groupByYear(
  entries: { scannedAt: string; score: number; note?: string }[]
): { year: string; runs: { scannedAt: string; score: number; note?: string }[] }[] {
  const out: { year: string; runs: typeof entries }[] = [];
  for (const e of entries) {
    const year = String(new Date(e.scannedAt).getFullYear());
    const last = out[out.length - 1];
    if (last && last.year === year) last.runs.push(e);
    else out.push({ year, runs: [e] });
  }
  return out;
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
  function widgetInnerEl(): HTMLElement | null {
    const root = anchorRef.current?.getRootNode();
    return root instanceof ShadowRoot ? root.querySelector<HTMLElement>(".a11y-widget-inner") : null;
  }

  useEffect(() => {
    const contentEl = widgetInnerEl();
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

  const sameDayAsCurrent = (iso: string) =>
    new Date(iso).toDateString() === new Date(current.scannedAt).toDateString();
  const runsByYear = groupByYear([
    { scannedAt: current.scannedAt, score: current.score, note: "just now" },
    ...previous.map((e) => ({
      scannedAt: e.scannedAt,
      score: e.score,
      note: sameDayAsCurrent(e.scannedAt) ? "earlier" : undefined,
    })),
  ]);

  // The section doesn't vanish under the person who just pressed Delete —
  // that would drop keyboard focus to <body> and say nothing to a screen
  // reader. A confirmation stays where the section was.
  if (cleared) {
    return (
      <section className="a11y-section a11y-hist" aria-labelledby="a11y-hist-heading">
        <h2 className="a11y-section-title" id="a11y-hist-heading" data-nav-label={t("Since last time")}>{t("Since last time")}</h2>
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
    <section className="a11y-section a11y-hist" aria-labelledby="a11y-hist-heading">
      {/* The design titles the whole panel and moves "Since last time" down
          to be one of three pill heads inside it. The heading keeps the
          word "scans" — CSS uppercases it, so the accessible name stays
          sentence case, and a landmark called only "Previous" says less
          than it should. */}
      <h2 className="a11y-section-title a11y-hist-title" id="a11y-hist-heading" data-nav-label={t("Since last time")}>
        Previous scans
      </h2>

      <div className="a11y-hist-cols">
        <div className="a11y-hist-col">
          <h3 className="a11y-hist-head">Every scan of this page</h3>
          {/* Grouped by year, because a bare column of dates makes the
              reader parse four digits on every line to find the boundary.
              The year is a real <li> rather than a heading between lists:
              one list of runs is one list, and splitting it per year would
              tell a screen reader "list of 4" then "list of 3" for what is
              one sequence. */}
          <ul className="a11y-hist-runs">
            {runsByYear.map(({ year, runs }) => (
              <Fragment key={year}>
                <li className="a11y-hist-year">{year}</li>
                {runs.map((e) => (
                  <li key={e.scannedAt}>
                    {formatDate(e.scannedAt)} &mdash;{" "}
                    <span className="a11y-hist-score">{e.score} / 100</span>
                    {e.note ? <em>, {e.note}</em> : null}
                  </li>
                ))}
              </Fragment>
            ))}
          </ul>
        </div>

        <div className="a11y-hist-col">
          <h3 className="a11y-hist-head">Since last time</h3>
          {/* The three numbers used to be stat tiles. As lines they read as
              the sentences they always were, and the score line can say
              "not comparable" without a tile having to show a number it
              does not believe. */}
          <ul className="a11y-hist-facts">
            <li>
              {comparable ? (
                <>
                  {flat ? "Score unchanged" : up ? "Score is up" : "Score is down"} &mdash;{" "}
                  {last.score} then, {current.score} now
                </>
              ) : (
                <>
                  Not comparable &mdash; we scored the earlier scan by different rules. Some
                  checks that used to sit outside the number now count towards it, so the two
                  are not a fair comparison and we claim no change.
                </>
              )}
            </li>
            <li>
              Problems gone &mdash;{" "}
              {diff.fixed.length === 0
                ? "none found this time"
                : diff.fixed.map(ruleLabel).join(", ")}
            </li>
            {/* "none weren't there before" is a double negative, and the
                design's own copy has it. Said the way round it means. */}
            <li>
              New problems &mdash;{" "}
              {diff.appeared.length === 0
                ? "none appeared"
                : diff.appeared.map(ruleLabel).join(", ")}
            </li>
          </ul>

          <h3 className="a11y-hist-head">Where this lives</h3>
          <ul className="a11y-hist-facts">
            <li>Kept in this browser only, never sent anywhere.</li>
            <li>
              Delete it whenever you like &mdash; nothing here is needed to run another scan.
            </li>
          </ul>
          {/* The design writes "Delete this history at any time" as a line
              of prose. It is the one genuinely destructive action here, so
              it stays a real control with its confirmation, sitting under
              the sentence that promises it. */}
          <button
            ref={anchorRef}
            type="button"
            className="a11y-show-all a11y-danger-btn"
            onClick={() => setConfirmOpen(true)}
          >
            Delete this history
          </button>
        </div>
      </div>

      {portalTarget &&
        createPortal(
          <Dialog
            open={confirmOpen}
            title="Delete this history?"
            primaryLabel="Delete"
            danger
            secondaryLabel="Cancel"
            onClose={() => {
              setConfirmOpen(false);
              // The effect above only clears .inert once it re-runs after
              // this render commits — which hasn't happened yet at this
              // point in the same click. An inert subtree can't take focus,
              // so anchorRef.current.focus() would silently do nothing
              // without clearing it here first.
              const contentEl = widgetInnerEl();
              if (contentEl) contentEl.inert = false;
              anchorRef.current?.focus();
            }}
            onPrimary={() => {
              clearHistory();
              setCleared(true);
              setConfirmOpen(false);
            }}
          >
            You can&rsquo;t undo this. Every past scan of this page, kept
            only in this browser, will be gone — including the comparison
            above.
          </Dialog>,
          portalTarget
        )}
    </section>
  );
}
