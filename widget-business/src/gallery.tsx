import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mountShadowRoot } from "./utils/shadowMount";
import { Gallery } from "./gallery/Gallery";

/**
 * Dev-only entry for /gallery.html. Nothing in the widget imports this, so it
 * contributes nothing to the shipped bundle.
 *
 * It mounts through the app's own mountShadowRoot so the gallery sees exactly
 * the stylesheets the widget sees, in exactly the same order — tokens, legacy,
 * system, components. A gallery that assembled its own CSS would be able to
 * show a component looking right while the app showed it looking wrong, which
 * would make it worse than useless.
 */
const host = document.getElementById("gallery-root");
if (!host) throw new Error("#gallery-root missing from gallery.html");

const mountPoint = mountShadowRoot(host);

createRoot(mountPoint).render(
  <StrictMode>
    <Gallery />
  </StrictMode>
);
