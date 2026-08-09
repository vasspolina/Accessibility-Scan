import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mountShadowRoot } from "./utils/shadowMount";
import { Gallery } from "./gallery/Gallery";
// The page chrome, inlined rather than imported for its side effect: Vite
// would put a plain import into document.head, which cannot reach inside the
// shadow boundary. Same constraint the components live under — see the note
// in src/styles/components.css.
import galleryStyles from "./gallery/gallery.css?inline";

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

const style = document.createElement("style");
style.textContent = galleryStyles;
mountPoint.getRootNode().appendChild(style);

createRoot(mountPoint).render(
  <StrictMode>
    <Gallery />
  </StrictMode>
);
