/**
 * Voice control: say the name of a button and it is pressed; say anything
 * else and it is written into the chat box.
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
  /**
   * Words with no command in front of them. A button whose name they match
   * closely is pressed ("send", "new scan"); anything else is written into
   * the chat box, because that is what a person talking to a chat means.
   */
  | { kind: "phrase"; target: string; text: string }
  | { kind: "click-focused" }
  /**
   * Send the chat box's message. `text` is any words said before the send
   * ("… accessible, press send"), written in first; `target` is the Send
   * button's spoken name in this language, for a page with no chat box.
   */
  | { kind: "send"; text: string; target: string }
  | { kind: "type"; text: string }
  /** Scan a page: the address goes into the chat box and is sent. */
  | { kind: "scan"; url: string }
  /** A question for the assistant: typed into the chat box and sent. */
  | { kind: "ask"; text: string }
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
  /** "scan example.com", "check example.com". */
  scan: string[];
  /** "ask what should I fix first": typed into the chat and sent. */
  ask: string[];
  /** Said before a command and meaning nothing: "uh", "please", "can you". */
  lead: string[];
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
  /**
   * Send, said on its own: "send", "submit", and what recognisers write
   * for a quick "press send" ("present"). These count only when nothing
   * else was said, since "how do I send" is a question, not a command.
   * The first is the Send button's name in that language.
   */
  sendBare: string[];
  /** Send, said so plainly that it ends a longer sentence: "… press send". */
  send: string[];
}

