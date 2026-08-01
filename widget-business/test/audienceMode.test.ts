import { describe, it, expect } from "vitest";
import {
  loadAudienceMode,
  saveAudienceMode,
  enClauseFor,
  matchesFixFilter,
  type FixFilter,
} from "../src/lib/audienceMode";
import type { AccessibilityFinding } from "../src/api/scanClient";

function fakeStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    dump: () => store,
  };
}

describe("audience mode persistence", () => {
  it("defaults to business — the safer default for the larger audience", () => {
    expect(loadAudienceMode(fakeStorage())).toBe("business");
  });

  it("round-trips the professional choice", () => {
    const s = fakeStorage();
    saveAudienceMode("professional", s);
    expect(loadAudienceMode(s)).toBe("professional");
  });

  // A tampered or stale value must never produce a third mode.
  it("treats junk in storage as business", () => {
    expect(loadAudienceMode(fakeStorage({ "a11y-audience-mode": "admin" }))).toBe("business");
  });

  it("survives storage that throws", () => {
    const hostile = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadAudienceMode(hostile)).toBe("business");
    expect(() => saveAudienceMode("professional", hostile)).not.toThrow();
  });
});

describe("EN 301 549 clause derivation", () => {
  // Chapter 9 maps one-to-one onto WCAG 2.1 A/AA: 9.1.4.3 is 1.4.3.
  it("derives the clause mechanically from the criterion number", () => {
    expect(enClauseFor("1.4.3", "AA")).toBe("EN 301 549 · 9.1.4.3");
    expect(enClauseFor("2.1.1", "A")).toBe("EN 301 549 · 9.2.1.1");
  });

  it("reads the number out of a full criterion string", () => {
    expect(enClauseFor("1.1.1 Non-text Content (A)", "A")).toBe("EN 301 549 · 9.1.1.1");
  });

  // The honesty half: no clause where the standard provides no anchor.
  it("claims nothing for AAA, N/A, or missing criteria", () => {
    expect(enClauseFor("2.5.5", "AAA")).toBeNull();
    expect(enClauseFor("N/A")).toBeNull();
    expect(enClauseFor(undefined)).toBeNull();
    expect(enClauseFor("")).toBeNull();
  });
});

describe("the professional view filter", () => {
  const finding = (ruleId: string | undefined, category = "accessibility"): AccessibilityFinding =>
    ({
      id: "x",
      source: "automated",
      severity: "moderate",
      category,
      selector: "div",
      description: "d",
      suggestedFix: "f",
      ruleId,
    }) as AccessibilityFinding;

  // The prompt's own examples, landing where it says they should.
  it("sends visual and interaction issues to Design", () => {
    for (const rule of [
      "color-contrast",
      "mobile-tap-target",
      "keyboard-faint-focus",
      "keyboard-no-visible-focus",
      "typo-font-size-small",
    ]) {
      expect(matchesFixFilter(finding(rule), "design"), rule).toBe(true);
      expect(matchesFixFilter(finding(rule), "code"), rule).toBe(false);
    }
  });

  it("sends markup and ARIA issues to Code", () => {
    for (const rule of [
      "image-alt",
      "aria-allowed-role",
      "label",
      "landmark-one-main",
      "keyboard-focus-trap",
      "some-future-axe-rule",
    ]) {
      expect(matchesFixFilter(finding(rule), "code"), rule).toBe(true);
      expect(matchesFixFilter(finding(rule), "design"), rule).toBe(false);
    }
  });

  it("keeps wording issues out of both, under Content", () => {
    expect(matchesFixFilter(finding("link-text-vague"), "content")).toBe(true);
    expect(matchesFixFilter(finding("link-text-vague"), "code")).toBe(false);
  });

  it("folds the document kind into Code rather than hiding it", () => {
    expect(matchesFixFilter(finding("pdf-not-tagged"), "code")).toBe(true);
  });

  // Every finding appears under All and under exactly one specific chip, so
  // the chips partition the report rather than losing cards between them.
  it("partitions: each finding matches exactly one specific filter", () => {
    const rules = [
      "color-contrast",
      "image-alt",
      "link-text-vague",
      "mobile-tap-target",
      "pdf-not-tagged",
      undefined,
      "dark-consent-no-reject",
    ];
    for (const rule of rules) {
      const f = finding(rule, rule === "dark-consent-no-reject" ? "dark-pattern" : "accessibility");
      const hits = (["design", "code", "content"] as FixFilter[]).filter((flt) =>
        matchesFixFilter(f, flt)
      );
      expect(hits, String(rule)).toHaveLength(1);
      expect(matchesFixFilter(f, "all"), String(rule)).toBe(true);
    }
  });
});
