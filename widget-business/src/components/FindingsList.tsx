import type { AccessibilityFinding } from "../api/scanClient";
import { FindingGroup } from "./FindingGroup";

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
  if (findings.length === 0) {
    return <p className="a11y-empty">Nothing found here.</p>;
  }

  const grouped = groupFindings(findings);

  return (
    <ul className="a11y-findings-list">
      {grouped.map((group) => (
        <FindingGroup key={group[0].id} findings={group} asNotes={asNotes} />
      ))}
    </ul>
  );
}
