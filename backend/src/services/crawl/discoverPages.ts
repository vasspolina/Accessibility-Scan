// Finds the handful of pages worth auditing on a site.
//
// This is deliberately NOT a general web crawler. Scanning a page costs ~15s
// of a headless browser, so the goal is a small, representative sample rather
// than coverage: the entry page plus the pages a visitor is most likely to
// reach from it. Depth 1 gets that for almost every small-business site, and
// the page types that matter (contact, about, products, checkout) are nearly
// always one click from the home page.
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
  links: Array<{ href: string; text: string }>,
  limit: number
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
    .map((link) => ({ link, score: pageImportance(link) }))
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

// Higher is more worth auditing. Weighted by consequence to the business:
// somewhere a visitor transacts or makes contact, over somewhere they browse.
function pageImportance(link: { href: string; text: string }): number {
  const haystack = `${link.href} ${link.text}`.toLowerCase();
  if (/contact|enquir|inquir|support|help/.test(haystack)) return 100;
  if (/book|reserv|appointment|register|sign[- ]?up|join/.test(haystack)) return 95;
  if (/shop|product|store|pricing|price|plan|buy/.test(haystack)) return 90;
  if (/about|team|who[- ]we[- ]are/.test(haystack)) return 80;
  if (/service|what[- ]we[- ]do|solution/.test(haystack)) return 75;
  if (/accessib|terms|privacy|legal/.test(haystack)) return 70;
  if (/news|blog|article|event/.test(haystack)) return 40;
  // Deep paths tend to be individual articles — one is a useful sample, but
  // they shouldn't crowd out the top-level pages.
  const depth = (link.href.match(/\//g) ?? []).length;
  return depth > 4 ? 10 : 50;
}
