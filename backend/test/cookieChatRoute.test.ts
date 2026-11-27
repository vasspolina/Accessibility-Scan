import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";

/**
 * The cookie banner chat spends this server's API key, so a malformed or
 * oversized conversation is refused before anything reaches the model, and
 * a set_banner call is checked before the page is told to apply it.
 */

let dir: string;
let app: FastifyInstance;
let bannerSchema: typeof import("../src/routes/cookieChat.js").bannerSchema;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "a11y-cookie-chat-"));
  process.env.DB_PATH = join(dir, "c.db");
  process.env.DB_DURABLE = "false";
  process.env.RATE_LIMIT_MAX = "100";
  const { buildApp } = await import("../src/app.js");
  ({ bannerSchema } = await import("../src/routes/cookieChat.js"));
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
  rmSync(dir, { recursive: true, force: true });
});

const post = (body: unknown) => app.inject({ method: "POST", url: "/api/cookie-banner/chat", payload: body as object });

describe("POST /api/cookie-banner/chat guardrails", () => {
  it("refuses a body with no messages", async () => {
    expect((await post({})).statusCode).toBe(400);
  });

  it("refuses a conversation that ends on the assistant's turn", async () => {
    const res = await post({ messages: [{ role: "user", content: "hi" }, { role: "assistant", content: "hello" }] });
    expect(res.statusCode).toBe(400);
  });

  it("refuses a message longer than the cap", async () => {
    expect((await post({ messages: [{ role: "user", content: "x".repeat(2_001) }] })).statusCode).toBe(400);
  });

  it("refuses a conversation with too many turns", async () => {
    const messages = Array.from({ length: 41 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "a" }));
    expect((await post({ messages })).statusCode).toBe(413);
  });

  it("refuses an image block from the caller", async () => {
    const res = await post({ messages: [{ role: "user", content: [{ type: "image", source: { type: "url", url: "https://x" } }] }] });
    expect(res.statusCode).toBe(400);
  });

  it("answers 503, not a failure, when no API key is set", async () => {
    if (process.env.ANTHROPIC_API_KEY) return; // a configured key would make a real call
    const res = await post({ messages: [{ role: "user", content: "We use Google Analytics." }] });
    expect(res.statusCode).toBe(503);
    expect(res.json()).toEqual({ error: "chat_unavailable" });
  });
});

describe("set_banner input check", () => {
  const ok = {
    language: "en",
    policy_url: "/privacy/",
    categories: [{ name: "analytics", label: "", text: "We count visits with Matomo." }],
    colours: { background: "", text: "#1a1a1a", button: "" },
  };

  it("accepts a well-formed banner", () => {
    expect(bannerSchema.safeParse(ok).success).toBe(true);
  });

  it("refuses a colour that is not #rrggbb", () => {
    expect(bannerSchema.safeParse({ ...ok, colours: { ...ok.colours, text: "red" } }).success).toBe(false);
  });

  it("refuses a policy link that is a script", () => {
    expect(bannerSchema.safeParse({ ...ok, policy_url: "javascript:alert(1)" }).success).toBe(false);
  });

  it("refuses the same category twice", () => {
    expect(bannerSchema.safeParse({ ...ok, categories: [ok.categories[0], ok.categories[0]] }).success).toBe(false);
  });

  it("refuses an other category without a label", () => {
    expect(bannerSchema.safeParse({ ...ok, categories: [{ name: "other", label: " ", text: "We run a chat widget." }] }).success).toBe(false);
  });
});
