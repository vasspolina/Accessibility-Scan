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

/**
 * A signed-in browser session, captured once and replayed into each page's
 * fresh browser context. Internal only: no route accepts it from a caller.
 *
 * Built by captureSession (auth/session.ts) for a site audit. Signing in
 * again for every crawled page would submit the password up to ten times in
 * a few minutes, which is how accounts get locked and how a login form's rate
 * limit turns the second half of an audit into reports on the sign-in page.
 * Playwright's storage state carries the cookies with every flag intact
 * (__Host- cookies are refused without Secure and a host-only domain) and the
 * page's localStorage, where many single-page apps keep their token.
 *
 * Same rules as the credentials it came from: memory only, for one audit,
 * never logged, stored or put in the report.
 */
export interface SessionAuth {
  kind: "session";
  state: SessionState;
  // The sign-in form's path, when the session came from one. A crawled page
  // that lands back on it has been signed out, and is reported as such
  // instead of being scanned as if it were the page asked for.
  loginPath?: string;
}

export interface SessionState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: "Strict" | "Lax" | "None";
  }>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
}

export type AuthConfig = CookieAuth | FormAuth | SessionAuth;

export class AuthError extends Error {}

/**
 * Whether a page asked for under a captured session landed on the sign-in
 * form instead. Pure, so it is tested without a browser. The page that IS the
 * sign-in form, asked for by name, is not a lost session.
 */
export function sessionWasLost(landedUrl: string, requestedUrl: string, loginPath: string): boolean {
  const path = (u: string) => {
    try {
      return new URL(u).pathname.replace(/\/+$/, "") || "/";
    } catch {
      return "";
    }
  };
  const login = loginPath.replace(/\/+$/, "") || "/";
  return path(landedUrl) === login && path(requestedUrl) !== login;
}

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
export async function authenticate(page: Page, auth: AuthConfig, target?: string): Promise<void> {
  // A captured session is loaded when the context is made (withPage's
  // storageState), so there is nothing left to do on the page.
  if (auth.kind === "session") return;
  if (auth.kind === "cookies") {
    // No password involved at all, which is why this is the recommended path.
    // The target URL comes from the caller: authentication runs BEFORE
    // page.goto, when page.url() is still about:blank — the old fallback
    // quietly set every domainless cookie for example.com, so the session
    // never reached the site and the "logged-in" scan scanned logged out.
    const targetUrl = new URL(target ?? (page.url() === "about:blank" ? "https://example.com" : page.url()));
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
        "Couldn't find the username and password fields on that page. Check that the login address opens the sign-in form itself."
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
        "Signing in didn't work. The login form is still showing. Check the details and try again."
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
