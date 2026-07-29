import { env } from "../config/env.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl } from "../middleware/ssrfGuard.js";
import { renderAndScan, captureSelectorsFresh } from "./render/renderPage.js";
import type { AxeRunResult } from "./render/renderPage.js";
import { extractContext } from "./contextExtraction/extractContext.js";
import { reviewPage } from "./aiReview/reviewPage.js";
import { attachAltTextSuggestions } from "./aiReview/suggestAltText.js";
import {
  axeToFindings,
  aiToFindings,
  mergeFindings,
  dropContradictedConsentClaims,
  dropDuplicateConsentClaims,
  dropSpeculativeFindings,
} from "./merge/mergeFindings.js";
import { evaluateTypography } from "./typography/analyzeTypography.js";
import { evaluateMotion } from "./motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "./keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "./components/analyzeComponents.js";
import { evaluateDialogs } from "./dialog/analyzeDialogs.js";
import { evaluateForcedColors } from "./forcedColors/analyzeForcedColors.js";
import { evaluateReadingOrder } from "./readingOrder/analyzeReadingOrder.js";
import { evaluateReadability } from "./readability/analyzeReadability.js";
import { evaluateMobile } from "./mobile/analyzeMobile.js";
import { evaluateDarkPatterns } from "./darkPatterns/analyzeDarkPatterns.js";
import { evaluateTextResize } from "./textResize/analyzeTextResize.js";
import { validateMarkup } from "./markup/validateMarkup.js";
import { summarizeSeverity, scoreFindings, summarizeCategories } from "./merge/scoring.js";
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

    // One selector per rule, because the report shows one picture per rule.
    // The widget groups every occurrence of an issue into a single card and
    // illustrates it with the first, so a page carrying twenty instances of
    // one axe rule could spend the entire capped budget on that one card and
    // leave nine other rules with nothing. Measured on moma.org: eleven
    // findings went unpictured while aria-allowed-role took the slots over
    // and over. Asking for one apiece fits nine more rules into the same
    // number of screenshots.
    //
    // The full list still follows the deduplicated head, so leftover budget
    // goes to the remaining instances rather than being thrown away.
    const seenRule = new Set<string>();
    const oneEach: typeof byImportance = [];
    const rest: typeof byImportance = [];
    for (const f of byImportance) {
      const key = f.ruleId ?? f.selector;
      if (seenRule.has(key)) rest.push(f);
      else {
        seenRule.add(key);
        oneEach.push(f);
      }
    }
    // A dark pattern is, by definition, something you can see. The whole
    // banner is the evidence: one prominent "Accept all" and no refusal
    // beside it is a claim the reader can check at a glance and can barely
    // check any other way. The height guard exists to stop a picture of a
    // whole page section standing in for a component, and it was rejecting
    // these — a consent banner's selector ends in a bare div and a banner is
    // taller than a control, so it failed both tests.
    //
    // Measured on bundesregierung.de: the missing-refusal finding arrived
    // with no picture and a note explaining that photographing a region
    // would not show which part was at fault. For this finding the region is
    // the part at fault.
    // Where the consent banner lives in a third-party frame, say so, or the
    // second visit resolves its path against the host document and photographs
    // whatever happens to sit there.
    const banner = renderResult.darkPatternSignals.consentBanner;
    const frameForSelector: Record<string, string> = {};
    if (banner?.frameUrl) {
      for (const f of unpictured) {
        if (f.ruleId?.startsWith("dark-consent-")) frameForSelector[f.selector] = originOfUrl(banner.frameUrl);
      }
    }
    const shots = await captureSelectorsFresh(
      renderResult.finalUrl,
      [...oneEach, ...rest].map((f) => f.selector),
      worthPicturingWhole(unpictured),
      frameForSelector
    );
    for (const finding of unpictured) {
      const shot = shots.shots[finding.selector];
      if (shot) {
        finding.elementScreenshot = shot;
        continue;
      }
      // No picture, and the page told us why. Nearly always this is correct
      // behaviour being reported honestly rather than a failure: a skip link
      // sits off-screen until it takes focus, a search panel has no size
      // until it opens. Without the note the reader is left with a finding
      // and nothing to identify it by.
      const why = shots.unpicturable[finding.selector];
      if (why === "hidden") {
        finding.pictureNote =
          "No picture: this was not visible on the page when it was scanned. It is revealed by something — opening a panel, or moving focus to it.";
      } else if (why === "offscreen") {
        finding.pictureNote =
          "No picture: this sits off the edge of the screen until it is used. Skip links are built this way on purpose, so nothing is necessarily wrong with it being there.";
      } else if (why === "no-usable-image") {
        finding.pictureNote =
          "No picture: the element is there, but photographing it produced nothing worth showing — a blank rectangle, or whatever is sitting on top of it. The technical details for this finding identify the exact element.";
      } else if (why === "too-large") {
        finding.pictureNote =
          "No picture: this covers a whole region of the page rather than one component, and a photograph of the entire section would not show you which part of it is at fault. The technical details for this finding identify the exact element.";
      } else if (why === "missing") {
        finding.pictureNote =
          "No picture: the element was on the page when we judged it, and gone when we went back to photograph it. Banners that appear once per visitor do this.";
      } else if (why === "not-attempted") {
        finding.pictureNote =
          "No picture: each scan photographs a limited number of elements, and this one was past that limit. Nothing about the element itself — scanning again may reach it.";
      } else if (why === "unreachable") {
        finding.pictureNote =
          "No picture: this element could not be located again on the return visit. Pages that rebuild themselves on every load do this.";
      }
      // Everything above ends by telling the reader the selector locates the
      // element exactly. For a banner in a third-party consent frame that is
      // not true: the path is through the frame's own document and means
      // something else in the page it sits on. Measured on spiegel.de, where
      // it matched two unrelated elements in the host page.
      if (finding.pictureNote && frameForSelector[finding.selector]) {
        finding.pictureNote =
          finding.pictureNote.replace(" The technical details for this finding identify the exact element.", "") +
          ` This banner is served inside a consent frame from ${frameForSelector[finding.selector]}, so the selector in the technical details is a path within that frame rather than within your own page.`;
      }
    }
  }

  // Runs last: it needs each flagged image's captured thumbnail to suggest alt
  // text from what the image actually shows.
  await attachAltTextSuggestions(findings, includeAiReview);
}

