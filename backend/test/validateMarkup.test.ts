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

// This layer answers one question: is the HTML itself broken. Everything else
// belongs to a layer built for it. Measured across four real sites before
// this: 42 of the 42 "markup validity issues" reported for one page were
// style preferences or accessibility rules axe already covers, and gov.uk was
// told its HTML was invalid when it is not.
describe("what counts as a markup problem", () => {
  const page = (body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>T</title></head>
<body>${body}</body></html>`;

  it("ignores a preference for a different element, which is not invalidity", async () => {
    const html = page('<div role="region" aria-label="X"><p>hi</p></div>');
    expect(await markupFindingsFromHtml(html)).toEqual([]);
  });

  // The rule's own message says "strictly allowed but is not recommended".
  it("ignores markup that is allowed but not recommended", async () => {
    const html = page('<p id="l">Label</p><div role="region" aria-labelledby="l">hi</div>');
    expect(await markupFindingsFromHtml(html)).toEqual([]);
  });

  it("ignores accessibility rules that axe reports properly", async () => {
    // Missing alt and empty link text are real problems — reported by the
    // accessibility layers, with a plain title, a fix and a picture. Repeating
    // them here counted them twice and buried them under "markup".
    const html = page('<img src="a.png"><a href="/x"></a>');
    const findings = await markupFindingsFromHtml(html);
    for (const f of findings) {
      expect(f.description).not.toMatch(/alt|Anchor link/i);
    }
  });

  it("still reports genuinely broken markup", async () => {
    const html = page('<div><p>one</div><span>two</p>');
    expect((await markupFindingsFromHtml(html)).length).toBeGreaterThan(0);
  });

  it("still reports a duplicated attribute", async () => {
    const html = page('<link media="a" media="b">');
    const findings = await markupFindingsFromHtml(html);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].description).toMatch(/duplicated/i);
  });
});
