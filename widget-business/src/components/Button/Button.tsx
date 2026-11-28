import type { ReactNode } from "react";

/**
 * The button.
 *
 * Behavioural in the sense that matters least: it owns no focus management
 * and no ARIA of its own — it is a real <button>, which is where all of that
 * comes from for free.
 *
 * Two properties are carried over from the version this replaces, and both
 * are load-bearing rather than stylistic.
 *
 * `type` defaults to "button". A <button> inside a form defaults to submit,
 * so a component that forgot this would turn every Print or Copy control
 * into a form submission. UrlForm passes type="submit" explicitly, which is
 * the only place that wants it.
 *
 * `disabled` sets the real attribute rather than a class. A disabled button
 * must be out of the tab order and unclickable, and only the attribute does
 * both — styling something to look disabled while it still takes focus is a
 * trap this report flags on other sites.
 *
 * No inline styles and no values of any kind: everything visual is in
 * Button.css against the tree's tokens. A class is what
 * lets the responsive and print rules reach the control.
 *
 */

/**
 * Six variants.
 *
 * "accent" is a genuine duplicate: it and "primary" resolve to
 * the same fill and the same label colour, character for character. The
 * name is kept, but nothing in this app should reach for
 * it, and the CSS styles the two together so they cannot drift apart.
 *
 * "black" sits beside "primary" rather than replacing it: primary is the
 * ember submit action, black is the page's ink used as a fill, which is what
 * the Dialog confirms with.
 */
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "accent"
  | "black";

export type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  disabled = false,
  onClick,
  children,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** "reset" is allowed beside "button" and "submit". */
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`a11y-btn a11y-btn-${variant} a11y-btn-${size}`}
    >
      {children}
    </button>
  );
}
