import { Icon, type IconName } from "./Icon";

/**
 * An enamel pin: a round, leaning body in one of the plate colours, with a
 * black plated line, a silver rim and a shadow on the page, holding one
 * Carbon icon in black (user's instruction, 23 Nov 2026, "add this pins for
 * some badges when it makes sense", "like for warning icon on this bubble",
 * with a photo of enamel pins as the reference).
 *
 * It stands in for an icon, never for words: it is always aria-hidden, and
 * whatever it sits beside must say the same thing in text. The body is drawn
 * in CSS (`ENAMEL PINS` in global.css); the marks come from the one icon set,
 * so nothing here is drawn by hand.
 */
export type PinTone = "yellow" | "pink" | "sky" | "mint";

export function Pin({ tone, icon, className }: { tone: PinTone; icon: IconName; className?: string }) {
  return (
    <span className={`a11y-pin a11y-pin-${tone}${className ? ` ${className}` : ""}`} aria-hidden="true">
      <Icon name={icon} />
    </span>
  );
}
