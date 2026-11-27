// Reads a site's own list of its pages: robots.txt and sitemap.xml.
//
// The crawl used to know only the links on the entry page. That misses every
// page a site does not link from its home page, and those are often the ones
// an audit is for: a contact form reached from a footer on inner pages, a
// booking flow, the accessibility statement itself. A sitemap is the owner's
// own answer to "which pages are there", so it is read first and the entry
// page's links are still used beside it.
//
// robots.txt is read for two things. Its Sitemap lines say where the sitemap
// is. Its Disallow rules say which paths the owner has asked crawlers to stay
// out of, and a page the scanner picked for itself (as opposed to the address
// a person typed) is exactly what those rules are about.
//
// Everything that decides something here is a pure function over text, so it
// is tested without a network. The fetching is one small function at the end.

import { gunzipSync } from "node:zlib";
import { assertSafeUrl } from "../../middleware/ssrfGuard.js";

/** The token the scanner's user agent carries (see browserPool.ts). A site
 *  that writes rules for this name gets those rules; otherwise the rules
 *  for every crawler apply. */
export const ROBOTS_AGENT = "a11ycheckerbot";

export interface RobotsRules {
  /** Sitemap addresses named in the file, as written. */
  sitemaps: string[];
  /** Whether a path (with its query string) may be fetched. */
  isAllowed(pathAndQuery: string): boolean;
}

interface Rule {
  allow: boolean;
  pattern: string;
}

/**
 * robots.txt, after RFC 9309.
 *
 * The group written for this scanner's own name wins over the group for
 * every crawler; several groups for one name are read as one. Among the
 * rules that match a path the longest pattern decides, and Allow wins a
 * tie. `*` stands for any run of characters and `$` ends the path.
 *
 * A file that cannot be read is treated by the caller as no file at all,
 * which allows everything. That is the RFC's rule for a missing file, and
 * the cautious reading (refuse everything) would turn one site's server
 * error into an audit of a single page.
 */
export function parseRobotsTxt(text: string, agent: string = ROBOTS_AGENT): RobotsRules {
  const groups = new Map<string, Rule[]>();
  const sitemaps: string[] = [];
  let current: string[] = [];
  // A user-agent line directly after another one joins the same group; one
  // that follows a rule starts a new group.
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "sitemap") {
      if (value) sitemaps.push(value);
      continue;
    }
    if (field === "user-agent") {
      if (!lastWasAgent) current = [];
      const name = value.toLowerCase();
      current.push(name);
      if (!groups.has(name)) groups.set(name, []);
      lastWasAgent = true;
      continue;
    }
    if (field === "allow" || field === "disallow") {
      lastWasAgent = false;
      // An empty Disallow means "nothing is disallowed", and an empty Allow
      // says nothing at all. Neither is a rule.
      if (!value) continue;
      for (const name of current) groups.get(name)?.push({ allow: field === "allow", pattern: value });
      continue;
    }
    // Any other field (crawl-delay, host) ends a run of user-agent lines
    // without being a rule.
    lastWasAgent = false;
  }

  // A group may name the bare token or the token with its version
  // ("A11yCheckerBot/0.1"); both are this scanner.
  const own = [...groups.keys()].filter((name) => name !== "*" && name.startsWith(agent));
  const rules = own.length ? own.flatMap((name) => groups.get(name) ?? []) : groups.get("*") ?? [];

  return {
    sitemaps,
    isAllowed(pathAndQuery: string): boolean {
      const path = pathAndQuery || "/";
      // The file itself can always be fetched.
      if (path === "/robots.txt") return true;
      let best: Rule | null = null;
      for (const rule of rules) {
        if (!matchesRobotsPattern(rule.pattern, path)) continue;
        if (
          !best ||
          rule.pattern.length > best.pattern.length ||
          (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
        ) {
          best = rule;
        }
      }
      return best ? best.allow : true;
    },
  };
}

function matchesRobotsPattern(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const source = body
    .split("*")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  try {
    return new RegExp(`^${source}${anchored ? "$" : ""}`).test(path);
  } catch {
    return false;
  }
}

export interface ParsedSitemap {
  /** Page addresses, in the file's order. */
  urls: string[];
  /** Further sitemaps this file points to (a sitemap index). */
  sitemaps: string[];
}

/**
 * A sitemap in any of the three forms sites publish: a urlset, a sitemap
 * index, or a plain text file with one address on each line.
 *
 * Read with a pattern rather than an XML parser on purpose. The only thing
 * wanted is the text of each <loc>, real sitemaps are often not well-formed,
 * and a parser that refuses a file over one stray ampersand would lose the
 * whole site for it. Image and video entries carry a namespace prefix
 * (<image:loc>), so they do not match and are not mistaken for pages.
 */
export function parseSitemap(text: string): ParsedSitemap {
  const body = text.replace(/^﻿/, "");
  if (!/<(urlset|sitemapindex)[\s>]/i.test(body)) {
    // The plain text form. Anything that is not an address on its own line
    // (an HTML error page, a feed) gives no lines that pass, and so no pages.
    if (body.includes("<")) return { urls: [], sitemaps: [] };
    const urls = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//i.test(line));
    return { urls, sitemaps: [] };
  }
  const locs = [...body.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) =>
    decodeXmlEntities(m[1])
  );
  return /<sitemapindex[\s>]/i.test(body) ? { urls: [], sitemaps: locs } : { urls: locs, sitemaps: [] };
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

export interface SiteMapDiscovery {
  /** Page addresses the site lists, capped at `maxUrls`. */
  urls: string[];
  /** The sitemap the first addresses came from, or null when none was found. */
  sitemap: string | null;
  /** The site's robots rules, or null when it has no readable robots.txt. */
  robots: RobotsRules | null;
}

