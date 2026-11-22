import type { AccessibilityReport, LinkedDocument, Severity } from "../../types/report.js";
import { buildConformance, type ConformanceSummary } from "../conformance/buildConformance.js";
import { buildWcag22Readiness, type Wcag22Readiness } from "../conformance/wcag22Readiness.js";
import { compareNavigation, type ConsistencyIssue } from "./consistency.js";
import type { AccessibilityFinding } from "../../types/report.js";
import { normalizeReportLang } from "../conformance/criteriaText.js";
import type { FailureReason } from "../scanFailure.js";

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
  // The values in that reason, for the widget to word in the reader's language.
  errorReason?: FailureReason;
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
  // Checks that did not finish on at least one scanned page — the union the
  // conformance rows are built from, carried out so a reader of the audit
  // is told, not just its table.
  incompleteChecks: string[];
  // WCAG 2.2 readiness over the whole crawl. This block existed only in
  // single-page reports — absent in exactly the mode where 3.2.6 Consistent
  // Help and 3.3.7 Redundant Entry are answerable at all.
  wcag22: Wcag22Readiness;
  // How the pages were found, beyond the entry page's own links. Set by the
  // audit route, absent when the site has no sitemap and no robots rules
  // took anything out.
  discovery?: AuditDiscovery;
  // True when the pages were scanned signed in (the caller sent sign-in
  // details). Set by the audit route; says nothing about how they signed in.
  signedIn?: boolean;
  // Accessibility overlays seen on the scanned pages (each page's
  // meta.overlays, rolled up). Absent when no page carried one. The audit
  // reader only ever receives this aggregate, so a note left on the pages
  // would never reach them. A statement about the pages, as on a single
  // report: no part of it enters the scores, the site-wide issues or the
  // conformance table above.
  overlays?: SiteOverlay[];
  // The documents the scanned pages link to, each counted once however many
  // pages link to it. Absent when none of them links to any. A site audit
  // counts documents and opens none of them: see AUDIT_BUDGET_MS in
  // routes/audit.ts for the measurement behind that.
  documents?: SiteDocuments;
}

export interface SiteDocuments {
  counts: Record<LinkedDocument["kind"], number>;
  total: number;
  // On an origin other than the audited site's.
  otherSites: number;
  // Always 0 from a site audit today. Carried so a reader of the JSON is
  // told the number instead of inferring it from a missing field.
  pdfChecked: number;
  // Pages whose link list was cut at the render's cap, which makes the
  // counts a floor. Absent when no page was.
  pagesWithLinksNotRead?: number;
  items: Array<{
    url: string;
    kind: LinkedDocument["kind"];
    sameOrigin: boolean;
    // The words of the first link found pointing at it.
    text: string;
    // How many of the scanned pages link to it.
    pageCount: number;
  }>;
}

export interface AuditDiscovery {
  // The sitemap that was read, when there was one.
  sitemap?: string;
  // How many addresses it listed (capped at the reader's limit).
  sitemapUrls: number;
  // Candidate pages left out because the site's robots.txt disallows them.
  excludedByRobots: number;
}

/**
 * One list of documents for the site, from each page's own.
 *
 * A footer that links the same price list on every page is one document,
 * not ten, and the number an owner needs is how many files there are to
 * put right.
 */
export function unionDocuments(outcomes: PageOutcome[]): SiteDocuments | undefined {
  const byUrl = new Map<string, SiteDocuments["items"][number]>();
  let pdfChecked = 0;
  let pagesWithLinksNotRead = 0;
  const checkedUrls = new Set<string>();
  for (const outcome of outcomes) {
    const inventory = outcome.report?.documents;
    if (!inventory) continue;
    if (inventory.linksNotRead) pagesWithLinksNotRead += 1;
    for (const item of inventory.items) {
      if (item.status === "checked" && !checkedUrls.has(item.url)) {
        checkedUrls.add(item.url);
        pdfChecked += 1;
      }
      const seen = byUrl.get(item.url);
      if (seen) {
        seen.pageCount += 1;
        if (!seen.text && item.text) seen.text = item.text;
        continue;
      }
      byUrl.set(item.url, {
        url: item.url,
        kind: item.kind,
        sameOrigin: item.sameOrigin,
        text: item.text,
        pageCount: 1,
      });
    }
  }
  if (byUrl.size === 0) return undefined;
  const items = [...byUrl.values()];
  const counts = { pdf: 0, word: 0, excel: 0, powerpoint: 0 };
  for (const item of items) counts[item.kind] += 1;
  return {
    counts,
    total: items.length,
    otherSites: items.filter((i) => !i.sameOrigin).length,
    pdfChecked,
    ...(pagesWithLinksNotRead > 0 ? { pagesWithLinksNotRead } : {}),
    items,
  };
}

