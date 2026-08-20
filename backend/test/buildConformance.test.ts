import { describe, it, expect } from "vitest";
import { normalizeReportLang } from "../src/services/conformance/criteriaText.js";
import { buildConformance } from "../src/services/conformance/buildConformance.js";
import { normalizeCriterionId, WCAG_21_AA_CRITERIA } from "../src/services/conformance/wcagCriteria.js";
import type { AccessibilityFinding } from "../src/types/report.js";

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: "x",
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "a",
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

describe("normalizeCriterionId", () => {
  it("accepts a bare number", () => {
    expect(normalizeCriterionId("1.4.4")).toBe("1.4.4");
  });

  it("extracts the number from the AI layer's fuller label", () => {
    expect(normalizeCriterionId("1.1.1 Non-text Content (A)")).toBe("1.1.1");
  });

  it("handles two-digit sub-numbers", () => {
    expect(normalizeCriterionId("1.4.12 Text Spacing (AA)")).toBe("1.4.12");
  });

  it("returns undefined for non-criteria", () => {
    expect(normalizeCriterionId("N/A")).toBeUndefined();
    expect(normalizeCriterionId("WCAG (see rule help)")).toBeUndefined();
    expect(normalizeCriterionId(undefined)).toBeUndefined();
  });
});

describe("WCAG_21_AA_CRITERIA", () => {
  it("is the complete WCAG 2.1 A/AA set — 30 A and 20 AA", () => {
    expect(WCAG_21_AA_CRITERIA.filter((c) => c.level === "A")).toHaveLength(30);
    expect(WCAG_21_AA_CRITERIA.filter((c) => c.level === "AA")).toHaveLength(20);
  });

  it("has no duplicate criterion ids", () => {
    const ids = WCAG_21_AA_CRITERIA.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("buildConformance", () => {
  it("marks a criterion failed when a finding maps to it", () => {
    const c = buildConformance([finding({ wcagCriterion: "1.4.4" })]);
    const resize = c.criteria.find((x) => x.id === "1.4.4")!;
    expect(resize.status).toBe("failed");
    expect(resize.findingCount).toBe(1);
    expect(c.failed).toBe(1);
  });

  it("counts multiple findings against the same criterion", () => {
    const c = buildConformance([
      finding({ wcagCriterion: "1.1.1" }),
      finding({ wcagCriterion: "1.1.1 Non-text Content (A)" }),
    ]);
    expect(c.criteria.find((x) => x.id === "1.1.1")!.findingCount).toBe(2);
    expect(c.failed).toBe(1);
  });

  // The point of the whole module: never claim a pass.
  it("never reports a criterion as passed", () => {
    const statuses = new Set(buildConformance([]).criteria.map((c) => c.status));
    expect(statuses.has("failed" as never)).toBe(false);
    expect([...statuses].every((s) => ["no-issues-found", "needs-review"].includes(s))).toBe(true);
  });

  it("marks untestable criteria as needing review, not as clean", () => {
    const c = buildConformance([]);
    // 1.2.2 Captions can't be judged from a page scan.
    expect(c.criteria.find((x) => x.id === "1.2.2")!.status).toBe("needs-review");
    // 1.4.3 Contrast can.
    expect(c.criteria.find((x) => x.id === "1.4.3")!.status).toBe("no-issues-found");
  });

  it("splits failures by level, since one Level A failure sinks an AA claim", () => {
    const c = buildConformance([
      finding({ wcagCriterion: "1.1.1" }), // A
      finding({ wcagCriterion: "1.4.3" }), // AA
      finding({ wcagCriterion: "1.4.4" }), // AA
    ]);
    expect(c.failedByLevel).toEqual({ A: 1, AA: 2 });
  });

  it("ignores design-clarity and dark-pattern findings", () => {
    const c = buildConformance([
      finding({ category: "design-clarity", wcagCriterion: "1.4.4" }),
      finding({ category: "dark-pattern", wcagCriterion: "1.1.1" }),
    ]);
    expect(c.failed).toBe(0);
  });

  it("ignores findings with no usable criterion", () => {
    const c = buildConformance([
      finding({ wcagCriterion: "N/A" }),
      finding({ wcagCriterion: undefined }),
      finding({ wcagCriterion: "WCAG (see rule help)" }),
    ]);
    expect(c.failed).toBe(0);
  });

  it("ignores a criterion outside the A/AA set (e.g. a AAA finding)", () => {
    const c = buildConformance([finding({ wcagCriterion: "1.4.6" })]);
    expect(c.failed).toBe(0);
    expect(c.criteria.some((x) => x.id === "1.4.6")).toBe(false);
  });

  it("totals add up to the full criterion set", () => {
    const c = buildConformance([finding({ wcagCriterion: "1.4.4" })]);
    expect(c.failed + c.noIssuesFound + c.needsReview).toBe(c.total);
    expect(c.total).toBe(50);
  });

  it("names the standard the EAA points at", () => {
    expect(buildConformance([]).standard).toMatch(/EN 301 549/);
  });
});

// Every row shows one of two phrasings, and picking the wrong one says the
// opposite of the finding: a failing row that states the requirement reads as
// though the requirement is broken. Cheap to check, easy to get wrong when
// someone adds a criterion.
describe("criterion phrasing", () => {
  it("gives every criterion both a question and a problem statement", () => {
    for (const c of WCAG_21_AA_CRITERIA) {
      expect(c.plain.length, c.id).toBeGreaterThan(10);
      expect(c.failing.length, c.id).toBeGreaterThan(10);
    }
  });

  it("asks the question form and states the failing form", () => {
    for (const c of WCAG_21_AA_CRITERIA) {
      expect(c.plain.endsWith("?"), `${c.id} plain should be a question`).toBe(true);
      expect(c.failing.endsWith("?"), `${c.id} failing should not be a question`).toBe(false);
      // BF list style: no full stop on a list item.
      expect(c.failing.endsWith("."), `${c.id} failing should not end in a stop`).toBe(false);
    }
  });

  it("uses the problem statement only for failing rows", () => {
    const c = buildConformance([finding({ wcagCriterion: "1.4.4" })]);
    const failing = c.criteria.find((x) => x.id === "1.4.4")!;
    const quiet = c.criteria.find((x) => x.id === "1.4.3")!;
    // Deliberately not asserting the wording itself — that is copy, and
    // pinning it here just means every rewrite breaks a test that was never
    // about the words. The invariant is that both phrasings reach the row and
    // that they say different things.
    expect(failing.status).toBe("failed");
    expect(failing.failing).not.toBe(failing.plain);
    expect(failing.failing.endsWith("?")).toBe(false);
    expect(quiet.status).toBe("no-issues-found");
    expect(quiet.plain).toMatch(/\?$/);
  });

  it("downgrades AI-only rows to needs-review when the AI review never ran", () => {
    // 1.4.1's only coverage is an AI prompt item. With the AI off, an empty
    // row is a claim of evidence that was never gathered — it must read
    // needs-review, and a deterministic row like 1.4.3 must be unaffected.
    const off = buildConformance([], { aiRan: false });
    expect(off.criteria.find((x) => x.id === "1.4.1")!.status).toBe("needs-review");
    expect(off.criteria.find((x) => x.id === "1.4.3")!.status).toBe("no-issues-found");
    const on = buildConformance([], { aiRan: true });
    expect(on.criteria.find((x) => x.id === "1.4.1")!.status).toBe("no-issues-found");
    // A finding still beats the downgrade: failed is failed.
    const withFinding = buildConformance([finding({ wcagCriterion: "1.4.1" })], { aiRan: false });
    expect(withFinding.criteria.find((x) => x.id === "1.4.1")!.status).toBe("failed");
  });
});

describe("report language", () => {
  it("normalises anything to a supported language", () => {
    expect(normalizeReportLang("de-DE")).toBe("de");
    expect(normalizeReportLang("FR")).toBe("fr");
    expect(normalizeReportLang("es_MX")).toBe("es");
    expect(normalizeReportLang("ja")).toBe("en");
    expect(normalizeReportLang(undefined)).toBe("en");
  });

  it("keeps the standard's own numbers, names and levels in every language", () => {
    // Only the reader-facing sentences move. An auditor searching for
    // "1.4.3 Contrast (Minimum)" must find it whatever language the report
    // is in — and a row must never lose its level or its status to a
    // translation.
    const en = buildConformance([], { lang: "en" });
    const de = buildConformance([], { lang: "de" });
    expect(de.criteria).toHaveLength(en.criteria.length);
    for (let i = 0; i < en.criteria.length; i++) {
      expect(de.criteria[i].id).toBe(en.criteria[i].id);
      expect(de.criteria[i].name).toBe(en.criteria[i].name);
      expect(de.criteria[i].level).toBe(en.criteria[i].level);
      expect(de.criteria[i].status).toBe(en.criteria[i].status);
      // Falls back per id: an untranslated row is the English sentence,
      // never an empty one.
      expect(de.criteria[i].plain.length).toBeGreaterThan(0);
      expect(de.criteria[i].failing.length).toBeGreaterThan(0);
    }
  });
});
