// The demo page's example-domain buttons. Each one fills the widget's URL
// field — through the open shadow root, with the native value setter so
// React's controlled input sees the change — then hands focus to the field,
// so a screen-reader user hears the label and the value they just picked.
(function () {
  function fill(domain) {
    var root = document.getElementById("a11y-widget-business-root");
    var input = root && root.shadowRoot && root.shadowRoot.getElementById("a11y-url-input");
    if (!input) return;
    var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, domain);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.scrollIntoView({ block: "center" });
    input.focus();
  }
  document.addEventListener("click", function (e) {
    var btn = e.target && e.target.closest ? e.target.closest("button[data-domain]") : null;
    if (btn) fill(btn.getAttribute("data-domain"));
  });
})();
