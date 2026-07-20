import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { mountShadowRoot } from "./utils/shadowMount";

export interface MountOptions {
  apiBase: string;
}

export function mount(target: string | HTMLElement, options: MountOptions) {
  const container = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;

  if (!container) {
    console.error(`[A11yWidgetBusiness] mount target not found: ${target}`);
    return;
  }

  if (!options?.apiBase) {
    console.error("[A11yWidgetBusiness] mount() requires { apiBase } pointing at your scanner backend");
    return;
  }

  const mountPoint = mountShadowRoot(container);
  const root = createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <App apiBase={options.apiBase} />
    </React.StrictMode>
  );
}

function autoInit() {
  // A thrown error here must never prevent the module's exports (i.e.
  // window.A11yWidgetBusiness.mount) from being assigned — the minified
  // IIFE bundle runs this call and the export assignment as part of the
  // same top-level statement, so an uncaught exception here would silently
  // wipe out the public API for the whole page.
  try {
    const el = document.getElementById("a11y-widget-business-root");
    if (el?.dataset.apiBase) {
      mount(el, { apiBase: el.dataset.apiBase });
    }
  } catch (err) {
    console.error("[A11yWidgetBusiness] auto-init failed:", err);
  }
}

// Rollup's IIFE build (see vite.config.ts `lib.name: "A11yWidgetBusiness"`)
// assigns window.A11yWidgetBusiness to this module's exports automatically —
// no manual `window.A11yWidgetBusiness = ...` assignment needed (and doing
// so here would just get overwritten by that auto-assignment anyway, since
// it runs after the module body executes).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoInit);
} else {
  autoInit();
}
