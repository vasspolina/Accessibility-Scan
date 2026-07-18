import dns from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0", "::1"]);

function isPrivateOrReservedIp(ip: string): boolean {
  const type = net.isIP(ip);

  if (type === 4) {
    const octets = ip.split(".").map(Number);
    const [a, b] = octets;
    if (a === 127) return true; // loopback
    if (a === 10) return true; // RFC1918
    if (a === 172 && b >= 16 && b <= 31) return true; // RFC1918
    if (a === 192 && b === 168) return true; // RFC1918
    if (a === 169 && b === 254) return true; // link-local
    if (a === 0) return true; // "this network"
    return false;
  }

  if (type === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized.startsWith("fe80:")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
    if (normalized.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 — re-check the embedded IPv4 address
      const mapped = normalized.replace("::ffff:", "");
      if (net.isIP(mapped) === 4) return isPrivateOrReservedIp(mapped);
    }
    return false;
  }

  return true; // not a parseable IP — treat as unsafe
}

/**
 * Validates a user-submitted URL before it's ever passed to Playwright's
 * page.goto(). This endpoint is public-facing, so without this check it
 * becomes an SSRF proxy into whatever network the backend is hosted on.
 * Resolves DNS to catch hostnames that point at internal IPs (not just
 * literal IP addresses in the URL).
 */
export async function assertSafeUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeUrlError("This host is not allowed");
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new UnsafeUrlError("This host is not allowed");
    }
    return parsed;
  }

  let addresses: string[];
  try {
    const results = await dns.lookup(hostname, { all: true });
    addresses = results.map((r) => r.address);
  } catch {
    throw new UnsafeUrlError("Could not resolve host");
  }

  if (addresses.length === 0 || addresses.some(isPrivateOrReservedIp)) {
    throw new UnsafeUrlError("This host is not allowed");
  }

  return parsed;
}
