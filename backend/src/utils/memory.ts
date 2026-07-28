import { readFile } from "node:fs/promises";

// What the container is actually using, as opposed to what this process is.
//
// The distinction is the whole point. A scan that dies with "Target crashed"
// has lost Chromium's renderer, which is a separate process with its own
// memory — decoded images, layout, compositing. Node holds something quite
// different: the report, and a few hundred kilobytes of base64 screenshots.
// Reading only process.memoryUsage() answers the wrong question and would
// have sent the next change at the wrong target, which has already happened
// three times on this problem.
//
// cgroup v2 first (memory.current / memory.max), falling back to v1. Both are
// absent off Linux, where these numbers are meaningless anyway.

async function readNumber(path: string): Promise<number | null> {
  try {
    const raw = (await readFile(path, "utf8")).trim();
    if (raw === "max") return Infinity;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export interface MemorySnapshot {
  /** Everything in the container: this process, Chromium, and its renderers. */
  containerMb: number | null;
  /** The container's hard ceiling. Infinity when uncapped. */
  limitMb: number | null;
  /** This Node process alone. */
  processMb: number;
}

export async function memorySnapshot(): Promise<MemorySnapshot> {
  const current =
    (await readNumber("/sys/fs/cgroup/memory.current")) ??
    (await readNumber("/sys/fs/cgroup/memory/memory.usage_in_bytes"));
  const limit =
    (await readNumber("/sys/fs/cgroup/memory.max")) ??
    (await readNumber("/sys/fs/cgroup/memory/memory.limit_in_bytes"));
  const mb = (bytes: number | null) =>
    bytes === null ? null : bytes === Infinity ? Infinity : Math.round(bytes / 1048576);
  return {
    containerMb: mb(current),
    limitMb: mb(limit),
    processMb: Math.round(process.memoryUsage().rss / 1048576),
  };
}

/**
 * Tracks the highest memory the container reaches while something runs.
 *
 * Snapshots either side of a scan miss the thing that matters. moma.org
 * measured 649MB before and 647MB after, which says nothing at all about the
 * moment the renderer died — the peak sits somewhere in the middle, during
 * screenshots or the mobile pass. A crash at a ceiling can only be understood
 * by watching for the ceiling.
 *
 * Polls rather than hooks anything: reading a cgroup file is a few
 * microseconds, and half a second of granularity is plenty against a scan
 * measured in tens of seconds.
 */
export function trackPeakMemory(intervalMs = 500): { stop: () => Promise<MemorySnapshot> } {
  let peak: MemorySnapshot = { containerMb: 0, limitMb: null, processMb: 0 };
  const sample = async () => {
    const now = await memorySnapshot();
    if ((now.containerMb ?? 0) >= (peak.containerMb ?? 0)) peak = now;
    else if (now.processMb > peak.processMb) peak = { ...peak, processMb: now.processMb };
  };
  void sample();
  const timer = setInterval(() => void sample(), intervalMs);
  // unref so a forgotten tracker can never hold the process open.
  timer.unref?.();
  return {
    stop: async () => {
      clearInterval(timer);
      await sample();
      return peak;
    },
  };
}
