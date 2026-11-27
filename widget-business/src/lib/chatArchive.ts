import type { ChatMessage } from "../api/chatClient";

// The conversations panel (user's instruction, 18 Nov 2026: "add this panel
// on the left"): past conversations,
// newest first, each named by its first question, and a way to start a new
// one.
//
// Kept in this browser only, for the reasons scanHistory.ts gives: anyone can
// use this widget on any address, so a server-side list would let one visitor
// read another's questions. The trade-off is the same too: the list does not
// follow the reader to another device, and clearing site data clears it.
//
// What is kept is the thread as drawn, never the API history: that carries
// report digests of up to 300k characters and would fill the ~5MB quota in a
// few conversations. A reopened conversation sends its text turns as the
// history (historyFromTurns), and the latest report rides along with the next
// question the way it does after a fresh start.

const STORAGE_KEY = "a11y-chat-archive-v1";
// Enough to find last week's conversation; past it the oldest goes.
const MAX_CHATS = 30;
// A guard under the quota, which is shared with the scan history.
const MAX_STORE_CHARS = 1_500_000;
// A title is one line of the panel; the full question is in the thread.
const TITLE_CHARS = 60;

/** The parts of a turn the archive reads. ScanChat's own Turn type is wider;
 *  the archive keeps whatever else a turn holds as it is. */
export interface ArchivableTurn {
  id: number;
  who: string;
  text?: string;
  state?: string;
}

export interface SavedChat<T extends ArchivableTurn = ArchivableTurn> {
  id: string;
  title: string;
  /** ISO time of the last change, which orders the panel. */
  updatedAt: string;
  turns: T[];
  /** The scan result the conversation was about, kept in IndexedDB under
   *  the conversation's id (lib/chatResults.ts); absent when it had none
   *  or was saved before results were kept. */
  resultKey?: string;
}

/** The first thing the reader asked, on one line, cut at a word. */
export function titleOf(turns: ArchivableTurn[]): string {
  const first = turns.find((x) => x.who === "you" && x.text?.trim());
  const line = (first?.text ?? "").replace(/\s+/g, " ").trim();
  if (line.length <= TITLE_CHARS) return line;
  const cut = line.slice(0, TITLE_CHARS);
  const space = cut.lastIndexOf(" ");
  return `${(space > TITLE_CHARS / 2 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "")}…`;
}

/** A turn as it should be stored: nothing that only means something while
 *  a reply streams, and a scan that was still running stored as stopped,
 *  since nothing will finish it once the page is gone. Attached pictures
 *  are not kept: one phone screenshot is a few hundred kilobytes of base64,
 *  and a handful would fill MAX_STORE_CHARS and push older conversations
 *  out. The words of the message are kept; a reopened conversation goes on
 *  without the picture, as its history is rebuilt from words anyway. */
export function settleTurn<T extends ArchivableTurn>(turn: T): T {
  const rest = { ...turn } as T & { streaming?: unknown; marks?: unknown; searching?: unknown; images?: unknown };
  delete rest.streaming;
  delete rest.marks;
  delete rest.searching;
  delete rest.images;
  if (rest.who === "scan" && rest.state === "running") return { ...rest, state: "failed" };
  return rest;
}

/** The API history for a reopened conversation: the words said, in turns
 *  that alternate and open with the reader, as the API requires. Tool calls
 *  and report blocks are not rebuilt; the next question carries the latest
 *  report instead. */
export function historyFromTurns(turns: ArchivableTurn[]): ChatMessage[] {
  const out: ChatMessage[] = [];
  for (const turn of turns) {
    const role = turn.who === "you" ? "user" : turn.who === "checker" ? "assistant" : null;
    const text = turn.text?.trim();
    if (!role || !text) continue;
    if (!out.length && role === "assistant") continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content as string}\n\n${text}`;
    else out.push({ role, content: text });
  }
  // A thread that ends on the reader's question is fine: appendUser joins
  // the next message to it.
  return out;
}

/** The thread without the reply that used to follow a finished scan. A
 *  finished scan gets no reply since 25 Nov 2026 (the user's instruction,
 *  "do not produce this content on app", on the paragraph that retold the
 *  score and the first findings), but conversations saved before that kept
 *  theirs, so reopening one from Recent drew the paragraph again, and its
 *  words went back to the model as history for it to copy. Dropped: an
 *  assistant turn after a scan that finished, with only blocks and notices
 *  between, before the reader says anything. A failed scan's reply stays. */
export function dropScanReplies<T extends ArchivableTurn>(turns: T[]): T[] {
  let afterScan = false;
  return turns.filter((turn) => {
    if (turn.who === "scan") {
      afterScan = turn.state === "done";
      return true;
    }
    if (turn.who === "you") afterScan = false;
    if (turn.who === "checker" && afterScan) {
      afterScan = false;
      return false;
    }
    return true;
  });
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadChats(): SavedChat[] {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (c): c is SavedChat =>
          !!c && typeof c.id === "string" && typeof c.title === "string" && typeof c.updatedAt === "string" && Array.isArray(c.turns)
      )
      .map((c) => ({ ...c, turns: dropScanReplies(c.turns) }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

// Set while storage refuses writes (quota, private mode): the page's own
// list is then the only full one, and reading storage back would lose it.
let lastWriteFailed = false;

function write(chats: SavedChat[]): SavedChat[] {
  let kept = chats.slice(0, MAX_CHATS);
  while (kept.length > 1 && JSON.stringify(kept).length > MAX_STORE_CHARS) kept = kept.slice(0, -1);
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(kept));
    lastWriteFailed = false;
  } catch {
    lastWriteFailed = true;
    // Quota or private mode: the panel still lists this session's chats.
  }
  return kept;
}

/** What to write over: the stored list, read fresh. The list this page
 *  holds can be stale (another tab of the widget, or another copy on the
 *  same page, saved since it was read), and writing it back whole erased
 *  whatever the other one had added. Falls back to the page's own list when
 *  storage cannot be read. */
function base(chats: SavedChat[]): SavedChat[] {
  if (!storage() || lastWriteFailed) return chats;
  return loadChats();
}

/** Stores one conversation, newest first, and returns the list as kept. */
export function saveChat<T extends ArchivableTurn>(chats: SavedChat[], chat: SavedChat<T>): SavedChat[] {
  return write([chat, ...base(chats).filter((c) => c.id !== chat.id)]);
}

export function deleteChat(chats: SavedChat[], id: string): SavedChat[] {
  return write(base(chats).filter((c) => c.id !== id));
}

/** The storage key, for a `storage` listener that follows other tabs. */
export const CHAT_ARCHIVE_KEY = STORAGE_KEY;

export function newChatId(): string {
  return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
