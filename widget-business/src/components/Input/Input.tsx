import type { CSSProperties, ReactNode } from "react";

/**
 * Input, ported from components/forms/Input.jsx.
 *
 * Two variants, both from the source:
 *   filled  a 56px pill on --surface-sunken — the Pangram contact-form shape
 *   line    a 44px field on a single rule, no box — what the Forms card and
 *           the Checker screen both use, and the default here for that reason
 *
 * ---- Two deliberate divergences, both about not losing what the app has ----
 *
 * 1. `describedBy` overrides the internal help id.
 *    The source hardwires aria-describedby to `${id}-help`, which assumes the
 *    field's only description is its own helper text. The URL field's is not:
 *    it points at one of four ids depending on whether the address is empty,
 *    malformed, the server errored, or the scan was blocked. That association
 *    is deliberate work, so the port takes an override rather than flattening
 *    it. Pass nothing and you get the source's behaviour.
 *
 * 2. `action` takes a node, not a glyph.
 *    The source renders whatever it is given inside a 44px black disc, which
 *    suits an arrow and nothing else. This app's action is "Check my site" —
 *    and the content rules are explicit that buttons are verbs of one to three
 *    words, which a disc cannot carry. So the slot holds a real button and the
 *    caller supplies it.
 *
 * Input.css is not imported here; see src/styles/components.css.
 */

export function Input({
  id,
  label,
  type = "text",
  value,
  defaultValue,
  onChange,
  placeholder,
  helperText,
  invalid = false,
  invalidText,
  disabled = false,
  action,
  describedBy,
  variant = "line",
  size = "default",
  inputProps,
  style,
}: {
  id: string;
  label: ReactNode;
  type?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  helperText?: ReactNode;
  invalid?: boolean;
  invalidText?: ReactNode;
  disabled?: boolean;
  action?: ReactNode;
  /** Overrides the internal help id — see note 1 above. */
  describedBy?: string;
  variant?: "filled" | "line";
  /** "display" sets the field at heading size — the Checker screen's address
   *  field, where the one thing the visitor must supply is the headline. */
  size?: "default" | "display";
  /** Escape hatch for inputMode, autoComplete, required and friends. */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  style?: CSSProperties;
}) {
  const help = invalid ? invalidText : helperText;
  const helpId = help ? `${id}-help` : undefined;

  return (
    <div className="a11y-input" style={style}>
      <label className="a11y-input-label" htmlFor={id}>
        {label}
      </label>
      <div
        className={
          "a11y-input-shell a11y-input-" +
          variant +
          (size === "display" ? " a11y-input-display" : "") +
          (invalid ? " a11y-input-invalid" : "")
        }
      >
        <input
          {...inputProps}
          id={id}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy ?? helpId}
        />
        {action}
      </div>
      {/* The helper and the error are one element, not two stacked: the source
          swaps the text rather than showing both, and a field that shows its
          hint and its error at once has told the reader to do two things. */}
      {help && (
        <span
          id={helpId}
          className={
            "a11y-input-help" + (invalid ? " a11y-input-help-invalid" : "")
          }
        >
          {help}
        </span>
      )}
    </div>
  );
}
