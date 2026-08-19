import { randomUUID } from "node:crypto";
import type { DomSignals } from "../render/renderPage.js";
import type { AccessibilityFinding } from "../../types/report.js";

// Component-level design suggestions for the common building blocks of a
// site — sign-up / contact / login forms and navigation menus. Grounded in
// the W3C WAI-ARIA Authoring Practices (APG) and the relevant WCAG success
// criteria, these go beyond "is it broken" (axe's job) to "here's a better,
// more usable way to build this". Reported as design-clarity suggestions so
// they inform without moving the compliance score.

type Field = DomSignals["forms"][number]["fields"][number];

// Maps a field's name/label/type to the autocomplete token that WCAG 1.3.5
// (Identify Input Purpose) expects, so browsers and password managers can
// autofill it. Only the common, high-confidence ones — we never guess.
const AUTOCOMPLETE_HINTS: Array<{ test: RegExp; token: string; label: string }> = [
  { test: /\b(e[-\s]?mail)\b/i, token: "email", label: "email address" },
  { test: /\bfirst\s*name|given\s*name|fname\b/i, token: "given-name", label: "first name" },
  { test: /\blast\s*name|surname|family\s*name|lname\b/i, token: "family-name", label: "last name" },
  { test: /\bfull\s*name|your\s*name|\bname\b/i, token: "name", label: "full name" },
  { test: /phone|\btel\b|mobile/i, token: "tel", label: "phone number" },
  { test: /\b(zip|postal)\b/i, token: "postal-code", label: "postal code" },
  { test: /\b(street|address\s*line\s*1|address1)\b/i, token: "address-line1", label: "street address" },
  { test: /\bcity|town\b/i, token: "address-level2", label: "city" },
  { test: /\bcountry\b/i, token: "country-name", label: "country" },
  { test: /\borganization|company\b/i, token: "organization", label: "company" },
];

function fieldPurpose(field: Field): { token: string; label: string } | null {
  const haystack = `${field.name ?? ""} ${field.accessibleLabel ?? ""}`;
  if (!haystack.trim()) return null;
  for (const hint of AUTOCOMPLETE_HINTS) {
    if (hint.test.test(haystack)) return { token: hint.token, label: hint.label };
  }
  return null;
}

function looksLike(field: Field, re: RegExp): boolean {
  return re.test(`${field.name ?? ""} ${field.accessibleLabel ?? ""}`);
}

function makeFinding(
  ruleId: string,
  selector: string,
  description: string,
  suggestedFix: string,
  helpUrl: string,
  // Most of this layer is advice about clarity. A few of its rules are about
  // whether somebody can get through the page at all, and those belong with
  // the findings that count.
  category: AccessibilityFinding["category"] = "design-clarity",
  // Without these, an accessibility-category finding never reaches its
  // conformance row: normalizeCriterionId(undefined) drops it, and the row
  // reads "no-issues-found" while its failure sits in the findings list.
  // That is how 2.4.1 shipped as a row that could never fail.
  wcagCriterion?: string,
  wcagLevel?: AccessibilityFinding["wcagLevel"]
): AccessibilityFinding {
  return {
    id: randomUUID(),
    source: "automated",
    severity: "minor",
    category,
    wcagCriterion,
    wcagLevel,
    selector,
    description,
    suggestedFix,
    ruleId,
    helpUrl,
  };
}

