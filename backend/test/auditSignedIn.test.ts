import { describe, it, expect } from "vitest";
import { selectPagesToAudit, unsafeWhenSignedIn } from "../src/services/crawl/discoverPages.js";
import { sessionWasLost } from "../src/services/auth/authenticate.js";
import { buildApp } from "../src/app.js";

const ENTRY = "https://shop.test/";
const link = (href: string, text = "") => ({ href, text });

// A site audit behind a login signs in once and crawls as the customer.
// These pin the two things that make that safe: the crawl never follows a
// link that signs out or changes the account, and a page that bounces back
// to the sign-in form is named as such rather than scanned.
describe("a signed-in crawl", () => {
  const links = [
    link("/account", "Your account"),
    link("/orders", "Orders"),
    link("/session/destroy?logout=1", "Log out"),
    link("/abmelden", "Abmelden"),
    link("/account/delete", "Delete account"),
    link("/subscription/cancel", "Cancel plan"),
    link("/newsletter?unsubscribe=1", "Newsletter"),
    link("/checkout", "Checkout"),
  ];

  it("keeps the account pages and drops every sign-out or account change", () => {
    const urls = selectPagesToAudit(ENTRY, links, 10, undefined, undefined, true).map((p) => new URL(p.url).pathname);
    expect(urls).toEqual(expect.arrayContaining(["/", "/account", "/orders", "/checkout"]));
    for (const bad of ["/session/destroy", "/abmelden", "/account/delete", "/subscription/cancel", "/newsletter"]) {
      expect(urls).not.toContain(bad);
    }
  });

  it("leaves a crawl that is not signed in as it was", () => {
    const urls = selectPagesToAudit(ENTRY, links, 10).map((p) => new URL(p.url).pathname);
    // Only the old path rules apply: /abmelden and /account/delete are not
    // dangerous to a visitor with no session.
    expect(urls).toContain("/abmelden");
  });

  it("reads the link's words as well as its address", () => {
    expect(unsafeWhenSignedIn(new URL("https://shop.test/x?a=1"), "Se déconnecter")).toBe(true);
    expect(unsafeWhenSignedIn(new URL("https://shop.test/cerrar-sesion"), "")).toBe(true);
    expect(unsafeWhenSignedIn(new URL("https://shop.test/account/addresses"), "Addresses")).toBe(false);
  });
});

describe("sessionWasLost", () => {
  it("is true when a page lands on the sign-in form", () => {
    expect(sessionWasLost("https://shop.test/login/", "https://shop.test/orders", "/login")).toBe(true);
  });
  it("is false for the sign-in page asked for by name", () => {
    expect(sessionWasLost("https://shop.test/login", "https://shop.test/login", "/login")).toBe(false);
  });
  it("is false for an ordinary page", () => {
    expect(sessionWasLost("https://shop.test/orders", "https://shop.test/orders", "/login")).toBe(false);
  });
});

describe("POST /api/audit with sign-in details", () => {
  it("never echoes a malformed request's details when a password was sent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/audit",
      payload: { url: "https://shop.test/", auth: { kind: "form", loginUrl: "", username: "me", password: "hunter2-secret" } },
    });
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toContain("hunter2-secret");
    expect(JSON.parse(res.body).details).toBeUndefined();
    await app.close();
  });
});
