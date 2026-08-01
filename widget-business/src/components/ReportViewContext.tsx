import { createContext, useContext } from "react";

/**
 * How the report is currently being rendered — presentation state only,
 * provided once by App and read wherever a card needs it. A context rather
 * than props because it would otherwise thread through three layers on two
 * separate paths (sections and principle groups) to reach the cards.
 */
export interface ReportView {
  professional: boolean;
  /**
   * WCAG 2.1 A/AA criterion names and levels, keyed by number ("1.4.3"),
   * built from report.conformance.criteria — the same table the conformance
   * section renders, so the professional card cites the criterion by the
   * name the rest of the report uses.
   */
  criterionNames: Record<string, { name: string; level: "A" | "AA" }>;
}

const ReportViewContext = createContext<ReportView>({ professional: false, criterionNames: {} });

export const ReportViewProvider = ReportViewContext.Provider;

export function useReportView(): ReportView {
  return useContext(ReportViewContext);
}
