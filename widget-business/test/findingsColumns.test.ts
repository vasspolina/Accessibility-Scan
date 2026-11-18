import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FindingsList } from "../src/components/FindingsList";
import { ReportViewProvider } from "../src/components/ReportViewContext";
import type { AccessibilityFinding } from "../src/api/scanClient";

/**
 * A findings table drops any column that is empty in every one of its rows,
 * header and all (user's instruction, 18 Nov 2026): Instances when nothing
 * repeats, Level and WCAG when no row names one.
 */
const finding = (ruleId: string, extra: Partial<AccessibilityFinding> = {}): AccessibilityFinding =>
  ({
    id: `${ruleId}-1`,
    source: "axe",
    suggestedFix: "Fix it.",
    ruleId,
    category: "accessibility",
    severity: "serious",
    title: ruleId,
    description: ruleId,
    wcagCriterion: "1.4.3",
    wcagLevel: "AA",
    selector: "main > form",
    ...extra,
  }) as unknown as AccessibilityFinding;

const headers = (findings: AccessibilityFinding[]) =>
  [
    ...renderToStaticMarkup(
      createElement(
        ReportViewProvider,
        { value: { professional: false, criterionNames: {} } },
        createElement(FindingsList, { findings })
      )
    ).matchAll(/<th[^>]*data-col="([a-z]+)"/g),
  ].map((m) => m[1]);

describe("findings table columns", () => {
  it("drops Instances when no row repeats", () => {
    expect(headers([finding("a"), finding("b")])).toEqual(["severity", "issue", "wcag", "fix", "level"]);
  });
  it("keeps Instances when a row repeats", () => {
    expect(headers([finding("a"), { ...finding("a"), id: "a-2" }, finding("b")])).toEqual([
      "severity", "issue", "wcag", "fix", "level", "count",
    ]);
  });
  it("drops WCAG and Level when no row names a criterion", () => {
    const bare = { wcagCriterion: undefined, wcagLevel: undefined } as Partial<AccessibilityFinding>;
    expect(headers([finding("cookie", bare)])).toEqual(["severity", "issue", "fix"]);
  });
});
