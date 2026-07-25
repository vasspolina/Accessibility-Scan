import { describe, it, expect } from "vitest";
import { redact } from "../src/services/auth/authenticate.js";

// The single most likely way a password escapes this service is through an
// error message: Playwright quotes the text it tried to type when a selector
// fails. These tests pin the guard against that.
describe("redact", () => {
  it("removes a password from an error message", () => {
    const out = redact('page.fill: failed to enter "hunter2correct" into #pw', ["hunter2correct"]);
    expect(out).not.toContain("hunter2correct");
    expect(out).toContain("[redacted]");
  });

  it("removes every secret it is given", () => {
    const out = redact("user alice@example.com password s3cretvalue failed", [
      "s3cretvalue",
      "alice@example.com",
    ]);
    expect(out).not.toContain("s3cretvalue");
    expect(out).not.toContain("alice@example.com");
  });

  it("removes every occurrence, not just the first", () => {
    const out = redact("tried longpassword then longpassword again", ["longpassword"]);
    expect(out).not.toContain("longpassword");
    expect(out.match(/\[redacted\]/g)).toHaveLength(2);
  });

  it("keeps the rest of the message intact so the error stays useful", () => {
    const out = redact("Timeout 20000ms exceeded while filling secretpass123", ["secretpass123"]);
    expect(out).toContain("Timeout 20000ms exceeded");
  });

  // A very short secret appears inside ordinary words, so blanket-replacing it
  // would destroy the message without protecting anything meaningful.
  it("ignores secrets under four characters", () => {
    const text = "a failure at the password stage";
    expect(redact(text, ["a"])).toBe(text);
    expect(redact(text, ["at"])).toBe(text);
  });

  it("handles empty and missing secrets safely", () => {
    expect(redact("some message", [])).toBe("some message");
    expect(redact("some message", [""])).toBe("some message");
  });

  it("treats the secret literally, not as a pattern", () => {
    // A password full of regex metacharacters must not blow up or half-match.
    const pw = "a.*b+c?[d]";
    const out = redact(`failed with ${pw} here`, [pw]);
    expect(out).toBe("failed with [redacted] here");
  });

  it("leaves a message with no secret in it unchanged", () => {
    const text = "Couldn't find the password field on that page.";
    expect(redact(text, ["totallyunrelated"])).toBe(text);
  });
});
