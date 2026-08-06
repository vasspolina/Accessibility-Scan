import { describe, it, expect } from "vitest";
import { renderAndScan } from "../src/services/render/renderPage.js";

const PAGE = `<!doctype html><html lang="en"><body><h1>t</h1>
<form action="/a"><select id="autosub"><option>x</option><option>y</option></select></form>
<form action="/b"><select id="filter"><option>x</option></select><button type="submit">Go</button></form>
<form action="/c"><select id="inline" onchange="this.form.submit()"><option>x</option></select></form>
<script>
  document.getElementById('autosub').addEventListener('change', () => {});
  document.getElementById('filter').addEventListener('change', () => {});
</script></body></html>`;

// The detection runs inside renderPage's page-evaluate, so it cannot be
// reached by a unit test — this drives the real renderer against a real
// browser instead. Worth the four seconds: the guard being tested is the one
// that decides whether this check is useful or noise.
//
// #filter is the case that matters. It is an ordinary filter dropdown with a
// change listener and a submit button beside it, which is how most of the web
// is built. A version of this check without the submit-button guard flagged
// every one of them, which would have put a row on nearly every site scanned
// and taught the reader to skip the section.
describe("actsOnChange detection", () => {
  it("flags auto-submit shapes and leaves an ordinary filter alone", async () => {
    const r = await renderAndScan("data:text/html," + encodeURIComponent(PAGE));
    const found = r.domSignals.listeners.actsOnChange.join(" ");
    expect(found).toMatch(/autosub/);
    expect(found).toMatch(/inline/);
    expect(found).not.toMatch(/filter/);
  }, 120000);
});