const WORDS: Record<Lang, Words> = {
  en: {
    click: ["press", "click", "tap", "push", "hit", "select", "choose", "open", "activate", "go to"],
    type: ["type", "write", "enter", "dictate"],
    scan: ["scan", "rescan", "check", "test", "audit", "analyse", "analyze", "run a scan on", "run a scan of", "scan the site", "scan the page", "scan the website"],
    ask: ["ask", "ask the assistant", "tell the assistant", "chat", "message"],
    lead: ["uh", "um", "uhm", "erm", "er", "ah", "eh", "hmm", "okay", "ok", "so", "now", "please", "can you", "could you", "would you", "will you", "i want to", "i'd like to", "let's"],
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
    sendBare: ["send", "submit", "send it", "present", "presend", "pre send", "press end"],
    send: ["send it", "send that", "send this", "send the message", "send message", "send now", "now send", "and send", "then send", "press send", "click send", "hit send", "tap send", "push send", "press the send button", "click the send button"],
  },
  de: {
    click: ["drücke", "drücken", "klicke", "klick", "klicke auf", "klick auf", "tippe auf", "tippe", "wähle", "öffne", "aktiviere", "gehe zu", "geh zu"],
    type: ["tippe ein", "schreibe", "schreib", "gib ein"],
    scan: ["scanne", "scan", "prüfe", "prüf", "teste", "überprüfe", "analysiere"],
    ask: ["frage", "frag", "frag den assistenten", "nachricht"],
    lead: ["äh", "ähm", "öhm", "hm", "also", "okay", "ok", "bitte", "kannst du", "könntest du", "jetzt", "mal"],
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
    sendBare: ["senden", "sende", "absenden", "abschicken", "schick ab", "schicke ab"],
    send: ["drücke senden", "drück senden", "drücken senden", "klicke senden", "klick senden", "klicke auf senden", "klick auf senden", "tippe auf senden", "jetzt senden", "und senden", "und abschicken", "schick es ab", "schicke es ab"],
  },
  es: {
    click: ["pulsa", "pulsar", "presiona", "presionar", "haz clic en", "haz clic", "clic en", "toca", "elige", "selecciona", "abre", "activa", "ve a"],
    type: ["escribe", "teclea", "introduce"],
    scan: ["escanea", "escanear", "analiza", "analizar", "revisa", "comprueba", "prueba"],
    ask: ["pregunta", "pregúntale", "preguntale", "mensaje"],
    lead: ["eh", "em", "este", "pues", "bueno", "vale", "ok", "por favor", "puedes", "podrías", "podrias", "ahora"],
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
    sendBare: ["enviar", "envía", "envia", "envíalo", "envialo", "mandar", "manda", "mándalo", "mandalo"],
    send: ["pulsa enviar", "presiona enviar", "haz clic en enviar", "toca enviar", "y enviar", "y envía", "y envia", "ahora envía", "ahora envia"],
  },
  fr: {
    click: ["appuie sur", "appuyer sur", "clique sur", "cliquer sur", "touche", "choisis", "sélectionne", "selectionne", "ouvre", "active", "va à", "va a"],
    type: ["tape", "écris", "ecris", "saisis", "dicte"],
    scan: ["scanne", "scanner", "scan", "analyse", "analyser", "vérifie", "verifie", "teste"],
    ask: ["demande", "pose la question", "message"],
    lead: ["euh", "heu", "hum", "bon", "alors", "ok", "s'il te plaît", "s il te plait", "stp", "peux tu", "tu peux", "maintenant"],
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
    sendBare: ["envoyer", "envoie", "envoyez", "envoie le", "envoie-le"],
    send: ["appuie sur envoyer", "appuyer sur envoyer", "clique sur envoyer", "cliquer sur envoyer", "et envoyer", "et envoie", "envoie maintenant", "envoie le message"],
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

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Drop "uh", "please", "can you" from the front (and "please" from the end)
 * of the raw words, keeping their case and punctuation for dictation. The
 * recogniser writes hesitations down ("Uh please scan …"), and before this a
 * command after one was read as the name of a button.
 */
function stripLead(raw: string, lead: string[]): string {
  const alts = [...lead]
    .sort((a, b) => b.length - a.length)
    .map((l) => escapeRe(l).replace(/'/g, "['’]?"));
  const front = new RegExp(`^(?:${alts.join("|")})(?=[\\s,.!?]|$)[\\s,.!?]*`, "iu");
  let text = raw.trim();
  for (let i = 0; i < 6; i++) {
    const next = text.replace(front, "");
    if (next === text) break;
    text = next;
  }
  return text.replace(/[\s,]+(?:please|bitte|por favor|s['’]il te plaît|stp)[\s.!?]*$/iu, "").trim();
}

/**
 * A web address in what was heard, or null. Recognisers write a spoken
 * address as "example.com" or as "example dot com", sometimes with spaces
 * round the dot, and end the sentence with a full stop.
 */
export function addressInSpeech(raw: string): string | null {
  const text = raw
    .replace(/\s+(?:dot|punkt|punto|point)\s+/giu, ".")
    .replace(/\s*\.\s*(?=[\p{L}\p{N}])/gu, ".")
    .replace(/\s+(?:slash|schrägstrich|barra|barre oblique)\s+/giu, "/");
  const m = text.match(/(?:https?:\/\/)?(?:[\p{L}\p{N}-]+\.)+\p{L}{2,}(?::\d+)?(?:\/\S*)?/iu);
  if (!m) return null;
  const url = m[0].replace(/[.,!?;:)]+$/, "");
  return /^https?:\/\//i.test(url) ? url : `https://${url.toLowerCase()}`;
}

/**
 * A send at the end of what was heard, and the words before it, or null.
 *
 * The recogniser runs on between pauses, so a quick "Send … press send"
 * comes back as one result, "Send press send", and a sentence and its send
 * as "why should I make my website accessible press send". Until 24 Nov 2026
 * only a result that was exactly a button's name pressed it, so both were
 * written into the chat box instead of sending it. Now every send word is
 * taken off the end: if nothing is left, it is a send; if words are left, it
 * is a send only when the last one taken was a plain command ("press send",
 * "send it"), not a bare "send" that a question can end on.
 */
function sendAtEnd(raw: string, text: string, w: Words): { before: string } | null {
  const bare = w.sendBare.map(normalize);
  const plain = w.send.map(normalize);
  const all = [...new Set([...bare, ...plain])].sort((a, b) => b.length - a.length);
  let rest = text;
  let taken = 0;
  let lastPlain = false;
  for (;;) {
    const hit = all.find((p) => rest === p || rest.endsWith(" " + p));
    if (!hit) break;
    if (taken === 0) lastPlain = plain.includes(hit);
    rest = rest.slice(0, rest.length - hit.length).trim();
    taken += hit.split(" ").length;
  }
  if (taken === 0) return null;
  if (!rest) return { before: "" };
  if (!lastPlain) return null;
  // Cut the same number of words off the raw text, keeping its case and
  // punctuation for the chat, then the punctuation that led into the send.
  const words = raw.trim().split(/\s+/);
  let cut = 0;
  let i = words.length;
  while (i > 0 && cut < taken) {
    i--;
    const n = normalize(words[i]);
    if (n) cut += n.split(" ").length;
  }
  return { before: words.slice(0, i).join(" ").replace(/[\s,;:–-]+$/u, "").trim() };
}

/** What was said, as a command. `heard` is the recogniser's raw words. */
export function parseCommand(heard: string, lang: Lang): VoiceCommand {
  const w = WORDS[lang] ?? WORDS.en;
  heard = stripLead(heard, w.lead);
  const text = normalize(heard);
  if (!text) return { kind: "none" };

  if (w.stop.map(normalize).includes(text)) return { kind: "stop" };
  if (w.help.map(normalize).includes(text)) return { kind: "help" };
  const sent = sendAtEnd(heard, text, w);
  if (sent) {
    const target = w.sendBare[0];
    if (!sent.before) return { kind: "send", text: "", target };
    // "type hello, press send": the words to write are the type command's.
    const inner = parseCommand(sent.before, lang);
    if (inner.kind === "scan") return inner;
    const words = inner.kind === "type" || inner.kind === "ask" || inner.kind === "phrase" ? inner.text : sent.before;
    return { kind: "send", text: words, target };
  }

  // Dictation keeps the speaker's own words, so it is cut from the raw text
  // (case and punctuation as the recogniser wrote them), not the normalised.
  const raw = heard.trim();
  const after = (verbs: string[]): string | null => {
    for (const v of [...verbs].sort((a, b) => b.length - a.length)) {
      const m = raw.match(new RegExp(`^${escapeRe(v)}[\\s,:]+(.+)$`, "iu"));
      if (m) return m[1].trim();
    }
    return null;
  };

  // "scan example.com". Recognisers often hear "scan" as "can", so in
  // English "can" counts too, but only when an address follows it: "can
  // you help" is not a scan.
  const scanRest = after([...w.scan, ...(lang === "en" ? ["can", "skan", "scam"] : [])]);
  if (scanRest !== null) {
    const url = addressInSpeech(scanRest);
    if (url) return { kind: "scan", url };
  }
  const asked = after(w.ask);
  if (asked) return { kind: "ask", text: asked };
  // "chat", "ask" on its own: go to the chat box and wait for the words.
  if (w.ask.map(normalize).includes(text)) return { kind: "ask", text: "" };
  const typed = after(w.type);
  if (typed) return { kind: "type", text: typed };
  // An address said on its own ("example.com", "example dot com").
  if (text.split(" ").length <= 4) {
    const url = addressInSpeech(raw);
    const said = url && normalize(url.replace(/^https?:\/\//i, ""));
    const spoken = normalize(raw.replace(/\b(?:dot|punkt|punto|point|slash)\b/giu, " "));
    if (said && said === spoken) return { kind: "scan", url: url! };
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
  // No verb at all: "send", "new scan", or a sentence for the chat. The
  // component presses a control only on a strong match and otherwise writes
  // the words, as heard, into the chat box.
  return name ? { kind: "phrase", target: name, text: raw } : { kind: "none" };
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
