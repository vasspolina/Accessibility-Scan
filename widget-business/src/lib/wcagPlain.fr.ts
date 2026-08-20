/* Placeholder awaiting translation — every accessor falls back to English
   per key, so an empty map here renders the English report. Overwritten by
   the translation pass. */
import type { PlainRule } from "./wcagPlain";
export const PLAIN_FR: Record<string, PlainRule> = {};
export const FIXES_FR: Record<string, string | string[]> = {};
export const UNDECIDED_FR: Record<string, { what: string; ask: string }> = {};
export const PRINCIPLES_FR: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {};
export const LEVEL_FRAMING_FR: Partial<Record<"A" | "AA" | "AAA", string>> = {};
