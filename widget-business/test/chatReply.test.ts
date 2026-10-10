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
      '<p>Start with these three:</p><ul><li>&quot;No main heading&quot;</li><li>&quot;Links say only read more&quot;</li><li>&quot;Nothing marks the main content&quot;</li></ul>'
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
});
