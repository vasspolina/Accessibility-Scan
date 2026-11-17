import type { FastifyInstance } from "fastify";
import { env, hasMailProvider, pilotCodes } from "../config/env.js";
import { localModelName } from "../services/plainLanguage/localModel.js";
import { z } from "zod";
import { lookupPageTitle } from "../services/pilot/pageTitle.js";
import { draftFinding, isPilotCode, mailPilotReport, reportFieldsSchema, severityFor, submitBodySchema } from "../services/pilot/pilot.js";
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
 * POST /api/pilot/page     the title of a pasted page, so the form can show it
 *
 * Every route but the first needs a participant code, or ADMIN_TOKEN for the
 * last. A wrong code is a 403 with no hint about which part was wrong.
 */
export async function pilotRoutes(app: FastifyInstance) {
  app.get("/api/pilot", async () => ({
    open: pilotCodes.length > 0,
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
      if (pilotCodes.length === 0) return reply.status(503).send({ error: "pilot_closed" });
      const parsed = reportFieldsSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      if (!isPilotCode(parsed.data.code)) return reply.status(403).send({ error: "unknown_code" });
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
      if (pilotCodes.length === 0) return reply.status(503).send({ error: "pilot_closed" });
      const raw = request.body as { company_url?: unknown } | null;
      if (raw && typeof raw.company_url === "string" && raw.company_url.length > 0) return reply.send({ ok: true });
      const parsed = submitBodySchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
      if (!isPilotCode(parsed.data.code)) return reply.status(403).send({ error: "unknown_code" });
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
      if (pilotCodes.length === 0) return reply.status(503).send({ error: "pilot_closed" });
      const parsed = z.object({ code: z.string().trim().min(1).max(100), url: z.string().trim().url().max(2000) }).safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });
      // A code first: this fetches an address the caller typed, and the
      // pilot's participants are the only people it is for.
      if (!isPilotCode(parsed.data.code)) return reply.status(403).send({ error: "unknown_code" });
      return reply.send({ title: await lookupPageTitle(parsed.data.url) });
    }
  );

  app.get("/api/pilot/reports", async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return reply.send({ totals: pilotTotals(), codesIssued: pilotCodes.length, reports: listPilotReports() });
  });
}

function fieldErrors(error: { issues: Array<{ path: PropertyKey[] }> }): string[] {
  return [...new Set(error.issues.map((i) => String(i.path[0] ?? "")).filter(Boolean))];
}
