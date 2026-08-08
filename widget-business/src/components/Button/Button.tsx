import type { ReactNode } from "react";

/**
 * The button, ported from components/actions/Button.jsx.
 *
 * Behavioural in the sense that matters least: it owns no focus management
 * and no ARIA of its own — it is a real <button>, which is where all of that
 * comes from for free. That is why it is the safe one to start on, and why
 * the port is nearly literal.
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
 * Button.css against Foundations v2 tokens. The source styles inline so it
 * can render without a stylesheet; this package has one, and a class is what
 * lets the responsive and print rules reach the control.
 *
 * Button.css is deliberately NOT imported here. This widget renders inside a
 * shadow root, and a plain `import "./Button.css"` would do two wrong things
 * at once: Vite injects it into document.head, where it can never cross the
 * shadow boundary inward, and where it does leak onto the host page — the
 * exact thing the shadow root exists to prevent. Component stylesheets are
 * collected by src/styles/components.css and inlined into the root at mount.
 * See .claude/rules/design-system.md.
 */

/**
 * Six variants, matching the source exactly.
 *
 * "accent" is a genuine duplicate: in the source it and "primary" resolve to
 * the same fill and the same label colour, character for character. It is
 * kept because removing a name from a ported API is a decision for the
 * design system, not for the port — but nothing in this app should reach for
 * it, and the CSS styles the two together so they cannot drift apart.
 *
 * "black" sits beside "primary" rather than replacing it: primary is the
 * ember submit action, black is the page's ink used as a fill, which is what
 * the system's own Dialog confirms with.
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
  /** "reset" is not in the source's type union; see the parity note. */
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
