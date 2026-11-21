import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";

/** Neither the model nor the pilot is set up: both say so, and nothing fails. */

let app: FastifyInstance;
beforeAll(async () => {
  delete process.env.LOCAL_LLM_URL;
  delete process.env.DB_PATH;
  delete process.env.MAIL_API_KEY;
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});
afterAll(async () => {
  await app.close();
});

describe("without LOCAL_LLM_URL, storage or mail", () => {
  it("the rewrite reports itself as not set up", async () => {
    const { rewriteFindings } = await import("../src/services/plainLanguage/rewriteFindings.js");
    const r = await rewriteFindings([], "en", true);
    expect(r.meta.status).toBe("not_configured");
    expect(r.meta.model).toBeUndefined();
  });

  it("/healthz names no model and a closed pilot", async () => {
    const body = (await app.inject({ method: "GET", url: "/healthz" })).json();
    expect(body.plainLanguageModel).toBeNull();
    expect(body.pilotOpen).toBe(false);
  });

  it("the pilot is closed while a report would have nowhere to go", async () => {
    expect((await app.inject({ method: "GET", url: "/api/pilot" })).json()).toMatchObject({ open: false, model: null });
    const res = await app.inject({ method: "POST", url: "/api/pilot/draft", payload: {} });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("pilot_closed");
  });
});
