import { useState } from "react";
import { clearHistory, diffScans, type HistoryEntry } from "../lib/scanHistory";
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

  if (cleared || previous.length === 0) return null;

  const last = previous[0];
  const diff = diffScans(last, current);
  const up = diff.scoreChange > 0;
  const flat = diff.scoreChange === 0;

  return (
    <section className="a11y-section a11y-hist">
      <h3 className="a11y-section-title">
        Since last time{" "}
        <span className="a11y-section-count">
          {previous.length === 1 ? "1 earlier scan" : `${previous.length} earlier scans`}
        </span>
      </h3>
      <p className="a11y-section-desc">
        Compared with {formatDate(last.scannedAt)}. Kept in this browser only, never sent anywhere.
      </p>

      <div className="a11y-conf-tiles">
        <div className={`a11y-conf-tile${up ? " a11y-hist-up" : ""}`}>
          <span className="a11y-conf-num">
            {flat ? current.score : `${up ? "+" : ""}${diff.scoreChange}`}
          </span>
          <span className="a11y-conf-cap">
            <strong>{flat ? "score unchanged" : up ? "score is up" : "score is down"}</strong>
            <em>
              {last.score} then, {current.score} now
            </em>
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
          <h4 className="a11y-hist-head">Fixed since {formatDate(last.scannedAt)}</h4>
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
          <h4 className="a11y-hist-head">New since then</h4>
          <ul className="a11y-hist-list">
            {diff.appeared.map((r) => (
              <li key={r} className="a11y-hist-new">
                {ruleLabel(r)}
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="a11y-hist-head">Every scan of this page</h4>
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

      <button
        type="button"
        className="a11y-show-all"
        onClick={() => {
          clearHistory();
          setCleared(true);
        }}
      >
        Delete this history
      </button>
    </section>
  );
}
