import type { FastifyInstance } from "fastify";
import { env, hasMailProvider } from "../config/env.js";
import { localModelName } from "../services/plainLanguage/localModel.js";
import { z } from "zod";
import { lookupPageTitle } from "../services/pilot/pageTitle.js";
import { readAddress } from "../services/pilot/readAddress.js";
import { draftFinding, mailPilotReport, nextFollowUp, pilotDraftSchema, pilotOpen, reportFieldsSchema, severityFor, submitBodySchema, wakeModel } from "../services/pilot/pilot.js";
import { storageStatus } from "../storage/db.js";
import { listPilotReports, pilotTotals, savePilotReport } from "../storage/pilot.js";
import { requireAdmin } from "./account.js";

/**
 * The assistive-technology pilot (services/pilot/pilot.ts). The form is
 * backend/public/pilot.html.
 *
 * GET  /api/pilot          is the pilot open, and is there a model
 * POST /api/pilot/followup the one question to ask before drafting, or none
 * POST /api/pilot/draft    the model's finding from a reported barrier, or
 *                          the finding again after a change they asked for
 * POST /api/pilot/report   store the report (and mail it, if mail is set up)
 * GET  /api/pilot/reports  the operator's view: every report and the totals
 * POST /api/pilot/wake     start the model waking while the form is filled in
 * POST /api/pilot/page     what was typed in the address field, read as an
 *                          address (readAddress.ts), and that page's title
 *
 * There is no invitation code: anyone may report, bounded by the rate
 * limits. Reading the reports needs ADMIN_TOKEN.
 */
export async function pilotRoutes(app: FastifyInstance) {
  app.get("/api/pilot", async () => ({
    open: pilotOpen(),
    model: localModelName() ?? null,
    // Where a report goes. The form says so before anyone types, so nobody
    // writes a paragraph into a pilot that cannot keep it.
    stores: storageStatus().configured,
    mails: hasMailProvider,
  }));

  app.post(
    "/api/pilot/draft",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      const parsed = draftBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      // The address alone is enough (the page is scanned); otherwise the
      // participant's own sentence is.
      if (!parsed.data.barrier && !parsed.data.pageUrl) return reply.status(400).send({ error: "invalid_request", fields: ["barrier"] });
      const { previous, change, ...report } = parsed.data;
      const result = await draftFinding(report, previous && change ? { previous, change } : undefined);
      return reply.send({ ...result, severity: severityFor(parsed.data.impact, result.draft?.impact) });
    }
  );

  // The conversation's one follow-up: what the owner would still need to
  // know, worded by the model when it answers in time and scripted when it
  // does not (nextFollowUp).
  app.post(
    "/api/pilot/followup",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      const parsed = reportFieldsSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      return reply.send(await nextFollowUp(parsed.data));
    }
  );

  app.post(
    "/api/pilot/report",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      const raw = request.body as { company_url?: unknown } | null;
      if (raw && typeof raw.company_url === "string" && raw.company_url.length > 0) return reply.send({ ok: true });
      const parsed = submitBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      if (!parsed.data.barrier && !parsed.data.pageUrl) return reply.status(400).send({ error: "invalid_request", fields: ["barrier"] });

      const model = localModelName();
      const id = savePilotReport(parsed.data, model);
      const mailed = hasMailProvider ? (await mailPilotReport(parsed.data, model)).ok : false;
      // Kept nowhere is a failure, said as one: the participant's words
      // must not be accepted and then dropped.
      if (!id && !mailed) return reply.status(503).send({ error: "not_stored" });
      return reply.send({ ok: true, stored: Boolean(id), mailed });
    }
  );

  app.post(
    "/api/pilot/page",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      // Free text, not only a URL: "acsessobilty nl" is read as the address
      // the person meant (readAddress.ts), and the form shows it back to them.
      const parsed = z.object({ url: z.string().trim().min(1).max(2000) }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });
      const reading = await readAddress(parsed.data.url);
      // This fetches an address the caller typed: every hop goes through
      // the SSRF guard (pageTitle.ts) and only the title comes back.
      const title = reading.url && reading.reached ? await lookupPageTitle(reading.url) : null;
      return reply.send({ ...reading, title });
    }
  );

  // The form calls this the first time someone moves into a field, so the
  // model's worker wakes while they type (wakeModel, pilot.ts).
  app.post(
    "/api/pilot/wake",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (_request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      return reply.status(202).send({ waking: wakeModel() });
    }
  );

  app.get("/api/pilot/reports", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return reply.send({ totals: pilotTotals(), reports: listPilotReports() });
  });
}

/** A draft request, or a redraft: the finding they read and what they
 *  said is wrong with it. */
const draftBodySchema = reportFieldsSchema.extend({
  previous: pilotDraftSchema.optional(),
  change: z.string().trim().min(1).max(1000).optional(),
});

function fieldErrors(error: { issues: Array<{ path: PropertyKey[] }> }): string[] {
  return [...new Set(error.issues.map((i) => String(i.path[0] ?? "")).filter(Boolean))];
}
