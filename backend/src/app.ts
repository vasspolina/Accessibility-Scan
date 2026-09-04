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
import { emailReportRoutes } from "./routes/emailReport.js";
import { auditRoutes } from "./routes/audit.js";
import { accountRoutes } from "./routes/account.js";
import { historyRoutes } from "./routes/history.js";
import { triageRoutes } from "./routes/triage.js";
import { scheduleRoutes } from "./routes/schedules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The application, separate from the process that listens.
 *
 * Split out so a test can build it and `inject()` requests without a port,
 * a browser, or a network. Every bug found in the week the storage routes
 * shipped — CORS methods, the rate-limit budget, a query parse that
 * silently dropped a filter — lived at this layer, where no unit test
 * could see it and no test of this kind existed.
 */
export async function buildApp() {
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
    // DELETE belongs here because two routes use it — removing a saved scan
    // and revoking an API key. Without it the browser's preflight is answered
    // "POST, GET" and both are unreachable from a page, however correct the
    // handler is. Measured: the preflight returned 204 with
    // access-control-allow-methods: POST, GET.
    methods: ["POST", "GET", "DELETE"],
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
  // Storage-backed routes. Registered unconditionally: each answers 501 with
  // what to set when DB_PATH is absent, which tells a client the feature
  // exists and is switched off — better than a 404 that reads as "this
  // product does not do that".
  await app.register(accountRoutes);
  await app.register(historyRoutes);
  await app.register(triageRoutes);
  await app.register(scheduleRoutes);
  await app.register(scanRoutes);
  await app.register(auditRoutes);
  await app.register(emailReportRoutes);
  return app;
}
