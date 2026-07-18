import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { renderAndScan } from "../services/render/renderPage.js";
import { extractContext } from "../services/contextExtraction/extractContext.js";
import { reviewPage } from "../services/aiReview/reviewPage.js";
import { axeToFindings, aiToFindings, mergeFindings } from "../services/merge/mergeFindings.js";
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
    await attachElementScreenshots(findings, renderResult.boundingBoxes, renderResult.fullPageScreenshot);

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
