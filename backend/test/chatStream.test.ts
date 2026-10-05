import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

/**
 * The chat route's streaming path, end to end, with Claude replaced by a
 * scripted stream. The route once aborted every model call the moment it
 * started — it listened for the request's "close", which a POST emits as
 * soon as its body is read — and the response never ended. Validation
 * tests could not see that; only a test that waits for the end can.
 */

const oneScan = {
  content: [
    { type: "text", text: "Checking example.com now." },
    { type: "tool_use", id: "toolu_1", name: "start_scan", input: { url: "example.com", scope: "page", ai_review: false } },
  ],
  stop_reason: "tool_use",
};

// Parallel tool use is on by default: "check a.com and b.org" can come back
// as two start_scan calls in one turn.
const twoScans = {
  content: [
    { type: "text", text: "Checking both." },
    { type: "tool_use", id: "toolu_a", name: "start_scan", input: { url: "a.com", scope: "page", ai_review: false } },
    { type: "tool_use", id: "toolu_b", name: "start_scan", input: { url: "b.org", scope: "page", ai_review: false } },
  ],
  stop_reason: "tool_use",
};

let script: typeof oneScan = oneScan;

vi.mock("../src/services/aiReview/claudeClient.js", () => ({
  CLAUDE_MODEL: "test",
  getClaudeClient: () => ({
    beta: {
      messages: {
        stream: () => {
          let aborted = false;
          return {
            get aborted() {
              return aborted;
            },
            abort() {
              aborted = true;
            },
            async *[Symbol.asyncIterator]() {
              for (const word of ["Checking ", "example.com ", "now."]) {
                await new Promise((r) => setTimeout(r, 10));
                if (aborted) throw new Error("aborted");
                yield { type: "content_block_delta", delta: { type: "text_delta", text: word } };
              }
            },
            async finalMessage() {
              if (aborted) throw new Error("aborted");
              return script;
            },
          };
        },
      },
    },
  }),
}));

let dir: string;
let app: FastifyInstance;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-chatstream-"));
  process.env.DB_PATH = join(dir, "s.db");
  process.env.DB_DURABLE = "false";
  process.env.RATE_LIMIT_MAX = "100";
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
}, 30_000);

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

let address: string;
async function chat(): Promise<Response> {
  address ??= await app.listen({ port: 0, host: "127.0.0.1" });
  return fetch(`${address}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ role: "user", content: "Can you check example.com?" }] }),
    signal: AbortSignal.timeout(8_000),
  });
}

describe("POST /api/chat streaming", () => {
  it("names the first of two scans asked for in one turn, and passes both calls back", async () => {
    script = twoScans;
    try {
      const body = await (await chat()).text();
      const payload = JSON.parse(/event: done\ndata: (.+)\n/.exec(body)![1]);
      expect(payload.scan.toolUseId).toBe("toolu_a");
      // The widget answers toolu_b itself; it can only do that if it sees it.
      expect(payload.content.filter((b: { type: string }) => b.type === "tool_use")).toHaveLength(2);
    } finally {
      script = oneScan;
    }
  }, 15_000);

  it("streams the reply and ends with a done event carrying the scan request", async () => {
    // A real socket, not inject(): the fault lived in how a real
    // IncomingMessage emits "close", which inject's mock request does not.
    address ??= await app.listen({ port: 0, host: "127.0.0.1" });
    const res = await fetch(`${address}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Can you check example.com?" }] }),
      signal: AbortSignal.timeout(8_000),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/event-stream/);
    const body = await res.text();
    expect(body).toMatch(/event: delta\ndata: \{"text":"Checking "\}/);
    const done = /event: done\ndata: (.+)\n/.exec(body);
    expect(done, "the response must end with a done event").not.toBeNull();
    const payload = JSON.parse(done![1]);
    expect(payload.scan).toEqual({ toolUseId: "toolu_1", url: "example.com", scope: "page", aiReview: false });
    expect(payload.show).toEqual([]);
  }, 15_000);
});
