import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { describeScanFailure } from "../services/scanFailure.js";
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
      // Every branch of this used to live here, and the crawler had its own
      // much poorer copy. One classifier now serves both, so the two can no
      // longer disagree about what a failure means.
      const failure = describeScanFailure(err);
      if (failure.logLevel === "warn") {
        logger.warn({ err, url: parsedBody.data.url }, "Scan failed");
      } else {
        logger.info({ url: parsedBody.data.url }, failure.message);
      }
      return reply.status(failure.status).send({
        error: failure.message,
        ...(failure.blocked ? { blocked: true } : {}),
        ...(failure.timedOut ? { timedOut: true } : {}),
        // Only on a genuine unknown, and only server-side detail that is safe
        // to show: the classified cases already say everything useful.
        ...(failure.status === 502
          ? { details: err instanceof Error ? err.message : String(err) }
          : {}),
      });
    }

    return reply.send(report);
  });
}