// Link text that reads the same wherever it points. A screen-reader user can
// pull up a list of every link on the page, and a list of nine "Read more"s
// is a list of nine identical, useless entries.
//
// Deliberately whole-string matches, not substrings: "Read more about the
// 2026 fee changes" is a perfectly good link, and only a bare "Read more"
// isn't. Arrows and ellipses are here because they are common as "link text"
// and say even less than the words do.
const VAGUE_LINK_TEXT = new RegExp(
  "^(read\\s*more|more|learn\\s*more|click\\s*here|here|find\\s*out\\s*more|see\\s*more|view\\s*more|details|more\\s*details|continue|continue\\s*reading|go|link|this\\s*link|full\\s*story|read\\s*on|next|previous" +
    "|mehr|mehr\\s*erfahren|mehr\\s*lesen|weiterlesen|weiter|hier|hier\\s*klicken|mehr\\s*dazu|mehr\\s*infos|erfahren\\s*sie\\s*mehr|zum\\s*artikel" + // de
    "|en\\s*savoir\\s*plus|lire\\s*la\\s*suite|lire\\s*plus|cliquez\\s*ici|ici|plus\\s*d'infos|plus\\s*d'informations|voir\\s*plus|suite|continuer|détails" + // fr
    "|lees\\s*meer|meer|meer\\s*lezen|klik\\s*hier|meer\\s*info|meer\\s*informatie|verder\\s*lezen|bekijk\\s*meer|verder" + // nl
    "|leer\\s*más|más|más\\s*información|haz\\s*clic\\s*aquí|clic\\s*aquí|aquí|ver\\s*más|seguir\\s*leyendo|continuar|detalles" + // es
    "|leggi\\s*di\\s*più|scopri\\s*di\\s*più|clicca\\s*qui|qui|per\\s*saperne\\s*di\\s*più|maggiori\\s*informazioni|vedi\\s*di\\s*più|continua|dettagli|altro" + // it
    "|leia\\s*mais|saiba\\s*mais|clique\\s*aqui|aqui|ver\\s*mais|mais\\s*informações|mais|detalhes" + // pt
    "|czytaj\\s*więcej|więcej|kliknij\\s*tutaj|tutaj|dowiedz\\s*się\\s*więcej|zobacz\\s*więcej|dalej|szczegóły|więcej\\s*informacji" + // pl
    "|läs\\s*mer|mer|klicka\\s*här|här|mer\\s*info|mer\\s*information|se\\s*mer|fortsätt|visa\\s*mer" + // sv
    "|læs\\s*mere|mere|klik\\s*her|her|mere\\s*info|se\\s*mere|fortsæt|vis\\s*mere" + // da
    "|…|\\.\\.\\.|>|>>|→|»)$",
  "i"
);

// Nothing to say about a link that says nothing yet — axe's link-name rule
// already reports those, and reporting them twice helps nobody.
function hasName(name: string): boolean {
  return name.trim().length > 0;
}

