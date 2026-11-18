/**
 * Voice control: say the name of a button and it is pressed.
 *
 * Two halves, kept apart so the first can be tested without a browser:
 *
 *  - `parseCommand` turns what was heard into a command ("press send" is a
 *    click on "send"), per language.
 *  - `findTarget` picks the control a spoken name means, from the controls
 *    the page really offers right now. It never guesses between two equally
 *    good matches: it says so and presses nothing, because a wrong press on
 *    a scan or a delete is worse than asking again.
 *
 * The controls are read from the widget's own shadow root by their
 * accessible names (the same names a screen reader says), so a button that
 * is named well is voice-addressable with no extra markup, and one that is
 * not named is not. Nothing here is sent anywhere: the browser's speech
 * service hears the audio; this code only sees the words it returns.
 */
import type { Lang } from "./i18n";

export type VoiceCommand =
  | { kind: "click"; target: string }
  | { kind: "click-focused" }
  | { kind: "type"; text: string }
  | { kind: "clear" }
  | { kind: "scroll"; where: "up" | "down" | "top" | "bottom" }
  | { kind: "stop" }
  | { kind: "help" }
  | { kind: "none" };

/** Lowercase, accents kept (ü and ñ are letters), punctuation gone. */
export function normalize(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[⁠   ]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Words {
  click: string[];
  type: string[];
  clear: string[];
  stop: string[];
  help: string[];
  up: string[];
  down: string[];
  top: string[];
  bottom: string[];
  scroll: string[];
  /** "it", "that", "this": the control that has focus. */
  here: string[];
  /** Words that carry no name: "the", "button", "please". */
  filler: string[];
}

const WORDS: Record<Lang, Words> = {
  en: {
    click: ["press", "click", "tap", "push", "hit", "select", "choose", "open", "activate", "go to"],
    type: ["type", "write", "enter", "dictate"],
    clear: ["clear", "clear field", "clear text", "delete text"],
    stop: ["stop listening", "stop voice control", "turn off voice control", "voice off"],
    help: ["what can i say", "help", "voice help", "list commands"],
    up: ["up"],
    down: ["down"],
    top: ["top", "to the top", "back to top"],
    bottom: ["bottom", "to the bottom", "the end"],
    scroll: ["scroll", "page"],
    here: ["it", "that", "this", "that one", "this one"],
    filler: ["the", "a", "an", "that", "this", "button", "link", "tab", "please", "on", "for", "me"],
  },
  de: {
    click: ["drücke", "drücken", "klicke", "klick", "klicke auf", "klick auf", "tippe auf", "tippe", "wähle", "öffne", "aktiviere", "gehe zu", "geh zu"],
    type: ["tippe ein", "schreibe", "schreib", "gib ein"],
    clear: ["lösche", "leeren", "feld leeren", "text löschen"],
    stop: ["zuhören beenden", "sprachsteuerung aus", "sprachsteuerung beenden", "hör auf"],
    help: ["was kann ich sagen", "hilfe", "befehle"],
    up: ["hoch", "nach oben"],
    down: ["runter", "nach unten"],
    top: ["ganz nach oben", "zum anfang", "anfang"],
    bottom: ["ganz nach unten", "zum ende", "ende"],
    scroll: ["scrolle", "scroll", "blättere"],
    here: ["es", "das", "diesen", "das hier", "dieses"],
    filler: ["den", "die", "das", "dem", "der", "auf", "knopf", "button", "schaltfläche", "link", "bitte", "mal"],
  },
  es: {
    click: ["pulsa", "pulsar", "presiona", "presionar", "haz clic en", "haz clic", "clic en", "toca", "elige", "selecciona", "abre", "activa", "ve a"],
    type: ["escribe", "teclea", "introduce"],
    clear: ["borra", "borrar", "vacía", "limpia"],
    stop: ["deja de escuchar", "detener escucha", "control por voz desactivado", "apaga la voz"],
    help: ["qué puedo decir", "que puedo decir", "ayuda", "comandos"],
    up: ["arriba", "sube"],
    down: ["abajo", "baja"],
    top: ["al principio", "al inicio", "principio"],
    bottom: ["al final", "final"],
    scroll: ["desplázate", "desplaza", "baja", "sube"],
    here: ["eso", "esto", "ese", "este", "lo"],
    filler: ["el", "la", "los", "las", "un", "una", "en", "botón", "boton", "enlace", "pestaña", "por favor", "de"],
  },
  fr: {
    click: ["appuie sur", "appuyer sur", "clique sur", "cliquer sur", "touche", "choisis", "sélectionne", "selectionne", "ouvre", "active", "va à", "va a"],
    type: ["tape", "écris", "ecris", "saisis", "dicte"],
    clear: ["efface", "vide", "effacer le champ"],
    stop: ["arrête d'écouter", "arrete d ecouter", "arrête l'écoute", "désactive la voix", "stop écoute"],
    help: ["que puis je dire", "aide", "commandes"],
    up: ["haut", "monte"],
    down: ["bas", "descends"],
    top: ["tout en haut", "au début", "début"],
    bottom: ["tout en bas", "à la fin", "fin"],
    scroll: ["défile", "fais défiler", "descends", "monte"],
    here: ["ça", "ca", "cela", "celui-ci", "celui ci"],
    filler: ["le", "la", "les", "un", "une", "sur", "bouton", "lien", "onglet", "s'il te plaît", "s il te plait", "stp", "le bouton", "du"],
  },
};

function stripLeading(text: string, phrases: string[]): string | null {
  // Longest phrase first, so "klicke auf" beats "klicke".
  for (const p of [...phrases].map(normalize).sort((a, b) => b.length - a.length)) {
    if (text === p) return "";
    if (text.startsWith(p + " ")) return text.slice(p.length + 1).trim();
  }
  return null;
}

function stripFiller(text: string, filler: string[]): string {
  const drop = new Set(filler.map(normalize).flatMap((f) => f.split(" ")));
  return text
    .split(" ")
    .filter((w) => !drop.has(w))
    .join(" ")
    .trim();
}

/** What was said, as a command. `heard` is the recogniser's raw words. */
export function parseCommand(heard: string, lang: Lang): VoiceCommand {
  const w = WORDS[lang] ?? WORDS.en;
  const text = normalize(heard);
  if (!text) return { kind: "none" };

  if (w.stop.map(normalize).includes(text)) return { kind: "stop" };
  if (w.help.map(normalize).includes(text)) return { kind: "help" };

  // Dictation keeps the speaker's own words, so it is cut from the raw text
  // (case and punctuation as the recogniser wrote them), not the normalised.
  const rawLower = heard.trim();
  for (const v of [...w.type].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`^${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+(.+)$`, "i");
    const m = rawLower.match(re);
    if (m) return { kind: "type", text: m[1].trim() };
  }
  if (w.clear.map(normalize).includes(text)) return { kind: "clear" };

  // Scrolling: "scroll down", "go to the top", "nach unten".
  const scrollRest = stripLeading(text, w.scroll);
  const probe = scrollRest ?? text;
  const hit = (list: string[]) => list.map(normalize).includes(probe);
  if (hit(w.top)) return { kind: "scroll", where: "top" };
  if (hit(w.bottom)) return { kind: "scroll", where: "bottom" };
  if (scrollRest !== null || text.split(" ").length <= 2) {
    if (hit(w.down)) return { kind: "scroll", where: "down" };
    if (hit(w.up)) return { kind: "scroll", where: "up" };
  }

  const rest = stripLeading(text, w.click);
  const name = stripFiller(rest ?? text, w.filler);
  if (rest !== null) {
    const bare = rest.trim();
    if (!name || w.here.map(normalize).includes(bare) || w.here.map(normalize).includes(name)) {
      return { kind: "click-focused" };
    }
    return { kind: "click", target: name };
  }
  // No verb at all: "send", "new scan". Treated as a name, and only pressed
  // when it matches strongly (findTarget's bare threshold).
  return name ? { kind: "click", target: name } : { kind: "none" };
}

