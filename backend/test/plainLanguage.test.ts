import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import type { AccessibilityFinding } from "../src/types/report.js";

/**
 * The self-hosted plain-language rewrite: what the model is shown, what is
 * kept from its reply, and that a model which is down, slow or confused
 * leaves the report as it was and says so.
 */

type Reply = { status?: number; content?: string; throws?: string };
let reply: (body: { messages: Array<{ content: string }> }) => Reply = () => ({});
const calls: Array<{ url: string; body: { model: string; messages: Array<{ role: string; content: string }> } }> = [];
const realFetch = globalThis.fetch;

let mod: typeof import("../src/services/plainLanguage/rewriteFindings.js");
let local: typeof import("../src/services/plainLanguage/localModel.js");

beforeAll(async () => {
  process.env.LOCAL_LLM_URL = "http://gpu.test:11434/";
  process.env.LOCAL_LLM_MODEL = "qwen2.5:7b-instruct";
  process.env.LOCAL_LLM_TIMEOUT_MS = "2000";
  globalThis.fetch = (async (url: string, init: { body: string }) => {
    const body = JSON.parse(init.body);
    calls.push({ url, body });
    const r = reply(body);
    if (r.throws) throw new TypeError(r.throws);
    return new Response(JSON.stringify({ choices: [{ message: { content: r.content ?? "" } }] }), {
      status: r.status ?? 200,
    });
  }) as unknown as typeof fetch;
  mod = await import("../src/services/plainLanguage/rewriteFindings.js");
  local = await import("../src/services/plainLanguage/localModel.js");
});
afterAll(() => {
  globalThis.fetch = realFetch;
});
afterEach(() => {
  calls.length = 0;
});

function axe(ruleId: string, severity: AccessibilityFinding["severity"], n = 1): AccessibilityFinding[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${ruleId}-${i}`,
    source: "automated" as const,
    severity,
    category: "accessibility" as const,
    wcagCriterion: "1.1.1",
    selector: `#el-${ruleId}-${i}`,
    elementSnippet: `<img src="team-${i}.jpg">`,
    description: "Images must have alternate text",
    suggestedFix: "Fix any of the following: Element does not have an alt attribute",
    ruleId,
  }));
}

const good = JSON.stringify({
  title: "Photos have no description",
  explanation: "People who use a screen reader hear only a file name for the team photos.",
  fix: "Give each team photo a short alt text that says who is in it.",
});

