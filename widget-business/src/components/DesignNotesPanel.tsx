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
  // Keyed by the note's own id, not its position, so a re-render that
  // reorders the notes keeps the same one open.
  const [openId, setOpenId] = useState<string | null>(() => findings[0]?.id ?? null);

  if (groups.length === 0) return null;

  // One row of tabs, every note in it (user's choice, 22 Nov 2026, of two
  // sketches for "there are two types of tabs"). The kind used to be a row
  // of filter pills over the tabs: two controls that both looked like tabs,
  // and with four to six notes a filter left one or two of them. The kind
  // is now a label inside each tab, so it is still read, and there is one
  // thing to press. The open note is always one of them.
  const visible = groups;
  const open = visible.find((g) => g[0].id === openId) ?? visible[0] ?? null;

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
        {t("A designer's view, not rule failures. They don't count towards the score.")}
      </p>

      {/* Professional mode gets the notes as cards only — the black panel is
          the business reading of them, and the pro screen already lists every
          finding once. */}
      {!professional && (
        <div className="a11y-dn-panel">
          {/* Tabs (user's instruction, 22 Nov 2026, "design this into
              tabs"). One note shows at a time under its title, which is
              what a tab set is, so it now says so: a tablist of the titles
              and the open note as its tabpanel, in place of a list of
              expand buttons that never collapsed. Roving tabindex: one tab
              in the Tab order, the arrow keys (either axis, wrapping) and
              Home/End move and open together, Tab goes on into the note.
              A tab opens, never closes: the panel always shows one note. */}
          <div className="a11y-dn-list" role="tablist" aria-label={t("Notes on the design")}>
            {visible.map((group, i) => {
              const selected = open?.[0].id === group[0].id;
              return (
                <button
                  key={group[0].id}
                  type="button"
                  role="tab"
                  className="a11y-dn-link"
                  id={`a11y-dn-note-${group[0].id}`}
                  aria-selected={selected}
                  aria-controls="a11y-dn-detail"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setOpenId(group[0].id)}
                  onKeyDown={(e) => {
                    const last = visible.length - 1;
                    const to =
                      e.key === "ArrowRight" || e.key === "ArrowDown"
                        ? (i + 1) % visible.length
                        : e.key === "ArrowLeft" || e.key === "ArrowUp"
                          ? (i + last) % visible.length
                          : e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? last
                              : -1;
                    if (to < 0) return;
                    e.preventDefault();
                    const id = visible[to][0].id;
                    setOpenId(id);
                    (e.currentTarget.parentElement?.querySelector(
                      `#a11y-dn-note-${CSS.escape(id)}`
                    ) as HTMLButtonElement | null)?.focus();
                  }}
                >
                  {/* The title alone (user's instruction, 24 Nov 2026, "no
                      need for badges, just titles"): no Type, Layout or
                      Design badge over it. */}
                  <span className="a11y-dn-link-text">{noteTitle(group)}</span>
                </button>
              );
            })}
          </div>

          {open && (
            <div
              className="a11y-dn-detail"
              id="a11y-dn-detail"
              role="tabpanel"
              tabIndex={0}
              aria-labelledby={`a11y-dn-note-${open[0].id}`}
            >
              <div className="a11y-dn-detail-head">
                {/* No kind tag under the title. The title itself is the
                    open note's tab, straight above:
                    printed again here it read twice in a row (user's
                    instruction, 18 Nov 2026, "check for content
                    repetition"). Kept for screen readers' heading list. */}
                <h3 className="a11y-dn-detail-title a11y-sr-only">{noteTitle(open)}</h3>
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
