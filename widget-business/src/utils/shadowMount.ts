// The design system, then the app. Order is the migration: everything the
// system specifies (tokens, base, its own components) is the floor, and
// styles.css sits on top carrying what is still only defined there — this
// app's own layout, which no design system describes.
//
// Sections are being deleted from styles.css one at a time as the floor
// takes over. While a section still exists in both, the app file wins by
// source order, so every step of the migration is a no-op until the old
// rules are actually removed. That is the point: nothing breaks halfway.
import systemStyles from "../styles.system.css?inline";
import styles from "../styles.css?inline";

// Mounts into a Shadow DOM root instead of directly into the container so
// the host page's global CSS can never leak in, and the widget's own styles
// can never leak out onto the host page.
export function mountShadowRoot(container: HTMLElement): HTMLElement {
  const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  const styleEl = document.createElement("style");
  styleEl.textContent = systemStyles + "\n" + styles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "a11y-widget-biz";
  shadowRoot.appendChild(mountPoint);

  return mountPoint;
}
