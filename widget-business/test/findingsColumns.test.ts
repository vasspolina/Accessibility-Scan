import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { FindingsList } from "../src/components/FindingsList";
import { ReportViewProvider } from "../src/components/ReportViewContext";
import type { AccessibilityFinding } from "../src/api/scanClient";

/**
 * Every findings table in a report has the same columns. Instances is decided
 * once for the whole report (ReportView.showInstances), so an empty one is
 * gone from every table and a used one is in every table, including those
 * where no row repeats.
 */
const finding = (ruleId: string): AccessibilityFinding =>
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
  }) as unknown as AccessibilityFinding;

const headers = (showInstances: boolean | undefined) =>
  [
    ...renderToStaticMarkup(
      createElement(
        ReportViewProvider,
        { value: { professional: false, criterionNames: {}, showInstances } },
        createElement(FindingsList, { findings: [finding("a"), finding("b")] })
      )
    ).matchAll(/<th[^>]*data-col="([a-z]+)"/g),
  ].map((m) => m[1]);

describe("findings table columns", () => {
  it("drops Instances from every table when nothing in the report repeats", () => {
    expect(headers(false)).toEqual(["severity", "issue", "wcag", "fix", "level"]);
  });
  it("keeps Instances in a table with no repeats when another section has them", () => {
    expect(headers(true)).toEqual(["severity", "issue", "wcag", "fix", "level", "count"]);
  });
});
