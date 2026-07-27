import { env } from "../config/env.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl } from "../middleware/ssrfGuard.js";
import { renderAndScan, captureSelectorsFresh } from "./render/renderPage.js";
import { extractContext } from "./contextExtraction/extractContext.js";
import { reviewPage } from "./aiReview/reviewPage.js";
import { attachAltTextSuggestions } from "./aiReview/suggestAltText.js";
import {
  axeToFindings,
  aiToFindings,
  mergeFindings,
  dropContradictedConsentClaims,
} from "./merge/mergeFindings.js";
import { evaluateTypography } from "./typography/analyzeTypography.js";
import { evaluateMotion } from "./motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "./keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "./components/analyzeComponents.js";
import { evaluateDialogs } from "./dialog/analyzeDialogs.js";
import { evaluateForcedColors } from "./forcedColors/analyzeForcedColors.js";
import { evaluateMobile } from "./mobile/analyzeMobile.js";
import { evaluateDarkPatterns } from "./darkPatterns/analyzeDarkPatterns.js";
import { evaluateTextResize } from "./textResize/analyzeTextResize.js";
import { validateMarkup } from "./markup/validateMarkup.js";
import { summarizeSeverity, computeScore, summarizeCategories } from "./merge/scoring.js";
import { buildConformance } from "./conformance/buildConformance.js";
import { buildWcag22Readiness } from "./conformance/wcag22Readiness.js";
import { checkPdfDocument } from "./documents/checkPdf.js";
import { downscalePreview } from "./render/downscalePreview.js";
import { attachElementScreenshots, selectorTargetsOneElement } from "./render/cropThumbnail.js";
import type { AccessibilityFinding, AccessibilityReport } from "../types/report.js";
import type { AuthConfig } from "./auth/authenticate.js";

/**
 * Attaches the pictures a human reader needs: a thumbnail per finding, and
 * alt-text suggestions read from the flagged images themselves.
 *
 * Best-effort by construction — every step here degrades to "no picture", and
 * none of it may fail a scan.
 */
async function attachEvidence(
  findings: AccessibilityFinding[],
  renderResult: Awaited<ReturnType<typeof renderAndScan>>,
  includeAiReview: boolean
): Promise<void> {
  await attachElementScreenshots(
    findings,
    renderResult.boundingBoxes,
    renderResult.fullPageScreenshot,
    renderResult.elementScreenshots
  );

  // Anything still without a picture gets one more attempt on a fresh page.
  //
  // AI findings are the clearest case — they don't exist until after the
  // render pass has closed its page, and the model writes its own selectors,
  // which almost never match the strings measured during render, so they'd
  // only ever get a thumbnail by coincidence. But the same gap catches the
  // layers evaluated after the page closes: a pop-up with no close button, a
  // consent banner, a dark-pattern claim. Those were reaching the report with
  // nothing to show either.
  //
  // Mobile findings are excluded on purpose. This visit runs at desktop width,
  // and picturing a phone-layout finding in a desktop layout shows the reader
  // something that isn't what was measured.
  const unpictured = findings.filter(
    (f) =>
      !f.elementScreenshot &&
      f.selector &&
      f.selector !== "html" &&
      f.selector !== "body" &&
      !f.ruleId?.startsWith("mobile-")
  );
  if (unpictured.length > 0) {
    // Severity order, because the second visit is capped: if only ten
    // pictures fit, they should be the ten that matter most.
    const rank = { critical: 0, serious: 1, moderate: 2, minor: 3 } as const;
    const byImportance = [...unpictured].sort((a, b) => rank[a.severity] - rank[b.severity]);
    const shots = await captureSelectorsFresh(
      renderResult.finalUrl,
      byImportance.map((f) => f.selector),
      selectorTargetsOneElement
    );
    for (const finding of unpictured) {
      const shot = shots[finding.selector];
      if (shot) finding.elementScreenshot = shot;
    }
  }

  // Runs last: it needs each flagged image's captured thumbnail to suggest alt
  // text from what the image actually shows.
  await attachAltTextSuggestions(findings, includeAiReview);
}

/**
 * The full single-URL scan: render + all deterministic finding layers +
 * optional AI review, merged into one AccessibilityReport. Extracted from
 * routes/scan.ts so the crawler (routes/audit.ts) runs the identical
 * pipeline per page. Assumes the URL has already passed assertSafeUrl (the
 * caller does that so it can surface UnsafeUrlError distinctly); it re-runs
 * the guard defensively for callers that pass a crawl-discovered URL.
 *
 * Throws on render failure (RebindingDetectedError, SiteBlockedError, or a
 * generic render error) — the caller decides how to present those.
 */
/**
 * Whether this address is a document rather than a page.
 *
 * Path-based rather than a HEAD request on every scan: a content-type check
 * would cost a round trip on every ordinary page to catch the rare PDF served
 * without the extension, and the extension is right nearly always.
 */
function looksLikePdf(url: URL): boolean {
  return /\.pdf$/i.test(url.pathname);
}

/**
 * A report for a document rather than a page.
 *
 * Shares the report shape so the widget renders it with no special casing, but
 * deliberately carries no conformance checklist: most of the 50 criteria are
 * about pages and marking them "nothing found" against a PDF would imply a
 * breadth of checking that did not happen. The findings and the score are real.
 */
async function documentReport(url: URL): Promise<AccessibilityReport> {
  const result = await checkPdfDocument(url.toString());
  const summary = summarizeSeverity(result.findings);
  return {
    url: url.toString(),
    scannedAt: new Date().toISOString(),
    score: computeScore(summarizeSeverity(result.findings.filter((f) => f.wcagLevel !== "AAA"))),
    summary,
    categorySummary: summarizeCategories(result.findings),
    findings: result.findings,
    meta: {
      axeVersion: "n/a",
      renderTimeMs: 0,
      aiReviewTimeMs: 0,
      aiReviewStatus: "disabled_by_request",
      documentKind: "pdf",
      documentPages: result.pageCount,
    },
  };
}

