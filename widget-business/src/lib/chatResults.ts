import type { AccessibilityReport, SiteAudit } from "../api/scanClient";

// The scan result each saved conversation was about (user's report, 18 Nov
// 2026: "it doesn't keep records properly"). The archive in chatArchive.ts
// kept only the words, so a conversation reopened after a reload, or after
// another conversation had scanned a different site, came back with its
// Score and Findings folded to "From an earlier scan", and the assistant had
// forgotten what it had been talking about.
//
// The result is not kept beside the words in localStorage: a report carries
// base64 thumbnails, often hundreds of kilobytes, and the ~5MB quota is
// shared with the scan history and the archive itself. IndexedDB holds it
// instead, one record per conversation, keyed by the conversation's id. Where
// IndexedDB is missing or refuses (private modes, some embedded browsers) a
// map in memory keeps this session's results, so switching between
// conversations still works until the page is closed.
//
// Same reasoning as scanHistory.ts for keeping it in the browser: anyone can
// use this widget on any address, and a server-side store would let one
// visitor read another's results. Only results the conversation already had
// on screen are stored, never a scan made behind a login: those describe
// private pages and recordScan() refuses them for the same reason.

export type ChatResult = { kind: "report"; report: AccessibilityReport } | { kind: "audit"; audit: SiteAudit };

const DB_NAME = "a11y-chat-results";
const STORE = "results";

const memory = new Map<string, ChatResult>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const req = body(db.transaction(STORE, mode).objectStore(STORE));
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      })
  );
}

/** The key that ties a result to the turns that show it (ScanChat's
 *  resultKeyOf). */
export function keyOfResult(result: ChatResult): string {
  return result.kind === "report" ? result.report.scannedAt : result.audit.scannedAt;
}

/** Whether the conversation is about the result on screen: it scanned it,
 *  shows a block of it, or handed it to the assistant with a question. */
export function chatUsesResult(
  turns: ReadonlyArray<{ who: string; resultKey?: string }>,
  sharedKey: string | null,
  currentKey: string | null
): boolean {
  if (!currentKey) return false;
  return sharedKey === currentKey || turns.some((x) => (x.who === "scan" || x.who === "block") && x.resultKey === currentKey);
}

export async function putChatResult(chatId: string, result: ChatResult): Promise<void> {
  memory.set(chatId, result);
  await run("readwrite", (s) => s.put(result, chatId));
}

export async function getChatResult(chatId: string): Promise<ChatResult | null> {
  const stored = await run<ChatResult | undefined>("readonly", (s) => s.get(chatId));
  return stored ?? memory.get(chatId) ?? null;
}

export async function deleteChatResult(chatId: string): Promise<void> {
  memory.delete(chatId);
  await run("readwrite", (s) => s.delete(chatId));
}

/** Drops the results of conversations the archive no longer lists: the
 *  oldest fall off at its cap, and another tab may have deleted some. */
export async function pruneChatResults(keep: ReadonlySet<string>): Promise<void> {
  for (const id of [...memory.keys()]) if (!keep.has(id)) memory.delete(id);
  const keys = await run<IDBValidKey[]>("readonly", (s) => s.getAllKeys());
  for (const key of keys ?? []) if (typeof key === "string" && !keep.has(key)) await run("readwrite", (s) => s.delete(key));
}
