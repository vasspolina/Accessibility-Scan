/* Consent banner builder.
   Turns the form in #builder into the three files a site needs: the
   markup in the chosen language with the site's own policy link and
   categories, consent.css with the site's colours, and consent.js as is.
   Every colour pair is checked against WCAG before it is offered.

   The page provides:
     #builder                 the form
     #builder-strings         JSON: the generated wording, per language
     code#consent.css         the stylesheet source
     code#consent.js          the script source
   and optionally window.JSZip for the one-file download. */
(function () {
  var form = document.getElementById("builder");
  if (!form) return;
  var S = JSON.parse(document.getElementById("builder-strings").textContent);
  var ui = S.ui;
  var out = document.getElementById("builder-output");
  var status = document.getElementById("builder-status");
  var contrastList = document.getElementById("builder-contrast");
  var preview = document.getElementById("builder-preview");
  var none = document.getElementById("builder-none");
  var result = document.getElementById("builder-result");

  function src(id) { var el = document.getElementById(id); return el ? el.textContent : ""; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function say(t) { status.textContent = ""; setTimeout(function () { status.textContent = t; }, 50); }

  /* ── Contrast ─────────────────────────────────────────────────────── */
  function lum(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16, (n >> 8) & 255, n & 255].map(function (c) {
      c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }).reduce(function (s, c, i) { return s + c * [0.2126, 0.7152, 0.0722][i]; }, 0);
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }

  /* The template's quiet grey, unless it fails on the chosen background:
     then the text colour, which the check below already requires. */
  function mutedFor(bg, text) { return ratio("#4a4a4a", bg) >= 4.5 ? "#4a4a4a" : text; }
  function borderFor(bg, text) { return ratio("#767676", bg) >= 3 ? "#767676" : text; }

  function theme() {
    var bg = form.elements.bg.value, text = form.elements.text.value, button = form.elements.button.value;
    var buttonText = ratio("#ffffff", button) >= ratio("#111111", button) ? "#ffffff" : "#111111";
    return { bg: bg, text: text, button: button, buttonText: buttonText, muted: mutedFor(bg, text), border: borderFor(bg, text) };
  }

  function checks(t) {
    return [
      { label: ui.c_text, value: ratio(t.text, t.bg), need: 4.5 },
      { label: ui.c_button_text, value: ratio(t.buttonText, t.button), need: 4.5 },
      { label: ui.c_button_edge, value: ratio(t.button, t.bg), need: 3 },
      { label: ui.c_link, value: ratio(t.button, t.bg), need: 4.5 },
    ];
  }

  /* ── The markup ───────────────────────────────────────────────────── */
  function chosen() {
    var L = S[form.elements.lang ? form.elements.lang.value : S.defaultLang];
    var cats = [];
    L.categories.forEach(function (c) {
      var box = form.elements["cat-" + c.name];
      if (box && box.checked) cats.push({ name: c.name, label: c.label, phrase: c.phrase, text: form.elements["text-" + c.name].value.trim() || c.text });
    });
    var own = form.elements["own-label"].value.trim();
    if (own) {
      var name = own.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "other";
      cats.push({ name: name, label: own, text: form.elements["own-text"].value.trim() });
    }
    return { L: L, cats: cats, policy: form.elements.policy.value.trim() || L.policyDefault };
  }

  function listJoin(words, and) {
    return words.length < 2 ? words.join("") : words.slice(0, -1).join(", ") + " " + and + " " + words[words.length - 1];
  }

  function markup(c) {
    var L = c.L;
    var purposes = listJoin(c.cats.map(function (x) {
      // Presets carry their mid-sentence form; an own category is used as typed,
      // lower-cased in English where labels sit mid-sentence.
      return x.phrase || (L.lowerInSentence ? x.label.charAt(0).toLowerCase() + x.label.slice(1) : x.label);
    }), L.and);
    var options = c.cats.map(function (x) {
      return '\n      <div class="consent__option">\n' +
        '        <input type="checkbox" id="consent-' + x.name + '" name="' + x.name + '">\n' +
        '        <label for="consent-' + x.name + '">' + esc(x.label) + '</label>\n' +
        '        <p>' + esc(x.text) + '</p>\n' +
        '      </div>\n';
    }).join("");
    var waiting = c.cats.map(function (x) {
      return '<script type="text/plain" data-consent="' + x.name + '" src="' + L.scriptPlaceholder + '"></' + 'script>';
    }).join("\n");
    return L.c1 + '\n' +
'<section class="consent" aria-labelledby="consent-title" hidden>\n' +
'  <div class="consent__inner">\n' +
'    <h2 class="consent__title" id="consent-title">' + L.title + '</h2>\n' +
'    <p class="consent__text">\n' +
'      ' + L.textNeed + ' ' + L.textAsk.replace("{purposes}", esc(purposes)) + ' ' + L.textChange + '\n' +
'      <a href="' + esc(c.policy) + '">' + L.policy + '</a>\n' +
'    </p>\n' +
'    <div class="consent__actions">\n' +
'      <button type="button" class="consent__button" data-consent-action="accept"\n' +
'              data-consent-message="' + L.acceptMsg + '">' + L.accept + '</button>\n' +
'      <button type="button" class="consent__button" data-consent-action="reject"\n' +
'              data-consent-message="' + L.rejectMsg + '">' + L.reject + '</button>\n' +
'      <button type="button" class="consent__button consent__button--quiet" data-consent-action="settings">' + L.settings + '</button>\n' +
'    </div>\n' +
'    <p class="visually-hidden" role="status" data-consent-status></p>\n' +
'  </div>\n' +
'</section>\n\n' +
L.c2 + '\n' +
'<dialog class="consent__dialog" aria-labelledby="consent-dialog-title">\n' +
'  <form method="dialog">\n' +
'    <h2 id="consent-dialog-title" tabindex="-1">' + L.dialogTitle + '</h2>\n' +
'    <p>' + L.dialogIntro + '</p>\n' +
'    <fieldset>\n' +
'      <legend>' + L.legend + '</legend>\n\n' +
'      <div class="consent__option">\n' +
'        <input type="checkbox" id="consent-necessary" name="necessary" checked disabled>\n' +
'        <label for="consent-necessary">' + L.necessary + ' <span class="consent__always">' + L.always + '</span></label>\n' +
'        <p>' + L.necessaryText + '</p>\n' +
'      </div>\n' + options +
'    </fieldset>\n' +
'    <div class="consent__actions">\n' +
'      <button type="submit" class="consent__button" data-consent-message="' + L.saveMsg + '">' + L.save + '</button>\n' +
'      <button type="button" class="consent__button consent__button--quiet" data-consent-action="close">' + L.cancel + '</button>\n' +
'    </div>\n' +
'  </form>\n' +
'</dialog>\n\n' +
L.c3 + '\n' +
'<button type="button" class="consent__reopen" id="consent-settings" data-consent-action="settings">' + L.dialogTitle + '</button>\n\n' +
L.c4 + '\n' + waiting + '\n\n' +
'<link rel="stylesheet" href="/cookie-banner/consent.css">\n' +
'<script src="/cookie-banner/consent.js" defer></' + 'script>\n';
  }

  /* Light mode only: dark mode keeps the template's own tested colours,
     since one picked palette cannot be checked against both schemes. */
  function css(t) {
    var vars = "  --consent-bg: " + t.bg + ";\n  --consent-text: " + t.text + ";\n  --consent-muted: " + t.muted +
      ";\n  --consent-border: " + t.border + ";\n  --consent-accent: " + t.button + ";\n  --consent-focus: " + t.button +
      ";\n  --consent-button-bg: " + t.button + ";\n  --consent-button-text: " + t.buttonText + ";\n";
    return src("consent.css").replace(/\s*$/, "\n") + "\n/* " + ui.cssNote + " */\n@media not all and (prefers-color-scheme: dark) {\n  .consent,\n  .consent__dialog {\n" +
      vars.replace(/^/gm, "  ").replace(/\s+$/, "") + "\n  }\n}\n";
  }

  /* ── Preview ──────────────────────────────────────────────────────── */
  function previewDoc(snippet, styles) {
    var live = snippet.split("\n").filter(function (l) {
      var s = l.trim();
      return s.indexOf("<link") !== 0 && s.indexOf("<script") !== 0;
    }).join("\n").replace(/<!--[\s\S]*?-->/g, "").replace('class="consent" aria-labelledby', 'class="consent" data-preview aria-labelledby');
    // Its own storage key: the preview shares this page's origin, and
    // must neither read nor overwrite the visitor's real choice here.
    var js = src("consent.js").replace('"consent-v1"', '"consent-builder-preview-" + Math.random()').replace(/<\/script/g, "<\\/script");
    return '<!doctype html><html lang="' + (form.elements.lang ? form.elements.lang.value : S.defaultLang) + '"><head><meta charset="utf-8"><title>' + ui.previewTitle + '</title><style>' +
      styles + '\nbody{margin:0;padding:16px;font-family:system-ui,sans-serif;font-size:18px;line-height:1.5;letter-spacing:0.01em;background:#f4f4f4;color:#1a1a1a}' +
      '@media (prefers-color-scheme: dark){body{background:#222;color:#f2f2f2}}</style></head><body><p>' + ui.previewPage + '</p>' +
      live + '<script>' + js + '<\/script></body></html>';
  }

  /* ── Render ───────────────────────────────────────────────────────── */
  var current = null;
  function render(announce) {
    var c = chosen();
    if (!c.cats.length) {
      none.hidden = false; result.hidden = true; current = null;
      if (announce) say(ui.noneSay);
      return;
    }
    none.hidden = true; result.hidden = false;
    var t = theme();
    var html = markup(c), styles = css(t);
    var fails = 0;
    contrastList.innerHTML = checks(t).map(function (k) {
      var ok = k.value >= k.need; if (!ok) fails++;
      return "<li>" + esc(k.label) + ": <strong>" + k.value.toFixed(1) + ":1</strong> — " +
        (ok ? ui.pass : ui.fail.replace("{need}", k.need)) + "</li>";
    }).join("");
    out.textContent = html;
    document.getElementById("builder-css").textContent = styles;
    document.getElementById("builder-js").textContent = src("consent.js");
    preview.srcdoc = previewDoc(html, styles);
    current = { html: html, css: styles, fails: fails, lang: form.elements.lang ? form.elements.lang.value : S.defaultLang };
    if (announce) say(fails ? (fails === 1 ? ui.failSay : ui.failSayMany).replace("{n}", fails) : ui.readySay);
  }

  // Each category's description field only while the category is chosen.
  function syncFields() {
    S[S.defaultLang].categories.forEach(function (c) {
      var box = form.elements["cat-" + c.name], row = document.getElementById("row-" + c.name);
      if (box && row) row.hidden = !box.checked;
    });
  }

  // Switching language swaps the prefilled category wording, unless edited.
  function relabel() {
    if (!form.elements.lang) return;
    var L = S[form.elements.lang.value];
    L.categories.forEach(function (c) {
      var area = form.elements["text-" + c.name];
      if (area && !area.dataset.edited) area.value = c.text;
      var lab = document.getElementById("label-" + c.name);
      if (lab) lab.textContent = c.label;
    });
    if (!form.elements.policy.dataset.edited) form.elements.policy.value = L.policyDefault;
  }

  form.addEventListener("input", function (e) {
    if (e.target.tagName === "TEXTAREA" || e.target.name === "policy") e.target.dataset.edited = "1";
    if (e.target.name === "lang") relabel();
    syncFields();
    render(false);
  });
  form.addEventListener("change", function () { render(true); });
  form.addEventListener("submit", function (e) { e.preventDefault(); render(true); });

  /* ── Copy and download ────────────────────────────────────────────── */
  var viewerSave = (window.claude && window.claude.use) ? window.claude.use("downloads") : Promise.resolve(null);
  function save(blob, name) {
    viewerSave.then(function (dl) {
      if (dl) return dl.save({ filename: name, data: blob }).then(function () { say(ui.saved.replace("{name}", name)); }, function () { say(ui.notSaved); });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      say(ui.saved.replace("{name}", name));
    });
  }
  document.querySelectorAll("[data-builder-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!current) return;
      var code = document.getElementById(b.dataset.builderCopy), name = code.parentNode.getAttribute("aria-label");
      navigator.clipboard.writeText(code.textContent).then(function () { say(ui.copied.replace("{name}", name)); }, function () {
        // Clipboard refused: select the code so Ctrl+C or Cmd+C takes it.
        var range = document.createRange(); range.selectNodeContents(code);
        var sel = getSelection(); sel.removeAllRanges(); sel.addRange(range);
        say(ui.notCopied);
      });
    });
  });
  document.getElementById("builder-download").addEventListener("click", function () {
    if (!current) return;
    var snippetName = "consent.html";
    if (!window.JSZip) {
      save(new Blob([current.html], { type: "text/html" }), snippetName);
      return;
    }
    var zip = new JSZip();
    zip.file(snippetName, current.html);
    zip.file("consent.css", current.css);
    zip.file("consent.js", src("consent.js"));
    zip.generateAsync({ type: "blob" }).then(function (b) { save(b, "consent-banner.zip"); });
  });

  syncFields();
  render(false);
})();
