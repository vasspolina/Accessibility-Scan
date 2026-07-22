import { describe, it, expect } from "vitest";
import { evaluateMotion } from "../src/services/motion/analyzeMotion.js";

function animated(overrides: Record<string, unknown> = {}) {
  return {
    selector: "div.spinner",
    tag: "div",
    animationName: "spin",
    animationIterationCount: "infinite",
    isAutoplayMedia: false,
    hasPauseControls: false,
    ...overrides,
  };
}

const none = new Set<string>();

describe("evaluateMotion", () => {
  it("flags a marquee", () => {
    const findings = evaluateMotion([animated({ tag: "marquee", selector: "marquee" })], true, none);
    expect(findings.map((f) => f.ruleId)).toContain("motion-marquee");
    expect(findings[0].category).toBe("accessibility");
    expect(findings[0].wcagCriterion).toBe("2.2.2");
    expect(findings[0].wcagLevel).toBe("A");
  });

  it("suppresses the marquee finding when axe already flagged it", () => {
    const findings = evaluateMotion(
      [animated({ tag: "marquee" })],
      true,
      new Set(["marquee"])
    );
    expect(findings).toEqual([]);
  });

  it("flags autoplaying media without controls", () => {
    const findings = evaluateMotion(
      [animated({ tag: "video", isAutoplayMedia: true, hasPauseControls: false, animationIterationCount: "1" })],
      true,
      none
    );
    expect(findings.map((f) => f.ruleId)).toContain("motion-autoplay-media");
  });

  it("does not flag autoplaying media that has controls", () => {
    const findings = evaluateMotion(
      [animated({ tag: "video", isAutoplayMedia: true, hasPauseControls: true, animationIterationCount: "1" })],
      true,
      none
    );
    expect(findings).toEqual([]);
  });

  it("suppresses the autoplay finding when axe flagged no-autoplay-audio", () => {
    const findings = evaluateMotion(
      [animated({ tag: "audio", isAutoplayMedia: true, hasPauseControls: false })],
      true,
      new Set(["no-autoplay-audio"])
    );
    // the infinite-animation rule may still not fire because respectsReducedMotion=true
    expect(findings).toEqual([]);
  });

  it("flags infinite animations when reduced-motion is ignored, as one grouped finding", () => {
    const findings = evaluateMotion(
      [animated(), animated({ selector: "div.pulse" })],
      false,
      none
    );
    const motion = findings.filter((f) => f.ruleId === "motion-infinite-no-reduced-motion");
    expect(motion).toHaveLength(1);
    expect(motion[0].description).toContain("2 elements");
  });

  it("stays quiet about infinite animations when the site honors reduced motion", () => {
    expect(evaluateMotion([animated()], true, none)).toEqual([]);
  });

  it("ignores finite animations entirely", () => {
    expect(evaluateMotion([animated({ animationIterationCount: "3" })], false, none)).toEqual([]);
  });
});
