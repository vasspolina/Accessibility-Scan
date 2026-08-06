import { describe, it, expect } from "vitest";
import { renderAndScan } from "../src/services/render/renderPage.js";

// charset=utf-8 is not optional here: without it the browser decodes a
// data: URL as Latin-1 and the Cyrillic arrives as mojibake, which is
// Latin script and finds nothing. The first run of this test failed for
// exactly that reason.

// The guards matter more than the detection. A brand name, a quoted word or
// a stray glyph in another script is not a passage, and a passage that is
// already declared is the page doing the right thing.
const PAGE = `<!doctype html><html lang="en"><body>
  <h1>An English page</h1>
  <p>Это довольно длинный русский абзац без пометки языка.</p>
  <p lang="ru">Этот абзац уже помечен как русский, всё хорошо.</p>
  <p>An English sentence mentioning Ленин once in passing.</p>
  <p>Короткий</p>
</body></html>`;

describe("unmarked language detection", () => {
  it("finds the undeclared passage and leaves the rest alone", async () => {
    const d = (await renderAndScan("data:text/html;charset=utf-8," + encodeURIComponent(PAGE))).domSignals;
    // Only the first paragraph: the second declares its language, the third
    // is mostly Latin, and the fourth is too short to be a passage.
    expect(d.unmarkedScripts).toBe(1);
  }, 120000);

  it("says nothing when the page declares no language of its own", async () => {
    const d = (await renderAndScan(
      "data:text/html;charset=utf-8," + encodeURIComponent('<!doctype html><html><body><p>Это русский текст без языка страницы.</p></body></html>')
    )).domSignals;
    expect(d.unmarkedScripts).toBe(0);
  }, 120000);
});
