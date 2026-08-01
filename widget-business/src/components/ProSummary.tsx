import type { AccessibilityReport } from "../api/scanClient";
import { SCORE_CAVEAT } from "./ScoreGauge";

const severityRows = [
  ["critical", "Fix first"],
  ["serious", "Fix soon"],
  ["moderate", "Worth fixing"],
  ["minor", "Minor polish"],
] as const;

/**
 * The professional report head, barebones: the score as a sentence, the
 * target standard stated as a target, the severity counts as a plain
 * definition list, and the caveat both audiences share. The former
 * imported-component composition (dial, cards, tags) went with the design
 * strip; the facts and their order stayed.
 */
export function ProSummary({ report }: { report: AccessibilityReport }) {
  const total = report.summary.total;
  return (
    <>
      <p className="a11y-score-line">
        <strong>Accessibility score: {report.score} out of 100.</strong>{" "}
        Checked against WCAG 2.1 AA. {total} {total === 1 ? "issue" : "issues"} on 1 page.
      </p>
      <dl className="a11y-score-breakdown">
        {severityRows.map(([key, word]) => (
          <div key={key} className={`a11y-severity-${key}`}>
            <dt>{word}</dt>
            <dd>{report.summary[key]}</dd>
          </div>
        ))}
      </dl>
      <p className="a11y-score-caveat">{SCORE_CAVEAT}</p>
    </>
  );
}
