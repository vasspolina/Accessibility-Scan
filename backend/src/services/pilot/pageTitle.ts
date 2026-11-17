import { assertSafeUrl } from "../../middleware/ssrfGuard.js";

/**
 * The title of the page a pilot participant pasted, so the form can show
 * "Page: Checkout – Example Shop" under the address and the model can name
 * the page in its draft. It saves the participant describing which page
 * they mean.
 *
 * This fetches a URL a caller typed, so it is built as narrowly as the
 * scan's own guard allows: every hop goes through assertSafeUrl (redirects
 * are followed by hand, at most MAX_REDIRECTS, each one checked, so a public
 * address cannot bounce the request to an internal one); the body is read
 * up to MAX_BYTES and only the title comes back, never the page. The route
 * that calls this also needs a pilot code. A DNS answer that changes between
 * the check and the fetch is not covered, which is the same limit the scan
 * accepts; the reward here is a page title, capped at 200 characters.
 *
 * Never throws. No title, for any reason, is null and the form carries on.
 */

const MAX_REDIRECTS = 3;
const MAX_BYTES = 256 * 1024;
const TIMEOUT_MS = 6_000;

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** The page's title from its HTML: <title>, else og:title. */
export function extractTitle(html: string): string | null {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const og =
    html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:title["']/i)?.[1];
  const raw = (t && t.trim()) || og;
  if (!raw) return null;
  const clean = decodeEntities(raw).replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 200) : null;
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

export async function lookupPageTitle(rawUrl: string): Promise<string | null> {
  try {
    let url = (await assertSafeUrl(rawUrl)).toString();
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: "manual",
        signal,
        headers: { Accept: "text/html", "User-Agent": "AccessibleScanPilot/1.0 (page title lookup)" },
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return null;
        url = (await assertSafeUrl(new URL(next, url).toString())).toString();
        continue;
      }
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("html")) return null;
      return extractTitle(await readCapped(res));
    }
    return null;
  } catch {
    return null;
  }
}
