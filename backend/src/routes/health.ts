import type { FastifyInstance } from "fastify";
import { hasAnthropicKey } from "../config/env.js";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({
    status: "ok",
    aiReviewEnabled: hasAnthropicKey,
  }));
}