function looksVague(name: string): boolean {
  const text = name.trim().replace(/\s+/g, " ");
  if (VAGUE_LINK_TEXT.test(text)) return true;
  // A bare URL read aloud character by character is worse than no text.
  if (/^https?:\/\//i.test(text)) return true;
  return false;
}

/**
 * Pure and deterministic — one grouped suggestion per rule, consistent with
 * the typography/motion layers.
 */
/**
 * Form error messages that are visible but not programmatically tied to a
 * field — the renderer measures isAssociatedWithField on every one, and until
 * now nothing deterministic read it: the signal fed only the AI layer, so
 * 3.3.1's coverage silently dropped to zero whenever the AI was off. An
 * undecided row, not a finding: an error visible at load may be a template
 * placeholder, so a person confirms before anyone is told to fix it.
 */
export function formErrorAssociationUndecided(
  forms: DomSignals["forms"]
): Array<{ ruleId: string; count: number; help: string; helpUrl: string }> {
  const unassociated = forms
    .flatMap((f) => f.errorMessages)
    .filter((m) => !m.isAssociatedWithField && m.text.trim().length > 0);
  if (unassociated.length === 0) return [];
  return [
    {
      ruleId: "form-error-association",
      count: unassociated.length,
      help: "Form error messages that are not tied to their field in the code",
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/error-identification.html",
    },
  ];
}

export function evaluateComponents(dom: DomSignals): AccessibilityFinding[] {
  const findings: AccessibilityFinding[] = [];
  const allFields = dom.forms.flatMap((f) => f.fields);

  // 1. Personal-detail fields missing an autocomplete attribute (WCAG 1.3.5).
  const missingAutocomplete = allFields.filter((f) => fieldPurpose(f) && !f.autocomplete);
  if (missingAutocomplete.length > 0) {
    const worst = missingAutocomplete[0];
    const purpose = fieldPurpose(worst)!;
    findings.push(
      makeFinding(
        "component-form-autocomplete",
        worst.selector,
        `Form fields that collect personal details (${missingAutocomplete.length} field${missingAutocomplete.length === 1 ? "" : "s"}, e.g. the ${purpose.label} field) are not labelled with what they collect. Browsers and password managers then cannot offer to fill them in.`,
        `Add the matching autocomplete token to each field — e.g. autocomplete="${purpose.token}" on the ${purpose.label} field. This is a one-line change per field that makes forms far faster to complete.`,
        "https://www.w3.org/WAI/WCAG21/Understanding/identify-input-purpose.html"
      )
    );
  }

  // 2. Email/phone fields using type="text" instead of the semantic input
  //    type — the phone/email keyboard never appears on mobile, and built-in
  //    validation is lost.
  const wrongInputType = allFields.filter(
    (f) =>
      (looksLike(f, /\b(e[-\s]?mail)\b/i) && f.type !== "email") ||
      (looksLike(f, /phone|\btel\b|mobile/i) && f.type !== "tel")
  );
  if (wrongInputType.length > 0) {
    findings.push(
      makeFinding(
        "component-input-type",
        wrongInputType[0].selector,
        `Email or phone fields are set as plain text boxes (${wrongInputType.length} field${wrongInputType.length === 1 ? "" : "s"}) instead of the matching type. On phones that means the generic keyboard, not one with "@" or a number pad.`,
        'Use type="email" for email fields and type="tel" for phone fields. Mobile devices then show the right keyboard, and the browser can validate the format.',
        "https://www.w3.org/WAI/tutorials/forms/"
      )
    );
  }

  // 3. Required fields that give no visible/programmatic "required" cue at
  //    all (no required attribute AND label doesn't say so). We only flag
  //    when a form has some required fields, to avoid guessing.
  const anyRequired = allFields.some((f) => f.required);
  if (anyRequired) {
    const unmarkedRequired = allFields.filter(
      (f) =>
        f.required &&
        !/\*|\(required\)|\brequired\b|\bpflichtfeld\b|\berforderlich\b|\bobligatoire\b|\brequis\b|\bverplicht\b|\bobligatorio\b|\bobbligatorio\b|\bobrigatório\b|\bwymagane\b|\bobligatorisk\b|\bpåkrævet\b/i.test(
          f.accessibleLabel ?? ""
        )
    );
    if (unmarkedRequired.length > 0) {
      findings.push(
        makeFinding(
          "component-required-cue",
          unmarkedRequired[0].selector,
          `${unmarkedRequired.length} required field${unmarkedRequired.length === 1 ? " is" : "s are"} marked required only in code, with nothing in the visible label to say so. Visitors don't find out a field was mandatory until the form rejects them.`,
          'Add a visible cue to the label of each required field, in addition to the required attribute. "Email (required)" works, or an asterisk with a "* required" key. People then know before they submit.',
          "https://www.w3.org/WAI/tutorials/forms/validation/"
        )
      );
    }
  }

  // 4. A submit-style form with no clearly-labelled submit control among the
  //    interactive elements — heuristic: there's a form, but no button/link
  //    whose accessible name reads like a submit action.
  if (dom.forms.length > 0) {
    const submitRe =
      /\b(submit|sign\s*up|sign\s*in|log\s*in|register|subscribe|send|continue|create account|get started|join|senden|absenden|abschicken|anmelden|registrieren|envoyer|valider|s'inscrire|connexion|versturen|verzenden|aanmelden|enviar|registrarse|invia|iscriviti|wyślij|zarejestruj|skicka|registrera|tilmeld)\b/i;
    const hasSubmit = dom.interactiveElements.some(
      (el) => el.type === "button" && submitRe.test(el.accessibleName)
    );
    if (!hasSubmit && allFields.length >= 2) {
      const firstForm = dom.forms[0];
      findings.push(
        makeFinding(
          "component-submit-clarity",
          firstForm.selector,
          "This form doesn't appear to have a clearly-labelled submit button. A button that just says \"Go\" or shows only an icon leaves people unsure how to complete the form. So does a form you can only submit by pressing Enter, with no visible button.",
          'Give the form a real <button type="submit"> with text that names the action: "Create account", "Send message". Avoid a generic "Submit" or an icon alone.',
          "https://www.w3.org/WAI/ARIA/apg/patterns/button/"
        )
      );
    }
  }

  // 5. Navigation menus: multiple nav landmarks that aren't individually
  //    labelled, so a screen-reader user hears "navigation… navigation…"
  //    with no way to tell them apart (APG landmark guidance).
  const navs = dom.landmarks.filter((l) => l.role === "nav" || l.role === "navigation");
  const unlabelledNavs = navs.filter((n) => !n.label);
  if (navs.length > 1 && unlabelledNavs.length > 0) {
    findings.push(
      makeFinding(
        "component-nav-labels",
        unlabelledNavs[0].selector,
        `The page has ${navs.length} separate navigation menus, and ${unlabelledNavs.length} of them have no label. Someone using a screen reader hears each one announced only as "navigation". They can't tell the main menu from the footer links or breadcrumbs.`,
        'Give each navigation an aria-label describing its purpose: aria-label="Main menu", aria-label="Footer", aria-label="Breadcrumb". They\'re then distinguishable when listed.',
        "https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/navigation.html",
        "accessibility"
      )
    );
  }

  // 6. No skip link: a keyboard user has to Tab through the whole menu on
  //    every page before reaching the content (WCAG 2.4.1 Bypass Blocks).
  //    Heuristic: none of the first several links is a "skip to…" anchor.
  const earlyLinks = dom.interactiveElements.filter((el) => el.type === "link").slice(0, 6);
  const hasSkipLink = earlyLinks.some(
    (el) => /\bskip\b/i.test(el.accessibleName) && (el.href?.startsWith("#") ?? false)
  );
  if (navs.length > 0 && earlyLinks.length > 0 && !hasSkipLink) {
    findings.push(
      makeFinding(
        "component-skip-link",
        navs[0].selector,
        "There's no \"skip to main content\" link. Keyboard and screen-reader users have to tab through the entire navigation menu before they reach the content. That happens on every single page.",
        'Add a skip link as the very first thing the Tab key reaches. Point it at #main-content and keep it visually hidden until the Tab key lands on it. It\'s a small addition that saves keyboard users dozens of key presses per page.',
        "https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html",
        "accessibility",
        "2.4.1",
        "A"
      )
    );
  }

  // 7. Links whose text says nothing about where they go (WCAG 2.4.4 Link
  //    Purpose, Level A). axe only catches links with no name at all, so a
  //    page full of "Read more" passes every automated check while being
  //    exactly the problem 2.4.4 describes.
  //    Reads linkTexts rather than interactiveElements: that list stops at 60
  //    because it goes to Claude, and on a nav-heavy page the body's "Read
  //    more" links fall outside it entirely.
  const vagueLinks = dom.linkTexts.filter((l) => hasName(l.text) && looksVague(l.text));
  // One finding per link, capped — the widget groups findings that share a
  // ruleId into a single card listing each element, the same way axe's
  // link-name findings are presented.
  for (const link of vagueLinks.slice(0, 12)) {
    const text = link.text.trim().replace(/\s+/g, " ");
    findings.push({
      id: randomUUID(),
      source: "automated",
      severity: "moderate",
      category: "accessibility",
      selector: link.selector,
      ruleId: "link-text-vague",
      wcagCriterion: "2.4.4",
      description: `This link reads only “${text}”, so it gives no clue where it goes.`,
      suggestedFix:
        "Write link text that makes sense read on its own: “Read the 2026 fee changes” rather than “Read more”. Where the design needs the short version, keep the visible text and add the full wording with aria-label.",
      helpUrl: "https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html",
      // Carries the destination, which is the only thing telling these links
      // apart — nine identical “Read more”s is precisely the problem.
      elementSnippet: `<a href="${link.href}">${text}</a>`,
    });
  }

  return findings;
}
