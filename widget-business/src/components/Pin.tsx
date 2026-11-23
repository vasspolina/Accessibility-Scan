import { Icon, type IconName } from "./Icon";

/**
 * An enamel pin: a round, leaning body in one of the plate colours, with a
 * black plated line and a silver rim (user's instruction, 23 Nov 2026, "add
 * this pins for some badges when it makes sense", "like for warning icon on
 * this bubble", with a photo of enamel pins as the reference).
 *
 * It holds either one serif letter ("use serif font exclamation": the "!"
 * and "i" of a notice, the user's exception to "no glyph used as an icon")
 * or one Carbon icon in black. It stands in for an icon, never for words:
 * it is always aria-hidden, and whatever it sits beside must say the same
 * thing in text. The body is drawn in CSS (`ENAMEL PINS` in global.css).
 */
export type PinTone = "yellow" | "pink" | "sky" | "mint";

export type PinMark = { glyph: string } | { icon: IconName };

export function Pin({ tone, mark, className }: { tone: PinTone; mark: PinMark; className?: string }) {
  return (
    <span className={`a11y-pin a11y-pin-${tone}${className ? ` ${className}` : ""}`} aria-hidden="true">
      {"glyph" in mark ? <span className="a11y-pin-glyph">{mark.glyph}</span> : <Icon name={mark.icon} />}
    </span>
  );
}
