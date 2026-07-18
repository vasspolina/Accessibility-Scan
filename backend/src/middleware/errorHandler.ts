import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { logger } from "../utils/logger.js";

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error.validation) {
    reply.status(400).send({ error: "Invalid request", details: error.message });
    return;
  }

  // Plugin-raised errors (rate-limit, sensible, etc.) carry their own
  // intended statusCode — respect it instead of collapsing everything to
  // 500, or 429s and similar get reported as generic server errors.
  const statusCode = typeof error.statusCode === "number" ? error.statusCode : 500;
  if (statusCode < 500) {
    reply.status(statusCode).send({ error: error.message });
    return;
  }

  logger.error({ err: error, path: request.url }, "Unhandled request error");
  reply.status(500).send({ error: "Internal server error" });
}
