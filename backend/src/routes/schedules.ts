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
    return { schedule, scheduler: schedulerStatus() };
  });

  app.post("/api/schedules/:id/run", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    if (!requestRun(account.id, id)) return reply.status(404).send({ error: "No such schedule." });
    return { schedule: getSchedule(account.id, id), scheduler: schedulerStatus() };
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