describe("localModel helpers", () => {
  it("finds the chat endpoint with or without /v1 and a trailing slash", () => {
    expect(local.chatEndpoint("http://h:11434")).toBe("http://h:11434/v1/chat/completions");
    expect(local.chatEndpoint("http://h:8080/v1/")).toBe("http://h:8080/v1/chat/completions");
  });

  it("takes the JSON object out of a fenced or chatty reply", () => {
    expect(local.extractJsonObject('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(local.extractJsonObject("no json here")).toBeUndefined();
    expect(local.extractJsonObject("{broken")).toBeUndefined();
  });
});

describe("rewriteFindings", () => {
  it("makes one call per rule, most severe first, and puts the text on every element of the rule", async () => {
    reply = () => ({ content: good });
    const findings = [...axe("region", "moderate", 2), ...axe("image-alt", "critical", 5)];
    const rewrite = await mod.rewriteFindings(findings, "en", true);
    expect(calls).toHaveLength(2);
    expect(calls[0].url).toBe("http://gpu.test:11434/v1/chat/completions");
    expect(calls[0].body.model).toBe("qwen2.5:7b-instruct");
    // Two at a time, so both start together; the queue is still worst first.
    expect(calls.map((c) => c.body.messages[1].content.split("\n")[0])).toEqual(["Rule: image-alt", "Rule: region"]);
    expect(rewrite.meta).toMatchObject({ status: "completed", rules: 2, rewritten: 2, model: "qwen2.5:7b-instruct" });

    mod.attachPlainLanguage(findings, rewrite, "en");
    expect(findings.every((f) => f.plain?.title === "Photos have no description")).toBe(true);
    expect(findings[0].plain).toMatchObject({ model: "qwen2.5:7b-instruct", lang: "en" });
    // Words only: the measured fields are untouched.
    expect(findings[2].severity).toBe("critical");
    expect(findings[2].description).toBe("Images must have alternate text");
  });

  it("shows the model three elements and the total, and asks for the report's language", async () => {
    reply = () => ({ content: good });
    await mod.rewriteFindings(axe("image-alt", "critical", 5), "de", true);
    const [system, user] = calls[0].body.messages.map((m) => m.content);
    expect(system).toContain("in German");
    expect(user).toContain("Elements that failed: 5, the first 3 shown");
    expect(user).toContain('<img src="team-2.jpg">');
    expect(user).not.toContain("team-3.jpg");
  });

  it("leaves out AI and probe findings: the rewrite is for axe's text", async () => {
    reply = () => ({ content: good });
    const probe = { ...axe("x", "serious")[0], source: "ai" as const };
    const rewrite = await mod.rewriteFindings([probe], "en", true);
    expect(calls).toHaveLength(0);
    expect(rewrite.meta.status).toBe("completed");
    expect(rewrite.meta.rules).toBe(0);
  });

  it("keeps house style in code: no long dashes, no exclamation marks, no full stop on a title", async () => {
    reply = () => ({
      content: JSON.stringify({
        title: "Photos have no description.",
        explanation: "Screen reader users hear a file name — they never learn who is in the photo!",
        fix: "Add alt text to each photo, a few words is enough.",
      }),
    });
    const rewrite = await mod.rewriteFindings(axe("image-alt", "critical"), "en", true);
    const r = rewrite.byRule.get("image-alt")!;
    expect(r.title).toBe("Photos have no description");
    expect(r.explanation).not.toMatch(/[—–!]/);
  });

  it("calls a run partial when some rules came back in the wrong shape, and keeps the good ones", async () => {
    reply = (body) =>
      body.messages[1].content.startsWith("Rule: image-alt") ? { content: good } : { content: '{"title":"x"}' };
    const rewrite = await mod.rewriteFindings([...axe("image-alt", "critical"), ...axe("region", "minor")], "en", true);
    expect(rewrite.meta).toMatchObject({ status: "partial", rules: 2, rewritten: 1 });
    expect(rewrite.byRule.has("region")).toBe(false);
  });

  it("stops at the first connection error instead of waiting it out for every rule", async () => {
    reply = () => ({ throws: "fetch failed" });
    const findings = ["a", "b", "c", "d", "e", "f"].flatMap((r) => axe(r, "serious"));
    const rewrite = await mod.rewriteFindings(findings, "en", true);
    expect(rewrite.meta.status).toBe("failed");
    expect(rewrite.meta.rewritten).toBe(0);
    // One per worker at most, not six.
    expect(calls.length).toBeLessThanOrEqual(2);
  });

  it("says failed on a server error, and leaves the findings without plain text", async () => {
    reply = () => ({ status: 500 });
    const findings = axe("image-alt", "critical");
    const rewrite = await mod.rewriteFindings(findings, "en", true);
    mod.attachPlainLanguage(findings, rewrite, "en");
    expect(rewrite.meta.status).toBe("failed");
    expect(findings[0].plain).toBeUndefined();
  });

  it("does nothing when the reader switched AI off", async () => {
    const rewrite = await mod.rewriteFindings(axe("image-alt", "critical"), "en", false);
    expect(calls).toHaveLength(0);
    expect(rewrite.meta.status).toBe("disabled_by_request");
  });

  it("rewrites at most MAX_RULES rules and reports the rest as not reached", async () => {
    reply = () => ({ content: good });
    const findings = Array.from({ length: mod.MAX_RULES + 3 }, (_, i) => axe(`rule-${i}`, "minor")).flat();
    const rewrite = await mod.rewriteFindings(findings, "en", true);
    expect(calls).toHaveLength(mod.MAX_RULES);
    expect(rewrite.meta).toMatchObject({ status: "partial", rules: mod.MAX_RULES + 3, rewritten: mod.MAX_RULES });
  });
});
