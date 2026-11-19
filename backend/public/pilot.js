/* The pilot form's behaviour (pilot.html). A file of its own because the
   server's Content-Security-Policy allows scripts from 'self' only. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("report");
  var state = { fields: null, draft: null, model: null };
  var LABELS = {
    assistiveTech: "What do you use",
    pageUrl: "The page's address",
    barrier: "What happened"
  };
  var FIRST_INPUT = {
    barrier: "barrier", pageUrl: "pageUrl",
    assistiveTech: function () { return form.querySelector('input[name="assistiveTech"]'); }
  };

  function say(text) {
    // Cleared first, so the same words twice are still announced.
    $("status").textContent = "";
    setTimeout(function () { $("status").textContent = text; }, 50);
  }
  function show(id) {
    ["report", "review", "nodraft", "done"].forEach(function (s) { $(s).hidden = s !== id; });
    $("intro").hidden = id !== "report";
  }
  function focusEl(el) { if (el) el.focus(); }
  function inputFor(name) {
    var f = FIRST_INPUT[name];
    return typeof f === "function" ? f() : $(f);
  }

  // Old invitation links carried ?code=…; there is no code any more, so it
  // is taken out of the address bar and ignored.
  if (new URLSearchParams(location.search).has("code")) history.replaceState(null, "", location.pathname);

  // What a participant answers the same way every time (what they use) is
  // kept on their own device, so a second report is the page and a
  // sentence. So is a random id made here, never their name, so the
  // server can count how many people reported without anyone signing in.
  // Browser storage can be missing or blocked; the form works the same
  // without it, and each report then counts as a new person.
  var MEMORY = "a11y-pilot-me";
  function remembered() {
    try { return JSON.parse(localStorage.getItem(MEMORY) || "{}") || {}; } catch (e) { return {}; }
  }
  function newId() {
    var a = new Uint8Array(12);
    crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  var participant = remembered().participant || newId();
  function remember(f) {
    try {
      localStorage.setItem(MEMORY, JSON.stringify({
        participant: participant, assistiveTech: f.assistiveTech
      }));
    } catch (e) { /* storage blocked: nothing to remember */ }
  }
  (function prefill() {
    var me = remembered();
    if (me.assistiveTech) {
      var r = form.querySelector('input[name="assistiveTech"][value="' + me.assistiveTech + '"]');
      if (r) r.checked = true;
    }
  })();

  // The address field reads what was typed the way a chat would
  // (backend services/pilot/readAddress.ts): "acsessobilty nl" comes back
  // as https://accessibility.nl. Whatever the server makes of it is shown
  // under the field (a live hint the field points to), put into the field
  // once the person leaves it, never while they type, and a correction
  // the model guessed is never sent before it has stood in the field.
  // The page's title comes back too and goes to the model as context.
  var NBSP_DASH = "\u00a0\u2013 ";
  var pageTitle = "";
  var lookupTimer = null;
  var readings = {};
  var shownFor = "";
  function readingFor(raw) {
    if (!readings[raw]) {
      readings[raw] = fetch("/api/pilot/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw })
      }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      readings[raw].then(function (r) { if (!r) delete readings[raw]; });
    }
    return readings[raw];
  }
  // Worth reading while the person pauses only when it looks finished: it
  // ends in what could be a domain ending, or it has a scheme. Anything
  // else waits for them to leave the field, so half a word is not looked up.
  function looksFinished(raw) {
    return /:\/\//.test(raw) || /[.,\s][a-z]{2,}\/?$/i.test(raw) || /\s\S+\s\S+\s\S+/.test(raw);
  }
  function describe(raw, r) {
    if (!r) return "";
    if (r.words) {
      return r.url
        ? "That reads like a description, so it will go in the What happened field. We\u2019ll check " + r.url + NBSP_DASH + "change it if that\u2019s wrong."
        : "That reads like a description, not an address, so it will go in the What happened field.";
    }
    if (!r.url) return "";
    var lines = [];
    if (r.url !== raw) {
      lines.push(r.guessed
        ? "We\u2019ll check " + r.url + NBSP_DASH + "change it if that\u2019s wrong."
        : "We\u2019ll check " + r.url + ".");
    }
    if (!r.reached) lines.push("We couldn\u2019t reach that address. Check the spelling" + NBSP_DASH + "your report can still go with it.");
    else if (r.title) lines.push("Page found: " + r.title);
    return lines.join(" ");
  }
  function showReading(raw) {
    return readingFor(raw).then(function (r) {
      if ($("pageUrl").value.trim() !== raw) return r;
      pageTitle = (r && r.title) || "";
      $("page-found").textContent = describe(raw, r);
      if ($("page-found").textContent) shownFor = raw;
      return r;
    });
  }
  function moveToBarrier(raw) {
    var b = $("barrier");
    var now = b.value.trim();
    if (now.indexOf(raw) === -1) b.value = now ? now + "\n\n" + raw : raw;
  }
  // Puts the reading into the form: the address into its field, a
  // description in the What happened field. Focus stays where it is.
  function applyReading(raw, r) {
    if (!r || $("pageUrl").value.trim() !== raw) return;
    if (r.words) {
      moveToBarrier(raw);
      $("pageUrl").value = r.url || "";
      say(r.url
        ? "What you typed is now in the What happened field, and the address is " + r.url + "."
        : "What you typed is now in the What happened field.");
    } else if (r.url && r.url !== raw) {
      $("pageUrl").value = r.url;
    } else {
      return;
    }
    if (r.url) readings[r.url] = Promise.resolve({ url: r.url, words: false, guessed: false, reached: r.reached, title: r.title });
    $("page-found").textContent = r.url ? describe(raw, { url: r.url, words: false, guessed: r.guessed, reached: r.reached, title: r.title }) : "";
    shownFor = r.url || "";
  }
  $("pageUrl").addEventListener("input", function () {
    clearTimeout(lookupTimer);
    var raw = this.value.trim();
    if (!raw) { pageTitle = ""; $("page-found").textContent = ""; return; }
    if (looksFinished(raw)) lookupTimer = setTimeout(function () { showReading(raw); }, 600);
  });
  $("pageUrl").addEventListener("change", function () {
    clearTimeout(lookupTimer);
    var raw = this.value.trim();
    if (!raw) { pageTitle = ""; $("page-found").textContent = ""; return; }
    showReading(raw).then(function (r) {
      // Only once they have left the field: the value never changes under
      // someone who is typing in it.
      if (document.activeElement !== $("pageUrl")) applyReading(raw, r);
    });
  });

  fetch("/api/pilot").then(function (r) { return r.json(); }).then(function (info) {
    if (!info.open || (!info.stores && !info.mails)) {
      $("closed").hidden = false;
      $("intro").hidden = true;
      return;
    }
    form.hidden = false;
    // The model's worker sleeps when idle and takes over a minute to wake
    // (measured 19 Nov 2026). The first time someone moves into a field,
    // ask the server to start waking it, so it is up by the time they press
    // the button. Once per page; the server throttles it across pages too.
    form.addEventListener("focusin", function wake() {
      form.removeEventListener("focusin", wake);
      fetch("/api/pilot/wake", { method: "POST" }).catch(function () { /* the draft still works, only slower */ });
    });
  }).catch(function () {
    $("closed").hidden = false;
    $("closed").textContent = "The pilot could not be reached. Please try again later.";
  });

  function readFields() {
    var data = new FormData(form);
    return {
      participant: participant,
      assistiveTech: data.get("assistiveTech") || "",
      pageUrl: (data.get("pageUrl") || "").trim(),
      pageTitle: pageTitle || undefined,
      barrier: (data.get("barrier") || "").trim(),
      company_url: data.get("company_url") || undefined,
      lang: "en"
    };
  }

  function clearErrors() {
    $("errors").hidden = true;
    $("errors-list").innerHTML = "";
    Object.keys(LABELS).forEach(function (k) {
      var e = $(k + "-error");
      if (e) { e.hidden = true; e.textContent = ""; }
      var input = inputFor(k);
      if (input) {
        input.removeAttribute("aria-invalid");
        var d = (input.getAttribute("aria-describedby") || "").split(" ").filter(function (x) { return x && x !== k + "-error"; });
        if (d.length) input.setAttribute("aria-describedby", d.join(" ")); else input.removeAttribute("aria-describedby");
      }
    });
  }

  function showErrors(list) {
    clearErrors();
    list.forEach(function (item) {
      var e = $(item.field + "-error");
      if (e) { e.textContent = item.message; e.hidden = false; }
      var input = inputFor(item.field);
      if (input) {
        input.setAttribute("aria-invalid", "true");
        var d = input.getAttribute("aria-describedby");
        input.setAttribute("aria-describedby", (item.field + "-error " + (d || "")).trim());
      }
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#" + (input ? input.id || "" : "");
      a.textContent = item.message;
      a.addEventListener("click", function (ev) { ev.preventDefault(); focusEl(inputFor(item.field)); });
      li.appendChild(a);
      $("errors-list").appendChild(li);
    });
    $("errors").hidden = false;
    focusEl($("errors"));
  }

  function validate(f) {
    var errs = [];
    if (!f.assistiveTech) errs.push({ field: "assistiveTech", message: "Choose what you use" });
    if (f.pageUrl && addressProblem) errs.push({ field: "pageUrl", message: addressProblem });
    // The address alone is enough: the page is then scanned. Without it,
    // the participant's sentence is the report.
    if (!f.barrier && !f.pageUrl) errs.push({ field: "barrier", message: "Say what happened, or paste the page's address above" });
    return errs;
  }

  function busy(btn, on, text) {
    btn.disabled = on;
    if (text) btn.textContent = text;
  }

  // What the address field could not be read as, worded for the error
  // summary; empty when it reads fine or the lookup was out of reach (the
  // server then normalises what it can and says if it cannot).
  var addressProblem = "";

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var btn = $("draft-btn");
    var raw = $("pageUrl").value.trim();
    addressProblem = "";
    if (!raw) { writeUp(); return; }
    busy(btn, true, "Checking the address\u2026");
    var seen = shownFor === raw;
    readingFor(raw).then(function (r) {
      busy(btn, false, "Write up my report");
      var now = $("pageUrl").value.trim();
      // Leaving the field for the button can apply the reading a moment
      // before this runs; anything else in the field means they typed on.
      if (now !== raw && !(r && now === (r.url || ""))) return;
      if (r && !r.words && !r.url) {
        addressProblem = "We couldn\u2019t make a web address out of \u201c" + raw + "\u201d. Check it, or leave the field empty.";
        $("page-found").textContent = "";
      } else if (r && r.guessed && !seen) {
        // A correction the person has not had in front of them yet: put it
        // in the field and stop once, so nothing guessed goes unseen.
        applyReading(raw, r);
        say("We changed the address to " + r.url + ". If that\u2019s right, press Write up my report again.");
        return;
      } else {
        applyReading(raw, r);
      }
      writeUp();
    });
  });

  function writeUp() {
    var btn = $("draft-btn");
    var f = readFields();
    var errs = validate(f);
    if (errs.length) { showErrors(errs); return; }
    clearErrors();
    remember(f);
    state.fields = f;
    requestDraft(btn, "Write up my report");
  }

  // Asks for the draft of what is in state.fields. Called by the form's
  // button and by Try again on the no-draft screen; `btn` is whichever was
  // pressed, so its words say what is happening while it runs.
  function requestDraft(btn, idleText) {
    var f = state.fields;
    var scanning = !f.barrier;
    busy(btn, true, scanning ? "Scanning the page…" : "Writing up your report…");
    say(scanning
      ? "Scanning the page and writing up what it finds. This can take up to three minutes."
      : "Writing up your report. This can take up to two minutes.");
    fetch("/api/pilot/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f)
    }).then(function (r) {
      return r.json().then(function (body) { return { status: r.status, body: body }; });
    }).then(function (res) {
      busy(btn, false, idleText);
      if (res.status === 400) {
        show("report");
        showErrors((res.body.fields || []).filter(function (k) { return LABELS[k]; }).map(function (k) {
          return { field: k, message: "Check " + LABELS[k].toLowerCase() };
        }));
        return;
      }
      if (res.status !== 200) { showNoDraft("The writing-up step is not available just now.", !f.barrier, true); return; }
      if (!res.body.draft) {
        var why = {
          not_configured: "The language model is not running at the moment.",
          timeout: "The language model was still starting up, so it ran out of time. It is usually ready by now.",
          scan_failed: "We couldn't scan that page. It may block automated visits, or the address may be wrong.",
          scan_clean: "The scan didn't find anything it could measure on that page. What you met may be something only a person notices."
        }[res.body.reason] || "The language model could not write a draft this time.";
        // Worth another go when the model was slow or slipped once; not
        // when it is off, or the scan could not read the page.
        var again = res.body.reason === "timeout" || res.body.reason === "failed";
        showNoDraft(why, !f.barrier, again);
        return;
      }
      state.draft = res.body.draft;
      state.model = res.body.model;
      $("review-intro").textContent = res.body.draft.fromScan
        ? "You gave only the address, so we scanned the page and wrote this from what the scan found, not from your words. If it isn\u2019t what you met, go back and add a sentence about what happened."
        : "We wrote this from what you told us. If something in it is wrong, go back and change what you wrote.";
      $("draft-meta").textContent = "Written by " + res.body.model + ", a language model on our own server.";
      renderDraft(res.body.draft);
      show("review");
      say("Your report is ready. Read it, then send it.");
      focusEl($("review-title"));
    }).catch(function () {
      busy(btn, false, idleText);
      showNoDraft("The writing-up step could not be reached.", !f.barrier, true);
    });
  }

  // The report as finished text: no edit boxes. Every part the model left
  // out is left out here too, never shown empty.
  var IMPACT_WORDS = {
    blocked: "it stops them: they cannot go on",
    slowed: "they get there, but much more slowly",
    annoyed: "it is irritating, but it does not stop them"
  };
  function renderDraft(d) {
    $("d-title").textContent = d.title;
    $("d-explanation").textContent = d.explanation;
    $("d-who").textContent = d.whoItStops || "";
    $("d-who-part").hidden = !d.whoItStops;
    var ol = $("d-steps");
    ol.textContent = "";
    (d.steps || []).forEach(function (step) {
      var li = document.createElement("li");
      li.textContent = step;
      ol.appendChild(li);
    });
    $("d-steps-part").hidden = !(d.steps && d.steps.length);
    $("d-fix").textContent = d.fix;
    $("d-impact").textContent = d.impact ? "How much it holds people back, as the model judges it: " + IMPACT_WORDS[d.impact] + "." : "";
    $("d-impact").hidden = !d.impact;
    $("d-criterion").textContent = d.wcagCriterion ? "The model thinks this may fail WCAG success criterion " + d.wcagCriterion + ". Nobody has checked that yet." : "";
    $("d-criterion").hidden = !d.wcagCriterion;
  }

  // `again`: the model was slow or slipped, so Try again leads and Send
  // report steps back to a plain button; otherwise Send report leads.
  function showNoDraft(reason, addressOnly, again) {
    state.draft = null;
    $("nodraft-reason").textContent = reason + (again
      ? (addressOnly
        ? " Press Try again, or send just the address."
        : " Press Try again, or send your report in your own words.")
      : (addressOnly
        ? " You can go back and add a sentence about what happened, or send just the address."
        : " You can still send your report in your own words."));
    $("nodraft-title").textContent = again ? "Your report isn’t written up yet" : "Send your report as written";
    $("retry-btn").hidden = !again;
    $("send-plain-btn").classList.toggle("primary", !again);
    show("nodraft");
    focusEl($("nodraft-title"));
  }

  function send(btn, withDraft) {
    var body = Object.assign({}, state.fields);
    // They read the whole report and pressed Send: it goes as they saw it.
    if (withDraft && state.draft) {
      body.draft = state.draft;
      body.confirmed = true;
    }
    busy(btn, true, "Sending…");
    say("Sending your report.");
    fetch("/api/pilot/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      busy(btn, false, "Send report");
      if (!r.ok) throw new Error(String(r.status));
      show("done");
      focusEl($("done-title"));
    }).catch(function () {
      busy(btn, false, "Send report");
      say("Your report could not be sent. Nothing is lost: press Send report to try again.");
    });
  }

  $("send-btn").addEventListener("click", function () { send(this, true); });
  $("send-plain-btn").addEventListener("click", function () { send(this, false); });
  $("retry-btn").addEventListener("click", function () { requestDraft(this, "Try again"); });
  function back() { show("report"); focusEl($("barrier")); }
  $("back-btn").addEventListener("click", back);
  $("back-plain-btn").addEventListener("click", back);
  $("again-btn").addEventListener("click", function () {
    form.reset();
    pageTitle = ""; $("page-found").textContent = "";
    (function () {
      var me = remembered();
      var r = me.assistiveTech && form.querySelector('input[name="assistiveTech"][value="' + me.assistiveTech + '"]');
      if (r) r.checked = true;
    })();
    state = { fields: null, draft: null, model: null };
    show("report");
    focusEl($("title"));
  });
})();
