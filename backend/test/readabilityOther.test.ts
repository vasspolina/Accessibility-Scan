import { describe, it, expect } from "vitest";
import { evaluateReadability } from "../src/services/readability/analyzeReadability.js";
import {
  languageOf,
  scoreOtherLanguage,
  syllablesDe,
  syllablesEs,
  syllablesFr,
} from "../src/services/readability/readabilityOther.js";

// Dense administrative prose and plain prose in each language, the kind a
// public body and a small shop write. Repeated past the 200-word floor.
const DE_DENSE = (
  "Die Inanspruchnahme der Leistungen setzt die vorherige Beantragung unter Beifügung sämtlicher erforderlichen " +
  "Nachweisunterlagen voraus, wobei die Bearbeitungsdauer in Abhängigkeit von der Vollständigkeit der eingereichten " +
  "Antragsunterlagen und der gegenwärtigen Auslastung der zuständigen Verwaltungseinheit variieren kann. "
).repeat(10);
const DE_PLAIN = "Wir helfen Ihnen gern. Schreiben Sie uns eine Mail. Wir rufen Sie dann an. Das dauert zwei Tage. Sie zahlen nichts dafür. ".repeat(12);

const ES_DENSE = (
  "La tramitación administrativa de las solicitudes presentadas requerirá necesariamente la acreditación documental " +
  "correspondiente, considerándose desestimadas aquellas solicitudes cuya documentación complementaria resultare " +
  "insuficiente conforme a la normativa reglamentaria vigente en materia de procedimientos administrativos. "
).repeat(10);
const ES_PLAIN = "Te ayudamos con gusto. Escríbenos un correo. Te llamamos pronto. Tarda dos días. No pagas nada. ".repeat(14);

const FR_DENSE = (
  "La recevabilité administrative des demandes formulées est subordonnée à la production préalable de l'intégralité " +
  "des justificatifs réglementairement exigibles, l'instruction des dossiers incomplets étant susceptible d'entraîner " +
  "une prolongation substantielle des délais de traitement initialement communiqués aux demandeurs concernés. "
).repeat(10);
const FR_PLAIN = "Nous sommes là pour vous. Écrivez-nous un mot. Nous vous appelons vite. Cela prend deux jours. Vous ne payez rien. ".repeat(12);

describe("syllables in German, Spanish and French", () => {
  it("counts German diphthongs as one", () => {
    expect(syllablesDe("Haus")).toBe(1);
    expect(syllablesDe("Leistungen")).toBe(3);
    expect(syllablesDe("Verwaltungseinheit")).toBe(5);
    expect(syllablesDe("Äußerung")).toBe(3);
  });

  it("splits a Spanish hiatus and keeps a diphthong whole", () => {
    expect(syllablesEs("teatro")).toBe(3); // te-a-tro
    expect(syllablesEs("ciudad")).toBe(2); // ciu-dad
    expect(syllablesEs("país")).toBe(2); // pa-ís
    expect(syllablesEs("hoy")).toBe(1);
    expect(syllablesEs("administrativos")).toBe(6);
  });

  it("drops a French silent final e and splits é before a vowel", () => {
    expect(syllablesFr("porte")).toBe(1);
    expect(syllablesFr("portes")).toBe(1);
    expect(syllablesFr("le")).toBe(1);
    expect(syllablesFr("créa")).toBe(2);
    expect(syllablesFr("administrative")).toBe(5);
  });
});

describe("reading ease in German, Spanish and French", () => {
  it("reads the language from the page's lang", () => {
    expect(languageOf("de-AT")).toBe("de");
    expect(languageOf("es")).toBe("es");
    expect(languageOf("fr-ca")).toBe("fr");
    expect(languageOf("en")).toBeNull();
    expect(languageOf("desi")).toBeNull();
  });

  it("scores dense prose well below plain prose on each scale", () => {
    for (const [dense, plain, lang] of [
      [DE_DENSE, DE_PLAIN, "de"],
      [ES_DENSE, ES_PLAIN, "es"],
      [FR_DENSE, FR_PLAIN, "fr"],
    ] as const) {
      const hard = scoreOtherLanguage(dense, lang)!;
      const easy = scoreOtherLanguage(plain, lang)!;
      expect(hard.ease).toBeLessThan(easy.ease - 40);
      expect(easy.ease).toBeGreaterThan(70);
    }
  });

  it("reports dense German, Spanish and French as advisory AAA, naming the scale", () => {
    const de = evaluateReadability({ text: DE_DENSE, lang: "de" });
    expect(de).toHaveLength(1);
    expect(de[0]).toMatchObject({ wcagCriterion: "3.1.5", wcagLevel: "AAA", severity: "minor", ruleId: "readability-dense-prose" });
    expect(de[0].description).toContain("Amstad");
    expect(evaluateReadability({ text: ES_DENSE, lang: "es-MX" })[0].description).toContain("INFLESZ");
    expect(evaluateReadability({ text: FR_DENSE, lang: "fr" })[0].description).toContain("Kandel");
  });

  it("says nothing about plainly written German, Spanish or French", () => {
    expect(evaluateReadability({ text: DE_PLAIN, lang: "de" })).toEqual([]);
    expect(evaluateReadability({ text: ES_PLAIN, lang: "es" })).toEqual([]);
    expect(evaluateReadability({ text: FR_PLAIN, lang: "fr" })).toEqual([]);
  });

  it("refuses a page of links and headlines, as in English", () => {
    const index = "Startseite Produkte Preise Kontakt Hilfe Impressum Datenschutz Karriere Presse Blog ".repeat(30);
    expect(scoreOtherLanguage(index, "de")).toBeNull();
  });
});
