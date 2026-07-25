import type { Page } from "playwright";
import { assertSafeUrl } from "../../middleware/ssrfGuard.js";
import { logger } from "../../utils/logger.js";

// Signs the scanner in so it can reach the pages that actually matter —
// checkout, account settings, booking flows. These are where an accessibility
// failure costs a business real money, and they are invisible to every scan
// that stops at the login wall.
//
// Handling someone's credentials puts obligations on this module that the rest
// of the codebase doesn't carry:
//
//   1. Credentials live in memory for one scan and are never written anywhere.
//      Not to disk, not to the database, not to a log line, not into the
//      report, and never to the AI layer.
//   2. Nothing here may log the values. The redact() helper below exists
//      because an error message is the usual way a password escapes — a
//      selector-not-found error from Playwright happily quotes what it was
//      trying to type.
//   3. The browser context is thrown away after every scan (see browserPool),
//      so the session dies with it.
//
// Two ways in. Session cookies are the safer path and the one to prefer: no
// password ever reaches this server. Form login is offered because most people
// can't extract a cookie, and refusing to support them just means the flows
// that matter go unchecked.

export interface CookieAuth {
  kind: "cookies";
  // Name/value pairs from an already-signed-in browser session.
  cookies: Array<{ name: string; value: string; domain?: string; path?: string }>;
}

export interface FormAuth {
  kind: "form";
  loginUrl: string;
  username: string;
  password: string;
  // Optional CSS selectors. Most login forms are found without them.
  usernameSelector?: string;
  passwordSelector?: string;
  submitSelector?: string;
}

export type AuthConfig = CookieAuth | FormAuth;

export class AuthError extends Error {}

// Ordered by specificity: an explicit autocomplete token beats a type, which
// beats a guessed name.
const USERNAME_SELECTORS = [
  'input[autocomplete="username"]',
  'input[autocomplete="email"]',
  'input[type="email"]',
  'input[name*="email" i]',
  'input[name*="user" i]',
  'input[id*="email" i]',
  'input[id*="user" i]',
];
const PASSWORD_SELECTORS = [
  'input[autocomplete="current-password"]',
  'input[type="password"]',
  'input[name*="pass" i]',
];
const SUBMIT_SELECTORS = [
  'button[type="submit"]',
  'input[type="submit"]',
  'form button:not([type="button"])',
  'button:has-text("Sign in")',
  'button:has-text("Log in")',
  'button:has-text("Login")',
];

/**
 * Removes credential values from any string before it is logged or returned.
 *
 * Playwright's own errors quote the text it tried to type, so an unredacted
 * failure message is the most likely way a password ends up in a log file.
 * Exported for testing.
 */
export function redact(text: string, secrets: string[]): string {
  let out = text;
  for (const secret of secrets) {
    // Skip trivially short values: replacing every "a" in an error message
    // would destroy it, and a one-character secret isn't one.
    if (!secret || secret.length < 4) continue;
    out = out.split(secret).join("[redacted]");
  }
  return out;
}

async function firstMatching(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    try {
      if ((await page.locator(selector).count()) > 0) return selector;
    } catch {
      // Invalid selector for this page — try the next.
    }
  }
  return null;
}

/**
 * Applies the caller's authentication to the page's browser context.
 *
 * Throws AuthError with a message safe to show a user — never containing the
 * credentials themselves.
 */
export async function authenticate(page: Page, auth: AuthConfig): Promise<void> {
  if (auth.kind === "cookies") {
    // No password involved at all, which is why this is the recommended path.
    const targetUrl = new URL(page.url() === "about:blank" ? "https://example.com" : page.url());
    await page.context().addCookies(
      auth.cookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain ?? targetUrl.hostname,
        path: c.path ?? "/",
      }))
    );
    return;
  }

  const secrets = [auth.password, auth.username];

  // The login page is a URL the caller supplied, so it gets the same SSRF
  // treatment as the scan target. Without this, auth would be a hole straight
  // through the guard protecting every other entry point.
  let loginUrl: URL;
  try {
    loginUrl = await assertSafeUrl(auth.loginUrl);
  } catch {
    throw new AuthError("That login address can't be used.");
  }

  try {
    await page.goto(loginUrl.toString(), { waitUntil: "domcontentloaded", timeout: 20_000 });

    const userSel = auth.usernameSelector ?? (await firstMatching(page, USERNAME_SELECTORS));
    const passSel = auth.passwordSelector ?? (await firstMatching(page, PASSWORD_SELECTORS));
    if (!userSel || !passSel) {
      throw new AuthError(
        "Couldn't find the username and password fields on that page. Check the login address, or supply the field selectors."
      );
    }

    await page.fill(userSel, auth.username);
    await page.fill(passSel, auth.password);

    const submitSel = auth.submitSelector ?? (await firstMatching(page, SUBMIT_SELECTORS));
    if (submitSel) {
      await Promise.all([
        page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {}),
        page.click(submitSel),
      ]);
    } else {
      // Some forms have no button and submit on Enter.
      await page.press(passSel, "Enter");
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
    }

    // Still looking at a password field almost always means the login failed.
    // Better to say so than to scan the login page and report on that.
    const stillOnLogin = (await page.locator('input[type="password"]').count()) > 0;
    if (stillOnLogin) {
      throw new AuthError(
        "Signing in didn't seem to work — the login form is still showing. Check the details and try again."
      );
    }
  } catch (err) {
    if (err instanceof AuthError) throw err;
    const message = redact(err instanceof Error ? err.message : String(err), secrets);
    // Logged redacted and at info: a failed login is the user's problem to
    // fix, not an error in this service.
    logger.info({ loginHost: loginUrl.hostname, reason: message }, "Scanner sign-in failed");
    throw new AuthError("Couldn't sign in with those details.");
  }
}