export async function scanUrlToReport(
  rawUrl: string,
  includeAiReview: boolean,
  // Optional sign-in for pages behind a login. Passed straight through to the
  // render call so the session lives and dies with that throwaway browser
  // context — credentials are never stored, logged, or sent to the AI layer.
  auth?: AuthConfig,
  // Thumbnails, and the alt-text suggestions that read them, are for a report
  // a person looks at. A crawl aggregates findings into counts and conformance
  // and returns no screenshots at all, so for a crawl this is pure cost:
  // cropping per finding, a second page visit, and one AI call per page, all
  // of it discarded. Off by default for callers that say so.
  captureEvidence = true
): Promise<AccessibilityReport> {
  const safeUrl = await assertSafeUrl(rawUrl);

  // A PDF is not a page. Rendering one in Chromium and running axe over the
  // viewer produced "Could not load or scan the page", which told the reader
  // nothing about a document the accessibility rules very much cover.
  if (looksLikePdf(safeUrl)) return documentReport(safeUrl);

  // The budget goes in rather than around: applied here it would have been
  // running while the request waited for a free scanner, so a page that
  // rendered perfectly well inside its allowance still got reported as too
  // slow. See withPage.
  const renderResult = await renderAndScan(
    safeUrl.toString(),
    auth,
    // Signing in costs a page load of its own before the scan starts.
    env.RENDER_TIMEOUT_MS + (auth ? 25_000 : 5000)
  );

  const context = extractContext(safeUrl.toString(), renderResult);
  // Started but deliberately not awaited yet: the AI review is the single
  // longest step (~20s), and none of the deterministic layers below depend on
  // it. Letting it run while we evaluate them and validate the markup takes
  // its cost off the critical path instead of adding to it.
  const aiReviewPromise = reviewPage(context, renderResult.screenshotBase64, includeAiReview);

  const automatedFindings = axeToFindings(renderResult.axe);
  const deterministic: AccessibilityFinding[] = [];
  deterministic.push(...evaluateTypography(renderResult.typographyBlocks));
  deterministic.push(
    ...evaluateMotion(
      renderResult.domSignals.animatedElements,
      renderResult.domSignals.respectsReducedMotion,
      new Set(automatedFindings.map((f) => f.ruleId).filter((r): r is string => Boolean(r))),
      renderResult.userPreferences
    )
  );
  deterministic.push(...evaluateKeyboardNav(renderResult.keyboardNav));
  deterministic.push(...evaluateComponents(renderResult.domSignals));
  deterministic.push(...evaluateDialogs(renderResult.domSignals.dialogs, renderResult.dialogKeyboard));
  deterministic.push(
    ...evaluateForcedColors(renderResult.keyboardNav.stops, renderResult.userPreferences)
  );
  deterministic.push(...evaluateMobile(renderResult.mobileSignals));
  deterministic.push(...evaluateDarkPatterns(renderResult.darkPatternSignals));
  deterministic.push(...evaluateTextResize(renderResult.textResizeSignals));
  deterministic.push(...(await validateMarkup(renderResult.finalUrl)));

  // Everything above ran while the AI review was in flight; collect it now.
  const aiReview = await aiReviewPromise;
  // The model is told that matching accept/reject buttons are correct, and it
  // has still claimed the opposite. Where the page was measured, the
  // measurement decides.
  const aiFindings = dropContradictedConsentClaims(
    aiToFindings(aiReview.findings),
    renderResult.darkPatternSignals.consentBanner
  );
  const findings = mergeFindings(automatedFindings, aiFindings);
  findings.push(...deterministic);

  if (captureEvidence) {
    await attachEvidence(findings, renderResult, includeAiReview);
  }

  // The summary counts everything, because it is the triage list under the
  // gauge and has to agree with the findings actually shown.
  const summary = summarizeSeverity(findings);
  // The score counts Level A and AA only.
  //
  // This report measures WCAG 2.1 A/AA — it says so above the conformance
  // checklist, and that is the bar EN 301 549 and the accessibility statement
  // are written against. Penalising the headline number for AAA findings meant
  // marking a site down against a standard it was never being held to. Target
  // size is the case in point: fifteen AAA findings on one page, moderate
  // severity, enough on their own to exhaust the entire moderate penalty cap.
  //
  // The findings stay in the report and in the triage counts. They are good
  // advice and WCAG 2.2 makes several of them requirements. They simply do not
  // move a number that claims to describe A/AA conformance.
  const score = computeScore(summarizeSeverity(findings.filter((f) => f.wcagLevel !== "AAA")));
  const categorySummary = summarizeCategories(findings);
  const conformance = buildConformance(findings);
  const wcag22 = buildWcag22Readiness(findings);

  return {
    url: safeUrl.toString(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    categorySummary,
    findings,
    screenReaderScript: renderResult.screenReaderScript,
    conformance,
    wcag22,
    pagePreview: await downscalePreview(renderResult.screenshotBase64),
    meta: {
      axeVersion: renderResult.axe.testEngine?.version ?? "unknown",
      renderTimeMs: renderResult.renderTimeMs,
      aiReviewTimeMs: aiReview.aiReviewTimeMs,
      aiReviewStatus: aiReview.status,
      incompleteChecks: renderResult.incompleteChecks.length
        ? renderResult.incompleteChecks
        : undefined,
      aiReviewErrorKind: aiReview.errorKind,
      model: aiReview.model,
    },
  };
}
