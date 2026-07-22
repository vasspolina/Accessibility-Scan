import { describe, it, expect } from "vitest";
import { evaluateComponents } from "../src/services/components/analyzeComponents.js";
import type { DomSignals } from "../src/services/render/renderPage.js";

function field(overrides: Partial<DomSignals["forms"][number]["fields"][number]> = {}) {
  return {
    selector: "input",
    type: "text",
    accessibleLabel: null,
    hasProgrammaticLabel: true,
    name: null,
    autocomplete: null,
    required: false,
    ...overrides,
  };
}

function dom(overrides: Partial<DomSignals> = {}): DomSignals {
  return {
    pageTitle: "Test",
    headingTree: [],
    landmarks: [],
    images: [],
    interactiveElements: [],
    forms: [],
    focusOrderSample: [],
    animatedElements: [],
    respectsReducedMotion: false,
    ...overrides,
  };
}

const rules = (dm: DomSignals) => evaluateComponents(dm).map((f) => f.ruleId);

describe("evaluateComponents", () => {
  it("returns nothing for a page with no forms or menus", () => {
    expect(evaluateComponents(dom())).toEqual([]);
  });

  it("flags personal-detail fields missing autocomplete", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email" })], errorMessages: [] }],
    });
    expect(rules(d)).toContain("component-form-autocomplete");
  });

  it("does not flag an email field that already has autocomplete", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email", autocomplete: "email" })], errorMessages: [] }],
    });
    expect(rules(d)).not.toContain("component-form-autocomplete");
  });

  it("all component findings are design-clarity suggestions, never score hits", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email" })], errorMessages: [] }],
    });
    for (const f of evaluateComponents(d)) {
      expect(f.category).toBe("design-clarity");
      expect(f.helpUrl).toBeTruthy();
    }
  });

  it("flags an email field using type=text", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email", type: "text", autocomplete: "email" })], errorMessages: [] }],
    });
    expect(rules(d)).toContain("component-input-type");
  });

  it("does not flag an email field that uses type=email", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email", type: "email", autocomplete: "email" })], errorMessages: [] }],
    });
    expect(rules(d)).not.toContain("component-input-type");
  });

  it("flags required fields with no visible required cue", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ accessibleLabel: "Password", required: true })], errorMessages: [] }],
    });
    expect(rules(d)).toContain("component-required-cue");
  });

  it("does not flag a required field whose label says (required)", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ accessibleLabel: "Password (required)", required: true })], errorMessages: [] }],
    });
    expect(rules(d)).not.toContain("component-required-cue");
  });

  it("flags a multi-field form with no clear submit button", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email" }), field({ name: "password" })], errorMessages: [] }],
      interactiveElements: [{ type: "button", selector: "button", accessibleName: "Go", href: undefined, hasVisibleText: true }],
    });
    expect(rules(d)).toContain("component-submit-clarity");
  });

  it("does not flag a form with a descriptive submit button", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email" }), field({ name: "password" })], errorMessages: [] }],
      interactiveElements: [{ type: "button", selector: "button", accessibleName: "Create account", href: undefined, hasVisibleText: true }],
    });
    expect(rules(d)).not.toContain("component-submit-clarity");
  });

  it("flags multiple unlabelled navigation menus", () => {
    const d = dom({
      landmarks: [
        { role: "nav", label: null, selector: "nav:nth-of-type(1)" },
        { role: "nav", label: null, selector: "nav:nth-of-type(2)" },
      ],
    });
    expect(rules(d)).toContain("component-nav-labels");
  });

  it("does not flag navs that are all labelled", () => {
    const d = dom({
      landmarks: [
        { role: "nav", label: "Main", selector: "nav:nth-of-type(1)" },
        { role: "nav", label: "Footer", selector: "nav:nth-of-type(2)" },
      ],
    });
    expect(rules(d)).not.toContain("component-nav-labels");
  });

  it("flags a page with a menu but no skip link", () => {
    const d = dom({
      landmarks: [{ role: "nav", label: "Main", selector: "nav" }],
      interactiveElements: [{ type: "link", selector: "a", accessibleName: "Home", href: "/", hasVisibleText: true }],
    });
    expect(rules(d)).toContain("component-skip-link");
  });

  it("does not flag when a skip link is present", () => {
    const d = dom({
      landmarks: [{ role: "nav", label: "Main", selector: "nav" }],
      interactiveElements: [
        { type: "link", selector: "a.skip", accessibleName: "Skip to main content", href: "#main", hasVisibleText: true },
        { type: "link", selector: "a", accessibleName: "Home", href: "/", hasVisibleText: true },
      ],
    });
    expect(rules(d)).not.toContain("component-skip-link");
  });
});
