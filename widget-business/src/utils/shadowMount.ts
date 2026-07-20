import styles from "../styles.css?inline";

// Mounts into a Shadow DOM root instead of directly into the container so
// the host page's global CSS can never leak in, and the widget's own styles
// can never leak out onto the host page.
export function mountShadowRoot(container: HTMLElement): HTMLElement {
  const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  const styleEl = document.createElement("style");
  styleEl.textContent = styles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "a11y-widget-biz";
  shadowRoot.appendChild(mountPoint);

  return mountPoint;
}
