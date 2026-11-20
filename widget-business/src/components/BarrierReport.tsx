import { useEffect, useLayoutEffect, useReducer, useRef, useState } from "react";
import { getLang } from "../lib/i18n";
import { t, tf } from "../lib/strings";

/**
 * Report a barrier, inside the widget (user's instruction, 20 Nov 2026:
 * "merge this to the report barrier accessibility scan page"). It is the
 * assistive-technology pilot's form, which lived on its own page
 * (backend/public/pilot.html, now a redirect here), ported as it stood:
 * a conversation of a few fixed slots asked one at a time (what the person
 * uses, which page, what happened, at most one follow-up), then the report
 * the model writes, which they read and send. Same routes, same copy, same
 * rules (backend routes/pilot.ts, docs/PLAIN-LANGUAGE-AND-PILOT.md).
 *
 * The flow is imperative and was written that way: a question goes on the
 * table, an answer becomes a turn, the next question is worked out from
 * the turns. So it is kept in one controller object held in a ref, and the
 * component re-renders from it; focus moves after the render that shows
 * its target. Element lookups go through refs, never `document`: the widget
 * lives in a shadow root.
 */

type Uses = "screen-reader" | "keyboard-only" | "screen-magnifier" | "voice-control" | "switch" | "other";

interface Patch {
  assistiveTech?: Uses;
  assistiveTechDetail?: string;
  pageUrl?: string;
  pageTitle?: string;
  pageAsked?: boolean;
  barrier?: string;
  barrierPicked?: boolean;
  scanOnly?: boolean;
  followUp?: { question: string; answer: string };
  followDone?: boolean;
}
interface Pick {
  label: string;
  text?: string;
  patch: Patch;
  note?: string;
}
interface Step {
  id: "use" | "page" | "happened" | "follow" | "change";
  ask: string;
  hint: string;
  picks: Pick[];
  url?: boolean;
  button?: string;
  make: () => Step;
  typed: (text: string) => void;
}
interface Turn {
  step: Step;
  ask: string;
  text: string;
  typed: boolean;
  patch: Patch;
  note: string;
}
interface Draft {
  title: string;
  explanation: string;
  whoItStops?: string;
  steps?: string[];
  fix: string;
  impact?: "blocked" | "slowed" | "annoyed";
  wcagCriterion?: string;
  fromScan?: boolean;
}
interface Fields extends Omit<Patch, "followUp"> {
  followUps: Array<{ question: string; answer: string }>;
}
type Phase = "ask" | "wait" | "review" | "nodraft" | "done";
type Focus = "title" | "ask" | "answer" | "wait" | "review" | "nodraft" | "done" | null;

const USES: Array<{ value: Uses; label: string }> = [
  { value: "screen-reader", label: "A screen reader" },
  { value: "keyboard-only", label: "Only a keyboard" },
  { value: "screen-magnifier", label: "A screen magnifier" },
  { value: "voice-control", label: "Voice control" },
  { value: "switch", label: "A switch" },
  { value: "other", label: "Something else" },
];
// What people on each technology most often meet, as sentences they can
// pick instead of typing. A picked one is sent marked as picked, and the
// follow-up then asks which element or where.
const HAPPENED: Record<Uses, string[]> = {
  "screen-reader": ["A button or link had no name", "An image had no description", "A form field had no label", "I got stuck in a pop-up"],
  "keyboard-only": ["I couldn’t reach something", "I got stuck and couldn’t move on", "I couldn’t see the focus", "The focus jumped around"],
  "screen-magnifier": ["Text was too faint", "Things were cut off when zoomed", "Something moved and wouldn’t stop"],
  "voice-control": ["A button didn’t respond to its name", "A control had no name to say", "I couldn’t reach something"],
  switch: ["I couldn’t reach something", "It took too many presses", "A time limit ran out"],
  other: ["I couldn’t reach something", "I couldn’t read something", "I couldn’t tell what something was"],
};
// The same words as CHANGE_QUESTION in backend services/pilot/pilot.ts.
const CHANGE_QUESTION = "Change asked after reading the draft";

