import { describe, it, expect, beforeEach } from "vitest";
import { MILESTONES, milestoneForPhase } from "../src/services/progress/milestones.js";
import { publish, finish, subscribe, _resetForTests, _channelCount } from "../src/services/progress/registry.js";

// The narration: internal phase names map to the reader-facing milestones,
// and the channel replays, de-duplicates, and closes exactly once.

describe("milestoneForPhase", () => {
  it("maps every named render phase onto the fixed list", () => {
    for (const phase of [
      "goto",
      "subresources",
      "axe",
      "screenReader",
      "keyboard",
      "viewportShot",
      "mobile",
      "textResize",
    ]) {
      const id = milestoneForPhase(phase);
      expect(id, phase).toBeDefined();
      expect(MILESTONES).toContain(id);
    }
  });

  it("says nothing for a phase it does not know", () => {
    expect(milestoneForPhase("someNewPhase")).toBeUndefined();
  });

  it("keeps the itinerary in the order the pipeline runs", () => {
    // The widget renders the list in MILESTONES order and marks progress by
    // index, so an id arriving 'backwards' would strike steps that have not
    // happened. Spot-check the spine.
    const order = ["load", "rules", "screen-reader", "photograph", "keyboard", "text-resize", "phone", "ai-review", "report"];
    expect([...MILESTONES]).toEqual(order);
  });
});

describe("progress registry", () => {
  beforeEach(() => _resetForTests());

  it("gives back a watcher's slot when it leaves before any scan arrived", () => {
    // A GET with an invented id must not hold one of the capped slots.
    const leave = subscribe("nobody-scans-this", () => {});
    expect(_channelCount()).toBe(1);
    leave();
    expect(_channelCount()).toBe(0);
  });

  it("keeps a running scan's channel when its watcher leaves, for a refresh to replay", () => {
    const leave = subscribe("scan-running", () => {});
    publish("scan-running", "load");
    leave();
    expect(_channelCount()).toBe(1);
    const got: string[] = [];
    subscribe("scan-running", (e) => got.push(e));
    expect(got).toEqual(["load"]);
  });

  it("replays the backlog to a late subscriber, in order", () => {
    publish("scan-1", "load");
    publish("scan-1", "rules");
    const got: string[] = [];
    subscribe("scan-1", (e) => got.push(e));
    expect(got).toEqual(["load", "rules"]);
  });

  it("drops duplicate milestones", () => {
    const got: string[] = [];
    subscribe("scan-2", (e) => got.push(e));
    publish("scan-2", "photograph");
    publish("scan-2", "photograph");
    expect(got).toEqual(["photograph"]);
  });

  it("closes with done, once, and tells late subscribers immediately", () => {
    const got: string[] = [];
    subscribe("scan-3", (e) => got.push(e));
    publish("scan-3", "load");
    finish("scan-3");
    finish("scan-3");
    expect(got).toEqual(["load", "done"]);

    const late: string[] = [];
    subscribe("scan-3", (e) => late.push(e));
    expect(late).toEqual(["load", "done"]);
  });

  it("ignores publishes after the finish", () => {
    const got: string[] = [];
    subscribe("scan-4", (e) => got.push(e));
    finish("scan-4");
    publish("scan-4", "report");
    expect(got).toEqual(["done"]);
  });

  it("unsubscribing stops the events", () => {
    const got: string[] = [];
    const off = subscribe("scan-5", (e) => got.push(e));
    publish("scan-5", "load");
    off();
    publish("scan-5", "rules");
    expect(got).toEqual(["load"]);
  });
});
