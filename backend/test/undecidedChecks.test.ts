import { describe, it, expect } from "vitest";
import { summariseUndecided } from "../src/services/scanPipeline.js";
import type { AxeRunResult } from "../src/services/render/renderPage.js";

function axe(incomplete: AxeRunResult["incomplete"]): AxeRunResult {
  return {
    testEngine: { name: "axe-core", version: "4.12.1" },
    violations: [],
    incomplete,
  };
}

function row(id: string, nodes: number, help = "help text"): AxeRunResult["incomplete"][number] {
  return {
    id,
    impact: "serious",
    tags: [],
    description: "",
    help,
    helpUrl: `https://dequeuniversity.com/rules/axe/4.12/${id}`,
    nodes: Array.from({ length: nodes }, () => ({ target: ["p"], html: "<p></p>" })),
  };
}

describe("summariseUndecided", () => {
  // Wikipedia returned 4 violations and 95 undecided contrast pairs. Dropping
  // the array made that page identical to one with nothing undecided at all.
  it("counts the places a check could not be settled", () => {
    const out = summariseUndecided(axe([row("color-contrast", 95)]));
    expect(out).toEqual([
      expect.objectContaining({ ruleId: "color-contrast", count: 95 }),
    ]);
  });

  it("puts the biggest job first", () => {
    const out = summariseUndecided(
      axe([row("aria-allowed-role", 5), row("color-contrast", 95), row("video-caption", 3)])
    );
    expect(out?.map((r) => r.ruleId)).toEqual([
      "color-contrast",
      "aria-allowed-role",
      "video-caption",
    ]);
  });

  // A fact about the scan rather than about the page, and usually a
  // third-party embed the owner could not change anyway.
  it("drops the one that is about us rather than the site", () => {
    expect(summariseUndecided(axe([row("frame-tested", 1)]))).toBeUndefined();
  });

  it("says nothing when the engine settled everything", () => {
    expect(summariseUndecided(axe([]))).toBeUndefined();
  });

  // Older cached shapes, and any future one where the key is absent.
  it("survives an axe result with no incomplete array", () => {
    const missing = { testEngine: { name: "axe", version: "1" }, violations: [] } as AxeRunResult;
    expect(summariseUndecided(missing)).toBeUndefined();
  });
});
