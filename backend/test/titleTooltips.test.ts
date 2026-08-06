import { describe, it, expect } from "vitest";
import { renderAndScan } from "../src/services/render/renderPage.js";

// The guards are the point. A title is a tooltip when the element already
// says who it is, and the element's accessible name when nothing else does —
// telling a page to remove the only name an element has would be worse than
// saying nothing.
const PAGE = `<!doctype html><html lang="en"><body><h1>t</h1>
  <a href="/a" title="Opens the pricing page">Pricing</a>
  <button title="Save your work">Save</button>
  <iframe src="about:blank" title="A video"></iframe>
  <button title="Close"></button>
  <span title="">Empty title</span>
</body></html>`;

describe("title tooltip detection", () => {
  it("counts tooltips and leaves accessible names alone", async () => {
    const d = (await renderAndScan("data:text/html," + encodeURIComponent(PAGE))).domSignals;
    // The link and the button that carry their own text: two tooltips.
    // The iframe (title is its name), the empty button (title is its only
    // name) and the empty title are all correctly ignored.
    expect(d.titleTooltips).toBe(2);
  }, 120000);
});
