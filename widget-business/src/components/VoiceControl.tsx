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
 * maker; the line under the toggle says so. Nothing is sent to our server.
 */
export function VoiceControl() {
  const Rec = typeof window === "undefined" ? null : recogniserClass();
  const [on, setOn] = useState(false);
  const [status, setStatus] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<Recognition | null>(null);
  const wantOn = useRef(false);

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
            "Say: press send, new scan, type example.com, clear, scroll down, scroll to the top, stop listening."
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
      case "type":
      case "clear": {
        let field =
          active && /^(INPUT|TEXTAREA)$/.test(active.tagName) ? (active as HTMLInputElement | HTMLTextAreaElement) : null;
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
      case "click": {
        const controls = collectControls(root, wrap);
        // A bare name could be anything the room said: demand a closer match.
        const explicit = new RegExp("^\\s*" + "[^\\s]+\\s").test(heard);
        const res = findTarget(cmd.target, controls, explicit ? 55 : 80);
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

  useEffect(
    () => () => {
      wantOn.current = false;
      recRef.current?.stop();
    },
    []
  );

  function toggle() {
    if (on) {
      wantOn.current = false;
      recRef.current?.stop();
      setOn(false);
      setStatus(t("Voice control is off."));
    } else {
      wantOn.current = true;
      setOn(true);
      setStatus(t("Listening. Say the name of a button, like \"press send\". Say \"what can I say\" for more."));
      start();
    }
  }

  if (!Rec) {
    return (
      <div className="a11y-voice" ref={wrapRef}>
        <p className="a11y-voice-note">{t("Voice control needs Chrome, Edge or Safari.")}</p>
      </div>
    );
  }

  return (
    <div className="a11y-voice" ref={wrapRef}>
      <button type="button" className="a11y-btn a11y-btn-secondary a11y-btn-sm" aria-pressed={on} onClick={toggle}>
        {t("Voice control")}
      </button>
      <p className="a11y-voice-note" role="status">
        {status || t("Your browser's speech service hears what you say.")}
      </p>
    </div>
  );
}