// The same key the stand-alone page used, so someone who reported there
// keeps their answers and their device id here.
const MEMORY = "a11y-pilot-me";
function remembered(): { participant?: string; assistiveTech?: Uses; assistiveTechDetail?: string } {
  try {
    return JSON.parse(localStorage.getItem(MEMORY) || "{}") || {};
  } catch {
    return {};
  }
}
function newId(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}
function useLabel(value: string | undefined): string {
  return USES.find((u) => u.value === value)?.label ?? "";
}
// What they typed for "what do you use", read as one of the six kinds; the
// words themselves go along as the detail ("NVDA with Firefox").
function guessUse(text: string): Uses {
  const s = text.toLowerCase();
  if (/screen ?reader|nvda|jaws|voice ?over|talkback|narrator|orca|braille/.test(s)) return "screen-reader";
  if (/magnif|zoomtext|supernova|zoom|enlarg/.test(s)) return "screen-magnifier";
  if (/voice|dragon|speech|dictat/.test(s)) return "voice-control";
  if (/switch/.test(s)) return "switch";
  if (/keyboard/.test(s)) return "keyboard-only";
  return "other";
}

const IMPACT_WORDS: Record<NonNullable<Draft["impact"]>, string> = {
  blocked: "it stops them: they cannot go on",
  slowed: "they get there, but much more slowly",
  annoyed: "it is irritating, but it does not stop them",
};

interface PageReading {
  url: string | null;
  words: boolean;
  guessed?: boolean;
  reached?: boolean;
  title?: string | null;
}

/** The conversation's state and moves; the component draws it. */
class Talk {
  turns: Turn[] = [];
  step: Step | null = null;
  after: Turn[] | null = null;
  draft: Draft | null = null;
  model: string | null = null;
  noFollow = false;
  sent = false;
  typing = false;
  gen = 0;
  phase: Phase = "ask";
  waitText = "";
  error = "";
  answer = "";
  reviewIntro = "";
  noDraftReason = "";
  canRetry = false;
  sendLabel = "Send report";
  plainLabel = "Send as written";
  sending = false;
  focus: Focus = null;
  status = "";
  trap = "";
  lastRequest: { previous: Draft; change: string } | null = null;
  /** Set by the component: whether the answer field has focus now. */
  answerFocused: () => boolean = () => false;
  readonly participant: string;
  private readings: Record<string, Promise<PageReading | null>> = {};

  constructor(private readonly apiBase: string, private readonly draw: () => void) {
    this.participant = remembered().participant || newId();
  }

  private url(path: string): string {
    return `${this.apiBase}${path}`;
  }

  say(text: string) {
    // Cleared first, so the same words twice are still announced.
    this.status = "";
    this.draw();
    setTimeout(() => {
      this.status = text;
      this.draw();
    }, 50);
  }

  private remember(patch: Patch) {
    try {
      localStorage.setItem(
        MEMORY,
        JSON.stringify({ participant: this.participant, assistiveTech: patch.assistiveTech, assistiveTechDetail: patch.assistiveTechDetail || "" })
      );
    } catch {
      /* storage blocked: nothing to remember */
    }
  }

  rememberedTurns(): Turn[] {
    const me = remembered();
    if (!useLabel(me.assistiveTech)) return [];
    const step = this.stepUse();
    return [
      {
        step,
        ask: step.ask,
        text: me.assistiveTechDetail || t(useLabel(me.assistiveTech)),
        typed: Boolean(me.assistiveTechDetail),
        patch: { assistiveTech: me.assistiveTech, assistiveTechDetail: me.assistiveTechDetail || "" },
        note: t("Remembered on this device."),
      },
    ];
  }

  /* ---- what is sent: read off the turns ---- */

  fields(): Fields {
    const f: Fields = { followUps: [] };
    for (const turn of this.turns) {
      const { followUp, ...rest } = turn.patch;
      if (followUp) f.followUps.push(followUp);
      Object.assign(f, rest);
    }
    return f;
  }

  private payload() {
    const f = this.fields();
    return {
      participant: this.participant,
      assistiveTech: f.assistiveTech,
      assistiveTechDetail: f.assistiveTechDetail || undefined,
      pageUrl: f.pageUrl || "",
      pageTitle: f.pageTitle || undefined,
      barrier: f.barrier || "",
      barrierPicked: Boolean(f.barrierPicked),
      followUps: f.followUps,
      company_url: this.trap || undefined,
      lang: getLang(),
    } as Record<string, unknown> & { barrier: string; followUps: Fields["followUps"] };
  }

  /* ---- the questions ---- */