export interface DiscoveryOptions {
  /** Fetches a text file; null for anything that is not a readable 200. */
  fetchText: (url: string) => Promise<string | null>;
  /** Stop collecting addresses here. A big shop lists hundreds of thousands,
   *  and the caller scans a handful of them. */
  maxUrls?: number;
  /** How many sitemap files to read in all. An index can name thousands. */
  maxSitemaps?: number;
}

/**
 * Finds a site's sitemap and reads the addresses in it.
 *
 * Looks at the Sitemap lines of robots.txt first and falls back to
 * /sitemap.xml, the address nearly every generator writes. Follows a sitemap
 * index one level at a time until the caps are reached. Never throws: a site
 * with no sitemap is the ordinary case, and the answer is an empty list.
 */
export async function discoverFromSitemap(siteUrl: string, options: DiscoveryOptions): Promise<SiteMapDiscovery> {
  const maxUrls = options.maxUrls ?? 2000;
  const maxSitemaps = options.maxSitemaps ?? 5;
  let origin: string;
  try {
    origin = new URL(siteUrl).origin;
  } catch {
    return { urls: [], sitemap: null, robots: null };
  }

  const robotsText = await options.fetchText(`${origin}/robots.txt`).catch(() => null);
  // A robots.txt address that answers with a web page (a soft 404) is not a
  // robots file, and reading rules out of HTML would invent them.
  const robots = robotsText && !/^\s*<(!doctype|html)/i.test(robotsText) ? parseRobotsTxt(robotsText) : null;

  const start = robots?.sitemaps.length ? [...robots.sitemaps] : [`${origin}/sitemap.xml`];
  const walked = await walkSitemaps(start, origin, options.fetchText, maxUrls, maxSitemaps);
  return { ...walked, robots };
}

/**
 * Reads the pages of one sitemap whose address is known, following it to
 * its children when it is an index. The command's --sitemap uses this; the
 * crawl, which has to find the sitemap first, uses discoverFromSitemap.
 */
export async function readSitemap(address: string, options: DiscoveryOptions): Promise<string[]> {
  const walked = await walkSitemaps(
    [address],
    address,
    options.fetchText,
    options.maxUrls ?? 2000,
    options.maxSitemaps ?? 5
  );
  return walked.urls;
}

async function walkSitemaps(
  start: string[],
  base: string,
  fetchText: (url: string) => Promise<string | null>,
  maxUrls: number,
  maxSitemaps: number
): Promise<{ urls: string[]; sitemap: string | null }> {
  const queue = [...start];
  const seen = new Set<string>();
  const urls: string[] = [];
  let source: string | null = null;
  let read = 0;

  while (queue.length && read < maxSitemaps && urls.length < maxUrls) {
    const next = queue.shift() as string;
    let absolute: string;
    try {
      absolute = new URL(next, base).toString();
    } catch {
      continue;
    }
    if (seen.has(absolute)) continue;
    seen.add(absolute);
    read += 1;

    const text = await fetchText(absolute).catch(() => null);
    if (!text) continue;
    const parsed = parseSitemap(text);
    if (parsed.urls.length && !source) source = absolute;
    for (const url of parsed.urls) {
      if (urls.length >= maxUrls) break;
      urls.push(url);
    }
    // An index's children are read next, before the next sitemap named
    // beside it. Read in the order they were found, a site whose robots.txt
    // names nine sitemaps that are each an index (wordpress.org, measured)
    // spends the whole file limit on indexes and never reaches a page.
    queue.unshift(...parsed.sitemaps);
  }

  return { urls, sitemap: source };
}

/** The path a robots rule is matched against. */
export function robotsPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

const MAX_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

/**
 * Fetches a small text file from a site.
 *
 * Every hop is checked by the same private-address guard as a scan, and
 * redirects are followed by hand so a public address cannot hand the server
 * on to an internal one. `trustPrivateHosts` is the CLI's flag and means
 * what it means in scanUrlToReport: the person who typed the address owns
 * the machine doing the fetching.
 *
 * The body is cut off at 5 MB. Sitemaps are limited to 50 MB by their own
 * specification, but the caller wants a few thousand addresses at most and
 * those are in the first megabytes of any file.
 */
export function makeTextFetcher(trustPrivateHosts = false): (url: string) => Promise<string | null> {
  return async (startUrl: string) => {
    let url = startUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let target: URL;
      try {
        target = trustPrivateHosts ? new URL(url) : await assertSafeUrl(url);
      } catch {
        return null;
      }
      if (target.protocol !== "http:" && target.protocol !== "https:") return null;

      let res: Response;
      try {
        res = await fetch(target, {
          redirect: "manual",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            "User-Agent": "A11yCheckerBot/0.1 (+accessibility scan)",
            Accept: "text/plain, application/xml, text/xml, */*;q=0.5",
          },
        });
      } catch {
        return null;
      }

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        try {
          url = new URL(location, target).toString();
        } catch {
          return null;
        }
        continue;
      }
      if (res.status !== 200 || !res.body) return null;

      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
          size += chunk.byteLength;
          if (size > MAX_BYTES) break;
          chunks.push(chunk);
        }
      } catch {
        return null;
      }
      let bytes: Buffer = Buffer.concat(chunks);
      // sitemap.xml.gz is a gzip file served as a file, not a compressed
      // response, so fetch does not unpack it.
      if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        try {
          bytes = gunzipSync(bytes, { maxOutputLength: MAX_BYTES * 4 });
        } catch {
          return null;
        }
      }
      return bytes.toString("utf8");
    }
    return null;
  };
}
