import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { renderAndScan, RebindingDetectedError, SiteBlockedError } from "../services/render/renderPage.js";
import { AuthError } from "../services/auth/authenticate.js";
import { extractContext } from "../services/contextExtraction/extractContext.js";
import { reviewPage } from "../services/aiReview/reviewPage.js";
import { attachAltTextSuggestions } from "../services/aiReview/suggestAltText.js";
import { axeToFindings, aiToFindings, mergeFindings } from "../services/merge/mergeFindings.js";
import { evaluateTypography } from "../services/typography/analyzeTypography.js";
import { evaluateMotion } from "../services/motion/analyzeMotion.js";
import { evaluateKeyboardNav } from "../services/keyboard/analyzeKeyboard.js";
import { evaluateComponents } from "../services/components/analyzeComponents.js";
import { evaluateDialogs } from "../services/dialog/analyzeDialogs.js";
import { evaluateMobile } from "../services/mobile/analyzeMobile.js";
import { evaluateDarkPatterns } from "../services/darkPatterns/analyzeDarkPatterns.js";
import { evaluateTextResize } from "../services/textResize/analyzeTextResize.js";
import { validateMarkup } from "../services/markup/validateMarkup.js";
import { summarizeSeverity, computeScore, summarizeCategories } from "../services/merge/scoring.js";
import { buildConformance } from "../services/conformance/buildConformance.js";
import { downscalePreview } from "../services/render/downscalePreview.js";
import { attachElementScreenshots } from "../services/render/cropThumbnail.js";
import type { AccessibilityFinding, AccessibilityReport } from "../types/report.js";

// Sign-in details for scanning pages behind a login. Accepted per request,
// held in memory for one scan, and never stored, logged, or included in the
// report. See services/auth/authenticate.ts for the full handling rules.
const authSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cookies"),
    cookies: z
      .array(
        z.object({
          name: z.string().min(1),
          value: z.string(),
          domain: z.string().optional(),
          path: z.string().optional(),
        })
      )
      .min(1)
      .max(50),
  }),
  z.object({
    kind: z.literal("form"),
    loginUrl: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    usernameSelector: z.string().optional(),
    passwordSelector: z.string().optional(),
    submitSelector: z.string().optional(),
  }),
]);

const scanBodySchema = z.object({
  url: z.string().min(1, "url is required"),
  auth: authSchema.optional(),
  // Lets the embedder opt out of the AI judgment layer per-scan (faster,
  // cheaper — automated axe-core findings only). Defaults to on.
  includeAiReview: z.boolean().optional().default(true),
});

