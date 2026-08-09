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
    return <p className="a11y-empty">Nothing found here.</p>;
  }

  const grouped = groupFindings(findings);
  // Only a fraction of findings carry a WCAG level at all — best-practice
  // rules (no numbered criterion) never do. A column that's blank in every
  // row is worse than no column, so it's dropped for the whole table
  // rather than left in place empty.
  const showLevel = grouped.some((group) => Boolean(group[0].wcagLevel));
  // Same rule for Instances: it only ever shows a number once a rule fires
  // more than once, so a table where every group is singular (dark-pattern
  // findings almost always are) would otherwise print a header over a
  // column of nothing.
  const showCount = grouped.some((group) => group.length > 1);

  return (
    <>
      {/* The live, on-screen view. Professional mode skips it — its own
          screen is ProfessionalTable, and this would just be the same
          findings a second time; there, the cards below are this section's
          only rendering, kept for print (see FindingGroup's own comment). */}
      {!professional && (
        // The notes shape carries its own class because the table's column
        // rules are position-based: nth-child(2) is Severity in the full
        // shape and the note's own text in this one. Without the marker the
        // phone-width rule that drops Severity dropped every note.
        <div
          className={`a11y-findings-table${asNotes ? " a11y-notes-table" : ""}`}
          onClick={expandRowOnClick}
        >
          <DataTable
            caption={asNotes ? "Notes on the design" : "Findings, most severe first"}
            headers={
              asNotes
                ? [
                    { key: "issue", label: "Note" },
                    ...(showCount
                      ? [{ key: "count", label: "Instances", align: "right" as const }]
                      : []),
                  ]
                : [
                    // Hidden at phone width by CSS (see .a11y-finding-sev-col)
                    // — Severity folds into the Issue cell there instead.
                    { key: "severity", label: "Severity" },
                    { key: "issue", label: "Issue" },
                    { key: "wcag", label: "WCAG" },
                    { key: "fix", label: "Who fixes this" },
                    ...(showLevel ? [{ key: "level", label: "Level" }] : []),
                    ...(showCount
                      ? [{ key: "count", label: "Instances", align: "right" as const }]
                      : []),
                  ]
            }
            rows={grouped.map((group) => findingRow(group, { asNotes, showLevel, showCount }))}
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
