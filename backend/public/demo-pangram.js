// demo-pangram.html: the demo with the widget's own CSS taken away and
// demo-pangram.css put in its place. The widget bundle is unchanged; this file
// removes what it adds. It is a separate file because the service sends
// script-src 'self', which blocks an inline script.
//
// What it removes, wherever it appears (document or the widget's shadow root):
// - <style> elements (the widget's global.css and its document-level @font-face)
// - <link rel="stylesheet">, except demo-pangram.css (marked data-demo-pangram)
// - style="" attributes, except on the few elements whose inline style is data,
//   not looks: a colour swatch's colour, the box drawn round an element on its
//   picture, the vision simulator's filter, a progress bar's width.
// Then it links demo-pangram.css into the shadow root, where the page's own
// stylesheet cannot reach. It must load before widget-business.js so
// attachShadow is wrapped first.

(function () {
  // Talk to the server the page came from. The service's CSP is
  // default-src 'self', so a copy opened from a local backend could not
  // reach the production address written in the embed: the chat failed with
  // "Couldn't reach the assistant". On production the two are the same.
  var widgetRoot = document.getElementById("a11y-widget-business-root");
  if (widgetRoot) widgetRoot.setAttribute("data-api-base", location.origin);

  var here = document.currentScript && document.currentScript.src;
  var cssUrl = new URL("demo-pangram.css", here || location.href).href;

  var SHEETS = 'style, link[rel~="stylesheet"]:not([data-demo-pangram])';
  var KEEP_STYLE =
    ".a11y-swatch, .a11y-sim-img, .a11y-shot-box, .a11y-progress-fill, " +
    ".a11y-dial-meter-fill, .a11y-dial-meter-tick";

  function unstyle(el) {
    if (el.hasAttribute("style") && !el.matches(KEEP_STYLE)) el.removeAttribute("style");
  }

  function strip(root) {
    root.querySelectorAll(SHEETS).forEach(function (el) {
      el.remove();
    });
    root.querySelectorAll("[style]").forEach(unstyle);
  }

  function watch(root) {
    strip(root);
    new MutationObserver(function (records) {
      records.forEach(function (r) {
        if (r.type === "attributes") {
          unstyle(r.target);
          return;
        }
        r.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.matches(SHEETS)) {
            n.remove();
            return;
          }
          unstyle(n);
          strip(n);
        });
      });
    }).observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  function linkSheet(shadow) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.setAttribute("data-demo-pangram", "");
    shadow.appendChild(link);
  }

  var attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    var shadow = attach.call(this, init);
    watch(shadow);
    // The widget clears the root (innerHTML = "") right after attaching, so
    // the sheet goes in once that has happened and again if it is ever cleared.
    new MutationObserver(function () {
      if (!shadow.querySelector("link[data-demo-pangram]")) linkSheet(shadow);
    }).observe(shadow, { childList: true });
    linkSheet(shadow);
    return shadow;
  };

  // adoptedStyleSheets is unused by the widget today; empty it in case.
  if ("adoptedStyleSheets" in Document.prototype) document.adoptedStyleSheets = [];

  watch(document.documentElement);
})();
