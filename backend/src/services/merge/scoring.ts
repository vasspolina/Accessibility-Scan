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

// Where the linear scale runs out and the curve takes over. Below this the
// score is exactly 100 minus the penalty, as it has always been.
const LINEAR_FLOOR = 10;
const LINEAR_LIMIT = 100 - LINEAR_FLOOR;

/**
 * Turns the severity summary into a score out of 100.
 *
 * The penalty is linear up to LINEAR_LIMIT and then decays, and that second
 * part exists for a reason worth stating: the caps sum to 200 while only 100
 * of it could ever show, so every site past 100 penalty scored exactly 0 and
 * stayed there.
 *
 * Measured on a real page: 7 critical, 10 serious, 11 moderate is a penalty of
 * 142. Fixing half the serious findings — real work, a real improvement for
 * real visitors — moved the penalty to 117 and the score not at all. Nothing
 * below the top of the pile could ever show progress, which makes the score
 * useless exactly where someone most needs encouragement, and quietly
 * contradicts the re-scan history sitting underneath it saying five problems
 * are gone.
 *
 * The curve is continuous at the join (both give 10 there) and strictly
 * decreasing after it, so a fix always raises the number by at least a little.
 * Nothing below that point changes: every score in the 10-100 range is exactly
 * what it was before, so this does not re-baseline anyone's history.
 */
export function computeScore(summary: SeveritySummary): number {
  let penalty = 0;
  for (const severity of Object.keys(WEIGHTS) as Severity[]) {
    const raw = summary[severity] * WEIGHTS[severity];
    penalty += Math.min(raw, CAPS[severity]);
  }

  if (penalty <= LINEAR_LIMIT) return 100 - penalty;

  // Hyperbolic decay: approaches zero without reaching it while the page still
  // has any penalty at all. A page in this range is in serious trouble and the
  // single digit says so; what matters is that the digit still moves.
  return Math.max(0, Math.round((LINEAR_FLOOR * LINEAR_LIMIT) / penalty));
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
