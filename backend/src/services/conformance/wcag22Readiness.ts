import type { AccessibilityFinding } from "../../types/report.js";
import { normalizeCriterionId } from "./wcagCriteria.js";

// What changes when the law catches up with WCAG 2.2.
//
// The report measures WCAG 2.1 A/AA, because that is what EN 301 549 v3.2.1
// adopts and therefore what the European Accessibility Act currently points
// at. EN 301 549 v4.1.1 adopts WCAG 2.2, and is expected to be cited in the
// Official Journal around October 2026. Once it is, the bar moves.
//
// This section exists so an owner can see the move coming rather than
// discover it. It is deliberately separate from the conformance checklist:
// mixing the two would mean reporting a site as failing something it is not
// yet required to meet, which is the overclaim this project keeps refusing.
//
// WCAG 2.2 adds nine criteria. Three are AAA and out of scope here, exactly as
// they are in the main checklist. These are the six that become A or AA.

export interface Wcag22Criterion {
  id: string;
  name: string;
  level: "A" | "AA";
  coverage: "automated" | "manual";
  /** The question, for a criterion we have nothing to report on. */
  plain: string;
  /** What to say when this scan already found it failing. */
  failing: string;
  /** Why a person has to judge it, when software cannot. */
  whyManual?: string;
}

export const WCAG_22_NEW_AA: Wcag22Criterion[] = [
  {
    id: "2.4.11",
    name: "Focus Not Obscured (Minimum)",
    level: "AA",
    coverage: "manual",
    plain: "When something is tabbed to, is it still visible?",
    failing: "A sticky header or footer hides the thing you have just tabbed to",
    whyManual:
      "It depends on where a sticky bar sits at the moment a particular control takes focus, which needs a person tabbing through and watching. The scan does measure how much of a phone screen pinned bars hold, which is where this failure usually starts.",
  },
  {
    id: "2.5.7",
    name: "Dragging Movements",
    level: "AA",
    coverage: "manual",
    plain: "Can anything you drag also be done without dragging?",
    failing: "Something can only be done by dragging it",
    whyManual:
      "Software can see that a slider or a sortable list exists. Whether there is another way to do the same job is a judgement about the whole task.",
  },
  {
    id: "2.5.8",
    name: "Target Size (Minimum)",
    level: "AA",
    coverage: "automated",
    plain: "Is everything you tap at least 24 by 24 pixels, or well spaced?",
    failing: "Some things you tap are under 24 pixels and packed close together",
  },
  {
    id: "3.2.6",
    name: "Consistent Help",
    level: "A",
    coverage: "manual",
    plain: "Is help always in the same place on every page?",
    failing: "Help sits in a different place from page to page",
    whyManual:
      "This compares one page against every other page, and means knowing which of your links and widgets count as help.",
  },
  {
    id: "3.3.7",
    name: "Redundant Entry",
    level: "A",
    coverage: "manual",
    plain: "Does anything ask for the same information twice?",
    failing: "The same information has to be typed more than once",
    whyManual:
      "It only shows up part way through a multi-step form, which means completing that form as a person would.",
  },
  {
    id: "3.3.8",
    name: "Accessible Authentication (Minimum)",
    level: "AA",
    coverage: "manual",
    plain: "Can people sign in without solving a puzzle or memorising something?",
    failing: "Signing in needs a puzzle, or remembering something, with no other way through",
    whyManual:
      "Sign-in usually sits behind the page we can reach, and whether an alternative route exists is a question about the whole flow.",
  },
];

// axe and our own layers tag findings against WCAG 2.1, where target size is
// 2.5.5 at AAA. The same evidence is what 2.5.8 asks about, so the readiness
// view reads it across rather than re-detecting it.
//
// Two rules are deliberately NOT here, and adding them is the tempting
// mistake this comment exists to stop. mobile-target-spacing flags targets
// that PASS 2.5.8 — they are 24px or larger, so the criterion is satisfied
// and the spacing exception is never even consulted; the rule is comfort
// advice beyond the standard. mobile-sticky-coverage measures the
// precondition for a 2.4.11 failure (pinned chrome holding the screen), not
// the failure itself, which is a focused element actually hidden — and
// "already failing" on precondition evidence is an overclaim. A row here
// marks a criterion as failing today; only map a rule whose firing proves
// exactly that.
const RULES_EVIDENCING: Record<string, string[]> = {
  "2.5.8": ["mobile-tap-target"],
};

export type ReadinessStatus = "already-failing" | "no-issues-found" | "needs-review";

export interface Wcag22CriterionResult extends Wcag22Criterion {
  status: ReadinessStatus;
  findingCount: number;
}

export interface Wcag22Readiness {
  standard: string;
  /** Plain-language note on when this stops being optional. */
  expectedFrom: string;
  criteria: Wcag22CriterionResult[];
  alreadyFailing: number;
  needsReview: number;
  total: number;
  /**
   * 4.1.1 Parsing is removed in WCAG 2.2 as obsolete. If a scan reports it
   * failing today, that particular failure simply stops counting — which is
   * the one piece of unambiguously good news in the change, and worth saying.
   */
  parsingNoLongerCounts: boolean;
}

/**
 * Pure and deterministic, like buildConformance. Reports only what the scan
 * can evidence, and says plainly that the rest needs a person — the same rule
 * the main checklist follows.
 */
export function buildWcag22Readiness(findings: AccessibilityFinding[]): Wcag22Readiness {
  const countByRule = new Map<string, number>();
  let parsingFailing = false;
  for (const finding of findings) {
    if (finding.category !== "accessibility") continue;
    if (finding.ruleId) countByRule.set(finding.ruleId, (countByRule.get(finding.ruleId) ?? 0) + 1);
    if (normalizeCriterionId(finding.wcagCriterion) === "4.1.1") parsingFailing = true;
  }

  const criteria = WCAG_22_NEW_AA.map((c) => {
    const rules = RULES_EVIDENCING[c.id] ?? [];
    const findingCount = rules.reduce((n, rule) => n + (countByRule.get(rule) ?? 0), 0);
    const status: ReadinessStatus =
      findingCount > 0 ? "already-failing" : c.coverage === "manual" ? "needs-review" : "no-issues-found";
    return { ...c, status, findingCount };
  });

  return {
    standard: "WCAG 2.2 Level AA (EN 301 549 v4.1.1)",
    expectedFrom: "late 2026",
    criteria,
    alreadyFailing: criteria.filter((c) => c.status === "already-failing").length,
    needsReview: criteria.filter((c) => c.status === "needs-review").length,
    total: criteria.length,
    parsingNoLongerCounts: parsingFailing,
  };
}
