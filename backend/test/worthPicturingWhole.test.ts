import { describe, it, expect } from "vitest";
import { worthPicturingWhole } from "../src/services/scanPipeline.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function finding(over: Partial<AccessibilityFinding>): AccessibilityFinding {
  return {
    id: "x",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "html > body > div",
    description: "",
    suggestedFix: "",
    ...over,
  } as AccessibilityFinding;
}

// The height guard is right nearly always: a picture of a whole page section
// shows the reader nothing about which part of it is at fault. Consent banners
// are the exception, and they were being dropped by it — the finding is about
// the banner's layout, so the banner is the picture.
describe("worthPicturingWhole", () => {
  it("photographs a consent banner whose selector names no single element", () => {
    const banner = "html > body > div:nth-of-type(2) > div > div > div";
    const may = worthPicturingWhole([
      finding({ category: "dark-pattern", ruleId: "dark-consent-no-reject", selector: banner }),
    ]);
    expect(may(banner)).toBe(true);
  });

  it("still refuses a bare region that no dark pattern claimed", () => {
    const may = worthPicturingWhole([
      finding({ category: "accessibility", selector: "html > body > div > section" }),
    ]);
    expect(may("html > body > div > section")).toBe(false);
  });

  // The carve-out is by finding, not by shape, so it must not spill onto a
  // region that merely looks similar to one a dark pattern named.
  it("does not extend the exemption to a different selector", () => {
    const may = worthPicturingWhole([
      finding({ category: "dark-pattern", selector: "html > body > div > div" }),
    ]);
    expect(may("html > body > div > div")).toBe(true);
    expect(may("html > body > div > aside")).toBe(false);
  });

  it("keeps photographing ordinary controls, dark pattern or not", () => {
    const may = worthPicturingWhole([]);
    expect(may("html > body > form > button")).toBe(true);
    expect(may("#newsletter-email")).toBe(true);
  });
});
