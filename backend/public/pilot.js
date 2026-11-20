/* The pilot form's behaviour (pilot.html). A file of its own because the
   server's Content-Security-Policy allows scripts from 'self' only.

   The form is a conversation of a few fixed slots, asked one at a time:
   what the person uses, which page, what happened, at most one follow-up,
   then the written report. Each answered slot is a turn; what is sent is
   read off the turns (fields()), so changing an earlier answer is putting
   a new turn in its place. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var composer = $("composer");
  var answer = $("answer");

  var USES = [
    { value: "screen-reader", label: "A screen reader" },
    { value: "keyboard-only", label: "Only a keyboard" },
    { value: "screen-magnifier", label: "A screen magnifier" },
    { value: "voice-control", label: "Voice control" },
    { value: "switch", label: "A switch" },
    { value: "other", label: "Something else" }
  ];
  // What people on each technology most often meet, as sentences they can
  // pick instead of typing. A picked one is sent marked as picked, and the
  // follow-up then asks which element or where.
  var HAPPENED = {
    "screen-reader": ["A button or link had no name", "An image had no description", "A form field had no label", "I got stuck in a pop-up"],
    "keyboard-only": ["I couldn’t reach something", "I got stuck and couldn’t move on", "I couldn’t see the focus", "The focus jumped around"],
    "screen-magnifier": ["Text was too faint", "Things were cut off when zoomed", "Something moved and wouldn’t stop"],
    "voice-control": ["A button didn’t respond to its name", "A control had no name to say", "I couldn’t reach something"],
    "switch": ["I couldn’t reach something", "It took too many presses", "A time limit ran out"],
    "other": ["I couldn’t reach something", "I couldn’t read something", "I couldn’t tell what something was"]
  };
  // The same words as CHANGE_QUESTION in services/pilot/pilot.ts.
  var CHANGE_QUESTION = "Change asked after reading the draft";

  var state = {
    turns: [],      // answered slots: { step, ask, text, typed, patch, note }
    step: null,     // the question on the table
    after: null,    // turns set aside while an earlier answer is changed
    draft: null,
    model: null,
    noFollow: false, // the server had no follow-up for this report
    sent: false,    // the report is sent: its answers can no longer be changed
    typing: false,  // the last answer was typed, not picked
    gen: 0          // goes up when an answer is changed, so a reply to the old one is dropped
  };

  function say(text) {
    // Cleared first, so the same words twice are still announced.
    $("status").textContent = "";
    setTimeout(function () { $("status").textContent = text; }, 50);
  }

  // Old invitation links carried ?code=…; there is no code any more, so it
  // is taken out of the address bar and ignored.
  if (new URLSearchParams(location.search).has("code")) history.replaceState(null, "", location.pathname);

  // What a participant answers the same way every time (what they use) is
  // kept on their own device, so a second report starts at the page. So is
  // a random id made here, never their name, so the server can count how
  // many people reported without anyone signing in. Browser storage can be
  // missing or blocked; the form works the same without it, and each
  // report then counts as a new person.
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
  function remember(patch) {
    try {
      localStorage.setItem(MEMORY, JSON.stringify({
        participant: participant, assistiveTech: patch.assistiveTech, assistiveTechDetail: patch.assistiveTechDetail || ""
      }));
    } catch (e) { /* storage blocked: nothing to remember */ }
  }
  function useLabel(value) {
    for (var i = 0; i < USES.length; i++) if (USES[i].value === value) return USES[i].label;
    return "";
  }
  function rememberedTurns() {
    var me = remembered();
    if (!useLabel(me.assistiveTech)) return [];
    return [{
      step: stepUse(), ask: stepUse().ask,
      text: me.assistiveTechDetail || useLabel(me.assistiveTech), typed: Boolean(me.assistiveTechDetail),
      patch: { assistiveTech: me.assistiveTech, assistiveTechDetail: me.assistiveTechDetail || "" },
      note: "Remembered on this device."
    }];
  }

  /* ---- what is sent: read off the turns ---- */

  function fields() {
    var f = { followUps: [] };
    state.turns.forEach(function (t) {
      Object.keys(t.patch).forEach(function (k) {
        if (k === "followUp") f.followUps.push(t.patch[k]); else f[k] = t.patch[k];
      });
    });
    return f;
  }
  function payload() {
    var f = fields();
    return {
      participant: participant,
      assistiveTech: f.assistiveTech,
      assistiveTechDetail: f.assistiveTechDetail || undefined,
      pageUrl: f.pageUrl || "",
      pageTitle: f.pageTitle || undefined,
      barrier: f.barrier || "",
      barrierPicked: Boolean(f.barrierPicked),
      followUps: f.followUps,
      company_url: $("company_url").value || undefined,
      lang: "en"
    };
  }

  /* ---- the questions ---- */

  // What they typed for "what do you use", read as one of the six kinds;
  // the words themselves go along as the detail ("NVDA with Firefox").
  function guessUse(text) {
    var t = text.toLowerCase();
    if (/screen ?reader|nvda|jaws|voice ?over|talkback|narrator|orca|braille/.test(t)) return "screen-reader";
    if (/magnif|zoomtext|supernova|zoom|enlarg/.test(t)) return "screen-magnifier";
    if (/voice|dragon|speech|dictat/.test(t)) return "voice-control";
    if (/switch/.test(t)) return "switch";
    if (/keyboard/.test(t)) return "keyboard-only";
    return "other";
  }

  function stepUse() {
    return {
      id: "use", make: stepUse,
      ask: "What do you use?",
      hint: "Pick one, or type it.",
      picks: USES.map(function (u) { return { label: u.label, patch: { assistiveTech: u.value, assistiveTechDetail: "" } }; }),
      typed: function (text) { commit(this, text, { assistiveTech: guessUse(text), assistiveTechDetail: text.slice(0, 200) }, "", true); }
    };
  }

  var NO_PAGE = { label: "I don’t have it", patch: { pageUrl: "", pageTitle: "", pageAsked: true } };
  function stepPage() {
    return {
      id: "page", make: stepPage, url: true,
      ask: fields().barrier ? "And the page’s address?" : "Which page?",
      hint: "Type or paste the address.",
      picks: [NO_PAGE],
      typed: readPage
    };
  }
  // A reading that needs a yes before it is used: an address the server
  // guessed from a misspelling, or one it could not reach.
  function stepConfirm(r) {
    var step = {
      id: "page", url: true,
      ask: r.guessed ? "Did you mean " + r.url + "?" : "We couldn’t reach " + r.url + ". Keep it?",
      hint: "Or type it again.",
      picks: [{
        label: r.guessed ? "Yes" : "Keep it", text: r.url,
        patch: { pageUrl: r.url, pageTitle: r.title || "", pageAsked: true },
        note: r.title ? "Page found: " + r.title : ""
      }, NO_PAGE],
      typed: readPage
    };
    // Changed later, it is asked afresh, not as this yes-or-no.
    step.make = stepPage;
    return step;
  }

  // The address field reads what was typed the way a chat would (backend
  // services/pilot/readAddress.ts): "acsessobilty nl" comes back as
  // https://accessibility.nl. A correction the model guessed is asked
  // about before it is used; a sentence typed here is taken as what
  // happened. The page's title comes back too and goes to the model.
  var readings = {};
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
  function readPage(raw) {
    var step = this;
    var gen = state.gen;
    wait("Checking the address…");
    readingFor(raw).then(function (r) {
      if (gen !== state.gen) return;
      // The lookup was out of reach: the server normalises what it can
      // when the report is drafted, and says if it cannot.
      if (!r) return commit(step, raw, { pageUrl: raw, pageTitle: "", pageAsked: true }, "", true);
      if (r.words) {
        return r.url
          ? commit(step, raw, { barrier: raw, barrierPicked: false, pageUrl: r.url, pageTitle: r.title || "", pageAsked: true }, "Taken as what happened. Page: " + r.url, true)
          : commit(step, raw, { barrier: raw, barrierPicked: false }, "Taken as what happened.", true);
      }
      if (!r.url) return ask(step, { prefill: raw, error: "That isn’t a web address. Try again." });
      if (r.guessed || !r.reached) return ask(stepConfirm(r));
      commit(step, r.url, { pageUrl: r.url, pageTitle: r.title || "", pageAsked: true }, r.title ? "Page found: " + r.title : "", true);
    });
  }

  function stepHappened() {
    var f = fields();
    var picks = (HAPPENED[f.assistiveTech] || HAPPENED.other).map(function (p) {
      return { label: p, patch: { barrier: p, barrierPicked: true } };
    });
    // With an address, the page can be scanned and the report written from
    // what the scan measures.
    if (f.pageUrl) picks.push({ label: "Scan the page instead", patch: { scanOnly: true } });
    return {
      id: "happened", make: stepHappened,
      ask: "What happened?",
      hint: "One sentence is enough. Enter sends.",
      picks: picks,
      typed: function (text) { commit(this, text, { barrier: text, barrierPicked: false }, "", true); }
    };
  }

  function stepFollow(question, suggestions) {
    var patchFor = function (a) { return { followUp: { question: question, answer: a.slice(0, 1000) }, followDone: true }; };
    var step = {
      id: "follow",
      ask: question,
      hint: "",
      picks: suggestions.map(function (s) { return { label: s, patch: patchFor(s) }; }).concat([{ label: "Skip", text: "Skipped", patch: { followDone: true } }]),
      typed: function (text) { commit(this, text, patchFor(text), "", true); }
    };
    step.make = function () { return step; };
    return step;
  }

  // Under the written report: what they type is a change to it. A report
  // that came from a scan has none of their words yet, so what they type
  // there is what happened, and the report is written from that instead.
  function stepChange() {
    var scan = Boolean(state.draft && state.draft.fromScan);
    return {
      id: "change",
      ask: "Anything wrong?",
      hint: scan ? "Say what happened and we write it again." : "Say what to change and we write it again.",
      picks: [],
      button: "Write it again",
      typed: function (text) {
        if (scan) {
          state.turns = state.turns.filter(function (t) { return !t.patch.scanOnly; });
          state.draft = null;
          commit(stepHappened(), text, { barrier: text, barrierPicked: false }, "", true);
          return;
        }
        var change = text.slice(0, 1000);
        state.turns.push({ step: this, ask: this.ask, text: text, typed: true, patch: { followUp: { question: CHANGE_QUESTION, answer: change } }, note: "" });
        renderLog();
        requestDraft({ previous: state.draft, change: change });
      }
    };
  }

  /* ---- the conversation ---- */

  function renderLog() {
    var log = $("log");
    log.textContent = "";
    state.turns.forEach(function (t, i) {
      var turn = document.createElement("div");
      turn.className = "turn";
      var q = document.createElement("p");
      q.className = "ask";
      q.textContent = t.ask;
      var row = document.createElement("div");
      row.className = "row said";
      var a = document.createElement("p");
      a.className = "said-text";
      var who = document.createElement("span");
      who.className = "visually-hidden";
      who.textContent = "You: ";
      a.appendChild(who);
      a.appendChild(document.createTextNode(t.text));
      row.appendChild(a);
      // A change asked of the draft is not changed itself: say another.
      if (t.step.id !== "change" && !state.sent) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "change";
        b.textContent = "Change";
        b.setAttribute("aria-label", "Change answer: " + t.ask);
        b.addEventListener("click", function () { edit(i); });
        row.appendChild(b);
      }
      turn.appendChild(q);
      turn.appendChild(row);
      if (t.note) {
        var n = document.createElement("p");
        n.className = "note";
        n.textContent = t.note;
        turn.appendChild(n);
      }
      log.appendChild(turn);
    });
  }

  function part(id, on) { $(id).hidden = !on; }

  // Puts a question on the table. Someone who typed their last answer is
  // kept in the field; someone who picked it lands on the question, so a
  // phone's keyboard does not open over the answers to pick.
  function ask(step, o) {
    o = o || {};
    state.step = step;
    part("wait", false); part("nodraft", false); part("done", false);
    if (step.id !== "change") part("review", false);
    $("ask").textContent = step.ask;
    $("ask-hint").textContent = step.hint || "";
    answer.value = o.prefill || "";
    if (step.url) {
      answer.setAttribute("inputmode", "url");
      answer.setAttribute("autocapitalize", "off");
      answer.setAttribute("spellcheck", "false");
    } else {
      answer.removeAttribute("inputmode");
      answer.removeAttribute("autocapitalize");
      answer.removeAttribute("spellcheck");
    }
    var err = $("answer-error");
    err.textContent = o.error || "";
    err.hidden = !o.error;
    if (o.error) answer.setAttribute("aria-invalid", "true"); else answer.removeAttribute("aria-invalid");
    answer.setAttribute("aria-describedby", (o.error ? "answer-error " : "") + "ask-hint picks-count");

    var picks = $("picks");
    picks.textContent = "";
    step.picks.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice";
      b.textContent = p.label;
      b.addEventListener("click", function () { commit(step, p.text || p.label, p.patch, p.note || "", false); });
      picks.appendChild(b);
    });
    picks.hidden = !step.picks.length;
    $("picks-count").textContent = step.picks.length ? step.picks.length + " answers to pick follow." : "";
    $("answer-btn").textContent = step.button || "Answer";
    composer.hidden = false;
    grow();
    if (o.quiet) return;
    if (o.error || state.typing) {
      if (document.activeElement === answer) say((o.error ? "Error: " + o.error + " " : "") + step.ask + (step.hint ? " " + step.hint : ""));
      else answer.focus();
    } else {
      $("ask").focus();
    }
  }

  // An answer is given: it becomes a turn, and the next question follows.
  function commit(step, text, patch, note, typed) {
    state.typing = Boolean(typed);
    state.turns.push({ step: step, ask: step.make === stepPage ? stepPage().ask : step.ask, text: text, typed: Boolean(typed), patch: patch, note: note || "" });
    if (patch.assistiveTech) remember(patch);
    // An earlier answer was changed: what came after it goes back on,
    // unless it hung on the old answer.
    if (state.after) {
      var hasPage = Boolean(fields().pageUrl);
      state.after.forEach(function (t) {
        if (t.step.id === step.id) return;
        if (step.id === "happened" && t.step.id === "follow") return;
        if (t.patch.scanOnly && !hasPage) return;
        state.turns.push(t);
      });
      state.after = null;
    }
    renderLog();
    next();
  }

  // Change on an answered question: it is asked again, with what they
  // typed still in the field.
  function edit(i) {
    var t = state.turns[i];
    state.gen++;
    state.draft = null;
    state.noFollow = false;
    // A change they asked of the draft stays with the report as their
    // words, unless what happened is itself being changed.
    state.after = state.turns.slice(i + 1).filter(function (x) { return !(x.step.id === "change" && t.step.id === "happened"); });
    state.turns = state.turns.slice(0, i);
    state.typing = true;
    renderLog();
    ask(t.step.make(), { prefill: t.typed ? t.text : "" });
  }

  function next() {
    var f = fields();
    if (!f.assistiveTech) return ask(stepUse());
    if (!f.pageAsked) return ask(stepPage());
    if (!f.barrier && !f.scanOnly) return ask(stepHappened());
    if (f.barrier && !f.followDone && !state.noFollow) return fetchFollow();
    requestDraft();
  }

  // A wait: nothing to answer, so the question goes away and the line
  // saying what is happening takes focus, which reads it out.
  function wait(text) {
    composer.hidden = true;
    part("review", false); part("nodraft", false); part("done", false);
    $("wait").textContent = text;
    part("wait", true);
    $("wait").focus();
  }

  // The one follow-up (backend nextFollowUp): the model's question when it
  // answers within its ten seconds, the scripted one when it does not,
  // none when the report already says enough.
  function fetchFollow() {
    var gen = state.gen;
    wait("One moment…");
    var stop = new AbortController();
    var timer = setTimeout(function () { stop.abort(); }, 15000);
    fetch("/api/pilot/followup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
      signal: stop.signal
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (res) {
      clearTimeout(timer);
      if (gen !== state.gen) return;
      if (!res || !res.question) { state.noFollow = true; next(); return; }
      ask(stepFollow(res.question, res.suggestions || []));
    });
  }

  /* ---- the written report ---- */

  var lastRequest = null;
  function requestDraft(revise) {
    var gen = state.gen;
    var body = payload();
    var scanning = !body.barrier;
    if (revise) {
      body.previous = revise.previous;
      body.change = revise.change;
      // The change is the last thing they said; the request names it on
      // its own, so it is not sent twice.
      body.followUps = body.followUps.slice(0, -1);
    }
    lastRequest = revise || null;
    wait(scanning
      ? "Scanning the page. Up to three minutes."
      : revise ? "Writing it again. Up to two minutes." : "Writing your report. Up to two minutes.");
    fetch("/api/pilot/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (b) { return { status: r.status, body: b }; });
    }).then(function (res) {
      if (gen !== state.gen) return;
      if (res.status === 400) { badAnswer(res.body.fields || []); return; }
      if (res.status !== 200) { noDraft("The writing step is down.", true, revise); return; }
      if (!res.body.draft) {
        var why = {
          not_configured: "The language model is off. Your report can go as you wrote it.",
          timeout: "The language model was still starting. It is usually ready now.",
          scan_failed: "We couldn’t scan that page. Change your last answer to say what happened, or send just the address.",
          scan_clean: "The scan found nothing it could measure. Change your last answer to say what happened, or send just the address."
        }[res.body.reason] || "The language model slipped.";
        // Worth another go when the model was slow or slipped once; not
        // when it is off, or the scan could not read the page.
        noDraft(why, res.body.reason === "timeout" || res.body.reason === "failed", revise);
        return;
      }
      state.draft = res.body.draft;
      state.model = res.body.model;
      showReview(revise ? "Your report is written again." : "");
    }).catch(function () {
      if (gen !== state.gen) return;
      noDraft("We couldn’t reach the writing step.", true, revise);
    });
  }

  // The server refused an answer. The address is the only one it can
  // refuse that the form let through (the lookup was out of reach).
  function badAnswer(names) {
    var i = -1;
    state.turns.forEach(function (t, n) { if (t.step.id === "page") i = n; });
    if (names.indexOf("pageUrl") === -1 || i === -1) {
      noDraft("Something in your answers could not be read. Change one above.", false);
      return;
    }
    var text = state.turns[i].typed ? state.turns[i].text : "";
    edit(i);
    ask(stepPage(), { prefill: text, error: "That isn’t a web address. Try again." });
  }

  function showReview(said) {
    var d = state.draft;
    $("review-intro").textContent = d.fromScan ? "From a scan of the page, not from your words." : "";
    $("draft-meta").textContent = "Written by " + state.model + ", a language model on our own server.";
    renderDraft(d);
    $("send-btn").textContent = "Send report";
    part("wait", false);
    part("review", true);
    ask(stepChange(), { quiet: true });
    $("review-title").focus();
    if (said) say(said);
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

  // No draft came back. `again`: the model was slow or slipped, so Try
  // again leads. A change that could not be written leaves the report they
  // already read standing.
  function noDraft(reason, again, revise) {
    if (revise && state.draft) {
      showReview("");
      say(reason + " Your report is as it was.");
      return;
    }
    state.draft = null;
    composer.hidden = true;
    part("wait", false);
    $("nodraft-reason").textContent = reason;
    $("retry-btn").hidden = !again;
    $("send-plain-btn").textContent = "Send as written";
    $("send-plain-btn").classList.toggle("primary", !again);
    part("nodraft", true);
    $("nodraft-title").focus();
  }

  function send(btn, idle) {
    if (btn.disabled) return;
    var body = payload();
    // They read the whole report and pressed Send: it goes as they saw it.
    if (state.draft) {
      body.draft = state.draft;
      body.confirmed = true;
    }
    btn.disabled = true;
    btn.textContent = "Sending…";
    say("Sending your report.");
    fetch("/api/pilot/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      btn.disabled = false;
      btn.textContent = idle;
      composer.hidden = true;
      part("review", false); part("nodraft", false);
      state.sent = true;
      renderLog();
      part("done", true);
      $("done-title").focus();
    }).catch(function () {
      btn.disabled = false;
      // Said on the button too, so it is seen as well as heard.
      btn.textContent = "Not sent. Try again";
      say("Your report could not be sent. Nothing is lost. Press the button to try again.");
    });
  }

  /* ---- wiring ---- */

  // The field grows with what is typed, so a sentence is never scrolled
  // inside a one-line box.
  function grow() {
    answer.style.height = "auto";
    answer.style.height = answer.scrollHeight + "px";
  }
  answer.addEventListener("input", grow);
  // Enter sends, as in a chat; Shift and Enter starts a new line.
  answer.addEventListener("keydown", function (ev) {
    if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) {
      ev.preventDefault();
      submit();
    }
  });
  function submit() {
    var text = answer.value.trim();
    if (!state.step || composer.hidden) return;
    if (!text) {
      ask(state.step, { error: state.step.picks.length ? "Type an answer, or pick one." : "Type what to change, or send the report." });
      return;
    }
    state.typing = true;
    state.step.typed(text);
  }
  composer.addEventListener("submit", function (ev) { ev.preventDefault(); submit(); });

  $("send-btn").addEventListener("click", function () { send(this, "Send report"); });
  $("send-plain-btn").addEventListener("click", function () { send(this, "Send as written"); });
  $("retry-btn").addEventListener("click", function () { requestDraft(lastRequest); });
  $("again-btn").addEventListener("click", function () {
    state.gen++;
    state.sent = false;
    state.turns = rememberedTurns();
    state.after = null;
    state.draft = null;
    state.noFollow = false;
    renderLog();
    next();
  });

  fetch("/api/pilot").then(function (r) { return r.json(); }).then(function (info) {
    if (!info.open || (!info.stores && !info.mails)) {
      $("closed").hidden = false;
      $("intro").hidden = true;
      return;
    }
    var talk = $("talk");
    talk.hidden = false;
    state.turns = rememberedTurns();
    renderLog();
    // The first question waits where it is: the page's own heading and
    // two lines are read first.
    var f = fields();
    ask(f.assistiveTech ? stepPage() : stepUse(), { quiet: true });
    // The model's worker sleeps when idle and takes over 100 seconds to
    // wake (measured on the live service, 20 Nov 2026: a follow-up asked
    // 100s after the wake call still missed its ten seconds, and the first
    // report took 87s; warm, they took 1s and 4s). Someone who picks their
    // answers reaches the follow-up in ten or twenty seconds, so the
    // waking starts as the page opens (user's instruction, 20 Nov 2026),
    // not at the first answer. It is asked once more at the first press or
    // move into the conversation, for someone who read the page for a
    // while first; a press counts as well as focus, because Safari does
    // not focus a button that is clicked. The server lets one call through
    // per two minutes, however many pages ask.
    var wake = function () {
      fetch("/api/pilot/wake", { method: "POST" }).catch(function () { /* the draft still works, only slower */ });
    };
    wake();
    var wakeAgain = function () {
      talk.removeEventListener("focusin", wakeAgain);
      talk.removeEventListener("pointerdown", wakeAgain);
      wake();
    };
    talk.addEventListener("focusin", wakeAgain);
    talk.addEventListener("pointerdown", wakeAgain);
  }).catch(function () {
    $("closed").hidden = false;
    $("closed").textContent = "The pilot could not be reached. Please try again later.";
  });
})();
