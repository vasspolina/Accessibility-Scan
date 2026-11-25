import { useState } from "react";
import { t } from "../lib/strings";
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

function noteTitle(group: AccessibilityFinding[]): string {
  const rep = group[0];
  return plainForRule(rep.ruleId)?.plain ?? rep.title ?? rep.description;
}

export function DesignNotesPanel({ findings }: { findings: AccessibilityFinding[] }) {
  const { professional } = useReportView();
  const groups = groupFindings(findings);
  // The open notes, keyed by each note's own id, not its position, so a
  // re-render that reorders the notes keeps the same ones open. All start
  // shut; each opens and shuts on its own.
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (groups.length === 0) return null;

  return (
    <section className="a11y-section a11y-dn" aria-labelledby="a11y-notes-heading">
      {/* The same anatomy as every other section: title, lead, content.
          The kit's yellow band with its decorative repeat of the heading
          came along in the port and outlived the direction that once
          justified it — one heading, said once, on the report's own paper. */}
      <h2
        className="a11y-section-title"
        id="a11y-notes-heading"
        data-nav-label={t("Notes on the design")}
      >
        {t("Notes on the design")}{" "}
        <span className="a11y-section-count a11y-count-dot">{groups.length}</span>
      </h2>
      {/* The lead used to be three clipped thoughts with no throughline —
          "remarks rather than faults", "judgement rather than measurement" —
          which read as random to the person it was written for. Now it says
          what the section is, then why it matters, and it is translated,
          which the old lead never was. */}
      <p className="a11y-section-desc">
        {t("A designer's view, not rule failures.")}
      </p>

      {/* Professional mode gets the notes as cards only — the black panel is
          the business reading of them, and the pro screen already lists every
          finding once. */}
      {!professional && (
        <div className="a11y-dn-panel">
          {/* Carets (user's instruction, 24 Nov 2026, "make these into
              carrets like this", after the tabs of 22 Nov and the awning
              list): each note is a bar with the caret and its title, a
              button that opens the note in place, under its title, inside
              the same rounded ground. Each opens and shuts on its own, so
              two notes can be read side by side; nothing opens by itself. */}
          <ul className="a11y-dn-carets" role="list">
            {groups.map((group) => {
              const id = group[0].id;
              const open = openIds.has(id);
              return (
                <li key={id} className="a11y-dn-caret" data-open={open ? "true" : undefined}>
                  <h3 className="a11y-dn-caret-head">
                    <button
                      type="button"
                      className="a11y-dn-bar"
                      id={`a11y-dn-note-${id}`}
                      aria-expanded={open}
                      aria-controls={`a11y-dn-detail-${id}`}
                      onClick={() => toggle(id)}
                    >
                      <span className="a11y-dn-bar-title">{noteTitle(group)}</span>
                    </button>
                  </h3>
                  <div
                    className="a11y-dn-detail"
                    id={`a11y-dn-detail-${id}`}
                    role="region"
                    aria-labelledby={`a11y-dn-note-${id}`}
                    hidden={!open}
                  >
                    {open && <FindingDetails findings={group} asNotes />}
                  </div>
                </li>
              );
            })}
          </ul>
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
