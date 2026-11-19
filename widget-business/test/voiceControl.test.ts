import { describe, it, expect } from "vitest";
import { findTarget, parseCommand, type VoiceControlTarget } from "../src/lib/voiceControl";

const c = (name: string): VoiceControlTarget => ({ name, el: {} as HTMLElement });

describe("parseCommand", () => {
  it("reads a press as a click on the named control", () => {
    expect(parseCommand("Press the send button", "en")).toEqual({ kind: "click", target: "send" });
    expect(parseCommand("click new scan", "en")).toEqual({ kind: "click", target: "new scan" });
    expect(parseCommand("klicke auf Senden", "de")).toEqual({ kind: "click", target: "senden" });
    expect(parseCommand("pulsa enviar", "es")).toEqual({ kind: "click", target: "enviar" });
    expect(parseCommand("appuie sur le bouton envoyer", "fr")).toEqual({ kind: "click", target: "envoyer" });
  });
  it("takes 'press that' as the focused control", () => {
    expect(parseCommand("press that button", "en")).toEqual({ kind: "click-focused" });
  });
  it("keeps the speaker's words when typing", () => {
    expect(parseCommand("type Example.com", "en")).toEqual({ kind: "type", text: "Example.com" });
  });
  it("scrolls and stops", () => {
    expect(parseCommand("scroll down", "en")).toEqual({ kind: "scroll", where: "down" });
    expect(parseCommand("scroll to the top", "en")).toEqual({ kind: "scroll", where: "top" });
    expect(parseCommand("stop listening", "en")).toEqual({ kind: "stop" });
  });
});

describe("findTarget", () => {
  const controls = [c("Send"), c("New scan"), c("Show details for missing alt text"), c("Show details for low contrast")];
  it("presses the exact name", () => {
    const r = findTarget("send", controls);
    expect(r.status === "match" && r.target.name).toBe("Send");
  });
  it("matches words in any order", () => {
    expect(findTarget("scan new", controls).status).toBe("match");
  });
  it("refuses to guess between two", () => {
    expect(findTarget("show details", controls).status).toBe("ambiguous");
  });
  it("finds nothing for a name that is not there", () => {
    expect(findTarget("launch rockets", controls).status).toBe("none");
  });
  it("is strict about a bare phrase", () => {
    expect(findTarget("scan", [c("New scan")], 80).status).toBe("none");
  });
});
