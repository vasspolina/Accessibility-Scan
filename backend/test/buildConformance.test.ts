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

describe("not-measured: a check that did not run must not read as a pass", () => {
  // The defect this guards against: buildConformance decided every row from
  // findings.length alone, and a probe that threw produced no findings — so
  // a crashed keyboard walk printed the same row as a clean page. Three scans
  // of one site scored 4, 24 and 24 for exactly this reason.

  it("marks a criterion not-measured when its probe is in incompleteChecks", () => {
    const c = buildConformance([], { incompleteChecks: ["keyboard navigation"] });
    const row = c.criteria.find((x) => x.id === "2.4.7")!;
    expect(row.status).toBe("not-measured");
    expect(row.notMeasured).toEqual(["keyboard navigation"]);
    // 1.4.11's only emitter is the keyboard walk, so it goes too.
    expect(c.criteria.find((x) => x.id === "1.4.11")!.status).toBe("not-measured");
    expect(c.notMeasured).toBeGreaterThan(0);
  });

  it("maps every incompleteChecks label renderPage can emit", () => {
    // The map's keys are strings renderPage builds by hand. If one is renamed
    // there, the mapping dies silently — this pins the contract.
    const labels = [
      "keyboard navigation",
      "mouse-only controls",
      "phone layout",
      "text resizing",
      "display preferences",
      "reading order",
    ];
    for (const label of labels) {
      const c = buildConformance([], { incompleteChecks: [label] });
      expect(
        c.criteria.some((x) => x.status === "not-measured"),
        `"${label}" maps to no criterion — renamed in renderPage?`
      ).toBe(true);
    }
  });

  it("a real finding outranks a dead probe", () => {
    const c = buildConformance([finding({ wcagCriterion: "2.4.7" })], {
      incompleteChecks: ["keyboard navigation"],
    });
    expect(c.criteria.find((x) => x.id === "2.4.7")!.status).toBe("failed");
  });

  it("axe incompletes mark their criteria not-measured", () => {
    const c = buildConformance([], { axeIncompleteCriteria: ["1.4.3"] });
    expect(c.criteria.find((x) => x.id === "1.4.3")!.status).toBe("not-measured");
  });

  it("does not touch manual or AI-degraded rows", () => {
    const c = buildConformance([], { aiRan: false, incompleteChecks: ["keyboard navigation"] });
    // Manual stays needs-review — a person was always required there.
    expect(c.criteria.find((x) => x.id === "1.2.2")!.status).toBe("needs-review");
    // aiAssisted with no AI run stays needs-review too.
    expect(c.criteria.find((x) => x.id === "3.3.1")!.status).toBe("needs-review");
  });

  it("a clean scan has no not-measured rows and the old counts still add up", () => {
    const c = buildConformance([]);
    expect(c.notMeasured).toBe(0);
    expect(c.failed + c.noIssuesFound + c.needsReview + c.notMeasured).toBe(c.total);
  });
});

describe("4.1.1 Parsing is satisfied by definition, not queued for a human", () => {
  it("reads no-issues-found, never needs-review", () => {
    // WCAG 2.2 removed the criterion and W3C's 2023 erratum marks it always
    // satisfied for 2.0/2.1. It used to read needs-review, which asked every
    // reader to hand-audit something that can no longer be failed.
    const row = buildConformance([]).criteria.find((x) => x.id === "4.1.1")!;
    expect(row.status).toBe("no-issues-found");
    expect(row.alwaysSatisfied).toBe(true);
  });
});

describe("the crawl can vouch for criteria a single page cannot", () => {
  it("3.2.3/3.2.4 read no-issues-found when the consistency pass compared pages", () => {
    const c = buildConformance([], { measuredDespiteManual: ["3.2.3", "3.2.4"] });
    expect(c.criteria.find((x) => x.id === "3.2.3")!.status).toBe("no-issues-found");
    expect(c.criteria.find((x) => x.id === "3.2.4")!.status).toBe("no-issues-found");
    // Every other manual row is untouched.
    expect(c.criteria.find((x) => x.id === "1.2.2")!.status).toBe("needs-review");
  });

  it("stay needs-review on a single-page scan, where nothing compared anything", () => {
    const c = buildConformance([]);
    expect(c.criteria.find((x) => x.id === "3.2.3")!.status).toBe("needs-review");
  });

  it("a measured consistency failure still fails the row", () => {
    const c = buildConformance([finding({ wcagCriterion: "3.2.3" })], {
      measuredDespiteManual: ["3.2.3", "3.2.4"],
    });
    expect(c.criteria.find((x) => x.id === "3.2.3")!.status).toBe("failed");
  });
});
