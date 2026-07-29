import { describe, it, expect } from "vitest";
import { diffScans, historyKey, toHistoryEntry, type HistoryEntry, scoresComparable, SCORING_VERSION } from "../src/lib/scanHistory";
import type { AccessibilityFinding, AccessibilityReport } from "../src/api/scanClient";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    url: "https://example.com",
    scannedAt: "2026-07-01T00:00:00.000Z",
    score: 50,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    conformanceFailed: 0,
    ruleIds: [],
    ...overrides,
  };
}

describe("historyKey", () => {
  it("treats a trailing slash as the same page", () => {
    expect(historyKey("https://example.com/about/")).toBe(historyKey("https://example.com/about"));
  });

  it("ignores the fragment", () => {
    expect(historyKey("https://example.com/a#team")).toBe(historyKey("https://example.com/a"));
  });

  it("keeps the query, which often selects different content", () => {
    expect(historyKey("https://example.com/p?id=2")).toContain("id=2");
  });

  it("treats different pages as different", () => {
    expect(historyKey("https://example.com/a")).not.toBe(historyKey("https://example.com/b"));
  });

  it("returns an unparseable url unchanged rather than throwing", () => {
    expect(historyKey("not a url")).toBe("not a url");
  });
});

describe("diffScans", () => {
  it("reports a rule gone since last time as fixed", () => {
    const d = diffScans(entry({ ruleIds: ["color-contrast", "link-name"] }), entry({ ruleIds: ["link-name"] }));
    expect(d.fixed).toEqual(["color-contrast"]);
    expect(d.appeared).toEqual([]);
    expect(d.unchanged).toEqual(["link-name"]);
  });

  it("reports a rule not previously present as new", () => {
    const d = diffScans(entry({ ruleIds: ["link-name"] }), entry({ ruleIds: ["link-name", "image-alt"] }));
    expect(d.appeared).toEqual(["image-alt"]);
    expect(d.fixed).toEqual([]);
  });

  it("computes the score change with direction", () => {
    expect(diffScans(entry({ score: 40 }), entry({ score: 65 })).scoreChange).toBe(25);
    expect(diffScans(entry({ score: 65 }), entry({ score: 40 })).scoreChange).toBe(-25);
    expect(diffScans(entry({ score: 50 }), entry({ score: 50 })).scoreChange).toBe(0);
  });

  it("handles a first-ever clean scan", () => {
    const d = diffScans(entry({ ruleIds: ["a", "b"] }), entry({ ruleIds: [] }));
    expect(d.fixed).toEqual(["a", "b"]);
    expect(d.appeared).toEqual([]);
    expect(d.unchanged).toEqual([]);
  });

  it("handles a regression from clean", () => {
    const d = diffScans(entry({ ruleIds: [] }), entry({ ruleIds: ["a"] }));
    expect(d.appeared).toEqual(["a"]);
    expect(d.fixed).toEqual([]);
  });

  it("reports nothing changed when both scans match", () => {
    const d = diffScans(entry({ ruleIds: ["a", "b"] }), entry({ ruleIds: ["b", "a"] }));
    expect(d.fixed).toEqual([]);
    expect(d.appeared).toEqual([]);
    expect(d.unchanged).toEqual(["a", "b"]);
  });

  it("sorts each list so the output is stable between runs", () => {
    const d = diffScans(entry({ ruleIds: ["z", "m"] }), entry({ ruleIds: ["b", "a"] }));
    expect(d.fixed).toEqual(["m", "z"]);
    expect(d.appeared).toEqual(["a", "b"]);
  });
});

function finding(overrides: Partial<AccessibilityFinding> = {}): AccessibilityFinding {
  return {
    id: Math.random().toString(),
    source: "automated",
    severity: "serious",
    category: "accessibility",
    selector: "a",
    description: "d",
    suggestedFix: "f",
    ...overrides,
  };
}

function report(findings: AccessibilityFinding[], score = 70): AccessibilityReport {
  return {
    url: "https://example.com/page/",
    scannedAt: "2026-07-02T00:00:00.000Z",
    score,
    summary: { critical: 1, serious: 2, moderate: 3, minor: 4, total: findings.length },
    categorySummary: { accessibility: findings.length, designClarity: 0, darkPattern: 0 },
    findings,
    meta: { axeVersion: "1", renderTimeMs: 1, aiReviewTimeMs: 0, aiReviewStatus: "disabled_by_request" },
  };
}

