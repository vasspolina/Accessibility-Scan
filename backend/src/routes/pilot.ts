import type { FastifyInstance } from "fastify";
import { env, hasMailProvider } from "../config/env.js";
import { localModelName } from "../services/plainLanguage/localModel.js";
import { z } from "zod";
import { lookupPageTitle } from "../services/pilot/pageTitle.js";
import { readAddress } from "../services/pilot/readAddress.js";
import { draftFinding, mailPilotReport, nextFollowUp, pilotDraftSchema, pilotOpen, reportFieldsSchema, severityFor, submitBodySchema, wakeModel } from "../services/pilot/pilot.js";
import { storageStatus } from "../storage/db.js";
import { CHECK_RESULTS, listPilotReports, pilotCheckHistory, pilotTotals, savePilotCheck, savePilotReport } from "../storage/pilot.js";
import { requireAdmin } from "./account.js";
import { storedRouteLimit } from "./storedRouteLimit.js";

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
 * POST /api/pilot/reports/:id/check   mark whether the scanner caught it
 * GET  /api/pilot/reports/:id/checks  every mark on one report
 * POST /api/pilot/wake     start the model waking as the form opens
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

  // The form calls this as it opens, and once more at the first answer, so
  // the model's worker wakes while the person answers (wakeModel, pilot.ts).
  app.post(
    "/api/pilot/wake",
    { config: { rateLimit: { max: env.CHAT_RATE_LIMIT_MAX, timeWindow: env.RATE_LIMIT_WINDOW_MS } } },
    async (_request, reply) => {
      if (!pilotOpen()) return reply.status(503).send({ error: "pilot_closed" });
      return reply.status(202).send({ waking: wakeModel() });
    }
  );

  // The three operator routes read and write the database, with no render,
  // so they take the stored routes' budget (storedRouteLimit.ts). Under the
  // global one, sized for scans, the ledger answered 429 on its sixth
  // request in a minute: a reload, a mark and its history are three.
  app.get("/api/pilot/reports", { config: storedRouteLimit }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    return reply.send({ totals: pilotTotals(), reports: listPilotReports() });
  });

  // The ledger's mark (barrier-ledger.html): did a scan of the page catch
  // the barrier this person met? A person decides, after scanning the page
  // and reading both, and signs it.
  app.post("/api/pilot/reports/:id/check", { config: storedRouteLimit }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    const parsed = checkBodySchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "invalid_request", fields: fieldErrors(parsed.error) });
    const saved = savePilotCheck({ reportId: id, ...parsed.data });
    if (saved.error === "no_such_report") return reply.status(404).send({ error: "no_such_report" });
    if (!saved.check) return reply.status(501).send({ error: "not_configured" });
    return reply.send({ check: saved.check });
  });

  app.get("/api/pilot/reports/:id/checks", { config: storedRouteLimit }, async (request, reply) => {
    if (!(await requireAdmin(request, reply))) return;
    const { id } = request.params as { id: string };
    return reply.send({ checks: pilotCheckHistory(id) });
  });
}

const checkBodySchema = z.object({
  result: z.enum(CHECK_RESULTS),
  note: z.string().trim().max(1000).optional(),
  // A mark nobody signed is not one (the rule verdicts and triage follow).
  decidedBy: z.string().trim().min(1).max(120),
});

/** A draft request, or a redraft: the finding they read and what they
 *  said is wrong with it. */
const draftBodySchema = reportFieldsSchema.extend({
  previous: pilotDraftSchema.optional(),
  change: z.string().trim().min(1).max(1000).optional(),
});

function fieldErrors(error: { issues: Array<{ path: PropertyKey[] }> }): string[] {
  return [...new Set(error.issues.map((i) => String(i.path[0] ?? "")).filter(Boolean))];
}
