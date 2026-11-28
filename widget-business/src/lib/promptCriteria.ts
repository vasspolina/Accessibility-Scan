/**
 * The WCAG criterion each opening question checks, shown on its card in a
 * marker highlight at the foot of the card (user's choice,
 * 18 Nov 2026: the big question mark "looks like slop"). The number is a
 * button: pressing it puts a short explanation in the conversation, from
 * this table, with no request to the assistant.
 *
 * The names, levels and plain questions are copied from the backend's
 * conformance table (backend/src/services/conformance/wcagCriteria.ts and
 * criteriaText.{de,es,fr}.ts), the same words the report's checklist
 * uses, so the card and the report never disagree. Names stay in English
 * in every language, as the standard writes them.
 *
 * "Help me" questions and the manual test plan check no single criterion,
 * so they carry none and their card shows no number.
 */
import type { Lang } from "./i18n";

export type PromptCriterion = { name: string; level: "A" | "AA"; plain: Record<Lang, string> };

export const CRITERIA: Record<string, PromptCriterion> = {
  "1.1.1": { name: "Non-text Content", level: "A", plain: {
    en: "Do images have a description for people who can't see them?",
    de: "Haben Bilder eine Beschreibung für Menschen, die sie nicht sehen können?",
    es: "¿Tienen las imágenes una descripción para quien no puede verlas?",
    fr: "Les images ont-elles une description pour ceux qui ne les voient pas ?",
  } },
  "1.2.2": { name: "Captions (Prerecorded)", level: "A", plain: {
    en: "Do your videos have captions?",
    de: "Haben Ihre Videos Untertitel?",
    es: "¿Tienen subtítulos sus vídeos?",
    fr: "Vos vidéos ont-elles des sous-titres ?",
  } },
  "1.4.1": { name: "Use of Color", level: "A", plain: {
    en: "Is anything shown by colour alone?",
    de: "Wird etwas allein durch Farbe gezeigt?",
    es: "¿Hay algo que se indique solo con el color?",
    fr: "Quelque chose est-il indiqué par la couleur seule ?",
  } },
  "1.4.3": { name: "Contrast (Minimum)", level: "AA", plain: {
    en: "Is text dark enough to read against its background?",
    de: "Ist der Text dunkel genug, um sich vom Hintergrund abzuheben?",
    es: "¿Es el texto lo bastante oscuro para leerlo sobre su fondo?",
    fr: "Le texte est-il assez foncé pour se lire sur son fond ?",
  } },
  "1.4.4": { name: "Resize Text", level: "AA", plain: {
    en: "Does text stay readable when people make it bigger?",
    de: "Bleibt Text lesbar, wenn jemand ihn vergrößert?",
    es: "¿Sigue el texto legible cuando alguien lo agranda?",
    fr: "Le texte reste-t-il lisible quand on l'agrandit ?",
  } },
  "2.1.1": { name: "Keyboard", level: "A", plain: {
    en: "Does everything work without a mouse?",
    de: "Funktioniert alles ohne Maus?",
    es: "¿Funciona todo sin ratón?",
    fr: "Est-ce que tout marche sans souris ?",
  } },
  "2.4.4": { name: "Link Purpose (In Context)", level: "A", plain: {
    en: "Does every link say where it goes?",
    de: "Sagt jeder Link, wohin er führt?",
    es: "¿Dice cada enlace adónde lleva?",
    fr: "Chaque lien dit-il où il mène ?",
  } },
  "3.3.1": { name: "Error Identification", level: "A", plain: {
    en: "Do form errors say which field is wrong?",
    de: "Sagen Formularfehler, welches Feld falsch ist?",
    es: "¿Dicen los errores del formulario qué campo está mal?",
    fr: "Les erreurs de formulaire disent-elles quel champ est en faute ?",
  } },
  "3.3.2": { name: "Labels or Instructions", level: "A", plain: {
    en: "Do form fields say what to type?",
    de: "Sagen Formularfelder, was einzutragen ist?",
    es: "¿Dicen los campos qué hay que escribir?",
    fr: "Les champs de formulaire disent-ils quoi saisir ?",
  } },
  "4.1.2": { name: "Name, Role, Value", level: "A", plain: {
    en: "Do buttons and menus tell screen readers what they are?",
    de: "Sagen Knöpfe und Menüs den Screenreadern, was sie sind?",
    es: "¿Dicen los botones y los menús a los lectores de pantalla qué son?",
    fr: "Les boutons et les menus disent-ils aux lecteurs d'écran ce qu'ils sont ?",
  } },

};

/** Opening question (its English key) to the criterion it checks. */
export const PROMPT_CRITERION: Record<string, string> = {
  "How would a screen reader announce this button? Tell me what you can inspect and what I should test with a screen reader.": "4.1.2",
  "Which images on this page need alt text, and what should it say in context?": "1.1.1",
  "Is this link clear if people hear its text on its own? Suggest clearer wording if needed.": "2.4.4",
  "Can people understand this error message without relying on colour? Rewrite it so they know what to do next.": "1.4.1",
  "Can people use a website without a mouse?": "2.1.1",
  "Can people close a cookie banner with a keyboard?": "2.1.1",
  "Is the text easy to read against its background?": "1.4.3",
  "Can people zoom in without losing access to content?": "1.4.4",
  "Can people fill in a form with a screen reader?": "3.3.2",
  "Can people complete checkout using only a keyboard?": "2.1.1",
  "Do the images have useful alt text?": "1.1.1",
  "Are the videos accessible without sound?": "1.2.2",
  "Does a menu or pop-up work with a keyboard?": "2.1.1",
  "Can people tell which field has an error and how to fix it?": "3.3.1",
};

export function criterionFor(prompt: string): string | undefined {
  return PROMPT_CRITERION[prompt];
}
