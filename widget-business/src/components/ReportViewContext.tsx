import { createContext, useContext, type MouseEvent } from "react";

/**
 * How the report is currently being rendered — presentation state only,
 * provided once by App and read wherever a card needs it. A context rather
 * than props because it would otherwise thread through three layers on two
 * separate paths (sections and principle groups) to reach the cards.
 */
export interface ReportView {
  professional: boolean;
  /** Where the scanner is, for the cards that can write back to it. */
  apiBase?: string;
  /** The scanned URL — triage is keyed by its site. */
  siteUrl?: string;
  /** A key is set, so a card may offer "mark as". */
  signedIn?: boolean;
  /**
   * WCAG 2.1 A/AA criterion names and levels, keyed by number ("1.4.3"),
   * built from report.conformance.criteria — the same table the conformance
   * section renders, so the professional card cites the criterion by the
   * name the rest of the report uses.
   */
  criterionNames: Record<string, { name: string; level: "A" | "AA" }>;
  /**
   * Drawn inside a block of the conversation, not on the page. A block has
   * no fold line since 22 Nov 2026, so each section's own heading titles it
   * there as on the page; this only drops what a filed report does not
   * repeat (the summary's copy button, the worst-of cards).
   */
  inChat?: boolean;
  /**
   * Puts a question to the assistant in this conversation, with the page it
   * is about as the reply's source. Set only for blocks drawn in the chat,
   * so Learn more there asks in the thread instead of leaving it (user's
   * choice, 24 Nov 2026: the help sites refuse to be framed, Deque with
   * X-Frame-Options and W3C with frame-ancestors, so the page itself cannot
   * open inside the chat).
   */
  ask?: (text: string, source: { url: string; title: string }) => void;
}

const ReportViewContext = createContext<ReportView>({ professional: false, criterionNames: {} });

export const ReportViewProvider = ReportViewContext.Provider;

export function useReportView(): ReportView {
  return useContext(ReportViewContext);
}

/**
 * The click for a Learn more link. Inside the chat a plain click asks the
 * assistant about the item and keeps the reader in the conversation; the
 * href stays, so a modified or middle click, the printed report and the
 * page outside the chat still go to the help page itself.
 */
export function learnMoreClick(
  ask: ReportView["ask"],
  question: string,
  url: string
): ((e: MouseEvent<HTMLAnchorElement>) => void) | undefined {
  if (!ask) return undefined;
  return (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    ask(question, { url, title: sourceTitle(url) });
  };
}

/** The help page's site, as the Sources line names it. */
function sourceTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
