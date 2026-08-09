import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";

/**
 * Checkbox, ported from components/forms/Checkbox.jsx.
 * Annotation: "Checkbox for many, radio for one. The label is part of the target."
 *
 * The source puts the <input> and a sibling <label htmlFor> side by side rather
 * than wrapping. Kept, because it is what lets the control keep its native
 * 24px hit area while the label keeps its own — a wrapping label would make the
 * gap between them clickable too, which is fine for a card and wrong for a row.
 *
 */

export function Checkbox({
  id,
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  style,
  ...rest
}: {
  id: string;
  label: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  style?: CSSProperties;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "onChange" | "style">) {
  return (
    <div className={"a11y-checkbox" + (disabled ? " a11y-checkbox-disabled" : "")} style={style}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}
