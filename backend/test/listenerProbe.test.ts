import { describe, it, expect } from "vitest";
import { withPage } from "../src/services/render/browserPool.js";

// The probe is the one piece of this that cannot be unit-tested: it is a
// string injected into a page before any of its scripts run, and its whole
// job is to observe something that leaves no other trace. So it is exercised
// against a real browser and a page whose listeners are known.
//
// The button matters as much as the div: it registers mousedown AND mouseup,
// and a probe that flagged it would report pointer-cancellation on every
// well-built control on the web.
describe("listener probe (real browser)", () => {
  it("records motion, global keys, and press-without-release", async () => {
    const signals = await withPage(async (page) => {
      await page.setContent(`<!doctype html><html><body>
        <button id="ok">release handled</button>
        <div id="bad">press only</div>
        <script>
          window.addEventListener('devicemotion', () => {});
          document.addEventListener('keydown', () => {});
          const ok = document.getElementById('ok');
          ok.addEventListener('mousedown', () => {});
          ok.addEventListener('mouseup', () => {});
          document.getElementById('bad').addEventListener('pointerdown', () => {});
        </script></body></html>`);
      return page.evaluate(() => {
        const p = (window as any).__a11yListeners;
        return {
          motion: Boolean(p?.globals.devicemotion),
          keyboardGlobal: Boolean(p?.globals.keydown),
          pressOnly: (p?.pointerTargets ?? [])
            .filter((e: any) => e.down && !e.up)
            .map((e: any) => e.el.id),
        };
      });
    }, 30000);
    expect(signals.motion).toBe(true);
    expect(signals.keyboardGlobal).toBe(true);
    expect(signals.pressOnly).toEqual(["bad"]);
  }, 60000);
});
