// Tokens only, for now.
//
// The UI kit's screens are being ported one at a time, and each one's var()
// calls are rewritten from the design system's older names to Foundations v2 as
// it lands — no alias layer, so v2 stays the only vocabulary in the tree.
// Tokens have to exist for that to mean anything; component stylesheets come
// back as each screen is ported.
//
// What used to load here was four files in a deliberate order — tokens, then
// the 7,988-line legacy sheet as the floor, then a system base, then the ported
// components on top. Two of those are gone for good: styles.css and
// styles.system.css were deleted, not emptied, and they are not coming back.
//
// That leaves exactly what the design system itself ships. Worth being precise
// about what that is, because it is less than it sounds: the design project's
// own styles.css is six @import lines and no rules at all — a token gatherer.
// The system is TOKENS PLUS COMPONENTS. It has no global base sheet, so there
// is none to adopt, and anything this app needs beyond a component's own
// stylesheet has nowhere to live but that component.
//
// Order still matters, but only two layers deep now:
//   tokens          every component resolves its colours and spacing here
//   componentStyles the ported components, gathered by styles/components.css
//
// Tokens are Foundations v2 rather than the project's tokens/*.css. Those two
// disagree on names — v2 says --surface-sunken and --content-primary where the
// older files say --layer-01 and --text-primary — and every ported component
// is written against v2, which is the target set for this migration.
//
// Not styles, and so not loaded here: inline style={{…}} props in 8 components,
// SVG presentation attributes (ScoreDial's meter), and index.html's <head>
// styles, which belong to the demo host page.
import tokens from "../styles/tokens.css?inline";
import componentStyles from "../styles/components.css?inline";

/**
 * Mounts into a Shadow DOM root so the host page's global CSS cannot leak in,
 * and this widget's cannot leak out.
 */
export function mountShadowRoot(container: HTMLElement): HTMLElement {
  const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  const styleEl = document.createElement("style");
  styleEl.textContent = [tokens, componentStyles].join("\n");
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "a11y-widget-biz";
  shadowRoot.appendChild(mountPoint);

  return mountPoint;
}
