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

  it("accessibility-category findings always carry the criterion that lets them count", () => {
    // The rule this layer keeps getting wrong, twice now in its own history
    // (2.4.1, then 1.3.5): an accessibility-category finding without a
    // criterion never reaches its conformance row, and a design-clarity
    // finding with one is a failure hidden from the checklist. Either every
    // finding is design-clarity, or it names its criterion and level.
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email" })], errorMessages: [] }],
    });
    for (const f of evaluateComponents(d)) {
      expect(f.helpUrl).toBeTruthy();
      if (f.category === "accessibility") {
        expect(f.wcagCriterion, `${f.ruleId} counts but names no criterion`).toBeTruthy();
        expect(f.wcagLevel, `${f.ruleId} counts but names no level`).toBeTruthy();
      }
    }
  });

  it("missing autocomplete on an identity field is a 1.3.5 failure, not advice", () => {
    const d = dom({
      forms: [{ selector: "form", fields: [field({ name: "email", accessibleLabel: "Email" })], errorMessages: [] }],
    });
    const f = evaluateComponents(d).find((x) => x.ruleId === "component-form-autocomplete")!;
    expect(f.category).toBe("accessibility");
    expect(f.wcagCriterion).toBe("1.3.5");
    expect(f.wcagLevel).toBe("AA");
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

  it("recognises a skip link in the page's own language", () => {
    // The row used to be decided by /\bskip\b/i alone — a Level A criterion
    // failed by every German, French and Dutch page that does it right.
    for (const name of ["Zum Inhalt springen", "Aller au contenu", "Naar de inhoud", "Saltar al contenido"]) {
      const d = dom({
        landmarks: [{ role: "nav", label: "Main", selector: "nav" }],
        interactiveElements: [
          { type: "link", selector: "a.skip", accessibleName: name, href: "#main", hasVisibleText: true },
          { type: "link", selector: "a", accessibleName: "Home", href: "/", hasVisibleText: true },
        ],
      });
      expect(rules(d), `"${name}" not recognised as a skip link`).not.toContain("component-skip-link");
    }
  });

  it("a main landmark demotes the missing skip link from failure to advice", () => {
    // A landmark is a sufficient 2.4.1 technique (ARIA11) — the page
    // conforms, so no Level A failure may be claimed. The advice stays,
    // as design-clarity, because a sighted keyboard user cannot jump to
    // a landmark.
    const d = dom({
      landmarks: [
        { role: "nav", label: "Main", selector: "nav" },
        { role: "main", label: null, selector: "main" },
      ],
      interactiveElements: [{ type: "link", selector: "a", accessibleName: "Home", href: "/", hasVisibleText: true }],
    });
    const f = evaluateComponents(d).find((x) => x.ruleId === "component-skip-link")!;
    expect(f).toBeTruthy();
    expect(f.category).toBe("design-clarity");
    expect(f.wcagCriterion).toBeUndefined();
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

// Three rules moved out of the notes and into the score. They are about
// whether somebody can get through the page — a menu nobody can tell apart,
// no way past the navigation, a pop-up that will not close — not about how it
// looks, and the score is what the report treats as consequential.
describe("what counts towards the score", () => {
  it("files the access advisories as accessibility, not design", () => {
    const findings = evaluateComponents({
      landmarks: [
        { role: "nav", label: "", selector: "nav" },
        { role: "nav", label: "", selector: "nav:nth-of-type(2)" },
      ],
      interactiveElements: [
        { type: "link", accessibleName: "Home", href: "/", selector: "a" },
      ],
      linkTexts: [],
      forms: [],
      dialogs: [],
    } as never);
    const byRule = Object.fromEntries(findings.map((f) => [f.ruleId, f.category]));
    expect(byRule["component-nav-labels"]).toBe("accessibility");
    expect(byRule["component-skip-link"]).toBe("accessibility");
  });
});
