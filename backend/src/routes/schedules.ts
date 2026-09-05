import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAccount } from "./account.js";
import { storedRouteLimit } from "./storedRouteLimit.js";
import { assertSafeUrl, UnsafeUrlError } from "../middleware/ssrfGuard.js";
import {
  createSchedule,
  deleteSchedule,
  getSchedule,
  listSchedules,
  requestRun,
  setScheduleEnabled,
  MAX_EVERY_HOURS,
  MIN_EVERY_HOURS,
} from "../storage/schedules.js";
import { schedulerStatus } from "../services/scheduler.js";

/**
 * Scheduled scans. The URL goes through the same private-address guard as
 * a scan request: a schedule is a scan a stranger asked the SERVER to make,
 * later and repeatedly, and the confused-deputy argument applies with
 * interest.
 */
export async function scheduleRoutes(app: FastifyInstance) {
  app.get("/api/schedules", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    return { schedules: listSchedules(account.id), scheduler: schedulerStatus() };
  });

  app.post("/api/schedules", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const body = z
      .object({
        url: z.string().min(1),
        everyHours: z.number().int().min(MIN_EVERY_HOURS).max(MAX_EVERY_HOURS),
        notifyEmail: z.string().email().optional(),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "Invalid request body", details: body.error.flatten() });
    let url: URL;
    try {
      url = await assertSafeUrl(body.data.url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) return reply.status(400).send({ error: err.message });
      throw err;
    }
    const { schedule, error } = createSchedule(account.id, { ...body.data, url: url.toString() });
    if (error || !schedule) return reply.status(400).send({ error });
    const status = schedulerStatus();
    const warnings = [
      ...(status.enabled ? [] : ["The scheduler is off on this server (SCHEDULER_ENABLED), so this will not run until it is on."]),
      ...(body.data.notifyEmail && !status.mail ? ["Mail is not configured on this server, so nobody will be written to when the site gets worse."] : []),
    ];
    return { schedule, scheduler: status, ...(warnings.length ? { warnings } : {}) };
  });

  app.post("/api/schedules/:id/run", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    const current = getSchedule(account.id, id);
    if (!current) return reply.status(404).send({ error: "No such schedule." });
    // Making a paused schedule due did nothing — the scheduler only picks
    // enabled rows — and answered 200. A "run it now" that silently does
    // not is the failure this codebase keeps finding in itself.
    if (!current.enabled) {
      return reply.status(409).send({ error: "This schedule is paused. Enable it first, then run it." });
    }
    requestRun(account.id, id);
    const status = schedulerStatus();
    return {
      schedule: getSchedule(account.id, id),
      scheduler: status,
      ...(status.enabled ? {} : { warning: "The scheduler is off on this server, so nothing will run it." }),
    };
  });

  app.post("/api/schedules/:id/enabled", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    const body = z.object({ enabled: z.boolean() }).safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "enabled must be true or false" });
    if (!setScheduleEnabled(account.id, id, body.data.enabled)) return reply.status(404).send({ error: "No such schedule." });
    return { schedule: getSchedule(account.id, id) };
  });

  app.delete("/api/schedules/:id", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    if (!deleteSchedule(account.id, id)) return reply.status(404).send({ error: "No such schedule." });
    return { deleted: id };
  });
}
