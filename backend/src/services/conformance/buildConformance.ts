import type { AccessibilityFinding } from "../../types/report.js";
import {
  WCAG_21_AA_CRITERIA,
  normalizeCriterionId,
  type CriterionCoverage,
  type CriterionLevel,
} from "./wcagCriteria.js";
import { criterionText, type ReportLang } from "./criteriaText.js";

// Builds the conformance view: WCAG 2.1 A/AA criterion by criterion, which is
// the standard EN 301 549 points at and therefore what the European
// Accessibility Act effectively requires of web content.
//
// The one rule this module exists to enforce: a scan can prove a FAILURE, it
// can never prove a PASS. So there is no "pass" status. A criterion we tested
// and found nothing against is "no-issues-found", which is a statement about
// our evidence, not about the site. Tools that print a green tick here are
// overclaiming, and it is the main reason automated accessibility reports are
// distrusted by practitioners.

export type CriterionStatus =
  // At least one finding maps to this criterion.
  | "failed"
  // We can test this and found nothing — not a guarantee of conformance.
  | "no-issues-found"
  // We cannot meaningfully test this without a human.
  | "needs-review";

export interface CriterionResult {
  id: string;
  name: string;
  level: CriterionLevel;
  coverage: CriterionCoverage;
  plain: string;
  failing: string;
  status: CriterionStatus;
  findingCount: number;
}

export interface ConformanceSummary {
  standard: string;
  failed: number;
  noIssuesFound: number;
  needsReview: number;
  total: number;
  // Failures broken out by level, because AA conformance requires meeting
  // every A criterion as well — a single Level A failure sinks the whole
  // claim, and owners consistently misread a low overall count as "nearly
  // there".
  failedByLevel: { A: number; AA: number };
  criteria: CriterionResult[];
}

/**
 * Pure and deterministic. Only category:"accessibility" findings count —
 * design-clarity and dark-pattern findings are deliberately outside WCAG and
 * must not appear as conformance failures.
 */
export function buildConformance(
  findings: AccessibilityFinding[],
  opts?: {
    // False when the AI review did not run (disabled, failed, or the crawl's
    // default). Criteria whose only coverage is an AI prompt item then have
    // no evidence at all, and their empty rows must read needs-review, not
    // no-issues-found — a claim of evidence that was never gathered.
    aiRan?: boolean;
    // The report's language. Only the plain question and the failing
    // statement move; numbers, official names and levels are the standard's
    // own and stay put in every language.
    lang?: ReportLang;
  }
): ConformanceSummary {
  const lang = opts?.lang ?? "en";
  const countByCriterion = new Map<string, number>();
  for (const finding of findings) {
    if (finding.category !== "accessibility") continue;
    const id = normalizeCriterionId(finding.wcagCriterion);
    if (!id) continue;
    countByCriterion.set(id, (countByCriterion.get(id) ?? 0) + 1);
  }

  const criteria: CriterionResult[] = WCAG_21_AA_CRITERIA.map((c) => {
    const findingCount = countByCriterion.get(c.id) ?? 0;
    let status: CriterionStatus;
    if (findingCount > 0) {
      status = "failed";
    } else if (c.coverage === "manual") {
      // We never looked, so we have nothing to say about it.
      status = "needs-review";
    } else if (c.aiAssisted && opts?.aiRan === false) {
      // The only check behind this row is the AI review, and it did not run.
      status = "needs-review";
    } else {
      status = "no-issues-found";
    }
    const localised = criterionText(c.id, lang);
    return { ...c, ...(localised ?? {}), status, findingCount };
  });

  const failedByLevel = { A: 0, AA: 0 };
  let failed = 0;
  let noIssuesFound = 0;
  let needsReview = 0;
  for (const c of criteria) {
    if (c.status === "failed") {
      failed += 1;
      failedByLevel[c.level] += 1;
    } else if (c.status === "no-issues-found") {
      noIssuesFound += 1;
    } else {
      needsReview += 1;
    }
  }

  return {
    standard: "WCAG 2.1 Level AA (EN 301 549)",
    failed,
    noIssuesFound,
    needsReview,
    total: criteria.length,
    failedByLevel,
    criteria,
  };
}
