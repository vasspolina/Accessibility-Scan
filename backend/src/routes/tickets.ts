import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { accessibilityReportSchema } from "../types/report.js";
import { ticketsFor } from "../services/tickets/tickets.js";
import { fileTickets, targetError, MAX_TICKETS_PER_REQUEST, type TicketTarget } from "../services/tickets/fileTickets.js";

/* A report's findings as tickets.

   POST /api/tickets/draft  the ticket text, no tracker, no token: what a
                            "copy as ticket" control and a person pasting
                            into any tracker need.
   POST /api/tickets        files them in GitHub Issues or Jira Cloud with
                            a token sent in this request and used for it
                            only. Never stored, never logged, never echoed,
                            and a malformed request's details are never sent
                            back, since zod quotes what it was given.

   Both take the report itself, as the email route does, so they work for a
   scan nobody saved. `keys` picks some of the drafts (each draft's key, from
   /draft); without it every open finding is a candidate, worst first, up to
   MAX_TICKETS_PER_REQUEST. */
const targetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("github"), repo: z.string().max(141), token: z.string().min(1).max(500) }),
  z.object({
    kind: z.literal("jira"),
    site: z.string().max(200),
    email: z.string().email().max(254),
    token: z.string().min(1).max(500),
    projectKey: z.string().max(20),
    issueType: z.string().max(60).optional(),
  }),
]);

const draftSchema = z.object({ reports: z.array(accessibilityReportSchema).min(1).max(20) });
const fileSchema = draftSchema.extend({
  target: targetSchema,
  keys: z.array(z.string().regex(/^[0-9a-f]{16}$/)).max(MAX_TICKETS_PER_REQUEST).optional(),
});

export async function ticketRoutes(app: FastifyInstance) {
  app.post("/api/tickets/draft", async (request, reply) => {
    const parsed = draftSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });
    return { tickets: ticketsFor(parsed.data.reports) };
  });

  app.post(
    "/api/tickets",
    {
      config: {
        /* Each call can open twenty-five issues in someone's tracker, so it
           gets a budget far below the global one. */
        rateLimit: { max: 10, timeWindow: 60_000 },
      },
    },
    async (request, reply) => {
      const parsed = fileSchema.safeParse(request.body);
      if (!parsed.success) return reply.status(400).send({ error: "invalid_request" });
      const target = parsed.data.target as TicketTarget;
      const shape = targetError(target);
      if (shape) return reply.status(400).send({ error: shape });
      let drafts = ticketsFor(parsed.data.reports);
      if (parsed.data.keys) {
        const wanted = new Set(parsed.data.keys);
        drafts = drafts.filter((d) => wanted.has(d.key));
      }
      const results = await fileTickets(target, drafts);
      const created = results.filter((r) => r.status === "created").length;
      const failed = results.filter((r) => r.status === "failed").length;
      return reply.status(failed && !created && results.every((r) => r.status !== "exists") ? 502 : 200).send({
        results,
        created,
        existing: results.filter((r) => r.status === "exists").length,
        failed,
        // Said plainly, so a capped run is not read as the whole report.
        ...(drafts.length > MAX_TICKETS_PER_REQUEST ? { notFiled: drafts.length - MAX_TICKETS_PER_REQUEST } : {}),
      });
    }
  );
}
