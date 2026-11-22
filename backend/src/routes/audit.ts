import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { renderAndScan } from "../services/render/renderPage.js";
import { describeScanFailure } from "../services/scanFailure.js";
import { scanUrlToReport } from "../services/scanPipeline.js";
import { selectPagesToAudit } from "../services/crawl/discoverPages.js";
import { discoverFromSitemap, makeTextFetcher, type SiteMapDiscovery } from "../services/crawl/sitemap.js";
import { aggregateAudit, type PageOutcome } from "../services/crawl/aggregateAudit.js";
import { accountForKey, bearerFrom } from "../storage/accounts.js";
import { saveAudit } from "../storage/audits.js";

// A site audit is several full scans, so it is bounded on every axis: how many
// pages, how long in total, and how many run at once. An unbounded crawl on a
// large site would pin the browser pool and starve every other request.
const MAX_PAGES = 10;
const AUDIT_BUDGET_MS = 240_000;
//
// Linked documents are counted on every page of an audit and none is
// opened, where a single page scan opens two PDFs. Measured before
// deciding, on 22 Nov 2026 from a laptop, through this route with the AI
// review off:
//
//   etsi.org    5 pages  39.5 s      10 pages  58.2 s
//   gov.uk      5 pages  22.6 s
//
// and one PDF check takes 0.02 to 1.2 s (see LINKED_PDF_BUDGET_MS in
// services/documents/linkedDocuments.ts). Here that is room to spare: ten
// pages used a quarter of the budget. The deployed service is the one that
// counts, and it renders four to six times slower than this laptop (the
// moma.org note in scanPipeline.ts: eight seconds here, forty-six there).
// Ten pages at that rate is 230 to 350 s, which is the whole budget or
// past it before a document is opened, and a sample allowed its full 12 s
// on each of ten pages, two at a time, is another 60 s. So the budget
// does not allow it where it runs. The deployed figure is scaled from one
// measured page, not timed there; an audit timed on the service itself
// is what would reopen this.
//
// There is a second reason, and it would hold with any budget: the pages
// of one site link to the same files (a footer's price list), so a sample
// per page opens the same two documents ten times over. A sample for an
// audit belongs after the pages, taken once from the site's own list.
//
// Two at a time: enough to cut wall-clock roughly in half, low enough to leave
// room in the pool (MAX_CONCURRENT_RENDERS) for ordinary single-page scans.
const PAGE_CONCURRENCY = 2;
// The sitemap read is a few small text files, and the whole of it stops at
// ten seconds. That figure is chosen, not measured on a sample of sites: the
// fetcher gives up on any one file at 8s, and ten keeps the worst case small
// beside the 240s budget. Only a handful of the addresses are ever scanned
// (MAX_PAGES), so 2000 is far more than the ranking needs.
const SITEMAP_BUDGET_MS = 10_000;
const SITEMAP_URL_CAP = 2000;

const auditBodySchema = z.object({
  url: z.string().min(1, "url is required"),
  maxPages: z.number().int().min(1).max(MAX_PAGES).optional().default(5),
  // AI review defaults OFF here, unlike a single scan: at ~25s per page it
  // would dominate the time budget and multiply the per-audit cost by the
  // page count. The deterministic layers are what make a site audit useful.
  includeAiReview: z.boolean().optional().default(false),
  // Same contract as a single scan — see scanBodySchema.
  language: z.string().optional(),
});

