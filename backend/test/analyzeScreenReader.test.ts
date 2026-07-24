import { describe, it, expect } from "vitest";
import {
  condenseScreenReaderScript,
  type ScreenReaderLine,
  type ScreenReaderScript,
} from "../src/services/screenReader/analyzeScreenReader.js";

function line(text: string, kind: ScreenReaderLine["kind"] = "text"): ScreenReaderLine {
  return { text, kind, selector: "p" };
}

function script(lines: ScreenReaderLine[], truncated = false): ScreenReaderScript {
  return { lines, truncated };
}

describe("condenseScreenReaderScript", () => {
  it("leaves a varied script untouched", () => {
    const input = script([line("heading level 1, “Home”", "heading"), line("link, “About”", "link")]);
    expect(condenseScreenReaderScript(input).lines.map((l) => l.text)).toEqual([
      "heading level 1, “Home”",
      "link, “About”",
    ]);
  });

  it("collapses consecutive identical announcements into a repeat count", () => {
    const input = script([
      line("link, no text", "link"),
      line("link, no text", "link"),
      line("link, no text", "link"),
      line("heading level 2, “Next”", "heading"),
    ]);
    const out = condenseScreenReaderScript(input).lines;
    expect(out).toHaveLength(2);
    expect(out[0].text).toBe("link, no text (repeated 3 times)");
    expect(out[1].text).toBe("heading level 2, “Next”");
  });

  it("collapses a run that ends the script", () => {
    const input = script([line("image, no description", "image"), line("image, no description", "image")]);
    const out = condenseScreenReaderScript(input).lines;
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe("image, no description (repeated 2 times)");
  });

  it("does not merge identical text of a different kind", () => {
    const input = script([line("Contact", "link"), line("Contact", "heading")]);
    expect(condenseScreenReaderScript(input).lines).toHaveLength(2);
  });

  it("does not merge non-consecutive repeats", () => {
    const input = script([line("link, “Home”", "link"), line("some text"), line("link, “Home”", "link")]);
    expect(condenseScreenReaderScript(input).lines).toHaveLength(3);
  });

  it("preserves the issue attached to a line", () => {
    const input: ScreenReaderScript = script([
      { text: "button, unlabelled", kind: "button", selector: "button", issue: "This button has no name." },
    ]);
    expect(condenseScreenReaderScript(input).lines[0].issue).toBe("This button has no name.");
  });

  it("carries the truncated flag through", () => {
    expect(condenseScreenReaderScript(script([line("a")], true)).truncated).toBe(true);
  });

  it("does not mutate the input script", () => {
    const original = script([line("x"), line("x")]);
    condenseScreenReaderScript(original);
    expect(original.lines).toHaveLength(2);
    expect(original.lines[0].text).toBe("x");
  });
});
