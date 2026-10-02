import type { AccessibilityFinding, AccessibilityReport, SiteAudit } from "../api/scanClient";
import { groupFindings } from "../components/FindingsList";
import { plainForRule, plainFixForRule } from "./wcagPlain";
import { fixKindForFinding } from "./testMethod";
import { whatWeFound } from "./findingText";

/**
 * The report, as the chat assistant reads it.
 *
 * Built from the same helpers the report's own cards use — the plain title,
 * the what-we-found line, the fix, who fixes it — so the assistant answers
 * in the words already on the page. An assistant reading the raw scan would
 * name rule ids and axe's wording, and contradict the cards beside it.
 *
 * What is left out is left out on purpose: screenshots (the bulk of a
 * report, and pixels the assistant has no use for), the screen reader
 * transcript, and every element beyond the first few of a finding — the
 * count says how many there are, and the page lists them.
 */

const SEVERITY: Record<AccessibilityFinding["severity"], string> = {
  critical: "Fix first",
  serious: "Fix soon",
  moderate: "Fix eventually",
  minor: "Minor polish",
};

const ELEMENTS_PER_FINDING = 3;

function digestFinding(group: AccessibilityFinding[]) {
  const rep = group[0];
  const plain = plainForRule(rep.ruleId);
  const title = plain?.plain ?? rep.title ?? rep.description;
  const fix = plainFixForRule(rep.ruleId) ?? rep.suggestedFix;
  return {
    title,
    severity: SEVERITY[rep.severity],
    count: group.length,
    criterion: rep.wcagCriterion && rep.wcagCriterion !== "N/A" ? rep.wcagCriterion : undefined,
    level: rep.wcagLevel,
    whoFixes: fixKindForFinding(rep).label,
    found: whatWeFound(rep, plain, group.length, title) ?? undefined,
    whyItMatters: plain?.impact,
    whatToDo: Array.isArray(fix) ? fix.join(" ") : fix,
    source: rep.source === "ai-review" ? "AI review, may be wrong" : "automated rule",
    elements: [...new Set(group.map((f) => f.selector))].slice(0, ELEMENTS_PER_FINDING),
  };
}

export function digestReport(report: AccessibilityReport) {
  const byCategory = (c: AccessibilityFinding["category"]) =>
    groupFindings(report.findings.filter((f) => f.category === c)).map(digestFinding);

  const conformance = report.conformance
    ? {
        standard: report.conformance.standard,
        failing: report.conformance.failed,
        nothingFound: report.conformance.noIssuesFound,
        needsAPerson: report.conformance.needsReview,
        total: report.conformance.total,
        failingCriteria: report.conformance.criteria
          .filter((c) => c.status === "failed")
          .map((c) => ({ id: c.id, name: c.name, level: c.level, places: c.findingCount })),
        notMeasured: report.conformance.criteria
          .filter((c) => c.status === "not-measured")
          .map((c) => c.id),
      }
    : undefined;

  return {
    kind: "page report",
    url: report.url,
    scannedAt: report.scannedAt,
    score: `${report.score} out of 100`,
    issuesBySeverity: {
      "Fix first": report.summary.critical,
      "Fix soon": report.summary.serious,
      "Fix eventually": report.summary.moderate,
      "Minor polish": report.summary.minor,
    },
    aiReview: report.meta.aiReviewStatus,
    checksThatDidNotFinish: report.meta.incompleteChecks?.length ? report.meta.incompleteChecks : undefined,
    document: report.meta.documentKind === "pdf" ? `PDF, ${report.meta.documentPages ?? "?"} pages` : undefined,
    conformance,
    whatPeopleCantUse: byCategory("accessibility"),
    whatCostsYouTrust: byCategory("dark-pattern"),
    notesOnTheDesign: byCategory("design-clarity"),
    needsAPerson: (report.undecidedChecks ?? []).map((u) => ({ check: u.help, places: u.count })),
  };
}

export function digestAudit(audit: SiteAudit) {
  return {
    kind: "site audit",
    entryUrl: audit.entryUrl,
    scannedAt: audit.scannedAt,
    pagesScanned: audit.pagesScanned,
    pagesThatFailedToLoad: audit.pagesFailed,
    averageScore: `${audit.averageScore} out of 100`,
    worstPage: audit.worstPage ? { url: audit.worstPage.url, score: audit.worstPage.score } : undefined,
    pages: audit.pages.map((p) => ({ url: p.url, score: p.score, findings: p.findingCount, error: p.error })),
    onEveryPage: audit.siteWide.map((s) => ({
      title: plainForRule(s.ruleId)?.plain ?? s.title,
      severity: SEVERITY[s.severity],
      onPages: s.pageCount,
      places: s.totalOccurrences,
      criterion: s.wcagCriterion,
    })),
    conformance: {
      standard: audit.conformance.standard,
      failing: audit.conformance.failed,
      needsAPerson: audit.conformance.needsReview,
      total: audit.conformance.total,
    },
  };
}
