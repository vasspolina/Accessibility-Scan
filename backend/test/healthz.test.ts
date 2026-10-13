import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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
    const file = readFileSync(join(__dirname, "../public/widget-business.js"));
    expect(body.commit).toBe("b1a7dc7");
    expect(body.widgetBundle).toBe(createHash("sha256").update(file).digest("hex").slice(0, 12));
  });
});
