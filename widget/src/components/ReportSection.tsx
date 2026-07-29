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
      {/* h2, not h3: the widget renders no h1 of its own (the host page owns
          that), so its top-level sections sit at h2 and nothing skips. */}
      <h2 className="a11y-section-title">
        {title} <span className="a11y-section-count">({findings.length})</span>
      </h2>
      <p className="a11y-section-desc">{description}</p>
      <FindingsList findings={findings} />
    </section>
  );
}
