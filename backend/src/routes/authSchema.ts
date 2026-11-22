import { z } from "zod";

// Sign-in details for scanning pages behind a login, shared by a single scan
// and a site audit. Accepted per request, held in memory for that request,
// and never stored, logged, or included in the report. See
// services/auth/authenticate.ts for the full handling rules.
//
// Only the two kinds a caller can supply. The captured "session" kind is
// built inside the audit and is never accepted from outside.
export const authSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("cookies"),
    cookies: z
      .array(
        z.object({
          name: z.string().min(1),
          value: z.string(),
          domain: z.string().optional(),
          path: z.string().optional(),
        })
      )
      .min(1)
      .max(50),
  }),
  z.object({
    kind: z.literal("form"),
    loginUrl: z.string().min(1),
    username: z.string().min(1),
    password: z.string().min(1),
    usernameSelector: z.string().optional(),
    passwordSelector: z.string().optional(),
    submitSelector: z.string().optional(),
  }),
]);

/**
 * Zod's flattened errors quote parts of the input, and the input may contain
 * a password. Echo the detail only when no credentials were sent.
 */
export function carriesAuth(body: unknown): boolean {
  return typeof body === "object" && body !== null && "auth" in body;
}
