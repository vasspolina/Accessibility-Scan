import { randomUUID } from "node:crypto";
import type { AccessibilityFinding } from "../../types/report.js";

// Deterministic detection of "dark patterns" — interface choices that pressure,
// shame, or trick people rather than informing them. These are reported in the
// dark-pattern category, which deliberately does NOT affect the accessibility
// score (see merge/scoring.ts): they're trust and credibility red flags, and in
// the EU several are also consent-law problems, but they aren't WCAG failures.
//
// Detection is intentionally conservative — every check keys off an explicit
// signal in the markup (a pre-ticked checkbox, a consent banner with no reject
// control, first-person guilt wording on a decline button) rather than trying
// to judge tone. A false accusation of manipulating users is far more damaging
// to trust in the report than a missed one.
//
// Taxonomy and naming follow Harry Brignull's deceptive.design patterns.

export interface DarkPatternSignals {
  // The cookie/consent banner, when one is on the page, with its choice
  // controls classified. Used to spot "accept is one click, refusing isn't".
  consentBanner: {
    selector: string;
    snippet: string;
    acceptControls: ChoiceControl[];
    rejectControls: ChoiceControl[];
    // "Manage"/"Settings"/"Customise" — not a refusal, an extra step before
    // one is possible.
    manageControls: ChoiceControl[];
  } | null;
  // Decline/dismiss controls worded to make the user feel bad for declining.
  confirmshaming: Array<{ selector: string; snippet: string; text: string }>;
  // Opt-in checkboxes ticked by default in the markup.
  preCheckedOptIns: Array<{ selector: string; snippet: string; label: string }>;
  // Visible urgency/scarcity claims ("Only 2 left!", "Offer ends soon").
  urgencyClaims: Array<{ selector: string; snippet: string; text: string; kind: string }>;
}

export interface ChoiceControl {
  selector: string;
  text: string;
  // Rendered as a filled/solid control rather than a bare link — the standard
  // way one option is pushed over another.
  prominent: boolean;
}

