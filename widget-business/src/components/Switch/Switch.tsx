import type { CSSProperties, ReactNode } from "react";

/**
 * Switch, ported from components/forms/Switch.jsx.
 *
 * A real button with role="switch" and aria-checked, not a checkbox wearing a
 * track. The visible "On"/"Off" word beside it is the design system's rule —
 * "Switches show a visible On/Off word" — and it is aria-hidden, because
 * aria-checked already says the same thing and a screen reader should not hear
 * the state twice.
 *
 * The label is a <span> with an id, referenced by aria-labelledby rather than
 * wrapping the control. That is the source's shape and it is the right one
 * here: the label sits at the far left of a wide row with the control pushed
 * to the right, so a wrapping <label> would make the entire row a click
 * target, including the empty space between them.
 *
 * Switch.css is not imported here; see src/styles/components.css.
 */

export function Switch({
  id,
  label,
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  style,
}: {
  id: string;
  label: ReactNode;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  size?: "md" | "lg";
  style?: CSSProperties;
}) {
  return (
    <div
      className={
        "a11y-switch" +
        (size === "lg" ? " a11y-switch-lg" : "") +
        (disabled ? " a11y-switch-disabled" : "")
      }
      style={style}
    >
      <span id={`${id}-label`} className="a11y-switch-label">
        {label}
      </span>
      <span className="a11y-switch-controls">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          id={id}
          disabled={disabled}
          className="a11y-switch-track"
          onClick={() => onChange?.(!checked)}
        >
          <span aria-hidden="true" className="a11y-switch-knob" />
        </button>
        <span aria-hidden="true" className="a11y-switch-word">
          {checked ? "On" : "Off"}
        </span>
      </span>
    </div>
  );
}
