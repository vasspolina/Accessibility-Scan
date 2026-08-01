import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { mountShadowRoot } from "./utils/shadowMount";

export interface MountOptions {
  apiBase: string;
  // Optional call-to-action rendered at the end of a business-mode report —
  // both text and link come from the embedder, so the offer is theirs, not
  // ours. Absent means no block at all: the public demo carries none.
  cta?: { text: string; href: string };
}

// @font-face is ignored inside shadow-root stylesheets, so the faces are
// declared once at document level — same route PrintButton takes for its
// one host-page rule. The design system's PP Telegraf, served alongside the
// widget bundle; font-display swap keeps text readable while it loads, and
// every rule keeps a full system-font fallback stack.
function injectFonts(apiBase: string) {
  const id = "a11y-widget-fonts";
  if (document.getElementById(id)) return;
  const base = apiBase.replace(/\/+$/, "");
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
@font-face {
  font-family: "PP Telegraf";
  src: url("${base}/fonts/PPTelegraf-Regular.otf") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "PP Telegraf";
  src: url("${base}/fonts/PPTelegraf-Medium.otf") format("opentype");
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}`;
  document.head.appendChild(style);
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

  injectFonts(options.apiBase);
  const mountPoint = mountShadowRoot(container);
  const root = createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <App apiBase={options.apiBase} cta={options.cta} />
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
      const { ctaText, ctaHref } = el.dataset;
      mount(el, {
        apiBase: el.dataset.apiBase,
        cta: ctaText && ctaHref ? { text: ctaText, href: ctaHref } : undefined,
      });
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