  stepUse(): Step {
    const self = this;
    return {
      id: "use",
      make: () => self.stepUse(),
      ask: t("What do you use?"),
      hint: t("Pick one, or type it."),
      picks: USES.map((u) => ({ label: t(u.label), patch: { assistiveTech: u.value, assistiveTechDetail: "" } })),
      typed(text) {
        self.commit(this, text, { assistiveTech: guessUse(text), assistiveTechDetail: text.slice(0, 200) }, "", true);
      },
    };
  }

  private noPage(): Pick {
    return { label: t("I don’t have it"), patch: { pageUrl: "", pageTitle: "", pageAsked: true } };
  }

  stepPage(): Step {
    const self = this;
    return {
      id: "page",
      make: () => self.stepPage(),
      url: true,
      ask: this.fields().barrier ? t("And the page’s address?") : t("Which page?"),
      hint: t("Type or paste the address."),
      picks: [this.noPage()],
      typed(text) {
        self.readPage(this, text);
      },
    };
  }

  // A reading that needs a yes before it is used: an address the server
  // guessed from a misspelling, or one it could not reach.
  private stepConfirm(r: PageReading & { url: string }): Step {
    const self = this;
    return {
      id: "page",
      url: true,
      ask: r.guessed ? tf("Did you mean {url}?", { url: r.url }) : tf("We couldn’t reach {url}. Keep it?", { url: r.url }),
      hint: t("Or type it again."),
      picks: [
        {
          label: r.guessed ? t("Yes") : t("Keep it"),
          text: r.url,
          patch: { pageUrl: r.url, pageTitle: r.title || "", pageAsked: true },
          note: r.title ? tf("Page found: {title}", { title: r.title }) : "",
        },
        this.noPage(),
      ],
      // Changed later, it is asked afresh, not as this yes-or-no.
      make: () => self.stepPage(),
      typed(text) {
        self.readPage(this, text);
      },
    };
  }

