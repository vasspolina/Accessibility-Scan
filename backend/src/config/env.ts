import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  ALLOWED_ORIGINS: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RENDER_TIMEOUT_MS: z.coerce.number().default(20_000),
  AI_REVIEW_TIMEOUT_MS: z.coerce.number().default(20_000),
  MAX_CONCURRENT_RENDERS: z.coerce.number().default(6),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const hasAnthropicKey = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0);

if (!hasAnthropicKey) {
  console.warn(
    "[config] ANTHROPIC_API_KEY is not set — the AI judgment layer will be skipped and " +
      "reports will only include automated (axe-core) findings until a key is provided."
  );
}
