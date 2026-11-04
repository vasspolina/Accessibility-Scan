/**
 * A numbered test plan in a chat answer (user's instruction, 4 Nov 2026:
 * "this needs to widgets"). The model writes a manual test plan as a
 * numbered list whose every item leads with a bold name and follows it
 * with what to do: "1. **Keyboard only.** Put the mouse away and…". Such a
 * list is drawn as one tile per step (number, name, instruction) instead
 * of a plain list. A numbered list that does not lead every item with a
 * bold name stays a list, so ordinary steps and counts are untouched.
 */

export type PlanStep = { number: number; title: string; body: string };

const ITEM = /^\s*(\d+)[.)]\s+\*\*([^*]+?)\*\*\s*(.*)$/;
// What sits between the name and the instruction: a colon, a full stop, or
// a dash of any length, with or without spaces.
const JOIN = /^[:.–—-]\s*/;

/** The steps, or null when the list is not a test plan. Two steps at
 *  least: a single bold-led item is a sentence, not a plan. */
export function planSteps(items: string[]): PlanStep[] | null {
  if (items.length < 2) return null;
  const steps: PlanStep[] = [];
  for (const item of items) {
    const m = ITEM.exec(item);
    if (!m) return null;
    let title = m[2].trim();
    // "**Keyboard only.**" keeps its stop inside the bold; the tile's name
    // is a heading, so the stop goes, but a question mark stays.
    title = title.replace(/[.:]$/, "").trim();
    const body = m[3].replace(JOIN, "").trim();
    if (!title) return null;
    steps.push({ number: parseInt(m[1], 10), title, body });
  }
  return steps;
}
