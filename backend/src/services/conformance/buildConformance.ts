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
  | "needs-review"
  // The check that decides this criterion did not run, or could not finish.
  //
  // Without this status a probe that threw produced no findings, and no
  // findings fell through to "no-issues-found" — so a crashed keyboard walk
  // printed the same row as a clean one. That is the exact overclaim the note
  // at the top of this file says the module exists to prevent, arriving
  // through the back door: not a claimed pass, but an unclaimed absence
  // reported as if it were evidence.
  | "not-measured";

export interface CriterionResult {
  id: string;
  name: string;
  level: CriterionLevel;
  coverage: CriterionCoverage;
  plain: string;
  failing: string;
  status: CriterionStatus;
  findingCount: number;
  // Which check failed, in the words the report already uses for it. A row
  // that says "not measured" and cannot say what went unmeasured is only
  // marginally better than one that lied.
  notMeasured?: string[];
}

/* Which criteria each probe is the evidence path for.
 *
 * Read off the analyzers rather than assumed: every id below appears in a
 * `wcagCriterion` on a finding that module emits. The standard is the one
 * wcag22Readiness already sets for itself — only map a check whose failure
 * really does leave that criterion unmeasured.
 *
 * Deliberately absent: "reading level" (its only criterion, 3.1.5, is AAA and
 * outside this list), and every probe whose criteria are also decided by axe.
 */
const CHECK_TO_CRITERIA: Record<string, string[]> = {
  // analyzeKeyboard emits all four, and is the ONLY emitter of 1.4.11.
  "keyboard navigation": ["1.4.11", "2.1.1", "2.1.2", "2.4.3", "2.4.7"],
  "mouse-only controls": ["2.1.1"],
  // analyzeMobile's other id, 2.5.5, is AAA.
  "phone layout": ["1.4.10"],
  "text resizing": ["1.4.4", "1.4.12"],
  // userPreferences feeds evaluateMotion and evaluateForcedColors.
  "display preferences": ["1.4.2", "2.2.2", "2.4.7"],
  "reading order": ["1.3.2", "2.4.3"],
};

export interface ConformanceSummary {
  standard: string;
  failed: number;
  noIssuesFound: number;
  needsReview: number;
  notMeasured: number;
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
    // Probes that could not run or could not finish, in the render's own
    // words ("keyboard navigation", "phone layout"...). Built by renderPage
    // and carried in meta; until now nothing read them, so a crashed probe
    // and a clean page produced identical rows.
    incompleteChecks?: string[];
    // Criteria carrying at least one axe result that came back "incomplete".
    // axe saying it could not decide is not axe finding nothing.
    axeIncompleteCriteria?: string[];
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

  /* Criterion id -> the checks that were supposed to decide it and did not.
     Built from the probe failures the render already records, plus the axe
     rules that returned "incomplete" — an axe check that could not resolve is
     not a check that found nothing. */
  const unmeasured = new Map<string, string[]>();
  const markUnmeasured = (id: string, why: string) => {
    const list = unmeasured.get(id) ?? [];
    if (!list.includes(why)) list.push(why);
    unmeasured.set(id, list);
  };
  for (const check of opts?.incompleteChecks ?? []) {
    for (const id of CHECK_TO_CRITERIA[check] ?? []) markUnmeasured(id, check);
  }
  for (const id of opts?.axeIncompleteCriteria ?? []) {
    const norm = normalizeCriterionId(id);
    if (norm) markUnmeasured(norm, "an automated check that could not decide");
  }

  const criteria: CriterionResult[] = WCAG_21_AA_CRITERIA.map((c) => {
    const findingCount = countByCriterion.get(c.id) ?? 0;
    const notMeasured = unmeasured.get(c.id);
    let status: CriterionStatus;
    if (findingCount > 0) {
      // A failure we can point at outranks everything else, including a probe
      // that died afterwards: the fault is real either way.
      status = "failed";
    } else if (c.alwaysSatisfied) {
      // Nothing to measure and nothing to ask a person — see wcagCriteria.
      status = "no-issues-found";
    } else if (c.coverage === "manual") {
      // We never looked, so we have nothing to say about it.
      status = "needs-review";
    } else if (c.aiAssisted && opts?.aiRan === false) {
      // The only check behind this row is the AI review, and it did not run.
      status = "needs-review";
    } else if (notMeasured) {
      // We meant to look, and could not. Distinct from needs-review, which
      // says a person was always going to be required here.
      status = "not-measured";
    } else {
      status = "no-issues-found";
    }
    const localised = criterionText(c.id, lang);
    return { ...c, ...(localised ?? {}), status, findingCount, ...(notMeasured ? { notMeasured } : {}) };
  });

  const failedByLevel = { A: 0, AA: 0 };
  let failed = 0;
  let noIssuesFound = 0;
  let needsReview = 0;
  let notMeasured = 0;
  for (const c of criteria) {
    if (c.status === "failed") {
      failed += 1;
      failedByLevel[c.level] += 1;
    } else if (c.status === "no-issues-found") {
      noIssuesFound += 1;
    } else if (c.status === "not-measured") {
      // Counted apart from needs-review on purpose. "A person must judge this"
      // and "our check broke" are different sentences, and only one of them is
      // something the reader can fix by re-running the scan.
      notMeasured += 1;
    } else {
      needsReview += 1;
    }
  }

  return {
    standard: "WCAG 2.1 Level AA (EN 301 549)",
    failed,
    noIssuesFound,
    needsReview,
    notMeasured,
    total: criteria.length,
    failedByLevel,
    criteria,
  };
}
