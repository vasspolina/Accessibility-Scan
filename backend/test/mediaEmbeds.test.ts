import { describe, it, expect } from "vitest";
import { renderAndScan } from "../src/services/render/renderPage.js";

// The named-provider list missed every broadcaster running its own player, so
// a fallback keys on the permissions an iframe asks for instead of its URL.
// This guards the discriminator: a player asks for fullscreen or autoplay, and
// the embeds that would otherwise be swept up — maps, posts — ask for neither.
// A map reported as an uncaptioned video is worse than a video being missed.
const PAGE = `<!doctype html><html lang="en"><body><h1>t</h1>
<iframe id="player" src="https://player.example.com/vid/1" allow="autoplay; fullscreen"></iframe>
<iframe id="legacy" src="https://media.example.com/p/2" allowfullscreen></iframe>
<iframe id="map" src="https://maps.example.com/maps/embed?q=x"></iframe>
<iframe id="post" src="https://social.example.com/embed/status/3"></iframe>
</body></html>`;

describe("media embed detection", () => {
  it("finds self-hosted players and leaves maps and posts alone", async () => {
    const d = (await renderAndScan("data:text/html," + encodeURIComponent(PAGE))).domSignals;
    const found = d.mediaEmbeds.map((e) => e.selector).join(" ");
    expect(found).toMatch(/player/);
    expect(found).toMatch(/legacy/);
    expect(found).not.toMatch(/map/);
    expect(found).not.toMatch(/post/);
  }, 120000);
});
