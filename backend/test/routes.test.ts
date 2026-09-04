import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

/**
 * The HTTP layer, exercised with inject() — no port, no browser.
 *
 * Every bug found in the week the storage routes shipped lived here: the
 * CORS method list, the rate-limit budget, a query parse that silently
 * dropped a filter. The unit suites could not see any of them, and no test
 * of this kind existed. Each case below is one of those, or the shape of
 * one.
 */

let dir: string;
let app: FastifyInstance;
const ADMIN = "test-admin-token";

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-routes-"));
  process.env.DB_PATH = join(dir, "routes.db");
  process.env.DB_DURABLE = "false";
  process.env.ADMIN_TOKEN = ADMIN;
  process.env.ALLOWED_ORIGINS = "https://shop.test";
  process.env.RATE_LIMIT_MAX = "5";
  process.env.STORED_RATE_LIMIT_MAX = "120";
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

const report = (url: string, score = 70) => ({
  url,
  scannedAt: new Date().toISOString(),
  score,
  summary: { critical: 0, serious: 1, moderate: 0, minor: 0, total: 1 },
  categorySummary: { accessibility: 1, designClarity: 0, darkPattern: 0 },
  findings: [
    {
      id: "f1",
      source: "automated",
      severity: "serious",
      category: "accessibility",
      selector: "img",
      description: "d",
      suggestedFix: "f",
      ruleId: "image-alt",
      wcagCriterion: "1.1.1",
    },
  ],
  conformance: {
    standard: "WCAG 2.1 Level AA (EN 301 549)",
    failed: 1,
    noIssuesFound: 0,
    needsReview: 1,
    notMeasured: 0,
    total: 2,
    failedByLevel: { A: 1, AA: 0 },
    criteria: [
      { id: "1.1.1", name: "Non-text Content", level: "A", coverage: "automated", plain: "p", failing: "f", status: "failed", findingCount: 1 },
      { id: "1.2.2", name: "Captions (Prerecorded)", level: "A", coverage: "manual", plain: "Do your videos have captions?", failing: "f", status: "needs-review", findingCount: 0 },
    ],
  },
  meta: { axeVersion: "4", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "skipped_no_key" },
});

const auth = (key: string) => ({ authorization: `Bearer ${key}` });

async function mintKey(email: string): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/api/accounts", headers: auth(ADMIN), payload: { email } });
  expect(res.statusCode).toBe(200);
  return res.json().apiKey as string;
}

describe("what the deployer switched on", () => {
  it("says so, with how much there is", async () => {
    const res = await app.inject({ method: "GET", url: "/api/storage" });
    const { storage } = res.json();
    expect(storage.configured).toBe(true);
    expect(storage.durable).toBe(false);
    expect(storage.size).toMatchObject({ scans: expect.any(Number), accounts: expect.any(Number) });
    expect(storage.retention.scanDays).toBeGreaterThan(0);
    expect(storage.schemaVersion).toBeGreaterThanOrEqual(2);
  });
});

describe("the operator's door", () => {
  it("is closed without the admin token, and open only with it", async () => {
    expect((await app.inject({ method: "POST", url: "/api/accounts", payload: { email: "x@t.invalid" } })).statusCode).toBe(403);
    expect((await app.inject({ method: "GET", url: "/api/accounts", headers: auth("wrong") })).statusCode).toBe(403);
    const created = await app.inject({ method: "POST", url: "/api/accounts", headers: auth(ADMIN), payload: { email: "ops@t.invalid" } });
    expect(created.statusCode).toBe(200);
    expect(created.json().apiKey).toMatch(/^ascan_/);
    const list = await app.inject({ method: "GET", url: "/api/accounts", headers: auth(ADMIN) });
    expect(list.json().accounts.some((a: { email: string }) => a.email === "ops@t.invalid")).toBe(true);
  });

  it("deletes an account with everything it owns, and says what went", async () => {
    const key = await mintKey("gone@t.invalid");
    await app.inject({ method: "POST", url: "/api/scans", headers: auth(key), payload: report("https://gone.test/") });
    await app.inject({ method: "POST", url: "/api/verdicts", headers: auth(key), payload: { origin: "https://gone.test", criterion: "1.2.2", status: "not-applicable", decidedBy: "T" } });
    const me = await app.inject({ method: "GET", url: "/api/account", headers: auth(key) });
    const id = me.json().account.id;
    const del = await app.inject({ method: "DELETE", url: `/api/accounts/${id}`, headers: auth(ADMIN) });
    expect(del.statusCode).toBe(200);
    expect(del.json().removed).toEqual({ scans: 1, verdicts: 1, keys: 1 });
    // The key died with it.
    expect((await app.inject({ method: "GET", url: "/api/account", headers: auth(key) })).statusCode).toBe(401);
    expect((await app.inject({ method: "DELETE", url: `/api/accounts/${id}`, headers: auth(ADMIN) })).statusCode).toBe(404);
  });
});