export interface SiteOverlay {
  vendor: string;
  // The first address seen for this vendor across the pages.
  scriptUrl?: string;
  // Scanned pages carrying the vendor's script or its widget element.
  pageCount: number;
  // Of those, the pages where the widget element was in the document, so
  // the page was measured with the overlay running. Kept apart from
  // pageCount for the reason widgetOnPage exists on a single report: a
  // script tag is not proof the widget started.
  widgetPageCount: number;
}

/** Each page's overlays, one row per vendor, in the order first seen. */
export function summariseSiteOverlays(outcomes: PageOutcome[]): SiteOverlay[] | undefined {
  const byVendor = new Map<string, SiteOverlay>();
  for (const o of outcomes) {
    for (const seen of o.report?.meta.overlays ?? []) {
      const row = byVendor.get(seen.vendor) ?? { vendor: seen.vendor, pageCount: 0, widgetPageCount: 0 };
      row.pageCount += 1;
      if (seen.widgetOnPage) row.widgetPageCount += 1;
      if (!row.scriptUrl && seen.scriptUrl) row.scriptUrl = seen.scriptUrl;
      byVendor.set(seen.vendor, row);
    }
  }
  return byVendor.size ? [...byVendor.values()] : undefined;
}

export interface PageOutcome {
  url: string;
  label: string;
  report?: AccessibilityReport;
  error?: string;
  errorReason?: FailureReason;
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
export function aggregateAudit(
  entryUrl: string,
  outcomes: PageOutcome[],
  // The site-level checklist follows the same language as its pages.
  language?: string
): SiteAudit {
  const pages: PageSummary[] = outcomes.map((o) => ({
    url: o.url,
    label: o.label,
    score: o.report?.score ?? 0,
    findingCount: o.report?.findings.length ?? 0,
    error: o.error,
    ...(o.errorReason ? { errorReason: o.errorReason } : {}),
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

  const documents = unionDocuments(scanned);

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
      {
        // every(), not some(): "no issues found" over five pages is only
        // true if the evidence was gathered on all five — the same union
        // rule the incompleteChecks below already follow. An AI review that
        // completed on one page of five leaves four pages unexamined.
        aiRan: scanned.length > 0 && scanned.every((o) => o.report!.meta.aiReviewStatus === "completed"),
        lang: normalizeReportLang(language),
        // Union across pages: a check that fell over on any scanned page
        // leaves its criteria not fully measured for the site, and "no
        // issues found" over five pages is only true if the check ran on
        // all five. One flaky page turns the row amber rather than green,
        // which is the direction this report is allowed to be wrong in.
        incompleteChecks: [
          ...new Set(scanned.flatMap((o) => o.report!.meta.incompleteChecks ?? [])),
        ],
        // The consistency pass compared these across every scanned page, so
        // the site table may say "no issues found" where a single page must
        // say "needs a person". Only meaningful with two or more pages — a
        // one-page crawl compared nothing.
        measuredDespiteManual: scanned.length >= 2 ? ["3.2.3", "3.2.4"] : [],
        // Union of every page's axe incompletes. The comment that used to
        // stand here said they "stay in each page's own report" — which was
        // false for the audit reader, who only ever receives this aggregate.
        axeIncompleteCriteria: [
          ...new Set(scanned.flatMap((o) => o.report!.meta.axeIncomplete ?? [])),
        ],
      }
    ),
    consistency,
    incompleteChecks: [...new Set(scanned.flatMap((o) => o.report!.meta.incompleteChecks ?? []))],
    wcag22: buildWcag22Readiness(allFindings, {
      incompleteChecks: [...new Set(scanned.flatMap((o) => o.report!.meta.incompleteChecks ?? []))],
      lang: normalizeReportLang(language),
    }),
    ...(documents ? { documents } : {}),
    overlays: summariseSiteOverlays(scanned),
  };
}
