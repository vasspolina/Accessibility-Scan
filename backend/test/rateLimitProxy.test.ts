import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

/**
 * Behind Railway's edge every request arrives from the proxy's address. With
 * no proxy trust, every visitor shared that address's rate-limit budget. One
 * hop is trusted now: each visitor is counted by the address the proxy
 * appended, and anything a client writes into X-Forwarded-For itself sits to
 * the left of that, where it changes nothing.
 */

let dir: string;
let app: FastifyInstance;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-ratelimit-"));
  process.env.DB_PATH = join(dir, "r.db");
  process.env.DB_DURABLE = "false";
  process.env.RATE_LIMIT_MAX = "2";
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

// Every request comes from the same socket address — the proxy's. The
// limited route is a scan with an empty body: refused as invalid, but only
// after the limiter has counted it.
const scanFrom = (xff: string) =>
  app.inject({ method: "POST", url: "/api/scan", payload: {}, headers: { "x-forwarded-for": xff }, remoteAddress: "100.64.0.1" });
const getFrom = (xff: string, url: string) =>
  app.inject({ method: "GET", url, headers: { "x-forwarded-for": xff }, remoteAddress: "100.64.0.1" });
const chatFrom = (xff: string) =>
  app.inject({ method: "POST", url: "/api/chat", payload: {}, headers: { "x-forwarded-for": xff }, remoteAddress: "100.64.0.1" });

describe("rate limiting behind one proxy hop", () => {
  it("gives each visitor their own budget", async () => {
    expect((await scanFrom("203.0.113.1")).statusCode).toBe(400);
    expect((await scanFrom("203.0.113.1")).statusCode).toBe(400);
    expect((await scanFrom("203.0.113.1")).statusCode).toBe(429);
    // A second visitor through the same proxy is not affected.
    expect((await scanFrom("203.0.113.2")).statusCode).toBe(400);
  });

  it("cannot be dodged by writing your own X-Forwarded-For", async () => {
    // The proxy appends the real address after whatever the client sent.
    expect((await scanFrom("198.51.100.7, 203.0.113.9")).statusCode).toBe(400);
    expect((await scanFrom("198.51.100.8, 203.0.113.9")).statusCode).toBe(400);
    expect((await scanFrom("198.51.100.9, 203.0.113.9")).statusCode).toBe(429);
  });
});

/**
 * The deploy that brought proxy trust broke production: a page load is six
 * requests (page, script, widget, three fonts), every route was limited to
 * five a minute, and once each visitor was counted on their own the page
 * spent the budget before the first chat message — which answered 429.
 */
describe("what the budget is for", () => {
  it("never limits the widget's own files or the health check", async () => {
    for (let i = 0; i < 10; i++) {
      expect((await getFrom("203.0.113.20", "/healthz")).statusCode).toBe(200);
      expect((await getFrom("203.0.113.20", "/widget-business.js")).statusCode).not.toBe(429);
    }
  });

  it("gives the chat its own budget, past the scan's", async () => {
    // RATE_LIMIT_MAX is 2 here; the chat's is its own, 30 by default.
    for (let i = 0; i < 6; i++) expect((await chatFrom("203.0.113.30")).statusCode).toBe(400);
  });

  it("does not count the progress stream against the scan's budget", async () => {
    for (let i = 0; i < 4; i++) expect((await getFrom("203.0.113.40", "/api/scan/progress/x")).statusCode).toBe(400);
    expect((await scanFrom("203.0.113.40")).statusCode).toBe(400);
  });
});
