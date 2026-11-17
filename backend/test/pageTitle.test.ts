import { describe, it, expect, afterEach } from "vitest";
import { decodeEntities, extractTitle, lookupPageTitle } from "../src/services/pilot/pageTitle.js";

/**
 * The pilot's page-title lookup fetches an address a participant typed, so
 * beside reading titles it must refuse internal addresses, including one
 * reached by redirect, and give back only a short title.
 */

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

// IP literals skip the DNS step in assertSafeUrl, so these run offline.
const PUBLIC = "http://93.184.216.34/checkout";

function serve(responses: Array<() => Response>) {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(String(url));
    const next = responses.shift();
    if (!next) throw new Error("unexpected fetch");
    return next();
  }) as unknown as typeof fetch;
  return urls;
}
const html = (body: string) => () => new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });

describe("extractTitle", () => {
  it("reads the title, tidies it and decodes entities", () => {
    expect(extractTitle("<html><head><title>\n  Checkout &ndash; Shop &amp; Co\n</title>")).toBe("Checkout &ndash; Shop & Co");
    expect(decodeEntities("Caf&#233; &#x2013; menu")).toBe("Café – menu");
  });
  it("falls back to og:title, and gives null when there is neither", () => {
    expect(extractTitle('<meta property="og:title" content="Opening hours">')).toBe("Opening hours");
    expect(extractTitle("<p>no title</p>")).toBeNull();
  });
  it("caps a runaway title", () => {
    expect(extractTitle(`<title>${"x".repeat(500)}</title>`)?.length).toBe(200);
  });
});

describe("lookupPageTitle", () => {
  it("returns the page's title", async () => {
    serve([html("<title>Checkout – Example Shop</title>")]);
    expect(await lookupPageTitle(PUBLIC)).toBe("Checkout – Example Shop");
  });

  it("follows a redirect to another public address", async () => {
    const urls = serve([
      () => new Response(null, { status: 301, headers: { location: "http://93.184.216.35/new" } }),
      html("<title>Moved here</title>"),
    ]);
    expect(await lookupPageTitle(PUBLIC)).toBe("Moved here");
    expect(urls).toEqual([PUBLIC, "http://93.184.216.35/new"]);
  });

  it("refuses a redirect into the private network, without fetching it", async () => {
    const urls = serve([() => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } })]);
    expect(await lookupPageTitle(PUBLIC)).toBeNull();
    expect(urls).toEqual([PUBLIC]);
  });

  it("refuses an internal address outright", async () => {
    const urls = serve([]);
    expect(await lookupPageTitle("http://127.0.0.1:8787/admin")).toBeNull();
    expect(urls).toEqual([]);
  });

  it("gives null for something that is not a web page", async () => {
    serve([() => new Response("{}", { headers: { "content-type": "application/json" } })]);
    expect(await lookupPageTitle(PUBLIC)).toBeNull();
  });
});
