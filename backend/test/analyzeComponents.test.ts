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
    linkTexts: [],
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

// WCAG 2.4.4. axe only catches links with no accessible name at all, so a page
// full of "Read more" passes every automated check while being exactly the
// problem the criterion describes.
describe("links whose text says nothing", () => {
  const link = (text: string, href = "/a", selector = "a") => ({ selector, text, href });

  function vague(...links: Array<ReturnType<typeof link>>) {
    return evaluateComponents(dom({ linkTexts: links })).filter(
      (f) => f.ruleId === "link-text-vague"
    );
  }

  it("flags the usual offenders", () => {
    for (const text of ["Read more", "click here", "MORE", "Learn more", "…", "→", "Details"]) {
      expect(vague(link(text)), text).toHaveLength(1);
    }
  });

  it("leaves a link alone when its text actually says something", () => {
    for (const text of ["Read the 2026 fee changes", "Contact us", "Download the annual report"]) {
      expect(vague(link(text)), text).toHaveLength(0);
    }
  });

  // The whole-string match is the point: only a bare "Read more" is useless.
  it("does not flag a descriptive link that merely starts with a vague phrase", () => {
    expect(vague(link("Read more about the 2026 fee changes"))).toHaveLength(0);
  });

  it("flags a bare URL, which a screen reader reads out character by character", () => {
    expect(vague(link("https://example.com/pricing"))).toHaveLength(1);
  });

  // Those are axe's link-name findings; reporting them twice helps nobody.
  it("ignores links with no text at all", () => {
    expect(vague(link(""), link("   "))).toHaveLength(0);
  });

  it("reports one finding per link so the widget can list them", () => {
    const found = vague(link("Read more", "/a", "a.one"), link("Read more", "/b", "a.two"));
    expect(found).toHaveLength(2);
    expect(found.map((f) => f.selector)).toEqual(["a.one", "a.two"]);
  });

  // The destination is the only thing telling nine identical "Read more"s
  // apart, so it has to survive into the element label.
  it("carries the destination in the snippet", () => {
    expect(vague(link("Read more", "/fees-2026"))[0].elementSnippet).toContain("/fees-2026");
  });

  it("counts as an accessibility failure against 2.4.4, not a design note", () => {
    const f = vague(link("Read more"))[0];
    expect(f.category).toBe("accessibility");
    expect(f.wcagCriterion).toBe("2.4.4");
  });

  it("caps the list so a link-heavy page can't flood the report", () => {
    const many = Array.from({ length: 30 }, (_, i) => link("Read more", `/p${i}`, `a.n${i}`));
    expect(vague(...many)).toHaveLength(12);
  });
});
