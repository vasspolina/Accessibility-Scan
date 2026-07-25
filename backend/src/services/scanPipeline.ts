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
import type { AccessibilityReport } from "../types/report.js";

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
  includeAiReview: boolean
): Promise<AccessibilityReport> {
  const safeUrl = await assertSafeUrl(rawUrl);

  const renderResult = await withTimeout(
    renderAndScan(safeUrl.toString()),
    env.RENDER_TIMEOUT_MS + 5000,
    "Page render"
  );

  const context = extractContext(safeUrl.toString(), renderResult);
  const aiReview = await reviewPage(context, renderResult.screenshotBase64, includeAiReview);

  const automatedFindings = axeToFindings(renderResult.axe);
  const aiFindings = aiToFindings(aiReview.findings);
  const findings = mergeFindings(automatedFindings, aiFindings);

  findings.push(...evaluateTypography(renderResult.typographyBlocks));
  findings.push(
    ...evaluateMotion(
      renderResult.domSignals.animatedElements,
      renderResult.domSignals.respectsReducedMotion,
      new Set(automatedFindings.map((f) => f.ruleId).filter((r): r is string => Boolean(r)))
    )
  );
  findings.push(...evaluateKeyboardNav(renderResult.keyboardNav));
  findings.push(...evaluateComponents(renderResult.domSignals));
  findings.push(...evaluateDialogs(renderResult.domSignals.dialogs));
  findings.push(...evaluateMobile(renderResult.mobileSignals));
  findings.push(...evaluateDarkPatterns(renderResult.darkPatternSignals));
  findings.push(...evaluateTextResize(renderResult.textResizeSignals));
  findings.push(...(await validateMarkup(renderResult.finalUrl)));

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
  // of the field. Best-effort: on failure the findings simply show as before.
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
  await attachAltTextSuggestions(findings, includeAiReview);

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
      model: aiReview.model,
    },
  };
}
