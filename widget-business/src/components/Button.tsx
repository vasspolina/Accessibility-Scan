import type { ReactNode } from "react";

/**
 * The button, brought across from the kit.
 *
 * Behavioural in the sense that matters least: it owns no focus management
 * and no ARIA of its own — it is a real <button>, which is where all of that
 * comes from for free. That is why it is the safe one to start stage three
 * on, and why the copy is nearly literal.
 *
 * Two properties are carried over deliberately.
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
 */

/* "black" comes from the design system's own Button, where it sits beside
   "primary" rather than replacing it: primary is the accent-red submit CTA,
   black is the page's ink used as a fill (the system's Dialog confirms with
   it). Both exist because they answer different questions. */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "black";
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