  // The address is read the way a chat would (backend
  // services/pilot/readAddress.ts): "acsessobilty nl" comes back as
  // https://accessibility.nl. A guessed correction is asked about before it
  // is used; a sentence typed here is taken as what happened.
  private readingFor(raw: string): Promise<PageReading | null> {
    if (!this.readings[raw]) {
      const p = fetch(this.url("/api/pilot/page"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: raw }),
      })
        .then((r) => (r.ok ? (r.json() as Promise<PageReading>) : null))
        .catch(() => null);
      this.readings[raw] = p;
      void p.then((r) => {
        if (!r) delete this.readings[raw];
      });
    }
    return this.readings[raw];
  }

  private readPage(step: Step, raw: string) {
    const gen = this.gen;
    this.wait(t("Checking the address…"));
    void this.readingFor(raw).then((r) => {
      if (gen !== this.gen) return;
      // The lookup was out of reach: the server normalises what it can when
      // the report is drafted, and says if it cannot.
      if (!r) return this.commit(step, raw, { pageUrl: raw, pageTitle: "", pageAsked: true }, "", true);
      if (r.words) {
        return r.url
          ? this.commit(
              step,
              raw,
              { barrier: raw, barrierPicked: false, pageUrl: r.url, pageTitle: r.title || "", pageAsked: true },
              tf("Taken as what happened. Page: {url}", { url: r.url }),
              true
            )
          : this.commit(step, raw, { barrier: raw, barrierPicked: false }, t("Taken as what happened."), true);
      }
      if (!r.url) return this.ask(step, { prefill: raw, error: t("That isn’t a web address. Try again.") });
      if (r.guessed || !r.reached) return this.ask(this.stepConfirm({ ...r, url: r.url }));
      this.commit(
        step,
        r.url,
        { pageUrl: r.url, pageTitle: r.title || "", pageAsked: true },
        r.title ? tf("Page found: {title}", { title: r.title }) : "",
        true
      );
    });
  }

  stepHappened(): Step {
    const self = this;
    const f = this.fields();
    const picks: Pick[] = (HAPPENED[f.assistiveTech ?? "other"] ?? HAPPENED.other).map((p) => ({
      label: t(p),
      patch: { barrier: p, barrierPicked: true },
    }));
    // With an address, the page can be scanned and the report written from
    // what the scan measures.
    if (f.pageUrl) picks.push({ label: t("Scan the page instead"), patch: { scanOnly: true } });
    return {
      id: "happened",
      make: () => self.stepHappened(),
      ask: t("What happened?"),
      hint: t("One sentence is enough. Enter sends."),
      picks,
      typed(text) {
        self.commit(this, text, { barrier: text, barrierPicked: false }, "", true);
      },
    };
  }

  private stepFollow(question: string, suggestions: string[]): Step {
    const self = this;
    const patchFor = (a: string): Patch => ({ followUp: { question, answer: a.slice(0, 1000) }, followDone: true });
    const step: Step = {
      id: "follow",
      ask: question,
      hint: "",
      picks: suggestions
        .map((s) => ({ label: s, patch: patchFor(s) }))
        .concat([{ label: t("Skip"), text: t("Skipped"), patch: { followDone: true } } as Pick]),
      make: () => step,
      typed(text) {
        self.commit(this, text, patchFor(text), "", true);
      },
    };
    return step;
  }

  // Under the written report: what they type is a change to it. A report
  // that came from a scan has none of their words yet, so what they type
  // there is what happened, and the report is written from that instead.
  private stepChange(): Step {
    const self = this;
    const scan = Boolean(this.draft?.fromScan);
    const step: Step = {
      id: "change",
      ask: t("Anything wrong?"),
      hint: scan ? t("Say what happened and we write it again.") : t("Say what to change and we write it again."),
      picks: [],
      button: t("Write it again"),
      make: () => self.stepChange(),
      typed(text) {
        if (scan) {
          self.turns = self.turns.filter((x) => !x.patch.scanOnly);
          self.draft = null;
          self.commit(self.stepHappened(), text, { barrier: text, barrierPicked: false }, "", true);
          return;
        }
        const change = text.slice(0, 1000);
        self.turns.push({ step, ask: step.ask, text, typed: true, patch: { followUp: { question: CHANGE_QUESTION, answer: change } }, note: "" });
        self.answer = "";
        self.requestDraft({ previous: self.draft as Draft, change });
      },
    };
    return step;
  }

  /* ---- the conversation ---- */

  // Puts a question on the table. Someone who typed their last answer is
  // kept in the field; someone who picked it lands on the question, so a
  // phone's keyboard does not open over the answers to pick.
  ask(step: Step, o: { prefill?: string; error?: string; quiet?: boolean } = {}) {
    this.step = step;
    if (step.id !== "change") this.phase = "ask";
    this.answer = o.prefill || "";
    this.error = o.error || "";
    if (!o.quiet) {
      if (o.error || this.typing) {
        // Still in the field (a typed answer that led straight to the next
        // question): the new question is said, since focus does not move.
        if (this.answerFocused()) this.say(`${o.error ? `${t("Error:")} ${o.error} ` : ""}${step.ask}${step.hint ? ` ${step.hint}` : ""}`);
        else this.focus = "answer";
      } else {
        this.focus = "ask";
      }
    }
    this.draw();
  }

  // An answer is given: it becomes a turn, and the next question follows.
  commit(step: Step, text: string, patch: Patch, note: string, typed: boolean) {
    this.typing = typed;
    this.turns.push({ step, ask: step.id === "page" ? this.stepPage().ask : step.ask, text, typed, patch, note: note || "" });
    if (patch.assistiveTech) this.remember(patch);
    // An earlier answer was changed: what came after it goes back on,
    // unless it hung on the old answer.
    if (this.after) {
      const hasPage = Boolean(this.fields().pageUrl);
      for (const x of this.after) {
        if (x.step.id === step.id) continue;
        if (step.id === "happened" && x.step.id === "follow") continue;
        if (x.patch.scanOnly && !hasPage) continue;
        this.turns.push(x);
      }
      this.after = null;
    }
    this.next();
  }

  // Change on an answered question: it is asked again, with what they typed
  // still in the field.
  edit(i: number) {
    const turn = this.turns[i];
    this.gen++;
    this.draft = null;
    this.noFollow = false;
    // A change they asked of the draft stays with the report as their
    // words, unless what happened is itself being changed.
    this.after = this.turns.slice(i + 1).filter((x) => !(x.step.id === "change" && turn.step.id === "happened"));
    this.turns = this.turns.slice(0, i);
    this.typing = true;
    this.ask(turn.step.make(), { prefill: turn.typed ? turn.text : "" });
  }

  next() {
    const f = this.fields();
    if (!f.assistiveTech) return this.ask(this.stepUse());
    if (!f.pageAsked) return this.ask(this.stepPage());
    if (!f.barrier && !f.scanOnly) return this.ask(this.stepHappened());
    if (f.barrier && !f.followDone && !this.noFollow) return this.fetchFollow();
    this.requestDraft();
  }

  // A wait: nothing to answer, so the question goes away and the line
  // saying what is happening takes focus, which reads it out.
  private wait(text: string) {
    this.phase = "wait";
    this.waitText = text;
    this.focus = "wait";
    this.draw();
  }

  // The one follow-up (backend nextFollowUp): the model's question when it
  // answers in time, the scripted one when it does not, none when the
  // report already says enough.
  private fetchFollow() {
    const gen = this.gen;
    this.wait(t("One moment…"));
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 15000);
    fetch(this.url("/api/pilot/followup"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.payload()),
      signal: stop.signal,
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ question?: string; suggestions?: string[] }>) : null))
      .catch(() => null)
      .then((res) => {
        clearTimeout(timer);
        if (gen !== this.gen) return;
        if (!res || !res.question) {
          this.noFollow = true;
          this.next();
          return;
        }
        this.ask(this.stepFollow(res.question, res.suggestions || []));
      });
  }

  /* ---- the written report ---- */

  requestDraft(revise?: { previous: Draft; change: string } | null) {
    const gen = this.gen;
    const body = this.payload();
    const scanning = !body.barrier;
    if (revise) {
      body.previous = revise.previous;
      body.change = revise.change;
      // The change is the last thing they said; the request names it on its
      // own, so it is not sent twice.
      body.followUps = body.followUps.slice(0, -1);
    }
    this.lastRequest = revise || null;
    this.wait(
      scanning
        ? t("Scanning the page. Up to three minutes.")
        : revise
          ? t("Writing it again. Up to two minutes.")
          : t("Writing your report. Up to two minutes.")
    );
    fetch(this.url("/api/pilot/draft"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => r.json().then((b: { draft?: Draft | null; model?: string; reason?: string; fields?: string[] }) => ({ status: r.status, body: b })))
      .then((res) => {
        if (gen !== this.gen) return;
        if (res.status === 400) return this.badAnswer(res.body.fields || []);
        if (res.status !== 200) return this.noDraft(t("The writing step is down."), true, revise);
        if (!res.body.draft) {
          const why: Record<string, string> = {
            not_configured: t("The language model is off. Your report can go as you wrote it."),
            timeout: t("The language model was still starting. It is usually ready now."),
            scan_failed: t("We couldn’t scan that page. Change your last answer to say what happened, or send just the address."),
            scan_clean: t("The scan found nothing it could measure. Change your last answer to say what happened, or send just the address."),
          };
          // Worth another go when the model was slow or slipped once; not
          // when it is off, or the scan could not read the page.
          const reason = res.body.reason ?? "";
          return this.noDraft(why[reason] ?? t("The language model slipped."), reason === "timeout" || reason === "failed", revise);
        }
        this.draft = res.body.draft;
        this.model = res.body.model ?? null;
        this.showReview(revise ? t("Your report is written again.") : "");
      })
      .catch(() => {
        if (gen !== this.gen) return;
        this.noDraft(t("We couldn’t reach the writing step."), true, revise);
      });
  }

  // The server refused an answer. The address is the only one it can refuse
  // that the form let through (the lookup was out of reach).
  private badAnswer(names: string[]) {
    let i = -1;
    this.turns.forEach((x, n) => {
      if (x.step.id === "page") i = n;
    });
    if (!names.includes("pageUrl") || i === -1) {
      this.noDraft(t("Something in your answers could not be read. Change one above."), false);
      return;
    }
    const text = this.turns[i].typed ? this.turns[i].text : "";
    this.edit(i);
    this.ask(this.stepPage(), { prefill: text, error: t("That isn’t a web address. Try again.") });
  }

  private showReview(said: string) {
    this.reviewIntro = this.draft?.fromScan ? t("From a scan of the page, not from your words.") : "";
    this.sendLabel = t("Send report");
    this.phase = "review";
    this.ask(this.stepChange(), { quiet: true });
    this.focus = "review";
    this.draw();
    if (said) this.say(said);
  }

  // No draft came back. `again`: the model was slow or slipped, so Try
  // again leads. A change that could not be written leaves the report they
  // already read standing.
  private noDraft(reason: string, again: boolean, revise?: { previous: Draft; change: string } | null) {
    if (revise && this.draft) {
      this.showReview("");
      this.say(`${reason} ${t("Your report is as it was.")}`);
      return;
    }
    this.draft = null;
    this.phase = "nodraft";
    this.noDraftReason = reason;
    this.canRetry = again;
    this.plainLabel = t("Send as written");
    this.focus = "nodraft";
    this.draw();
  }

  send(which: "draft" | "plain") {
    if (this.sending) return;
    const body: Record<string, unknown> = this.payload();
    // They read the whole report and pressed Send: it goes as they saw it.
    if (this.draft) {
      body.draft = this.draft;
      body.confirmed = true;
    }
    this.sending = true;
    if (which === "draft") this.sendLabel = t("Sending…");
    else this.plainLabel = t("Sending…");
    this.draw();
    this.say(t("Sending your report."));
    fetch(this.url("/api/pilot/report"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        this.sending = false;
        this.sent = true;
        this.phase = "done";
        this.focus = "done";
        this.draw();
      })
      .catch(() => {
        this.sending = false;
        // Said on the button too, so it is seen as well as heard.
        if (which === "draft") this.sendLabel = t("Not sent. Try again");
        else this.plainLabel = t("Not sent. Try again");
        this.draw();
        this.say(t("Your report could not be sent. Nothing is lost. Press the button to try again."));
      });
  }

  submit() {
    const text = this.answer.trim();
    if (!this.step || this.phase === "wait" || this.phase === "nodraft" || this.phase === "done") return;
    if (!text) {
      this.ask(this.step, {
        error: this.step.picks.length ? t("Type an answer, or pick one.") : t("Type what to change, or send the report."),
      });
      return;
    }
    this.typing = true;
    this.step.typed(text);
  }

  again() {
    this.gen++;
    this.sent = false;
    this.turns = this.rememberedTurns();
    this.after = null;
    this.draft = null;
    this.noFollow = false;
    this.sendLabel = t("Send report");
    this.next();
  }
}

