// The design system, then the app. Order is the migration: everything the
// system specifies (tokens, base, its own components) is the floor, and
// styles.css sits on top carrying what is still only defined there — this
// app's own layout, which no design system describes.
//
// Sections are being deleted from styles.css one at a time as the floor
// takes over. While a section still exists in both, the app file wins by
// source order, so every step of the migration is a no-op until the old
// rules are actually removed. That is the point: nothing breaks halfway.
// Foundations v2 tokens first: every ported component resolves against them,
// so they have to exist before any component rule is read.
import tokens from "../styles/tokens.css?inline";
// Then the ported components, gathered by that file — see the note in it for
// why a component cannot import its own stylesheet here.
import componentStyles from "../styles/components.css?inline";
import systemStyles from "../styles.system.css?inline";
import styles from "../styles.css?inline";

// Mounts into a Shadow DOM root instead of directly into the container so
// the host page's global CSS can never leak in, and the widget's own styles
// can never leak out onto the host page.
export function mountShadowRoot(container: HTMLElement): HTMLElement {
  const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  const styleEl = document.createElement("style");
  // Order is the migration, and it just flipped.
  //
  // Until now the legacy sheet loaded LAST, so it outranked every ported
  // component and the new design was invisible on the page — six components
  // ported and the app still looked unchanged, because styles.css won every
  // tie by source order.
  //
  // Now the legacy sheet is the floor and the ported components sit on top.
  // Anything already ported wins; anything not yet ported still gets its old
  // rules, so nothing is unstyled. That is the whole point of a strangler —
  // the old file keeps the lights on while it empties out.
  styleEl.textContent = [tokens, styles, systemStyles, componentStyles].join("\n");
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "a11y-widget-biz";
  shadowRoot.appendChild(mountPoint);

  return mountPoint;
}
