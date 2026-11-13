// Three small behaviours: the theme button, the menu pill, the galleries.
// Each works on its own and the page reads fine with none of them: without
// script the menu panel stays hidden but the footer repeats every link, and a
// gallery is still a row of pictures you can swipe or scroll.
(function () {
  var root = document.documentElement;

  // ---- theme: follows the system until pressed; a press is stored (guarded)
  var btn = document.querySelector("[data-theme-toggle]");
  if (btn) {
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    var current = function () { return root.dataset.theme || (mq.matches ? "dark" : "light"); };
    var sync = function () { btn.setAttribute("aria-pressed", current() === "dark" ? "true" : "false"); };
    btn.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("aw-theme", next); } catch (e) {}
      sync();
    });
    if (mq.addEventListener) mq.addEventListener("change", sync);
    sync();
  }

  // ---- menu: a disclosure; Escape and a click outside close it
  var pill = document.querySelector("[data-menu]");
  if (pill) {
    var panel = document.getElementById(pill.getAttribute("aria-controls"));
    var setOpen = function (open) {
      pill.setAttribute("aria-expanded", open ? "true" : "false");
      panel.hidden = !open;
    };
    pill.addEventListener("click", function () { setOpen(panel.hidden); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) { setOpen(false); pill.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && e.target !== pill) setOpen(false);
    });
  }

  // ---- galleries: buttons step one slide; the counter follows any scroll
  document.querySelectorAll("[data-gallery]").forEach(function (g) {
    var track = g.querySelector(".track");
    var slides = track.querySelectorAll(".slide");
    var count = g.querySelector(".count");
    var prev = g.querySelector("[data-prev]");
    var next = g.querySelector("[data-next]");
    var index = 0;
    var show = function () {
      var name = slides[index].getAttribute("data-name");
      count.innerHTML = (index + 1) + "/" + slides.length + ' <span class="name">' + name + "</span>";
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    };
    var go = function (i) {
      index = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: index * track.clientWidth });
      show();
    };
    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });
    var t;
    track.addEventListener("scroll", function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var i = Math.round(track.scrollLeft / track.clientWidth);
        if (i !== index) { index = i; show(); }
      }, 80);
    });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
    });
    show();
  });
})();
