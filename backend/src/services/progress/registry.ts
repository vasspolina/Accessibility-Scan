/**
 * In-memory progress channels, one per running scan.
 *
 * The scan is a single long POST; the visitor watching it subscribes to
 * GET /api/scan/progress/:id with an id the widget invented. Whichever of
 * the two arrives first creates the channel, so there is no race between
 * pressing the button and opening the stream. A late subscriber gets the
 * backlog replayed, so refreshing mid-scan does not lose the story so far.
 *
 * This is process memory on purpose. The renderer is one process; a scan
 * and its watcher land on the same one, and nothing here is worth a store:
 * lose the process and the scan is gone too. Everything published is a
 * milestone id from a fixed list — never user data, never the URL.
 */

const MAX_CHANNELS = 200;
// A channel whose scan never finishes (crash, kill) must not live forever.
const ORPHAN_TTL_MS = 15 * 60 * 1000;
// A channel opened by a watcher alone, before any scan publishes to it. The
// widget opens the stream a moment before its POST lands, so this is
// generous; the point is that a GET with an invented id cannot hold one of
// the MAX_CHANNELS slots for the full orphan time.
const PENDING_TTL_MS = 2 * 60 * 1000;
// Finished channels linger briefly so a subscriber that arrives just after
// the finish still gets the backlog and the done marker.
const FINISHED_TTL_MS = 60 * 1000;

type Listener = (event: string) => void;

interface Channel {
  backlog: string[];
  listeners: Set<Listener>;
  done: boolean;
  reaper: NodeJS.Timeout;
}

const channels = new Map<string, Channel>();

function reap(id: string, afterMs: number): NodeJS.Timeout {
  const t = setTimeout(() => {
    const ch = channels.get(id);
    if (!ch) return;
    for (const l of ch.listeners) l("done");
    channels.delete(id);
  }, afterMs);
  // Never hold the process open for a progress channel.
  t.unref();
  return t;
}

function getOrCreate(id: string, ttlMs = ORPHAN_TTL_MS): Channel | undefined {
  const existing = channels.get(id);
  if (existing) return existing;
  // Refusing quietly beyond the cap: progress is decoration on the scan,
  // and the scan itself is what rate limiting protects.
  if (channels.size >= MAX_CHANNELS) return undefined;
  const ch: Channel = {
    backlog: [],
    listeners: new Set(),
    done: false,
    reaper: reap(id, ttlMs),
  };
  channels.set(id, ch);
  return ch;
}

export function publish(id: string, event: string): void {
  const ch = getOrCreate(id);
  if (!ch || ch.done) return;
  // A duplicate milestone is a no-op: the pipeline may cross the same
  // boundary twice (desktop pass, then phone pass re-enters "photograph"),
  // and the story reads forward only.
  if (ch.backlog.includes(event)) return;
  // The first milestone is the scan arriving: a channel a watcher opened
  // now gets the full orphan time.
  if (ch.backlog.length === 0) {
    clearTimeout(ch.reaper);
    ch.reaper = reap(id, ORPHAN_TTL_MS);
  }
  ch.backlog.push(event);
  for (const l of ch.listeners) l(event);
}

export function finish(id: string): void {
  const ch = channels.get(id);
  if (!ch || ch.done) return;
  ch.done = true;
  for (const l of ch.listeners) l("done");
  clearTimeout(ch.reaper);
  ch.reaper = reap(id, FINISHED_TTL_MS);
}

/** Replays the backlog, then live events. Returns the unsubscribe. */
export function subscribe(id: string, listener: Listener): () => void {
  const ch = getOrCreate(id, PENDING_TTL_MS);
  if (!ch) {
    listener("done");
    return () => {};
  }
  for (const event of ch.backlog) listener(event);
  if (ch.done) {
    listener("done");
    return () => {};
  }
  ch.listeners.add(listener);
  return () => {
    ch.listeners.delete(listener);
    // Nobody watching and nothing ever published: the slot goes back now.
    if (ch.listeners.size === 0 && ch.backlog.length === 0 && !ch.done && channels.get(id) === ch) {
      clearTimeout(ch.reaper);
      channels.delete(id);
    }
  };
}

/** Test seam: how many slots are held. */
export function _channelCount(): number {
  return channels.size;
}

/** Test seam. */
export function _resetForTests(): void {
  for (const ch of channels.values()) clearTimeout(ch.reaper);
  channels.clear();
}
