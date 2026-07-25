import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { TimeoutError } from "../utils/timeout.js";
import { RebindingDetectedError, SiteBlockedError } from "../services/render/renderPage.js";
import { AuthError } from "../services/auth/authenticate.js";
import { scanUrlToReport } from "../services/scanPipeline.js";
import type { AccessibilityReport } from "../types/report.js";

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

    let report: AccessibilityReport;
    try {
      // One pipeline, shared with the crawler. It used to be duplicated here,
      // and the copies drifted: fixes landed in one and silently missed the
      // other, which is exactly how a scan and a crawl of the same page ended
      // up disagreeing. HTTP concerns stay in this route; analysis does not.
      report = await scanUrlToReport(
        parsedBody.data.url,
        parsedBody.data.includeAiReview,
        parsedBody.data.auth
      );
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        return reply.status(400).send({ error: err.message });
      }
      if (err instanceof AuthError) {
        // The message is written to be safe to show and never contains the
        // credentials themselves.
        return reply.status(401).send({ error: err.message });
      }
      if (err instanceof RebindingDetectedError) {
        // Don’t echo the resolved IP back to the caller — log it server-side
        // only, return the same generic rejection as the upfront SSRF guard.
        logger.warn({ err, url: parsedBody.data.url }, "DNS rebinding detected mid-navigation");
        return reply.status(400).send({ error: "This host is not allowed" });
      }
      if (err instanceof SiteBlockedError) {
        // The target refused the scanner — an honest "couldn’t check" beats a
        // report scored against the site’s bot-block page. The `blocked` flag
        // lets the widget show sign-in / allowlist guidance instead of a bare
        // error, since this isn’t the user’s mistake to fix.
        logger.info({ url: parsedBody.data.url }, "Target site blocked the scanner");
        return reply.status(422).send({ error: err.message, blocked: true });
      }
      // Two unrelated classes end up here. Ours comes from the withTimeout
      // wrapper around the whole render; Playwright throws its own, with the
      // same name, when a single operation overruns. Checking only for ours
      // let a Playwright timeout fall through to the generic 502, so the
      // reader got "Could not load or scan the page" for what was plainly a
      // slow page — and the widget then retried it twice.
      const isTimeout =
        err instanceof TimeoutError || (err as { name?: string } | null)?.name === "TimeoutError";
      if (isTimeout) {
        // Distinct from a generic failure on purpose. "Could not load or scan
        // the page" tells the reader nothing about what to do; "it took too
        // long" tells them it is worth another try. The timedOut flag also
        // stops the widget retrying, which used to spend three full render
        // budgets arriving at the same answer.
        logger.info({ url: parsedBody.data.url }, "Render timed out");
        return reply.status(504).send({
          error:
            "This page took too long to load, so the check stopped. Very heavy pages sometimes need a second attempt.",
          timedOut: true,
        });
      }
      logger.warn({ err, url: parsedBody.data.url }, "Scan failed");
      return reply.status(502).send({
        error: "Could not load or scan the page",
        details: err instanceof Error ? err.message : String(err),
      });
    }

    return reply.send(report);
  });
}
