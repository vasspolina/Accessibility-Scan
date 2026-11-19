/* The cookie banner chat. The visitor describes their site; the backend
   (POST /api/cookie-banner/chat) asks Claude, which answers in words and
   fills in the builder form through a set_banner call. This script applies
   that banner to the form and lets builder.js do the rest: files, contrast
   check, preview. With no backend the chat says so and the form still works.

   The conversation lives here and goes to the server whole on every turn.
   Assistant turns are stored exactly as returned, because the API ties
   their thinking blocks to the conversation that produced them. */
(function () {
  var box = document.getElementById("cookie-chat");
  var form = document.getElementById("builder");
  if (!box || !form) return;
  var T = JSON.parse(document.getElementById("cookie-chat-strings").textContent);
  var log = document.getElementById("cookie-chat-log");
  var chatForm = document.getElementById("cookie-chat-form");
  var input = document.getElementById("cookie-chat-input");
  var send = document.getElementById("cookie-chat-send");
  var status = document.getElementById("cookie-chat-status");

  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var API = (local ? "http://localhost:8787" : "https://a11y-checker-v2-production.up.railway.app") + "/api/cookie-banner/chat";

  var history = [];
  var KNOWN = ["analytics", "media", "marketing", "preferences"];

  function turn(who, text, note) {
    var li = document.createElement("li");
    li.className = "cookie-chat__turn cookie-chat__turn--" + (who === T.you ? "you" : "bot");
    var w = document.createElement("span");
    w.className = "cookie-chat__who"; w.textContent = who;
    li.appendChild(w);
    if (text) { var p = document.createElement("p"); p.textContent = text; li.appendChild(p); }
    if (note) { var n = document.createElement("p"); n.className = "cookie-chat__note"; n.textContent = note; li.appendChild(n); }
    log.appendChild(li);
  }

  function say(t) { status.textContent = t; }

  function textOf(messages) {
    return messages.filter(function (m) { return m.role === "assistant"; }).map(function (m) {
      if (typeof m.content === "string") return m.content;
      return m.content.filter(function (b) { return b.type === "text"; }).map(function (b) { return b.text; }).join("");
    }).join("\n\n").trim();
  }

  function fire(el, type) { el.dispatchEvent(new Event(type, { bubbles: true })); }

  /* Put the banner into the form the way a person would, then let the
     form's own listeners re-render. */
  function apply(b) {
    var lang = form.elements.lang;
    if (lang && lang.value !== b.language) {
      var radio = document.getElementById("lang-" + b.language);
      if (radio) { radio.checked = true; fire(radio, "input"); }
    }
    if (b.policy_url) { form.elements.policy.value = b.policy_url; form.elements.policy.dataset.edited = "1"; }
    var byName = {};
    b.categories.forEach(function (c) { byName[c.name] = c; });
    KNOWN.forEach(function (name) {
      var check = form.elements["cat-" + name], area = form.elements["text-" + name];
      if (!check) return;
      check.checked = !!byName[name];
      if (byName[name] && area) { area.value = byName[name].text; area.dataset.edited = "1"; }
    });
    var other = byName.other;
    form.elements["own-label"].value = other ? other.label : "";
    form.elements["own-text"].value = other ? other.text : "";
    [["c-bg", "background"], ["c-text", "text"], ["c-button", "button"]].forEach(function (p) {
      var v = b.colours[p[1]];
      if (/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById(p[0]).value = v.toLowerCase();
    });
    fire(form.elements.policy, "input");
    form.dispatchEvent(new Event("change"));
  }

  chatForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = input.value.trim();
    if (!text || send.disabled) return;
    turn(T.you, text);
    history.push({ role: "user", content: text });
    input.value = "";
    send.disabled = true;
    say(T.wait);
    fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history }) })
      .then(function (r) {
        if (r.ok) return r.json();
        throw { status: r.status };
      })
      .then(function (data) {
        history = history.concat(data.messages);
        if (data.banner) apply(data.banner);
        turn(T.bot, textOf(data.messages), data.banner ? T.applied : "");
        say("");
      })
      .catch(function (err) {
        // The turn did not happen: take it back out so the conversation
        // the server sees next time is still a valid one, and give the
        // visitor their words back.
        history.pop();
        log.removeChild(log.lastChild);
        input.value = text;
        var s = err && err.status;
        say(s === 503 ? T.off : s === 429 ? T.busy : s === 413 ? T.long : !s ? T.off : T.failed);
      })
      .then(function () { send.disabled = false; input.focus(); });
  });

  // Enter sends; Shift+Enter is a new line.
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); chatForm.requestSubmit(); }
  });
})();
