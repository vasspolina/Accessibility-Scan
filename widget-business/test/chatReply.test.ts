import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement, Fragment } from "react";
import { renderReply } from "../src/components/ScanChat";

/**
 * The reply as the model writes it, as the reader sees it. Seen on
 * production: a sentence followed by a list in the same paragraph ran the
 * items inline with their hyphens, and `<h1>` arrived with its backticks.
 */
const html = (text: string) => renderToStaticMarkup(createElement(Fragment, null, renderReply(text)));

describe("renderReply", () => {
  it("turns a sentence followed by items into a paragraph and a list", () => {
    const out = html('Start with these three:\n- "No main heading"\n- "Links say only read more"\n- "Nothing marks the main content"');
    expect(out).toBe(
      // The straight marks the model writes are set as quotation marks.
      '<p>Start with these three:</p><ul><li>\u201CNo main heading\u201D</li><li>\u201CLinks say only read more\u201D</li><li>\u201CNothing marks the main content\u201D</li></ul>'
    );
  });

  it("keeps a sentence after a list as its own paragraph", () => {
    expect(html("Two things:\n- one\n- two\nThen rescan.")).toBe("<p>Two things:</p><ul><li>one</li><li>two</li></ul><p>Then rescan.</p>");
  });

  it("shows code without its backticks, and escaped, never parsed", () => {
    expect(html("Add one `<h1>` near the top.")).toBe("<p>Add one <code>&lt;h1&gt;</code> near the top.</p>");
  });

  it("keeps bold, and does not take a bold line for a list item", () => {
    expect(html("**Fix first** findings come first.")).toBe("<p><strong>Fix first</strong> findings come first.</p>");
  });

  it("splits paragraphs on blank lines", () => {
    expect(html("One.\n\nTwo.")).toBe("<p>One.</p><p>Two.</p>");
  });

  // The assistant now writes fixes. A fenced block arrived as backticks and
  // its blank lines split it into paragraphs.
  it("draws a fenced code block whole, blank lines and all, escaped", () => {
    const out = html('Replace the div:\n\n```html\n<button type="button">\n\n  Menu\n</button>\n```\n\nThen test with Tab.');
    expect(out).toBe(
      '<p>Replace the div:</p><pre class="a11y-chat-pre"><code>&lt;button type=&quot;button&quot;&gt;\n\n  Menu\n&lt;/button&gt;</code></pre><p>Then test with Tab.</p>'
    );
  });

  it("draws a block still streaming in as code up to the end", () => {
    expect(html("Like this:\n```css\n:focus-visible {\n  outline: 2px solid")).toBe(
      '<p>Like this:</p><pre class="a11y-chat-pre"><code>:focus-visible {\n  outline: 2px solid</code></pre>'
    );
  });

  it("does not take list-like lines inside code for a list", () => {
    expect(html("```js\n- not a bullet\n1. not a step\n```")).toBe(
      '<pre class="a11y-chat-pre"><code>- not a bullet\n1. not a step</code></pre>'
    );
  });

  it("numbers steps, and keeps counting after a code block", () => {
    expect(html("1. Open the page\n2. Press Tab\n\n```html\n<a>\n```\n\n3. Check the outline")).toBe(
      '<ol><li>Open the page</li><li>Press Tab</li></ol><pre class="a11y-chat-pre"><code>&lt;a&gt;</code></pre><ol start="3"><li>Check the outline</li></ol>'
    );
  });

  it("does not read a decimal at the start of a line as a step", () => {
    expect(html("4.5 to 1 is the bar.")).toBe("<p>4.5 to 1 is the bar.</p>");
  });

  it("links an http address, says it opens a new tab, and leaves the full stop out", () => {
    const out = html("See [the guidance](https://www.w3.org/WAI/WCAG21/quickref/) or https://example.com/a.");
    expect(out).toContain('<a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank" rel="noopener noreferrer">the guidance<span class="a11y-sr-only"> (opens in a new tab)</span></a>');
    expect(out).toContain('<a href="https://example.com/a" target="_blank" rel="noopener noreferrer">https://example.com/a<span');
    expect(out).toMatch(/<\/a>\.<\/p>$/);
  });

  // Text from a model never becomes a script link.
  it("never links anything but http and https", () => {
    const out = html("[click](javascript:alert(1)) and [x](data:text/html,hi)");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("href");
  });

  it("shows a heading the model wrote anyway as a bold line, not hashes", () => {
    expect(html("## What to fix\nThe menu.")).toBe("<p><strong>What to fix</strong></p><p>The menu.</p>");
  });
});
