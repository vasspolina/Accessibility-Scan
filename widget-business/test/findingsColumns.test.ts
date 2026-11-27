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

const markup = (findings: AccessibilityFinding[]) =>
  renderToStaticMarkup(
    createElement(
      ReportViewProvider,
      { value: { professional: false, criterionNames: {} } },
      createElement(FindingsList, { findings })
    )
  );

/* Since 24 Nov 2026 the schedule is set as a list of questions (user's
   reference): the issue and its severity, whatever the rows carry. WCAG,
   Level, Fix and Instances are the first line of the opened finding. */
describe("findings table columns", () => {
  it("is the issue and its severity, with or without repeats", () => {
    expect(headers([finding("a"), finding("b")])).toEqual(["issue", "severity"]);
    expect(headers([finding("a"), { ...finding("a"), id: "a-2" }, finding("b")])).toEqual(["issue", "severity"]);
  });
  it("keeps both when no row names a criterion", () => {
    const bare = { wcagCriterion: undefined, wcagLevel: undefined } as Partial<AccessibilityFinding>;
    expect(headers([finding("cookie", bare)])).toEqual(["issue", "severity"]);
  });
  it("sets the severity as a word at the end of the row, not a badge over the title", () => {
    const html = markup([finding("a")]);
    expect(html).toContain('class="a11y-finding-sev-word a11y-finding-sev-serious"');
    expect(html).not.toContain("a11y-finding-sev-fold");
  });
});
