import type { FastifyInstance } from "fastify";
import { env, hasMailProvider } from "../config/env.js";
import { localModelName } from "../services/plainLanguage/localModel.js";
import { z } from "zod";
import { lookupPageTitle } from "../services/pilot/pageTitle.js";
import { readAddress } from "../services/pilot/readAddress.js";
import { draftFinding, mailPilotReport, pilotOpen, reportFieldsSchema, severityFor, submitBodySchema } from "../services/pilot/pilot.js";
import { storageStatus } from "../storage/db.js";
import { listPilotReports, pilotTotals, savePilotReport } from "../storage/pilot.js";
import { requireAdmin } from "./account.js";

/**
 * The assistive-technology pilot (services/pilot/pilot.ts). The form is
 * backend/public/pilot.html.
 *
 * GET  /api/pilot          is the pilot open, and is there a model
 * POST /api/pilot/draft    the model's finding from a reported barrier
 * POST /api/pilot/report   store the report (and mail it, if mail is set up)
 * GET  /api/pilot/reports  the operator's view: every report and the totals
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
      const parsed = reportFieldsSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      // The address alone is enough (the page is scanned); otherwise the
      // participant's own sentence is.
      if (!parsed.data.barrier && !parsed.data.pageUrl) return reply.status(400).send({ error: "invalid_request", fields: ["barrier"] });
      const result = await draftFinding(parsed.data);
      return reply.send({ ...result, severity: severityFor(parsed.data.impact) });
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

  app.get("/api/pilot/reports", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return reply.send({ totals: pilotTotals(), reports: listPilotReports() });
  });
}

function fieldErrors(error: { issues: Array<{ path: PropertyKey[] }> }): string[] {
  return [...new Set(error.issues.map((i) => String(i.path[0] ?? "")).filter(Boolean))];
}
