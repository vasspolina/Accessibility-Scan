import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scan.js";
import { shutdownBrowserPool } from "./services/render/browserPool.js";

const app = Fastify({ loggerInstance: logger, bodyLimit: 1_048_576 });

const allowedOrigins = env.ALLOWED_ORIGINS === "*" ? true : env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

await app.register(helmet);
await app.register(cors, {
  origin: allowedOrigins,
  methods: ["POST", "GET"],
  credentials: false,
});
await app.register(sensible);
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_WINDOW_MS,
});

app.setErrorHandler(errorHandler);

await app.register(healthRoutes);
await app.register(scanRoutes);

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  await shutdownBrowserPool();
  await app.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`Accessibility checker backend listening on http://${env.HOST}:${env.PORT}`);
} catch (err) {
  logger.error(err);
  process.exit(1);
}
