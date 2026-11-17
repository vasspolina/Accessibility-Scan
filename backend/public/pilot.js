/* The pilot form's behaviour (pilot.html). A file of its own because the
   server's Content-Security-Policy allows scripts from 'self' only. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var form = $("report");
  var state = { fields: null, draft: null, model: null };
  var LABELS = {
    code: "Your invitation code",
    assistiveTech: "What do you use",
    pageUrl: "The page's address",
    task: "What were you trying to do",
    barrier: "What happened",
    impact: "How much did it hold you back"
  };
  var FIRST_INPUT = {
    code: "code", task: "task", barrier: "barrier", pageUrl: "pageUrl",
    assistiveTech: function () { return form.querySelector('input[name="assistiveTech"]'); },
    impact: function () { return form.querySelector('input[name="impact"]'); }
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

  // An invitation can carry the code as ?code=…; it is filled in and taken
  // out of the address bar, so it does not end up in a shared link.
  var params = new URLSearchParams(location.search);
  if (params.get("code")) {
    $("code").value = params.get("code");
    history.replaceState(null, "", location.pathname);
    // Already filled in from the link, so the field is one more thing to
    // read for nothing. It comes back only if the code is refused.
    $("code").closest(".row").hidden = true;
  }

  fetch("/api/pilot").then(function (r) { return r.json(); }).then(function (info) {
    if (!info.open || (!info.stores && !info.mails)) {
      $("closed").hidden = false;
      $("intro").hidden = true;
      return;
    }
    form.hidden = false;
  }).catch(function () {
    $("closed").hidden = false;
    $("closed").textContent = "The pilot could not be reached. Please try again later.";
  });

  function readFields() {
    var data = new FormData(form);
    return {
      code: (data.get("code") || "").trim(),
      assistiveTech: data.get("assistiveTech") || "",
      assistiveTechDetail: (data.get("assistiveTechDetail") || "").trim() || undefined,
      pageUrl: (data.get("pageUrl") || "").trim(),
      task: (data.get("task") || "").trim(),
      barrier: (data.get("barrier") || "").trim(),
      impact: data.get("impact") || "",
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
      if (item.field === "code") $("code").closest(".row").hidden = false;
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
    if (!f.code) errs.push({ field: "code", message: "Enter your invitation code" });
    if (!f.assistiveTech) errs.push({ field: "assistiveTech", message: "Choose what you use" });
    if (f.pageUrl && !/^https?:\/\/\S+$/i.test(f.pageUrl)) errs.push({ field: "pageUrl", message: "Enter the address starting with https, or leave it empty" });
    if (!f.task) errs.push({ field: "task", message: "Say what you were trying to do" });
    if (!f.barrier) errs.push({ field: "barrier", message: "Say what happened" });
    if (!f.impact) errs.push({ field: "impact", message: "Choose how much it held you back" });
    return errs;
  }

  function busy(btn, on, text) {
    btn.disabled = on;
    if (text) btn.textContent = text;
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    var f = readFields();
    var errs = validate(f);
    if (errs.length) { showErrors(errs); return; }
    clearErrors();
    state.fields = f;
    var btn = $("draft-btn");
    busy(btn, true, "Writing up your report…");
    say("Writing up your report. This can take up to half a minute.");
    fetch("/api/pilot/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f)
    }).then(function (r) {
      return r.json().then(function (body) { return { status: r.status, body: body }; });
    }).then(function (res) {
      busy(btn, false, "Write up my report");
      if (res.status === 403) { showErrors([{ field: "code", message: "That code is not one we sent. Check it and try again" }]); return; }
      if (res.status === 400) {
        showErrors((res.body.fields || []).filter(function (k) { return LABELS[k]; }).map(function (k) {
          return { field: k, message: "Check " + LABELS[k].toLowerCase() };
        }));
        return;
      }
      if (res.status !== 200) { showNoDraft("The writing-up step is not available just now."); return; }
      if (!res.body.draft) {
        showNoDraft(res.body.reason === "not_configured"
          ? "The language model is not running at the moment."
          : "The language model could not write a draft this time.");
        return;
      }
      state.draft = res.body.draft;
      state.model = res.body.model;
      $("review-intro").textContent = "This is what the model wrote from your words. Change anything that is wrong, then say whether it matches.";
      $("draft-meta").textContent = "Written by " + res.body.model + ", a language model on our own server.";
      $("d-title").value = res.body.draft.title;
      $("d-explanation").value = res.body.draft.explanation;
      $("d-fix").value = res.body.draft.fix;
      if (res.body.draft.wcagCriterion) {
        $("d-criterion").textContent = "The model thinks this may fail WCAG success criterion " + res.body.draft.wcagCriterion + ". Nobody has checked that yet.";
        $("d-criterion").hidden = false;
      } else {
        $("d-criterion").hidden = true;
      }
      Array.prototype.forEach.call(document.querySelectorAll('input[name="confirm"]'), function (r) { r.checked = false; });
      show("review");
      say("Your draft is ready.");
      focusEl($("review-title"));
    }).catch(function () {
      busy(btn, false, "Write up my report");
      showNoDraft("The writing-up step could not be reached.");
    });
  });

  function showNoDraft(reason) {
    state.draft = null;
    $("nodraft-reason").textContent = reason + " You can still send your report in your own words.";
    show("nodraft");
    focusEl($("nodraft-title"));
  }

  function send(btn, withDraft) {
    var body = Object.assign({}, state.fields);
    if (withDraft) {
      var choice = document.querySelector('input[name="confirm"]:checked');
      if (!choice) {
        say("Please say whether the draft matches what happened.");
        focusEl(document.querySelector('input[name="confirm"]'));
        return;
      }
      if (choice.value === "yes") {
        body.draft = {
          title: $("d-title").value.trim(),
          explanation: $("d-explanation").value.trim(),
          fix: $("d-fix").value.trim(),
          wcagCriterion: state.draft.wcagCriterion
        };
        body.confirmed = true;
      } else {
        body.draft = null;
      }
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
  function back() { show("report"); focusEl($("barrier")); }
  $("back-btn").addEventListener("click", back);
  $("back-plain-btn").addEventListener("click", back);
  $("again-btn").addEventListener("click", function () {
    var code = $("code").value;
    form.reset();
    $("code").value = code;
    state = { fields: null, draft: null, model: null };
    show("report");
    focusEl($("title"));
  });
})();
