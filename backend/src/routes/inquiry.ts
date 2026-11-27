import type { FastifyInstance } from "fastify";
import { env, hasMailProvider } from "../config/env.js";
import { nextBodySchema, nextStep, sendBodySchema, sendInquiry } from "../services/inquiry/inquiry.js";

/**
 * The studio site's request form (see services/inquiry/inquiry.ts).
 *
 * POST /api/inquiry/next  the assistant's next question, or the brief
 * POST /api/inquiry       send the request to the studio
 *
 * The client holds the conversation and sends it whole each time, so there
 * is no session and nothing is stored here.
 */
export async function inquiryRoutes(app: FastifyInstance) {
  app.post(
    "/api/inquiry/next",
    // A step costs a model call, like a chat message, and a request takes
    // at most four of them.
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      const parsed = nextBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });
      return reply.send(await nextStep(parsed.data.request, parsed.data.answers));
    }
  );

  app.post(
    "/api/inquiry",
    // The mail budget: this route sends mail, though only ever to the studio.
    { config: { rateLimit: { max: env.MAIL_RATE_LIMIT_MAX, timeWindow: env.MAIL_RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      // Before the body is read, as in emailReport.ts: 503 with a named
      // reason lets the form fall back to the visitor's own mail app
      // instead of showing a failure that looks like their fault.
      if (!hasMailProvider) return reply.status(503).send({ error: "not_configured" });

      const raw = request.body as { company_url?: unknown } | null;
      // The trap field was filled in: answer as if it worked, send nothing.
      if (raw && typeof raw.company_url === "string" && raw.company_url.length > 0) {
        return reply.send({ ok: true });
      }

      const parsed = sendBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });

      const result = await sendInquiry(parsed.data);
      if (result.ok) return reply.send({ ok: true });
      if (result.reason === "not_configured") return reply.status(503).send({ error: "not_configured" });
      return reply.status(502).send({ error: result.reason });
    }
  );
}
