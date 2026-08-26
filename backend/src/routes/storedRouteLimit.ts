import { env } from "../config/env.js";

/**
 * The rate limit for the storage-backed routes.
 *
 * The global limit — five a minute by default — exists to protect one
 * specific thing: a Playwright render, which costs a browser, a CPU and
 * thirty seconds. Reading a row out of SQLite costs none of that, and
 * applying the render's budget to it made the feature it was added for
 * unusable. Guided manual testing asks about twenty-seven questions; at five
 * requests a minute, answering them is most of an hour of waiting. Measured:
 * the fifth read in a row returned 429.
 *
 * Still keyed on the IP, which is the interesting decision here. Keying on
 * the API key reads better — a CI runner, an office and a corporate NAT are
 * one address between many callers — but the key is attacker-controlled and
 * unvalidated at this point in the request, so a caller sending a fresh
 * random key each time would get a fresh budget each time and no limit at
 * all. Validating it first would mean a database lookup inside the limiter,
 * on every request, before the limiter has decided to allow one. So: IP, and
 * a ceiling high enough that a shared address is not the constraint. Raise
 * STORED_RATE_LIMIT_MAX if a large team ever finds it.
 */
export const storedRouteLimit = {
  rateLimit: {
    max: env.STORED_RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,
  },
};
