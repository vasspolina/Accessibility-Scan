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
    expect(text).toMatch(/self assessment/i);
    expect(text).toMatch(/not a third party evaluation/i);
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
    expect(statement({ knownIssues: [] })).toMatch(/does not mean the site is fully accessible/i);
  });

  it("still lists the known problems when there are some", () => {
    expect(statement()).toMatch(/Images are missing a description/);
  });
});


describe("the method paragraph and the manual work on file", () => {
  const base = {
    organisation: "Example Ltd",
    contactEmail: "hello@example.com",
    siteUrl: "https://example.com",
    position: "partially" as const,
    conformance: {
      standard: "WCAG 2.1 Level AA (EN 301 549)",
      failed: 3,
      noIssuesFound: 25,
      needsReview: 22,
      total: 50,
      failedByLevel: { A: 2, AA: 1 },
      criteria: [],
    },
    knownIssues: [],
    date: "1 July 2026",
  };
  const v = (criterion: string, status: "supports" | "not-applicable" | "does-not-support" | "unresolved") => ({
    criterion, status, note: null, decidedBy: "Polina V", decidedAt: "2026-08-24T10:00:00.000Z",
  });

  it("says no manual audit has happened only while that is true", () => {
    expect(buildStatement(base)).toContain("We have not yet carried out a full manual audit");
    const text = buildStatement({ ...base, verdicts: [v("1.2.2", "not-applicable"), v("1.3.2", "supports"), v("2.4.5", "does-not-support")] });
    expect(text).not.toContain("We have not yet carried out a full manual audit");
    expect(text).toContain("3 of the criteria that need human judgement have been checked by a person: 1 met, 1 not met, 1 not applicable to this site.");
    expect(text).toContain("19 have not yet been checked manually.");
    // Still honest about what has not happened.
    expect(text).toContain("not yet tested with assistive technology users");
  });

  it("counts, never names — the person who decided is not part of the declaration", () => {
    const text = buildStatement({ ...base, verdicts: [v("1.2.2", "supports")] });
    expect(text).not.toContain("Polina V");
  });

  it("does not count a verdict that decided nothing", () => {
    const text = buildStatement({ ...base, verdicts: [v("1.2.2", "unresolved")] });
    expect(text).toContain("We have not yet carried out a full manual audit");
  });
});
