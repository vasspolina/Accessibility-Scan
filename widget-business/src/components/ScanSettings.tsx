import type { AudienceMode } from "../lib/audienceMode";
import type { ScanMode } from "./UrlForm";

/**
 * The run's settings, in the rail, changeable without scrolling back to the
 * form.
 *
 * The three are not equivalent, and the control says so rather than
 * flattening them into one row of identical switches:
 *
 *   Report style  presentation only — the scan is identical in both modes
 *                 and flipping re-renders the report already in hand. A real
 *                 switcher: instant, free, no network.
 *
 *   AI review     an argument to the scan. Changing it means running again.
 *   Scope         the same, and a whole-site run takes minutes rather than
 *                 seconds.
 *
 * So the first is a two-way switch and the other two are buttons that say
 * what they cost. A toggle that silently spent forty seconds — or, for a
 * site audit, several minutes — would be the kind of control this report
 * files against other people's sites.
 */
export function ScanSettings({
  audience,
  onAudienceChange,
  aiIncluded,
  scope,
  busy,
  onRerun,
}: {
  audience: AudienceMode;
  onAudienceChange: (m: AudienceMode) => void;
  aiIncluded: boolean;
  scope: ScanMode;
  busy: boolean;
  /** Runs the scan again with one setting changed. */
  onRerun: (next: { ai?: boolean; scope?: ScanMode }) => void;
}) {
  return (
    <section className="a11y-settings" aria-labelledby="a11y-settings-heading">
      <h3 className="a11y-settings-heading" id="a11y-settings-heading">
        This scan
      </h3>

      {/* Free and instant, so it is a switch. */}
      <div className="a11y-settings-row">
        <span className="a11y-settings-label" id="a11y-settings-style">
          Report style
        </span>
        <div className="a11y-settings-switch" role="group" aria-labelledby="a11y-settings-style">
          <button
            type="button"
            className="a11y-settings-opt"
            aria-pressed={audience === "business"}
            onClick={() => onAudienceChange("business")}
          >
            For everyone
          </button>
          <button
            type="button"
            className="a11y-settings-opt"
            aria-pressed={audience === "professional"}
            onClick={() => onAudienceChange("professional")}
          >
            Professional
          </button>
        </div>
      </div>

      {/* Costs a scan, so it states the cost and does not pretend to toggle. */}
      <div className="a11y-settings-row">
        <span className="a11y-settings-label">AI review</span>
        <span className="a11y-settings-state">{aiIncluded ? "Included" : "Not included"}</span>
        <button
          type="button"
          className="a11y-settings-rerun"
          disabled={busy}
          onClick={() => onRerun({ ai: !aiIncluded })}
        >
          {aiIncluded ? "Run again without it" : "Run again with it"}
          <span className="a11y-settings-cost"> — takes another scan</span>
        </button>
      </div>

      <div className="a11y-settings-row">
        <span className="a11y-settings-label">Scope</span>
        <span className="a11y-settings-state">
          {scope === "site" ? "Whole site" : "This page"}
        </span>
        <button
          type="button"
          className="a11y-settings-rerun"
          disabled={busy}
          onClick={() => onRerun({ scope: scope === "site" ? "page" : "site" })}
        >
          {scope === "site" ? "Scan this page only" : "Scan the whole site"}
          <span className="a11y-settings-cost">
            {scope === "site" ? " — takes another scan" : " — takes a few minutes"}
          </span>
        </button>
      </div>
    </section>
  );
}
