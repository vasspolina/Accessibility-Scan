import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { mountShadowRoot } from "./utils/shadowMount";
import { setLang, detectLang } from "./lib/i18n";
import { typesetText } from "./lib/typography";

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
// declared once at document level. One face for everything (user's
// instruction, 24 Nov 2026, "use pp telegraph thin for all fonts"): PP
// Telegraf Ultralight, the family's thinnest cut (it has none named Thin),
// declared for the whole weight range 100–900 so any weight a rule or the
// browser asks for (a bold strong, a th) is drawn in it. Light, Regular,
// Saans and Serrif are no longer declared; their files stay on the server
// for the other pages. font-display swap keeps text readable while it
// loads, and every rule keeps a system fallback.
// The mono face is PP Lettra Mono (user's instruction, 25 Nov 2026, "use
// letra as mono font"), its Ultralight cut declared for every weight like
// Telegraf (the free package has only Ultralight and Medium upright), and
// its Medium cut from 500 up, for the principle groups' titles only (user's
// instruction, 25 Nov 2026, "also use letra medium mono") and the report's
// section titles; its Medium Italic, for every weight, sets the line under
// each section title (user's instruction, 25 Nov 2026). It is
// the first name in every mono stack in global.css, with the system mono
// behind it. Same free-for-personal-use licence as the Telegraf files.
// EB Garamond (SIL OFL, latin subset from @fontsource/eb-garamond 5, the
// licence beside the files) sets the centred callouts after the user's
// poster reference of 25 Nov 2026: one roman and one italic, each declared
// for every weight so the widget's 200 draws them without synthesis.
function injectFonts(apiBase: string) {
  const id = "a11y-widget-fonts";
  if (document.getElementById(id)) return;
  const base = apiBase.replace(/\/+$/, "");
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
@font-face {
  font-family: "PP Telegraf";
  src: url("${base}/fonts/PPTelegraf-Ultralight.otf") format("opentype");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "PP Lettra Mono";
  src: url("${base}/fonts/PPLettraMono-Ultralight.otf") format("opentype");
  font-weight: 100 499;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "PP Lettra Mono";
  src: url("${base}/fonts/PPLettraMono-Medium.otf") format("opentype");
  font-weight: 500 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "PP Lettra Mono";
  src: url("${base}/fonts/PPLettraMono-MediumItalic.otf") format("opentype");
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
}
@font-face {
  font-family: "EB Garamond";
  src: url("${base}/fonts/EBGaramond-latin-400-normal.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "EB Garamond";
  src: url("${base}/fonts/EBGaramond-latin-400-italic.woff2") format("woff2");
  font-weight: 100 900;
  font-style: italic;
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
  // Typesetting on the rendered text: no word of a sentence alone on a
  // line, and the French thin space drawn in the face.
  typesetText(mountPoint);
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
