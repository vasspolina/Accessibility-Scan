import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * The studio site's request form: what the assistant may ask, what the
 * studio is mailed, and that the mail only ever goes to the studio.
 */

let toolInput: unknown = { question: "Is this a new website or a redesign?" };
let prompts: string[] = [];
vi.mock("../src/services/aiReview/claudeClient.js", () => ({
  CLAUDE_MODEL: "test",
  getClaudeClient: () => ({
    messages: {
      create: async (params: { messages: Array<{ content: string }> }) => {
        prompts.push(params.messages[0].content);
        return { content: [{ type: "tool_use", name: "next_step", input: toolInput }] };
      },
    },
  }),
}));

let app: FastifyInstance;
const sent: Array<Record<string, unknown>> = [];
const realFetch = globalThis.fetch;

beforeAll(async () => {
  process.env.MAIL_API_KEY = "test-key";
  process.env.MAIL_FROM = "studio@mail.test";
  process.env.CONTACT_TO = "studio@inbox.test";
  process.env.MAIL_RATE_LIMIT_MAX = "100";
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    expect(url).toBe("https://api.resend.com/emails");
    sent.push(JSON.parse(init.body));
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  const { buildApp } = await import("../src/app.js");
  app = await buildApp();
  await app.ready();
});
afterAll(async () => {
  globalThis.fetch = realFetch;
  await app.close();
});
afterEach(() => {
  sent.length = 0;
  prompts = [];
});

const post = (url: string, payload: unknown) => app.inject({ method: "POST", url, payload: payload as object });
const answers = [
  { question: "New or redesign?", answer: "A redesign" },
  { question: "How many pages?", answer: "About ten" },
  { question: "When?", answer: "By March" },
];

describe("POST /api/inquiry/next", () => {
  it("returns the assistant's question", async () => {
    toolInput = { question: "Is this a new website or a redesign?" };
    const res = await post("/api/inquiry/next", { request: "We need a website for our bakery" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ done: false, question: "Is this a new website or a redesign?" });
    expect(prompts[0]).toContain("We need a website for our bakery");
  });

  it("returns the brief when the assistant finishes", async () => {
    toolInput = { brief: { projectType: "Redesign", summary: "A bakery wants its site redesigned." } };
    const res = await post("/api/inquiry/next", { request: "Redesign our bakery site", answers: answers.slice(0, 1) });
    const body = res.json();
    expect(body.done).toBe(true);
    expect(body.brief.projectType).toBe("Redesign");
    expect(body.brief.budget).toBe("");
  });

  it("stops asking after three questions even if the model asks a fourth", async () => {
    toolInput = { question: "One more thing?" };
    const res = await post("/api/inquiry/next", { request: "A site", answers });
    expect(res.json()).toEqual({ done: true, brief: null });
    expect(prompts[0]).toContain("Finish with the brief now");
  });

  it("rejects a fourth answer and an empty request", async () => {
    expect((await post("/api/inquiry/next", { request: "A site", answers: [...answers, answers[0]] })).statusCode).toBe(400);
    expect((await post("/api/inquiry/next", { request: "  " })).statusCode).toBe(400);
  });
});

describe("POST /api/inquiry", () => {
  const body = { email: "visitor@example.com", request: "We need a website for our bakery", consent: true };

  it("mails the studio, with the visitor in Reply-To only", async () => {
    const res = await post("/api/inquiry", {
      ...body,
      answers: answers.slice(0, 1),
      brief: { projectType: "Redesign", summary: "A bakery wants its site redesigned." },
    });
    expect(res.statusCode).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toEqual(["studio@inbox.test"]);
    expect(sent[0].reply_to).toBe("visitor@example.com");
    const text = sent[0].text as string;
    expect(text).toContain("We need a website for our bakery");
    expect(text).toContain("Q: New or redesign?\nA: A redesign");
    expect(text).toContain("written by the AI assistant");
    expect(text).toContain("Project: Redesign");
    expect(text).not.toContain("Budget:");
  });

  it("sends the request as written when there is no brief", async () => {
    const res = await post("/api/inquiry", body);
    expect(res.statusCode).toBe(200);
    expect(sent[0].text).not.toContain("AI assistant");
  });

  it("ignores a recipient the caller supplies", async () => {
    await post("/api/inquiry", { ...body, to: "victim@example.com", CONTACT_TO: "victim@example.com" });
    expect(sent[0].to).toEqual(["studio@inbox.test"]);
  });

  it("needs consent and a real address", async () => {
    expect((await post("/api/inquiry", { ...body, consent: false })).statusCode).toBe(400);
    expect((await post("/api/inquiry", { ...body, email: "nope" })).statusCode).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("answers a filled trap field as sent and sends nothing", async () => {
    const res = await post("/api/inquiry", { ...body, company_url: "https://spam.test" });
    expect(res.statusCode).toBe(200);
    expect(sent).toHaveLength(0);
  });
});
