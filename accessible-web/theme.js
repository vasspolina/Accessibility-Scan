// The theme button. Without a stored choice the page follows the system
// setting; a press stores the choice for this browser only. Storage can be
// blocked (private windows, previews), so every access is guarded and the
// page still works without it.
(function () {
  var root = document.documentElement;
  var btn = document.querySelector("[data-theme-toggle]");
  if (!btn) return;
  var mq = window.matchMedia("(prefers-color-scheme: dark)");

  function current() {
    return root.dataset.theme || (mq.matches ? "dark" : "light");
  }
  function sync() {
    btn.setAttribute("aria-pressed", current() === "dark" ? "true" : "false");
  }

  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("aw-theme", next); } catch (e) {}
    sync();
  });
  if (mq.addEventListener) mq.addEventListener("change", sync);
  sync();
})();
