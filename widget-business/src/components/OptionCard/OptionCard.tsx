import type { CSSProperties, ReactNode } from "react";

/**
 * OptionCard, ported from components/forms/OptionCard.jsx.
 *
 * A radio that fills a card. The whole card is the <label>, so the target is
 * the card and not the 20px dot in its corner — the Forms card's "the label is
 * part of the target", taken as far as it goes.
 *
 * The selected card inverts to black. That is the source's behaviour and it is
 * a real improvement on a dot alone: selection survives greyscale, and it reads
 * from across the room.
 *
 * Annotation: "Two or three per row, never more than four."
 *
 * OptionCard.css is not imported here; see src/styles/components.css.
 */

export function OptionCard({
  id,
  name,
  value,
  label,
  description,
  meta,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  style,
}: {
  id: string;
  name: string;
  value: string;
  label: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  return (
    <label
      htmlFor={id}
      className={
        "a11y-optioncard" +
        (checked ? " a11y-optioncard-on" : "") +
        (disabled ? " a11y-optioncard-disabled" : "")
      }
      style={style}
    >
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
      <span className="a11y-optioncard-text">
        <span className="a11y-optioncard-label">{label}</span>
        {description && (
          <span className="a11y-optioncard-desc">{description}</span>
        )}
      </span>
      {meta && <span className="a11y-optioncard-meta">{meta}</span>}
    </label>
  );
}
