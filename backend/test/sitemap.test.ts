import { describe, it, expect } from "vitest";
import {
  parseRobotsTxt,
  parseSitemap,
  discoverFromSitemap,
  readSitemap,
} from "../src/services/crawl/sitemap.js";
import { selectPagesToAudit } from "../src/services/crawl/discoverPages.js";

/**
 * The site's own list of its pages, and its rules for crawlers.
 *
 * Two ways this goes wrong matter more than the rest. Reading a rule that is
 * not there shrinks an audit to one page and says nothing; missing a rule
 * that is there scans a page the owner asked crawlers to leave alone. Both
 * directions are tested.
 */

describe("parseRobotsTxt", () => {
  it("allows everything when nothing is disallowed", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow:\n");
    expect(rules.isAllowed("/")).toBe(true);
    expect(rules.isAllowed("/anything/at/all")).toBe(true);
  });

  it("refuses a disallowed path and what is under it", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /private\n");
    expect(rules.isAllowed("/private")).toBe(false);
    expect(rules.isAllowed("/private/report")).toBe(false);
    expect(rules.isAllowed("/public")).toBe(true);
  });

  it("lets the longest matching rule decide, and Allow win a tie", () => {
    const rules = parseRobotsTxt(
      ["User-agent: *", "Disallow: /shop", "Allow: /shop/help", "Disallow: /tie", "Allow: /tie"].join("\n")
    );
    expect(rules.isAllowed("/shop/cart")).toBe(false);
    expect(rules.isAllowed("/shop/help/returns")).toBe(true);
    expect(rules.isAllowed("/tie")).toBe(true);
  });

  it("reads * as any run of characters and $ as the end of the path", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /*?session=\nDisallow: /*.json$\n");
    expect(rules.isAllowed("/page?session=abc")).toBe(false);
    expect(rules.isAllowed("/data.json")).toBe(false);
    // The $ ends the path: the same letters further in are not a match.
    expect(rules.isAllowed("/data.json/readme")).toBe(true);
  });

  it("takes the group written for this scanner over the one for everyone", () => {
    const text = [
      "User-agent: *",
      "Disallow: /",
      "",
      "User-agent: A11yCheckerBot",
      "Disallow: /drafts",
    ].join("\n");
    const rules = parseRobotsTxt(text);
    // Shut to every other crawler, open to this one except for /drafts.
    expect(rules.isAllowed("/contact")).toBe(true);
    expect(rules.isAllowed("/drafts/one")).toBe(false);
  });

  it("does not take another crawler's rules for its own", () => {
    const rules = parseRobotsTxt("User-agent: Googlebot\nDisallow: /\n");
    expect(rules.isAllowed("/contact")).toBe(true);
  });

  it("reads several user-agent lines in a row as one group", () => {
    const rules = parseRobotsTxt("User-agent: Googlebot\nUser-agent: *\nDisallow: /both\n");
    expect(rules.isAllowed("/both")).toBe(false);
  });

  it("starts a new group at a user-agent line that follows a rule", () => {
    const text = ["User-agent: Googlebot", "Disallow: /", "User-agent: *", "Disallow: /only-this"].join("\n");
    const rules = parseRobotsTxt(text);
    expect(rules.isAllowed("/contact")).toBe(true);
    expect(rules.isAllowed("/only-this")).toBe(false);
  });

  it("ignores comments, blank lines and letter case in field names", () => {
    const rules = parseRobotsTxt("# a comment\n\nUSER-AGENT: *\ndisallow: /x # trailing\n");
    expect(rules.isAllowed("/x")).toBe(false);
  });

  it("collects the Sitemap lines wherever they stand", () => {
    const rules = parseRobotsTxt(
      "Sitemap: https://example.com/a.xml\nUser-agent: *\nDisallow: /x\nsitemap: https://example.com/b.xml\n"
    );
    expect(rules.sitemaps).toEqual(["https://example.com/a.xml", "https://example.com/b.xml"]);
  });

  it("always allows robots.txt itself", () => {
    expect(parseRobotsTxt("User-agent: *\nDisallow: /\n").isAllowed("/robots.txt")).toBe(true);
  });
});

describe("parseSitemap", () => {
  it("reads the pages of a urlset", () => {
    const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/</loc><lastmod>2026-01-01</lastmod></url>
      <url><loc> https://example.com/contact </loc></url>
    </urlset>`;
    expect(parseSitemap(xml)).toEqual({
      urls: ["https://example.com/", "https://example.com/contact"],
      sitemaps: [],
    });
  });

  it("reads the children of a sitemap index, and no pages from it", () => {
    const xml = `<sitemapindex><sitemap><loc>https://example.com/pages.xml</loc></sitemap></sitemapindex>`;
    expect(parseSitemap(xml)).toEqual({ urls: [], sitemaps: ["https://example.com/pages.xml"] });
  });

  it("decodes entities and CDATA, which real sitemaps use for query strings", () => {
    const xml = `<urlset>
      <url><loc>https://example.com/s?a=1&amp;b=2</loc></url>
      <url><loc><![CDATA[https://example.com/t?a=1&b=2]]></loc></url>
    </urlset>`;
    expect(parseSitemap(xml).urls).toEqual(["https://example.com/s?a=1&b=2", "https://example.com/t?a=1&b=2"]);
  });

  it("does not mistake an image entry for a page", () => {
    const xml = `<urlset><url><loc>https://example.com/p</loc>
      <image:image><image:loc>https://example.com/p.jpg</image:loc></image:image></url></urlset>`;
    expect(parseSitemap(xml).urls).toEqual(["https://example.com/p"]);
  });

  it("reads the plain text form, one address on each line", () => {
    expect(parseSitemap("https://example.com/a\n\nhttps://example.com/b\nnot an address\n").urls).toEqual([
      "https://example.com/a",
      "https://example.com/b",
    ]);
  });

  it("finds no pages in a web page served at the sitemap's address", () => {
    // A soft 404: the server answers 200 with its not-found page.
    const html = `<!doctype html><html><body><a href="https://example.com/a">https://example.com/a</a></body></html>`;
    expect(parseSitemap(html)).toEqual({ urls: [], sitemaps: [] });
  });
});

function fakeSite(files: Record<string, string>) {
  const asked: string[] = [];
  return {
    asked,
    fetchText: async (url: string) => {
      asked.push(url);
      return files[url] ?? null;
    },
  };
}

describe("discoverFromSitemap", () => {
  it("follows the Sitemap line in robots.txt", async () => {
    const site = fakeSite({
      "https://example.com/robots.txt": "User-agent: *\nDisallow: /admin\nSitemap: https://example.com/map.xml\n",
      "https://example.com/map.xml": "<urlset><url><loc>https://example.com/contact</loc></url></urlset>",
    });
    const found = await discoverFromSitemap("https://example.com/some/page", site);
    expect(found.urls).toEqual(["https://example.com/contact"]);
    expect(found.sitemap).toBe("https://example.com/map.xml");
    expect(found.robots?.isAllowed("/admin")).toBe(false);
    // It never guessed /sitemap.xml once robots.txt had named one.
    expect(site.asked).not.toContain("https://example.com/sitemap.xml");
  });

  it("falls back to /sitemap.xml when robots.txt names none", async () => {
    const site = fakeSite({
      "https://example.com/sitemap.xml": "<urlset><url><loc>https://example.com/a</loc></url></urlset>",
    });
    const found = await discoverFromSitemap("https://example.com/", site);
    expect(found.urls).toEqual(["https://example.com/a"]);
    expect(found.robots).toBeNull();
  });

  it("follows a sitemap index to its children", async () => {
    const site = fakeSite({
      "https://example.com/sitemap.xml":
        "<sitemapindex><sitemap><loc>https://example.com/one.xml</loc></sitemap><sitemap><loc>https://example.com/two.xml</loc></sitemap></sitemapindex>",
      "https://example.com/one.xml": "<urlset><url><loc>https://example.com/1</loc></url></urlset>",
      "https://example.com/two.xml": "<urlset><url><loc>https://example.com/2</loc></url></urlset>",
    });
    const found = await discoverFromSitemap("https://example.com/", site);
    expect(found.urls).toEqual(["https://example.com/1", "https://example.com/2"]);
    expect(found.sitemap).toBe("https://example.com/one.xml");
  });

  it("stops at the caps, on a sitemap that points to itself as well", async () => {
    const many = Array.from({ length: 50 }, (_, i) => `<url><loc>https://example.com/p${i}</loc></url>`).join("");
    const site = fakeSite({
      "https://example.com/sitemap.xml":
        "<sitemapindex><sitemap><loc>https://example.com/sitemap.xml</loc></sitemap><sitemap><loc>https://example.com/a.xml</loc></sitemap><sitemap><loc>https://example.com/b.xml</loc></sitemap></sitemapindex>",
      "https://example.com/a.xml": `<urlset>${many}</urlset>`,
      "https://example.com/b.xml": `<urlset>${many}</urlset>`,
    });
    const capped = await discoverFromSitemap("https://example.com/", { ...site, maxUrls: 10 });
    expect(capped.urls).toHaveLength(10);
    const fewFiles = await discoverFromSitemap("https://example.com/", { ...site, maxSitemaps: 2 });
    // The index and one child: fifty pages, and the second child never read.
    expect(fewFiles.urls).toHaveLength(50);
  });

  it("reaches pages when robots.txt names many sitemaps that are each an index", async () => {
    // wordpress.org, measured: nine sitemaps in robots.txt, eight of them
    // indexes. Read in the order found, five files were five indexes.
    const names = ["a", "b", "c", "d", "e", "f"];
    const files: Record<string, string> = {
      "https://example.com/robots.txt": names.map((n) => `Sitemap: https://example.com/${n}/sitemap.xml`).join("\n"),
    };
    for (const n of names) {
      files[`https://example.com/${n}/sitemap.xml`] =
        `<sitemapindex><sitemap><loc>https://example.com/${n}/pages.xml</loc></sitemap></sitemapindex>`;
      files[`https://example.com/${n}/pages.xml`] = `<urlset><url><loc>https://example.com/${n}/one</loc></url></urlset>`;
    }
    const found = await discoverFromSitemap("https://example.com/", { ...fakeSite(files), maxSitemaps: 5 });
    expect(found.urls.length).toBeGreaterThanOrEqual(2);
    expect(found.urls[0]).toBe("https://example.com/a/one");
  });

  it("answers with nothing, and does not throw, for a site with neither file", async () => {
    const found = await discoverFromSitemap("https://example.com/", fakeSite({}));
    expect(found).toEqual({ urls: [], sitemap: null, robots: null });
  });

  it("does not throw when the fetch itself does", async () => {
    const found = await discoverFromSitemap("https://example.com/", {
      fetchText: async () => {
        throw new Error("network down");
      },
    });
    expect(found.urls).toEqual([]);
  });

  it("does not read rules out of a web page served as robots.txt", async () => {
    const site = fakeSite({
      "https://example.com/robots.txt": "<!DOCTYPE html><html><body>User-agent: *\nDisallow: /</body></html>",
    });
    const found = await discoverFromSitemap("https://example.com/", site);
    expect(found.robots).toBeNull();
  });
});

describe("readSitemap", () => {
  it("reads a sitemap whose address is given, index or not", async () => {
    const site = fakeSite({
      "http://localhost:3000/custom-map.xml":
        "<sitemapindex><sitemap><loc>http://localhost:3000/part.xml</loc></sitemap></sitemapindex>",
      "http://localhost:3000/part.xml": "<urlset><url><loc>http://localhost:3000/a</loc></url></urlset>",
    });
    expect(await readSitemap("http://localhost:3000/custom-map.xml", site)).toEqual(["http://localhost:3000/a"]);
  });
});

describe("the crawl's page selection with a sitemap and robots rules", () => {
  const ENTRY = "https://example.com/";
  const link = (href: string, text = "") => ({ href, text });

  const mapped = (href: string) => ({ href, text: "", fromSitemap: true });

  it("finds a page the home page does not link to", () => {
    const pages = selectPagesToAudit(ENTRY, [link("/blog/a", "A post"), mapped("https://example.com/contact")], 3);
    // The contact page came from the sitemap (no link text) and still
    // outranks the blog post by its address.
    expect(pages.map((p) => p.url)).toEqual([
      "https://example.com/",
      "https://example.com/contact",
      "https://example.com/blog/a",
    ]);
    expect(pages[1].label).toBe("/contact");
  });

  it("does not let a keyword deep in a sitemap address outrank the home page's own links", () => {
    // gov.uk's sitemap, measured: these ranked first on "support" and
    // "enquiry" inside a long slug.
    const pages = selectPagesToAudit(
      ENTRY,
      [
        link("/services", "Services"),
        link("/news", "News"),
        mapped("https://example.com/research-outputs/afcap-supporting-research-and-development"),
        mapped("https://example.com/internal-manuals/enquiry-manual/em3341"),
        mapped("https://example.com/female-health-help-and-advice-pages"),
      ],
      3
    );
    expect(pages.map((p) => p.url)).toEqual([
      "https://example.com/",
      "https://example.com/services",
      "https://example.com/news",
    ]);
  });

  it("does not read a keyword out of the middle of a word", () => {
    // wordpress.org's sitemap, measured: /facebook ranked as a booking page.
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/showcase", "Showcase"), mapped("https://example.com/facebook"), mapped("https://example.com/bookings")],
      2
    );
    expect(pages[1].url).toBe("https://example.com/bookings");
    const without = selectPagesToAudit(ENTRY, [link("/showcase", "Showcase"), mapped("https://example.com/facebook")], 2);
    expect(without[1].url).toBe("https://example.com/showcase");
  });

  it("uses the sitemap's other pages when the entry page has too few links", () => {
    const filled = selectPagesToAudit(ENTRY, [link("/news", "News"), mapped("https://example.com/a/deep/page")], 3);
    expect(filled.map((p) => p.url)).toEqual([
      "https://example.com/",
      "https://example.com/news",
      "https://example.com/a/deep/page",
    ]);
  });

  it("reads a short top-level address under a language code as the page's name", () => {
    const pages = selectPagesToAudit(ENTRY, [link("/news", "News"), mapped("https://example.com/en/contact-us")], 2);
    expect(pages[1].url).toBe("https://example.com/en/contact-us");
  });

  it("leaves out a page robots.txt disallows, and says how many", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /account\n");
    const excluded: string[] = [];
    const pages = selectPagesToAudit(
      ENTRY,
      [link("/account/orders", "Orders"), link("/about", "About")],
      5,
      (path) => rules.isAllowed(path),
      (url) => excluded.push(url)
    );
    expect(pages.map((p) => p.url)).toEqual(["https://example.com/", "https://example.com/about"]);
    expect(excluded).toEqual(["https://example.com/account/orders"]);
  });

  it("still scans the entry page a person named, whatever robots.txt says", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /\n");
    const pages = selectPagesToAudit(ENTRY, [link("/about", "About")], 5, (path) => rules.isAllowed(path));
    expect(pages).toEqual([{ url: "https://example.com/", label: "Home page" }]);
  });
});
