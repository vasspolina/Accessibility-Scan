import type { CSSProperties, ReactNode } from "react";

/**
 * Radio, ported from components/forms/Radio.jsx.
 *
 * Replaces the Radio in FormControls.tsx, whose API this one is a strict
 * superset of — so call sites keep working and gain two things the design has
 * and the app did not:
 *
 *   description  a second line under the label
 *   meta         a value pinned to the right edge ("42 pages")
 *
 * That is not decoration. The scan form currently explains BOTH of its options
 * in one hint underneath them — "This page takes twenty to forty seconds; whole
 * site finds what repeats on every page" — which makes the reader match clauses
 * to options themselves. The design puts each explanation on the option it
 * belongs to, which is the Forms card's rule that the label is part of the
 * target, applied to the description as well.
 *
 * The whole control is a <label>, so the text is inside the hit area rather
 * than beside it. That is the source's shape and the reason a 44px minimum
 * height is enough to satisfy the target-size criterion here.
 *
 * Radio.css is not imported here; see src/styles/components.css.
 */

export function Radio({
  id,
  name,
  value,
  label,
  meta,
  description,
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
  meta?: ReactNode;
  description?: ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
}) {
  /* A row carrying a description or a meta value is taller and takes a rule
     beneath it; a bare label row does not. The source branches on exactly this
     and it is what keeps a plain list of options from looking like a table. */
  const roomy = Boolean(meta || description);

  return (
    <label
      htmlFor={id}
      className={
        "a11y-radio2" +
        (roomy ? " a11y-radio2-roomy" : "") +
        (disabled ? " a11y-radio2-disabled" : "")
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
      <span className="a11y-radio2-text">
        <span className="a11y-radio2-label">{label}</span>
        {description && (
          <span className="a11y-radio2-desc">{description}</span>
        )}
      </span>
      {meta && <span className="a11y-radio2-meta">{meta}</span>}
    </label>
  );
}
