import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  process.env.RAILWAY_GIT_COMMIT_SHA = "b1a7dc72fcaa9a16b7b136e41cf734c9a7629633";
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe("/healthz build identity", () => {
  it("reports the deployed commit and a fingerprint of the served widget bundle", async () => {
    const body = (await app.inject({ method: "GET", url: "/healthz" })).json();
    expect(body.commit).toBe("b1a7dc7");
    // The bundle is built by the Docker image, not committed, so a checkout
    // has one only after `npm run build:widget-business`; without it the
    // fingerprint is null rather than an error.
    const bundle = join(__dirname, "../public/widget-business.js");
    const expected = existsSync(bundle)
      ? createHash("sha256").update(readFileSync(bundle)).digest("hex").slice(0, 12)
      : null;
    expect(body.widgetBundle).toBe(expected);
  });
});
