// Finds the handful of pages worth auditing on a site.
//
// This is deliberately NOT a general web crawler. Scanning a page costs ~15s
// of a headless browser, so the goal is a small, representative sample rather
// than coverage: the entry page plus the pages a visitor is most likely to
// reach from it. Depth 1 gets that for almost every small-business site, and
// the page types that matter (contact, about, products, checkout) are nearly
// always one click from the home page.
//
// The candidates are the entry page's links and, after them, the addresses
// in the site's own sitemap (crawl/sitemap.ts). The sitemap adds the pages a
// home page does not link to; it does not raise the number scanned.
//
// Same-origin only. Following off-site links would scan somebody else's
// property without their consent, and bill this service for it.

export interface DiscoveredPage {
  url: string;
  // Link text that led here — used to label the page in the report when its
  // <title> turns out to be unhelpful.
  label: string;
}

// Paths that add nothing to an accessibility audit but are commonly linked:
// binaries we can't render as pages, and endpoints that would either log the
// scanner out or fire a side effect.
const SKIP_EXTENSIONS =
  /\.(pdf|zip|docx?|xlsx?|pptx?|csv|jpe?g|png|gif|webp|svg|avif|mp4|webm|mp3|wav|dmg|exe|rss|xml)$/i;
const SKIP_PATH =
  /\/(logout|signout|sign-out|log-out|cart|basket|checkout\/(complete|success)|wp-admin|admin|api)(\/|$)/i;

/**
 * Picks up to `limit` same-origin pages from the links found on the entry
 * page, including the entry page itself as the first result.
 *
 * Pure and deterministic given the same input, so the selection can be
 * unit-tested without a browser.
 */
export function selectPagesToAudit(
  entryUrl: string,
  links: Array<{ href: string; text: string; fromSitemap?: boolean }>,
  limit: number,
  // The site's robots rules, when it has any. They apply to the pages the
  // scanner picks for itself and never to the entry page: that address was
  // typed by a person, which is a visit, and robots.txt is about crawlers.
  isAllowed?: (pathAndQuery: string) => boolean,
  // Told how many candidates the rules took out, so the audit can say so.
  onExcluded?: (url: string) => void
): DiscoveredPage[] {
  let entry: URL;
  try {
    entry = new URL(entryUrl);
  } catch {
    return [];
  }

  const pages: DiscoveredPage[] = [{ url: normalize(entry).toString(), label: "Home page" }];
  const seen = new Set([normalize(entry).toString()]);

  // Ranked, not first-come: a nav menu's link order is arbitrary, but the
  // pages a business most needs audited are predictable — the ones where a
  // visitor makes contact, buys something, or reads terms. A blocked contact
  // form costs more than a blocked blog post.
  const ranked = [...links]
    .map((link) => ({ link, score: link.fromSitemap ? sitemapImportance(link.href) : pageImportance(link) }))
    .sort((a, b) => b.score - a.score);

  for (const { link } of ranked) {
    if (pages.length >= limit) break;

    let url: URL;
    try {
      url = new URL(link.href, entry);
    } catch {
      continue;
    }

    if (url.origin !== entry.origin) continue;
    if (!/^https?:$/.test(url.protocol)) continue;
    if (SKIP_EXTENSIONS.test(url.pathname)) continue;
    if (SKIP_PATH.test(url.pathname)) continue;

    const normalized = normalize(url).toString();
    if (seen.has(normalized)) continue;
    seen.add(normalized);

    if (isAllowed && !isAllowed(`${url.pathname}${url.search}`)) {
      onExcluded?.(normalized);
      continue;
    }

    const label = link.text.replace(/\s+/g, " ").trim().slice(0, 60);
    pages.push({ url: normalized, label: label || url.pathname });
  }

  return pages;
}

// Strips the fragment and any trailing slash so "/about", "/about/" and
// "/about#team" don't get scanned as three separate pages. The query string is
// kept — on plenty of sites it selects genuinely different content.
function normalize(url: URL): URL {
  const copy = new URL(url.toString());
  copy.hash = "";
  if (copy.pathname.length > 1 && copy.pathname.endsWith("/")) {
    copy.pathname = copy.pathname.replace(/\/+$/, "");
  }
  return copy;
}

// The kinds of page worth auditing first, by consequence to the business:
// somewhere a visitor transacts or makes contact, over somewhere they browse.
const PAGE_KINDS: Array<[string, number]> = [
  ["contact|enquir|inquir|support|help", 100],
  ["book|reserv|appointment|register|sign[- ]?up|join", 95],
  ["shop|product|store|pricing|price|plan|buy", 90],
  ["about|team|who[- ]we[- ]are", 80],
  ["service|what[- ]we[- ]do|solution", 75],
  ["accessib|terms|privacy|legal", 70],
  ["news|blog|article|event", 40],
];

// A page known only from the sitemap has no link text, so its address is all
// there is to rank it by, and an address alone misleads. Measured on two
// real sitemaps. On gov.uk, ranked like a link, the pages picked beside the
// home page were a research paper ("...supporting-research..."), an internal
// manual ("enquiry-manual") and two more, each on a keyword inside a long
// slug. On wordpress.org it was /facebook, /facebook-2 and /facebook-3, on
// the "book" in them.
//
// So a sitemap page takes a kind only where its address is itself the page's
// name: one short segment such as /contact or /about-us (or the same under a
// language code, /en/contact-us), with the keyword at the start of a word.
// Every other sitemap page ranks under any link a visitor can see on the
// entry page, and is scanned only when those run out.
const SITEMAP_FILL = 5;
function sitemapImportance(href: string): number {
  let segments: string[];
  try {
    segments = new URL(href).pathname.split("/").filter(Boolean);
  } catch {
    return SITEMAP_FILL;
  }
  if (segments.length === 2 && /^[a-z]{2}(-[a-z]{2})?$/i.test(segments[0])) segments = segments.slice(1);
  if (segments.length !== 1) return SITEMAP_FILL;
  const words = segments[0]
    .replace(/\.[a-z0-9]+$/i, "")
    .toLowerCase()
    .split(/[-_]+/);
  if (words.length > 3) return SITEMAP_FILL;
  const name = words.join(" ");
  for (const [kind, score] of PAGE_KINDS) {
    if (new RegExp(`\\b(?:${kind})`).test(name)) return score;
  }
  return SITEMAP_FILL;
}

// Higher is more worth auditing.
function pageImportance(link: { href: string; text: string }): number {
  const haystack = `${link.href} ${link.text}`.toLowerCase();
  for (const [kind, score] of PAGE_KINDS) {
    if (new RegExp(kind).test(haystack)) return score;
  }
  // Deep paths tend to be individual articles — one is a useful sample, but
  // they shouldn't crowd out the top-level pages.
  const depth = (link.href.match(/\//g) ?? []).length;
  return depth > 4 ? 10 : 50;
}