describe("toHistoryEntry", () => {
  it("keeps the severity counts and score for the trend", () => {
    const e = toHistoryEntry(report([], 82));
    expect(e).toMatchObject({ score: 82, critical: 1, serious: 2, moderate: 3, minor: 4 });
  });

  it("normalises the url so a trailing slash doesn't split the history", () => {
    expect(toHistoryEntry(report([])).url).toBe("https://example.com/page");
  });

  it("collects accessibility rule ids, deduplicated and sorted", () => {
    const e = toHistoryEntry(
      report([
        finding({ ruleId: "link-name" }),
        finding({ ruleId: "color-contrast" }),
        finding({ ruleId: "link-name" }),
      ])
    );
    expect(e.ruleIds).toEqual(["color-contrast", "link-name"]);
  });

  // Design-clarity and dark-pattern findings are outside WCAG and shouldn't
  // make an accessibility trend look worse than it is.
  it("ignores design-clarity and dark-pattern findings", () => {
    const e = toHistoryEntry(
      report([
        finding({ ruleId: "typo-leading-tight", category: "design-clarity" }),
        finding({ ruleId: "dark-confirmshaming", category: "dark-pattern" }),
        finding({ ruleId: "link-name" }),
      ])
    );
    expect(e.ruleIds).toEqual(["link-name"]);
  });

  it("skips findings with no rule id, which can't be compared across scans", () => {
    const e = toHistoryEntry(report([finding({ ruleId: undefined }), finding({ ruleId: "a" })]));
    expect(e.ruleIds).toEqual(["a"]);
  });

  // The whole point of the compact shape: full reports carry base64
  // screenshots and would exhaust localStorage within a few scans.
  it("stores no screenshot data", () => {
    const e = toHistoryEntry(
      report([finding({ ruleId: "image-alt", elementScreenshot: "AAAA".repeat(5000) })])
    );
    expect(JSON.stringify(e)).not.toContain("AAAA");
    expect(JSON.stringify(e).length).toBeLessThan(500);
  });
});

// recordScan touches localStorage, so these run against a stub. Worth the
// setup: the authenticated-scan rule is a privacy guarantee, and a guarantee
// nobody tests is just a comment.
describe("recordScan", () => {
  function withStubbedStorage(fn: () => void) {
    let data: Record<string, string> = {};
    const stub = {
      getItem: (k: string) => data[k] ?? null,
      setItem: (k: string, v: string) => {
        data[k] = v;
      },
      removeItem: (k: string) => {
        delete data[k];
      },
    };
    (globalThis as unknown as { window: unknown }).window = { localStorage: stub };
    try {
      fn();
    } finally {
      data = {};
    }
    return stub;
  }

  it("does not record a scan that used a login", async () => {
    const { recordScan, getHistory } = await import("../src/lib/scanHistory");
    withStubbedStorage(() => {
      recordScan(report([finding({ ruleId: "link-name" })]), true);
      expect(getHistory("https://example.com/page")).toEqual([]);
    });
  });

  it("records an ordinary scan", async () => {
    const { recordScan, getHistory } = await import("../src/lib/scanHistory");
    withStubbedStorage(() => {
      recordScan(report([finding({ ruleId: "link-name" })]), false);
      expect(getHistory("https://example.com/page")).toHaveLength(1);
    });
  });

  it("keeps newest first and excludes the scan just run", async () => {
    const { recordScan, getHistory } = await import("../src/lib/scanHistory");
    withStubbedStorage(() => {
      const older = { ...report([], 40), scannedAt: "2026-07-01T00:00:00.000Z" };
      const newer = { ...report([], 80), scannedAt: "2026-07-05T00:00:00.000Z" };
      recordScan(older, false);
      recordScan(newer, false);
      const all = getHistory("https://example.com/page");
      expect(all.map((e) => e.score)).toEqual([80, 40]);
      expect(getHistory("https://example.com/page", newer.scannedAt).map((e) => e.score)).toEqual([40]);
    });
  });

  it("survives localStorage being unavailable", async () => {
    const { recordScan, getHistory } = await import("../src/lib/scanHistory");
    (globalThis as unknown as { window: unknown }).window = {
      localStorage: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
        removeItem: () => {},
      },
    };
    expect(() => recordScan(report([]), false)).not.toThrow();
    expect(getHistory("https://example.com/page")).toEqual([]);
  });
});

// A score is only comparable with another counted the same way. Four checks
// moved into the number on 2026-07-29, so a site nobody touched drops several
// points across that change — and the panel would have announced "score is
// down" and named a regression that never happened.
describe("scoresComparable", () => {
  const entry = (over: Partial<HistoryEntry>): HistoryEntry => ({
    url: "example.com",
    scannedAt: "2026-07-29T10:00:00.000Z",
    score: 50,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    conformanceFailed: 0,
    ruleIds: [],
    ...over,
  });

  it("compares two scans counted the same way", () => {
    expect(scoresComparable(entry({ scoringVersion: 2 }), entry({ scoringVersion: 2 }))).toBe(true);
  });

  it("refuses to compare across a change in what counts", () => {
    expect(scoresComparable(entry({ scoringVersion: 1 }), entry({ scoringVersion: 2 }))).toBe(false);
  });

  // Everything stored before the field existed was scored by the old rules,
  // which is the same situation rather than an unknown one.
  it("treats an entry from before this existed as the older rules", () => {
    expect(scoresComparable(entry({}), entry({ scoringVersion: 2 }))).toBe(false);
    expect(scoresComparable(entry({}), entry({ scoringVersion: 1 }))).toBe(true);
  });

  it("stamps new entries with the current version", () => {
    expect(SCORING_VERSION).toBeGreaterThanOrEqual(2);
  });
});
