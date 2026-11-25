import { useCallback, useEffect, useRef, useState } from "react";
import { getLang } from "../lib/i18n";
import { t, tf } from "../lib/strings";
import {
  SPEECH_LANG,
  collectControls,
  findTarget,
  parseCommand,
  press,
  setFieldValue,
} from "../lib/voiceControl";

/* The browser's recogniser, under either name. Not in lib.dom's types. */
interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
}
/** The chat's message box, when it is on screen. */
function chatBox(root: ShadowRoot | Document): HTMLTextAreaElement | null {
  // The scan chat's box, or Report a barrier's, whichever is showing.
  const el = root.querySelector<HTMLTextAreaElement>("#a11y-chat-input, #a11y-barrier-answer");
  return el && !el.disabled && el.getClientRects().length > 0 ? el : null;
}

function recogniserClass(): (new () => Recognition) | null {
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Voice control: one toggle that listens and presses whatever control the
 * visitor names ("press send", "new scan"), types ("type example.com") and
 * scrolls. Off until asked, because the microphone is the visitor's to open.
 * Where the browser has no recogniser (Firefox) the control says so instead
 * of sitting there dead.
 *
 * The browser's own speech service hears the audio and may send it to its
 * maker. Nothing is sent to our server.
 *
 * One toggle sits in each chat box (the scan chat's and Report a barrier's),
 * and only one box is on screen at a time. Whether it is listening is kept
 * outside the component, so going from one box to the other leaves it on.
 */
const listening = { current: false };

export function VoiceControl() {
  const Rec = typeof window === "undefined" ? null : recogniserClass();
  const [on, setOn] = useState(listening.current);
  const [status, setStatus] = useState("");
  const wrapRef = useRef<HTMLSpanElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantOn = listening;

  const handle = useCallback((heard: string) => {
    const wrap = wrapRef.current;
    const root = wrap?.getRootNode() as ShadowRoot | Document | undefined;
    if (!wrap || !root) return;
    const lang = getLang();
    const cmd = parseCommand(heard, lang);
    const active = (root as ShadowRoot).activeElement as HTMLElement | null;
    const say = (s: string) => setStatus(`${tf("Heard: {words}", { words: heard.trim() })} – ${s}`);

    switch (cmd.kind) {
      case "none":
        return;
      case "stop":
        wantOn.current = false;
        recRef.current?.stop();
        setOn(false);
        setStatus(t("Voice control is off."));
        return;
      case "help":
        setStatus(
          t(
            "Say: scan example.com, ask what to fix first, type a message, press send, scroll down, stop listening."
          )
        );
        return;
      case "scroll": {
        const h = window.innerHeight * 0.8;
        if (cmd.where === "top") window.scrollTo({ top: 0 });
        else if (cmd.where === "bottom") window.scrollTo({ top: document.documentElement.scrollHeight });
        else window.scrollBy({ top: cmd.where === "down" ? h : -h });
        say(t("Scrolled."));
        return;
      }
      case "scan":
      case "ask": {
        // The chat box is where a scan starts and a question goes: the words
        // are put in it and sent, exactly as typing them and pressing Send.
        const box = chatBox(root);
        if (!box) {
          say(t("There is no field to type into."));
          return;
        }
        box.focus();
        if (cmd.kind === "ask" && !cmd.text) {
          say(t("Ready to type in the chat. Say your message."));
          return;
        }
        setFieldValue(box, cmd.kind === "scan" ? tf("Scan {url}", { url: cmd.url }) : cmd.text);
        // React re-renders the Send button enabled before the form is sent.
        requestAnimationFrame(() => box.form?.requestSubmit());
        say(cmd.kind === "scan" ? tf("Scanning {url}.", { url: cmd.url }) : t("Sent."));
        return;
      }
      case "send": {
        // The chat box's own submit button, whatever its name or language,
        // so a send never depends on matching a spoken word to a label.
        const box = chatBox(root);
        if (!box) {
          const res = findTarget(cmd.target, collectControls(root, wrap), 55);
          if (res.status === "match") {
            press(res.target.el);
            say(tf("Pressed {name}.", { name: res.target.name }));
          } else say(tf("I can't find a button called {name}.", { name: cmd.target }));
          return;
        }
        if (cmd.text) {
          const now = box.value;
          setFieldValue(box, now && !/\s$/.test(now) ? `${now} ${cmd.text}` : now + cmd.text);
        }
        if (!box.value.trim()) {
          say(t("Nothing to send yet. Say your message first."));
          return;
        }
        // React re-renders the Send button enabled before it is pressed.
        requestAnimationFrame(() => {
          const submit = box.form?.querySelector<HTMLButtonElement>('button[type="submit"]');
          if (submit && submit.disabled) {
            say(t('Wait for the answer to finish, then say "send" again.'));
            return;
          }
          if (submit) submit.click();
          else box.form?.requestSubmit();
          say(t("Sent."));
        });
        return;
      }
      case "type":
      case "clear": {
        let field =
          active && /^(INPUT|TEXTAREA)$/.test(active.tagName) ? (active as HTMLInputElement | HTMLTextAreaElement) : null;
        // Nothing in focus (the voice button has it): the chat box, which is
        // the field a voice user means, not whichever field comes first.
        if (!field) field = chatBox(root);
        if (!field) {
          const first = collectControls(root, wrap).find((c) => /^(INPUT|TEXTAREA)$/.test(c.el.tagName));
          field = (first?.el as HTMLInputElement | undefined) ?? null;
        }
        if (!field) {
          say(t("There is no field to type into."));
          return;
        }
        field.focus();
        setFieldValue(field, cmd.kind === "clear" ? "" : cmd.text);
        say(cmd.kind === "clear" ? t("Cleared.") : t("Typed."));
        return;
      }
      case "click-focused": {
        if (active && active !== wrap.querySelector("button")) {
          press(active);
          say(tf("Pressed {name}.", { name: active.getAttribute("aria-label") ?? active.textContent?.trim() ?? "" }));
        } else say(t("Nothing is selected. Say the name of the button."));
        return;
      }
      case "phrase": {
        // Words with no command: a button only when its name fits closely
        // (a bare phrase could be anything the room said), else dictation
        // into the chat box, added to what is already there. Before 20 Nov
        // 2026 every such phrase was looked up as a button name, so talking
        // to the chat only ever answered "I can't find a button called …".
        const controls = collectControls(root, wrap);
        const res = findTarget(cmd.target, controls, 80);
        if (res.status === "match") {
          const how = press(res.target.el);
          say(tf(how === "focused" ? "Ready to type in {name}." : "Pressed {name}.", { name: res.target.name }));
          return;
        }
        const box = chatBox(root);
        if (box) {
          box.focus();
          const now = box.value;
          setFieldValue(box, now && !/\s$/.test(now) ? `${now} ${cmd.text}` : now + cmd.text);
          say(t('Written in the chat. Say "send" to send it.'));
        } else if (res.status === "ambiguous") {
          say(tf("More than one control fits. Say the full name: {names}.", { names: res.names.join(", ") }));
        } else {
          say(tf("I can't find a button called {name}.", { name: cmd.target }));
        }
        return;
      }
      case "click": {
        const controls = collectControls(root, wrap);
        const res = findTarget(cmd.target, controls, 55);
        if (res.status === "match") {
          const how = press(res.target.el);
          say(tf(how === "focused" ? "Ready to type in {name}." : "Pressed {name}.", { name: res.target.name }));
        } else if (res.status === "ambiguous") {
          say(tf("More than one control fits. Say the full name: {names}.", { names: res.names.join(", ") }));
        } else {
          say(tf("I can't find a button called {name}.", { name: cmd.target }));
        }
        return;
      }
    }
  }, []);

  const start = useCallback(() => {
    if (!Rec) return;
    const rec = new Rec();
    rec.lang = SPEECH_LANG[getLang()];
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) handle(e.results[i][0].transcript);
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wantOn.current = false;
        setOn(false);
        setStatus(t("The microphone is blocked. Allow it in your browser's address bar, then try again."));
      }
    };
    // The browser ends a session after a silence; keep listening while on.
    rec.onend = () => {
      if (wantOn.current) {
        try {
          rec.start();
        } catch {
          /* already restarting */
        }
      }
    };
    recRef.current = rec;
    rec.start();
  }, [Rec, handle]);

  // Mounted while listening (the other box was just replaced by this one):
  // carry on. Unmounted: this recogniser stops, but the wish to listen stays
  // for the box that takes its place.
  useEffect(() => {
    if (wantOn.current) start();
    return () => {
      const rec = recRef.current;
      if (rec) {
        rec.onend = null;
        rec.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    if (on) {
      wantOn.current = false;
      recRef.current?.stop();
      setOn(false);
      setStatus(t("Voice control is off."));
    } else {
      wantOn.current = true;
      setOn(true);
      setStatus(t("Listening. Speak to write in the chat, or name a button, like \"press send\". Say \"what can I say\" for more."));
      start();
    }
  }

  // In the chat's box, beside Back (user's instruction, 20 Nov 2026: "move
  // button into chat and no description needed"). The line that sat beside
  // it at rest is gone; what the control heard and did still shows, under
  // the button, once there is something to say. Where the browser has no
  // recogniser there is no button, rather than a button with an excuse.
  if (!Rec) return null;

  return (
    <span className="a11y-voice" ref={wrapRef}>
      <button type="button" className="a11y-btn a11y-btn-ghost a11y-btn-md" aria-pressed={on} onClick={toggle}>
        {t("Voice control")}
      </button>
      <span className="a11y-voice-note" role="status">
        {status}
      </span>
    </span>
  );
}
