import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { withTimeout } from "../utils/timeout.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { renderAndScan, SiteBlockedError } from "../services/render/renderPage.js";
import { describeScanFailure } from "../services/scanFailure.js";
import { scanUrlToReport } from "../services/scanPipeline.js";
import { selectPagesToAudit } from "../services/crawl/discoverPages.js";
import { aggregateAudit, type PageOutcome } from "../services/crawl/aggregateAudit.js";

// A site audit is several full scans, so it is bounded on every axis: how many
// pages, how long in total, and how many run at once. An unbounded crawl on a
// large site would pin the browser pool and starve every other request.
const MAX_PAGES = 10;
const AUDIT_BUDGET_MS = 240_000;
// Two at a time: enough to cut wall-clock roughly in half, low enough to leave
// room in the pool (MAX_CONCURRENT_RENDERS) for ordinary single-page scans.
const PAGE_CONCURRENCY = 2;

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
      return reply.status(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
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
      if (err instanceof SiteBlockedError) {
        return reply.status(422).send({ error: err.message });
      }
      logger.warn({ err, url: entryUrl.toString() }, "Audit entry render failed");
      return reply.status(502).send({ error: "Could not load or scan the page" });
    }

    const pages = selectPagesToAudit(resolvedEntry, links, parsed.data.maxPages);
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
          outcomes.push({ ...page, error: "Not scanned — the audit ran out of time." });
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
            parsed.data.language
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
          outcomes.push({ ...page, error: failure.message });
        }
      }
    };

    await Promise.all(Array.from({ length: PAGE_CONCURRENCY }, worker));

    // Workers finish out of order; restore the discovery order so the entry
    // page leads and the report reads predictably.
    const order = new Map(pages.map((p, i) => [p.url, i]));
    outcomes.sort((a, b) => (order.get(a.url) ?? 0) - (order.get(b.url) ?? 0));

    return aggregateAudit(resolvedEntry, outcomes, parsed.data.language);
  });
}
