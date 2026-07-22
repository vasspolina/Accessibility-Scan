import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { renderAndScan, RebindingDetectedError } from "../services/render/renderPage.js";
import { extractContext } from "../services/contextExtraction/extractContext.js";
import { reviewPage } from "../services/aiReview/reviewPage.js";
import { attachAltTextSuggestions } from "../services/aiReview/suggestAltText.js";
import { axeToFindings, aiToFindings, mergeFindings } from "../services/merge/mergeFindings.js";
import { evaluateTypography } from "../services/typography/analyzeTypography.js";
import { summarizeSeverity, computeScore, summarizeCategories } from "../services/merge/scoring.js";
import { attachElementScreenshots } from "../services/render/cropThumbnail.js";
import type { AccessibilityReport } from "../types/report.js";

const scanBodySchema = z.object({
  url: z.string().min(1, "url is required"),
  // Lets the embedder opt out of the AI judgment layer per-scan (faster,
  // cheaper — automated axe-core findings only). Defaults to on.
  includeAiReview: z.boolean().optional().default(true),
});

export async function scanRoutes(app: FastifyInstance) {
  app.post("/api/scan", async (request, reply) => {
    const parsedBody = scanBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.status(400).send({ error: "Invalid request body", details: parsedBody.error.flatten() });
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
        renderAndScan(safeUrl.toString()),
        env.RENDER_TIMEOUT_MS + 5000,
        "Page render"
      );
    } catch (err) {
      if (err instanceof RebindingDetectedError) {
        // Don't echo the resolved IP back to the caller — log it server-side
        // only, return the same generic rejection as the upfront SSRF guard.
        logger.warn({ err, url: safeUrl.toString() }, "DNS rebinding detected mid-navigation");
        return reply.status(400).send({ error: "This host is not allowed" });
      }
      logger.warn({ err, url: safeUrl.toString() }, "Render/axe layer failed");
      return reply.status(502).send({
        error: "Could not load or scan the page",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    const context = extractContext(safeUrl.toString(), renderResult);
    const aiReview = await reviewPage(context, renderResult.screenshotBase64, parsedBody.data.includeAiReview);

    const automatedFindings = axeToFindings(renderResult.axe);
    const aiFindings = aiToFindings(aiReview.findings);
    const findings = mergeFindings(automatedFindings, aiFindings);
    // Micro-typography checks (letterspacing, line length, leading, justified
    // text) — deterministic, category "design-clarity", so they surface in
    // the report without affecting the WCAG accessibility score.
    findings.push(...evaluateTypography(renderResult.typographyBlocks));
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

    const report: AccessibilityReport = {
      url: safeUrl.toString(),
      scannedAt: new Date().toISOString(),
      score,
      summary,
      categorySummary,
      findings,
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
