import { describe, it, expect } from "vitest";
import { BLOCK_PAGE_PATTERNS } from "../src/services/render/renderPage.js";

// Pins the wording the block-page detector must and must not recognise.
// The pattern is applied to the title and to the body text of pages under
// 1,200 characters; a miss reports a walled-off site as clean, which is the
// worst wrong answer this product can give, and an over-match reports a real
// page as blocked. Both lists below come from pages met in the wild.

describe("BLOCK_PAGE_PATTERNS", () => {
  const mustMatch = [
    "Access Denied",
    "Attention Required! | Cloudflare",
    "Just a moment...",
    "Pardon Our Interruption",
    // The bare phrase and the sentence forms WAFs actually write.
    "Request blocked.",
    "The request is blocked.",
    "Request was blocked by our security service",
    "Are you a robot?",
    "Let's confirm you are human",
    "Verify that you're human",
    "Checking that you are a human",
    "Checking your browser before accessing",
    "Please enable JavaScript and cookies to continue",
    "Additional security check is required",
    "This site is under DDoS protection",
    "Verifying you are human. This may take a few seconds.",
  ];

  const mustNotMatch = [
    // Ordinary pages that merely talk about the same subjects.
    "Send us a request, blocked drains cleared same day",
    "How we granted every access request this quarter",
    "A human-centred approach to design",
    "Robots in manufacturing: a history",
    "Cookie recipes your browser will love",
    "The museum's protection of fragile works",
  ];

  for (const phrase of mustMatch) {
    it(`matches: ${phrase}`, () => {
      expect(BLOCK_PAGE_PATTERNS.test(phrase)).toBe(true);
    });
  }

  for (const phrase of mustNotMatch) {
    it(`leaves alone: ${phrase}`, () => {
      expect(BLOCK_PAGE_PATTERNS.test(phrase)).toBe(false);
    });
  }
});