export interface VoiceControlTarget {
  el: HTMLElement;
  name: string;
}

export type TargetResult =
  | { status: "match"; target: VoiceControlTarget }
  | { status: "ambiguous"; names: string[] }
  | { status: "none" };

function score(name: string, want: string): number {
  if (name === want) return 100;
  const nt = name.split(" ");
  const wt = want.split(" ");
  if (name.startsWith(want + " ")) return 85;
  if (name.includes(" " + want + " ") || name.endsWith(" " + want)) return 75;
  if (want.includes(" ") && name.includes(want)) return 72;
  if (want.startsWith(name + " ")) return 65;
  // Words of the request found in the name, in any order.
  const found = wt.filter((x) => nt.includes(x)).length;
  if (found === wt.length) return 60 + Math.min(9, wt.length);
  // A single word of the request that is a long name's prefix ("fix" for "fixes").
  if (wt.length === 1 && want.length >= 4 && nt.some((x) => x.startsWith(want))) return 55;
  return 0;
}

/**
 * The control a spoken name means. `minScore` is 60 for an explicit "press
 * ..." and higher for a bare phrase, which could be anything the room said.
 * Two different controls at the top score are ambiguous: nothing is pressed.
 */
export function findTarget(want: string, controls: VoiceControlTarget[], minScore = 55): TargetResult {
  const w = normalize(want);
  if (!w) return { status: "none" };
  let best = 0;
  let top: VoiceControlTarget[] = [];
  for (const c of controls) {
    const s = score(normalize(c.name), w);
    if (s < minScore) continue;
    if (s > best) {
      best = s;
      top = [c];
    } else if (s === best) top.push(c);
  }
  if (top.length === 0) return { status: "none" };
  // The same name twice (a row's "Show details" repeated) is ambiguous too,
  // unless one is a rendering of the other: same element means same control.
  if (top.length === 1) return { status: "match", target: top[0] };
  const distinct = new Set(top.map((c) => normalize(c.name)));
  if (distinct.size === 1 && top.length > 1) return { status: "ambiguous", names: [top[0].name] };
  return { status: "ambiguous", names: top.slice(0, 3).map((c) => c.name) };
}

