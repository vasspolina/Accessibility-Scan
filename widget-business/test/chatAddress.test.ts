import { describe, it, expect } from "vitest";
import { addressIn } from "../src/api/chatClient";

/** The no-assistant fallback's reading of an address. With an assistant,
 *  the model reads loosely typed addresses (and spelling) itself; this is
 *  what still works when there is none. */
describe("addressIn", () => {
  it("finds a written address inside a sentence", () => {
    expect(addressIn("Can you check example.com please?")).toBe("example.com");
    expect(addressIn("https://www.example.org/about.")).toBe("https://www.example.org/about");
  });

  it("joins an address typed with spaces for dots", () => {
    expect(addressIn("example com")).toBe("example.com");
    expect(addressIn("bbc co uk")).toBe("bbc.co.uk");
    expect(addressIn("acessobility nl")).toBe("acessobility.nl");
  });

  it("does not make an address out of ordinary words", () => {
    expect(addressIn("hello there")).toBeNull();
    expect(addressIn("check my site nl")).toBeNull();
    expect(addressIn("my site nl")).toBeNull();
  });
});
