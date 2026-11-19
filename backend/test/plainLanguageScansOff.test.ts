import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { AccessibilityFinding } from "../src/types/report.js";

/**
 * The model is configured but scans are not opted in: the default. Scans
 * must not call it (each call keeps a paid GPU worker awake), while the
 * pilot still drafts with it.
 */

let calls = 0;
const realFetch = globalThis.fetch;

beforeAll(() => {
  process.env.LOCAL_LLM_URL = "http://gpu.test:11434";
  delete process.env.PLAIN_LANGUAGE_IN_SCANS;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "The pay button has no name",
                explanation: "A screen reader announces it only as button.",
                fix: "Give the pay button a visible text label.",
                wcagCriterion: "4.1.2",
              }),
            },
          },
        ],
      })
    );
  }) as unknown as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
});

const finding: AccessibilityFinding = {
  id: "1",
  source: "automated",
  severity: "critical",
  category: "accessibility",
  selector: "img",
  description: "Images must have alternate text",
  suggestedFix: "Element does not have an alt attribute",
  ruleId: "image-alt",
};

describe("PLAIN_LANGUAGE_IN_SCANS unset", () => {
  it("leaves scans without the model, and says why", async () => {
    const { rewriteFindings } = await import("../src/services/plainLanguage/rewriteFindings.js");
    const r = await rewriteFindings([finding], "en", true);
    expect(r.meta.status).toBe("off_for_scans");
    expect(r.meta.model).toBe("qwen2.5:7b-instruct");
    expect(calls).toBe(0);
  });

  it("still lets the pilot draft with the model", async () => {
    const { draftFinding } = await import("../src/services/pilot/pilot.js");
    const r = await draftFinding({
      code: "river-41",
      assistiveTech: "screen-reader",
      task: "Pay",
      barrier: "The pay button is read as button.",
      impact: "blocked",
      lang: "en",
    });
    expect(r.draft?.title).toBe("The pay button has no name");
    expect(calls).toBe(1);
  });
});
