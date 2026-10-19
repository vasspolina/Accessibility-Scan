import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { mountShadowRoot } from "./utils/shadowMount";
import { setLang, detectLang } from "./lib/i18n";
import { keepShortWordsAttached } from "./lib/typography";

export interface MountOptions {
  apiBase: string;
  // Report language: "en", "de", "es" or "fr". Absent means the visitor's
  // browser language, falling back to English. Content the backend writes
  // per scan (finding descriptions) stays in English for now; everything
  // the widget itself says follows this.
  language?: string;
  /* "dark" or "light" pins the theme; absent follows the visitor's system
     setting. An embedder whose page is dark can say so rather than hoping
     the visitor's OS agrees with their design. */
  theme?: "dark" | "light";
  // Optional call-to-action rendered at the end of a business-mode report —
  // both text and link come from the embedder, so the offer is theirs, not
  // ours. Absent means no block at all: the public demo carries none.
  cta?: { text: string; href: string };
}

// @font-face is IGNORED inside a shadow-root stylesheet, so the face is
// declared once at document level. Jokker VF (trial), served beside the
// widget bundle: one variable file whose wght axis (100–900) covers the
// 300 / 400 / 500 the stylesheet asks for, so no weight is synthesised.
// font-display swap keeps text readable while it loads, and every rule
// keeps a system fallback.
function injectFonts(apiBase: string) {
  const id = "a11y-widget-fonts";
  if (document.getElementById(id)) return;
  const base = apiBase.replace(/\/+$/, "");
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
@font-face {
  font-family: "Jokker";
  src: url("${base}/fonts/JokkerVF-TRIAL.woff2") format("woff2");
  font-weight: 100 900;
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

  injectFonts(options.apiBase);

  if (!options?.apiBase) {
    console.error("[A11yWidgetBusiness] mount() requires { apiBase } pointing at your scanner backend");
    return;
  }

  setLang(detectLang(options.language));

  const mountPoint = mountShadowRoot(container);
  /* Stamped on the mount point, which is where the token blocks are scoped.
     Nothing is stamped when the embedder says nothing — that is the state
     prefers-color-scheme answers, and stamping a default would override the
     visitor's own system setting. */
  if (options.theme === "dark" || options.theme === "light") {
    mountPoint.dataset.theme = options.theme;
  }
  const root = createRoot(mountPoint);
  // Typesetting rule: no one- or two-letter word left at a line's end.
  keepShortWordsAttached(mountPoint);
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
        language: el.dataset.language,
        theme: el.dataset.theme === "dark" || el.dataset.theme === "light" ? el.dataset.theme : undefined,
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
