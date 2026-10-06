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

// Every request comes from the same socket address — the proxy's.
const fromVisitor = (xff: string) =>
  app.inject({ method: "GET", url: "/healthz", headers: { "x-forwarded-for": xff }, remoteAddress: "100.64.0.1" });

describe("rate limiting behind one proxy hop", () => {
  it("gives each visitor their own budget", async () => {
    expect((await fromVisitor("203.0.113.1")).statusCode).toBe(200);
    expect((await fromVisitor("203.0.113.1")).statusCode).toBe(200);
    expect((await fromVisitor("203.0.113.1")).statusCode).toBe(429);
    // A second visitor through the same proxy is not affected.
    expect((await fromVisitor("203.0.113.2")).statusCode).toBe(200);
  });

  it("cannot be dodged by writing your own X-Forwarded-For", async () => {
    // The proxy appends the real address after whatever the client sent.
    expect((await fromVisitor("198.51.100.7, 203.0.113.9")).statusCode).toBe(200);
    expect((await fromVisitor("198.51.100.8, 203.0.113.9")).statusCode).toBe(200);
    expect((await fromVisitor("198.51.100.9, 203.0.113.9")).statusCode).toBe(429);
  });
});