export async function scanRoutes(app: FastifyInstance) {
  app.post("/api/scan", async (request, reply) => {
    const parsedBody = scanBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      // Zod's flattened errors quote parts of the input, and the input may
      // contain a password. Echo the detail only when no credentials were
      // sent; otherwise say nothing beyond "invalid".
      const hasAuth =
        typeof request.body === "object" && request.body !== null && "auth" in request.body;
      return reply.status(400).send({
        error: "Invalid request body",
        ...(hasAuth ? {} : { details: parsedBody.error.flatten() }),
      });
    }

    let safeUrl: URL;
    try {
      safeUrl = await assertSafeUrl(parsedBody.data.url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        return reply.status(400).send({ error: err.message });
      }
      throw err;
    }

    let renderResult;
    try {
      renderResult = await withTimeout(
        // Sign-in, when supplied, happens inside the render call so the
        // session lives and dies with that throwaway browser context.
        renderAndScan(safeUrl.toString(), parsedBody.data.auth),
        // Signing in costs a page load of its own before the scan starts.
        env.RENDER_TIMEOUT_MS + (parsedBody.data.auth ? 25_000 : 5000),
        "Page render"
      );
    } catch (err) {
      if (err instanceof AuthError) {
        // The message is written to be safe to show and never contains the
        // credentials themselves.
        return reply.status(401).send({ error: err.message });
      }
      if (err instanceof RebindingDetectedError) {
        // Don't echo the resolved IP back to the caller — log it server-side
        // only, return the same generic rejection as the upfront SSRF guard.
        logger.warn({ err, url: safeUrl.toString() }, "DNS rebinding detected mid-navigation");
        return reply.status(400).send({ error: "This host is not allowed" });
      }
      if (err instanceof SiteBlockedError) {
        // The target refused the scanner — an honest "couldn't check" beats
        // a report scored against the site's bot-block page.
        logger.info({ url: safeUrl.toString() }, "Target site blocked the scanner");
        return reply.status(422).send({ error: err.message });
      }
      logger.warn({ err, url: safeUrl.toString() }, "Render/axe layer failed");
      return reply.status(502).send({
        error: "Could not load or scan the page",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const context = extractContext(safeUrl.toString(), renderResult);
    // Started but deliberately not awaited yet: the AI review is the single
    // longest step (~20s), and none of the deterministic layers below depend
    // on it. Letting it run while we evaluate them and validate the markup
    // takes its cost off the critical path instead of adding to it.
    const aiReviewPromise = reviewPage(
      context,
      renderResult.screenshotBase64,
      parsedBody.data.includeAiReview
    );

    const automatedFindings = axeToFindings(renderResult.axe);
    const deterministic: AccessibilityFinding[] = [];
    // Micro-typography checks (letterspacing, line length, leading, justified
    // text) — deterministic, category "design-clarity", so they surface in
    // the report without affecting the WCAG accessibility score.
    deterministic.push(...evaluateTypography(renderResult.typographyBlocks));
    // Motion/animation checks (marquee, autoplay media, endless animations
    // ignoring reduced-motion) — category "accessibility" (WCAG 2.2.2), so
    // these DO affect the score. axe rule ids are passed in so overlapping
    // axe findings (marquee, no-autoplay-audio) aren't reported twice.
    deterministic.push(
      ...evaluateMotion(
        renderResult.domSignals.animatedElements,
        renderResult.domSignals.respectsReducedMotion,
        new Set(automatedFindings.map((f) => f.ruleId).filter((r): r is string => Boolean(r)))
      )
    );
    // Keyboard walk-through results (real Tab presses during render) —
    // category "accessibility" (WCAG 2.4.7 / 2.1.2), affects the score.
    deterministic.push(...evaluateKeyboardNav(renderResult.keyboardNav));
    // Component design suggestions (forms, menus) grounded in the ARIA
    // Authoring Practices — design-clarity recommendations, not score hits.
    deterministic.push(...evaluateComponents(renderResult.domSignals));
    // Modal / pop-up dialog checks (unlabelled close button, unmarked
    // overlay, nameless dialog) — ARIA dialog pattern. The unlabelled-close
    // and nameless-dialog rules are accessibility (WCAG 4.1.2); the rest are
    // design-clarity suggestions.
    deterministic.push(...evaluateDialogs(renderResult.domSignals.dialogs));
    // Mobile-only checks from the phone-width render pass (sideways scrolling,
    // tap targets too small) — category "accessibility" (WCAG 1.4.10 / 2.5.8).
    deterministic.push(...evaluateMobile(renderResult.mobileSignals));
    deterministic.push(...evaluateDarkPatterns(renderResult.darkPatternSignals));
    deterministic.push(...evaluateTextResize(renderResult.textResizeSignals));
    // Raw-HTML markup validation — one grouped design-clarity note.
    deterministic.push(...(await validateMarkup(renderResult.finalUrl)));

    // Everything above ran while the AI review was in flight; collect it now.
    const aiReview = await aiReviewPromise;
    const findings = mergeFindings(automatedFindings, aiToFindings(aiReview.findings));
    findings.push(...deterministic);
    await attachElementScreenshots(
      findings,
      renderResult.boundingBoxes,
      renderResult.fullPageScreenshot,
      renderResult.elementScreenshots
    );

    // Runs after screenshots are attached — it needs each flagged image's
    // captured thumbnail to suggest alt text from what the image actually
    // shows. Gated on the same AI opt-in flag; best-effort and non-fatal.
    await attachAltTextSuggestions(findings, parsedBody.data.includeAiReview);

    // score/summary reflect accessibility-category findings only; design-clarity
    // and dark-pattern findings are reported via categorySummary instead.
    const summary = summarizeSeverity(findings);
    const score = computeScore(summary);
    const categorySummary = summarizeCategories(findings);
    const conformance = buildConformance(findings);

    const report: AccessibilityReport = {
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

    return reply.send(report);
  });
}
