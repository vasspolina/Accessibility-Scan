import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { storedRouteLimit } from "./storedRouteLimit.js";
import { env } from "../config/env.js";
import { storageStatus } from "../storage/db.js";
import {
  accountForKey,
  bearerFrom,
  createAccount,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  type Account,
} from "../storage/accounts.js";

/**
 * Accounts, keys, and the guard the rest of the stored features share.
 *
 * Creating an account is deliberately not self-service. This product has no
 * sign-up flow, no email verification and no billing, and inventing them
 * here would be three half-built things instead of one finished one — so
 * account creation is an operator action behind ADMIN_TOKEN, and the API
 * key it mints is what everything else authenticates with.
 */

/**
 * Resolves the caller, or answers for you.
 *
 * Returns null after having already sent a reply, so a route can simply
 * `if (!account) return;`. The two failure modes say different things on
 * purpose: a caller with no storage configured has hit a feature that is
 * switched off, and a caller with a bad key has hit one they cannot use.
 */
export async function requireAccount(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<Account | null> {
  const status = storageStatus();
  if (!status.configured) {
    await reply.status(501).send({
      error: "Not set up",
      detail: status.reason,
      storage: status,
    });
    return null;
  }
  const account = accountForKey(bearerFrom(request.headers.authorization));
  if (!account) {
    await reply.status(401).send({
      error: "Unauthorized",
      detail: "Send a valid API key as: Authorization: Bearer ascan_…",
    });
    return null;
  }
  return account;
}

const createBody = z.object({
  email: z.string().email(),
  label: z.string().max(120).optional(),
  keyName: z.string().max(120).default("default"),
});

export async function accountRoutes(app: FastifyInstance) {
  /** What the deployer has switched on. Unauthenticated on purpose: a client
   *  needs to know whether history exists before it can offer it. */
  app.get("/api/storage", { config: storedRouteLimit }, async () => ({ storage: storageStatus() }));

  app.post("/api/accounts", { config: storedRouteLimit }, async (request, reply) => {
    const status = storageStatus();
    if (!status.configured) {
      return reply.status(501).send({ error: "Not set up", detail: status.reason, storage: status });
    }
    // No ADMIN_TOKEN means the route is closed, not open. An operator
    // endpoint that defaults to public is the kind of default that ends up
    // in an incident report.
    if (!env.ADMIN_TOKEN) {
      return reply.status(403).send({
        error: "Closed",
        detail: "Account creation needs ADMIN_TOKEN set on the server.",
      });
    }
    if (bearerFrom(request.headers.authorization) !== env.ADMIN_TOKEN) {
      return reply.status(403).send({ error: "Forbidden" });
    }
    const parsed = createBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
    }
    const account = createAccount(parsed.data.email, parsed.data.label);
    const key = createApiKey(account.id, parsed.data.keyName);
    return {
      account: { id: account.id, email: account.email, label: account.label, createdAt: account.createdAt },
      // Shown once and never again — only the hash is kept.
      apiKey: key.key,
      apiKeyId: key.id,
      warning: "Copy this key now. It is stored only as a hash and cannot be shown again.",
      storage: status,
    };
  });

  app.get("/api/account", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    return { account, keys: listApiKeys(account.id), storage: storageStatus() };
  });

  app.post("/api/account/keys", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const name = z.object({ name: z.string().max(120).default("default") }).safeParse(request.body ?? {});
    const key = createApiKey(account.id, name.success ? name.data.name : "default");
    return { apiKey: key.key, apiKeyId: key.id, warning: "Copy this key now. It cannot be shown again." };
  });

  app.delete("/api/account/keys/:id", { config: storedRouteLimit }, async (request, reply) => {
    const account = await requireAccount(request, reply);
    if (!account) return;
    const { id } = request.params as { id: string };
    if (!revokeApiKey(account.id, id)) {
      return reply.status(404).send({ error: "No such key, or it was already revoked." });
    }
    return { revoked: id };
  });
}
