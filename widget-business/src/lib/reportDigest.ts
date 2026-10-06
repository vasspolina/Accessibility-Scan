import type { AccessibilityFinding, AccessibilityReport, SiteAudit } from "../api/scanClient";
import { groupFindings } from "../components/FindingsList";
import { TRIAGE_BADGE } from "../components/FindingGroup";
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
  const criterion = rep.wcagCriterion && rep.wcagCriterion !== "N/A" ? rep.wcagCriterion : undefined;
  // What the site's owner already said about these places, counted by the
  // badge the card shows. The finding stays — a marked fault is still
  // measured — but the assistant must not lead with one the owner dismissed.
  const marks: Record<string, number> = {};
  for (const f of group) {
    if (f.triage && f.triage.state !== "open") {
      const badge = TRIAGE_BADGE[f.triage.state];
      marks[badge] = (marks[badge] ?? 0) + 1;
    }
  }
  return {
    title,
    severity: SEVERITY[rep.severity],
    count: group.length,
    criterion,
    // A level only means something with a criterion: a design note with
    // none still carries "AA" in the data, and read alone it says
    // "a Level AA problem".
    level: criterion ? rep.wcagLevel : undefined,
    ownerMarked: Object.keys(marks).length ? marks : undefined,
    whoFixes: fixKindForFinding(rep).label,
    found: whatWeFound(rep, plain, group.length, title) ?? undefined,
    whyItMatters: plain?.impact,
    whatToDo: Array.isArray(fix) ? fix.join(" ") : fix,
    source: rep.source === "ai-review" ? "AI review, may be wrong" : "automated rule",
    elements: [...new Set(group.map((f) => f.selector))].slice(0, ELEMENTS_PER_FINDING),
  };
}

const criterionId = (raw: string | undefined) => {
  const m = raw ? /(\d)\.(\d{1,2})\.(\d{1,2})/.exec(raw) : null;
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
};

/** The conformance summary, the same way for a page and a site: what fails,
 *  what nothing was found for, what needs a person, and what was not
 *  measured — so nothing is left as an unlabelled remainder that reads as
 *  passes. A failing criterion only the AI review found says so. */
function digestConformance(c: NonNullable<AccessibilityReport["conformance"]>, findings: AccessibilityFinding[] = []) {
  return {
    standard: c.standard,
    failing: c.failed,
    nothingFound: c.noIssuesFound,
    needsAPerson: c.needsReview,
    total: c.total,
    failingCriteria: c.criteria
      .filter((x) => x.status === "failed")
      .map((x) => {
        const behind = findings.filter((f) => f.category === "accessibility" && criterionId(f.wcagCriterion) === x.id);
        return {
          id: x.id,
          name: x.name,
          level: x.level,
          places: x.findingCount,
          onlyFromAiReview: behind.length > 0 && behind.every((f) => f.source === "ai-review") ? true : undefined,
        };
      }),
    notMeasured: c.criteria
      .filter((x) => x.status === "not-measured")
      .map((x) => ({ id: x.id, why: x.notMeasured })),
  };
}

const SKIPPED: Record<string, string> = {
  skipped_no_key: "did not run: this server has no AI key",
  skipped_timeout: "did not run: it ran out of time",
  skipped_error: "did not run: it failed",
};

export function digestReport(report: AccessibilityReport) {
  const byCategory = (c: AccessibilityFinding["category"]) =>
    groupFindings(report.findings.filter((f) => f.category === c)).map(digestFinding);
  const isPdf = report.meta.documentKind === "pdf";

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
    // A document gets no AI review whatever was asked; the status the
    // pipeline stamps on it ("disabled_by_request") would say otherwise.
    aiReview: isPdf ? "not run: documents get no AI review" : SKIPPED[report.meta.aiReviewStatus] ?? report.meta.aiReviewStatus,
    checksThatDidNotFinish: report.meta.incompleteChecks?.length ? report.meta.incompleteChecks : undefined,
    document: isPdf
      ? {
          kind: "PDF",
          pages: report.meta.documentPages,
          // checkPdf.ts: MAX_PAGES_INSPECTED and its six rules.
          checked:
            "Only these, on the first 10 pages: tagged structure, real text rather than a scanned image, a title, a language, image descriptions, headings. There is no WCAG checklist for a document and nothing else was checked.",
        }
      : undefined,
    conformance: report.conformance ? digestConformance(report.conformance, report.findings) : undefined,
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
    averageScore: audit.pagesScanned ? `${audit.averageScore} out of 100` : undefined,
    worstPage: audit.worstPage ? { url: audit.worstPage.url, score: audit.worstPage.score } : undefined,
    // A page that did not load has no score and no findings; sent as 0 and
    // 0 it read as a clean page.
    pages: audit.pages.map((p) =>
      p.error ? { url: p.url, notScanned: p.error } : { url: p.url, score: p.score, findings: p.findingCount }
    ),
    // auditSite never sends includeAiReview: a site audit has no AI review,
    // so it says nothing about design, readability or misleading patterns.
    aiReview: "not run: a site audit never includes the AI review, so it says nothing about design, readability or misleading patterns",
    checksThatDidNotFinish: audit.incompleteChecks?.length ? audit.incompleteChecks : undefined,
    // WCAG 3.2.3 and 3.2.4: only a site audit can fail them, and they count
    // in conformance.failing.
    consistency: audit.consistency?.length
      ? audit.consistency.map((i) => ({ criterion: i.criterion, title: i.title, what: i.description, pages: i.pages }))
      : undefined,
    onEveryPage: audit.siteWide.map((s) => ({
      title: plainForRule(s.ruleId)?.plain ?? s.title,
      severity: SEVERITY[s.severity],
      onPages: s.pageCount,
      places: s.totalOccurrences,
      criterion: s.wcagCriterion,
    })),
    conformance: digestConformance(audit.conformance),
  };
}
