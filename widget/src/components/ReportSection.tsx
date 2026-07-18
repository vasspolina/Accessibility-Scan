import type { AccessibilityFinding } from "../api/scanClient";
import { FindingsList } from "./FindingsList";

export function ReportSection({
  title,
  description,
  variant,
  findings,
}: {
  title: string;
  description: string;
  variant: "default" | "redflag";
  findings: AccessibilityFinding[];
}) {
  return (
    <section className={`a11y-section a11y-section-${variant}`}>
      <h3 className="a11y-section-title">
        {title} <span className="a11y-section-count">({findings.length})</span>
      </h3>
      <p className="a11y-section-desc">{description}</p>
      <FindingsList findings={findings} />
    </section>
  );
}
