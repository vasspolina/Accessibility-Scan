import type { AccessibilityFinding, CategorySummary, Severity, SeveritySummary } from "../../types/report.js";

const WEIGHTS: Record<Severity, number> = { critical: 10, serious: 5, moderate: 2, minor: 1 };
// Per-severity penalty caps prevent a large pile of low-severity findings
// (e.g. 40 minor issues) from outscoring a page with a handful of critical
// ones — each bucket's contribution saturates before summing.
const CAPS: Record<Severity, number> = { critical: 100, serious: 50, moderate: 30, minor: 20 };

// Score/summary only ever consider category:"accessibility" findings — see
// types/report.ts for why design-clarity and dark-pattern findings are kept
// out of the accessibility score.
export function summarizeSeverity(findings: AccessibilityFinding[]): SeveritySummary {
  const accessibilityFindings = findings.filter((f) => f.category === "accessibility");
  const summary: SeveritySummary = {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: accessibilityFindings.length,
  };
  for (const f of accessibilityFindings) summary[f.severity] += 1;
  return summary;
}

export function computeScore(summary: SeveritySummary): number {
  let penalty = 0;
  for (const severity of Object.keys(WEIGHTS) as Severity[]) {
    const raw = summary[severity] * WEIGHTS[severity];
    penalty += Math.min(raw, CAPS[severity]);
  }
  return Math.max(0, 100 - Math.min(100, penalty));
}

export function summarizeCategories(findings: AccessibilityFinding[]): CategorySummary {
  const summary: CategorySummary = { accessibility: 0, designClarity: 0, darkPattern: 0 };
  for (const f of findings) {
    if (f.category === "accessibility") summary.accessibility += 1;
    else if (f.category === "design-clarity") summary.designClarity += 1;
    else summary.darkPattern += 1;
  }
  return summary;
}
