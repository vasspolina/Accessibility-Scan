import type { AccessibilityFinding } from "../api/scanClient";
import { FindingsList } from "./FindingsList";

export function ReportSection({
  title,
  description,
  variant,
  findings,
  asNotes = false,
}: {
  title: string;
  description: string;
  variant: "default" | "redflag";
  findings: AccessibilityFinding[];
  // Renders the section as remarks on the design rather than as a defect
  // list. These findings have never counted towards the score, but they were
  // shown with the same "Fix first / Fix soon" ranking as the ones that do,
  // which is a strong enough signal to override the sentence saying so.
  asNotes?: boolean;
}) {
  return (
    <section className={`a11y-section a11y-section-${variant}`}>
      <h2 className="a11y-section-title">
        {title} <span className="a11y-section-count">({findings.length})</span>
      </h2>
      <p className="a11y-section-desc">{description}</p>
      <FindingsList findings={findings} asNotes={asNotes} />
    </section>
  );
}
