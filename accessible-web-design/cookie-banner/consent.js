/* Consent banner — behaviour. No dependencies.
   Reads nothing but the markup: all wording lives in the HTML, so a
   translation is an edit to the template, not to this file.

   Public API (window.consent):
     consent.allows("analytics")   -> true | false
     consent.get()                 -> { version, date, categories: {...} } | null
     consent.open()                -> show the settings dialog
     consent.reset()               -> forget the choice and show the banner again
   Events on window:
     "consentchange"               -> detail: the stored choice

   Scripts that need consent are written as
     <script type="text/plain" data-consent="analytics" src="…"></script>
   and are switched on the moment that category is allowed. */
(function () {
  "use strict";

  var KEY = "consent-v1";
  var banner = document.querySelector(".consent");
  var dialog = document.querySelector(".consent__dialog");
  if (!banner || !dialog) return;

  var form = dialog.querySelector("form");
  var status = banner.querySelector("[data-consent-status]");
  var lastTrigger = null;

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; }
  }

  function write(categories) {
    var choice = { version: 1, date: new Date().toISOString(), categories: categories };
    try { localStorage.setItem(KEY, JSON.stringify(choice)); } catch (e) { /* private mode: the banner simply returns next visit */ }
    return choice;
  }

  function categoryNames() {
    return Array.prototype.map.call(form.querySelectorAll("input[name]"), function (i) { return i.name; });
  }

  function allOrNothing(value) {
    var out = {};
    categoryNames().forEach(function (n) {
      var input = form.querySelector('input[name="' + n + '"]');
      out[n] = input.disabled ? true : value;   /* necessary stays on */
    });
    return out;
  }

  function activateScripts(categories) {
    document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(function (s) {
      if (!categories[s.dataset.consent]) return;
      var live = document.createElement("script");
      Array.prototype.forEach.call(s.attributes, function (a) {
        if (a.name !== "type" && a.name !== "data-consent") live.setAttribute(a.name, a.value);
      });
      live.textContent = s.textContent;
      s.replaceWith(live);
    });
  }

  function announce(text) {
    if (!status || !text) return;
    status.textContent = "";
    /* a tick later so the live region sees a change even for the same text */
    setTimeout(function () { status.textContent = text; }, 50);
  }

  function apply(categories, message) {
    var choice = write(categories);
    activateScripts(categories);
    window.dispatchEvent(new CustomEvent("consentchange", { detail: choice }));
    announce(message);
    hideBanner();
  }

  function reserveSpace() {
    if (banner.hidden) return;
    /* The page gets padding equal to the banner, so nothing is hidden behind it. */
    document.body.style.paddingBlockEnd = banner.offsetHeight + "px";
  }

  function showBanner() {
    banner.hidden = false;
    reserveSpace();
    /* Focus is NOT moved here. The banner is first in the DOM and is
       announced as a region; the reader keeps reading the page. */
  }

  function hideBanner() {
    banner.hidden = true;
    document.body.style.paddingBlockEnd = "";
    if (lastTrigger && document.contains(lastTrigger)) { lastTrigger.focus(); lastTrigger = null; }
  }

  function fillForm() {
    var stored = read();
    categoryNames().forEach(function (n) {
      var input = form.querySelector('input[name="' + n + '"]');
      if (input.disabled) { input.checked = true; return; }
      input.checked = stored ? !!stored.categories[n] : false;   /* nothing pre-ticked */
    });
  }

  function openDialog(trigger) {
    lastTrigger = trigger || document.activeElement;
    fillForm();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    (dialog.querySelector("h2[tabindex]") || dialog.querySelector("input:not(:disabled), button")).focus();
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  }

  /* Buttons by their data-action, so the labels can say anything. */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-consent-action]");
    if (!el) return;
    var action = el.dataset.consentAction;
    if (action === "accept") { apply(allOrNothing(true), el.dataset.consentMessage); }
    if (action === "reject") { apply(allOrNothing(false), el.dataset.consentMessage); }
    if (action === "settings") { e.preventDefault(); openDialog(el); }
    if (action === "close") { e.preventDefault(); closeDialog(); }
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var categories = {};
    categoryNames().forEach(function (n) {
      var input = form.querySelector('input[name="' + n + '"]');
      categories[n] = input.disabled ? true : input.checked;
    });
    var saveButton = form.querySelector('[type="submit"]');
    dialog.close();
    apply(categories, saveButton && saveButton.dataset.consentMessage);
  });

  /* Escape inside the banner = continue without consent. Nothing is set,
     the choice is stored as a refusal, and the banner does not nag on
     the next page. Escape in the dialog is the browser's own: it just
     closes it, and nothing changes. */
  banner.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var reject = banner.querySelector('[data-consent-action="reject"]');
      apply(allOrNothing(false), reject && reject.dataset.consentMessage);
    }
  });
  window.addEventListener("resize", reserveSpace);
  dialog.addEventListener("close", function () {
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });

  window.consent = {
    get: read,
    allows: function (name) { var c = read(); return !!(c && c.categories[name]); },
    open: function () { openDialog(); },
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      showBanner();
    }
  };

  var stored = read();
  if (stored) activateScripts(stored.categories); else showBanner();
})();
