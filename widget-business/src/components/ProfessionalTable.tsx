import { DataTable, Tabs } from "@verify/design-system";
import type { AccessibilityFinding, ConformanceSummary } from "../api/scanClient";
import { plainForRule } from "../lib/wcagPlain";
import { enClauseFor } from "../lib/audienceMode";
import { groupFindings } from "./FindingsList";
import { useReportView } from "./ReportViewContext";

const severityWord: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Worth fixing",
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
}: {
  findings: AccessibilityFinding[];
  conformance?: ConformanceSummary;
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
        <span key="sev" className={`a11y-severity-${rep.severity}`}>
          <span className="a11y-severity-badge">{severityWord[rep.severity]}</span>
        </span>,
        <span key="title">
          {title}
          {rep.ruleId && (
            <>
              {" "}
              <code className="a11y-rule-chip">{rep.ruleId}</code>
            </>
          )}
        </span>,
        criterionLine(rep),
        `${group.length} ×`,
      ],
      expand: (
        <div className="a11y-table-detail">
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
                Fix technique ↗
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
           the 16px spacing between them. Severity and Instances shrink to
           fit (1% + nowrap in the stylesheet), the issue statement takes
           the room that remains — it is the row's point — and the
           criterion holds a fixed 24% metadata share — measured so the issue
           column stays the widest text column at every panel width. */
        headers={[
          { key: "severity", label: "Severity", width: "1%" },
          { key: "issue", label: "Issue" },
          { key: "criterion", label: "Criterion", width: "24%" },
          { key: "count", label: "Instances", align: "right", width: "1%" },
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
    <section className="a11y-section a11y-pro-table" aria-label="Findings">
      <Tabs
        items={[
          { id: "issues", label: `Issues (${grouped.length})`, panel: issuesTable },
          { id: "clean", label: `No issues found (${clean.length})`, panel: cleanList },
        ]}
      />
    </section>
  );
}
