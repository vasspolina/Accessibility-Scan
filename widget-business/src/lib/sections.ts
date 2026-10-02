import { t } from "./strings";

/**
 * The report's sections, by name.
 *
 * The page reading (behind the form) renders them in PAGE_ORDER. The
 * conversation renders any of them as a block in the thread, when the
 * person types its command, presses its suggestion, or the assistant shows
 * it with the show_section tool — whose enum is these keys (see the
 * backend's chatPrompt.ts), so the two lists must stay in step.
 */
export type SectionKey =
  | "stop"
  | "score"
  | "protable"
  | "history"
  | "findings"
  | "checklist"
  | "wcag22"
  | "team"
  | "notes"
  | "screenreader"
  | "statement"
  | "vpat"
  | "simulator"
  | "cta"
  | "audit"
  | "settings";

/** The page's reading order, unchanged from before the conversation. */
export const PAGE_ORDER: SectionKey[] = [
  "stop",
  "score",
  "protable",
  "history",
  "findings",
  "checklist",
  "wcag22",
  "team",
  "notes",
  "screenreader",
  "statement",
  "vpat",
  "simulator",
  "cta",
];

/** The sections a person can ask for, with the command that shows each.
 *  Labels reuse the report's own section names, already translated. */
export const SHOWABLE: Array<{ key: SectionKey; command: string; label: () => string }> = [
  { key: "score", command: "score", label: () => t("Score") },
  { key: "findings", command: "findings", label: () => t("Findings") },
  { key: "checklist", command: "checklist", label: () => t("Legal standard") },
  { key: "wcag22", command: "wcag22", label: () => t("WCAG 2.2") },
  { key: "team", command: "team", label: () => t("Designer and developer") },
  { key: "notes", command: "notes", label: () => t("Notes on the design") },
  { key: "screenreader", command: "screenreader", label: () => t("Screen reader preview") },
  { key: "statement", command: "statement", label: () => t("Accessibility statement") },
  { key: "vpat", command: "vpat", label: () => t("Conformance report") },
  { key: "simulator", command: "simulator", label: () => t("Through other eyes") },
  { key: "history", command: "history", label: () => t("Since last time") },
  { key: "audit", command: "audit", label: () => t("Site audit") },
  { key: "settings", command: "settings", label: () => t("Settings") },
];

export function sectionForCommand(text: string): SectionKey | null {
  const name = text.trim().replace(/^\//, "").toLowerCase();
  return SHOWABLE.find((s) => s.command === name)?.key ?? null;
}

export function sectionLabel(key: SectionKey): string {
  return SHOWABLE.find((s) => s.key === key)?.label() ?? key;
}
