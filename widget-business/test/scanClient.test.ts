import { describe, it, expect, afterEach } from "vitest";
import { scanUrl, ScanError } from "../src/api/scanClient";

// Retry behaviour is worth pinning down: a wrong call here is invisible in the
// UI and only shows up as a scan that takes three times as long to fail.
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

function mockFetch(responses: Array<{ status: number; body: unknown }>) {
  let calls = 0;
  globalThis.fetch = (async () => {
    const next = responses[Math.min(calls, responses.length - 1)];
    calls++;
    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return () => calls;
}

describe("scanUrl retries", () => {
  it("retries a plain gateway error, which usually means a restart", async () => {
    const calls = mockFetch([{ status: 502, body: { error: "bad gateway" } }]);
    await expect(scanUrl("http://api", "https://example.com", false)).rejects.toBeInstanceOf(ScanError);
    expect(calls()).toBe(3);
  });

  // The whole point: a timeout is a real answer about this page. Retrying it
  // spends another full render budget to fail in exactly the same way.
  it("does not retry a render timeout", async () => {
    const calls = mockFetch([
      { status: 504, body: { error: "This page took too long to load, so the check stopped.", timedOut: true } },
    ]);
    await expect(scanUrl("http://api", "https://example.com", false)).rejects.toThrow(/took too long/);
    expect(calls()).toBe(1);
  });

  it("passes the timeout message through rather than a status code", async () => {
    mockFetch([{ status: 504, body: { error: "This page took too long to load.", timedOut: true } }]);
    await expect(scanUrl("http://api", "https://example.com", false)).rejects.toThrow(
      "This page took too long to load."
    );
  });

  it("does not retry a blocked site either, and flags it for the guidance panel", async () => {
    const calls = mockFetch([{ status: 422, body: { error: "the site refused us", blocked: true } }]);
    await expect(scanUrl("http://api", "https://example.com", false)).rejects.toMatchObject({
      blocked: true,
    });
    expect(calls()).toBe(1);
  });

  it("returns the report when the scan succeeds", async () => {
    mockFetch([{ status: 200, body: { url: "https://example.com", score: 80 } }]);
    await expect(scanUrl("http://api", "https://example.com", false)).resolves.toMatchObject({
      score: 80,
    });
  });
});
