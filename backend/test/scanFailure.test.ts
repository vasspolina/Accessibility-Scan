import { describe, it, expect } from "vitest";
import { describeScanFailure } from "../src/services/scanFailure.js";
import { UnsafeUrlError } from "../src/middleware/ssrfGuard.js";
import { TimeoutError } from "../src/utils/timeout.js";
import { ServiceBusyError } from "../src/services/render/browserPool.js";
import { RebindingDetectedError, SiteBlockedError } from "../src/services/render/renderPage.js";
import { AuthError } from "../src/services/auth/authenticate.js";

// Both the single-page route and the crawler read this. They had drifted, and
// the crawler reported everything as "This page could not be scanned" — which
// told a reader nothing and hid the one case they could act on.

describe("describeScanFailure", () => {
  it("passes a blocked site through with its own message and the flag", () => {
    const f = describeScanFailure(new SiteBlockedError("example.com", "a CAPTCHA"));
    expect(f.blocked).toBe(true);
    expect(f.status).toBe(422);
    expect(f.message).toMatch(/example\.com/);
  });

  it("marks a timeout so the widget knows not to retry it", () => {
    const f = describeScanFailure(new TimeoutError("Page render", 40000));
    expect(f.timedOut).toBe(true);
    expect(f.status).toBe(504);
    expect(f.message).toMatch(/too long/i);
  });

  // Playwright throws its own class with the same name. Checking only for ours
  // let a plainly slow page fall through as an unexplained failure.
  it("recognises Playwright's timeout as well as our own", () => {
    const playwrightish = Object.assign(new Error("locator.click: Timeout 30000ms exceeded"), {
      name: "TimeoutError",
    });
    expect(describeScanFailure(playwrightish).timedOut).toBe(true);
  });

  it("tells a crashed tab apart from a broken site", () => {
    const f = describeScanFailure(new Error("page.goto: Target crashed"));
    expect(f.status).toBe(503);
    expect(f.message).toMatch(/ran out of room/i);
    expect(f.timedOut).toBeUndefined();
  });

  it("says plainly when every scanner is busy", () => {
    expect(describeScanFailure(new ServiceBusyError()).message).toMatch(/busy/i);
  });

  // The resolved IP must never travel back to the caller.
  it("never echoes the address behind a rebinding attempt", () => {
    const f = describeScanFailure(new RebindingDetectedError("evil.test", "169.254.169.254"));
    expect(f.message).not.toMatch(/169\.254/);
    expect(f.status).toBe(400);
  });

  it("keeps the auth message, which is written to be safe to show", () => {
    const f = describeScanFailure(new AuthError("Those sign-in details were rejected"));
    expect(f.status).toBe(401);
    expect(f.message).toMatch(/sign-in details/i);
  });

  it("passes an unsafe url straight through", () => {
    expect(describeScanFailure(new UnsafeUrlError("This host is not allowed")).status).toBe(400);
  });

  it("falls back to a generic failure for anything unrecognised", () => {
    const f = describeScanFailure(new Error("something odd"));
    expect(f.status).toBe(502);
    expect(f.logLevel).toBe("warn");
  });

  it("never returns an empty message, whatever it is handed", () => {
    for (const thrown of [null, undefined, "a string", 42, {}, new Error("")]) {
      expect(describeScanFailure(thrown).message.length).toBeGreaterThan(0);
    }
  });
});
