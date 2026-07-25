import { env } from "../config/env.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl } from "../middleware/ssrfGuard.js";
import { renderAndScan, captureSelectorsFresh } from "./render/renderPage.js";
import { extractContext } from "./contextExtraction/extractContext.js";
import { reviewPage } from "./aiReview/reviewPage.js";
import { attachAltTextSuggestions } from "./aiReview/suggestAltText.js";
import { axeToFindings, aiToFindings, mergeFindings } from "./merge/mergeFindings.js";
import { evaluateTypography } from "./typography/analyzeTypography.js";
import { evaluateMotion } from "./motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "./keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "./components/analyzeComponents.js";
import { evaluateDialogs } from "./dialog/analyzeDialogs.js";
import { evaluateMobile } from "./mobile/analyzeMobile.js";
import { evaluateDarkPatterns } from "./darkPatterns/analyzeDarkPatterns.js";
import { evaluateTextResize } from "./textResize/analyzeTextResize.js";
import { validateMarkup } from "./markup/validateMarkup.js";
import { summarizeSeverity, computeScore, summarizeCategories } from "./merge/scoring.js";
import { buildConformance } from "./conformance/buildConformance.js";
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

  // AI findings are the one group the render pass can't photograph: they don't
  // exist until after the page has closed, and the model writes its own
  // selectors, which almost never match the strings measured during render. So
  // they'd only ever get a thumbnail by coincidence. A short second visit
  // photographs what the model actually pointed at — worth one navigation,
  // because "this field has no label" is far more convincing next to a picture
  // of the field.
  const unpictured = findings.filter(
    (f) =>
      f.source === "ai-review" &&
      !f.elementScreenshot &&
      f.selector &&
      f.selector !== "html" &&
      f.selector !== "body"
  );
  if (unpictured.length > 0) {
    const shots = await captureSelectorsFresh(
      renderResult.finalUrl,
      unpictured.map((f) => f.selector),
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

  const renderResult = await withTimeout(
    renderAndScan(safeUrl.toString(), auth),
    // Signing in costs a page load of its own before the scan starts.
    env.RENDER_TIMEOUT_MS + (auth ? 25_000 : 5000),
    "Page render"
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
      new Set(automatedFindings.map((f) => f.ruleId).filter((r): r is string => Boolean(r)))
    )
  );
  deterministic.push(...evaluateKeyboardNav(renderResult.keyboardNav));
  deterministic.push(...evaluateComponents(renderResult.domSignals));
  deterministic.push(...evaluateDialogs(renderResult.domSignals.dialogs));
  deterministic.push(...evaluateMobile(renderResult.mobileSignals));
  deterministic.push(...evaluateDarkPatterns(renderResult.darkPatternSignals));
  deterministic.push(...evaluateTextResize(renderResult.textResizeSignals));
  deterministic.push(...(await validateMarkup(renderResult.finalUrl)));

  // Everything above ran while the AI review was in flight; collect it now.
  const aiReview = await aiReviewPromise;
  const findings = mergeFindings(automatedFindings, aiToFindings(aiReview.findings));
  findings.push(...deterministic);

  if (captureEvidence) {
    await attachEvidence(findings, renderResult, includeAiReview);
  }

  const summary = summarizeSeverity(findings);
  const score = computeScore(summary);
  const categorySummary = summarizeCategories(findings);
  const conformance = buildConformance(findings);

  return {
    url: safeUrl.toString(),
    scannedAt: new Date().toISOString(),
    score,
    summary,
    categorySummary,
    findings,
    screenReaderScript: renderResult.screenReaderScript,
    conformance,
    pagePreview: await downscalePreview(renderResult.screenshotBase64),
    meta: {
      axeVersion: renderResult.axe.testEngine?.version ?? "unknown",
      renderTimeMs: renderResult.renderTimeMs,
      aiReviewTimeMs: aiReview.aiReviewTimeMs,
      aiReviewStatus: aiReview.status,
      aiReviewErrorKind: aiReview.errorKind,
      model: aiReview.model,
    },
  };
}
