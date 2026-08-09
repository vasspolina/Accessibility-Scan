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
  /* Plans shown as a bar above the report. Entirely the embedder's: every
     name, price and link comes from here, and no plans means no bar. The
     widget never supplies a default, because a default price would be a
     figure invented on somebody else's site. */
  plans?: Array<{ name: string; price: string; href: string; featured?: boolean; note?: string }>;
}

// @font-face is IGNORED inside a shadow-root stylesheet, so the faces are
// declared once at document level. The design system's PP Telegraf, served
// beside the widget bundle; only 400 and 500 exist. font-display swap keeps
// text readable while it loads, and every rule keeps a system fallback.
function parsePlans(raw: string | undefined): MountOptions["plans"] {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    // Every field the bar renders must actually be there. A plan missing
    // its price or its link renders as a button that says nothing and goes
    // nowhere, so it is dropped rather than shown half-built.
    const plans = parsed.filter(
      (p) =>
        p && typeof p.name === "string" && typeof p.price === "string" && typeof p.href === "string"
    );
    return plans.length > 0 ? plans : undefined;
  } catch {
    return undefined;
  }
}

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

  injectFonts(options.apiBase);

  if (!options?.apiBase) {
    console.error("[A11yWidgetBusiness] mount() requires { apiBase } pointing at your scanner backend");
    return;
  }

  const mountPoint = mountShadowRoot(container);
  const root = createRoot(mountPoint);
  root.render(
    <React.StrictMode>
      <App apiBase={options.apiBase} cta={options.cta} plans={options.plans} />
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
      const { ctaText, ctaHref, plans } = el.dataset;
      mount(el, {
        apiBase: el.dataset.apiBase,
        cta: ctaText && ctaHref ? { text: ctaText, href: ctaHref } : undefined,
        // data-plans holds JSON. Parsed defensively and dropped entirely on
        // anything malformed: a broken attribute must not take the report
        // down with it, and a half-parsed price is worse than no bar.
        plans: parsePlans(plans),
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
