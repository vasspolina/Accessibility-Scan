import { useState } from "react";
import type { AccessibilityFinding } from "../api/scanClient";
import { FindingGroup, FindingDetails } from "./FindingGroup";
import { groupFindings } from "./FindingsList";
import { useReportView } from "./ReportViewContext";
import { plainForRule } from "../lib/wcagPlain";

/**
 * The notes, in the design's own shape: a yellow band carrying the heading
 * and the lead, then a black panel holding the note titles and one open
 * note beneath them.
 *
 * This does NOT go through DataTable, and that is the point. A note has no
 * severity, no WCAG criterion and no level — three of the table's six
 * columns are empty for every row. Rendering it as a table produced exactly
 * that: a header cell over a column of nothing, an empty first column half
 * the width of the report, and the note titles pushed to the right of it.
 * A table with one meaningful column is a list.
 */

/**
 * The label on the pill. There is no field for this on the finding — the
 * kit's `criterion` ("Layout", "Target size", "Typography") has no
 * counterpart in what the backend sends — so it is derived from the rule,
 * and derived visibly rather than pretending to be data. Anything that
 * doesn't match falls back to "Design", which is true of every note here.
 */
function noteKind(f: AccessibilityFinding): string {
  const s = `${f.ruleId ?? ""} ${f.title ?? ""} ${f.description}`.toLowerCase();
  if (
    /line-height|leading|letter|spacing|capital|uppercase|typeface|font|text size|body text|very small|too small|legib/.test(
      s
    )
  )
    return "Type";
  if (/target|tap|touch|pinned|bar|viewport|phone|layout|crowd|fold/.test(s)) return "Layout";
  if (/colour|color|contrast/.test(s)) return "Colour";
  return "Design";
}

function noteTitle(group: AccessibilityFinding[]): string {
  const rep = group[0];
  return plainForRule(rep.ruleId)?.plain ?? rep.title ?? rep.description;
}

export function DesignNotesPanel({ findings }: { findings: AccessibilityFinding[] }) {
  const { professional } = useReportView();
  const groups = groupFindings(findings);
  // Keyed by the note's own id, not its position. A filter changes what is
  // at index 0, so an index would have quietly re-pointed at a different
  // note the moment a pill was pressed.
  const [openId, setOpenId] = useState<string | null>(() => findings[0]?.id ?? null);
  const [kind, setKind] = useState<string | null>(null);

  if (groups.length === 0) return null;

  // One pill per distinct kind, in the order the notes appear.
  const kinds = [...new Set(groups.map((g) => noteKind(g[0])))];
  const visible = kind ? groups.filter((g) => noteKind(g[0]) === kind) : groups;

  // The open note is whichever visible one carries the open id. Filtering to
  // a kind the open note is not in closes it rather than leaving a detail
  // card under a list that no longer contains its title.
  const open = visible.find((g) => g[0].id === openId) ?? null;

  return (
    <section className="a11y-section a11y-dn" aria-labelledby="a11y-notes-heading">
      <div className="a11y-dn-band">
        {/* Decorative repeat of the heading below it — the design's own
            device. A screen reader would otherwise hear the same four words
            twice before the lead. */}
        <p className="a11y-dn-band-eyebrow" aria-hidden="true">
          Notes on the design
        </p>

        <div className="a11y-dn-card">
          <h2
            className="a11y-dn-title"
            id="a11y-notes-heading"
            data-nav-label="Notes on the design"
          >
            Notes on the design{" "}
            <span className="a11y-dn-count">({groups.length})</span>
          </h2>
          <div className="a11y-dn-lead">
            <p>Remarks rather than faults, and none of it counts towards the score.</p>
            <p>
              Every one is judgement rather than measurement, with no rule underneath to
              point at. Mostly type that works against the reader, and it still costs you
              readers.
            </p>
          </div>
        </div>
      </div>

      {/* Professional mode gets the notes as cards only — the black panel is
          the business reading of them, and the pro screen already lists every
          finding once. */}
      {!professional && (
        <div className="a11y-dn-panel">
          <p className="a11y-dn-panel-eyebrow">The notes</p>

          {/* Toggles, not labels. Pressing one narrows the list to that
              kind; pressing it again clears it, so there is no separate
              "All" pill to keep in step with the others. */}
          <ul className="a11y-dn-kinds" aria-label="Filter notes by kind">
            {kinds.map((k) => (
              <li key={k}>
                <button
                  type="button"
                  className="a11y-dn-kind"
                  aria-pressed={kind === k}
                  onClick={() => setKind(kind === k ? null : k)}
                >
                  {k}
                </button>
              </li>
            ))}
          </ul>

          {/* Says what the filter did. Without it the only feedback is a
              list getting shorter, which a screen reader never sees. */}
          <p className="a11y-dn-status" role="status">
            {kind
              ? `Showing ${visible.length} of ${groups.length} notes: ${kind}.`
              : `Showing all ${groups.length} notes.`}
          </p>

          <ul className="a11y-dn-list">
            {visible.map((group) => (
              <li key={group[0].id}>
                <button
                  type="button"
                  className="a11y-dn-link"
                  id={`a11y-dn-note-${group[0].id}`}
                  aria-expanded={open?.[0].id === group[0].id}
                  aria-controls="a11y-dn-detail"
                  onClick={() =>
                    setOpenId(open?.[0].id === group[0].id ? null : group[0].id)
                  }
                >
                  {/* The design's bullet. It is a mark, not a close button,
                      so it never reaches the accessible name. */}
                  <span className="a11y-dn-mark" aria-hidden="true">
                    &times;
                  </span>
                  <span className="a11y-dn-link-text">{noteTitle(group)}</span>
                </button>
              </li>
            ))}
          </ul>

          {open && (
            <div
              className="a11y-dn-detail"
              id="a11y-dn-detail"
              role="region"
              aria-labelledby={`a11y-dn-note-${open[0].id}`}
            >
              <div className="a11y-dn-detail-head">
                <h3 className="a11y-dn-detail-title">{noteTitle(open)}</h3>
                <p className="a11y-dn-pills">
                  <span className="a11y-dn-pill a11y-dn-pill-kind">{noteKind(open[0])}</span>
                  <span className="a11y-dn-pill a11y-dn-pill-note">Note</span>
                </p>
              </div>
              <FindingDetails findings={open} asNotes />
            </div>
          )}
        </div>
      )}

      {/* Print keeps every note, open or not — the panel above shows one at a
          time, and a printed report that omits the other five is not the
          report. Same arrangement FindingsList uses. */}
      <ul className="a11y-findings-list a11y-print-cards">
        {groups.map((group) => (
          <FindingGroup key={group[0].id} findings={group} asNotes />
        ))}
      </ul>
    </section>
  );
}
