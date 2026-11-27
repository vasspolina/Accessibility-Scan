// A stand-in for a third-party accessibility overlay's script, for
// qa-overlay.html and the fixture test only. It is not any vendor's code.
//
// It does the one thing the overlay note looks for: after the page has
// loaded it appends the element a real widget appends to <body>. The name is
// accessiBe's, read on accessibe.com on 22 November 2026, where the page
// holds <access-widget-ui> elements with a shadow root each. Nothing is put
// inside it, so it adds nothing for the other checks to measure.
(function () {
  function build() {
    if (document.querySelector("access-widget-ui")) return;
    var host = document.createElement("access-widget-ui");
    // Real widgets arrive hidden from the page's own layout; this one takes
    // no space and is hidden from assistive technology, so the fixture's
    // other results are those of the page without it.
    host.setAttribute("aria-hidden", "true");
    host.style.display = "none";
    document.body.appendChild(host);
  }
  // A short wait, as a real loader has: the element is not there when the
  // parser finishes, only once the script has run its start-up.
  function later() { setTimeout(build, 100); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later);
  else later();
})();
