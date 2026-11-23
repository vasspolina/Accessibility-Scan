/**
 * Every icon in the widget comes from one icon set (user's instruction,
 * 21 Nov 2026). The paths are copied from @carbon/icons 11 (Apache-2.0),
 * svg/32, so nothing is redrawn by hand; the package itself is not a
 * dependency because a dozen paths do not need a 30MB install.
 *
 * Icons are pictures beside words, so they are always hidden from assistive
 * technology: the word next to them is the name. One that stands alone
 * (the send arrow, the bin) sits in a button that carries its own name.
 * The default size is 1em, so an icon follows the text it sits in; fill is
 * currentColor, so it follows ink, hover and the dark theme.
 */
const PATHS = {
  add: ["M17 15 17 8 15 8 15 15 8 15 8 17 15 17 15 24 17 24 17 17 24 17 24 15z"],
  "arrow--up": ["M16 4 6 14 7.41 15.41 15 7.83 15 28 17 28 17 7.83 24.59 15.41 26 14 16 4z"],
  "arrow--left": ["M14 26 15.41 24.59 7.83 17 28 17 28 15 7.83 15 15.41 7.41 14 6 4 16 14 26z"],
  "arrow--right": ["M18 6 16.57 7.393 24.15 15 4 15 4 17 24.15 17 16.57 24.573 18 26 28 16 18 6z"],
  "caret--right": ["M12 8 22 16 12 24z"],
  "caret--down": ["M24 12 16 22 8 12z"],
  "chevron--down": ["M16 22 6 12 7.4 10.6 16 19.2 24.6 10.6 26 12z"],
  "chevron--right": ["M22 16 12 26 10.6 24.6 19.2 16 10.6 7.4 12 6z"],
  checkmark: ["M13 24 4 15 5.414 13.586 13 21.171 26.586 7.586 28 9 13 24z"],
  download: [
    "M26,24v4H6V24H4v4H4a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2h0V24Z",
    "M26 14 24.59 12.59 17 20.17 17 2 15 2 15 20.17 7.41 12.59 6 14 16 24 26 14z",
  ],
  flag: ["M6,30H4V2H28l-5.8,9L28,20H6ZM6,18H24.33L19.8,11l4.53-7H6Z"],
  information: [
    "M17 22 17 14 13 14 13 16 15 16 15 22 12 22 12 24 20 24 20 22 17 22z",
    "M16,8a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,8Z",
    "M16,30A14,14,0,1,1,30,16,14,14,0,0,1,16,30ZM16,4A12,12,0,1,0,28,16,12,12,0,0,0,16,4Z",
  ],
  launch: [
    "M26,28H6a2.0027,2.0027,0,0,1-2-2V6A2.0027,2.0027,0,0,1,6,4H16V6H6V26H26V16h2V26A2.0027,2.0027,0,0,1,26,28Z",
    "M20 2 20 4 26.586 4 18 12.586 19.414 14 28 5.414 28 12 30 12 30 2 20 2z",
  ],
  menu: ["M4 6H28V8H4z", "M4 24H28V26H4z", "M4 12H28V14H4z", "M4 18H28V20H4z"],
  "play--filled--alt": [
    "M7,28a1,1,0,0,1-1-1V5a1,1,0,0,1,1.4819-.8763l20,11a1,1,0,0,1,0,1.7525l-20,11A1.0005,1.0005,0,0,1,7,28Z",
  ],
  "stop--filled--alt": ["M24,6H8A2,2,0,0,0,6,8V24a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8a2,2,0,0,0-2-2Z"],
  translate: [
    "M27.85,29H30L24,14H21.65l-6,15H17.8l1.6-4h6.85ZM20.2,23l2.62-6.56L25.45,23Z",
    "M18,7V5H11V2H9V5H2V7H12.74a14.71,14.71,0,0,1-3.19,6.18A13.5,13.5,0,0,1,7.26,9H5.16a16.47,16.47,0,0,0,3,5.58A16.84,16.84,0,0,1,3,18l.75,1.86A18.47,18.47,0,0,0,9.53,16a16.92,16.92,0,0,0,5.76,3.84L16,18a14.48,14.48,0,0,1-5.12-3.37A17.64,17.64,0,0,0,14.8,7Z",
  ],
  "trash-can": [
    "M12 12H14V24H12z",
    "M18 12H20V24H18z",
    "M4,6V8H6V28a2,2,0,0,0,2,2H24a2,2,0,0,0,2-2V8h2V6ZM8,28V8H24V28Z",
    "M12 2H20V4H12z",
  ],
  warning: [
    "M16,2A14,14,0,1,0,30,16,14,14,0,0,0,16,2Zm0,26A12,12,0,1,1,28,16,12,12,0,0,1,16,28Z",
    "M15 8H17V19H15z",
    "M16,22a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,22Z",
  ],
  /* The marks alone, for an enamel pin (Pin.tsx), whose round body is the
     ring: these are the inner paths of Carbon's own `warning` and
     `information` above, without their circles, so no shape is drawn here. */
  "warning--marks": ["M15 8H17V19H15z", "M16,22a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,22Z"],
  "information--marks": [
    "M17 22 17 14 13 14 13 16 15 16 15 22 12 22 12 24 20 24 20 22 17 22z",
    "M16,8a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,8Z",
  ],
  "warning--alt": [
    "M16,23a1.5,1.5,0,1,0,1.5,1.5A1.5,1.5,0,0,0,16,23Z",
    "M15 12H17V21H15z",
    "M29,30H3a1,1,0,0,1-.8872-1.4614l13-25a1,1,0,0,1,1.7744,0l13,25A1,1,0,0,1,29,30ZM4.6507,28H27.3493l.002-.0033L16.002,6.1714h-.004L4.6487,27.9967Z",
  ],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  size = "1em",
  className,
  ...rest
}: {
  name: IconName;
  size?: number | string;
  className?: string;
} & Omit<React.SVGProps<SVGSVGElement>, "name" | "children">) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      className={className ? `a11y-icon ${className}` : "a11y-icon"}
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
