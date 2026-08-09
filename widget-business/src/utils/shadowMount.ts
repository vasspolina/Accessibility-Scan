// One stylesheet, currently empty. The visual layer was removed in full so the
// next one could be built without inheriting it; styles/global.css is where it
// goes, and it is inlined here rather than imported by a component because a
// plain import lands in document.head, which cannot reach inside the shadow
// boundary and does leak onto the host page.
//
// The shadow root itself is kept, and it is not a visual decision: it is what
// stops the HOST page's CSS reaching in. Without it the widget would not render
// as browser defaults, it would inherit whatever the embedding page sets — a
// different thing, and a useless baseline to rebuild from.

import globalStyles from "../styles/global.css?inline";

/**
 * Mounts into a Shadow DOM root so the host page's global CSS cannot leak in,
 * and this widget's cannot leak out.
 */
export function mountShadowRoot(container: HTMLElement): HTMLElement {
  const shadowRoot = container.shadowRoot ?? container.attachShadow({ mode: "open" });
  shadowRoot.innerHTML = "";

  const styleEl = document.createElement("style");
  styleEl.textContent = globalStyles;
  shadowRoot.appendChild(styleEl);

  const mountPoint = document.createElement("div");
  mountPoint.className = "a11y-widget-biz";
  shadowRoot.appendChild(mountPoint);

  return mountPoint;
}
