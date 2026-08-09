import type { ProView } from "./ProSummary";
import { expandRowOnClick } from "../lib/rowExpand";
import type { AccessibilityFinding, ConformanceSummary } from "../api/scanClient";
import { plainForRule } from "../lib/wcagPlain";
import { enClauseFor } from "../lib/audienceMode";
import { groupFindings } from "./FindingsList";
import { useReportView } from "./ReportViewContext";
import { SeverityTag } from "./SeverityTag";
import { DataTable } from "./DataTable";

const severityWord: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
};

/**
 * The design system's composed dashboard, for the professional audience:
 * Issues and no-issues-found criteria as tabs, the issues as the kit's
 * dense DataTable with one expandable detail row at a time. Imported
 * components, our data and vocabulary — the severity chips keep the
 * report's words, and the second tab is "No issues found", not "Passes":
 * a scan evidences failures, never conformance.
 *
 * Screen-only. Print renders the full plain-language cards instead (see
 * App), because a printed report has to stand alone and the table's
 * expand state cannot be forced open from CSS.
 */
export function ProfessionalTable({
  findings,
  conformance,
  view,
}: {
  findings: AccessibilityFinding[];
  conformance?: ConformanceSummary;
  /* Which region shows — the tabs above (in ProSummary) drive it. */
  view: ProView;
}) {
  const { criterionNames } = useReportView();
  const grouped = groupFindings(findings);

  const criterionLine = (rep: AccessibilityFinding): string => {
    const num = rep.wcagCriterion?.match(/^(\d\.\d+\.\d+)/)?.[1];
    if (!num) return "—";
    const known = criterionNames[num];
    const name = known ? `${num} ${known.name} (${known.level})` : (rep.wcagCriterion ?? num);
    const en = enClauseFor(rep.wcagCriterion, rep.wcagLevel);
    return en ? `${name} · ${en}` : name;
  };

  const rows = grouped.map((group) => {
    const rep = group[0];
    const plain = plainForRule(rep.ruleId);
    const title = plain?.plain ?? rep.title ?? rep.description;
    return {
      id: rep.id,
      cells: [
        // Severity folds above the title instead of holding its own
        // column — same fix as the business-mode findings table: the
        // badge, the rule-id chip, and the issue text together already
        // ran past a phone's width with Severity as a separate column,
        // forcing horizontal scroll before a reader reached the row.
        <span key="title" className="a11y-pro-title-cell">
          <SeverityTag severity={rep.severity} label={severityWord[rep.severity]} />
          <span>
            {title}
            {rep.ruleId && (
              <>
                {" "}
                <code className="a11y-rule-chip">{rep.ruleId}</code>
              </>
            )}
          </span>
        </span>,
        criterionLine(rep),
        `${group.length} ×`,
      ],
      expand: (
        <div className="a11y-table-detail">
          {/* Criterion is dropped from the row at narrow widths (see the
              @container rule in styles.css) — it stays reachable here so
              hiding the column there doesn't lose the information, only
              its own dedicated column. */}
          <p className="a11y-pro-detail-criterion">
            <strong>Criterion:</strong> {criterionLine(rep)}
          </p>
          <p>{rep.description}</p>
          {rep.suggestedFix && (
            <p>
              <strong>Fix:</strong> {rep.suggestedFix}
            </p>
          )}
          <p>
            <strong>Selector:</strong> <code>{rep.selector}</code>
          </p>
          {rep.elementSnippet && (
            <pre className="a11y-pro-snippet" tabIndex={0} role="group" aria-label="Element markup">
              <code>{rep.elementSnippet}</code>
            </pre>
          )}
          {rep.helpUrl && (
            <p>
              <a className="a11y-learn-more" href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                Fix technique <span aria-hidden="true">↗</span>
              </a>
            </p>
          )}
        </div>
      ),
    };
  });

  const clean = (conformance?.criteria ?? []).filter((c) => c.status === "no-issues-found");

  const issuesTable =
    rows.length === 0 ? (
      <p className="a11y-empty">Nothing found here.</p>
    ) : (
      <DataTable
        /* Carbon's width rule: columns size to their content and only need
           the 16px spacing between them. Instances shrinks to fit (1% +
           nowrap in the stylesheet), the issue statement takes the room
           that remains — it is the row's point, and now carries Severity
           folded above it rather than in a column of its own — and the
           criterion holds a fixed 24% metadata share — measured so the
           issue column stays the widest text column at every panel width. */
        headers={[
          { key: "issue", label: "Issue" },
          { key: "criterion", label: "Criterion" },
          { key: "count", label: "Instances", align: "right" },
        ]}
        rows={rows}
      />
    );

  const cleanList =
    clean.length === 0 ? (
      <p className="a11y-empty">Every checked criterion has at least one finding or open question.</p>
    ) : (
      <ul className="a11y-clean-list">
        {clean.map((c) => (
          <li key={c.id}>
            {c.id} {c.name} <span className="a11y-clean-level">({c.level})</span>
          </li>
        ))}
      </ul>
    );

  return (
    <section
      id="a11y-pro-findings"
      className="a11y-section a11y-pro-table"
      aria-label="Findings"
      data-nav-label="Findings"
      onClick={expandRowOnClick}
    >
      {view === "issues" ? issuesTable : cleanList}
    </section>
  );
}
