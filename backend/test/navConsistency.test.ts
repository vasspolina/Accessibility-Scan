import { describe, it, expect } from "vitest";
import { compareNavigation, type PageNavigation } from "../src/services/crawl/consistency.js";

function page(url: string, links: Array<[string, string]>): PageNavigation {
  return {
    url,
    label: url,
    navigation: links.map(([text, href]) => ({ text, href })),
  };
}

const MENU: Array<[string, string]> = [
  ["Home", "https://s.com/"],
  ["About", "https://s.com/about"],
  ["Shop", "https://s.com/shop"],
];

const ids = (rows: ReturnType<typeof compareNavigation>) => rows.map((r) => r.ruleId);

describe("compareNavigation", () => {
  it("says nothing when there is only one page", () => {
    expect(compareNavigation([page("https://s.com/a", MENU)])).toEqual([]);
  });

  it("says nothing when two pages agree", () => {
    expect(
      compareNavigation([page("https://s.com/a", MENU), page("https://s.com/b", MENU)])
    ).toEqual([]);
  });

  it("reports a genuine reordering", () => {
    const swapped: Array<[string, string]> = [MENU[0], MENU[2], MENU[1]];
    const rows = compareNavigation([
      page("https://s.com/a", MENU),
      page("https://s.com/b", swapped),
    ]);
    expect(ids(rows)).toContain("nav-order-inconsistent");
  });

  it("does not call a shorter menu a reordering", () => {
    // The guard that matters most: a page that omits a link has a shorter
    // menu, not a shuffled one. Comparing raw positions would report this.
    const partial: Array<[string, string]> = [MENU[0], MENU[2]];
    const rows = compareNavigation([
      page("https://s.com/a", MENU),
      page("https://s.com/b", partial),
    ]);
    expect(ids(rows)).not.toContain("nav-order-inconsistent");
  });

  it("ignores a trailing slash and letter case in the destination", () => {
    const variant: Array<[string, string]> = [
      ["Home", "https://s.com"],
      ["About", "https://S.com/about/"],
      ["Shop", "https://s.com/shop"],
    ];
    expect(
      compareNavigation([page("https://s.com/a", MENU), page("https://s.com/b", variant)])
    ).toEqual([]);
  });

  it("reports one destination carrying two names", () => {
    const renamed: Array<[string, string]> = [
      ["Home", "https://s.com/"],
      ["About", "https://s.com/about"],
      ["Basket", "https://s.com/shop"],
    ];
    const rows = compareNavigation([
      page("https://s.com/a", MENU),
      page("https://s.com/b", renamed),
    ]);
    expect(ids(rows)).toContain("nav-name-inconsistent");
    expect(rows.find((r) => r.ruleId === "nav-name-inconsistent")!.description).toMatch(
      /shop|basket/i
    );
  });

  it("treats case and spacing differences as the same name", () => {
    const spaced: Array<[string, string]> = [
      ["Home", "https://s.com/"],
      ["  about ", "https://s.com/about"],
      ["SHOP", "https://s.com/shop"],
    ];
    expect(
      compareNavigation([page("https://s.com/a", MENU), page("https://s.com/b", spaced)])
    ).toEqual([]);
  });

  it("ignores a page's link to itself", () => {
    // Where "(current page)" markers live. Punishing a site for adding one
    // would be punishing it for doing the right thing.
    const a = page("https://s.com/about", [
      ["Home", "https://s.com/"],
      ["About (current page)", "https://s.com/about"],
    ]);
    const b = page("https://s.com/", [
      ["Home", "https://s.com/"],
      ["About", "https://s.com/about"],
    ]);
    // b's self-link is Home, a's is About — both skipped, so no rename.
    expect(ids(compareNavigation([a, b]))).not.toContain("nav-name-inconsistent");
  });

  it("says nothing when the pages share fewer than two links", () => {
    const rows = compareNavigation([
      page("https://s.com/a", [["Home", "https://s.com/"]]),
      page("https://s.com/b", [["Contact", "https://s.com/contact"]]),
    ]);
    expect(ids(rows)).not.toContain("nav-order-inconsistent");
  });

  it("names every page involved so the reader can go and look", () => {
    const swapped: Array<[string, string]> = [MENU[0], MENU[2], MENU[1]];
    const rows = compareNavigation([
      page("https://s.com/a", MENU),
      page("https://s.com/b", swapped),
    ]);
    const order = rows.find((r) => r.ruleId === "nav-order-inconsistent")!;
    expect(order.pages).toEqual(["https://s.com/a", "https://s.com/b"]);
  });
});
