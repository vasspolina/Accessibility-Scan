/**
 * Reads the screen-reader preview's lines aloud, one utterance per line,
 * and can always be stopped.
 *
 * Kept apart from the component so it is tested without a browser: the
 * speech engine comes in as two functions.
 *
 * Why a run number. `speechSynthesis.cancel()` does not end an utterance
 * on the spot: Chromium and Safari fire the cancelled utterance's `end` or
 * `error` ("interrupted", "canceled") a moment later. The first version
 * cleared a flag, cancelled, set the flag again and started the new line,
 * so the old utterance's late `error` arrived after the new run had begun
 * and set the button back to Play while speech went on. Pressing Play then
 * started again from the first line, and nothing on screen stopped it (user's
 * report, 24 Nov 2026: "there is no way to stop screen reader from reading
 * page"). Every run now takes a number, and an event from any utterance but
 * the current run's current line is ignored.
 *
 * Pause cancels and keeps the line; Resume reads that line again from its
 * start. `speechSynthesis.pause()` is not used: in Chromium on Android and
 * with some desktop voices it does nothing, or resumes never.
 */

// Loose on purpose so SpeechSynthesisUtterance fits as it is: its handlers
// take a `this` and a SpeechSynthesis(Error)Event.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface UtteranceLike {
  onend: ((this: any, ev: any) => any) | null;
  onerror: ((this: any, ev: any) => any) | null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface SpeechEngine<U extends UtteranceLike = UtteranceLike> {
  make: (text: string) => U;
  speak: (u: U) => void;
  cancel: () => void;
}

export type PlayerStatus = "idle" | "playing" | "paused";

export interface PlayerState {
  status: PlayerStatus;
  /** The line being read, or where Resume starts. Null when idle. */
  line: number | null;
}

export interface LinePlayer {
  play: (from?: number) => void;
  pause: () => void;
  resume: () => void;
  /** Play when idle, pause when playing, resume when paused. */
  toggle: () => void;
  stop: () => void;
  next: () => void;
  previous: () => void;
  getState: () => PlayerState;
  setLines: (lines: readonly string[]) => void;
}

// One voice at a time. The report and a block in the conversation can each
// hold a preview, and the speech engine is shared: starting one cancels the
// other's utterance, which may report that as an error we ignore, leaving it
// showing Pause over silence. Starting a player stands the previous one down.
let standDownActive: (() => void) | null = null;

export function createLinePlayer<U extends UtteranceLike>(
  engine: SpeechEngine<U>,
  initialLines: readonly string[],
  onChange: (state: PlayerState) => void
): LinePlayer {
  let lines = initialLines;
  let state: PlayerState = { status: "idle", line: null };
  let run = 0;

  const set = (next: PlayerState) => {
    if (next.status === state.status && next.line === state.line) return;
    state = next;
    onChange(state);
  };

  const clamp = (i: number) => Math.max(0, Math.min(lines.length - 1, i));

  const speakAt = (i: number, myRun: number) => {
    if (myRun !== run) return;
    if (i >= lines.length) {
      set({ status: "idle", line: null });
      return;
    }
    set({ status: "playing", line: i });
    const u = engine.make(lines[i]);
    u.onend = () => {
      if (myRun === run && state.line === i && state.status === "playing") speakAt(i + 1, myRun);
    };
    u.onerror = (ev?: { error?: string }) => {
      if (myRun !== run) return;
      // Our own cancel reports itself as an error in some engines; a run
      // that is still current was not cancelled by us, so it really failed.
      const kind = ev?.error;
      if (kind === "interrupted" || kind === "canceled") return;
      run++;
      set({ status: "idle", line: null });
    };
    engine.speak(u);
  };

  const standDown = () => {
    run++;
    set({ status: "idle", line: null });
  };

  const play = (from = 0) => {
    if (lines.length === 0) return;
    if (standDownActive && standDownActive !== standDown) standDownActive();
    standDownActive = standDown;
    run++;
    engine.cancel();
    speakAt(clamp(from), run);
  };

  const pause = () => {
    if (state.status !== "playing") return;
    run++;
    engine.cancel();
    set({ status: "paused", line: state.line });
  };

  const resume = () => {
    if (state.status !== "paused") return;
    play(state.line ?? 0);
  };

  const stop = () => {
    run++;
    engine.cancel();
    set({ status: "idle", line: null });
  };

  const step = (delta: number) => {
    if (lines.length === 0) return;
    const at = state.line ?? (delta > 0 ? -1 : 0);
    const target = clamp(at + delta);
    if (state.status === "paused") {
      set({ status: "paused", line: target });
      return;
    }
    play(target);
  };

  return {
    play,
    pause,
    resume,
    toggle: () => {
      if (state.status === "playing") pause();
      else if (state.status === "paused") resume();
      else play(0);
    },
    stop,
    next: () => step(1),
    previous: () => step(-1),
    getState: () => state,
    setLines: (next) => {
      if (next === lines) return;
      stop();
      lines = next;
    },
  };
}
