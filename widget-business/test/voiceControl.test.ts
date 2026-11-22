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
  it("scans an address, through hesitations and a misheard 'scan'", () => {
    // What the recogniser wrote for "please scan accessibility.now".
    expect(parseCommand("Uh please can accessibility.now", "en")).toEqual({ kind: "scan", url: "https://accessibility.now" });
    expect(parseCommand("scan example dot com", "en")).toEqual({ kind: "scan", url: "https://example.com" });
    expect(parseCommand("Could you check https://Example.com/shop.", "en")).toEqual({ kind: "scan", url: "https://Example.com/shop" });
    expect(parseCommand("example.com", "en")).toEqual({ kind: "scan", url: "https://example.com" });
    expect(parseCommand("scanne example.de bitte", "de")).toEqual({ kind: "scan", url: "https://example.de" });
    expect(parseCommand("escanea example.es", "es")).toEqual({ kind: "scan", url: "https://example.es" });
    expect(parseCommand("analyse example.fr", "fr")).toEqual({ kind: "scan", url: "https://example.fr" });
  });
  it("does not take 'can' without an address as a scan", () => {
    expect(parseCommand("can you press send", "en")).toEqual({ kind: "click", target: "send" });
    expect(parseCommand("check the box", "en").kind).not.toBe("scan");
  });
  it("sends a question to the chat", () => {
    expect(parseCommand("ask What should I fix first?", "en")).toEqual({ kind: "ask", text: "What should I fix first?" });
    expect(parseCommand("um, type Hello there", "en")).toEqual({ kind: "type", text: "Hello there" });
  });
  it("keeps words with no command for the chat, as heard", () => {
    // The component presses a button on a close match, else writes these in the chat box.
    expect(parseCommand("What should I fix first?", "en")).toEqual({
      kind: "phrase",
      target: "what should i fix first",
      text: "What should I fix first?",
    });
    expect(parseCommand("send", "en")).toEqual({ kind: "phrase", target: "send", text: "send" });
    expect(parseCommand("Was soll ich zuerst beheben", "de").kind).toBe("phrase");
  });
  it("takes 'chat' alone as going to the chat box", () => {
    expect(parseCommand("Chat", "en")).toEqual({ kind: "ask", text: "" });
    expect(parseCommand("ask", "en")).toEqual({ kind: "ask", text: "" });
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