/** The recogniser's language tag for the widget's language. */
export const SPEECH_LANG: Record<Lang, string> = { en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR" };

const CONTROL_SELECTOR = [
  "button",
  "a[href]",
  "summary",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[role=button]",
  "[role=tab]",
  "[role=link]",
  "[role=menuitem]",
  "[role=radio]",
  "[role=checkbox]",
  "[role=switch]",
].join(",");

function visible(el: HTMLElement): boolean {
  if (el.closest("[hidden], [inert], [aria-hidden=true]")) return false;
  const style = getComputedStyle(el);
  if (style.visibility === "hidden" || style.display === "none") return false;
  const r = el.getBoundingClientRect();
  // A control clipped to a pixel for the eye is still real to a screen
  // reader and a voice user (the Send word on a phone), so only a control
  // with no box at all is skipped.
  return r.width > 0 || r.height > 0 || el.getClientRects().length > 0;
}

/** The accessible name, by the order the specification gives. */
export function accessibleName(el: HTMLElement, root: Document | ShadowRoot): string {
  const labelledby = el.getAttribute("aria-labelledby");
  if (labelledby) {
    const text = labelledby
      .split(/\s+/)
      .map((id) => root.getElementById?.(id)?.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length) {
    const text = Array.from(labels)
      .map((l) => l.textContent ?? "")
      .join(" ")
      .trim();
    if (text) return text;
  }
  const own = (el.textContent ?? "").replace(/\s+/g, " ").trim();
  if (own) return own;
  return (el.getAttribute("title") ?? el.getAttribute("placeholder") ?? "").trim();
}

/** Every control a person could press or fill right now, with its name. */
export function collectControls(root: ShadowRoot | Document, ignore?: Element | null): VoiceControlTarget[] {
  // An open dialog is the only thing the person can reach.
  const modal = root.querySelector<HTMLElement>("[aria-modal=true]");
  const scope: ParentNode = modal ?? root;
  const out: VoiceControlTarget[] = [];
  for (const el of Array.from(scope.querySelectorAll<HTMLElement>(CONTROL_SELECTOR))) {
    if (ignore && (el === ignore || ignore.contains(el))) continue;
    if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") continue;
    if (!visible(el)) continue;
    const name = accessibleName(el, root);
    if (name) out.push({ el, name });
  }
  return out;
}

/** Press a control the way a person would: inputs take focus, the rest click. */
export function press(el: HTMLElement): "focused" | "pressed" {
  const tag = el.tagName;
  const type = (el as HTMLInputElement).type;
  const textual =
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (tag === "INPUT" && !["checkbox", "radio", "button", "submit", "reset"].includes(type));
  el.scrollIntoView?.({ block: "center", behavior: "auto" });
  if (textual) {
    el.focus();
    return "focused";
  }
  el.focus({ preventScroll: true });
  el.click();
  return "pressed";
}

/** Set a React-controlled field's value so its onChange sees it. */
export function setFieldValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
