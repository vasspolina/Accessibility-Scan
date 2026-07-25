import type { AccessibilityReport } from "../api/scanClient";

// Keeps a record of previous scans so an owner can see whether the work they
// did actually moved anything. A single score is a verdict; a score with last
// month's beside it is progress, and progress is what gets the next fix done.
//
// Stored in the browser, not on the server, and that is a deliberate choice
// rather than a shortcut:
//
//   - Anyone can scan any URL through this widget. Server-side history keyed
//     by URL would let one visitor read another's scan activity, including a
//     competitor's. That is a real leak, not a hypothetical one.
//   - Scans behind a login are never recorded at all. Their findings describe
//     private pages, and those have no business persisting anywhere.
//   - It survives redeploys. Server-side SQLite would need a mounted volume;
//     without one the history is wiped every time the service restarts, which
//     is worse than having none.
//
// The trade-off is honest and worth stating: history lives on one browser. It
// does not follow the owner to another device, and clearing site data clears
// it. Cross-device or team history needs accounts and a server, which is a
// different product.

const STORAGE_KEY = "a11y-scan-history-v1";
// Enough to show a trend without letting one busy site fill the quota.
const MAX_ENTRIES_PER_URL = 20;
const MAX_URLS = 30;

export interface HistoryEntry {
  url: string;
  scannedAt: string;
  score: number;
  // Kept for the trend line and the "what changed" comparison. Deliberately
  // not the whole report: those carry base64 screenshots and would blow the
  // ~5MB localStorage budget after a handful of scans.
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  conformanceFailed: number;
  // Rule ids present in this scan, which is what makes a meaningful diff
  // possible: descriptions embed per-page counts and change between runs.
  ruleIds: string[];
}

type HistoryStore = Record<string, HistoryEntry[]>;

// "https://example.com/about/" and "https://example.com/about" are the same
// page for history purposes, the same normalisation the crawler uses.
export function historyKey(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    if (u.pathname.length > 1) u.pathname = u.pathname.replace(/\/+$/, "");
    return u.toString();
  } catch {
    return url;
  }
}

function readStore(): HistoryStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as HistoryStore;
  } catch {
    // Private browsing, a disabled store, or corrupt JSON. History is a nice
    // extra, so it fails silently rather than breaking the report.
    return {};
  }
}

function writeStore(store: HistoryStore): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota exceeded or storage unavailable. Nothing to do, and nothing worth
    // interrupting the report for.
  }
}

/**
 * Turns a finished report into the compact shape kept in history.
 * Pure, so the shape can be checked without a browser.
 */
export function toHistoryEntry(report: AccessibilityReport): HistoryEntry {
  const ruleIds = [
    ...new Set(
      report.findings
        .filter((f) => f.category === "accessibility" && f.ruleId)
        .map((f) => f.ruleId as string)
    ),
  ].sort();
  return {
    url: historyKey(report.url),
    scannedAt: report.scannedAt,
    score: report.score,
    critical: report.summary.critical,
    serious: report.summary.serious,
    moderate: report.summary.moderate,
    minor: report.summary.minor,
    conformanceFailed: report.conformance?.failed ?? 0,
    ruleIds,
  };
}

/**
 * Records a scan. Authenticated scans are deliberately never recorded — see
 * the note at the top of this file.
 */
export function recordScan(report: AccessibilityReport, wasAuthenticated: boolean): void {
  if (wasAuthenticated) return;

  const store = readStore();
  const key = historyKey(report.url);
  const entry = toHistoryEntry(report);

  const existing = store[key] ?? [];
  // Newest first, capped.
  store[key] = [entry, ...existing].slice(0, MAX_ENTRIES_PER_URL);

  // Keep the store bounded overall: drop whichever URLs were scanned least
  // recently once there are too many.
  const keys = Object.keys(store);
  if (keys.length > MAX_URLS) {
    const byRecency = keys.sort(
      (a, b) =>
        new Date(store[b][0]?.scannedAt ?? 0).getTime() -
        new Date(store[a][0]?.scannedAt ?? 0).getTime()
    );
    const trimmed: HistoryStore = {};
    for (const k of byRecency.slice(0, MAX_URLS)) trimmed[k] = store[k];
    writeStore(trimmed);
    return;
  }

  writeStore(store);
}

/** Previous scans for a URL, newest first. Excludes the scan just run. */
export function getHistory(url: string, excludeScannedAt?: string): HistoryEntry[] {
  const all = readStore()[historyKey(url)] ?? [];
  return excludeScannedAt ? all.filter((e) => e.scannedAt !== excludeScannedAt) : all;
}

export interface ScanDiff {
  scoreChange: number;
  // Rules present before and gone now. The satisfying column.
  fixed: string[];
  // Rules that weren't there last time.
  appeared: string[];
  // Present in both.
  unchanged: string[];
}

/**
 * Compares two scans by rule id.
 *
 * Rule id rather than finding text, because descriptions embed per-page counts
 * and element names that shift between runs — comparing those would report
 * everything as changed every time.
 *
 * Pure and deterministic.
 */
export function diffScans(previous: HistoryEntry, current: HistoryEntry): ScanDiff {
  const before = new Set(previous.ruleIds);
  const after = new Set(current.ruleIds);
  return {
    scoreChange: current.score - previous.score,
    fixed: [...before].filter((r) => !after.has(r)).sort(),
    appeared: [...after].filter((r) => !before.has(r)).sort(),
    unchanged: [...after].filter((r) => before.has(r)).sort(),
  };
}

/** Wipes all stored history. Offered in the UI so it's the owner's to delete. */
export function clearHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
