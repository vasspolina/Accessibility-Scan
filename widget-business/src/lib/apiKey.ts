/**
 * The account key, kept in this browser.
 *
 * With it, a scan is saved to the server's history and the open questions
 * can be answered. Without it nothing changes — anonymous scanning is the
 * default and always will be. Stored in localStorage rather than a cookie so
 * it never travels to any page but the one the person typed it into; the
 * shadow root's origin is the host page's, which is why the storage key is
 * namespaced.
 */
const KEY = "a11y-scan-api-key";
const NAME = "a11y-scan-decided-by";

function read(k: string): string {
  try {
    return window.localStorage.getItem(k) ?? "";
  } catch {
    return "";
  }
}

function write(k: string, v: string): void {
  try {
    if (v) window.localStorage.setItem(k, v);
    else window.localStorage.removeItem(k);
  } catch {
    // Storage blocked: the key lives for this page load only.
  }
}

export const getApiKey = () => read(KEY);
export const setApiKey = (v: string) => write(KEY, v.trim());
export const clearApiKey = () => write(KEY, "");

/** The name a person signs verdicts with, remembered between answers. */
export const getDecidedBy = () => read(NAME);
export const setDecidedBy = (v: string) => write(NAME, v.trim());

/** A key's shape, so a paste of the wrong thing is caught before a request. */
export const looksLikeKey = (v: string) => /^ascan_[0-9a-f]{64}$/.test(v.trim());
