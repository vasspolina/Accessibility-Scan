/**
 * The report's chrome, as a dictionary. Content copy (finding titles,
 * explanations, asks, fixes) lives in wcagPlain and its per-language
 * siblings; THIS file carries the shell a reader sees around it — section
 * titles, buttons, table heads, the stop-press.
 *
 * `t(key)` returns the current language's string, falling back to English
 * per key: a missing translation degrades to the English label, never to a
 * blank or a key name. Keys are the English strings themselves — the report
 * is written in its keys, so a key that goes stale is visible in the UI
 * rather than silently orphaned in a map.
 */
import { getLang, type Lang } from "./i18n";
import { STRINGS_DE } from "./strings.de";
import { STRINGS_ES } from "./strings.es";
import { STRINGS_FR } from "./strings.fr";

const BY_LANG: Partial<Record<Lang, Record<string, string>>> = {
  de: STRINGS_DE,
  es: STRINGS_ES,
  fr: STRINGS_FR,
};

export function t(key: string): string {
  const lang = getLang();
  if (lang === "en") return key;
  return BY_LANG[lang]?.[key] ?? key;
}

/**
 * Every chrome string the components route through t(), listed so the
 * translation files can be checked for parity in tests. The English value
 * IS the key.
 */
export const CHROME_KEYS: string[] = [
  // Section titles and nav labels
  "Your score",
  "Score",
  "New scan",
  "Since last time",
  "Do you meet the legal standard?",
  "Legal standard",
  "Ready for WCAG 2.2?",
  "WCAG 2.2",
  "What costs you trust",
  "What people can't use",
  "For your designer and developer",
  "Designer and developer",
  "Notes on the design",
  "Screen reader preview",
  "Accessibility statement",
  "Conformance report",
  "Your page, through other eyes",
  "Through other eyes",
  "Site audit",
  "Page by page",
  "Pages that disagree",
  "Fix once, fix everywhere",
  "Findings",
  "Sections",
  // The stop-press
  "Start here: a screen reader cannot get past your cookie banner",
  "The banner hides the page from screen readers and never takes focus. Until that is fixed, everything below this line is what a screen reader user never reaches.",
  "See the finding",
  // Common controls and labels
  "Show the checklist",
  "Hide the checklist",
  "Show fewer",
  "Show the technical breakdown",
  "Hide the technical breakdown",
  "Learn more about this issue",
  "Start the scan",
  "Which site?",
  "Website address (required)",
  "Behind a login",
  "Public pages only.",
  "How much of it?",
  "Who reads it?",
  "Report style",
  "Business owners",
  "Professionals",
  "Add an AI review",
  "AI review",
  "This page",
  "Whole site",
  "Severity",
  "Issue",
  "Instances",
  "Affected elements",
  "What we found",
  "What to do",
  "Who fixes this",
  "Officially:",
  "Needs a person",
  "Would fail today",
  "Nothing found",
  "Software can check it",
  "Fix first",
  "Fix soon",
  "Fix eventually",
  "Minor polish",
  "The notes",
  "The six new items",
  "Save as PDF",
  "Email me this report",
  "Copy summary as plain text",
  "Reading order, not visual order.",
];
