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
    // Set when the banner was found inside an iframe rather than the host
    // page — which is where Sourcepoint, OneTrust and Didomi all put theirs.
    // `selector` is then a path through that frame's document and means
    // nothing in the main one, so anything that resolves it later has to know
    // where to look.
    frameUrl?: string;
  } | null;
  // What a screen reader meets while the banner is up — measured in the same
  // pass as the banner itself so the two always describe the same element.
  // Null when no banner was found. tabsSampled/tabsInBanner arrive later,
  // from the keyboard probe in renderPage: a page function cannot press Tab.
  consentA11y: {
    // role on the banner root or its closest dialog descendant; null when
    // the layer never says what it is.
    role: string | null;
    accessibleName: boolean;
    // Share of the page's visible text OUTSIDE the banner that is hidden
    // from assistive tech (aria-hidden/inert on an ancestor). High + focus
    // elsewhere is the "screen reader hears silence" state.
    bgHiddenPct: number;
    sampledChars: number;
    focusInBanner: boolean;
    tabsSampled?: number;
    tabsInBanner?: number;
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
  //
  // Matched in the languages this report is actually read in, which is the
  // whole point of it. Every pattern here was English-only, on a tool whose
  // subject is EU accessibility law and GDPR consent — so on a German or
  // French site the commonest dark pattern of all was invisible. Measured on
  // bundesregierung.de: the banner was found and reported for keyboard faults
  // while the consent analysis returned nothing at all, because its buttons
  // say "Akzeptieren" and "Ablehnen".
  //
  // Word boundaries are Unicode-aware rather than \b, which is defined on
  // ASCII word characters: "odrzuć" ends in a character \b does not consider
  // part of a word, so \bodrzuć\b matches unreliably. Lookarounds on \p{L}
  // treat every alphabet the same way.
  const edge = (body: string) => new RegExp(`(?<!\\p{L})(?:${body})(?!\\p{L})`, "iu");
  const CONSENT_RE = edge(
    "cookies?|consent|gdpr|tracking|privacy preferences" +
      "|zustimmung|einwilligung|datenschutz" + // de
      "|consentement|confidentialit\u00e9" + // fr
      "|toestemming|privacyinstellingen" + // nl
      "|consentimiento|privacidad" + // es
      "|consenso|privacy" + // it
      "|zgoda|prywatno\u015b\u0107" + // pl
      "|samtycke|integritet" + // sv
      "|samtykke" // da/no
  );
  const ACCEPT_RE = edge(
    "accept|agree|allow|got it|okay|ok|yes|enable|i understand|continue" +
      "|akzeptieren|zustimmen|einverstanden|annehmen|erlauben|alle auswählen" + // de
      "|accepter|j'accepte|tout accepter|autoriser" + // fr
      "|accepteren|akkoord|toestaan|alles toestaan" + // nl
      "|aceptar|permitir|estoy de acuerdo" + // es
      "|accetta|accetto|consenti" + // it
      "|aceitar|permitir" + // pt
      "|akceptuj|zgadzam|zezw\u00f3l" + // pl
      "|acceptera|godk\u00e4nn|till\u00e5t" + // sv
      "|tillad" // da
  );
  const REJECT_RE = edge(
    "reject|decline|refuse|deny|disagree|opt[- ]?out|necessary only|essential only" +
      "|only necessary|only essential|strictly necessary|no thanks|do not (?:accept|allow|sell)" +
      "|ablehnen|verweigern|widersprechen|nur notwendige|nur erforderliche|nur essenzielle" + // de
      "|refuser|tout refuser|rejeter|continuer sans accepter|poursuivre sans accepter" + // fr
      "|weigeren|afwijzen|alleen noodzakelijke|alleen functionele" + // nl
      "|rechazar|denegar|solo necesarias|s\u00f3lo necesarias" + // es
      "|rifiuta|nega|solo necessari" + // it
      "|rejeitar|recusar|apenas necess\u00e1rios" + // pt
      "|odrzu\u0107|odm\u00f3w|tylko niezb\u0119dne" + // pl
      "|avvisa|neka|endast n\u00f6dv\u00e4ndiga" + // sv
      "|afvis|kun n\u00f8dvendige" // da
  );
  const MANAGE_RE = edge(
    "manage|settings|preferences|customi[sz]e|options|choose|more options" +
      "|einstellungen|verwalten|anpassen|auswahl" + // de
      "|param\u00e8tres|g\u00e9rer|personnaliser" + // fr
      "|instellingen|beheren|aanpassen" + // nl
      "|configurar|ajustes|personalizar" + // es
      "|impostazioni|gestisci|personalizza" + // it
      "|configura\u00e7\u00f5es|gerir" + // pt
      "|ustawienia|zarz\u0105dzaj" + // pl
      "|inst\u00e4llningar|hantera" + // sv
      "|indstillinger" // da
  );

  let consentBanner: DarkPatternSignals["consentBanner"] = null;
  let bannerEl: HTMLElement | null = null;
  const bannerCandidates = Array.from(
    document.querySelectorAll<HTMLElement>('div, section, aside, dialog, [role="dialog"], form')
  );
  for (const el of bannerCandidates) {
    if (consentBanner) break;
    try {
      if (!isVisible(el)) continue;
      const text = textOf(el);
      // The 2000-char cap is the wrapper guard — a whole page about cookies
      // must not read as a banner. But pay-or-consent walls are essays:
      // corriere.it's runs past 2000 and lemonde.fr's further still, and the
      // cap was silently excusing exactly the walls that treat readers
      // worst (found when a production scan captured corriere's wall in the
      // screenshot while detecting no banner at all). An overlay gets more
      // rope: fixed or sticky, a dialog, or covering 40% of the viewport is
      // not a page wrapper, whatever its word count.
      const overlayLike = (node: Element): boolean => {
        if (node.tagName === "DIALOG" || node.getAttribute("role") === "dialog") return true;
        const cs = getComputedStyle(node);
        if (cs.position === "fixed" || cs.position === "sticky") return true;
        const r = node.getBoundingClientRect();
        return r.width * r.height >= window.innerWidth * window.innerHeight * 0.4;
      };
      const withinBannerLength = (node: Element): boolean => {
        const len = textOf(node).length;
        return len >= 20 && len <= (overlayLike(node) ? 6000 : 2000);
      };
      if (!withinBannerLength(el)) continue;
      if (!CONSENT_RE.test(text)) continue;
      const controls = Array.from(el.querySelectorAll(clickableSelector)).filter(isVisible);
      if (controls.length === 0 || controls.length > 12) continue;
      // Prefer the innermost matching container: skip if a descendant also
      // qualifies, so we describe the banner itself rather than a page wrapper.
      //
      // "Qualifies" has to mean it carries a choice, not merely a control.
      // Requiring only some clickable descendant handed the banner to an inner
      // block that had one — a "more information" toggle, a link to the
      // privacy policy — which then failed the accept/reject test below and
      // was dropped, while the container that did hold the buttons had already
      // been skipped in its favour. Nothing was reported at all.
      //
      // Measured on bundesregierung.de, whose banner nests three deep and puts
      // "Alle auswählen" and "Auswahl bestätigen" at one level and expandable
      // detail rows at another.
      const carriesChoice = (node: Element) =>
        Array.from(node.querySelectorAll(clickableSelector))
          .filter(isVisible)
          .some((c) => {
            const t = accessibleText(c);
            return !!t && (ACCEPT_RE.test(t) || REJECT_RE.test(t));
          });
      // The descendant must clear the SAME length gate the candidate pass
      // applies, or the skip orphans the banner: a fixed scrim yields to its
      // inner card, the card then flunks its own length check, and nothing
      // is reported at all — the bundesregierung.de trap in a new coat,
      // measured again on the verbose-wall fixture.
      const hasQualifyingDescendant = bannerCandidates.some(
        (other) =>
          other !== el &&
          el.contains(other) &&
          CONSENT_RE.test(textOf(other)) &&
          withinBannerLength(other) &&
          carriesChoice(other)
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
      bannerEl = el;
    } catch {
      // skip a bad candidate
    }
  }

  // ---- Confirmshaming -----------------------------------------------------
  // Guilt-tripping decline wording: a refusal phrased in the first person so
  // the user has to "admit" something ("No thanks, I don't want to save money").
  // One structural idea per language: a refusal ("no/nein/non…") joined to a
  // first-person admission ("I don't want / I'd rather pay full price").
  // English-only until the coverage audit found four of five dark-pattern
  // detectors silent on the German, French and Dutch sites this product is
  // for — the same miss the consent regexes fixed after bundesregierung.de.
  const SHAME_RES = [
    /\bno\b[^.!?]{0,60}\b(i|i'?m|i'?ll|we)\b[^.!?]{0,60}\b(don'?t|do not|hate|prefer|rather|like)\b/i,
    /\bi\b[^.!?]{0,40}\b(don'?t|do not)\b[^.!?]{0,40}\b(want|need|care|like|deserve)\b/i,
    /\b(i'?ll|i will|i'd rather)\b[^.!?]{0,40}\b(pay|miss|risk|stay|remain)\b/i,
    // de
    /\bnein\b[^.!?]{0,60}\b(ich|wir)\b[^.!?]{0,60}\b(möchte|will|brauche|mag|verzichte)\b/i,
    /\bich\b[^.!?]{0,40}\b(verzichte|möchte (kein|nicht)|will (kein|nicht)|brauche (kein|nicht))/i,
    /\b(zahle|verpasse) lieber\b/i,
    // fr
    /\bnon\b[^.!?]{0,60}\bje\b[^.!?]{0,60}\b(ne|n'|préfère|veux)\b/i,
    /\bje préfère (payer|rater|perdre)\b/i,
    // nl
    /\bnee\b[^.!?]{0,60}\bik\b[^.!?]{0,60}\b(wil|hoef|liever)\b/i,
    /\bik (wil|hoef) (geen|niet)\b/i,
    // es
    /\bno\b[^.!?]{0,40}\b(quiero|necesito|me interesa)\b/i,
    /\bprefiero (pagar|perder)\b/i,
    // it
    /\bnon (voglio|mi interessa|ne ho bisogno)\b/i,
    /\bpreferisco (pagare|perdere)\b/i,
    // pt
    /\bnão (quero|preciso|me interessa)\b/i,
    /\bprefiro (pagar|perder)\b/i,
    // pl
    /\bnie,? (chcę|potrzebuję)\b/i,
    /\bwolę (płacić|przepłacać|stracić)\b/i,
    // sv
    /\bnej\b[^.!?]{0,60}\bjag\b[^.!?]{0,60}\b(vill|behöver|föredrar)\b/i,
    /\bjag vill inte\b/i,
    // da
    /\bnej\b[^.!?]{0,60}\bjeg\b[^.!?]{0,60}\b(vil|behøver|foretrækker)\b/i,
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
  const OPTIN_RE = new RegExp(
    "\\b(newsletter|subscribe|subscription|marketing|promotion|promotional|offers|deals|updates|third[- ]part|partners|share (my|your)|email me|sign me up|keep me posted|mailing list" +
      "|angebote|werbung|neuigkeiten|partnern?|dritte|informiert|abonnieren" + // de
      "|offres|promotions|actualités|partenaires|publicité|abonner|informé" + // fr
      "|aanbiedingen|nieuwsbrief|reclame|op de hoogte" + // nl
      "|ofertas|promociones|boletín|publicidad|socios|novedades" + // es
      "|offerte|promozioni|novità|pubblicità|aggiornamenti" + // it
      "|promoções|boletim|publicidade|parceiros|novidades" + // pt
      "|oferty|promocje|biuletyn|reklam|partnerów|nowości" + // pl
      "|erbjudanden|nyhetsbrev|uppdateringar" + // sv
      "|tilbud|nyhedsbrev|opdateringer" + // da
      ")\\b",
    "i"
  );
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
  // Two different claims wearing the same words, and only one is a dark
  // pattern.
  //
  // A quantity claim — "only 2 left", "18 people are viewing this" — cannot
  // be checked by the person reading it, which is exactly what makes it
  // useful for pressuring them. A deadline claim can: "Last chance, through
  // 9 August" names a date, and a date is either true or it is not.
  //
  // Splitting them was forced by a real page. MoMA lists closing exhibitions
  // as "Last chance — Through Aug 9", and this reported the museum three
  // times for manufacturing urgency about a genuine, published closing date.
  // Accusing a site of a deceptive practice regulators pursue is not a small
  // thing to get wrong, and it was wrong here.
  //
  // So deadline wording is only reported when no date accompanies it. "Hurry,
  // offer ends soon" stays a finding; "Ends 31 December" does not.
  const DEADLINE_RE = new RegExp(
    "\\b(hurry|act now|don'?t miss out|limited time|offer ends|ends (in|soon)|expires? (in|soon)|while stocks last|last chance|final call|closing soon" +
      "|beeil|nur für kurze zeit|angebot endet|endet bald|läuft bald ab|solange der vorrat reicht|letzte chance|nicht verpassen" + // de
      "|dépêchez|offre limitée|durée limitée|l'offre se termine|se termine bientôt|dernière chance|jusqu'à épuisement|ne (manquez|ratez) pas" + // fr
      "|haast je|beperkte tijd|aanbieding eindigt|eindigt binnenkort|laatste kans|zolang de voorraad strekt|mis het niet" + // nl
      "|date prisa|tiempo limitado|la oferta termina|termina pronto|última oportunidad|hasta agotar existencias|no te lo pierdas" + // es
      "|affrettati|tempo limitato|l'offerta scade|scade presto|ultima occasione|fino ad esaurimento|non perdere" + // it
      "|última chance|oferta termina|termina em breve|até esgotar|não perca" + // pt
      "|pospiesz się|ograniczony czas|oferta kończy|kończy się wkrótce|ostatnia szansa|do wyczerpania zapasów|nie przegap" + // pl
      "|skynda|begränsad tid|erbjudandet (slutar|går ut)|sista chansen|så länge lagret räcker|missa inte" + // sv
      "|skynd dig|begrænset tid|tilbuddet (slutter|udløber)|sidste chance|så længe lager haves|gå ikke glip" + // da
      ")\\b",
    "i"
  );
  const URGENCY_PATTERNS: Array<{ kind: string; re: RegExp }> = [
    { kind: "scarcity", re: /\bonly \d+ (left|remaining|in stock|spots?|seats?|rooms?|tickets?)\b/i },
    { kind: "scarcity", re: /\b\d+ (people|others|customers|guests) (are )?(viewing|looking|booked|bought)\b/i },
    // Still quantity claims: no date makes "almost sold out" verifiable.
    { kind: "scarcity", re: /\b(almost (gone|sold out)|selling fast|going fast)\b/i },
    // The same two quantity shapes per language — "only N left" and
    // "N people are viewing" — kept to the highest-precision forms.
    { kind: "scarcity", re: /\bnur noch \d+ (verfügbar|übrig|auf lager|stück|plätze|zimmer)\b/i }, // de
    { kind: "scarcity", re: /\b\d+ (personen|andere) (sehen|schauen)\b|\bfast ausverkauft\b/i }, // de
    { kind: "scarcity", re: /\b(plus que|il ne reste que) \d+\b|\bpresque épuisé\b/i }, // fr
    { kind: "scarcity", re: /\b\d+ personnes (regardent|consultent)\b/i }, // fr
    { kind: "scarcity", re: /\bnog (maar |slechts )?\d+ (beschikbaar|op voorraad|over|kamers|plekken)\b|\bbijna uitverkocht\b/i }, // nl
    { kind: "scarcity", re: /\b(solo |sólo )?quedan? \d+\b|\bcasi agotado\b/i }, // es
    { kind: "scarcity", re: /\bsolo \d+ (rimast|disponibil)\w*\b|\bquasi esaurito\b/i }, // it
    { kind: "scarcity", re: /\bapenas \d+ (restante|disponíve)\w*\b|\bquase esgotado\b/i }, // pt
    { kind: "scarcity", re: /\bzostał[oy]? (tylko )?\d+\b|\bprawie wyprzedane\b/i }, // pl
    { kind: "scarcity", re: /\b(endast|bara) \d+ kvar\b|\bnästan slutsåld\b/i }, // sv
    { kind: "scarcity", re: /\bkun \d+ tilbage\b|\bnæsten udsolgt\b/i }, // da
    { kind: "urgency", re: DEADLINE_RE },
  ];
  // A specific day. Deliberately not matching "soon", "today" or a bare
  // weekday — those are the vague ones the pattern is about.
  // Month stems across the languages the detectors above speak, so "bis
  // 9. August" or "jusqu'au 31 décembre" counts as a dated claim — without
  // these, the MoMA-class false positive (a truthful published deadline
  // reported as manufactured urgency) simply recurs in translation. Stems,
  // because the regexes below append [a-z]* for the suffix.
  const MONTHS =
    "jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec" +
    "|märz|mai|okt|dez" + // de (jan/feb/apr/jun/jul/aug/sep/nov share stems)
    "|fév|avr|juin|juil|août|aout|déc" + // fr
    "|maart|mei|augustus" + // nl
    "|ene|abr|mayo|ago|dic" + // es
    "|gen|mag|giu|lug|set|ott" + // it
    "|fev|out|dez" + // pt
    "|sty|lut|kwi|maj|cze|lip|sie|wrz|paź|lis|gru" + // pl
    "|okt|dec"; // sv/da share the rest
  const HAS_DATE = new RegExp(
    "\\b(" +
      "\\d{4}-\\d{2}-\\d{2}" + // 2026-08-09
      "|\\d{1,2}[/.]\\d{1,2}(?:[/.]\\d{2,4})?" + // 9/8 or 09.08.2026
      `|(?:${MONTHS})[a-z]*\\.?\\s+\\d{1,2}` + // Aug 9 / August 9
      `|\\d{1,2}\\.?\\s+(?:${MONTHS})[a-z]*` + // 9 Aug / 9 August / 9. August (de ordinal)
      ")\\b",
    "i"
  );
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
      // A deadline that names its date is a statement of fact, whoever is
      // making it. Quantity claims get no such exemption — a date does not
      // make "only 2 left" any easier to verify.
      //
      // The date is looked for in the surrounding block, not just this
      // element, because it is usually a sibling: MoMA renders the phrase and
      // the date as two separate paragraphs inside one exhibition card, so
      // checking the element alone still reported it. The parent is as wide
      // as this goes, and only when the parent is small enough to be one
      // card — otherwise a date anywhere on a long page would excuse genuine
      // pressure somewhere else on it.
      if (hit.kind === "urgency") {
        const near = el.parentElement ? textOf(el.parentElement) : t;
        const context = near.length <= 300 ? near : t;
        if (HAS_DATE.test(context)) continue;
      }
      const key = t.toLowerCase();
      if (seenUrgency.has(key)) continue;
      seenUrgency.add(key);
      urgencyClaims.push({ selector: cssPath(el), snippet: snippetOf(el), text: t, kind: hit.kind });
    } catch {
      // skip
    }
  }

  // ---- What a screen reader meets while the banner is up ------------------
  // Measured here, beside the banner detection, because both must describe
  // the same element. An EU-site sweep (18 Aug 2026) found the two failure
  // shapes these facts separate: a layer that aria-hides the whole page while
  // focus never enters it (the reader hears silence), and a layer with no
  // role, no name and no focus (the reader never learns the wall exists).
  let consentA11y: DarkPatternSignals["consentA11y"] = null;
  if (bannerEl) {
    try {
      const dlg =
        bannerEl.matches('[role="dialog"], [role="alertdialog"], dialog')
          ? bannerEl
          : bannerEl.querySelector('[role="dialog"], [role="alertdialog"], dialog') ?? bannerEl;
      const role =
        dlg.getAttribute("role") ?? (dlg.tagName === "DIALOG" ? "dialog" : null);
      const accessibleName = !!(
        dlg.getAttribute("aria-label") || dlg.getAttribute("aria-labelledby")
      );
      // Walk the page's visible text outside the banner and count how much
      // of it assistive tech is told to skip. Character-weighted, capped, so
      // a heavy page cannot stall the scan.
      const chain = new Set<Element>();
      for (let n: Element | null = bannerEl; n; n = n.parentElement) chain.add(n);
      const atHidden = (start: Element): boolean => {
        for (let a: Element | null = start; a && a !== document.documentElement; a = a.parentElement) {
          if (chain.has(a)) return false;
          if (a.getAttribute("aria-hidden") === "true" || a.hasAttribute("inert")) return true;
        }
        return false;
      };
      let total = 0;
      let hidden = 0;
      let seen = 0;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let t: Node | null;
      while ((t = walker.nextNode()) && seen < 3000) {
        const txt = (t.textContent ?? "").trim();
        if (!txt) continue;
        const p = t.parentElement;
        if (!p || bannerEl.contains(p)) continue;
        const cs = getComputedStyle(p);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        seen++;
        total += txt.length;
        if (atHidden(p)) hidden += txt.length;
      }
      consentA11y = {
        role,
        accessibleName,
        bgHiddenPct: total ? Math.round((hidden / total) * 100) : 0,
        sampledChars: total,
        focusInBanner: document.activeElement
          ? bannerEl.contains(document.activeElement)
          : false,
      };
    } catch {
      // best-effort: a broken measurement must not cost the banner finding
    }
  }

  return { consentBanner, consentA11y, confirmshaming, preCheckedOptIns, urgencyClaims };
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
            ? "Your cookie banner lets people accept in one click. Refusing means going into a settings screen first. Making refusal slower than acceptance is the most-cited consent dark pattern. Regulators in the EU and UK treat it as invalid consent."
            : "Your cookie banner offers a way to accept, but no visible way to refuse at all. Consent that can't be declined as easily as it's given isn't valid under GDPR/PECR. To visitors, it reads as a trick.",
          'Put a "Reject all" (or "Only necessary") control directly on the banner. Give it the same level and visual weight as "Accept all" — one click each way.',
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
            `Your cookie banner styles "accept" as a solid button while the refuse option (“${banner.rejectControls[0].text}”) stays plain text. Weighting one choice visually is a recognised nudge — people click the prominent option without really choosing.`,
            "Give the accept and reject controls equal visual weight: same size, same button style, side by side. The choice is then genuinely free.",
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
          `This page ticks a marketing opt-in for the visitor before they choose (“${optIn.label.slice(0, 80)}”). Pre-ticked consent boxes are explicitly invalid under GDPR, and people who miss them feel signed up without agreeing.${n > 1 ? ` This page has ${n} pre-ticked opt-ins.` : ""}`,
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
        `This page words its decline option to make the visitor feel bad for choosing it: “${shame.text.slice(0, 100)}”. This is confirmshaming — the decline reads as an admission rather than a neutral choice.`,
        'Word the decline neutrally ("No thanks", "Not now", "Close") with the same tone as the accept option. Let people say no without the page making them feel foolish.',
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
          ? `This page shows a scarcity claim: “${claim.text.slice(0, 100)}”. Worth checking it reflects real stock or real activity. Invented scarcity is a deceptive practice regulators (FTC, EU UCPD) actively pursue. Shoppers increasingly distrust it.`
          : `This page applies time pressure: “${claim.text.slice(0, 100)}”. Worth checking the deadline is real. Countdowns that reset on reload, or offers that never actually expire, are a deceptive practice. They erode trust when noticed.`,
        isScarcity
          ? "Only show stock or activity counts that come from real data, and drop them where they don't. If the number is real, say where it comes from."
          : "Only show a deadline that genuinely applies, and let the offer actually end when it does. Remove countdowns that restart on every visit.",
        isScarcity ? HELP.scarcity : HELP.urgency
      )
    );
  }

  return findings;
}