export async function auditRoutes(app: FastifyInstance) {
  app.post("/api/audit", async (request, reply) => {
    const parsed = auditBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Something in that request wasn't right. Reload the page and try again.", details: parsed.error.flatten() });
    }

    let entryUrl: URL;
    try {
      entryUrl = await assertSafeUrl(parsed.data.url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) return reply.status(400).send({ error: err.message });
      throw err;
    }

    // Render the entry page once just to read its links. Cheaper than a full
    // scan, and it fails fast on an unreachable or bot-blocked site before we
    // commit to a multi-page budget.
    let links: Array<{ href: string; text: string }>;
    let resolvedEntry: string;
    try {
      const entryRender = await withTimeout(
        renderAndScan(entryUrl.toString()),
        env.RENDER_TIMEOUT_MS + 5000,
        "Entry page render"
      );
      links = entryRender.domSignals.pageLinks;
      resolvedEntry = entryRender.finalUrl;
    } catch (err) {
      // The same classifier as a single page, so a 404 or a slow entry page
      // says so instead of "Couldn't load or scan the page".
      const failure = describeScanFailure(err);
      if (failure.logLevel === "warn") logger.warn({ err, url: entryUrl.toString() }, "Audit entry render failed");
      return reply.status(failure.status).send({
        error: failure.message,
        ...(failure.reason ? { reason: failure.reason } : {}),
        ...(failure.blocked ? { blocked: true } : {}),
      });
    }

    // The site's own list of its pages, read beside the entry page's links,
    // and its robots rules for the pages picked here. Bounded: a site with
    // a slow or missing sitemap must cost the audit seconds, not its budget,
    // and a failure here is never the audit's failure.
    let siteMap: SiteMapDiscovery = { urls: [], sitemap: null, robots: null };
    try {
      siteMap = await withTimeout(
        discoverFromSitemap(resolvedEntry, { fetchText: makeTextFetcher(), maxUrls: SITEMAP_URL_CAP }),
        SITEMAP_BUDGET_MS,
        "Sitemap read"
      );
    } catch (err) {
      logger.info({ err, url: resolvedEntry }, "Sitemap not read, continuing with the entry page's links");
    }
    let excludedByRobots = 0;
    const pages = selectPagesToAudit(
      resolvedEntry,
      // The entry page's links first: the sort inside is stable, so between
      // two pages of equal weight the one a visitor can reach from the home
      // page is kept. A sitemap page is ranked by its own rule, see
      // sitemapImportance.
      [...links, ...siteMap.urls.map((href) => ({ href, text: "", fromSitemap: true }))],
      parsed.data.maxPages,
      siteMap.robots ? (path) => siteMap.robots!.isAllowed(path) : undefined,
      () => {
        excludedByRobots += 1;
      }
    );
    const deadline = Date.now() + AUDIT_BUDGET_MS;
    const outcomes: PageOutcome[] = [];

    // Simple worker pool over a shared cursor.
    let cursor = 0;
    const worker = async () => {
      for (;;) {
        const index = cursor++;
        if (index >= pages.length) return;
        const page = pages[index];

        if (Date.now() > deadline) {
          // Out of time rather than broken — say which, so a partial audit
          // isn't mistaken for a site where those pages failed.
          outcomes.push({ ...page, error: "Not scanned – the audit ran out of time." });
          continue;
        }

        try {
          // No auth for crawled pages, and no evidence capture: this
          // aggregate returns counts and conformance, never screenshots, so
          // cropping them would be work thrown away on every page.
          const report = await scanUrlToReport(
            page.url,
            parsed.data.includeAiReview,
            undefined,
            false,
            parsed.data.language,
            false,
            undefined,
            // Counted on every page, opened on none. See AUDIT_BUDGET_MS.
            "count-for-site-audit"
          );
          outcomes.push({ ...page, report });
        } catch (err) {
          // One bad page must not sink the audit — record it and continue.
          //
          // The reason comes from the same classifier the single-page route
          // uses. This used to say "This page could not be scanned" for
          // everything except a blocked site, which told the reader nothing
          // and hid the cases they could act on: a page that merely timed out
          // is worth retrying, a blocked one needs an allowlist, and a crash
          // is ours rather than theirs.
          const failure = describeScanFailure(err);
          logger.info({ err, url: page.url }, "Audit page failed, continuing");
          outcomes.push({ ...page, error: failure.message, ...(failure.reason ? { errorReason: failure.reason } : {}) });
        }
      }
    };

    await Promise.all(Array.from({ length: PAGE_CONCURRENCY }, worker));

    // Workers finish out of order; restore the discovery order so the entry
    // page leads and the report reads predictably.
    const order = new Map(pages.map((p, i) => [p.url, i]));
    outcomes.sort((a, b) => (order.get(a.url) ?? 0) - (order.get(b.url) ?? 0));

    const audit = aggregateAudit(resolvedEntry, outcomes, parsed.data.language);
    if (siteMap.sitemap || excludedByRobots > 0) {
      audit.discovery = {
        ...(siteMap.sitemap ? { sitemap: siteMap.sitemap } : {}),
        sitemapUrls: siteMap.urls.length,
        excludedByRobots,
      };
    }
    // Saved for a caller who identified themselves, like a scan. An audit
    // is the better source of a SITE's open questions, so this is what
    // makes guided manual testing ask about the site rather than a page.
    const account = accountForKey(bearerFrom(request.headers.authorization));
    if (account) {
      try {
        const savedAs = saveAudit(account.id, audit);
        return { ...audit, savedAs };
      } catch (err) {
        logger.warn({ err, url: resolvedEntry }, "audit completed but could not be saved");
      }
    }
    return audit;
  });
}
