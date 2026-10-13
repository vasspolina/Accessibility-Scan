import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import { hasAnthropicKey, hasMailProvider } from "../config/env.js";

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public");

// Which build is live: the commit Railway deployed and a fingerprint of the
// widget bundle it serves. "Still the old design" has two causes (the service
// is on an old commit, or it is on the new one and something caches), and
// these two values tell them apart from one request.
let bundleHash: Promise<string | null> | undefined;
function widgetBundleHash(): Promise<string | null> {
  bundleHash ??= readFile(path.join(publicDir, "widget-business.js"))
    .then((b) => createHash("sha256").update(b).digest("hex").slice(0, 12))
    .catch(() => null);
  return bundleHash;
}

export async function healthRoutes(app: FastifyInstance) {
  app.get("/healthz", async () => ({
    status: "ok",
    aiReviewEnabled: hasAnthropicKey,
    // So the widget can tell "email isn't set up here" from "the send
    // failed" before it ever asks anyone to type an address.
    emailReportEnabled: hasMailProvider,
    commit: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    widgetBundle: await widgetBundleHash(),
  }));
}