describe("history", () => {
  it("needs a key, and refuses a wrong one", async () => {
    expect((await app.inject({ method: "GET", url: "/api/scans" })).statusCode).toBe(401);
    expect((await app.inject({ method: "GET", url: "/api/scans", headers: auth("ascan_nope") })).statusCode).toBe(401);
  });

  it("takes a report scanned elsewhere into the record", async () => {
    const key = await mintKey("cli@t.invalid");
    const saved = await app.inject({ method: "POST", url: "/api/scans", headers: auth(key), payload: report("https://cli.test/pricing") });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().savedAs).toBeTruthy();
    expect(saved.json().origin).toBe("https://cli.test");

    // A body that is not a report is not stored.
    const junk = await app.inject({ method: "POST", url: "/api/scans", headers: auth(key), payload: { hello: "world" } });
    expect(junk.statusCode).toBe(400);

    // The natural thing to ask with is the URL that was scanned.
    const byPage = await app.inject({ method: "GET", url: "/api/scans?origin=https://cli.test/pricing", headers: auth(key) });
    expect(byPage.json().scans).toHaveLength(1);
  });

  it("refuses a bad query rather than silently dropping the filter", async () => {
    const key = await mintKey("query@t.invalid");
    const res = await app.inject({ method: "GET", url: "/api/scans?origin=https://q.test&limit=abc", headers: auth(key) });
    expect(res.statusCode).toBe(400);
  });

  it("does not show one account another's scan", async () => {
    const a = await mintKey("a@t.invalid");
    const b = await mintKey("b@t.invalid");
    const saved = await app.inject({ method: "POST", url: "/api/scans", headers: auth(a), payload: report("https://a.test/") });
    const id = saved.json().savedAs;
    expect((await app.inject({ method: "GET", url: `/api/scans/${id}`, headers: auth(b) })).statusCode).toBe(404);
    expect((await app.inject({ method: "DELETE", url: `/api/scans/${id}`, headers: auth(b) })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: `/api/scans/${id}`, headers: auth(a) })).statusCode).toBe(200);
  });
});

describe("guided manual testing", () => {
  it("asks what the stored scan could not decide, records the answer, and exports it", async () => {
    const key = await mintKey("guided@t.invalid");
    await app.inject({ method: "POST", url: "/api/scans", headers: auth(key), payload: report("https://g.test/home") });

    const q1 = await app.inject({ method: "GET", url: "/api/verdicts/questions?origin=https://g.test/home", headers: auth(key) });
    expect(q1.statusCode).toBe(200);
    expect(q1.json().open).toBe(1);
    expect(q1.json().questions[0].criterion).toBe("1.2.2");

    const rec = await app.inject({
      method: "POST",
      url: "/api/verdicts",
      headers: auth(key),
      payload: { origin: "https://g.test", criterion: "1.2.2", status: "not-applicable", note: "No video.", decidedBy: "Tester", pageUrl: "https://g.test/home", answersCheck: "video-caption" },
    });
    expect(rec.statusCode).toBe(200);
    expect(rec.json().verdict.pageUrl).toBe("https://g.test/home");
    expect(rec.json().verdict.answersCheck).toBe("video-caption");

    const q2 = await app.inject({ method: "GET", url: "/api/verdicts/questions?origin=https://g.test", headers: auth(key) });
    expect(q2.json().open).toBe(0);
    expect(q2.json().answered).toBe(1);

    const exp = await app.inject({ method: "GET", url: "/api/account/export", headers: auth(key) });
    expect(exp.statusCode).toBe(200);
    expect(exp.json().scans).toHaveLength(1);
    expect(exp.json().verdicts[0].decidedBy).toBe("Tester");
  });

  it("refuses a criterion nothing reads, and a verdict nobody signed", async () => {
    const key = await mintKey("refuse@t.invalid");
    const bad = await app.inject({ method: "POST", url: "/api/verdicts", headers: auth(key), payload: { origin: "https://r.test", criterion: "9.9.9", status: "supports", decidedBy: "T" } });
    expect(bad.statusCode).toBe(400);
    const unsigned = await app.inject({ method: "POST", url: "/api/verdicts", headers: auth(key), payload: { origin: "https://r.test", criterion: "1.2.2", status: "supports", decidedBy: "" } });
    expect(unsigned.statusCode).toBe(400);
  });
});

describe("the browser can reach every route", () => {
  it("advertises DELETE to a page on an allowed origin", async () => {
    // It advertised "POST, GET" while two routes were DELETE. Both were
    // unreachable from a browser however correct the handler.
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/scans/abc",
      headers: { origin: "https://shop.test", "access-control-request-method": "DELETE", "access-control-request-headers": "authorization" },
    });
    expect(res.headers["access-control-allow-methods"]).toContain("DELETE");
    expect(res.headers["access-control-allow-origin"]).toBe("https://shop.test");
  });
});

describe("the two budgets", () => {
  it("gives a SQLite read a far larger allowance than a browser render", async () => {
    const key = await mintKey("budget@t.invalid");
    const read = await app.inject({ method: "GET", url: "/api/scans", headers: auth(key) });
    expect(Number(read.headers["x-ratelimit-limit"])).toBe(120);
    const scan = await app.inject({ method: "POST", url: "/api/scan", payload: { url: "not a url" } });
    expect(Number(scan.headers["x-ratelimit-limit"])).toBe(5);
  });
});
