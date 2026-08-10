import type { FastifyInstance } from "fastify";
import { hasAnthropicKey, hasMailProvider } from "../config/env.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({
    status: "ok",
    aiReviewEnabled: hasAnthropicKey,
    // So the widget can tell "email isn't set up here" from "the send
    // failed" before it ever asks anyone to type an address.
    emailReportEnabled: hasMailProvider,
  }));
}
