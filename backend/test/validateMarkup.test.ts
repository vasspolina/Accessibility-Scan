import { describe, it, expect } from "vitest";
import { markupFindingsFromHtml } from "../src/services/markup/validateMarkup.js";

const VALID_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Test page</title></head>
<body><main><h1>Hello</h1><p>World</p></main></body>
</html>`;

const BROKEN_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Broken</title></head>
<body>
<div id="dup"><p>one</div>
<div id="dup">two</span></div>
</body>
</html>`;

describe("markupFindingsFromHtml", () => {
  it("returns nothing for valid HTML", async () => {
    expect(await markupFindingsFromHtml(VALID_PAGE)).toEqual([]);
  });

  it("returns one grouped design-clarity finding for broken HTML", async () => {
    const findings = await markupFindingsFromHtml(BROKEN_PAGE);
    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.ruleId).toBe("markup-validation");
    expect(f.category).toBe("design-clarity");
    expect(f.severity).toBe("minor");
    expect(f.description).toMatch(/markup validity issue/);
    expect(f.helpUrl).toBe("https://validator.w3.org/");
  });
});
