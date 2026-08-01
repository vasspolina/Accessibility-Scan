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
 * The professional findings view, barebones: a native table the browser
 * styles itself, one row per grouped issue, a native details element in
 * the issue cell for the hand-off (fix, selector, markup, technique
 * link). The imported Tabs and DataTable went with the design strip; the
 * "No issues found" list keeps its name — a scan evidences failures,
 * never conformance.
 *
 * Screen-only. Print renders the full plain-language cards instead (see
 * App): native details cannot be forced open from CSS either.
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

  const clean = (conformance?.criteria ?? []).filter((c) => c.status === "no-issues-found");

  return (
    <section className="a11y-section a11y-pro-table" aria-label="Findings">
      <h2>Issues ({grouped.length})</h2>
      {grouped.length === 0 ? (
        <p className="a11y-empty">Nothing found here.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">Severity</th>
              <th scope="col">Issue</th>
              <th scope="col">Criterion</th>
              <th scope="col">Instances</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((group) => {
              const rep = group[0];
              const plain = plainForRule(rep.ruleId);
              const title = plain?.plain ?? rep.title ?? rep.description;
              return (
                <tr key={rep.id}>
                  <td>{severityWord[rep.severity]}</td>
                  <td>
                    {title}
                    {rep.ruleId && (
                      <>
                        {" "}
                        <code>{rep.ruleId}</code>
                      </>
                    )}
                    <details>
                      <summary>Details</summary>
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
                        <pre tabIndex={0} role="group" aria-label="Element markup">
                          <code>{rep.elementSnippet}</code>
                        </pre>
                      )}
                      {rep.helpUrl && (
                        <p>
                          <a href={rep.helpUrl} target="_blank" rel="noopener noreferrer">
                            Fix technique ↗
                          </a>
                        </p>
                      )}
                    </details>
                  </td>
                  <td>{criterionLine(rep)}</td>
                  <td>{group.length} ×</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <h2>No issues found ({clean.length})</h2>
      {clean.length === 0 ? (
        <p className="a11y-empty">Every checked criterion has at least one finding or open question.</p>
      ) : (
        <ul className="a11y-clean-list">
          {clean.map((c) => (
            <li key={c.id}>
              {c.id} {c.name} ({c.level})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
