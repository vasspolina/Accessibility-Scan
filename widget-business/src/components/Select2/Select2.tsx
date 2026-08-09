import type { CSSProperties, ReactNode } from "react";

/**
 * Select, ported from components/forms/Select.jsx.
 *
 * Named Select2 in the tree so it can coexist with FormControls' Select while
 * call sites migrate — the same reason Radio was named .a11y-radio2. It is
 * exported as `Select`, so the eventual swap is an import change and nothing
 * more.
 *
 * The annotation on the design's own card is worth honouring at the call site
 * rather than here: "Radio or OptionCard at four options or fewer." A select
 * holding three choices should be OptionCards instead.
 *
 */

export type SelectOption = string | { value: string; label: string };

export function Select({
  id,
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  helperText,
  disabled = false,
  variant = "filled",
  style,
}: {
  id: string;
  label: ReactNode;
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  helperText?: ReactNode;
  disabled?: boolean;
  variant?: "filled" | "line";
  style?: CSSProperties;
}) {
  const helpId = helperText ? `${id}-help` : undefined;
  return (
    <div className="a11y-select2" style={style}>
      <label className="a11y-select2-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={"a11y-select2-field a11y-select2-" + variant}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        /* The source renders its helper with no id and no association, so a
           screen reader never reaches it. One line to fix. */
        aria-describedby={helpId}
      >
        {options.map((o) => {
          const v = typeof o === "string" ? { value: o, label: o } : o;
          return (
            <option key={v.value} value={v.value}>
              {v.label}
            </option>
          );
        })}
      </select>
      {helperText && (
        <span id={helpId} className="a11y-select2-help">
          {helperText}
        </span>
      )}
    </div>
  );
}
