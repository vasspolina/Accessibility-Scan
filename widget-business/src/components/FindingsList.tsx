import { t } from "../lib/strings";
import type { AccessibilityFinding } from "../api/scanClient";
import { FindingGroup, findingRow } from "./FindingGroup";
import { useReportView } from "./ReportViewContext";
import { expandRowOnClick } from "../lib/rowExpand";
import { DataTable } from "./DataTable";

const severityRank: Record<AccessibilityFinding["severity"], number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

// Groups findings of the same issue together so a rule that fires on 30
// elements shows as one titled entry, not 30 near-identical cards. Grouping
// key is the rule id (every deterministic finding has one); AI findings with
// no rule id fall back to their description, so genuinely distinct AI issues
// still stand alone.
/** The one grouping the report uses everywhere — cards and the
 * professional table must agree on what "one issue" means, so the logic
 * lives once. Returns groups sorted most-severe-first, each group sorted
 * the same way so [0] is the representative. */
export function groupFindings(findings: AccessibilityFinding[]): AccessibilityFinding[][] {
  const groups = new Map<string, AccessibilityFinding[]>();
  for (const finding of findings) {
    const key = finding.ruleId ?? finding.description;
    const bucket = groups.get(key) ?? [];
    bucket.push(finding);
    groups.set(key, bucket);
  }

  const grouped = [...groups.values()].map((g) =>
    [...g].sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
  );
  // Most severe groups first; ties broken by how widespread the issue is.
  grouped.sort((a, b) => {
    const bySeverity = severityRank[a[0].severity] - severityRank[b[0].severity];
    return bySeverity !== 0 ? bySeverity : b.length - a.length;
  });
  return grouped;
}

export function FindingsList({
  findings,
  asNotes = false,
}: {
  findings: AccessibilityFinding[];
  asNotes?: boolean;
}) {
  const { professional } = useReportView();

  if (findings.length === 0) {
    return <p className="a11y-empty">{t("Nothing found here.")}</p>;
  }

  const grouped = groupFindings(findings);
  // A column with nothing in it, in this table, is dropped header and all
  // (user's instruction, 18 Nov 2026: "if there is no items under raw, then
  // do not show table header either"). This replaces the report-wide
  // decision of 17 Nov, which kept Level and Instances in every section's
  // table so they lined up, and left a header over an empty column in a
  // section where no finding had one. Every column is built, then any whose
  // cells are all blank goes: WCAG for best-practice rules, Level, Instances.
  const fullHeaders = asNotes
    ? [
        { key: "issue", label: t("Note") },
        { key: "count", label: t("Instances"), align: "right" as const },
      ]
    : [
        // Two columns, set as a list of questions (user's instruction,
        // 24 Nov 2026): the issue, and its severity as a coloured word at
        // the end of the row. WCAG, Level, Fix and Instances are the first
        // line of the opened finding (findingRow's comment). The severity
        // badge that sat over the title (23 Nov 2026) is this word now.
        { key: "issue", label: t("Issue") },
        { key: "severity", label: t("Severity") },
      ];
  const fullRows = grouped.map((group) => findingRow(group, { asNotes, showCount: true }));
  const blank = (cell: unknown) => cell === "" || cell === null || cell === undefined || cell === false;
  const keep = fullHeaders.map((_, i) => fullRows.some((row) => !blank(row.cells[i])));
  const headers = fullHeaders.filter((_, i) => keep[i]);
  const rows = fullRows.map((row) => ({ ...row, cells: row.cells.filter((_, i) => keep[i]) }));

  return (
    <>
      {/* The live, on-screen view. Professional mode skips it — its own
          screen is ProfessionalTable, and this would just be the same
          findings a second time; there, the cards below are this section's
          only rendering, kept for print (see FindingGroup's own comment). */}
      {!professional && (
        // The notes shape carries its own class because the table's column
        // rules were position-based: nth-child(2) was Severity in the full
        // shape and the note's own text in this one. Without the marker a
        // phone-width rule that dropped Severity dropped every note.
        <div
          className={`a11y-findings-table${asNotes ? " a11y-notes-table" : ""}`}
          onClick={expandRowOnClick}
        >
          <DataTable
            schedule
            caption={asNotes ? t("Notes on the design") : t("Findings, most severe first")}
            headers={headers}
            rows={rows}
          />
        </div>
      )}
      {/* The printed report's own copy, always in the DOM, hidden on screen —
          see FindingGroup's comment for why a table's expand state can't
          stand in for it. */}
      <ul className="a11y-findings-list a11y-print-cards">
        {grouped.map((group) => (
          <FindingGroup key={group[0].id} findings={group} asNotes={asNotes} />
        ))}
      </ul>
    </>
  );
}
