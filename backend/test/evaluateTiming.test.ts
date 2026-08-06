import { describe, it, expect } from "vitest";
import { evaluateTiming } from "../src/services/interaction/analyzeTiming.js";

describe("evaluateTiming", () => {
  it("states a failure for a timed refresh", () => {
    const f = evaluateTiming({ metaRefreshSeconds: 30 });
    expect(f).toHaveLength(1);
    expect(f[0].wcagCriterion).toBe("2.2.1");
    expect(f[0].wcagLevel).toBe("A");
    expect(f[0].description).toContain("30 seconds");
  });

  it("ignores an immediate redirect", () => {
    // Zero seconds is a routing decision, not a time limit anybody
    // experiences — there is nothing to extend.
    expect(evaluateTiming({ metaRefreshSeconds: 0 })).toEqual([]);
  });

  it("says nothing where there is no refresh", () => {
    expect(evaluateTiming({ metaRefreshSeconds: null })).toEqual([]);
  });
});
