import { describe, it, expect } from "vitest";
import { buildStatement } from "../src/components/AccessibilityStatement";

// The structure of this document is prescribed by law, not chosen by us:
// the model statement in Commission Implementing Decision (EU) 2018/1523,
// which the Web Accessibility Directive requires and which is the closest
// formal model for anyone under the European Accessibility Act. A missing
// mandatory heading is the kind of gap that gets a statement rejected, and it
// would be invisible in review — hence a test.

const statement = (overrides: Partial<Parameters<typeof buildStatement>[0]> = {}) =>
  buildStatement({
    organisation: "Example Ltd",
    contactEmail: "hello@example.com",
    siteUrl: "https://example.com",
    position: "partially",
    conformance: {
      standard: "WCAG 2.1 Level AA (EN 301 549)",
      failed: 3,
      noIssuesFound: 25,
      needsReview: 22,
      total: 50,
      failedByLevel: { A: 2, AA: 1 },
      criteria: [],
    },
    knownIssues: ["Images are missing a description"],
    date: "1 July 2026",
    ...overrides,
  });

describe("the model statement (Implementing Decision (EU) 2018/1523)", () => {
  const text = statement();

  it("states a compliance status", () => {
    expect(text).toMatch(/partially conformant|partially compliant/i);
  });

  // Three named categories, not one list. This is the part most templates get
  // wrong, and two of the three are declarations only the owner can make.
  it("splits non-accessible content into all three required categories", () => {
    expect(text).toMatch(/## Non-accessible content/i);
    expect(text).toMatch(/### Non-compliance/i);
    expect(text).toMatch(/### Disproportionate burden/i);
    expect(text).toMatch(/### Content outside the scope/i);
  });

  it("says how the assessment was made, not just when", () => {
    expect(text).toMatch(/Method used:/i);
    expect(text).toMatch(/self-assessment/i);
    expect(text).toMatch(/not a third-party evaluation/i);
  });

  it("gives the preparation date and the review date", () => {
    expect(text).toMatch(/prepared on 1 July 2026/i);
    expect(text).toMatch(/last reviewed/i);
  });

  it("gives a feedback mechanism and an enforcement route", () => {
    expect(text).toMatch(/## Feedback and contact information/i);
    expect(text).toMatch(/## Enforcement procedure/i);
    expect(text).toMatch(/market surveillance|enforcement body/i);
  });
});

describe("what the European Accessibility Act adds", () => {
  const text = statement();

  // Art. 13(2) and Annex V: the assessment belongs in the terms and
  // conditions, and has to exist in written AND oral form.
  it("says where the information has to live", () => {
    expect(text).toMatch(/general terms and conditions/i);
  });

  it("says it must exist in written and oral format", () => {
    expect(text).toMatch(/written and oral format/i);
  });

  // Art. 14: invoking disproportionate burden is not a matter of saying so.
  it("warns that disproportionate burden must be assessed and kept for five years", () => {
    expect(text).toMatch(/five years/i);
    expect(text).toMatch(/market surveillance authority/i);
  });
});

describe("what it refuses to claim", () => {
  it("never claims full conformance, whatever the scan found", () => {
    const clean = statement({ knownIssues: [], position: "partially" });
    expect(clean).not.toMatch(/fully conformant|fully compliant/i);
  });

  it("says a clean automated result is not the same as being accessible", () => {
    expect(statement({ knownIssues: [] })).toMatch(/not the same as the site being fully accessible/i);
  });

  it("still lists the known problems when there are some", () => {
    expect(statement()).toMatch(/Images are missing a description/);
  });
});