// Runs inside the browser page context via page.evaluate — must be fully
// self-contained (no closures over outer-scope variables, all helpers inline).
export function collectDarkPatternSignalsInPage(): DarkPatternSignals {
  function cssPath(el: Element): string {
    if (el.id) return `#${el.id}`;
    const parts: string[] = [];
    let node: Element | null = el;
    while (node && node.nodeType === 1 && parts.length < 6) {
      let selector = node.tagName.toLowerCase();
      const parent: Element | null = node.parentElement;
      if (parent) {
        const tag = node.tagName;
        const siblings = Array.from(parent.children).filter((c) => c.tagName === tag);
        if (siblings.length > 1) selector += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(selector);
      node = parent;
    }
    return parts.join(" > ");
  }

  // Strip class/style/data-* before truncating, so the element's own text and
  // semantic attributes survive instead of being crowded out by utility CSS.
  const snippetOf = (el: Element) => {
    try {
      const clone = el.cloneNode(true) as Element;
      const strip = (node: Element) => {
        for (const attr of Array.from(node.attributes)) {
          if (/^(class|style)$/i.test(attr.name) || /^data-/i.test(attr.name)) {
            node.removeAttribute(attr.name);
          }
        }
        for (const child of Array.from(node.children)) strip(child);
      };
      strip(clone);
      return (clone.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
    } catch {
      return (el.outerHTML ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
    }
  };
  const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim();

  function isVisible(el: Element): boolean {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  // A control reads as "pushed" when it has its own solid fill rather than
  // being a plain link — the usual way an accept button is made to dominate.
  function isProminent(el: Element): boolean {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor || "";
    const transparent = bg === "" || bg === "transparent" || /rgba\([^)]*,\s*0\s*\)$/.test(bg);
    return !transparent;
  }

  function accessibleText(el: Element): string {
    const aria = el.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    return textOf(el).slice(0, 160);
  }

  function labelTextFor(input: Element): string {
    const aria = input.getAttribute("aria-label");
    if (aria && aria.trim()) return aria.trim();
    const id = input.getAttribute("id");
    if (id) {
      try {
        const explicit = document.querySelector(`label[for="${CSS.escape(id)}"]`);
        if (explicit) return textOf(explicit).slice(0, 160);
      } catch {
        // bad id for a selector — fall through
      }
    }
    const wrapping = input.closest("label");
    if (wrapping) return textOf(wrapping).slice(0, 160);
    const parent = input.parentElement;
    return parent ? textOf(parent).slice(0, 160) : "";
  }

  const clickableSelector = 'button, a[href], [role="button"], input[type="button"], input[type="submit"]';

  // ---- Consent banner -----------------------------------------------------
  const CONSENT_RE = /\b(cookie|cookies|consent|gdpr|tracking|privacy preferences)\b/i;
  const ACCEPT_RE = /\b(accept|agree|allow|got it|okay|ok|yes|enable|i understand|continue)\b/i;
  const REJECT_RE =
    /\b(reject|decline|refuse|deny|disagree|opt[- ]?out|necessary only|essential only|only necessary|only essential|strictly necessary|no thanks|do not (accept|allow|sell))\b/i;
  const MANAGE_RE = /\b(manage|settings|preferences|customi[sz]e|options|choose|more options)\b/i;

  let consentBanner: DarkPatternSignals["consentBanner"] = null;
  const bannerCandidates = Array.from(
    document.querySelectorAll<HTMLElement>('div, section, aside, dialog, [role="dialog"], form')
  );
  for (const el of bannerCandidates) {
    if (consentBanner) break;
    try {
      if (!isVisible(el)) continue;
      const text = textOf(el);
      if (text.length < 20 || text.length > 2000) continue;
      if (!CONSENT_RE.test(text)) continue;
      const controls = Array.from(el.querySelectorAll(clickableSelector)).filter(isVisible);
      if (controls.length === 0 || controls.length > 12) continue;
      // Prefer the innermost matching container: skip if a descendant also
      // qualifies, so we describe the banner itself rather than a page wrapper.
      const hasQualifyingDescendant = bannerCandidates.some(
        (other) =>
          other !== el &&
          el.contains(other) &&
          CONSENT_RE.test(textOf(other)) &&
          textOf(other).length >= 20 &&
          Array.from(other.querySelectorAll(clickableSelector)).filter(isVisible).length > 0
      );
      if (hasQualifyingDescendant) continue;

      const toControl = (c: Element): ChoiceControl => ({
        selector: cssPath(c),
        text: accessibleText(c),
        prominent: isProminent(c),
      });
      const accept: ChoiceControl[] = [];
      const reject: ChoiceControl[] = [];
      const manage: ChoiceControl[] = [];
      for (const c of controls) {
        const t = accessibleText(c);
        if (!t) continue;
        // Reject wins over accept: "Do not accept" contains "accept".
        if (REJECT_RE.test(t)) reject.push(toControl(c));
        else if (MANAGE_RE.test(t)) manage.push(toControl(c));
        else if (ACCEPT_RE.test(t)) accept.push(toControl(c));
      }
      if (accept.length === 0 && reject.length === 0) continue;
      consentBanner = {
        selector: cssPath(el),
        snippet: snippetOf(el),
        acceptControls: accept,
        rejectControls: reject,
        manageControls: manage,
      };
    } catch {
      // skip a bad candidate
    }
  }

  // ---- Confirmshaming -----------------------------------------------------
  // Guilt-tripping decline wording: a refusal phrased in the first person so
  // the user has to "admit" something ("No thanks, I don't want to save money").
  const SHAME_RES = [
    /\bno\b[^.!?]{0,60}\b(i|i'?m|i'?ll|we)\b[^.!?]{0,60}\b(don'?t|do not|hate|prefer|rather|like)\b/i,
    /\bi\b[^.!?]{0,40}\b(don'?t|do not)\b[^.!?]{0,40}\b(want|need|care|like|deserve)\b/i,
    /\b(i'?ll|i will|i'd rather)\b[^.!?]{0,40}\b(pay|miss|risk|stay|remain)\b/i,
  ];
  const confirmshaming: DarkPatternSignals["confirmshaming"] = [];
  for (const el of Array.from(document.querySelectorAll(clickableSelector))) {
    if (confirmshaming.length >= 6) break;
    try {
      if (!isVisible(el)) continue;
      const t = accessibleText(el);
      // A bare "No thanks" is a fine, neutral decline — shaming needs a clause.
      if (t.length < 14 || t.length > 160) continue;
      if (!SHAME_RES.some((re) => re.test(t))) continue;
      confirmshaming.push({ selector: cssPath(el), snippet: snippetOf(el), text: t });
    } catch {
      // skip
    }
  }

  // ---- Pre-ticked opt-ins -------------------------------------------------
  const OPTIN_RE =
    /\b(newsletter|subscribe|subscription|marketing|promotion|promotional|offers|deals|updates|third[- ]part|partners|share (my|your)|email me|sign me up|keep me posted|mailing list)\b/i;
  const preCheckedOptIns: DarkPatternSignals["preCheckedOptIns"] = [];
  for (const el of Array.from(document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))) {
    if (preCheckedOptIns.length >= 8) break;
    try {
      // The markup default, not the current state — this is about what the
      // page ships pre-agreed on the user's behalf.
      if (!el.hasAttribute("checked") && !el.defaultChecked) continue;
      const label = labelTextFor(el);
      if (!label || !OPTIN_RE.test(label)) continue;
      preCheckedOptIns.push({ selector: cssPath(el), snippet: snippetOf(el), label });
    } catch {
      // skip
    }
  }

  // ---- Urgency / scarcity pressure ---------------------------------------
  const URGENCY_PATTERNS: Array<{ kind: string; re: RegExp }> = [
    { kind: "scarcity", re: /\bonly \d+ (left|remaining|in stock|spots?|seats?|rooms?|tickets?)\b/i },
    { kind: "scarcity", re: /\b\d+ (people|others|customers|guests) (are )?(viewing|looking|booked|bought)\b/i },
    { kind: "scarcity", re: /\b(almost (gone|sold out)|selling fast|going fast|last chance|final call)\b/i },
    { kind: "urgency", re: /\b(hurry|act now|don'?t miss out|limited time|offer ends|ends (in|soon)|expires? (in|soon)|while stocks last)\b/i },
  ];
  const urgencyClaims: DarkPatternSignals["urgencyClaims"] = [];
  const seenUrgency = new Set<string>();
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
    if (urgencyClaims.length >= 6) break;
    try {
      // Only leaf-ish, short blocks — avoids matching a whole article that
      // merely mentions one of these phrases in passing.
      if (el.children.length > 2) continue;
      const t = textOf(el);
      if (t.length < 6 || t.length > 120) continue;
      if (!isVisible(el)) continue;
      const hit = URGENCY_PATTERNS.find((p) => p.re.test(t));
      if (!hit) continue;
      const key = t.toLowerCase();
      if (seenUrgency.has(key)) continue;
      seenUrgency.add(key);
      urgencyClaims.push({ selector: cssPath(el), snippet: snippetOf(el), text: t, kind: hit.kind });
    } catch {
      // skip
    }
  }

  return { consentBanner, confirmshaming, preCheckedOptIns, urgencyClaims };
}

const HELP = {
  confirmshaming: "https://www.deceptive.design/types/confirmshaming",
  preselection: "https://www.deceptive.design/types/preselection",
  urgency: "https://www.deceptive.design/types/fake-urgency",
  scarcity: "https://www.deceptive.design/types/fake-scarcity",
  consent:
    "https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-cookies-and-similar-technologies/",
};

function makeFinding(
  ruleId: string,
  severity: AccessibilityFinding["severity"],
  selector: string,
  snippet: string,
  description: string,
  suggestedFix: string,
  helpUrl: string
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity,
    category: "dark-pattern",
    selector,
    elementSnippet: snippet || undefined,
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

/**
 * Pure and deterministic. One finding per distinct pattern, with the offending
 * elements listed — consistent with the other deterministic layers.
 */
export function evaluateDarkPatterns(signals: DarkPatternSignals): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  const banner = signals.consentBanner;

  if (banner && banner.acceptControls.length > 0) {
    // 1. Accept is one click; refusing is not offered at all.
    if (banner.rejectControls.length === 0) {
      const viaManage = banner.manageControls.length > 0;
      findings.push(
        makeFinding(
          "dark-consent-no-reject",
          "serious",
          banner.selector,
          banner.snippet,
          viaManage
            ? "Your cookie banner lets people accept in one click, but the only way to refuse is to go into a settings screen first. Making refusal slower than acceptance is the most-cited consent dark pattern, and regulators in the EU and UK treat it as invalid consent."
            : "Your cookie banner offers a way to accept, but no visible way to refuse at all. Consent that can't be declined as easily as it's given isn't valid consent under GDPR/PECR, and it reads to visitors as a trick.",
          'Put a "Reject all" (or "Only necessary") control directly on the banner, at the same level and with the same visual weight as "Accept all" — one click each way.',
          HELP.consent
        )
      );
    } else {
      // 2. Both options exist, but one is visually pushed over the other.
      const acceptPushed = banner.acceptControls.some((c) => c.prominent);
      const rejectPlain = banner.rejectControls.every((c) => !c.prominent);
      if (acceptPushed && rejectPlain) {
        findings.push(
          makeFinding(
            "dark-consent-asymmetry",
            "moderate",
            banner.rejectControls[0].selector,
            banner.snippet,
            `Your cookie banner styles "accept" as a solid button while the refuse option (“${banner.rejectControls[0].text}”) is left as plain text. Weighting one choice visually is a recognised nudge — people click the prominent option without really choosing.`,
            "Give the accept and reject controls equal visual weight — same size, same button style, side by side — so the choice is genuinely free.",
            HELP.consent
          )
        );
      }
    }
  }

  if (signals.preCheckedOptIns.length > 0) {
    const n = signals.preCheckedOptIns.length;
    for (const optIn of signals.preCheckedOptIns) {
      findings.push(
        makeFinding(
          "dark-preselected-optin",
          "serious",
          optIn.selector,
          optIn.snippet,
          `A marketing opt-in is ticked for the visitor before they choose (“${optIn.label.slice(0, 80)}”). Pre-ticked consent boxes are explicitly invalid under GDPR, and people who miss them feel signed up without agreeing.${n > 1 ? ` ${n} pre-ticked opt-ins were found on this page.` : ""}`,
          "Ship these checkboxes unticked and let people opt in deliberately. Consent has to be an active choice, not the default.",
          HELP.preselection
        )
      );
    }
  }

  for (const shame of signals.confirmshaming) {
    findings.push(
      makeFinding(
        "dark-confirmshaming",
        "moderate",
        shame.selector,
        shame.snippet,
        `The option to decline is worded to make the visitor feel bad for choosing it: “${shame.text.slice(0, 100)}”. This is confirmshaming — the decline is phrased as an admission rather than a neutral choice.`,
        'Word the decline neutrally — "No thanks", "Not now", "Close" — with the same tone as the accept option. Let people say no without being made to feel foolish.',
        HELP.confirmshaming
      )
    );
  }

  for (const claim of signals.urgencyClaims) {
    const isScarcity = claim.kind === "scarcity";
    findings.push(
      makeFinding(
        isScarcity ? "dark-fake-scarcity" : "dark-fake-urgency",
        "minor",
        claim.selector,
        claim.snippet,
        isScarcity
          ? `This page shows a scarcity claim: “${claim.text.slice(0, 100)}”. Worth checking it reflects real stock or real activity — invented scarcity is a deceptive practice regulators (FTC, EU UCPD) actively pursue, and shoppers increasingly distrust it.`
          : `This page applies time pressure: “${claim.text.slice(0, 100)}”. Worth checking the deadline is real — countdowns that reset on reload, or offers that never actually expire, are a deceptive practice and erode trust when noticed.`,
        isScarcity
          ? "Only show stock or activity counts that come from real data, and drop them where they don't. If the number is real, say where it comes from."
          : "Only show a deadline that genuinely applies, and let the offer actually end when it does. Remove countdowns that restart on every visit.",
        isScarcity ? HELP.scarcity : HELP.urgency
      )
    );
  }

  return findings;
}
