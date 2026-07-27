import { describe, it, expect } from "vitest";
import {
  componentSignature,
  dominantComponent,
  describeComponent,
} from "../src/lib/componentCluster";
import type { AccessibilityFinding } from "../src/api/scanClient";

const f = (selector: string): AccessibilityFinding => ({
  id: Math.random().toString(),
  source: "automated",
  severity: "serious",
  category: "accessibility",
  selector,
  description: "d",
  suggestedFix: "x",
});

describe("componentSignature", () => {
  // The real case that prompted this: thirteen contrast failures on
  // smashingmagazine.com, one topic link repeated.
  it("treats attribute values as the instance, not the component", () => {
    expect(componentSignature('a[href$="ux/"]')).toBe(componentSignature('a[href$="css/"]'));
  });

  it("treats positional indices as the instance", () => {
    expect(componentSignature("li:nth-child(1) > a")).toBe(componentSignature("li:nth-child(7) > a"));
    expect(componentSignature("ul > li:nth-of-type(2) > .card")).toBe(
      componentSignature("ul > li:nth-of-type(9) > .card")
    );
  });

  // An id is unique by definition, so it can never mark a repeated component.
  it("drops ids", () => {
    expect(componentSignature("#header-one .btn")).toBe(componentSignature("#header-two .btn"));
  });

  it("keeps genuinely different things apart", () => {
    expect(componentSignature(".card > a")).not.toBe(componentSignature(".banner > button"));
    expect(componentSignature("a[href]")).not.toBe(componentSignature("button[type]"));
  });
});

describe("dominantComponent", () => {
  it("spots one component behind many findings", () => {
    const findings = ["ux/", "css/", "js/", "design/", "a11y/"].map((s) => f(`a[href$="${s}"]`));
    const cluster = dominantComponent(findings)!;
    expect(cluster.count).toBe(5);
    expect(cluster.share).toBe(1);
  });

  // Over-merging is the dangerous error: telling someone two different
  // problems are one sends them away thinking they have finished.
  it("says nothing when the findings are genuinely varied", () => {
    const findings = [f(".card > a"), f(".banner > button"), f("main > input"), f("nav > span")];
    expect(dominantComponent(findings)).toBeNull();
  });

  it("needs a real majority, not a plurality", () => {
    // Two of five is a repeat, but not the story of the group.
    const findings = [f("li > a"), f("li > a"), f(".x > b"), f(".y > c"), f(".z > d")];
    expect(dominantComponent(findings)).toBeNull();
  });

  it("ignores a pair, because two rows need no summarising", () => {
    expect(dominantComponent([f("li > a"), f("li > a")])).toBeNull();
  });

  it("ignores page-level selectors, which say nothing about a component", () => {
    expect(dominantComponent([f("html"), f("body"), f("html")])).toBeNull();
  });

  it("survives findings with no selector at all", () => {
    expect(() => dominantComponent([f(""), f(""), f("")])).not.toThrow();
    expect(dominantComponent([f(""), f(""), f("")])).toBeNull();
  });
});

describe("describeComponent", () => {
  // Naming it "the book card" reads well right up until it is wrong. The
  // selector shape is something a developer can act on directly.
  it("names the class rather than inventing a product name", () => {
    // The leaf here is a bare <a>, which points a developer nowhere. The
    // wrapper class is the component and points straight at the template.
    expect(describeComponent(".books__book__wrapper > .col > a")).toBe(".books__book__wrapper");
    expect(describeComponent("ul > li > .card")).toBe(".card");
    // Layout helpers are short; the component name is the specific one.
    expect(describeComponent(".row > .col > .article-teaser")).toBe(".article-teaser");
  });

  it("falls back to the tag when there is no class", () => {
    expect(describeComponent("nav > a[href]")).toBe("<a>");
  });
});
