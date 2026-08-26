// Loads backend/.env into process.env before validation, so secrets like
// ANTHROPIC_API_KEY can live in a local gitignored file instead of having
// to be exported in the shell. Real environment variables always win over
// .env values (dotenv never overrides existing vars), so Railway/production
// config is unaffected.
import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  PORT: z.coerce.number().default(8787),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z.string().default("info"),
  ALLOWED_ORIGINS: z.string().default("*"),
  RATE_LIMIT_MAX: z.coerce.number().default(5),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RENDER_TIMEOUT_MS: z.coerce.number().default(40_000),
  // The page review reads a screenshot plus the page context and writes up to
  // 4096 tokens of findings. 20s was enough for a trivial page but timed out
  // on any real content-rich one, so the layer silently produced nothing
  // exactly where it's most useful.
  AI_REVIEW_TIMEOUT_MS: z.coerce.number().default(40_000),
  // Captioning a handful of images is a much smaller job than the full review,
  // and it runs after it — giving it its own, tighter budget keeps the
  // worst-case total scan time bounded instead of doubling the review's.
  AI_ALT_TEXT_TIMEOUT_MS: z.coerce.number().default(20_000),
  // Six was optimistic. Each render is a full Chromium page holding a
  // full-page screenshot, a text-resize pass and a mobile pass, and the
  // container is several times slower than a laptop. Measured: five scans in
  // parallel, and the heaviest page died with "Target crashed" — the tab ran
  // out of memory, so the visitor got an error where they should have got a
  // short queue. Queuing is the better failure.
  //
  // Down from three now, for the same reason at a smaller scale. moma.org —
  // an art museum, so pages of large images — kept dying the same way on the
  // deployed service while rendering comfortably on a laptop, and two other
  // explanations were tried and measured wrong first: the full-page
  // screenshot (moma is 41MB uncompressed, the Guardian 101MB and fine), and
  // Chromium's shared memory (crashes continued a minute after the flag went
  // in). What is left is the ordinary explanation — three Chromium contexts
  // is more than this container holds when one of them is heavy.
  //
  // The cost is real and belongs in the open: a third simultaneous visitor
  // queues instead of scanning straight away, and waits up to
  // MAX_QUEUE_WAIT_MS before being told the scanners are busy. Worse than an
  // instant scan, better than an error halfway through somebody else's.
  MAX_CONCURRENT_RENDERS: z.coerce.number().default(2),
  // Emailing a report. Absent by default: the feature is built, and without
  // these it reports itself as not set up rather than failing silently — the
  // same contract the AI review already uses for a missing ANTHROPIC_API_KEY.
  //
  // MAIL_API_KEY is a Resend key; the send is a plain HTTPS POST to their
  // API, so there is no SDK and no new dependency. MAIL_FROM must be an
  // address on a domain verified with the provider, or every send is
  // rejected at their end.
  MAIL_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().optional(),
  // Deliberately far below the global limit. This route sends mail to an
  // address the caller chooses, which is the one endpoint here that can be
  // turned into a spam relay, so it gets its own much tighter budget.
  // Storage. Absent by default, the same contract MAIL_API_KEY set: the
  // feature is built, and without this it reports itself as not set up
  // rather than failing silently. Anonymous scanning is unchanged either
  // way — this only adds accounts, history and recorded verdicts.
  //
  // DB_DURABLE is the deployer's own statement that DB_PATH points inside a
  // mounted volume. It cannot be detected from in here: a path on a
  // container filesystem and a path on a volume look identical, and the one
  // difference — that the first is erased on every deploy — only shows up
  // after the data is gone. So the deployer says, and the API repeats it.
  DB_PATH: z.string().optional(),
  // NOT z.coerce.boolean(), which is String()-truthiness and would read
  // DB_DURABLE=false as TRUE. Of all the settings here that is the worst one
  // to get backwards: the deployer would have said "this is not durable" and
  // the API would answer everyone that it is. Only the words below turn it
  // on; anything else, including a typo, leaves it off.
  DB_DURABLE: z
    .string()
    .optional()
    .transform((v) => ["1", "true", "yes", "on"].includes((v ?? "").trim().toLowerCase())),
  // Gate on creating accounts and minting keys. Without it those routes are
  // closed entirely rather than open to anyone who finds them.
  ADMIN_TOKEN: z.string().optional(),
  MAIL_RATE_LIMIT_MAX: z.coerce.number().default(3),
  MAIL_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(600_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const hasAnthropicKey = Boolean(env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.length > 0);

export const hasMailProvider = Boolean(
  env.MAIL_API_KEY && env.MAIL_API_KEY.length > 0 && env.MAIL_FROM && env.MAIL_FROM.length > 0
);

if (!hasAnthropicKey) {
  console.warn(
    "[config] ANTHROPIC_API_KEY is not set — the AI judgment layer will be skipped and " +
      "reports will only include automated (axe-core) findings until a key is provided."
  );
}
