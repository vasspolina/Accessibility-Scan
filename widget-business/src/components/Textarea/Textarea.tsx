import type { CSSProperties, ReactNode } from "react";

/**
 * Textarea, ported from components/forms/Textarea.jsx.
 *
 * The one boxed field in a system of underlined ones, and deliberately so: a
 * multi-line answer needs its extent shown before it is typed into, which a
 * single rule cannot do. The Forms card draws it the same way.
 *
 * Textarea.css is not imported here; see src/styles/components.css.
 */

export function Textarea({
  id,
  label,
  value,
  defaultValue,
  onChange,
  placeholder,
  helperText,
  invalid = false,
  invalidText,
  disabled = false,
  rows = 5,
  style,
}: {
  id: string;
  label: ReactNode;
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  helperText?: ReactNode;
  invalid?: boolean;
  invalidText?: ReactNode;
  disabled?: boolean;
  rows?: number;
  style?: CSSProperties;
}) {
  const help = invalid ? invalidText : helperText;
  const helpId = help ? `${id}-help` : undefined;
  return (
    <div className="a11y-textarea" style={style}>
      <label className="a11y-textarea-label" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={invalid ? "a11y-textarea-invalid" : undefined}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        aria-invalid={invalid || undefined}
        aria-describedby={helpId}
      />
      {help && (
        <span id={helpId} className={"a11y-textarea-help" + (invalid ? " a11y-textarea-help-invalid" : "")}>
          {help}
        </span>
      )}
    </div>
  );
}
