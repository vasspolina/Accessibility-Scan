import { CRITERIA_DE, WCAG22_DE } from "./criteriaText.de.js";
import { CRITERIA_ES, WCAG22_ES } from "./criteriaText.es.js";
import { CRITERIA_FR, WCAG22_FR } from "./criteriaText.fr.js";

/**
 * The conformance checklist's plain question and failing statement, per
 * language.
 *
 * Translated HERE rather than in the widget because the checklist travels:
 * the same fifty rows reach the report, the emailed copy and the printed
 * PDF, and a translation applied at the last render would leave the other
 * two in English.
 *
 * Fallback is per criterion id, not per language — a row a translator has
 * not reached yet renders in English rather than blank, so coverage can
 * grow one criterion at a time without breaking a report.
 *
 * Only the reader-facing sentences are localised. Criterion numbers, the
 * official criterion names and levels stay as the standard writes them:
 * "1.4.3 Contrast (Minimum)" is what an auditor and a developer search for,
 * in any language.
 */
export type ReportLang = "en" | "de" | "es" | "fr";

const SUPPORTED: ReportLang[] = ["en", "de", "es", "fr"];

const BY_LANG: Partial<Record<ReportLang, Record<string, { plain: string; failing: string }>>> = {
  de: CRITERIA_DE,
  es: CRITERIA_ES,
  fr: CRITERIA_FR,
};

/** Normalises anything ("de-DE", "FR", undefined) to a supported language. */
export function normalizeReportLang(raw: string | undefined | null): ReportLang {
  const two = (raw ?? "").trim().slice(0, 2).toLowerCase();
  return (SUPPORTED as string[]).includes(two) ? (two as ReportLang) : "en";
}

/** The localised pair for one criterion, or undefined to keep the English. */
export function criterionText(
  id: string,
  lang: ReportLang
): { plain: string; failing: string } | undefined {
  if (lang === "en") return undefined;
  return BY_LANG[lang]?.[id];
}

const WCAG22_BY_LANG: Partial<
  Record<ReportLang, Record<string, { plain: string; failing: string; whyManual?: string }>>
> = {
  de: WCAG22_DE,
  es: WCAG22_ES,
  fr: WCAG22_FR,
};

/** The same, for the six criteria WCAG 2.2 adds at A and AA. */
export function wcag22Text(
  id: string,
  lang: ReportLang
): { plain: string; failing: string; whyManual?: string } | undefined {
  if (lang === "en") return undefined;
  return WCAG22_BY_LANG[lang]?.[id];
}
