import { describe, it, expect } from "vitest";
import { parseArgs } from "../src/cli.js";

/**
 * The argument parser, tested for one failure mode above all others: an
 * option that quietly does nothing.
 *
 * A CI gate that silently stops gating is worse than no gate, because the
 * green build is read as evidence. Every case below is a way that used to
 * happen.
 */

const ok = (argv: string[]) => {
  const r = parseArgs(argv);
  if ("error" in r) throw new Error(`unexpected error: ${r.error}`);
  return r;
};
const err = (argv: string[]) => {
  const r = parseArgs(argv);
  return "error" in r ? r.error : null;
};

describe("a threshold never goes missing quietly", () => {
  it("refuses an option with nothing after it", () => {
    // `--baseline $FILE` with the variable unset is exactly this, and it
    // used to print "no thresholds set" and exit 0.
    expect(err(["https://x.test", "--baseline"])).toContain("--baseline needs a value");
    expect(err(["https://x.test", "--json"])).toContain("--json needs a value");
  });

  it("refuses an option swallowing the next flag as its value", () => {
    expect(err(["https://x.test", "--baseline", "--quiet"])).toContain("--baseline needs a value");
  });

  it("refuses an option given an empty string", () => {
    expect(err(["https://x.test", "--baseline", ""])).toContain("--baseline needs a value");
  });

  it("refuses --max-new without the baseline it counts against", () => {
    // On its own it was a threshold that applied to nothing.
    expect(err(["https://x.test", "--max-new", "5"])).toContain("--baseline");
    expect(ok(["https://x.test", "--max-new", "5", "--baseline", "b.json"]).maxNew).toBe(5);
  });

  it("still accepts the ordinary shapes", () => {
    expect(ok(["https://x.test"]).url).toBe("https://x.test");
    expect(ok(["https://x.test", "--min-score", "80"]).minScore).toBe(80);
    expect(ok(["https://x.test", "--fail-on", "serious"]).failOn).toBe("serious");
    expect(ok(["--quiet", "--ai", "https://x.test"]).quiet).toBe(true);
    expect(ok(["https://x.test", "--write-baseline"]).writeBaseline).toBe(true);
  });

  it("still rejects the values it always rejected", () => {
    expect(err(["https://x.test", "--min-score", "101"])).toContain("0 to 100");
    expect(err(["https://x.test", "--fail-on", "catastrophic"])).toContain("--fail-on takes one of");
    expect(err(["https://x.test", "--nonsense"])).toContain("Unknown option");
    expect(err([])).toContain("exactly one URL");
    expect(err(["https://a.test", "https://b.test"])).toContain("exactly one URL");
  });
});