export function BarrierReport({ apiBase, onBack }: { apiBase: string; onBack: () => void }) {
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const talkRef = useRef<Talk | null>(null);
  if (!talkRef.current) talkRef.current = new Talk(apiBase, redraw);
  const talk = talkRef.current;
  const [open, setOpen] = useState<"loading" | "open" | "closed" | "unreachable">("loading");

  const refs = {
    title: useRef<HTMLHeadingElement>(null),
    ask: useRef<HTMLLabelElement>(null),
    answer: useRef<HTMLTextAreaElement>(null),
    wait: useRef<HTMLParagraphElement>(null),
    review: useRef<HTMLHeadingElement>(null),
    nodraft: useRef<HTMLHeadingElement>(null),
    done: useRef<HTMLHeadingElement>(null),
  };
  const woke = useRef(false);
  // The widget is in a shadow root, so focus is read from the field's own root.
  talk.answerFocused = () => {
    const el = refs.answer.current;
    return Boolean(el && (el.getRootNode() as Document | ShadowRoot).activeElement === el);
  };

  useEffect(() => {
    let live = true;
    fetch(`${apiBase}/api/pilot`)
      .then((r) => r.json() as Promise<{ open?: boolean; stores?: boolean; mails?: boolean }>)
      .then((info) => {
        if (!live) return;
        if (!info.open || (!info.stores && !info.mails)) {
          setOpen("closed");
          return;
        }
        setOpen("open");
        // Waking starts as the view opens; see askWake below.
        void fetch(`${apiBase}/api/pilot/wake`, { method: "POST" }).catch(() => undefined);
        talk.turns = talk.rememberedTurns();
        // The first question waits where it is: the view's own heading and
        // two lines are read first.
        talk.ask(talk.fields().assistiveTech ? talk.stepPage() : talk.stepUse(), { quiet: true });
      })
      .catch(() => live && setOpen("unreachable"));
    return () => {
      live = false;
    };
  }, [apiBase, talk]);

  // The heading takes focus when the view opens, so a screen reader starts
  // at the view's name, not wherever the entry button was.
  useEffect(() => {
    refs.title.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus moves after the render that shows its target.
  useEffect(() => {
    const target = talk.focus;
    if (!target) return;
    talk.focus = null;
    refs[target].current?.focus();
  });

  // The field grows with what is typed, so a sentence is never scrolled
  // inside a one-line box.
  useLayoutEffect(() => {
    const el = refs.answer.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  });

  // The model's worker sleeps when idle and takes over 100 seconds to wake
  // (measured on the live service, 20 Nov 2026: a follow-up asked 100s
  // after the wake call still missed its ten seconds, and the first report
  // took 87s; warm, they took 1s and 4s). Someone who picks their answers
  // reaches the follow-up in ten or twenty seconds, so the waking starts as
  // the view opens (user's instruction, 20 Nov 2026, carried over from the
  // old page), and is asked once more at the first press or move into the
  // conversation, for someone who read for a while first; a press counts as
  // well as focus, because Safari does not focus a button that is clicked.
  // The server lets one call through per two minutes, however many ask.
  const askWake = () =>
    fetch(`${apiBase}/api/pilot/wake`, { method: "POST" }).catch(() => {
      /* the draft still works, only slower */
    });
  const wake = () => {
    if (woke.current) return;
    woke.current = true;
    void askWake();
  };

  const step = talk.step;
  const d = talk.draft;
  const showComposer = open === "open" && step !== null && (talk.phase === "ask" || talk.phase === "review");
  const describedBy = `${talk.error ? "a11y-barrier-error " : ""}a11y-barrier-hint a11y-barrier-count`;

  return (
    <div className="a11y-barrier">
      <h2 className="a11y-barrier-title" ref={refs.title} tabIndex={-1}>
        {t("Report a barrier")}
      </h2>

      {open === "closed" && <p className="a11y-barrier-intro">{t("The pilot is not open at the moment. Please try again later.")}</p>}
      {open === "unreachable" && <p className="a11y-barrier-intro">{t("The pilot could not be reached. Please try again later.")}</p>}
      {open !== "closed" && open !== "unreachable" && (
        <>
          <p className="a11y-barrier-intro">
            {t("Did something on a website stop you or slow you down? Answer a few short questions and we write the report for the site’s owner.")}
          </p>
          <p className="a11y-barrier-small">{t("You read it before it is sent. We keep what you write, so leave out your name and email.")}</p>
        </>
      )}

      <div className="a11y-sr-only" role="status" aria-live="polite">
        {talk.status}
      </div>

      {open === "open" && (
        <section className="a11y-barrier-talk" aria-label={t("Your report, step by step")} onFocus={wake} onPointerDown={wake}>
          {/* Answered questions, oldest first. */}
          {talk.turns.map((turn, i) => (
            <div className="a11y-barrier-turn" key={`${i}:${turn.ask}`}>
              <p className="a11y-barrier-asked">{turn.ask}</p>
              <div className="a11y-barrier-said">
                <p className="a11y-barrier-said-text">
                  <span className="a11y-sr-only">{t("You:")} </span>
                  {turn.text}
                </p>
                {/* A change asked of the draft is not changed itself: say another. */}
                {turn.step.id !== "change" && !talk.sent && (
                  <button
                    type="button"
                    className="a11y-btn a11y-btn-ghost a11y-btn-sm"
                    aria-label={tf("Change answer: {question}", { question: turn.ask })}
                    onClick={() => talk.edit(i)}
                  >
                    {t("Change")}
                  </button>
                )}
              </div>
              {turn.note && <p className="a11y-barrier-note">{turn.note}</p>}
            </div>
          ))}

          {talk.phase === "wait" && (
            <p className="a11y-barrier-wait" ref={refs.wait} tabIndex={-1}>
              {talk.waitText}
            </p>
          )}

          {talk.phase === "review" && d && (
            <div className="a11y-barrier-review">
              <h3 ref={refs.review} tabIndex={-1}>
                {t("Your report")}
              </h3>
              {talk.reviewIntro && <p className="a11y-barrier-small">{talk.reviewIntro}</p>}
              <article className="a11y-barrier-doc" aria-labelledby="a11y-barrier-doc-title">
                <h4 id="a11y-barrier-doc-title">{d.title}</h4>
                <h5>{t("What happens")}</h5>
                <p>{d.explanation}</p>
                {d.whoItStops && (
                  <>
                    <h5>{t("Who it stops")}</h5>
                    <p>{d.whoItStops}</p>
                  </>
                )}
                {d.steps && d.steps.length > 0 && (
                  <>
                    <h5>{t("How to see it")}</h5>
                    <ol>
                      {d.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  </>
                )}
                <h5>{t("What to change")}</h5>
                <p>{d.fix}</p>
                {d.impact && (
                  <p className="a11y-barrier-doc-note">
                    {tf("How much it holds people back, as the model judges it: {words}.", { words: t(IMPACT_WORDS[d.impact]) })}
                  </p>
                )}
                {d.wcagCriterion && (
                  <p className="a11y-barrier-doc-note">
                    {tf("The model thinks this may fail WCAG success criterion {criterion}. Nobody has checked that yet.", { criterion: d.wcagCriterion })}
                  </p>
                )}
              </article>
              {talk.model && (
                <p className="a11y-barrier-small">{tf("Written by {model}, a language model on our own server.", { model: talk.model })}</p>
              )}
              <div className="a11y-barrier-actions">
                <button type="button" className="a11y-btn a11y-btn-primary a11y-btn-lg" disabled={talk.sending} onClick={() => talk.send("draft")}>
                  {talk.sendLabel}
                </button>
              </div>
            </div>
          )}

          {talk.phase === "nodraft" && (
            <div className="a11y-barrier-nodraft">
              <h3 ref={refs.nodraft} tabIndex={-1}>
                {t("Not written up yet")}
              </h3>
              <p>{talk.noDraftReason}</p>
              <div className="a11y-barrier-actions">
                {talk.canRetry && (
                  <button type="button" className="a11y-btn a11y-btn-primary a11y-btn-lg" onClick={() => talk.requestDraft(talk.lastRequest)}>
                    {t("Try again")}
                  </button>
                )}
                <button
                  type="button"
                  className={`a11y-btn ${talk.canRetry ? "a11y-btn-secondary a11y-btn-md" : "a11y-btn-primary a11y-btn-lg"}`}
                  disabled={talk.sending}
                  onClick={() => talk.send("plain")}
                >
                  {talk.plainLabel}
                </button>
              </div>
            </div>
          )}

          {talk.phase === "done" && (
            <div className="a11y-barrier-done">
              <h3 ref={refs.done} tabIndex={-1}>
                {t("Thank you. Your report is sent")}
              </h3>
              <div className="a11y-barrier-actions">
                <button type="button" className="a11y-btn a11y-btn-secondary a11y-btn-md" onClick={() => talk.again()}>
                  {t("Report another barrier")}
                </button>
              </div>
            </div>
          )}

          {/* The one question on the table: its words are the field's label. */}
          {showComposer && step && (
            <form
              className="a11y-barrier-composer"
              noValidate
              onSubmit={(ev) => {
                ev.preventDefault();
                talk.submit();
              }}
            >
              <label className="a11y-barrier-ask" htmlFor="a11y-barrier-answer" ref={refs.ask} tabIndex={-1}>
                {step.ask}
              </label>
              <div className="a11y-barrier-field">
                <span className="a11y-barrier-hint" id="a11y-barrier-hint">
                  {step.hint}
                </span>
                {talk.error && (
                  <span className="a11y-barrier-error" id="a11y-barrier-error">
                    {talk.error}
                  </span>
                )}
                <textarea
                  id="a11y-barrier-answer"
                  ref={refs.answer}
                  rows={1}
                  maxLength={4000}
                  value={talk.answer}
                  aria-describedby={describedBy}
                  aria-invalid={talk.error ? true : undefined}
                  inputMode={step.url ? "url" : undefined}
                  autoCapitalize={step.url ? "off" : undefined}
                  spellCheck={step.url ? false : undefined}
                  onChange={(ev) => {
                    talk.answer = ev.target.value;
                    redraw();
                  }}
                  // Enter sends, as in a chat; Shift and Enter starts a new line.
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter" && !ev.shiftKey && !ev.nativeEvent.isComposing) {
                      ev.preventDefault();
                      talk.submit();
                    }
                  }}
                />
              </div>
              <span id="a11y-barrier-count" className="a11y-sr-only">
                {step.picks.length ? tf("{count} answers to pick follow.", { count: step.picks.length }) : ""}
              </span>
              {step.picks.length > 0 && (
                <div className="a11y-barrier-picks" role="group" aria-label={t("Answers to pick")}>
                  {step.picks.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="a11y-barrier-pick"
                      onClick={() => talk.commit(step, p.text || p.label, p.patch, p.note || "", false)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
              {/* A trap field: hidden from people and from assistive technology. */}
              <div hidden aria-hidden="true">
                <label>
                  Company website{" "}
                  <input type="text" tabIndex={-1} autoComplete="off" defaultValue="" onChange={(ev) => (talk.trap = ev.target.value)} />
                </label>
              </div>
              <div className="a11y-barrier-actions">
                <button type="submit" className="a11y-btn a11y-btn-secondary a11y-btn-md">
                  {step.button || t("Answer")}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <p className="a11y-chat-alt">
        <button type="button" className="a11y-btn a11y-btn-ghost a11y-btn-md" onClick={onBack}>
          {t("Back to the chat")}
        </button>
      </p>
    </div>
  );
}
