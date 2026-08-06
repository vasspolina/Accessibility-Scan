import type { ChangeEvent } from "react";

/**
 * The radio and the select, brought across from the kit.
 *
 * Both are thin wrappers over the real element, which is the whole reason
 * they are safe to move: the browser supplies the keyboard behaviour, the
 * roles and the states, and neither component invents any of it. A radio
 * group's arrow keys and a select's type-ahead come from the platform.
 *
 * The one thing both must not lose is the label association. Each pairs an
 * explicit id with htmlFor rather than wrapping the control, because the
 * wrapping form breaks the moment somebody puts anything else between the
 * label and the input — and a control whose label is merely nearby has no
 * accessible name at all.
 */

export function Radio({
  id,
  name,
  value,
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
}: {
  id: string;
  name: string;
  value?: string;
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`a11y-radio-row${disabled ? " a11y-radio-row-disabled" : ""}`}>
      <input
        type="radio"
        id={id}
        name={name}
        value={value}
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
      />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

type Option = string | { value: string; label: string };

export function Select({
  id,
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  helperText,
  disabled = false,
}: {
  id: string;
  label: string;
  options?: Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  helperText?: string;
  disabled?: boolean;
}) {
  return (
    <div className="a11y-select">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
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
      {helperText && <span className="a11y-select-help">{helperText}</span>}
    </div>
  );
}
