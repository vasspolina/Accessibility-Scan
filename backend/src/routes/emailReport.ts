import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env, hasMailProvider } from "../config/env.js";
import { accessibilityReportSchema } from "../types/report.js";
import { sendReportEmail } from "../services/mail/sendReport.js";

/* The recipient. z.string().email() is the whole validation, deliberately:
   anything cleverer rejects addresses that are legal and deliverable, and
   the provider is the only thing that actually knows. Capped because a
   header of unbounded length is worth nothing to anyone. */
const bodySchema = z.object({
  to: z.string().email().max(254),
  report: accessibilityReportSchema,
});

export async function emailReportRoutes(app: FastifyInstance) {
  app.post(
    "/api/report/email",
    {
      config: {
        /* Its own budget, far tighter than the global one. This is the only
           route that sends mail to an address the caller picks, so it is
           the only one that can be pointed at someone else. */
        rateLimit: {
          max: env.MAIL_RATE_LIMIT_MAX,
          timeWindow: env.MAIL_RATE_LIMIT_WINDOW_MS,
        },
      },
    },
    async (request, reply) => {
      /* Answered before the body is even read: there is nothing to validate
         if the feature has no provider behind it, and 503 with a named
         reason lets the widget say "not set up yet" instead of showing a
         failure that looks like the visitor's fault. */
      if (!hasMailProvider) {
        return reply.status(503).send({ error: "not_configured" });
      }

      const parsed = bodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "invalid_request" });
      }

      const result = await sendReportEmail(parsed.data.to, parsed.data.report);
      if (result.ok) return reply.send({ ok: true });
      if (result.reason === "not_configured") {
        return reply.status(503).send({ error: "not_configured" });
      }
      /* 502, not 500: the failure is the mail provider's, and saying so
         keeps this service's own error budget honest. */
      return reply.status(502).send({ error: result.reason });
    }
  );
}
