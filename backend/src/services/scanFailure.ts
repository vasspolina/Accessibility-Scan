import { UnsafeUrlError } from "../middleware/ssrfGuard.js";
import { TimeoutError } from "../utils/timeout.js";
import { ServiceBusyError } from "./render/browserPool.js";
import { RebindingDetectedError, SiteBlockedError } from "./render/renderPage.js";
import { AuthError } from "./auth/authenticate.js";

/**
 * One place that decides what a failed scan means and how to say it.
 *
 * Both entry points need this: /api/scan turns it into an HTTP response, and
 * the crawler needs the same words per page. They had drifted — the single
 * page route learned to tell a timeout from a crash from a blocked site, while
 * the crawler reported every one of them as "This page could not be scanned",
 * which tells a reader nothing and hides the one case they could act on.
 *
 * The pipeline was already unified for exactly this reason. Sharing the
 * failure vocabulary too means the crawler inherits every improvement to it
 * rather than needing the same fix twice.
 */
export interface ScanFailure {
  /** Safe to show a visitor. Never contains credentials or internal detail. */
  message: string;
  /** HTTP status for a route that is answering about a single page. */
  status: number;
  /** The site refused us. Not the visitor's mistake, so the widget offers
   *  guidance instead of an error. */
  blocked?: boolean;
  /** A real answer about this page, so the widget must not retry it. */
  timedOut?: boolean;
  /** Whether the underlying message is safe to log with the error attached. */
  logLevel: "info" | "warn";
}

export function describeScanFailure(err: unknown): ScanFailure {
  if (err instanceof UnsafeUrlError) {
    return { message: err.message, status: 400, logLevel: "info" };
  }
  if (err instanceof AuthError) {
    // Written to be safe to show; never contains the credentials themselves.
    return { message: err.message, status: 401, logLevel: "info" };
  }
  if (err instanceof RebindingDetectedError) {
    // Never echo the resolved IP back to the caller.
    return { message: "This host is not allowed", status: 400, logLevel: "warn" };
  }
  if (err instanceof SiteBlockedError) {
    return { message: err.message, status: 422, blocked: true, logLevel: "info" };
  }
  if (err instanceof ServiceBusyError) {
    return {
      message: "Every scanner is busy right now. Please try again in a minute.",
      status: 503,
      logLevel: "info",
    };
  }
  // Two unrelated classes share this name: ours from the withTimeout wrapper,
  // and Playwright's when a single operation overruns. Checking only for ours
  // let Playwright's fall through to the generic branch, so a plainly slow
  // page was reported as an unexplained failure.
  if (err instanceof TimeoutError || (err as { name?: string } | null)?.name === "TimeoutError") {
    return {
      message:
        "This page took too long to load, so the check stopped. Very heavy pages sometimes need a second attempt.",
      status: 504,
      timedOut: true,
      logLevel: "info",
    };
  }
  // The guard catches a non-resolving hostname before a browser is ever
  // opened, so this is the backstop for the case it cannot see: a redirect
  // that lands on a host with no DNS record. Same words as the guard's, so
  // the reader gets one answer however far in the scan got.
  if (/ERR_NAME_NOT_RESOLVED|ERR_NAME_RESOLUTION_FAILED/i.test(String(err))) {
    return {
      message: "We couldn't find a site at that address. Check the spelling and try again.",
      status: 400,
      logLevel: "info",
    };
  }
  // The address exists but nothing answered on it. A different sentence from
  // the one above, because a typo is not the likely cause here.
  if (/ERR_CONNECTION_REFUSED|ERR_CONNECTION_RESET|ERR_ADDRESS_UNREACHABLE/i.test(String(err))) {
    return {
      message: "That address exists, but the site did not answer. It may be down right now.",
      status: 502,
      logLevel: "info",
    };
  }
  // A crashed tab is the browser running out of memory on a heavy page, not
  // anything wrong with the site.
  if (/target crashed|page crashed|browser has been closed/i.test(String(err))) {
    return {
      message:
        "The checker ran out of room on this page, which can happen with very heavy ones. Please try again.",
      status: 503,
      logLevel: "warn",
    };
  }
  return { message: "Could not load or scan the page", status: 502, logLevel: "warn" };
}
