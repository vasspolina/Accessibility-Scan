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

// A search that the API pauses: the first request ends in pause_turn with
// the search started; the second finishes the answer. Streamed as the API
// streams it — the server_tool_use block's input arrives in pieces.
const pausedSearch = {
  events: [
    { type: "content_block_start", index: 0, content_block: { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: {} } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: '{"query": "European Acc' } },
    { type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: 'essibility Act deadline"}' } },
    { type: "content_block_stop", index: 0 },
  ],
  final: {
    content: [
      { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: { query: "European Accessibility Act deadline" } },
      { type: "web_search_tool_result", tool_use_id: "srvtoolu_1", content: [{ type: "web_search_result", url: "https://example.eu/eaa", title: "EAA", encrypted_content: "x", page_age: null }] },
    ],
    stop_reason: "pause_turn",
  },
};
const searchedAnswer = {
  events: [{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "It applied from 28 June 2025." } }],
  final: {
    content: [{ type: "text", text: "It applied from 28 June 2025.", citations: [{ type: "web_search_result_location", url: "https://example.eu/eaa", title: "EAA", cited_text: "28 June 2025", encrypted_index: "y" }] }],
    stop_reason: "end_turn",
  },
};

type Script = { events?: Array<Record<string, unknown>>; final: { content: unknown[]; stop_reason: string } };
const words = ["Checking ", "example.com ", "now."].map((text) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text } }));

// The requests one turn makes, in order; the route resumes a paused turn
// with another request, so a test may script more than one.
let scripts: Script[] = [{ events: words, final: oneScan }];
let requests: unknown[][] = [];

vi.mock("../src/services/aiReview/claudeClient.js", () => ({
  CLAUDE_MODEL: "test",
  getClaudeClient: () => ({
    beta: {
      messages: {
        stream: (params: { messages: unknown[] }) => {
          requests.push(params.messages);
          const script = scripts[Math.min(requests.length, scripts.length) - 1];
          let aborted = false;
          return {
            get aborted() {
              return aborted;
            },
            abort() {
              aborted = true;
            },
            async *[Symbol.asyncIterator]() {
              for (const event of script.events ?? words) {
                await new Promise((r) => setTimeout(r, 10));
                if (aborted) throw new Error("aborted");
                yield event;
              }
            },
            async finalMessage() {
              if (aborted) throw new Error("aborted");
              return script.final;
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
    scripts = [{ final: twoScans }];
    try {
      const body = await (await chat()).text();
      const payload = JSON.parse(/event: done\ndata: (.+)\n/.exec(body)![1]);
      expect(payload.scan.toolUseId).toBe("toolu_a");
      // The widget answers toolu_b itself; it can only do that if it sees it.
      expect(payload.content.filter((b: { type: string }) => b.type === "tool_use")).toHaveLength(2);
    } finally {
      scripts = [{ final: oneScan }];
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

  it("tells the widget when a web search starts and what it asked, resumes a paused turn, and hands back one joined turn", async () => {
    scripts = [pausedSearch, searchedAnswer];
    requests = [];
    try {
      const body = await (await chat()).text();
      // Named as soon as it starts, then with the query once the input has all arrived.
      expect(body).toMatch(/event: searching\ndata: \{"query":null\}/);
      expect(body).toMatch(/event: searching\ndata: \{"query":"European Accessibility Act deadline"\}/);
      // Two requests: the second carries the paused turn back as the assistant's.
      expect(requests).toHaveLength(2);
      const resumed = requests[1] as Array<{ role: string; content: unknown[] }>;
      expect(resumed[resumed.length - 1].role).toBe("assistant");
      expect(resumed[resumed.length - 1].content).toEqual(pausedSearch.final.content);
      // One done event, with both halves of the turn, so the widget's history is what the API saw.
      const payload = JSON.parse(/event: done\ndata: (.+)\n/.exec(body)![1]);
      expect(payload.stopReason).toBe("end_turn");
      expect(payload.content.map((b: { type: string }) => b.type)).toEqual(["server_tool_use", "web_search_tool_result", "text"]);
      expect(payload.content[2].citations[0].url).toBe("https://example.eu/eaa");
      expect(payload.scan).toBeNull();
    } finally {
      scripts = [{ final: oneScan }];
    }
  }, 15_000);

  it("accepts a searched turn sent back as the assistant's: the result blocks are not sourced documents", async () => {
    scripts = [{ final: searchedAnswer.final }];
    address ??= await app.listen({ port: 0, host: "127.0.0.1" });
    const res = await fetch(`${address}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", content: "When did the EAA apply?" },
          { role: "assistant", content: [...pausedSearch.final.content, ...searchedAnswer.final.content] },
          { role: "user", content: "And in Germany?" },
        ],
      }),
      signal: AbortSignal.timeout(8_000),
    });
    expect(res.status).toBe(200);
    await res.text();
  }, 15_000);
});