function originOfUrl(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * Which selectors may be photographed whole, ignoring the height guard.
 *
 * A dark pattern is, by definition, something you can see. The whole banner
 * is the evidence: one prominent "Accept all" with no refusal beside it is a
 * claim the reader can check at a glance and can barely check any other way.
 *
 * The height guard exists to stop a picture of an entire page section standing
 * in for a component, and it was rejecting exactly these — a consent banner's
 * selector ends in a bare div, and a banner is taller than a control, so it
 * failed both tests. Measured on bundesregierung.de, where the missing-refusal
 * finding arrived with no picture and a note explaining that photographing a
 * region would not show which part was at fault. For this finding, the region
 * is the part at fault.
 */
export function worthPicturingWhole(
  findings: readonly AccessibilityFinding[]
): (selector: string) => boolean {
  const whole = new Set(
    findings.filter((f) => f.category === "dark-pattern").map((f) => f.selector)
  );
  return (selector) => whole.has(selector) || selectorTargetsOneElement(selector);
}

/**
 * axe's undecided checks, one row per rule.
 *
 * Rolled up by rule rather than listed per element because the reader's next
 * move is the same for all of them: look at the text over that photograph and
 * judge it. Ninety-five separate rows would bury the report; one row saying
 * ninety-five places tells them the size of the job.
 *
 * frame-tested is dropped. It means axe could not reach into an iframe to test
 * it, which is a fact about the scan and not about the page — and it is
 * usually a third-party embed the owner cannot change anyway.
 */
export function summariseUndecided(axe: AxeRunResult): AccessibilityReport["undecidedChecks"] {
  const rows = (axe.incomplete ?? [])
    .filter((r) => r.id !== "frame-tested" && r.nodes.length > 0)
    .map((r) => ({
      ruleId: r.id,
      count: r.nodes.length,
      help: r.help,
      helpUrl: r.helpUrl,
    }))
    .sort((a, b) => b.count - a.count);
  return rows.length > 0 ? rows : undefined;
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
    score: scoreFindings(result.findings),
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
    // The page load is allowed RENDER_TIMEOUT_MS on its own, so the total has
    // to be that plus room for everything after it — otherwise a slow load
    // eats the whole allowance and the render fails with every finding
    // already in hand.
    //
    // It was RENDER_TIMEOUT_MS + 5s, which meant a page taking the full forty
    // seconds to load left five for axe, screenshots, the keyboard walk and
    // the mobile pass combined. moma.org failed at forty-six seconds twice in
    // a row on the deployed service while taking eight locally: the same page
    // that renders comfortably here is four or five times slower on a shared
    // CPU, and it was the arithmetic rather than the page that ran out.
    //
    // Signing in costs a page load of its own before the scan starts.
    env.RENDER_TIMEOUT_MS + (auth ? 55_000 : 35_000)
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
  deterministic.push(...evaluateReadingOrder(renderResult.readingOrder));
  deterministic.push(...evaluateReadability(renderResult.readability));
  deterministic.push(...evaluateMobile(renderResult.mobileSignals));
  deterministic.push(...evaluateDarkPatterns(renderResult.darkPatternSignals));
  deterministic.push(...evaluateTextResize(renderResult.textResizeSignals));
  deterministic.push(...(await validateMarkup(renderResult.finalUrl)));

  // Everything above ran while the AI review was in flight; collect it now.
  const aiReview = await aiReviewPromise;
  // The model is told that matching accept/reject buttons are correct, and it
  // has still claimed the opposite. Where the page was measured, the
  // measurement decides.
  //
  // Then anything the model was not sure of. Its own confidence rating was
  // being carried into the report and never read, so a guess and a certainty
  // printed identically.
  //
  // And where a deterministic rule already proved the same consent problem,
  // the model's retelling of it goes: two cards for one fault inflate the
  // count the score is built on, and the measured one carries the picture.
  const aiFindings = dropSpeculativeFindings(
    dropDuplicateConsentClaims(
      dropContradictedConsentClaims(
        aiToFindings(aiReview.findings),
        renderResult.darkPatternSignals.consentBanner
      ),
      deterministic
    )
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
  // AAA findings stay in the report and in the triage counts. They are good
  // advice and WCAG 2.2 makes several of them requirements. They simply do not
  // move a number that claims to describe A/AA conformance — see scoreFindings.
  const score = scoreFindings(findings);
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
    undecidedChecks: summariseUndecided(renderResult.axe),
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
