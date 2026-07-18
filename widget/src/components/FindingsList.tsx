import type { AccessibilityFinding } from "../api/scanClient";
import { FindingCard } from "./FindingCard";

const severityOrder: AccessibilityFinding["severity"][] = ["critical", "serious", "moderate", "minor"];

export function FindingsList({ findings }: { findings: AccessibilityFinding[] }) {
  if (findings.length === 0) {
    return <p className="a11y-empty">No issues found. Nice work!</p>;
  }

  const sorted = [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );

  return (
    <ul className="a11y-findings-list">
      {sorted.map((finding) => (
        <FindingCard key={finding.id} finding={finding} />
      ))}
    </ul>
  );
}
