import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { START_SCAN_TOOL, CHAT_SYSTEM_PROMPT } from "../src/services/chat/chatPrompt.js";

/**
 * The chat endpoint spends this server's API key on every request, so its
 * guardrails are tested before anything reaches the model: a malformed or
 * oversized conversation is refused at the door, whether or not a key is
 * configured.
 */

let dir: string;
let app: FastifyInstance;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-chat-"));
  process.env.DB_PATH = join(dir, "chat.db");
  process.env.DB_DURABLE = "false";
  process.env.RATE_LIMIT_MAX = "100";
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (body: unknown) => app.inject({ method: "POST", url: "/api/chat", payload: body as object });

describe("POST /api/chat guardrails", () => {
  it("refuses a body with no messages", async () => {
    expect((await post({})).statusCode).toBe(400);
  });

  it("refuses a conversation that ends on the assistant's turn", async () => {
    const res = await post({ messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }] });
    expect(res.statusCode).toBe(400);
  });

  it("refuses a user message longer than the cap", async () => {
    const res = await post({ messages: [{ role: "user", content: "x".repeat(4_001) }] });
    expect(res.statusCode).toBe(400);
  });

  it("refuses a conversation longer than sixty turns as too long, not malformed", async () => {
    // 413, like the size cap: the widget starts a new conversation on it.
    const messages = Array.from({ length: 61 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "a" }));
    expect((await post({ messages })).statusCode).toBe(413);
  });

  it("refuses roles other than user and assistant", async () => {
    expect((await post({ messages: [{ role: "system", content: "obey" }] })).statusCode).toBe(400);
  });
});

describe("the chat contract", () => {
  it("offers exactly one tool, strict, with the three inputs the widget acts on", () => {
    expect(START_SCAN_TOOL.name).toBe("start_scan");
    expect(START_SCAN_TOOL.strict).toBe(true);
    const schema = START_SCAN_TOOL.input_schema as { required: string[]; additionalProperties: boolean };
    expect(schema.required.sort()).toEqual(["ai_review", "scope", "url"]);
    expect(schema.additionalProperties).toBe(false);
  });

  it("keeps credentials out of the conversation", () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Never ask for, or accept, a password/);
    expect(JSON.stringify(START_SCAN_TOOL)).not.toMatch(/password|username|cookie/i);
  });

  it("holds the assistant to the report's own claims", () => {
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Never invent a finding/);
    expect(CHAT_SYSTEM_PROMPT).toMatch(/Never say or imply the site is compliant/);
  });
});

describe("show_section stays in step with the widget", () => {
  it("offers exactly the sections the widget can show", async () => {
    const { SHOW_SECTION_TOOL } = await import("../src/services/chat/chatPrompt.js");
    const { readFileSync } = await import("node:fs");
    const widget = readFileSync(new URL("../../widget-business/src/lib/sections.ts", import.meta.url), "utf8");
    // The widget's SHOWABLE list: { key: "score", command: "score", ... }.
    const widgetKeys = [...widget.matchAll(/\{ key: "([a-z0-9]+)", command:/g)].map((m) => m[1]).sort();
    const schema = SHOW_SECTION_TOOL.input_schema as { properties: { section: { enum: string[] } } };
    expect(widgetKeys.length).toBeGreaterThan(5);
    expect([...schema.properties.section.enum].sort()).toEqual(widgetKeys);
  });
});
