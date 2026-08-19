import type { AccessibilityReport, Severity } from "../../types/report.js";
import { buildConformance, type ConformanceSummary } from "../conformance/buildConformance.js";
import { compareNavigation, type ConsistencyIssue } from "./consistency.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Rolls several page reports into one site-level audit.
//
// The point of a multi-page audit isn't more findings — it's telling apart the
// two kinds of problem, which need completely different fixes:
//
//   site-wide  — present on every page, so it lives in the header, footer or
//                template. One fix, whole site.
//   page-level — present on some pages only. Fixed page by page.
//
// A flat list of 200 findings hides that distinction entirely, which is what
// makes single-page tools feel unactionable at scale.

export interface PageSummary {
  url: string;
  label: string;
  score: number;
  findingCount: number;
  // Set when this page couldn't be scanned, with the reason. Reporting a
  // failed page as a clean one would be the worst possible outcome.
  error?: string;
}

export interface SiteWideIssue {
  ruleId: string;
  title: string;
  severity: Severity;
  // How many of the successfully-scanned pages show it.
  pageCount: number;
  totalOccurrences: number;
  wcagCriterion?: string;
  helpUrl?: string;
}

export interface SiteAudit {
  entryUrl: string;
  scannedAt: string;
  pagesScanned: number;
  pagesFailed: number;
  // Mean of the per-page scores, over pages that actually scanned.
  averageScore: number;
  worstPage?: PageSummary;
  pages: PageSummary[];
  // Issues on every scanned page — almost always a template problem.
  siteWide: SiteWideIssue[];
  // Conformance across the whole site: a criterion fails site-wide if it
  // fails anywhere, since conformance is a property of the site as a whole.
  conformance: ConformanceSummary;
  // Where pages disagree with each other — WCAG 3.2.3 and 3.2.4. Only ever
  // populated here: these are the two criteria a single-page scan cannot
  // speak to at all.
  consistency: ConsistencyIssue[];
}

export interface PageOutcome {
  url: string;
  label: string;
  report?: AccessibilityReport;
  error?: string;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

/**
 * Pure and deterministic — takes finished page reports and produces the site
 * view. Kept free of I/O so the aggregation logic can be tested without
 * running a browser.
 */
export function aggregateAudit(entryUrl: string, outcomes: PageOutcome[]): SiteAudit {
  const pages: PageSummary[] = outcomes.map((o) => ({
    url: o.url,
    label: o.label,
    score: o.report?.score ?? 0,
    findingCount: o.report?.findings.length ?? 0,
    error: o.error,
  }));

  const scanned = outcomes.filter((o) => o.report);
  const averageScore =
    scanned.length > 0
      ? Math.round(scanned.reduce((sum, o) => sum + (o.report?.score ?? 0), 0) / scanned.length)
      : 0;

  // Which pages does each rule appear on, and how often in total?
  const byRule = new Map<
    string,
    { pages: Set<string>; occurrences: number; sample: { title: string; severity: Severity; wcagCriterion?: string; helpUrl?: string } }
  >();
  for (const outcome of scanned) {
    for (const finding of outcome.report!.findings) {
      // Rule id is the only stable identity across pages — descriptions embed
      // page-specific counts and element names.
      if (!finding.ruleId) continue;
      const entry = byRule.get(finding.ruleId) ?? {
        pages: new Set<string>(),
        occurrences: 0,
        sample: {
          title: finding.title ?? finding.description,
          severity: finding.severity,
          wcagCriterion: finding.wcagCriterion,
          helpUrl: finding.helpUrl,
        },
      };
      entry.pages.add(outcome.url);
      entry.occurrences += 1;
      byRule.set(finding.ruleId, entry);
    }
  }

  // "Site-wide" means every scanned page. With only one page successfully
  // scanned there's no cross-page evidence at all, so claiming anything is
  // site-wide would be an unfounded generalisation from a single sample.
  const siteWide: SiteWideIssue[] =
    scanned.length < 2
      ? []
      : [...byRule.entries()]
          .filter(([, v]) => v.pages.size === scanned.length)
          .map(([ruleId, v]) => ({
            ruleId,
            title: v.sample.title,
            severity: v.sample.severity,
            pageCount: v.pages.size,
            totalOccurrences: v.occurrences,
            wcagCriterion: v.sample.wcagCriterion,
            helpUrl: v.sample.helpUrl,
          }))
          .sort(
            (a, b) =>
              SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
              b.totalOccurrences - a.totalOccurrences
          );

  const worstPage = [...pages]
    .filter((p) => !p.error)
    .sort((a, b) => a.score - b.score)[0];

  // Conformance over every finding from every page: a criterion that fails on
  // any one page fails for the site.
  const allFindings = scanned.flatMap((o) => o.report!.findings);

  // Pages that failed to render carry no menu, and a page with no menu is
  // silently skipped rather than counted as one that changed it.
  const consistency = compareNavigation(
    scanned.map((o) => ({
      url: o.url,
      label: o.label,
      navigation: o.report!.navigation ?? [],
    }))
  );

  return {
    entryUrl,
    scannedAt: new Date().toISOString(),
    pagesScanned: scanned.length,
    pagesFailed: outcomes.length - scanned.length,
    averageScore,
    worstPage,
    pages,
    siteWide,
    conformance: buildConformance(
      [
        ...allFindings,
        // The measured 3.2.3/3.2.4 failures, counted into their conformance
        // rows. Without this the same audit showed a proven "the menu moves
        // around" failure in .consistency while the checklist said we never
        // looked — the two halves of one response contradicting each other.
        // These minimal findings exist only for this count; the reader's
        // copy of the evidence stays in .consistency below.
        ...consistency.map(
          (issue): AccessibilityFinding => ({
            id: `consistency-${issue.ruleId}-${issue.criterion}`,
            source: "automated",
            severity: "moderate",
            category: "accessibility",
            wcagCriterion: issue.criterion,
            wcagLevel: "AA",
            selector: "nav",
            description: issue.description,
            suggestedFix: issue.title,
            ruleId: issue.ruleId,
          })
        ),
      ],
      // The crawl runs pages with the AI review off by default; rows whose
      // only coverage is an AI prompt item must not read "no-issues-found"
      // on a scan where it never ran.
      { aiRan: scanned.some((o) => o.report!.meta.aiReviewStatus === "completed") }
    ),
    consistency,
  };
}
