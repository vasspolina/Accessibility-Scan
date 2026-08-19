import type { MouseEvent } from "react";

/**
 * Lets a whole table row open its own detail panel.
 *
 * The arrow is a 24px target at the far left of a row whose text runs the
 * width of the screen — the bare minimum WCAG 2.5.8 asks for, where every
 * deliberate control in this report gets 44. On a phone it is the hardest
 * thing in the report to hit, and everything beside it looks tappable and
 * is not. Meeting the letter of the target-size rule while being the report's
 * worst target is not a look this product can afford.
 *
 * Deliberately a pointer convenience and nothing more. The row does not
 * become a button: the real <button aria-expanded> the kit renders stays the
 * one control, keeps the keyboard behaviour, and remains the only thing a
 * screen reader is offered. Adding role="button" to the row would announce
 * every row twice and put a second, competing control in the tab order.
 *
 * Applied to the container rather than each row, because the rows are
 * rendered inside the vendored DataTable, which takes no props for this —
 * and the design system is copied down from the design tool, so an edit
 * there would be overwritten by the next pull.
 */
export function expandRowOnClick(event: MouseEvent<HTMLElement>): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;

  // A real control inside the row acts for itself. Without this, opening a
  // "Learn more" link or pressing Copy would also toggle the panel.
  if (target.closest("a, button, input, select, textarea, summary, [role='button']")) return;

  // Someone selecting a sentence to copy it has not asked for anything to
  // open. A click that ends a selection still fires here.
  //
  // The root's own getSelection() first, and this is the whole of why the
  // guard works: this widget renders inside a shadow root, and a selection
  // made in there reads as empty from document.getSelection(). Asking the
  // document alone found nothing every time and the guard never fired —
  // measured, after writing it the obvious way and watching a selected row
  // collapse under the click that ended the selection.
  // Cast because ShadowRoot.getSelection is not in the DOM lib types: it is
  // a Chromium extension to the Selection API, with no standard equivalent
  // and no other way to read a selection made inside a shadow root.
  const root = target.getRootNode() as Node & { getSelection?: () => Selection | null };
  const selection =
    typeof root.getSelection === "function"
      ? root.getSelection()
      : target.ownerDocument.defaultView?.getSelection();
  if (selection && !selection.isCollapsed && selection.toString().trim() !== "") return;

  const row = target.closest("tr");
  if (!row) return;

  // Only the summary row carries the toggle. Clicking inside an open detail
  // panel finds that panel's own <tr>, which has none, and correctly does
  // nothing — the panel is for reading, not another place to close it.
  const toggle = row.querySelector<HTMLButtonElement>("button[aria-expanded]");
  toggle?.click();
}
