import { describe, expect, it } from "vitest";
import { createLinePlayer, type PlayerState, type UtteranceLike } from "../src/lib/linePlayer";

// A speech engine that behaves like Chromium's: cancel() does not end the
// utterance on the spot, it reports "interrupted" a moment later, which is
// what put the old preview into a state nothing on screen could stop.
interface FakeUtt extends UtteranceLike {
  text: string;
}

function fakeEngine() {
  const spoken: FakeUtt[] = [];
  let speaking: FakeUtt | null = null;
  const lateEvents: Array<() => void> = [];
  return {
    spoken,
    current: () => speaking,
    flushLate: () => {
      while (lateEvents.length) lateEvents.shift()!();
    },
    finish: () => {
      const u = speaking;
      speaking = null;
      u?.onend?.();
    },
    engine: {
      make: (text: string): FakeUtt => ({ text, onend: null, onerror: null }),
      speak: (u: FakeUtt) => {
        spoken.push(u);
        speaking = u;
      },
      cancel: () => {
        const u = speaking;
        speaking = null;
        if (u) lateEvents.push(() => u.onerror?.({ error: "interrupted" }), () => u.onend?.());
      },
    },
  };
}

const LINES = ["Home, link", "Button", "Search, edit text", "Footer"];

function setup(lines = LINES) {
  const f = fakeEngine();
  const states: PlayerState[] = [];
  const player = createLinePlayer(f.engine, lines, (s) => states.push(s));
  return { f, player, states };
}

describe("linePlayer", () => {
  it("reads every line in order, then goes idle", () => {
    const { f, player } = setup();
    player.play();
    for (let i = 0; i < LINES.length; i++) f.finish();
    expect(f.spoken.map((u) => u.text)).toEqual(LINES);
    expect(player.getState()).toEqual({ status: "idle", line: null });
  });

  it("stays playing when a line is pressed mid-read and the cancelled one reports late", () => {
    const { f, player } = setup();
    player.play(0);
    player.play(2);
    f.flushLate();
    expect(player.getState()).toEqual({ status: "playing", line: 2 });
    // Only one chain reads on: the cancelled line's late end did not start line 1.
    expect(f.spoken.map((u) => u.text)).toEqual(["Home, link", "Search, edit text"]);
    player.stop();
    f.flushLate();
    expect(player.getState().status).toBe("idle");
    expect(f.current()).toBeNull();
  });

  it("stop is final: no late event starts the next line", () => {
    const { f, player } = setup();
    player.play();
    player.stop();
    f.flushLate();
    expect(f.spoken).toHaveLength(1);
    expect(player.getState()).toEqual({ status: "idle", line: null });
  });

  it("pause keeps the line and resume reads it again", () => {
    const { f, player } = setup();
    player.play();
    f.finish();
    player.pause();
    f.flushLate();
    expect(player.getState()).toEqual({ status: "paused", line: 1 });
    expect(f.current()).toBeNull();
    player.resume();
    expect(player.getState()).toEqual({ status: "playing", line: 1 });
    expect(f.current()?.text).toBe("Button");
  });

  it("toggle plays, pauses and resumes", () => {
    const { player } = setup();
    player.toggle();
    expect(player.getState().status).toBe("playing");
    player.toggle();
    expect(player.getState().status).toBe("paused");
    player.toggle();
    expect(player.getState().status).toBe("playing");
  });

  it("next and previous move one line and stay inside the script", () => {
    const { f, player } = setup();
    player.play(0);
    player.previous();
    expect(player.getState().line).toBe(0);
    player.next();
    player.next();
    f.flushLate();
    expect(player.getState()).toEqual({ status: "playing", line: 2 });
    player.next();
    player.next();
    expect(player.getState().line).toBe(3);
  });

  it("moving while paused moves the place without speaking", () => {
    const { f, player } = setup();
    player.play(1);
    player.pause();
    const before = f.spoken.length;
    player.next();
    expect(player.getState()).toEqual({ status: "paused", line: 2 });
    expect(f.spoken).toHaveLength(before);
  });

  it("a real engine error ends the run", () => {
    const { f, player } = setup();
    player.play();
    f.current()!.onerror?.({ error: "synthesis-failed" });
    expect(player.getState()).toEqual({ status: "idle", line: null });
  });

  it("starting a second preview stands the first one down", () => {
    const f = fakeEngine();
    const a = createLinePlayer(f.engine, LINES, () => {});
    const b = createLinePlayer(f.engine, LINES, () => {});
    a.play();
    b.play();
    f.flushLate();
    expect(a.getState().status).toBe("idle");
    expect(b.getState().status).toBe("playing");
  });

  it("new lines stop the old reading", () => {
    const { player } = setup();
    player.play();
    player.setLines(["Other page"]);
    expect(player.getState().status).toBe("idle");
  });
});
