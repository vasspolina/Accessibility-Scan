/* Deutsche Fassung der Berichtstexte. Der Rückfall erfolgt pro Schlüssel:
   Was hier fehlt, erscheint auf Englisch statt zu verschwinden. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_DE: Record<string, PlainRule> = {
  "reflow-height-unreachable": {
    plain: "Fixiertes Fenster versteckt seine Knöpfe",
    impact: "Wer zum Lesen heranzoomt, erreicht diese Knöpfe gar nicht.",
  },
  "reflow-height-pinned": {
    plain: "Fixierte Leisten lassen keinen Leseplatz",
    impact: "Wer heranzoomt, sieht die Leisten und fast nichts sonst.",
  },
  "reflow-height-pinned-advisory": {
    plain: "Fixierte Leisten engen die Seite ein",
    impact: "Wer heranzoomt, sieht nur wenige Zeilen auf einmal und verliert die Stelle.",
  },
  "contrast-over-image": {
    plain: "Text auf einem Bild zu blass",
    impact: "Wer schlecht sieht, verliert Wörter auf einem unruhigen oder hellen Bild.",
  },
  "form-error-silent": {
    plain: "Formular verweigert ohne Begründung",
    impact: "Wer ein Feld übersieht, erfährt nicht, was fehlt, und viele geben auf.",
  },
  "timing-meta-refresh": {
    found: (n) => (n === 1 ? "Die Seite lädt nach einer festen Wartezeit von selbst neu oder springt weiter." : "{n} Anweisungen im Code laden die Seite nach einer festen Wartezeit neu oder leiten weiter.".replace("{n}", String(n))),
    plain: "Die Seite lädt automatisch neu",
    impact: "Wer noch liest oder ein Formular ausfüllt, landet wieder am Anfang.",
  },
  "aria-allowed-role": {
    plain: "Eine Rolle, die das Element nicht haben kann",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist" : "Elemente sind"} im Code als etwas ausgezeichnet, das ${n === 1 ? "es nicht sein kann" : "sie nicht sein können"}.`,
    impact: "Screenreader sagen einen Link als Schaltfläche an oder eine Liste als Überschrift.",
  },
  "aria-allowed-attr": {
    plain: "Eine Screenreader-Angabe am falschen Element",
    found: (n) =>
      `${n} ${n === 1 ? "Element trägt Angaben, die es als Tag dieser Art nicht haben darf" : "Elemente tragen Angaben, die sie als Tags dieser Art nicht haben dürfen"}.`,
    impact: "Screenreader sagen Unsinn an oder überspringen das Element ganz.",
  },
  "aria-prohibited-attr": {
    plain: "Eine Beschriftung, die Screenreader ignorieren müssen",
    found: (n) =>
      `${n} ${n === 1 ? "Element trägt" : "Elemente tragen"} eine Beschriftung, die der Code bei dieser Art von Tag nicht zulässt.`,
    impact: "Screenreader ignorieren die Beschriftung und lesen vor, was im Element steht, oft nichts.",
  },
  "aria-required-children": {
    plain: "Menüs oder Listen ohne Einträge",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist im Code als Menü oder Liste ausgezeichnet, enthält aber keinen der Einträge, die es braucht." : "Elemente sind im Code als Menüs oder Listen ausgezeichnet, enthalten aber keinen der Einträge, die sie brauchen."}`,
    impact: "Screenreader erkennen den Aufbau nicht, also kann niemand darin navigieren.",
  },
  "aria-required-parent": {
    plain: "Listeneintrag außerhalb seiner Liste",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist als Teil eines größeren Bedienelements ausgezeichnet, etwa eines Reiters, steht aber außerhalb davon" : "Elemente sind als Teile eines größeren Bedienelements ausgezeichnet, etwa eines Reiters, stehen aber außerhalb davon"}.`,
    impact: "Screenreader können nicht sagen, der wievielte von wie vielen es ist.",
  },
  "landmark-unique": {
    plain: "Zwei Seitenbereiche heißen gleich",
    found: (n) =>
      `${n} ${n === 1 ? "Bereich trägt denselben Namen wie ein anderer" : "Bereiche tragen denselben Namen wie andere"}.`,
    impact: "Wer einen Screenreader nutzt, bekommt eine Liste gleicher Einträge und kann sie nicht unterscheiden.",
  },
  "landmark-no-duplicate-banner": {
    plain: "Mehr als ein Seitenkopf",
    found: () =>
      `Die Seite kennzeichnet mehr als einen Bereich als Kopfbereich.`,
    impact: "Screenreader listen mehrere Kopfbereiche auf, und niemand erkennt den echten.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "Mehr als ein Seitenfuß",
    found: () =>
      `Die Seite kennzeichnet mehr als einen Bereich als Fußbereich.`,
    impact: "Screenreader listen mehrere Fußbereiche auf, und niemand weiß, welcher welcher ist.",
  },
  "landmark-no-duplicate-main": {
    plain: "Mehr als ein Hauptbereich",
    found: () =>
      `Mehr als ein Bereich ist als Hauptinhalt gekennzeichnet.`,
    impact: "Mit „Zum Hauptinhalt springen“ kann man im falschen Teil der Seite landen.",
  },
  "landmark-banner-is-top-level": {
    plain: "Kopfbereich steckt in einem anderen Bereich",
    found: () =>
      `Der Kopfbereich steckt in einem anderen Bereich, statt daneben zu stehen.`,
    impact: "Wer per Screenreader dorthin springt, kommt nicht wie gewohnt an.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Fußbereich steckt in einem anderen Bereich",
    found: () =>
      `Der Fußbereich steckt in einem anderen Bereich, statt daneben zu stehen.`,
    impact: "Wer per Screenreader dorthin springt, kommt nicht wie gewohnt an.",
  },
  "skip-link": {
    plain: "Der Sprunglink führt ins Leere",
    found: (n) =>
      `${n} ${n === 1 ? "Sprunglink zeigt" : "Sprunglinks zeigen"} auf etwas, das es auf der Seite nicht gibt.`,
    impact: "An der Tastatur drückt man ihn und tabbt trotzdem durch das ganze Menü.",
  },
  "component-skip-link-dead": {
    plain: "Der Sprunglink führt ins Leere",
    found: (n) =>
      `${n} ${n === 1 ? "Sprunglink zeigt" : "Sprunglinks zeigen"} auf etwas, das es auf der Seite nicht gibt.`,
    impact: "An der Tastatur drückt man ihn und tabbt trotzdem durch das ganze Menü.",
  },
  "image-redundant-alt": {
    plain: "Bildbeschreibung wiederholt den Text daneben",
    found: (n) =>
      `${n} ${n === 1 ? "Bild wiederholt" : "Bilder wiederholen"} im Alt-Text die Wörter, die schon daneben stehen.`,
    impact: "Wer einen Screenreader nutzt, hört dieselben Wörter zweimal.",
  },
  "color-contrast": {
    research: "WebAIM prüft jedes Jahr eine Million Startseiten. Zu blasser Text ist Jahr für Jahr der häufigste Fehler, den WebAIM dabei findet.",
    plain: "Text zu blass zum Lesen",
    found: (n) =>
      `${n} ${n === 1 ? "Textstelle auf dieser Seite liegt" : "Textstellen auf dieser Seite liegen"} farblich zu nah am Hintergrund dahinter.`,
    impact: "Wer schlecht sieht oder bei hellem Licht liest, kann die Wörter nicht erkennen.",
  },
  "image-alt": {
    research: "WebAIM prüft jedes Jahr eine Million Startseiten. Bilder ohne Beschreibung gehören Jahr für Jahr zu den häufigsten Fehlern.",
    plain: "Bilder ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Bild hat" : "Bilder haben"} gar keinen Alt-Text.`,
    impact: "Wer einen Screenreader nutzt, erfährt nicht, was diese Bilder zeigen.",
  },
  "svg-img-alt": {
    plain: "Symbole ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Symbol ist im Code als Bild gekennzeichnet, sagt aber mit keinem Wort, was es zeigt." : "Symbole sind im Code als Bilder gekennzeichnet, sagen aber mit keinem Wort, was sie zeigen."}`,
    impact: "Ist das Symbol die einzige Beschriftung, haben Screenreader nichts anzusagen.",
  },
  "input-image-alt": {
    plain: "Bild-Schaltfläche ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Bild, das als Schaltfläche dient, hat" : "Bilder, die als Schaltflächen dienen, haben"} keinen Alt-Text.`,
    impact: "Wer einen Screenreader nutzt, erfährt nicht, was die Schaltfläche tut.",
  },
  "link-name": {
    research: "Leere Links gehören zu den häufigsten Fehlern in der jährlichen WebAIM-Untersuchung von einer Million Startseiten.",
    plain: "Links ohne lesbaren Text",
    found: (n) =>
      `${n} ${n === 1 ? "Link enthält" : "Links enthalten"} keine Wörter und keine Beschriftung.`,
    impact: "Wer einen Screenreader nutzt, hört nur „Link“ und erfährt nicht, wohin er führt.",
  },
  "link-text-vague": {
    found: (n) => (n === 1 ? "Ein Link sagt nur etwas wie „Mehr erfahren“ oder „Hier“." : "{n} Links sagen nur etwas wie „Mehr erfahren“ oder „Hier“.".replace("{n}", String(n))),
    plain: "Links heißen nur „Mehr erfahren“",
    impact: "In der Linkliste eines Screenreaders heißen sie alle gleich.",
  },
  "label-content-name-mismatch": {
    plain: "Angesagter Name weicht von Beschriftung ab",
    found: (n) =>
      `${n} ${n === 1 ? "Bedienelement zeigt" : "Bedienelemente zeigen"} bestimmte Wörter und ${n === 1 ? "trägt" : "tragen"} im Code einen anderen Namen.`,
    impact: "Wer per Sprache steuert, sagt die sichtbaren Wörter, und nichts passiert.",
  },
  "button-name": {
    research: "Schaltflächen ohne Beschriftung stehen Jahr für Jahr weit oben in der jährlichen WebAIM-Untersuchung von einer Million Startseiten. Meist sind es reine Symbol-Schaltflächen, die für das Designteam selbsterklärend waren.",
    plain: "Schaltflächen ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Schaltfläche hat" : "Schaltflächen haben"} keine Wörter darin und keinen Namen im Code.`,
    impact: "Wer einen Screenreader nutzt, weiß vor dem Klick nicht, was passiert.",
  },
  label: {
    research: "Fehlende Feldbeschriftungen stehen weit oben in der jährlichen WebAIM-Untersuchung von einer Million Startseiten. In der britischen Click-Away-Pound-Studie verließen die meisten Kundinnen und Kunden, die auf so eine Hürde stießen, den Shop wortlos.",
    plain: "Formularfelder ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Formularfeld ist" : "Formularfelder sind"} im Code nicht mit einer Beschriftung verbunden.`,
    impact: "Wer einen Screenreader nutzt, weiß nicht, was in welches Feld gehört, und Formulare bleiben liegen.",
  },
  "select-name": {
    plain: "Ein Auswahlfeld ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Auswahlfeld hat" : "Auswahlfelder haben"} im Code keine Beschriftung.`,
    impact: "Niemand weiß, was da gewählt wird.",
  },
  "document-title": {
    plain: "Die Seite hat keinen Titel",
    found: () =>
      `Die Seite hat keinen Titel, also zeigt der Browser-Tab nur die Adresse.`,
    impact: "Tabs, Lesezeichen und Suchergebnisse zeigen nichts Brauchbares.",
  },
  "html-has-lang": {
    research: "Eine fehlende Sprachangabe ist einer der wenigen Fehler, die WebAIM auf der Mehrheit des Web findet. Er bleibt häufig, weil er lautlos ist.",
    plain: "Die Seite nennt keine Sprache",
    found: () => `Die Seite gibt nicht an, in welcher Sprache sie geschrieben ist.`,
    impact: "Ihre Inhalte werden mit dem falschen Akzent vorgelesen, und das ist schwer zu verstehen.",
  },
  "html-lang-valid": {
    plain: "Die angegebene Sprache ist ungültig",
    found: () => `Die Seite gibt eine Sprache an, aber keine, die Software kennt.`,
    impact: "Ihre Wörter werden mit der falschen Stimme und falsch ausgesprochen vorgelesen.",
  },
  "heading-order": {
    plain: "Überschriften überspringen Ebenen",
    found: (n) =>
      `An ${n} ${n === 1 ? "Stelle" : "Stellen"} fehlt eine Überschriftenebene, etwa wenn auf ein h2 direkt ein h4 folgt.`,
    impact: "Wer mit dem Screenreader über Überschriften navigiert, verliert den Faden.",
  },
  "page-has-heading-one": {
    plain: "Keine Hauptüberschrift",
    found: () =>
      `Die Seite hat keine oberste Überschrift.`,
    impact: "Auf einen Blick erkennt niemand, worum es auf der Seite geht.",
  },
  "empty-heading": {
    plain: "Eine leere Überschrift",
    found: (n) =>
      `${n} ${n === 1 ? "Überschrift ist" : "Überschriften sind"} leer: Das Tag ist da, die Wörter fehlen.`,
    impact: "Wer über Überschriften navigiert, landet auf einem Eintrag, der nichts sagt.",
  },
  "link-in-text-block": {
    plain: "Links nur durch Farbe erkennbar",
    found: (n) =>
      `${n} ${n === 1 ? "Link im Fließtext ist" : "Links im Fließtext sind"} nur durch Farbe gekennzeichnet, ohne Unterstreichung.`,
    impact: "Wer farbenblind ist, unterscheidet den Link nicht von gewöhnlichem Text.",
  },
  "meta-viewport": {
    plain: "Zoomen ist gesperrt",
    found: () => `Die Seite verhindert, dass man sie auf dem Handy vergrößert.`,
    impact: "Wer größere Schrift braucht, bekommt sie nicht.",
  },
  "meta-viewport-large": {
    plain: "Zoom auf eine feste Stufe begrenzt",
    found: () =>
      `Zoomen geht, aber die Seite deckelt es unter 500 %.`,
    impact: "Wer sehr große Schrift braucht, stößt an den Deckel und kommt nicht weiter.",
  },
  "frame-title": {
    plain: "Ein eingebetteter Rahmen ohne Titel",
    found: (n) =>
      `${n} ${n === 1 ? "eingebetteter Rahmen hat keinen Titel und wird nur als „Frame“ angesagt." : "eingebettete Rahmen haben keinen Titel und werden nur als „Frame“ angesagt."}`,
    impact: "Wer einen Screenreader nutzt, erfährt nicht, was darin steckt.",
  },
  "duplicate-id-active": {
    plain: "Zwei Bedienelemente teilen sich eine id",
    found: (n) =>
      `${n} ${n === 1 ? "id wird" : "ids werden"} bei Bedienelementen mehrfach verwendet.`,
    impact: "Screenreader können die Beschriftung des falschen Bedienelements vorlesen.",
  },
  list: {
    plain: "Eine Liste, die im Code keine ist",
    found: (n) =>
      `${n} ${n === 1 ? "Liste enthält" : "Listen enthalten"} etwas anderes als Listeneinträge.`,
    impact: "Wer einen Screenreader nutzt, hört nicht, wie viele Einträge es gibt.",
  },
  listitem: {
    plain: "Listeneinträge ohne Liste",
    found: (n) =>
      `${n} ${n === 1 ? "Listeneintrag steht" : "Listeneinträge stehen"} außerhalb jeder Liste.`,
    impact: "Wer einen Screenreader nutzt, verliert die Gruppierung.",
  },
  "aria-required-attr": {
    plain: "Ein Bedienelement ohne den nötigen Zustand",
    found: (n) =>
      `${n} ${n === 1 ? "Bedienelement ist als etwas mit einem Zustand ausgezeichnet, etwa angehakt oder aufgeklappt, sagt aber nie" : "Bedienelemente sind als etwas mit einem Zustand ausgezeichnet, etwa angehakt oder aufgeklappt, sagen aber nie"}, welcher es ist.`,
    impact: "Wer einen Screenreader nutzt, erfährt den Zustand nicht.",
  },
  "aria-hidden-focus": {
    plain: "Verstecktes fängt trotzdem den Tastaturfokus",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist" : "Elemente sind"} vor Screenreadern versteckt und trotzdem mit der Tastatur erreichbar.`,
    impact: "An der Tastatur landet man auf etwas, das der Screenreader nicht vorliest.",
  },
  "aria-dialog-name": {
    plain: "Ein Pop-up ohne Namen",
    found: (n) =>
      `${n} ${n === 1 ? "Pop-up trägt nichts, was es benennt, und wird nur als „Dialog“ angesagt." : "Pop-ups tragen nichts, was sie benennt, und werden nur als „Dialog“ angesagt."}`,
    impact: "Wer einen Screenreader nutzt, hört nicht, was den Bildschirm übernommen hat.",
  },
  "nested-interactive": {
    plain: "Ein Bedienelement in einem anderen",
    found: (n) =>
      `${n} ${n === 1 ? "Bedienelement enthält ein weiteres Bedienelement." : "Bedienelemente enthalten jeweils ein weiteres Bedienelement."}`,
    impact: "Das innere Bedienelement ist vor Screenreadern verborgen und nicht erreichbar.",
  },
  "presentation-role-conflict": {
    plain: "Ein echtes Bedienelement gilt als Schmuck",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist als zu ignorieren gekennzeichnet und bleibt trotzdem erreichbar und bedienbar." : "Elemente sind als zu ignorieren gekennzeichnet und bleiben trotzdem erreichbar und bedienbar."}`,
    impact: "Manche Screenreader ignorieren es, und wer sie nutzt, findet es nie.",
  },
  region: {
    plain: "Seitenbereiche ohne Namen im Code",
    found: (n) =>
      `${n} ${n === 1 ? "Inhaltsblock hat" : "Inhaltsblöcke haben"} weder Kopf noch Navigation, Hauptinhalt oder Fuß um sich herum.`,
    impact: "Wer einen Screenreader nutzt, kann nichts überspringen und hört jedes Mal alles.",
  },
  "landmark-one-main": {
    plain: "Nichts kennzeichnet den Hauptinhalt",
    found: () =>
      `Die Seite hat keinen Hauptbereich, der markiert, wo der Inhalt beginnt.`,
    impact: "Wer einen Screenreader nutzt, hört auf jeder einzelnen Seite das ganze Menü ab.",
  },
  tabindex: {
    plain: "Die Tab-Reihenfolge springt",
    found: (n) =>
      `${n} ${n === 1 ? "Element benutzt" : "Elemente benutzen"} einen positiven tabindex, der ${n === 1 ? "es" : "sie"} an den Anfang der Tab-Reihenfolge zieht.`,
    impact: "An der Tastatur wird man auf der Seite hin und her geworfen.",
  },
  "scrollable-region-focusable": {
    plain: "Scrollbereich für die Tastatur unerreichbar",
    found: (n) =>
      `${n} ${n === 1 ? "Bereich lässt sich scrollen, ist mit der Tastatur aber nicht erreichbar." : "Bereiche lassen sich scrollen, sind mit der Tastatur aber nicht erreichbar."}`,
    impact: "Ohne Maus kommt man an den Inhalt darin nicht heran.",
  },

  "keyboard-mouse-only": {
    found: (n) => (n === 1 ? "Ein Bedienelement reagiert auf einen Klick, aber nicht auf die Tastatur." : "{n} Bedienelemente reagieren auf einen Klick, aber nicht auf die Tastatur.".replace("{n}", String(n))),
    research: "Jahrzehnte an Usability-Forschung, vieles davon von der Nielsen Norman Group, kommen immer wieder zum selben Schluss. Tastaturbedienung nützt Geübten genauso wie Menschen, die keine Maus halten können.",
    plain: "Ein Bedienelement, das die Tastatur nicht erreicht",
    impact: "Wer keine Maus benutzen kann, kann dieses Bedienelement gar nicht nutzen.",
  },
  "keyboard-no-visible-focus": {
    found: (n) => (n === 1 ? "Mindestens ein Bedienelement verändert sich sichtbar nicht, wenn die Tab-Taste darauf landet." : "{n} Bedienelemente verändern sich sichtbar nicht, wenn die Tab-Taste auf ihnen landet.".replace("{n}", String(n))),
    plain: "Nichts zeigt, wo die Tastatur steht",
    impact: "An der Tastatur sieht man nicht, wo man steht, und gibt auf.",
  },
  "readability-dense-prose": {
    found: (n) => (n === 1 ? "Der Fließtext dieser Seite verlangt etwa Hochschulniveau." : "{n} Textabschnitte verlangen etwa Hochschulniveau.".replace("{n}", String(n))),
    plain: "Der Text verlangt Lesen auf Hochschulniveau",
    impact: "Wer kognitiv eingeschränkt ist oder in einer zweiten Sprache liest, kann nicht folgen.",
  },
  "typo-leading-for-measure": {
    found: (n) => (n === 1 ? "Fließtext auf dieser Seite hat zu wenig Zeilenabstand für seine Zeilenlänge und Schriftgröße." : "{n} Textblöcke haben zu wenig Zeilenabstand für ihre Zeilenlänge und Schriftgröße.".replace("{n}", String(n))),
    plain: "Zeilen stehen zu eng übereinander",
    impact: "Wer an den Anfang jeder Zeile zurückspringt, landet in der falschen.",
  },
  "reading-order-mismatch": {
    found: (n) => (n === 1 ? "In einer Reihe von Bedienelementen folgt die Tab-Taste nicht der Reihenfolge auf dem Bildschirm." : "In {n} Reihen von Bedienelementen folgt die Tab-Taste nicht der Reihenfolge auf dem Bildschirm.".replace("{n}", String(n))),
    plain: "Tab-Reihenfolge widerspricht dem Sichtbaren",
    impact: "An der Tastatur kann man auf Senden landen, obwohl man Abbrechen meinte.",
  },

  "forced-colors-focus-lost": {
    found: (n) => (n === 1 ? "Bei mindestens einem Bedienelement verschwindet die Fokusmarkierung im Modus für hohen Kontrast." : "Bei {n} Bedienelementen verschwindet die Fokusmarkierung im Modus für hohen Kontrast.".replace("{n}", String(n))),
    plain: "Fokusmarkierung verschwindet im hohen Kontrast",
    impact: "Wer den Modus für hohen Kontrast nutzt, sieht nicht, wo die Tastatur steht.",
  },
  "forced-colors-icon-lost": {
    found: (n) => (n === 1 ? "Ein Bedienelement ohne Text erscheint im Modus für hohen Kontrast als leerer Kasten." : "{n} Bedienelemente ohne Text erscheinen im Modus für hohen Kontrast als leere Kästen.".replace("{n}", String(n))),
    plain: "Symbol-Schaltfläche verschwindet im hohen Kontrast",
    impact: "Im Modus für hohen Kontrast erscheint die Schaltfläche als leerer Kasten.",
  },
  "keyboard-faint-focus": {
    found: (n) => (n === 1 ? "Bei mindestens einem Bedienelement hat der Fokusrahmen weniger als 3:1 Kontrast zum Hintergrund." : "Bei {n} Bedienelementen hat der Fokusrahmen weniger als 3:1 Kontrast zum Hintergrund.".replace("{n}", String(n))),
    plain: "Tastaturmarkierung zu blass zum Sehen",
    impact: "An der Tastatur weiß man nicht, was man gleich auslöst.",
  },
  "keyboard-focus-trap": {
    found: (n) => (n === 1 ? "An einer Stelle bleibt der Fokus beim Drücken der Tab-Taste hängen." : "An {n} Stellen bleibt der Fokus beim Drücken der Tab-Taste hängen.".replace("{n}", String(n))),
    plain: "Der Tastaturfokus bleibt hängen",
    impact: "Wer mit der Tastatur bis hierher kommt, kommt nicht mehr weiter.",
  },

  // Die Namensprüfungen für Screenreader. Jede ist eine gebündelte Karte,
  // deren Anzahl in der Beschreibung des Backends steht, daher kein found().
  "sr-filename-alt": {
    found: (n) => (n === 1 ? "Mindestens ein Bild trägt seinen Dateinamen als Beschreibung." : "{n} Bilder tragen ihren Dateinamen als Beschreibung.".replace("{n}", String(n))),
    plain: "Bildbeschreibungen sind Dateinamen",
    impact: "Wer einen Screenreader nutzt, hört einen Dateinamen, wo die Bedeutung des Bildes sein sollte.",
  },
  "sr-vague-link-name": {
    found: (n) => (n === 1 ? "Mindestens ein Link wird nur mit einem Zeichen wie „→“ oder einer bloßen Webadresse angesagt." : "{n} Links werden nur mit einem Zeichen wie „→“ oder einer bloßen Webadresse angesagt.".replace("{n}", String(n))),
    plain: "Links heißen „Hier klicken“",
    impact: "Die Linkliste im Screenreader bietet nichts, wonach man wählen kann.",
  },
  "sr-symbol-button-name": {
    found: (n) => (n === 1 ? "Mindestens eine Schaltfläche hat als Namen nur ein Symbol wie „×“ oder „>“, kein einziges Wort." : "{n} Schaltflächen haben als Namen nur ein Symbol wie „×“ oder „>“, kein einziges Wort.".replace("{n}", String(n))),
    plain: "Schaltflächen nur mit einem Symbol benannt",
    impact: "Wer einen Screenreader nutzt, erfährt nicht, was ein Druck auf die Schaltfläche bewirkt.",
  },
  "sr-vague-button-name": {
    found: (n) => (n === 1 ? "Mindestens eine Schaltfläche trägt nur einen allgemeinen Namen wie „More“ oder „Go“." : "{n} Schaltflächen tragen nur allgemeine Namen wie „More“ oder „Go“.".replace("{n}", String(n))),
    plain: "Schaltflächennamen, die nichts sagen",
    impact: "Wer einen Screenreader nutzt, hört „mal, Schaltfläche“, wo andere ein Schließen-Kreuz sehen.",
  },
  "form-field-placeholder-label": {
    found: (n) => (n === 1 ? "Mindestens ein Formularfeld ist nur mit seinem Platzhaltertext beschriftet." : "{n} Formularfelder sind nur mit ihrem Platzhaltertext beschriftet.".replace("{n}", String(n))),
    plain: "Felder nur mit Platzhalter beschriftet",
    impact: "Der Hinweis verschwindet beim Tippen, also lässt sich nicht prüfen, was wohin gehört.",
  },
  "component-form-autocomplete": {
    found: (n) => (n === 1 ? "Mindestens ein Feld für Angaben wie Name oder E-Mail sagt dem Browser nicht, was es erfasst." : "{n} Felder für Angaben wie Name oder E-Mail sagen dem Browser nicht, was sie erfassen.".replace("{n}", String(n))),
    plain: "Formularfelder blockieren das Ausfüllen",
    impact: "Alle tippen ihre Angaben wieder von Hand, für manche eine echte Hürde.",
  },
  "component-input-type": {
    found: (n) => (n === 1 ? "Mindestens ein Feld, das nach E-Mail oder Telefonnummer fragt, ist im Code nicht als E-Mail- oder Telefonfeld angelegt." : "{n} Felder, die nach E-Mail oder Telefonnummer fragen, sind im Code nicht als E-Mail- oder Telefonfelder angelegt.".replace("{n}", String(n))),
    plain: "E-Mail-Felder als einfacher Text angelegt",
    impact: "Auf dem Handy erscheint die falsche Tastatur, und das Tippen dauert länger.",
  },
  "component-required-cue": {
    found: (n) => (n === 1 ? "Mindestens ein Pflichtfeld ist nur im Code als Pflicht markiert, nicht in seiner Beschriftung." : "{n} Pflichtfelder sind nur im Code als Pflicht markiert, nicht in ihren Beschriftungen.".replace("{n}", String(n))),
    plain: "Pflichtfelder sind nicht sichtbar markiert",
    impact: "Niemand erfährt, dass ein Feld Pflicht war, bis das Formular ablehnt. Anmeldungen scheitern.",
  },
  "component-submit-clarity": {
    found: (n) => (n === 1 ? "Ein Formular scheint keinen Knopf mit einem klaren Namen wie „Senden“ oder „Anmelden“ zu haben." : "{n} Formulare scheinen keinen Knopf mit einem klaren Namen wie „Senden“ oder „Anmelden“ zu haben.".replace("{n}", String(n))),
    plain: "Kein klar beschrifteter Absenden-Knopf",
    impact: "Leute wissen nicht, wie sie das Formular abschließen, also tun sie es nicht.",
  },
  "component-table-no-headers": {
    found: (n) => (n === 1 ? "Mindestens eine Tabelle mit mehreren Zeilen und Spalten hat keine einzige Kopfzelle." : "{n} Tabellen mit mehreren Zeilen und Spalten haben keine einzige Kopfzelle.".replace("{n}", String(n))),
    plain: "Eine Tabelle ohne Kopfzellen",
    impact: "Wer einen Screenreader nutzt, hört bloße Werte ohne Spalten- oder Zeilennamen.",
  },
  "component-nav-labels": {
    found: (n) => (n === 1 ? "Die Seite hat mehrere Navigationsmenüs, und mindestens eines davon trägt keinen Namen." : "Die Seite hat mehrere Navigationsmenüs, und {n} davon tragen keinen Namen.".replace("{n}", String(n))),
    plain: "Navigationsmenüs ohne Namen",
    impact: "Wer einen Screenreader nutzt, kann das Hauptmenü nicht von den Links in der Fußzeile unterscheiden.",
  },
  "component-skip-link": {
    found: (n) => (n === 1 ? "Unter den ersten Links der Seite ist kein Link „Zum Inhalt springen“." : "Unter den ersten Links der Seite ist kein Link „Zum Inhalt springen“.".replace("{n}", String(n))),
    plain: "Kein Link „Zum Inhalt springen“",
    impact: "An der Tastatur tabbt man auf jeder Seite durch das ganze Menü.",
  },

  "mobile-target-spacing": {
    plain: "Tippziele liegen zu dicht beieinander",
    found: (n) =>
      `${n} ${n === 1 ? "Paar von Bedienelementen liegt" : "Paare von Bedienelementen liegen"} in Handybreite weniger als 8 px auseinander.`,
    impact: "Wer zittert oder größere Finger hat, tippt das Falsche.",
  },
  "consent-blocks-reader": {
    plain: "Das Cookie-Banner blockiert Screenreader",
    found: () =>
      `Das Cookie-Banner versteckt die ganze Seite vor Screenreadern, und der Tastaturfokus erreicht das Banner nie.`,
    impact: "Wer einen Screenreader nutzt, hört Stille und findet das Banner nicht, um es wegzuräumen.",
  },
  "mobile-sticky-coverage": {
    plain: "Fixierte Leisten füllen den Handybildschirm",
    found: () =>
      `Fixierte Kopfzeilen, Banner oder Werkzeugleisten belegen in Handybreite mehr als ein Drittel des Bildschirms.`,
    impact: "Am Handy liest man die Seite durch einen schmalen Spalt.",
  },
  "mobile-horizontal-scroll": {
    found: (n) => (n === 1 ? "In Handybreite ragt ein Element über den Bildschirmrand hinaus, und die ganze Seite scrollt seitwärts." : "In Handybreite ragen {n} Elemente über den Bildschirmrand hinaus, und die ganze Seite scrollt seitwärts.".replace("{n}", String(n))),
    plain: "Die Seite scrollt auf dem Handy seitwärts",
    impact: "Am Handy wischt man für jede Zeile seitwärts, und viele gehen.",
  },
  "mobile-tap-target": {
    found: (n) => (n === 1 ? "In Handybreite ist ein Tippziel unter 24 px groß und liegt direkt neben einem anderen." : "In Handybreite sind {n} Tippziele unter 24 px groß und liegen direkt neben anderen.".replace("{n}", String(n))),
    plain: "Tippziele zu klein",
    impact: "Wer größere Finger oder unruhige Hände hat, trifft sie nicht.",
  },

  "text-spacing-clipped": {
    found: (n) => (n === 1 ? "Auf dieser Seite wird Text abgeschnitten, sobald Zeilen- und Buchstabenabstände größer werden." : "{n} Elemente schneiden Text ab, sobald Zeilen- und Buchstabenabstände größer werden.".replace("{n}", String(n))),
    plain: "Text wird bei größeren Abständen abgeschnitten",
    impact: "Wer mit Legasthenie die Abstände vergrößert, verliert Wörter hinter einem festen Kasten.",
  },
  "text-zoom-clipped": {
    found: (n) => (n === 1 ? "Bei doppelter Schriftgröße wird auf dieser Seite Text abgeschnitten." : "{n} Elemente schneiden bei doppelter Schriftgröße Text ab.".replace("{n}", String(n))),
    plain: "Text wird bei größerer Schrift abgeschnitten",
    impact: "Wer bei schwachen Augen die Schrift vergrößert, verliert die Wörter.",
  },
  "text-zoom-horizontal-scroll": {
    found: (n) => (n === 1 ? "Bei doppelter Schriftgröße wird die Seite breiter als das Fenster." : "An {n} Stellen ragt die Seite bei doppelter Schriftgröße über das Fenster hinaus.".replace("{n}", String(n))),
    plain: "Vergrößerter Text scrollt seitwärts",
    impact: "Wer die Schrift vergrößert, scrollt bei jeder Zeile seitwärts, und die meisten geben auf.",
  },

  "dark-consent-no-reject": {
    found: (n) => (n === 1 ? "Das Cookie-Banner hat einen Knopf zum Zustimmen, aber keinen zum Ablehnen." : "{n} Cookie-Banner haben einen Knopf zum Zustimmen, aber keinen zum Ablehnen.".replace("{n}", String(n))),
    plain: "Cookie-Banner ohne Ablehnen",
    impact: "Nach der DSGVO kann eine Einwilligung ohne leichtes Ablehnen ungültig sein.",
  },
  "dark-consent-asymmetry": {
    found: (n) => (n === 1 ? "Auf dem Cookie-Banner hat nur der Knopf zum Zustimmen eine Hintergrundfarbe." : "Auf {n} Cookie-Bannern hat nur der Knopf zum Zustimmen eine Hintergrundfarbe.".replace("{n}", String(n))),
    plain: "Cookie-Banner drängt „Ablehnen“ zurück",
    impact: "Ablehnen als bloßer Text drängt zum Zustimmen, und Aufsichtsbehörden achten darauf.",
  },
  "dark-preselected-optin": {
    found: (n) => (n === 1 ? "Ein Kästchen für Werbung, Newsletter oder Weitergabe von Daten ist schon angehakt, bevor jemand etwas wählt." : "{n} Kästchen für Werbung, Newsletter oder Weitergabe von Daten sind schon angehakt, bevor jemand etwas wählt.".replace("{n}", String(n))),
    plain: "Werbe-Häkchen ist schon gesetzt",
    impact: "Nach der DSGVO ist ein vorangehaktes Kästchen keine Einwilligung.",
  },
  "dark-confirmshaming": {
    found: (n) => (n === 1 ? "Ein Knopf zum Ablehnen ist in der Ich-Form formuliert und klingt wie ein Eingeständnis." : "{n} Knöpfe zum Ablehnen sind in der Ich-Form formuliert und klingen wie ein Eingeständnis.".replace("{n}", String(n))),
    plain: "„Nein danke“ ist beschämend formuliert",
    impact: "Die Formulierung liest sich als Manipulation.",
  },
  "dark-fake-scarcity": {
    found: (n) => (n === 1 ? "Eine Angabe auf dieser Seite meldet knappen Bestand oder große Nachfrage." : "{n} Angaben auf dieser Seite melden knappen Bestand oder große Nachfrage.".replace("{n}", String(n))),
    plain: "Knappheitsangaben als Druckmittel",
    impact: "Behörden gehen gegen erfundene Knappheit vor, und die Kundschaft hat gelernt, ihr zu misstrauen.",
  },
  "dark-fake-urgency": {
    found: (n) => (n === 1 ? "Ein Hinweis auf dieser Seite macht Zeitdruck, nennt aber kein Datum." : "{n} Hinweise auf dieser Seite machen Zeitdruck, nennen aber kein Datum.".replace("{n}", String(n))),
    plain: "Fristen als Druckmittel",
    impact: "Fällt ein falscher Countdown einmal auf, glaubt niemand mehr, was Sie sonst behaupten.",
  },

  "dialog-close-unlabeled": {
    found: (n) => (n === 1 ? "Bei mindestens einem Pop-up ist der Schließen-Knopf nur ein Kreuz, ohne Namen im Code." : "Bei {n} Pop-ups ist der Schließen-Knopf nur ein Kreuz, ohne Namen im Code.".replace("{n}", String(n))),
    plain: "Schließen-Knopf ohne Beschriftung",
    impact: "Im Screenreader hört man nur „Schaltfläche“ und erfährt nicht, wie es sich schließen lässt.",
  },
  "dialog-keyboard-trap": {
    found: (n) => (n === 1 ? "Ein Pop-up hielt den Fokus auch nach Escape und fünfzehn Tab-Drücken fest." : "{n} Pop-ups hielten den Fokus auch nach Escape und fünfzehn Tab-Drücken fest.".replace("{n}", String(n))),
    plain: "Ein Pop-up hält die Tastatur fest",
    impact: "An der Tastatur hängt man fest, und nur das Schließen des Tabs führt hinaus.",
  },
  "dialog-no-escape": {
    found: (n) => (n === 1 ? "Ein Pop-up blieb offen, als wir Escape drückten." : "{n} Pop-ups blieben offen, als wir Escape drückten.".replace("{n}", String(n))),
    plain: "Pop-up ignoriert die Escape-Taste",
    impact: "Alle an der Tastatur probieren zuerst Escape, und nichts passiert.",
  },
  "dialog-focus-not-moved": {
    found: (n) => (n === 1 ? "Ein Pop-up erschien, aber der Tastaturfokus wanderte nicht hinein." : "{n} Pop-ups erschienen, aber der Tastaturfokus wanderte in keines davon hinein.".replace("{n}", String(n))),
    plain: "Pop-up öffnet, ohne den Fokus zu übernehmen",
    impact: "Wer einen Screenreader nutzt, erfährt nie, dass es sich geöffnet hat.",
  },
  "dialog-focus-lost-on-close": {
    found: (n) => (n === 1 ? "Nach dem Schließen eines Pop-ups mit Escape lag der Fokus auf keinem Element mehr." : "Nach dem Schließen von {n} Pop-ups mit Escape lag der Fokus jeweils auf keinem Element mehr.".replace("{n}", String(n))),
    plain: "Beim Schließen geht die Stelle verloren",
    impact: "An der Tastatur muss man wieder ganz oben anfangen.",
  },
  "dialog-no-close": {
    found: (n) => (n === 1 ? "Mindestens ein Pop-up hat keinen erkennbaren Schließen-Knopf." : "{n} Pop-ups haben keinen erkennbaren Schließen-Knopf.".replace("{n}", String(n))),
    plain: "Kein sichtbarer Schließen-Knopf",
    impact: "Wenn der Klick daneben der einzige Ausweg ist, hängt fest, wer nur die Tastatur nutzt.",
  },
  "dialog-missing-role": {
    found: (n) => (n === 1 ? "Mindestens eine Einblendung liegt wie ein Pop-up über der Seite, ist im Code aber nicht als Dialog gekennzeichnet." : "{n} Einblendungen liegen wie Pop-ups über der Seite, sind im Code aber nicht als Dialog gekennzeichnet.".replace("{n}", String(n))),
    plain: "Einblendung nicht als Dialog gekennzeichnet",
    impact: "Screenreader sagen sie nicht an, und man tabbt in die Seite dahinter.",
  },
  "dialog-missing-name": {
    found: (n) => (n === 1 ? "Mindestens ein Pop-up hat im Code keinen Namen." : "{n} Pop-ups haben im Code keinen Namen.".replace("{n}", String(n))),
    plain: "Das Pop-up sagt nicht, wozu es da ist",
    impact: "Im Screenreader hört man nur „Dialog“ und weiß nicht, was gefragt wird.",
  },

  "markup-validation": {
    found: (n) => (n === 1 ? "Ein Prüfprogramm meldet, dass der Quelltext dieser Seite kein gültiges HTML ist." : "Ein Prüfprogramm meldet {n} Stellen, an denen der Quelltext dieser Seite kein gültiges HTML ist.".replace("{n}", String(n))),
    plain: "Ungültiges HTML auf der Seite",
    impact: "Jeder Browser repariert es auf seine Weise, also kann die Seite kaputtgehen.",
  },

  "motion-marquee": {
    found: (n) => (n === 1 ? "Text läuft als Laufschrift ohne Pause über die Seite." : "An {n} Stellen läuft Text als Laufschrift ohne Pause über die Seite.".replace("{n}", String(n))),
    plain: "Laufschrift ohne Pause",
    impact: "Bewegter Text ist bei Problemen mit Aufmerksamkeit oder Gleichgewicht unlesbar.",
  },
  "motion-autoplay-media": {
    found: (n) => (n === 1 ? "Mindestens ein Video startet von selbst, ohne Steuerleiste zum Anhalten." : "{n} Videos starten von selbst, ohne Steuerleiste zum Anhalten.".replace("{n}", String(n))),
    plain: "Medien starten von selbst",
    impact: "Niemand kann es stoppen, und es übertönt Screenreader.",
  },
  "motion-infinite-no-reduced-motion": {
    found: (n) => (n === 1 ? "Mindestens eine Endlosanimation läuft auch bei der Einstellung für weniger Bewegung weiter." : "{n} Endlosanimationen laufen auch bei der Einstellung für weniger Bewegung weiter.".replace("{n}", String(n))),
    plain: "Animation ignoriert die Einstellung für weniger Bewegung",
    impact: "Dauernde Bewegung kann bei Gleichgewichtsstörungen Schwindel oder Übelkeit auslösen.",
  },

  "typo-caps-letterspacing": {
    found: (n) => (n === 1 ? "Text in Großbuchstaben hat keinen oder kaum zusätzlichen Abstand zwischen den Buchstaben." : "An {n} Stellen hat Text in Großbuchstaben keinen oder kaum zusätzlichen Abstand zwischen den Buchstaben.".replace("{n}", String(n))),
    plain: "Großbuchstaben ohne zusätzlichen Abstand",
    impact: "Überschriften in eng gesetzten Großbuchstaben sind schwer zu überfliegen.",
  },
  "typo-lowercase-letterspaced": {
    found: (n) => (n === 1 ? "Ein Teil des Fließtexts hat zusätzlichen Abstand zwischen den Kleinbuchstaben." : "{n} Textblöcke im Fließtext haben zusätzlichen Abstand zwischen den Kleinbuchstaben.".replace("{n}", String(n))),
    plain: "Zusätzlicher Abstand zwischen den Buchstaben",
    impact: "Gesperrte Buchstaben zerbrechen die Wortbilder und bremsen alle.",
  },
  "typo-negative-letterspacing": {
    found: (n) => (n === 1 ? "Buchstabenabstand unter -0,4 px an einer Stelle." : "Buchstabenabstand unter -0,4 px an {n} Stellen.".replace("{n}", String(n))),
    plain: "Buchstaben berühren sich vor Enge",
    impact: "Gequetschte Buchstaben verschwimmen bei schwachem Sehvermögen ineinander.",
  },
  "typo-line-length-long": {
    found: (n) => (n === 1 ? "Auf dieser Seite steht Fließtext in Zeilen, die im Schnitt länger als 90 Zeichen sind." : "An {n} Stellen auf dieser Seite steht Fließtext in Zeilen, die im Schnitt länger als 90 Zeichen sind.".replace("{n}", String(n))),
    plain: "Zeilen sind zu lang",
    impact: "Ab etwa 75 Zeichen verliert das Auge auf dem Weg zurück die Stelle.",
  },
  "typo-line-length-short": {
    found: (n) => (n === 1 ? "Auf dieser Seite steht Fließtext in Zeilen, die im Schnitt kürzer als 25 Zeichen sind." : "An {n} Stellen auf dieser Seite steht Fließtext in Zeilen, die im Schnitt kürzer als 25 Zeichen sind.".replace("{n}", String(n))),
    plain: "Zeilen sind zu kurz abgehackt",
    impact: "Der Lesefluss zerfällt, wenn fast jede Wortgruppe in einer neuen Zeile beginnt.",
  },
  "typo-justified-no-hyphens": {
    found: (n) => (n === 1 ? "Fließtext auf dieser Seite steht im Blocksatz ohne Silbentrennung." : "An {n} Stellen auf dieser Seite steht Fließtext im Blocksatz ohne Silbentrennung.".replace("{n}", String(n))),
    plain: "Blocksatz ohne Silbentrennung",
    impact: "Ungleiche Wortabstände bilden störende weiße „Flüsse“.",
  },
  "typo-font-size-small": {
    found: (n) => (n === 1 ? "Fließtext auf dieser Seite ist kleiner als 13 px gesetzt." : "An {n} Stellen auf dieser Seite ist Fließtext kleiner als 13 px gesetzt.".replace("{n}", String(n))),
    plain: "Fließtext sehr klein gesetzt",
    impact: "Kleine Schrift ist am Handy oder mit schwachen Augen schwer zu lesen.",
  },
  "typo-typeface-count": {
    found: (n) => (n === 1 ? "Die Gestaltung dieser Seite sieht für den Text mehr als vier verschiedene Schriftarten vor." : "Die Gestaltung dieser Seite sieht für den Text mehr als vier verschiedene Schriftarten vor.".replace("{n}", String(n))),
    plain: "Zu viele Schriftarten",
    impact: "Die Seite wirkt unruhig und weniger vertrauenswürdig.",
  },

  "typo-underline-nonlink": {
    found: (n) => (n === 1 ? "Text auf dieser Seite ist unterstrichen, obwohl er kein Link ist." : "An {n} Stellen auf dieser Seite ist Text unterstrichen, obwohl er kein Link ist.".replace("{n}", String(n))),
    plain: "Unterstrichener Text, der kein Link ist",
    impact: "Leute klicken auf unterstrichenen Text, der nirgendwohin führt.",
  },
  "typo-italic-body": {
    found: (n) => (n === 1 ? "Fließtext auf dieser Seite ist absatzweise kursiv gesetzt, nicht nur in einzelnen Wörtern." : "An {n} Stellen auf dieser Seite ist Fließtext absatzweise kursiv gesetzt, nicht nur in einzelnen Wörtern.".replace("{n}", String(n))),
    plain: "Ganze Absätze in Kursiv",
    impact: "Schräge Buchstaben ermüden bei Legasthenie oder schwachen Augen.",
  },
  "typo-allcaps-block": {
    found: (n) => (n === 1 ? "Auf dieser Seite steht Fließtext von 60 Zeichen und mehr ganz in Großbuchstaben." : "An {n} Stellen auf dieser Seite steht Fließtext von 60 Zeichen und mehr ganz in Großbuchstaben.".replace("{n}", String(n))),
    plain: "Lange Passagen in GROSSBUCHSTABEN",
    impact: "Großbuchstaben nehmen die Wortbilder weg, und das bremst Menschen mit Legasthenie am meisten.",
  },
  "typo-thin-weight": {
    found: (n) => (n === 1 ? "Fließtext auf dieser Seite ist in Schriftstärke 200 oder dünner gesetzt." : "An {n} Stellen auf dieser Seite ist Fließtext in Schriftstärke 200 oder dünner gesetzt.".replace("{n}", String(n))),
    plain: "Fließtext in sehr dünner Schrift",
    impact: "Dünne Striche verblassen auf billigen Bildschirmen und bei schwachen Augen, auch wenn der Kontrast reicht.",
  },
  "nav-name-inconsistent": {
    plain: "Derselbe Link mit verschiedenen Namen",
    impact: "Wer mit dem Screenreader nach dem gewohnten Namen sucht, findet ihn nicht.",
    found: (n) => (n === 1 ? "Ein Menülink heißt auf den geprüften Seiten nicht überall gleich, obwohl er zum selben Ziel führt." : "{n} Menülinks heißen auf den geprüften Seiten nicht überall gleich, obwohl sie jeweils zum selben Ziel führen.".replace("{n}", String(n))),
  },
  "color-contrast-mobile": {
    plain: "Text bei Handybreite zu blass",
    impact: "Auf dem Handy bei Tageslicht ist der Text selbst mit guten Augen schwer zu lesen.",
    found: () => "Bei Handybreite fällt Text auf dieser Seite unter den nötigen Kontrast, am Desktop nicht.",
  },
  "color-contrast-dark": {
    plain: "Text im dunklen Modus zu blass",
    impact: "Wer den dunklen Modus gegen Blendung oder müde Augen nutzt, bekommt die blasse Fassung.",
    found: () => "Im dunklen Design fällt Text unter den nötigen Kontrast, im hellen nicht.",
  },
  "nav-order-inconsistent": {
    plain: "Das Menü wechselt die Reihenfolge",
    impact: "Wer sich die Position eines Links merkt, landet beim falschen Menüpunkt.",
    found: (n) => (n === 1 ? "Eine Seite zeigt dieselben Menülinks in anderer Reihenfolge als die zuerst geprüfte." : "{n} Seiten zeigen dieselben Menülinks in anderer Reihenfolge als die zuerst geprüfte.".replace("{n}", String(n))),
  },
  "keyboard-positive-tabindex-advisory": {
    plain: "Tab-Reihenfolge per Zahl festgelegt",
    impact: "An der Tastatur springt man in einer Reihenfolge über die Seite, die keinen Sinn ergibt.",
    found: (n) => (n === 1 ? "Mindestens ein Bedienelement bekommt seinen Platz in der Tab-Reihenfolge per Zahl." : "{n} Bedienelemente bekommen ihren Platz in der Tab-Reihenfolge per Zahl.".replace("{n}", String(n))),
  },
  "activation-stale-state": {
    plain: "Bedienelement sagt den alten Zustand an",
    impact: "Wer einen Screenreader nutzt, hört „zugeklappt“, während der Bereich offen ist.",
    found: (n) => (n === 1 ? "Mindestens ein Bedienelement reagierte sichtbar, sagt im Screenreader aber weiter den alten Zustand an." : "Mehrere Bedienelemente reagierten sichtbar, sagen im Screenreader aber weiter den alten Zustand an.".replace("{n}", String(n))),
  },
  "control-faint-boundary": {
    plain: "Rahmen von Bedienelementen zu blass",
    impact: "Wer schlecht sieht, erkennt nicht, wo Felder beginnen und enden.",
    found: (n) => (n === 1 ? "Bei mindestens einem Bedienelement hat der Rahmen weniger als 3:1 Kontrast zur Umgebung." : "Die Rahmen von {n} Bedienelementen haben weniger als 3:1 Kontrast zur Umgebung.".replace("{n}", String(n))),
  },
};

export const FIXES_DE: Record<string, string | string[]> = {
  "reflow-height-unreachable": ["Lassen Sie das Fenster in sich scrollen, oder fixieren Sie es in einem niedrigen Fenster nicht.", "Setzen Sie die Knöpfe über den langen Text, damit sie sichtbar bleiben."],
  "reflow-height-pinned": ["Fixieren Sie die Leisten oben und unten nicht, wenn das Fenster niedrig ist.", "Oder lassen Sie die Kopfzeile wegscrollen und beim Hochscrollen zurückkommen."],
  "reflow-height-pinned-advisory": "Fixieren Sie die Leisten in einem niedrigen Fenster nicht, damit die Seite den Platz bekommt.",
  "contrast-over-image": ["Legen Sie eine volle oder halbtransparente Fläche hinter den Text.", "Oder dunkeln Sie das Bild unter dem Text ab, oder nehmen Sie den Text vom Bild."],
  "form-error-silent": ["Sagen Sie neben jedem Feld in Worten, was fehlt.", "Markieren Sie das Feld als ungültig, verknüpfen Sie die Meldung damit und setzen Sie den Fokus auf den ersten Fehler."],
  "keyboard-mouse-only": [
    "Machen Sie daraus einen echten Knopf oder Link, damit die Tastatur ihn wie alles andere erreicht.",
    "Prüfen Sie es, indem Sie die Maus beiseitelegen und mit Tab durch die Seite gehen.",
  ],
  "keyboard-faint-focus": [
    "Machen Sie den Tastaturrahmen dunkler und dicker, damit er sich von der Seite dahinter abhebt.",
    "Prüfen Sie ihn auf jedem Hintergrund, auf dem er landet, nicht nur auf weißem.",
  ],
  "timing-meta-refresh": [
    "Nehmen Sie das automatische Neuladen von der Seite.",
    "Muss sie aktualisiert werden, geben Sie den Leuten einen Knopf und lassen Sie sie selbst entscheiden.",
  ],
  "aria-prohibited-attr": [
    "Schreiben Sie den Text in das Element selbst, wo er gelesen wird.",
    "Wo das nicht geht, nehmen Sie ein Element, das eine Beschriftung tragen darf.",
  ],
  "aria-required-parent": "Setzen Sie jeden Teil zurück in das Bedienelement, zu dem er gehört.",
  "landmark-no-duplicate-main": [
    "Behalten Sie einen Hauptbereich pro Seite.",
    "Kennzeichnen Sie die anderen als gewöhnliche Abschnitte.",
  ],
  "landmark-banner-is-top-level": "Setzen Sie den Seitenkopf auf die oberste Ebene, neben den Hauptinhalt statt hinein.",
  "svg-img-alt": [
    "Schreiben Sie zu jedem Symbol mit Bedeutung eine kurze Beschreibung.",
    "Rein schmückende Symbole verstecken Sie stattdessen vor Screenreadern.",
  ],
  "meta-viewport-large": [
    "Entfernen Sie die Einstellung, die das Zoomen begrenzt.",
    "Lassen Sie die Seite auf mindestens das Fünffache ihrer normalen Größe wachsen.",
  ],
  "aria-dialog-name": "Geben Sie dem Pop-up einen Namen, der sagt, wozu es da ist, damit er beim Öffnen angesagt wird.",
  "nested-interactive": [
    "Nehmen Sie das innere Bedienelement heraus, damit eine Sache anklickbar ist statt zwei.",
    "Wo beide gebraucht werden, stellen Sie sie nebeneinander statt ineinander.",
  ],
  "presentation-role-conflict": [
    "Entfernen Sie die Kennzeichnung, die das hier als Schmuck ausgibt.",
    "Es ist ein echtes Bedienelement, also lassen Sie es auch als eines ansagen.",
  ],
  "keyboard-no-visible-focus": [
    "Zeigen Sie einen klaren Rahmen um das, worauf die Tastatur gerade steht.",
    "Machen Sie ihn dick und hell genug, um ihn auf einer vollen Seite zu finden.",
    "Nehmen Sie nie einen Rahmen weg, ohne einen stärkeren an seine Stelle zu setzen.",
  ],
  "readability-dense-prose": [
    "Kürzen Sie Sätze auf etwa fünfzehn bis zwanzig Wörter.",
    "Tauschen Sie Fachwörter gegen Alltagswörter.",
    "Teilen Sie lange Absätze auf und nutzen Sie Überschriften und Listen.",
  ],
  "reading-order-mismatch": [
    "Bringen Sie die Reihenfolge im Code wieder in Einklang mit dem, was man sieht.",
    "Verschieben Sie den Inhalt selbst, statt die Tab-Reihenfolge nachzubessern.",
  ],
  "forced-colors-focus-lost": [
    "Prüfen Sie die Seite im Windows-Modus für hohen Kontrast.",
    "Lassen Sie den Fokusrahmen die Farbe des Systems annehmen statt einer festen.",
  ],
  "forced-colors-icon-lost": [
    "Prüfen Sie die Seite im Windows-Modus für hohen Kontrast.",
    "Geben Sie reinen Symbol-Schaltflächen einen echten Rahmen oder Text, damit sie das überstehen.",
  ],
  "keyboard-focus-trap": [
    "Sorgen Sie dafür, dass Tab immer weiterkommt und Escape immer herausführt.",
    "Prüfen Sie es, indem Sie die Maus beiseitelegen und nur die Tastatur nutzen.",
  ],
  "sr-filename-alt": [
    "Ersetzen Sie jeden Dateinamen durch einen Satz, der sagt, was das Bild zeigt.",
    "Geben Sie rein schmückenden Bildern einen leeren Alt-Text, damit Screenreader sie überspringen.",
  ],
  "sr-vague-link-name": [
    "Benennen Sie jeden Link nach seinem Ziel. „Preise ansehen“, nicht „Hier klicken“.",
    "Der sichtbare Text darf kurz bleiben. Ihr Entwicklungsteam kann den vollständigen Namen unsichtbar ergänzen, nur für Screenreader.",
  ],
  "sr-symbol-button-name": [
    "Beschriften Sie jede Schaltfläche mit ihrer Aktion: „Schließen“, „Nächste Folie“, „Suchen“, „Abspielen“.",
    "Die reine Symbol-Optik darf bleiben: Die Wörter kommen unsichtbar dazu, nur für Screenreader.",
  ],
  "sr-vague-button-name": [
    "Beschriften Sie jede Schaltfläche mit ihrer Aktion: „Schließen“, „Nächste Folie“, „Suchen“, „Abspielen“.",
    "Die reine Symbol-Optik darf bleiben: Die Wörter kommen unsichtbar dazu, nur für Screenreader.",
  ],
  "form-field-placeholder-label": [
    "Geben Sie jedem Feld eine sichtbare Beschriftung, die über for und id mit ihm verbunden ist.",
    "Nutzen Sie den Platzhalter als Beispiel für das Format, nie als einzige Beschriftung.",
  ],
  "component-form-autocomplete": "Kennzeichnen Sie jedes Feld mit dem, was es erfasst, damit Browser und Passwortmanager es ausfüllen können.",
  "component-input-type": "Sagen Sie der Seite, welche Felder eine E-Mail-Adresse enthalten und welche eine Telefonnummer.",
  "component-required-cue": [
    "Markieren Sie Pflichtfelder sichtbar, nicht nur im Code.",
    "Das Wort „Pflichtfeld“ neben der Beschriftung reicht.",
  ],
  "component-submit-clarity": "Geben Sie dem Formular einen klar beschrifteten Knopf, der sagt, was er tut, etwa „Anfrage senden“.",
  "component-table-no-headers": [
    "Kennzeichnen Sie die oberste Zeile als Kopfzellen, und die erste Spalte ebenso, wenn die Zeilen Namen haben.",
    "Dient die Tabelle nur dem Layout, kennzeichnen Sie sie als keine Datentabelle.",
  ],
  "component-nav-labels": "Benennen Sie jedes Menü nach dem, was darin steht, etwa „Hauptmenü“ oder „Links in der Fußzeile“.",
  "component-skip-link": [
    "Setzen Sie ganz oben einen Link, der direkt zum Hauptinhalt springt.",
    "Zeigen Sie ihn, sobald er den Tastaturfokus bekommt, damit die Leute von ihm wissen.",
  ],
  "mobile-target-spacing": "Lassen Sie etwas Platz zwischen Knöpfen und Links, damit ein Daumen nicht zwei auf einmal trifft.",
  "consent-blocks-reader": [
    "Setzen Sie den Tastaturfokus in das Banner, sobald es erscheint.",
    "Halten Sie ihn dort, bis eine Wahl getroffen ist. Erst das macht es richtig, die Seite dahinter zu verstecken.",
    "Oder verstecken Sie die Seite gar nicht: Ein Banner, das nur unten sitzt, braucht davon nichts.",
  ],
  "mobile-sticky-coverage": [
    "Verkleinern Sie die Leisten, die auf dem Handy oben und unten festhängen.",
    "Lassen Sie den größten Teil des Bildschirms für den Inhalt, wegen dem die Leute gekommen sind.",
  ],
  "mobile-horizontal-scroll": [
    "Lassen Sie den Inhalt auf die Breite des Bildschirms umbrechen.",
    "Suchen Sie nach einer festen Breite oder einem zu großen Bild, das die Seite auseinanderzieht.",
  ],
  "mobile-tap-target": "Machen Sie Knöpfe und Links mindestens so groß wie eine Fingerkuppe und lassen Sie Platz am Rand.",
  "text-spacing-clipped": [
    "Lassen Sie Kästen mit dem Text darin wachsen.",
    "Meist ist eine feste Höhe das, was die Wörter abschneidet.",
  ],
  "text-zoom-clipped": [
    "Lassen Sie Container wachsen, wenn jemand den Text vergrößert.",
    "Prüfen Sie die Seite bei doppelter Schriftgröße.",
  ],
  "text-zoom-horizontal-scroll": "Lassen Sie die Seite umbrechen, wenn der Text größer wird, statt seitlich hinauszulaufen.",
  "dark-consent-no-reject": "Geben Sie dem Cookie-Banner eine Ablehnen-Option, die so leicht zu finden ist wie das Zustimmen.",
  "dark-consent-asymmetry": "Geben Sie Zustimmen und Ablehnen dieselbe Größe, denselben Stil und dasselbe Gewicht.",
  "dark-preselected-optin": "Lassen Sie Häkchen für Werbung und Weitergabe leer.",
  "dark-confirmshaming": "Formulieren Sie die Ablehnung schlicht, etwa „Nein danke“, ohne jeden Tadel.",
  "dark-fake-scarcity": [
    "Zeigen Sie Zahlen zu Bestand und Nachfrage nur dort, wo sie stimmen und aktuell sind.",
    "Nehmen Sie jede Zahl weg, die nicht aus echten Daten kommt.",
  ],
  "dark-fake-urgency": [
    "Lassen Sie Countdowns nur laufen, wo die Frist echt ist.",
    "Nehmen Sie jeden Timer weg, der beim Neuladen wieder von vorn beginnt.",
  ],
  "dialog-close-unlabeled": "Geben Sie dem Schließen-Knopf einen Namen, damit er als „Schließen“ angesagt wird und nicht nur als Kreuz.",
  "dialog-keyboard-trap": [
    "Lassen Sie Tab im Pop-up kreisen, solange es offen ist.",
    "Lassen Sie Escape es schließen und zur Seite zurückkehren.",
  ],
  "dialog-no-escape": "Lassen Sie die Escape-Taste das Pop-up schließen.",
  "dialog-focus-not-moved": "Setzen Sie den Fokus beim Öffnen in das Pop-up, damit man mit der Tastatur darin beginnt.",
  "dialog-focus-lost-on-close": "Setzen Sie den Fokus beim Schließen zurück auf das, was das Pop-up geöffnet hat.",
  "dialog-no-close": [
    "Geben Sie jedem Pop-up einen sichtbaren Schließen-Knopf.",
    "Lassen Sie Escape es ebenfalls schließen.",
  ],
  "dialog-missing-role": [
    "Kennzeichnen Sie die Einblendung als Dialog, damit sie beim Öffnen angesagt wird.",
    "Geben Sie ihr einen Namen, der sagt, wozu sie da ist.",
    "Halten Sie die Tastatur darin, solange sie offen ist, und geben Sie sie beim Schließen zurück.",
  ],
  "dialog-missing-name": "Geben Sie dem Pop-up eine Überschrift oder einen Namen, der sagt, wozu es da ist.",
  "markup-validation": "Schicken Sie die Seite durch den W3C-Validator und beheben Sie, was er meldet.",
  "motion-marquee": [
    "Ersetzen Sie die Laufschrift durch Text, der stillsteht.",
    "Muss er sich bewegen, geben Sie den Leuten eine Möglichkeit, ihn anzuhalten.",
  ],
  "motion-autoplay-media": [
    "Sorgen Sie dafür, dass Ton und Video nicht von selbst starten.",
    "Muss etwas laufen, halten Sie es unter drei Sekunden oder setzen Sie einen Stopp-Knopf daneben.",
  ],
  "motion-infinite-no-reduced-motion": [
    "Achten Sie auf die Einstellung, mit der Leute weniger Bewegung verlangen.",
    "Animationen sollten stoppen oder zu einer einfachen Blende werden, wenn sie eingeschaltet ist.",
  ],
  "typo-caps-letterspacing": "Geben Sie den Buchstaben in Überschriften aus Großbuchstaben etwas mehr Abstand, damit die Wörter ihre Form behalten.",
  "typo-lowercase-letterspaced": "Nehmen Sie den zusätzlichen Buchstabenabstand aus gewöhnlichem Text.",
  "typo-negative-letterspacing": "Quetschen Sie die Buchstaben nicht mehr zusammen.",
  "typo-justified-no-hyphens": [
    "Setzen Sie den Text linksbündig statt im Blocksatz.",
    "Muss es Blocksatz sein, schalten Sie die Silbentrennung ein, damit die Wortabstände gleichmäßig bleiben.",
  ],
  "typo-typeface-count": [
    "Einigen Sie sich auf zwei Schriftarten, höchstens drei.",
    "Nutzen Sie Schnitt und Größe für Abwechslung statt noch einer Schriftart.",
  ],
  "typo-underline-nonlink": [
    "Unterstreichen Sie nur Links.",
    "Nutzen Sie Fettdruck oder Kursivschrift, wo Sie betonen wollen.",
  ],
  "typo-italic-body": "Setzen Sie lange Passagen aufrecht und halten Sie Kursives auf einzelne Wortgruppen begrenzt.",
  "typo-allcaps-block": [
    "Setzen Sie lange Passagen in gewöhnlicher Groß- und Kleinschreibung.",
    "Großbuchstaben bleiben kurzen Beschriftungen vorbehalten.",
  ],
  "typo-thin-weight": "Setzen Sie den Fließtext in einem normalen Schriftschnitt.",

  "aria-allowed-role": [
    "Nehmen Sie ein Element, das wirklich das ist, was es zu sein behauptet.",
    "Einen Knopf für einen Knopf, einen Navigationsblock für die Navigation.",
  ],
  "aria-allowed-attr": "Entfernen Sie die Angaben, die zu dieser Art von Element nicht gehören. Oder wechseln Sie zu einem, zu dem sie passen.",
  "aria-required-children": [
    "Setzen Sie die versprochenen Einträge hinein: eine Liste braucht Listeneinträge, ein Menü braucht Menüeinträge.",
    "Ist der Inhalt in Wahrheit keine Liste und kein Menü, nehmen Sie die Auszeichnung vom Container.",
  ],
  "landmark-unique": "Benennen Sie jeden Bereich nach dem, was darin steht, etwa „Hauptmenü“ oder „Links in der Fußzeile“.",
  "landmark-no-duplicate-banner": [
    "Behalten Sie einen Seitenkopf, auf der obersten Ebene der Seite.",
    "Machen Sie aus den anderen gewöhnliche Container.",
  ],
  "landmark-no-duplicate-contentinfo": [
    "Behalten Sie einen Seitenfuß, auf der obersten Ebene der Seite.",
    "Machen Sie aus den anderen gewöhnliche Container.",
  ],
  "landmark-contentinfo-is-top-level": "Setzen Sie den Seitenfuß auf die oberste Ebene der Seite, nicht in einen anderen Bereich.",
  "skip-link": [
    "Richten Sie den Sprunglink auf den Hauptinhalt und prüfen Sie, ob es dieses Ziel gibt.",
    "Sorgen Sie dafür, dass die Tastatur dort ankommt, wenn der Link benutzt wird.",
  ],
  "component-skip-link-dead": [
    "Richten Sie den Sprunglink auf den Hauptinhalt und prüfen Sie, ob es dieses Ziel gibt.",
    "Sorgen Sie dafür, dass die Tastatur dort ankommt, wenn der Link benutzt wird.",
  ],
  "image-redundant-alt": "Geben Sie dem Bild ein leeres alt (alt=\"\"), wenn der Text daneben schon dasselbe sagt.",
  "color-contrast": [
    "Machen Sie den Text dunkler oder das, was dahinter liegt, heller.",
    "Gewöhnlicher Text braucht ein Kontrastverhältnis von mindestens 4,5:1.",
    "Großer Text, etwa 24 px oder 19 px fett, braucht 3:1.",
  ],
  "image-alt": [
    "Schreiben Sie zu jedem Bild mit Bedeutung eine kurze Beschreibung.",
    "Sagen Sie, was darauf zu sehen ist, nicht dass es ein Bild ist.",
    "Bei rein schmückenden Bildern lassen Sie die Beschreibung leer.",
  ],
  "input-image-alt": "Beschreiben Sie, was die Bild-Schaltfläche tut, etwa „Suchen“, statt wie sie aussieht.",
  "link-name": [
    "Setzen Sie in jeden Link lesbare Wörter.",
    "Bei einem Symbol-Link ergänzen Sie eine Beschriftung, die sagt, wohin er führt, nicht wie er aussieht.",
    "Wo der Link schon Wörter zeigt, übernehmen Sie genau diese Wörter in die Beschriftung.",
    "Wer per Sprache steuert, sagt, was er sieht, also müssen beide übereinstimmen.",
  ],
  "link-text-vague": [
    "Schreiben Sie Linktexte, die für sich allein gelesen Sinn ergeben.",
    "„Die Gebührenänderungen 2026 lesen“ statt „Mehr erfahren“.",
    "Soll die kurze Fassung auf dem Bildschirm bleiben, hinterlegen Sie den vollen Wortlaut als Beschriftung.",
  ],
  "label-content-name-mismatch": [
    "Übernehmen Sie die sichtbaren Wörter des Bedienelements in seinen Namen im Code.",
    "Beginnen Sie den Namen mit genau diesen Wörtern und ergänzen Sie erst danach.",
    "Wer per Sprache steuert, sagt, was er sieht, also müssen beide übereinstimmen.",
  ],
  "button-name": [
    "Geben Sie jedem Knopf Wörter, die sagen, was er tut.",
    "Bei einem Symbol-Knopf ergänzen Sie eine Beschriftung, die die Aktion beschreibt.",
    "Wo der Knopf schon Wörter zeigt, übernehmen Sie genau diese Wörter in die Beschriftung.",
    "Wer per Sprache steuert, sagt, was er sieht, also müssen beide übereinstimmen.",
  ],
  label: [
    "Geben Sie jedem Feld eine sichtbare Beschriftung, die sagt, was hineingehört.",
    "Sorgen Sie dafür, dass ein Klick auf die Beschriftung den Cursor in ihr Feld setzt.",
  ],
  "select-name": [
    "Geben Sie dem Auswahlfeld eine sichtbare Beschriftung, die sagt, was gewählt wird.",
    "Wo dafür kein Platz ist, hinterlegen Sie stattdessen einen Namen für Screenreader.",
  ],
  "document-title": "Geben Sie der Seite einen Titel, der sie beschreibt. Er steht im Browser-Tab und in den Suchergebnissen.",
  "html-has-lang": "Sagen Sie der Seite, in welcher Sprache sie geschrieben ist, damit Screenreader die richtige Stimme nehmen.",
  "html-lang-valid": "Korrigieren Sie die Sprachangabe der Seite auf einen echten Sprachcode, etwa de für Deutsch oder en für Englisch.",
  "heading-order": "Nutzen Sie Überschriften der Reihe nach, ohne eine Ebene zu überspringen.",
  "page-has-heading-one": "Setzen Sie oben eine <h1>, die sagt, worum es auf der Seite geht.",
  "empty-heading": "Setzen Sie Text in die Überschrift oder entfernen Sie das leere Überschriften-Tag.",
  "link-in-text-block": "Geben Sie Links im Text ein zweites sichtbares Merkmal neben der Farbe, meist eine Unterstreichung.",
  "meta-viewport": "Entfernen Sie die Einstellung, die das Zoomen sperrt, damit die Seite auf jede nötige Größe wachsen kann.",
  "frame-title": "Geben Sie jedem eingebetteten Rahmen einen Namen, der sagt, was darin steckt, etwa „Anfahrtskarte“.",
  "duplicate-id-active": "Machen Sie jede id auf der Seite eindeutig. Keine zwei Elemente sollten sich eine teilen.",
  list: "Zeichnen Sie echte Listen als Listen aus, mit jedem Eintrag in derselben Liste.",
  listitem: "Setzen Sie jeden Listeneintrag in eine Liste, statt ihn allein stehen zu lassen.",
  "aria-required-attr": [
    "Geben Sie dem Element den Zustand, den es für sich beansprucht.",
    "Sagen Sie im Code, ob es an- oder abgewählt ist, geöffnet oder geschlossen.",
    "Ein Element, das einen Wert auf einer Skala meldet, muss auch den Wert nennen.",
  ],
  "aria-hidden-focus": "Machen Sie es entweder sichtbar oder nehmen Sie es zusätzlich aus der Tab-Reihenfolge.",
  region: [
    "Setzen Sie jeden Teil der Seite in einen benannten Bereich: Kopf, Navigation, Hauptinhalt, Fuß.",
    "Inhalt außerhalb davon wird übersprungen, wenn jemand zwischen Abschnitten springt.",
  ],
  "landmark-one-main": "Kennzeichnen Sie den Hauptinhalt der Seite als Hauptbereich, und nutzen Sie nur einen pro Seite.",
  tabindex: 'Entfernen Sie positive tabindex-Werte (tabindex="1" oder höher) und lassen Sie die natürliche Reihenfolge der Seite den Fokus bestimmen.',
  "scrollable-region-focusable": 'Ergänzen Sie tabindex="0" am scrollbaren Container, damit man auch mit der Tastatur darin scrollen kann.',
  "keyboard-positive-tabindex-advisory": "Bitten Sie Ihr Entwicklungsteam, die Zahlen zu entfernen, mit denen die Tab-Reihenfolge von Hand festgelegt ist. Die Tastatur folgt dann der Reihenfolge der Seite, auch bei allem, was später dazukommt.",
  "nav-name-inconsistent": "Geben Sie jedem Menülink einen einzigen Namen, „Warenkorb“ oder „Einkaufswagen“, nicht beides, und verwenden Sie ihn auf jeder Seite.",
  "color-contrast-mobile": [
    "Suchen Sie die Media Query für Handybreite, die die Text- oder Hintergrundfarbe ändert.",
    "Prüfen Sie dieses Farbpaar nach derselben Regel: Gewöhnlicher Text braucht mindestens 4,5:1.",
  ],
  "color-contrast-dark": [
    "Prüfen Sie die Text- und Hintergrundfarben der dunklen Palette genauso wie die der hellen.",
    "Gewöhnlicher Text braucht in beiden Designs mindestens 4,5:1.",
  ],
  "nav-order-inconsistent": "Zeigen Sie die Menülinks auf jeder Seite in derselben Reihenfolge. Eine Seite darf weniger Links zeigen, aber die vorhandenen sollten ihre Reihenfolge behalten.",
  "activation-stale-state": "Lassen Sie jedes Bedienelement seinen neuen Zustand ansagen, sobald er sich ändert: aufgeklappt oder zugeklappt, an oder aus. Ihr Entwicklungsteam setzt das im selben Code, der das Element öffnet oder umschaltet.",
  "control-faint-boundary": "Machen Sie die Rahmen von Feldern und Knöpfen dunkler. Die Rahmen brauchen ein Kontrastverhältnis von mindestens 3:1 zu dem, was dahinter liegt. Ihr Designteam kann meist alle mit einer Änderung am gemeinsamen Stil beheben.",
};

export const UNDECIDED_DE: Record<string, { what: string; ask: string }> = {
  "form-error-unlinked": {
    what: "Ein Formular zeigt nach leerem Absenden einen Fehler, verbindet ihn aber nicht mit dem Feld. Nichts wurde an die Website gesendet.",
    ask: "Lassen Sie jedes fehlerhafte Feld als ungültig markieren. Die Meldung gehört per aria-describedby an das Feld, damit ein Screenreader beides vorliest.",
  },
  "form-error-unannounced": {
    what: "Ein Formular zeigt Fehler, ohne den Fokus zu bewegen oder sie anzusagen. Nichts wurde an die Website gesendet.",
    ask: "Lassen Sie den Fokus auf den ersten Fehler oder eine Übersicht setzen. Ein Live-Bereich geht auch.",
  },
  "media-embed-no-captions": {
    what: "Ein eingebettetes YouTube- oder Vimeo-Video hat laut seiner Website gar keine Untertitel. Ein stummes Video braucht keine.",
    ask: "Spielen Sie es ab. Spricht jemand, fügen Sie im Konto des Videos Untertitel hinzu, von einem Menschen korrigiert.",
  },
  "media-embed-auto-captions": {
    what: "Ein eingebettetes YouTube- oder Vimeo-Video hat laut seiner Website nur automatische Untertitel. Die verfehlen oft Namen und Zahlen.",
    ask: "Spielen Sie es mit Untertiteln ab. Stimmen Wörter nicht, korrigieren Sie sie im Konto des Videos, oder laden Sie eine Untertiteldatei hoch.",
  },
  "color-contrast": {
    what: "Text über einem Foto, einem Video oder einem Farbverlauf. Sein Kontrast wechselt von Stelle zu Stelle, deshalb konnte die Prüfung keinen einzelnen Wert messen.",
    ask: "Bitten Sie Ihr Designteam, jede Stelle dort zu prüfen, wo das Bild dahinter am hellsten ist. Fließtext braucht einen Kontrast von 4,5:1, großer Text 3:1. Reicht er nicht, gehört eine feste Fläche oder ein dunkler Schleier hinter die Wörter.",
  },
  "link-in-text-block": {
    what: "Links in Absätzen, die nur durch ihre Farbe auffallen, ohne Unterstreichung. Die Prüfung konnte nicht messen, ob sich ihre Farbe genug vom Text daneben abhebt.",
    ask: "Bitten Sie Ihr Designteam, diese Links zu unterstreichen. Das ist die einfachste Lösung. Ein Farbunterschied von 3:1 zum umgebenden Text reicht auch, wenn der Link bei Mauszeiger und Tastaturfokus eine Unterstreichung bekommt.",
  },
  "video-caption": {
    what: "Ein Video auf der Seite. Die Prüfung kann es nicht abspielen und weiß deshalb nicht, ob es Untertitel gibt und ob sie zum Gesprochenen passen.",
    ask: "Spielen Sie es mit eingeschalteten Untertiteln ab. Spricht jemand, sollte jedes Wort erscheinen, von einem Menschen korrigiert. Automatische Untertitel allein zählen nicht.",
  },
  "media-video-captions": {
    what: "Ein Video ohne angehängte Untertiteldatei. Ein stummer Clip braucht keine, und eingebrannte Untertitel hinterlassen keine Datei. Ein Fehler ist das also noch nicht.",
    ask: "Spielen Sie jedes Video ab. Spricht jemand und erscheinen keine Untertitel, bitten Sie die Person, die es gemacht hat, um von Menschen korrigierte Untertitel. Automatische allein zählen nicht.",
  },
  "media-video-descriptions": {
    what: "Ein untertiteltes Video, in dem nichts beschreibt, was zu sehen ist. Untertitel tragen die Worte, nicht das Bild, etwa ein Diagramm oder eingeblendeten Text.",
    ask: "Sehen Sie jedes Video mit geschlossenen Augen an. Entgeht Ihnen etwas, etwa ein Diagramm, eine Vorführung oder eingeblendeter Text, muss der Ton es beschreiben. Eine Textfassung auf der Seite erfüllt nur Stufe A.",
  },
  "form-error-association": {
    what: "Fehlermeldungen im Formular, die im Code nicht mit ihrem Feld verbunden sind. Ein Screenreader sagt das Feld an, aber nicht den Fehler daneben.",
    ask: "Bitten Sie Ihr Entwicklungsteam, jede Meldung mit aria-describedby an ihr Feld zu binden. Dann hört man das Problem im selben Moment wie das Feld.",
  },
  "media-audio-transcript": {
    what: "Audio auf der Seite. Ein Transkript wäre gewöhnlicher Text, deshalb kann die Prüfung nicht sagen, ob es eines gibt.",
    ask: "Suchen Sie neben jedem Player eine schriftliche Fassung von allem, was gesagt wird. Fehlt sie, bitten Sie die Person, die die Aufnahme gemacht hat, darum und stellen Sie sie auf die Seite.",
  },
  "media-embedded-player": {
    what: "Ein Video im Player eines anderen Unternehmens, etwa YouTube oder Vimeo. Das Video liegt auf deren Website, deshalb kann die Prüfung nicht hineinsehen.",
    ask: "Spielen Sie jedes ab und schalten Sie die Untertitel mit der CC-Taste ein. Fehlt die Taste oder stimmen die Untertitel nicht, korrigieren Sie sie in dem Konto, auf dem das Video liegt.",
  },
  "pdf-linked-not-checked": {
    what: "PDF-Dokumente, auf die diese Seite verlinkt und die die Prüfung nicht geöffnet hat. Eine Seitenprüfung öffnet die ersten zwei auf Ihrer eigenen Website und zählt die übrigen.",
    ask: "Fügen Sie die Adresse eines Dokuments in die Prüfung ein, um es einzeln zu prüfen. Ein PDF braucht Tags, einen Titel und eine festgelegte Sprache, damit ein Screenreader es richtig vorlesen kann.",
  },
  "pdf-linked-faults": {
    what: "Ein PDF, auf das diese Seite verlinkt. Die Prüfung hat es geöffnet und Fehler gefunden, etwa fehlende Tags oder einen fehlenden Titel. Es sind Fehler des Dokuments, deshalb zählen sie nicht zum Ergebnis dieser Seite.",
    ask: "Fügen Sie die Adresse des Dokuments in die Prüfung ein, dann erhalten Sie einen eigenen Bericht dazu. Bitten Sie danach die Person, die es erstellt hat, die Originaldatei zu korrigieren und neu hochzuladen.",
  },
  "office-linked-not-checked": {
    what: "Word-, Excel- oder PowerPoint-Dateien, auf die diese Seite verlinkt. Die Prüfung zählt sie und öffnet sie nie.",
    ask: "Öffnen Sie jede Datei und starten Sie die Barrierefreiheitsprüfung, die in Office im Menü Überprüfen eingebaut ist. Noch besser stellen Sie den Inhalt auf eine Webseite, die alle lesen können.",
  },
  "consent-layer-in-frame": {
    what: "Das Cookie-Banner kommt in einem Frame von der Website eines anderen Unternehmens. Der Scan kann daher nicht prüfen, was ein Screenreader darin vorliest.",
    ask: "Lassen Sie die Seite mit einem Screenreader öffnen, etwa VoiceOver am Mac oder NVDA unter Windows. Das Banner sollte zuerst vorgelesen werden, und die Tabulatortaste sollte seine Buttons erreichen. Ablehnen sollte so viele Schritte brauchen wie Zustimmen.",
  },
  "consent-layer-unheralded": {
    what: "Ein Cookie-Banner, von dem ein Screenreader nie erfährt. Es hat keine Dialog-Rolle und keinen Namen, und die Tabulatortaste erreicht es nie.",
    ask: "Bitten Sie Ihre Entwicklung, das Banner als Dialog mit einem Namen wie „Cookie-Einstellungen“ zu kennzeichnen. Beim Öffnen gehört der Tastaturfokus hinein.",
  },
  "consent-trap-unnamed": {
    what: "Die Tabulatortaste bleibt im Cookie-Banner, aber das Banner sagt nie, was es ist. Wer einen Screenreader nutzt, steckt in etwas ohne Namen fest.",
    ask: "Bitten Sie Ihre Entwicklung, das Banner als Dialog zu kennzeichnen und ihm einen Namen zu geben, etwa „Cookie-Einstellungen“.",
  },
  "interaction-motion-actuation": {
    what: "Die Seite reagiert darauf, dass das Handy gekippt oder geschüttelt wird. Wer sein Handy in einer Halterung hat oder zittrige Hände, kann das nicht.",
    ask: "Fragen Sie Ihr Entwicklungsteam, ob sich jede Kipp- oder Schüttelaktion auch durch Tippen auf dem Bildschirm auslösen lässt. Fragen Sie dann, ob sich die Bewegungssteuerung abschalten lässt, damit eine zitternde Hand sie nicht versehentlich auslöst.",
  },
  "interaction-gesture-listeners": {
    what: "Die Seite wartet auf Wischen oder Ziehen. Menschen mit Zittern oder mit Sprach- oder Schaltersteuerung schaffen das unter Umständen nicht.",
    ask: "Bedienen Sie jedes Karussell, jeden Regler und jede Karte nur mit einzelnem Tippen. Was Wischen oder Ziehen verlangt, braucht zusätzlich einen Button, etwa Pfeile neben einem Karussell.",
  },
  "interaction-key-shortcuts": {
    what: "Die Seite achtet auf Tastendrücke im ganzen Fenster. Wo ein einzelner Buchstabe ein Kürzel ist, löst ihn jeder aus, der mit seinem Computer spricht.",
    ask: "Fragen Sie Ihr Entwicklungsteam, ob ein Kürzel aus einem einzelnen Buchstaben oder einer Ziffer besteht. Jedes davon muss abschaltbar oder änderbar sein oder nur gelten, solange das Element den Fokus hat.",
  },
  "interaction-unmarked-language": {
    what: "Passagen in einer anderen Schrift als der Rest der Seite, ohne Angabe, welche Sprache das ist. Ein Screenreader spricht sie falsch aus, und dann sind sie oft nicht zu verstehen.",
    ask: "Bitten Sie Ihr Entwicklungsteam, jede Passage mit ihrer Sprache zu kennzeichnen. Automatisch erkennbar ist nur ein Schriftwechsel. Fragen Sie also auch nach fremdsprachigen Passagen in lateinischer Schrift.",
  },
  "interaction-title-tooltip": {
    what: "Tooltips, die nur erscheinen, wenn die Maus über etwas schwebt. Wer Tastatur oder Touchscreen nutzt, sieht sie nie, und sie verschwinden, wenn man sich ihnen nähert.",
    ask: "Fahren Sie mit der Maus über jeden und lesen Sie ihn. Steht darin etwas Wichtiges, gehört der Text auf die Seite. Oder die Entwicklung baut einen Tooltip, der auch beim Fokus erscheint und mit Escape schließt.",
  },
  "interaction-orientation-lock": {
    what: "Die Styles der Seite drehen sie zurück oder blenden sie aus, wenn das Handy gedreht wird. Meist ist sie dann auf eine Ausrichtung festgelegt, außer eine breite Ansicht ist bewusst nur für Querformat gedacht.",
    ask: "Öffnen Sie die Seite auf dem Handy und drehen Sie es in beide Richtungen. Alles sollte weiter funktionieren, für Menschen mit einem Handy fest am Rollstuhl oder in einer Halterung.",
  },
  "interaction-no-status-region": {
    what: "Nichts auf dieser Seite ist dafür eingerichtet, Änderungen ohne Neuladen anzusagen, etwa eine gefilterte Liste oder die Meldung „Gespeichert“. Ein Screenreader bleibt dabei stumm.",
    ask: "Fragen Sie Ihr Entwicklungsteam, ob sich hier etwas ohne Neuladen ändert. Wenn ja, braucht diese Änderung einen Live-Bereich, damit sie nicht nur gezeigt, sondern auch gesprochen wird.",
  },
  "interaction-acts-on-change": {
    what: "Menüs oder Kästchen, deren Code nahelegt, dass sie sofort beim Setzen handeln, ohne Button. Wir haben sie nicht ausprobiert, das könnte eine echte Bestellung auslösen.",
    ask: "Probieren Sie jedes auf einer Testkopie der Website aus. Schickt eine Auswahl ein Formular ab oder öffnet eine neue Seite, braucht es dafür einen Button. Ein Hinweis daneben geht auch.",
  },
  "interaction-pointer-cancellation": {
    what: "Elemente, die schon beim Drücken handeln und nicht erst beim Loslassen. Wer versehentlich auf eines kommt, kann nicht mehr wegrutschen und loslassen.",
    ask: "Bitten Sie Ihr Entwicklungsteam, diese erst beim Loslassen auszulösen. Wem die Hand verrutscht oder wer länger zielt, kann dann noch weggehen, bevor er den Finger hebt.",
  },
  "aria-valid-attr-value": {
    what: "Code-Beschriftungen, die über eine ID auf einen anderen Teil der Seite zeigen. Die Prüfung konnte nicht bestätigen, dass dieser Teil vorhanden ist.",
    ask: "Bitten Sie Ihre Entwicklung zu bestätigen, dass jede von einem aria-Attribut genannte ID existiert. Sie darf nie ausgeblendet oder entfernt werden.",
  },
  "aria-allowed-role": {
    what: "Elemente, denen der Code eine Rolle wie Button oder Tab gibt, die vielleicht nicht passt. Ob das falsch ist, hängt von ihrem Verhalten ab.",
    ask: "Bitten Sie Ihre Entwicklung zu prüfen, ob sich jedes so verhält, wie seine Rolle verspricht, auch mit der Tastatur. Sonst entfällt die Rolle zugunsten des passenden nativen Elements, etwa eines echten Buttons.",
  },
  "aria-prohibited-attr": {
    what: "Elemente mit einem Namen im Code, den ihr Typ vielleicht nicht erlaubt. Ein Screenreader übergeht diesen Namen dann womöglich.",
    ask: "Bitten Sie Ihre Entwicklung zu prüfen, ob jedes mit dem gewünschten Namen vorgelesen wird. Wenn nicht, gehört der Name auf ein Element, das einen tragen darf.",
  },
  "css-orientation-lock": {
    what: "Styles, die die Seite vielleicht auf Hoch- oder Querformat festlegen. Die Prüfung dafür ist noch experimentell und kann sich irren.",
    ask: "Öffnen Sie die Seite auf dem Handy und drehen Sie es in beide Richtungen. Alles sollte weiter funktionieren, für Menschen mit fest montiertem Handy oder Tablet.",
  },
  "label-content-name-mismatch": {
    what: "Bedienelemente, deren Name im Code die sichtbaren Wörter vielleicht nicht enthält. Die Prüfung konnte es nicht entscheiden, meist weil das Element nach seinem aktuellen Wert benannt ist.",
    ask: "Bitten Sie Ihr Entwicklungsteam, bei jedem die sichtbaren Wörter mit dem angesagten Namen zu vergleichen. Der angesagte Name sollte die sichtbaren Wörter enthalten, in derselben Reihenfolge.",
  },
  "duplicate-id-aria": {
    what: "Eine id, die möglicherweise mehrfach verwendet wird. Jede Angabe im Code, die darauf zeigt, folgt nur der ersten, also kann ein Name still am falschen Element landen.",
    ask: "Bitten Sie Ihr Entwicklungsteam, jede id auf der Seite eindeutig zu machen, beginnend mit denen, auf die ein aria-Attribut zeigt.",
  },
};

export const PRINCIPLES_DE: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {
  "1": {
    principleLabel: "Wahrnehmbar",
    plainTitle: "Können Menschen es sehen und hören?",
    plainDescription: "Blasser Text, Bilder ohne Beschreibung, Videos ohne Untertitel, Audio ohne Transkript.",
  },
  "2": {
    principleLabel: "Bedienbar",
    plainTitle: "Können Menschen es benutzen?",
    plainDescription: "Ob Menschen durch Ihre Website kommen: mit der Tastatur, auf dem Handy, per Sprache oder ohne feine Kontrolle über die Hände.",
  },
  "3": {
    principleLabel: "Verständlich",
    plainTitle: "Können Menschen es verstehen?",
    plainDescription: "Ob Ihre Formulierungen und Ihr Aufbau Sinn ergeben und ob sich die Seite so verhält, wie man es erwartet.",
  },
  "4": {
    principleLabel: "Robust",
    plainTitle: "Wird es weiter funktionieren?",
    plainDescription: "Ob Ihre Website in anderen Browsern, auf anderen Geräten und mit Screenreadern funktioniert.",
  },
};

export const LEVEL_FRAMING_DE: Partial<Record<"A" | "AA" | "AAA", string>> = {
  A: "Grundanforderung (Stufe A)",
  AA: "In den meisten Ländern gesetzlich verlangt (Stufe AA)",
  AAA: "Erweitert (Stufe AAA): eine gute Idee, nicht Pflicht und nicht gewertet",
};
