import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { buildApp } from "./app.js";
import { startScheduler, stopScheduler } from "./services/scheduler.js";
import { shutdownBrowserPool } from "./services/render/browserPool.js";

// Safety net: an unhandled rejection anywhere (e.g. a fire-and-forget
// Playwright event listener that throws) otherwise crashes the entire
// process by default in modern Node, taking down every in-flight scan with
// no trace beyond a bare stack trace on stderr. Log and keep running —
// these are isolated async failures, not corrupted shared state.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection — logging and continuing");
});
// A synchronous uncaught exception can leave the process in an undefined
// state, so exit deliberately after logging rather than keep running —
// Railway's restart policy (ON_FAILURE) brings it back up.
process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — exiting");
  process.exit(1);
});

const app = await buildApp();

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  stopScheduler();
  await shutdownBrowserPool();
  await app.close();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`Accessibility checker backend listening on http://${env.HOST}:${env.PORT}`);
  // After listen, so a slow first tick never delays the port opening.
  startScheduler();
} catch (err) {
  logger.error(err);
  process.exit(1);
}
