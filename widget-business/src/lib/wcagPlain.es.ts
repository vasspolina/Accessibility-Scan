/* Placeholder awaiting translation — every accessor falls back to English
   per key, so an empty map here renders the English report. Overwritten by
   the translation pass. */
import type { PlainRule } from "./wcagPlain";
export const PLAIN_ES: Record<string, PlainRule> = {};
export const FIXES_ES: Record<string, string | string[]> = {};
export const UNDECIDED_ES: Record<string, { what: string; ask: string }> = {};
export const PRINCIPLES_ES: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {};
export const LEVEL_FRAMING_ES: Partial<Record<"A" | "AA" | "AAA", string>> = {};
