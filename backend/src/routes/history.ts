import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAccount } from "./account.js";
import { deleteScan, getScan, listScans } from "../storage/scans.js";
import { recordVerdict, verdictHistory, verdictsForSite, guidedQuestions, VERDICT_STATUSES } from "../storage/verdicts.js";
import { storageStatus } from "../storage/db.js";

/**
 * History, and the guided manual testing built on top of it.
 *
 * Every route here needs an account, because every row it touches belongs to
 * one. Anonymous scanning is untouched: /api/scan still works with no key
 * and simply saves nothing.
 */

const verdictBody = z.object({
  origin: z.string().min(1),
  criterion: z.string().min(1),
  status: z.enum(VERDICT_STATUSES as [string, ...string[]]),
  note: z.string().max(2000).optional(),
  evidence: z.string().max(2000).optional(),
  decidedBy: z.string().min(1).max(200),
});

export async function historyRoutes(app: FastifyInstance) {
  app.get("/api/scans", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const q = z
      .object({ origin: z.string().optional(), limit: z.coerce.number().optional() })
      .safeParse(request.query ?? {});
    const scans = listScans(account.id, q.success ? q.data : {});
    return { scans, storage: storageStatus() };
  });

  app.get("/api/scans/:id", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    const report = getScan(account.id, id);
    if (!report) return reply.status(404).send({ error: "No such scan." });
    return report;
  });

  app.delete("/api/scans/:id", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    if (!deleteScan(account.id, id)) return reply.status(404).send({ error: "No such scan." });
    return { deleted: id };
  });

  /**
   * The open questions for a site, each with any answer already on file.
   *
   * Built from the site's most recent stored scan, so the list shrinks by
   * itself as the scanner learns to decide more — a criterion a new probe
   * can judge simply stops appearing.
   */
  app.get("/api/verdicts/questions", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const q = z.object({ origin: z.string().min(1) }).safeParse(request.query ?? {});
    if (!q.success) return reply.status(400).send({ error: "origin is required" });

    const recent = listScans(account.id, { origin: q.data.origin, limit: 1 })[0];
    if (!recent) {
      return reply.status(404).send({
        error: "No scan on file for that site",
        detail: "Scan the site with your API key first — the questions come from its own conformance rows.",
      });
    }
    const report = getScan(account.id, recent.id);
    const criteria = report?.conformance?.criteria ?? [];
    if (criteria.length === 0) {
      return reply.status(409).send({
        error: "That scan has no conformance table",
        detail: "It may predate the conformance view. Re-scan the site.",
      });
    }
    const questions = guidedQuestions(
      account.id,
      q.data.origin,
      criteria.map((c) => ({
        id: c.id,
        name: c.name,
        level: c.level,
        status: c.status,
        plain: c.plain,
        notMeasured: c.notMeasured,
      }))
    );
    return {
      origin: recent.origin,
      fromScan: { id: recent.id, scannedAt: recent.scannedAt },
      answered: questions.filter((x) => x.answered).length,
      open: questions.filter((x) => !x.answered).length,
      questions,
    };
  });

  app.get("/api/verdicts", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const q = z.object({ origin: z.string().min(1), criterion: z.string().optional() }).safeParse(request.query ?? {});
    if (!q.success) return reply.status(400).send({ error: "origin is required" });
    return q.data.criterion
      ? { verdicts: verdictHistory(account.id, q.data.origin, q.data.criterion) }
      : { verdicts: verdictsForSite(account.id, q.data.origin) };
  });

  app.post("/api/verdicts", async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const parsed = verdictBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const { verdict, error } = recordVerdict(account.id, {
      origin: parsed.data.origin,
      criterion: parsed.data.criterion,
      status: parsed.data.status as never,
      note: parsed.data.note,
      evidence: parsed.data.evidence,
      decidedBy: parsed.data.decidedBy,
    });
    if (error || !verdict) return reply.status(400).send({ error });
    return { verdict };
  });
}
