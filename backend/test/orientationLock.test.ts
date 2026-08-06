import { describe, it, expect } from "vitest";
import { renderAndScan } from "../src/services/render/renderPage.js";

// Detected from the stylesheet, so it is tested through a real render — the
// query has to be parsed by a real CSSOM to be found at all.
//
// The second page is the guard that matters: an orientation media query is
// the normal way to adjust a layout, and most of them are good practice.
// Only a body that rotates the page back or hides it counts as a lock.
const LOCKED = `<!doctype html><html lang="en"><head><style>
  @media (orientation: portrait) { body { transform: rotate(90deg); } }
</style></head><body><h1>t</h1></body></html>`;

const ADJUSTS = `<!doctype html><html lang="en"><head><style>
  @media (orientation: landscape) { .grid { grid-template-columns: 1fr 1fr; } }
</style></head><body><h1>t</h1><div class="grid"></div></body></html>`;

describe("orientation lock detection", () => {
  it("flags a stylesheet that rotates the page back", async () => {
    const d = (await renderAndScan("data:text/html," + encodeURIComponent(LOCKED))).domSignals;
    expect(d.orientationLock).toBe(true);
  }, 120000);

  it("leaves an ordinary responsive orientation query alone", async () => {
    const d = (await renderAndScan("data:text/html," + encodeURIComponent(ADJUSTS))).domSignals;
    expect(d.orientationLock).toBe(false);
  }, 120000);
});
