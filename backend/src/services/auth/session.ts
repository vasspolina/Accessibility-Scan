import { withPage } from "../render/browserPool.js";
import { authenticate, AuthError, type AuthConfig, type SessionAuth } from "./authenticate.js";

// Signs in once for a whole site audit and hands back the session, so each
// crawled page starts signed in without the password being typed again.
//
// Why once: an audit scans up to ten pages. Submitting the login form for each
// would post the password ten times in a few minutes, which trips lockouts and
// login rate limits, and a rate-limited login halfway through turns the rest
// of the audit into reports on the sign-in page. One sign-in also costs one
// page load instead of ten.
//
// The session is the browser's own storage state (cookies with their flags,
// and localStorage), held in memory for the length of the audit and then
// dropped. It is never logged, stored or put in the report, the same as the
// credentials it came from (see authenticate.ts).

// A sign-in is one page load, a form fill and a wait for the result; the
// form path inside authenticate allows 20s for each of its two waits.
const SIGN_IN_BUDGET_MS = 50_000;

/**
 * Turns the caller's sign-in into a session every page of the audit can reuse.
 *
 * Cookies are passed through as they are: there is no password to protect and
 * nothing to gain from a browser visit. A form login is performed once, in its
 * own throwaway context, and the context's storage state is what comes back.
 */
export async function captureSession(auth: AuthConfig, entryUrl: string): Promise<AuthConfig> {
  if (auth.kind !== "form") return auth;
  let loginPath: string | undefined;
  try {
    loginPath = new URL(auth.loginUrl).pathname;
  } catch {
    throw new AuthError("That login address can't be used.");
  }
  return withPage(async (page) => {
    await authenticate(page, auth, entryUrl);
    const state = await page.context().storageState();
    if (state.cookies.length === 0 && state.origins.length === 0) {
      // Signed in by every sign authenticate can read, yet the site kept
      // nothing that would carry the session to the next page.
      throw new AuthError("Signing in worked, but the site kept no session the scanner could carry to the other pages.");
    }
    const session: SessionAuth = { kind: "session", state, loginPath };
    return session;
    // authenticate() already turns its own failures into AuthError with a
    // message safe to show; anything else (a busy scanner, the budget) keeps
    // its own error so the route's classifier can name it.
  }, SIGN_IN_BUDGET_MS);
}
