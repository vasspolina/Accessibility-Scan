import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAccount } from "./account.js";
import { storedRouteLimit } from "./storedRouteLimit.js";
import { FINDING_STATES, findingStates, setFindingState } from "../storage/triage.js";

/** Triage: the owner's standing decisions about individual findings. */
export async function triageRoutes(app: FastifyInstance) {
  app.get("/api/findings/state", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const q = z.object({ origin: z.string().min(1) }).safeParse(request.query ?? {});
    if (!q.success) return reply.status(400).send({ error: "origin is required" });
    return { states: [...findingStates(account.id, q.data.origin).values()] };
  });

  app.post("/api/findings/state", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const body = z
      .object({
        origin: z.string().min(1),
        fingerprint: z.string().min(1),
        state: z.enum(FINDING_STATES as [string, ...string[]]),
        note: z.string().max(2000).optional(),
        decidedBy: z.string().min(1).max(200),
      })
      .safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: "Invalid request body", details: body.error.flatten() });
    const { decision, error } = setFindingState(account.id, { ...body.data, state: body.data.state as never });
    if (error || !decision) return reply.status(400).send({ error });
    return { decision };
  });
}
