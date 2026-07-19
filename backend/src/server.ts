import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import staticFiles from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { healthRoutes } from "./routes/health.js";
import { scanRoutes } from "./routes/scan.js";
import { shutdownBrowserPool } from "./services/render/browserPool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ loggerInstance: logger, bodyLimit: 1_048_576 });

const allowedOrigins = env.ALLOWED_ORIGINS === "*" ? true : env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

await app.register(helmet, {
  // helmet's default Cross-Origin-Resource-Policy is "same-origin", which
  // browsers enforce even for plain <script src> tags — it would silently
  // block every client site from loading widget.js from this server. This
  // whole service exists to be embedded cross-origin on arbitrary client
  // sites (same reason CORS below is wide open), so "cross-origin" is the
  // correct policy here, not a weakening of anything.
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
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
// Serves the built widget bundle (backend/public/widget.js, produced by
// `npm run build:widget`) at the server root.
await app.register(staticFiles, {
  root: path.join(__dirname, "../public"),
  prefix: "/",
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
