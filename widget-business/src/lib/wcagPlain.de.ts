/* Deutsche Fassung der Berichtstexte. Der Rückfall erfolgt pro Schlüssel:
   Was hier fehlt, erscheint auf Englisch statt zu verschwinden. */
import type { PlainRule } from "./wcagPlain";

export const PLAIN_DE: Record<string, PlainRule> = {
  "timing-meta-refresh": {
    plain: "Die Seite lädt automatisch neu",
    impact: "Wer noch liest oder mitten im Formular steckt, landet ohne Warnung wieder am Anfang. Langsam zu lesen ist kein Fehler, und das hier bestraft es.",
  },
  "aria-allowed-role": {
    plain: "Elemente sind falsch ausgezeichnet",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist" : "Elemente sind"} im Code als etwas ausgezeichnet, das ${n === 1 ? "es nicht sein kann" : "sie nicht sein können"}. Die Rolle passt nicht zu dieser Art von Tag.`,
    impact: "Screenreader sagen das Falsche an. Man hört „Schaltfläche“, wo ein Link steht, oder „Überschrift“, wo eine Liste steht.",
  },
  "aria-allowed-attr": {
    plain: "Code-Angaben am falschen Element",
    found: (n) =>
      `${n} ${n === 1 ? "Element trägt Angaben, die es als Tag dieser Art nicht haben darf" : "Elemente tragen Angaben, die sie als Tags dieser Art nicht haben dürfen"}. Browser und Screenreader sind sich nicht einig, was ${n === 1 ? "es ist" : "sie sind"}.`,
    impact: "Screenreader sagen Unsinn an oder überspringen das Element ganz.",
  },
  "aria-prohibited-attr": {
    plain: "Eine Beschriftung, die der Code verwirft",
    found: (n) =>
      `${n} ${n === 1 ? "Element trägt" : "Elemente tragen"} eine Beschriftung, die der Code bei dieser Art von Tag nicht zulässt. Die Beschriftung wird weggeworfen statt vorgelesen.`,
    impact: "Im Quelltext sieht das Element benannt aus, also fällt niemandem etwas auf. Screenreader ignorieren die Beschriftung und lesen vor, was im Element steht – oft nichts.",
  },
  "aria-required-children": {
    plain: "Menüs oder Listen ohne Einträge",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist im Code als Menü oder Liste ausgezeichnet, enthält aber keinen der Einträge, die es braucht. Es wird als leer angesagt." : "Elemente sind im Code als Menüs oder Listen ausgezeichnet, enthalten aber keinen der Einträge, die sie brauchen. Jedes wird als leer angesagt."}`,
    impact: "Screenreader erkennen den Aufbau nicht, also kann niemand darin navigieren.",
  },
  "aria-required-parent": {
    plain: "Teile eines Bedienelements stehen allein",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist als Teil eines größeren Bedienelements ausgezeichnet: ein Reiter, ein Menüpunkt, eine Listenoption. Es steht nicht in dem Bedienelement, zu dem es gehört." : "Elemente sind als Teile eines größeren Bedienelements ausgezeichnet: Reiter, Menüpunkte, Listenoptionen. Keines steht in dem Bedienelement, zu dem es gehört."}`,
    impact: "Ein Reiter außerhalb seiner Reiterleiste ist kein Reiter. Screenreader können nicht sagen, der wievielte von wie vielen er ist. Und die Pfeiltasten, mit denen man durch solche Elemente geht, haben nichts, wodurch sie gehen könnten.",
  },
  "landmark-unique": {
    plain: "Zwei Seitenbereiche heißen gleich",
    found: (n) =>
      `${n} ${n === 1 ? "Bereich trägt denselben Namen wie ein anderer" : "Bereiche tragen denselben Namen wie andere"}. Eine Liste der Bereiche zeigt Wiederholungen, die niemand auseinanderhalten kann.`,
    impact: "Wer einen Screenreader nutzt, bekommt eine Liste gleicher Einträge und kann sie nicht unterscheiden.",
  },
  "landmark-no-duplicate-banner": {
    plain: "Mehr als ein Seitenkopf",
    found: () =>
      `Die Seite kennzeichnet mehr als einen Bereich als Kopfbereich. Eine Liste der Bereiche bietet dann mehrere an, und keiner davon ist der Kopf.`,
    impact: "Screenreader listen mehrere Kopfbereiche auf, und niemand erkennt den echten.",
  },
  "landmark-no-duplicate-contentinfo": {
    plain: "Mehr als ein Seitenfuß",
    found: () =>
      `Die Seite kennzeichnet mehr als einen Bereich als Fußbereich. Es gibt also keinen einzigen Ort, zu dem man für Kontakt oder Bedingungen springt.`,
    impact: "Screenreader listen mehrere Fußbereiche auf, und niemand weiß, welcher welcher ist.",
  },
  "landmark-no-duplicate-main": {
    plain: "Mehr als ein Hauptbereich",
    found: () =>
      `Mehr als ein Bereich ist als Hauptinhalt gekennzeichnet. „Zum Hauptinhalt springen“ muss sich für einen entscheiden und kann nicht wissen, welchen Sie meinten.`,
    impact: "Man landet in der falschen Hälfte der Seite.",
  },
  "landmark-banner-is-top-level": {
    plain: "Kopfbereich steckt in einem anderen Bereich",
    found: () =>
      `Der Kopfbereich steckt in einem anderen Bereich, statt daneben zu stehen. Wer zwischen Bereichen springt, findet ihn nicht dort, wo er ihn erwartet.`,
    impact: "Wer per Screenreader dorthin springt, kommt nicht wie gewohnt an.",
  },
  "landmark-contentinfo-is-top-level": {
    plain: "Fußbereich steckt in einem anderen Bereich",
    found: () =>
      `Der Fußbereich steckt in einem anderen Bereich, statt daneben zu stehen. Wer zwischen Bereichen springt, findet ihn nicht dort, wo er ihn erwartet.`,
    impact: "Wer per Screenreader dorthin springt, kommt nicht wie gewohnt an.",
  },
  "skip-link": {
    plain: "Der Sprunglink führt ins Leere",
    found: (n) =>
      `${n} ${n === 1 ? "Sprunglink zeigt" : "Sprunglinks zeigen"} auf etwas, das es auf der Seite nicht gibt. Wer ${n === 1 ? "ihn" : "sie"} benutzt, bewegt sich keinen Schritt.`,
    impact: "An der Tastatur drückt man ihn und bleibt genau da, wo man war. Und tabbt dann doch durch das ganze Menü.",
  },
  "image-redundant-alt": {
    plain: "Bildbeschreibung wiederholt den Text daneben",
    found: (n) =>
      `${n} ${n === 1 ? "Bild wiederholt" : "Bilder wiederholen"} im Alt-Text die Wörter, die schon daneben stehen. Ein Screenreader sagt dasselbe zweimal.`,
    impact: "Wer einen Screenreader nutzt, hört dasselbe zweimal und verliert Zeit ohne Gewinn.",
  },
  "color-contrast": {
    research: "WebAIM prüft jedes Jahr eine Million Startseiten. Zu blasser Text ist Jahr für Jahr der häufigste Fehler, den WebAIM dabei findet. Weit mehr Menschen sehen schlechter, als die Monitore eines Design-Teams vermuten lassen.",
    plain: "Text zu blass zum Lesen",
    found: (n) =>
      `${n} ${n === 1 ? "Textstelle auf dieser Seite liegt farblich zu nah am Hintergrund dahinter. Sie steht" : "Textstellen auf dieser Seite liegen farblich zu nah am Hintergrund dahinter. Jede steht"} unter „Betroffene Elemente“, und die technische Fassung nennt das gemessene Verhältnis.`,
    impact: "Schwer zu lesen bei hellem Licht, auf einem billigen Bildschirm oder mit nicht perfekten Augen. Ihre Botschaft kommt nicht an.",
  },
  "image-alt": {
    research: "WebAIM prüft jedes Jahr eine Million Startseiten. Bilder ohne Beschreibung gehören Jahr für Jahr zu den häufigsten Fehlern. Und es ist einer der einfachsten, die sich beheben lassen.",
    plain: "Bilder ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Bild hat" : "Bilder haben"} gar keinen Alt-Text — nicht einmal einen leeren, der ${n === 1 ? "es" : "sie"} als Schmuck kennzeichnet. Ein Screenreader liest dann den Dateinamen vor oder übergeht ${n === 1 ? "es" : "sie"} stumm.`,
    impact: "Wer einen Screenreader nutzt, hört zu diesen Bildern nichts, und Suchmaschinen wissen nicht, was darauf zu sehen ist. Das kostet Sie beides: Zugänglichkeit und Auffindbarkeit.",
  },
  "svg-img-alt": {
    plain: "Symbole ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Symbol ist im Code als Bild gekennzeichnet, sagt aber mit keinem Wort, was es zeigt." : "Symbole sind im Code als Bilder gekennzeichnet, sagen aber mit keinem Wort, was sie zeigen."}`,
    impact: "Oft ist das Symbol die einzige Beschriftung: eine Lupe für die Suche, ein Korb für den Warenkorb. Ein Screenreader kommt dort an und hat nichts anzusagen.",
  },
  "input-image-alt": {
    plain: "Bild-Schaltfläche ohne Beschreibung",
    found: (n) =>
      `${n} ${n === 1 ? "Bild, das als Schaltfläche dient, hat" : "Bilder, die als Schaltflächen dienen, haben"} keinen Alt-Text. Es gibt nichts anzusagen und nichts zu lesen.`,
    impact: "Wer einen Screenreader nutzt, erfährt nicht, was die Schaltfläche tut, und kommt nicht ans Ziel.",
  },
  "link-name": {
    research: "Leere Links gehören zu den häufigsten Fehlern in der jährlichen WebAIM-Untersuchung von einer Million Startseiten. Wer einen Screenreader nutzt, lässt sich oft eine Liste aller Links geben. Ein leerer Link steht dort nur als das Wort „Link“ und sonst nichts.",
    plain: "Links ohne lesbaren Text",
    found: (n) =>
      `${n} ${n === 1 ? "Link enthält" : "Links enthalten"} keinen lesbaren Text — keine Wörter, keine Beschriftung, nichts zum Ansagen. ${n === 1 ? "Meist ist es ein Symbol, ein Pfeil oder ein Bild, das als Link dient." : "Meist sind es Symbole, Pfeile oder Bilder, die als Links dienen."} Das Bild trägt die Bedeutung, der Code trägt nichts davon.`,
    impact: "Wer einen Screenreader nutzt, lässt sich oft eine Liste aller Links geben und wählt daraus. Ein Link ohne Text steht dort nur als das Wort „Link“. Mehrere davon machen aus der Liste „Link, Link, Link“.",
  },
  "link-text-vague": {
    plain: "Links heißen nur „Mehr erfahren“",
    impact: "Wer einen Screenreader nutzt, kann sich eine Liste aller Links geben lassen. Wenn alle gleich heißen, hilft diese Liste überhaupt nicht.",
  },
  "button-name": {
    research: "Schaltflächen ohne Beschriftung stehen Jahr für Jahr weit oben in der jährlichen WebAIM-Untersuchung von einer Million Startseiten. Meist sind es reine Symbol-Schaltflächen, die für ihre Gestalter selbsterklärend waren.",
    plain: "Schaltflächen ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Schaltfläche hat" : "Schaltflächen haben"} gar keine Beschriftung: keine Wörter darin und keinen Namen im Code. Fast immer sind es Symbol-Schaltflächen, bei denen das Zeichen die Bedeutung trägt und der Code nichts davon.`,
    impact: "Niemand weiß vor dem Klick, was passiert. Ein häufiger Grund, aufzugeben.",
  },
  label: {
    research: "Fehlende Feldbeschriftungen stehen weit oben in der jährlichen WebAIM-Untersuchung von einer Million Startseiten. In der britischen Click-Away-Pound-Studie verließen die meisten Käufer, die auf so eine Hürde stießen, den Shop wortlos. Ihr Geld gaben sie woanders aus.",
    plain: "Formularfelder ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Formularfeld ist" : "Formularfelder sind"} im Code nicht mit einer Beschriftung verbunden. Auf dem Bildschirm stehen die Wörter vielleicht direkt daneben, aber nichts verknüpft beides. Ein Screenreader sagt das Feld an, ohne zu wissen, wofür es da ist.`,
    impact: "Wer einen Screenreader nutzt, weiß nicht, was in welches Feld gehört. Formulare bleiben liegen, die Kasse eingeschlossen.",
  },
  "select-name": {
    plain: "Ein Auswahlfeld ohne Beschriftung",
    found: (n) =>
      `${n} ${n === 1 ? "Auswahlfeld hat" : "Auswahlfelder haben"} im Code keine Beschriftung. ${n === 1 ? "Es wird" : "Jedes wird"} als Liste von Optionen angesagt, ohne zu sagen, was hier gewählt wird.`,
    impact: "Niemand weiß, was da gewählt wird. Fehler und abgebrochene Formulare sind die Folge.",
  },
  "document-title": {
    plain: "Die Seite hat keinen Titel",
    found: () =>
      `Die Seite hat keinen Titel. Browser-Tab und Screenreader greifen deshalb beide auf die Adresse zurück.`,
    impact: "Tabs, Lesezeichen und Suchergebnisse zeigen nichts Brauchbares.",
  },
  "html-has-lang": {
    research: "Eine fehlende Sprachangabe ist einer der wenigen Fehler, die WebAIM auf der Mehrheit des Web findet. Er bleibt häufig, weil er lautlos ist: Die Seite sieht richtig aus, und nur wer sie in der falschen Stimme hört, merkt etwas.",
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
      `Die Überschriftenebenen springen, statt Stufe für Stufe zu gehen. An ${n} ${n === 1 ? "Stelle" : "Stellen"} fehlt eine Ebene — auf ein h2 folgt direkt ein h4, oder Ähnliches.`,
    impact: "Die meisten Screenreader-Nutzer navigieren über Überschriften. Sie verlieren den Faden.",
  },
  "page-has-heading-one": {
    plain: "Keine Hauptüberschrift",
    found: () =>
      `Die Seite hat keine oberste Überschrift. Nichts benennt also, worum es hier geht.`,
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
      `${n} ${n === 1 ? "Link im Fließtext ist" : "Links im Fließtext sind"} nur durch Farbe gekennzeichnet, ohne Unterstreichung. Wer diese Farben nicht auseinanderhält, sieht dort keinen Link.`,
    impact: "Farbenblinde Leser unterscheiden den Link nicht von gewöhnlichem Text.",
  },
  "meta-viewport": {
    plain: "Zoomen ist gesperrt",
    found: () => `Die Seite sperrt das Zoomen. Wer sie auf dem Handy vergrößern muss, kann es nicht.`,
    impact: "Wer größere Schrift braucht, bekommt sie nicht. Auf dem Handy geht man dann einfach weg.",
  },
  "meta-viewport-large": {
    plain: "Zoomen ist gedeckelt",
    found: () =>
      `Zoomen geht, aber die Seite deckelt es unter 500%, und wer die stärkste Vergrößerung braucht, kommt nicht über den Deckel hinaus.`,
    impact: "Milder, als das Zoomen ganz zu sperren, und es trifft dieselben Menschen. Wer sehr große Schrift braucht, kommt bis zum Deckel und keinen Schritt weiter.",
  },
  "frame-title": {
    plain: "Ein eingebetteter Rahmen ohne Titel",
    found: (n) =>
      `${n} ${n === 1 ? "eingebetteter Rahmen hat keinen Titel und wird nur als „Frame“ angesagt." : "eingebettete Rahmen haben keinen Titel und werden nur als „Frame“ angesagt."}`,
    impact: "Wer einen Screenreader nutzt, erfährt weder, was darin steckt, noch ob es die Zeit wert ist.",
  },
  "duplicate-id-active": {
    plain: "Zwei Bedienelemente teilen sich eine id",
    found: (n) =>
      `${n} ${n === 1 ? "id wird" : "ids werden"} bei Bedienelementen mehrfach verwendet. Beschriftungen und Verweise können deshalb auf das falsche Element zeigen.`,
    impact: "Screenreader kommen durcheinander, und beim Klick reagiert das Falsche.",
  },
  list: {
    plain: "Eine Liste, die im Code keine ist",
    found: (n) =>
      `${n} ${n === 1 ? "Liste enthält" : "Listen enthalten"} etwas anderes als Listeneinträge. Die Gruppierung gibt es auf dem Bildschirm, aber nicht im Code.`,
    impact: "Wer einen Screenreader nutzt, hört nicht, wie viele Einträge es gibt, und kann nicht durchspringen.",
  },
  listitem: {
    plain: "Listeneinträge ohne Liste",
    found: (n) =>
      `${n} ${n === 1 ? "Listeneintrag steht" : "Listeneinträge stehen"} außerhalb jeder Liste. Ein Screenreader sagt nie an, wie viele es sind oder wo die Gruppe beginnt.`,
    impact: "Die Gruppierung geht verloren, und der Inhalt ergibt keinen Sinn mehr.",
  },
  "aria-required-attr": {
    plain: "Einem Bedienelement fehlt sein Zustand",
    found: (n) =>
      `${n} ${n === 1 ? "Bedienelement ist" : "Bedienelemente sind"} als etwas ausgezeichnet, das einen Zustand hat: angehakt, aufgeklappt, ein Wert auf einer Skala. ${n === 1 ? "Es sagt nie" : "Keines davon sagt"}, welcher Zustand das ist.`,
    impact: "Wer einen Screenreader nutzt, erfährt weder den Zustand noch, wie sich das Element bedienen lässt.",
  },
  "aria-hidden-focus": {
    plain: "Verstecktes fängt trotzdem den Tastaturfokus",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist" : "Elemente sind"} vor Screenreadern versteckt und trotzdem mit der Tastatur erreichbar. Der Fokus landet dort, wo nichts angesagt wird.`,
    impact: "Wer sich durchtabbt, landet auf etwas, das der Screenreader nicht vorliest. Die Seite wirkt kaputt.",
  },
  "aria-dialog-name": {
    plain: "Ein Pop-up ohne Namen",
    found: (n) =>
      `${n} ${n === 1 ? "Pop-up trägt nichts, was es benennt. Es wird als „Dialog“ angesagt und sonst nichts." : "Pop-ups tragen nichts, was sie benennt. Sie werden als „Dialog“ angesagt und sonst nichts."}`,
    impact: "Angesagt wird „Dialog“ und sonst nichts. Etwas hat den Bildschirm übernommen, und es gibt keine Möglichkeit zu hören, was.",
  },
  "nested-interactive": {
    plain: "Ein Bedienelement im anderen",
    found: (n) =>
      `${n} ${n === 1 ? "Bedienelement enthält ein weiteres Bedienelement." : "Bedienelemente enthalten jeweils ein weiteres Bedienelement."} Was wie eine Sache zum Klicken aussieht, sind zwei ineinander.`,
    impact: "Screenreader sagen das äußere an und verbergen das innere, das damit unerreichbar wird. Welches von beiden ein Klick oder ein Tastendruck auslöst, weiß niemand.",
  },
  "presentation-role-conflict": {
    plain: "Ein echtes Bedienelement gilt als Schmuck",
    found: (n) =>
      `${n} ${n === 1 ? "Element ist als zu ignorieren gekennzeichnet und bleibt trotzdem erreichbar und bedienbar. Der Code widerspricht sich selbst darüber, ob es existiert." : "Elemente sind als zu ignorieren gekennzeichnet und bleiben trotzdem erreichbar und bedienbar. Der Code widerspricht sich selbst darüber, ob es sie gibt."}`,
    impact: "Der Code sagt: ignorieren. Das Element sagt: benutzen. Screenreader lösen das unterschiedlich auf, und manche finden es deshalb nie.",
  },
  region: {
    plain: "Seitenbereiche ohne Namen im Code",
    found: (n) =>
      `Ein Teil dieser Seite steht außerhalb jedes benannten Bereichs. ${n} ${n === 1 ? "Inhaltsblock hat" : "Inhaltsblöcke haben"} weder Kopf noch Navigation, Hauptinhalt oder Fuß um sich herum.`,
    impact: "Wer einen Screenreader nutzt, kann nichts überspringen. Man hört jedes Mal alles.",
  },
  "landmark-one-main": {
    plain: "Nichts kennzeichnet den Hauptinhalt",
    found: () =>
      `Die Seite hat keinen Hauptbereich, der markiert, wo der Inhalt beginnt. Es gibt also nichts, wohin man springen könnte.`,
    impact: "Wer einen Screenreader nutzt, hört auf jeder einzelnen Seite das ganze Menü ab.",
  },
  tabindex: {
    plain: "Die Tab-Reihenfolge springt",
    found: (n) =>
      `${n} ${n === 1 ? "Element benutzt" : "Elemente benutzen"} einen positiven tabindex. Das zwingt ${n === 1 ? "es" : "sie"} an den Anfang der Tab-Reihenfolge, egal wo auf der Seite ${n === 1 ? "es steht" : "sie stehen"}.`,
    impact: "Wer keine Maus benutzen kann, wird auf der Seite hin und her geworfen.",
  },
  "scrollable-region-focusable": {
    plain: "Scrollbereich für die Tastatur unerreichbar",
    found: (n) =>
      `${n} ${n === 1 ? "Bereich lässt sich scrollen, ist mit der Tastatur aber nicht erreichbar." : "Bereiche lassen sich scrollen, sind mit der Tastatur aber nicht erreichbar."} Was aus dem Blick gescrollt ist, bleibt ohne Maus unerreichbar.`,
    impact: "Ohne Maus kommt man an den Inhalt darin nicht heran.",
  },

  "keyboard-mouse-only": {
    research: "Jahrzehnte an Usability-Forschung, vieles davon von der Nielsen Norman Group, kommen immer wieder zum selben Schluss. Tastaturbedienung nützt geübten Nutzern genauso wie Menschen, die keine Maus halten können.",
    plain: "Ein Bedienelement, das die Tastatur nicht erreicht",
    impact: "Hier gibt es keinen Umweg. Wer keine Maus benutzen kann, kann nicht tun, was dieses Element tut. Ist es der Kaufen-Knopf oder ein Formularschritt, endet der Besuch hier.",
  },
  "keyboard-no-visible-focus": {
    plain: "Nichts zeigt, wo die Tastatur steht",
    impact: "Viele Menschen fassen nie eine Maus an. Ohne sichtbare Markierung navigieren sie blind, und sie geben auf.",
  },
  "readability-dense-prose": {
    plain: "Der Text verlangt Lesen auf Hochschulniveau",
    impact: "Keine gesetzliche Pflicht, und trotzdem die Änderung mit der größten Wirkung in diesem Bericht. Sie hilft Menschen mit kognitiven Einschränkungen und allen, die in einer zweiten Sprache lesen. GOV.UK schreibt für ein Lesealter von etwa neun Jahren, und das ist keine einfache Website.",
  },
  "typo-leading-for-measure": {
    plain: "Zeilen stehen zu eng übereinander",
    impact: "Das Auge gleitet nicht über eine Zeile, es springt. Der schwerste Sprung geht zurück an den Anfang der nächsten. Je länger die Zeile, desto leichter landet man in der falschen.",
  },
  "reading-order-mismatch": {
    plain: "Tab-Reihenfolge widerspricht dem Sichtbaren",
    impact: "Die Seite hat Dinge auf dem Bildschirm verschoben, im eigenen Code aber nicht, und die Tab-Taste folgt dem Code. Bei einem Paar wie Abbrechen und Senden ist der Knopf unter dem Zeiger nicht der, auf dem die Tastatur steht.",
  },

  "forced-colors-focus-lost": {
    plain: "Fokusmarkierung verschwindet im hohen Kontrast",
    impact: "Der Modus für hohen Kontrast entfernt die Schatten und Farben, mit denen die meisten Fokusmarkierungen gezeichnet sind. Wer am dringendsten sehen muss, wo er steht, sieht nichts – auf einer Seite, die bis dahin perfekt aussieht.",
  },
  "forced-colors-icon-lost": {
    plain: "Symbol-Schaltfläche verschwindet im hohen Kontrast",
    impact: "Das Symbol ist ein Hintergrundbild, und dieser Modus entfernt Hintergrundbilder. Die Schaltfläche funktioniert weiter, erscheint aber als leerer Kasten: kein Bild, keine Beschriftung, kein Hinweis, dass es eine Schaltfläche ist.",
  },
  "keyboard-faint-focus": {
    plain: "Tastaturmarkierung zu blass zum Sehen",
    impact: "Die Tab-Taste bewegt einen unsichtbaren Zeiger, und nur der Rahmen zeigt, wo er angekommen ist. Ist er zu blass, weiß man an der Tastatur nicht, was man gleich auslöst. Beim Testen rutscht das durch, weil ja wirklich ein Rahmen da ist.",
  },
  "keyboard-focus-trap": {
    plain: "Der Tastaturfokus bleibt hängen",
    impact: "Wer mit der Tastatur bis hierher kommt, kommt nicht weiter. Einer der schlimmsten Fehler, die eine Website haben kann.",
  },

  "component-form-autocomplete": {
    plain: "Formularfelder blockieren das Ausfüllen",
    impact: "Alle tippen Name, E-Mail und Adresse wieder von Hand. Langsam für alle, für manche eine echte Hürde.",
  },
  "component-input-type": {
    plain: "Normale Felder für E-Mail und Telefon",
    impact: "Auf dem Handy erscheint die gewöhnliche Tastatur statt einer mit „@“ oder einem Ziffernblock. Mehr Tipper, mehr Fehler.",
  },
  "component-required-cue": {
    plain: "Pflichtfelder sind nicht sichtbar markiert",
    impact: "Niemand erfährt, dass ein Feld Pflicht war, bis das Formular ablehnt. Anmeldungen scheitern.",
  },
  "component-submit-clarity": {
    plain: "Kein klar beschrifteter Absenden-Knopf",
    impact: "Ein Knopf, auf dem nur „Los“ steht, der nur ein Symbol zeigt oder ganz fehlt: Leute wissen nicht, wie sie fertig werden. Also werden sie es nicht.",
  },
  "component-nav-labels": {
    plain: "Mehrere Menüs, keines benannt",
    impact: "Im Screenreader hört man „Navigation … Navigation …“, ohne das Hauptmenü von den Links in der Fußzeile unterscheiden zu können. Der Weg durch Ihre Website wird zum Raten.",
  },
  "component-skip-link": {
    plain: "Kein Link „Zum Inhalt springen“",
    impact: "An der Tastatur tabbt man auf jeder Seite durch Ihr komplettes Menü. Dutzende zusätzliche Tastendrücke pro Besuch.",
  },

  "mobile-target-spacing": {
    plain: "Tippziele liegen zu dicht beieinander",
    found: (n) =>
      `${n} ${n === 1 ? "Paar von Bedienelementen liegt" : "Paare von Bedienelementen liegen"} in Handy-Breite weniger als 8px auseinander. Einzeln ist jedes groß genug; zusammen lassen sie keinen Platz zum Danebentippen.`,
    impact: "Ein Daumen ist kein Mauszeiger. Ein Finger, der ein Element anpeilt und beim Nachbarn landet, tippt oder kauft das Falsche. Menschen mit Zittern oder größeren Fingern trifft es zuerst.",
  },
  "consent-blocks-reader": {
    plain: "Das Cookie-Banner blockiert Screenreader",
    found: () =>
      `Die Zustimmungsebene markiert die ganze Seite dahinter als für Screenreader versteckt, und der Tastaturfokus landet nie in der Ebene selbst.`,
    impact: "Wer einen Screenreader nutzt, hört Stille, wo die Seite sein sollte. Man kann die Seite nicht lesen und findet das Banner nicht, um es wegzuräumen.",
  },
  "mobile-sticky-coverage": {
    plain: "Fixierte Leisten füllen den Handy-Bildschirm",
    found: () =>
      `Fixierte Kopfzeilen, Banner oder Werkzeugleisten belegen in Handy-Breite mehr als ein Drittel des Bildschirms.`,
    impact: "Jedes fixierte Pixel ist eines, durch das niemand die Seite lesen kann. Was die Tastatur fokussiert, kann hinter den Leisten verschwinden. WCAG 2.2 macht genau das schon zur Pflicht; das Gesetz verweist nur noch nicht darauf.",
  },
  "mobile-horizontal-scroll": {
    plain: "Die Seite scrollt auf dem Handy seitwärts",
    impact: "Die meisten Besucher sind am Handy. Für jede Zeile seitwärts wischen zu müssen, treibt sie weg.",
  },
  "mobile-tap-target": {
    plain: "Tippziele zu klein",
    impact: "Tipper gehen daneben, und der Ärger wächst. Am schlimmsten bei größeren Fingern, Zittern oder unruhigen Händen. Das kostet Sie Umsatz.",
  },

  "text-spacing-clipped": {
    plain: "Text wird bei größeren Abständen abgeschnitten",
    impact: "Viele Menschen mit Legasthenie vergrößern die Abstände, um überhaupt lesen zu können. Hier fließt der Text nicht neu um. Die Wörter verschwinden hinter einem festen Kasten.",
  },
  "text-zoom-clipped": {
    plain: "Text wird bei größerer Schrift abgeschnitten",
    impact: "Größere Schrift ist das häufigste Mittel bei schwachen Augen, viel häufiger als ein Screenreader. Ihre Kästen bleiben, wie sie sind, und die Wörter verschwinden.",
  },
  "text-zoom-horizontal-scroll": {
    plain: "Vergrößerter Text scrollt seitwärts",
    impact: "Jede Zeile zwingt zum Wischen zur Seite. Das ist anstrengend, und die meisten geben auf.",
  },

  "dark-consent-no-reject": {
    plain: "Cookie-Banner ohne Ablehnen",
    impact: "Nach der DSGVO muss Ablehnen so leicht sein wie Zustimmen. So eingeholte Einwilligungen können ungültig sein. Ein fehlender „Ablehnen“-Knopf wirkt auf Besucher wie ein Trick.",
  },
  "dark-consent-asymmetry": {
    plain: "Cookie-Banner drängt „Ablehnen“ zurück",
    impact: "Eine Option als Knopf, die andere als bloßer Text – das drängt zum Zustimmen. Aufsichtsbehörden achten darauf.",
  },
  "dark-preselected-optin": {
    plain: "Werbe-Häkchen ist schon gesetzt",
    impact: "Nach der DSGVO ist ein vorangehaktes Kästchen keine Einwilligung. Wer es übersieht, fühlt sich angemeldet, ohne zugestimmt zu haben.",
  },
  "dark-confirmshaming": {
    plain: "„Nein danke“ ist beschämend formuliert",
    impact: "„Nein danke, ich möchte kein Geld sparen“ bleibt aus den falschen Gründen im Kopf. Es liest sich als Manipulation.",
  },
  "dark-fake-scarcity": {
    plain: "Knappheit, die zu prüfen wäre",
    impact: "Behörden gehen gegen erfundene Knappheit vor. Käufer haben gelernt, ihr zu misstrauen. Erfundene Zahlen kosten mehr Verkäufe, als sie bringen.",
  },
  "dark-fake-urgency": {
    plain: "Zeitdruck, der zu prüfen wäre",
    impact: "Countdowns, die beim Neuladen wieder von vorn beginnen, sind eine irreführende Praxis. Ist das einmal aufgefallen, glaubt niemand mehr, was Sie sonst behaupten.",
  },

  "dialog-close-unlabeled": {
    plain: "Schließen-Knopf ohne Beschriftung",
    impact: "Im Screenreader hört man nur „Schaltfläche“ und erfährt nicht, wie sich das Pop-up schließen lässt. Das hält Leute fest, und viele verlassen Ihre Website einfach.",
  },
  "dialog-keyboard-trap": {
    plain: "Ein Pop-up hält die Tastatur fest",
    impact: "Wer nur die Tastatur nutzt, kommt an diesem Pop-up nicht vorbei. Escape schließt es nicht, und Tab dreht sich nur darin im Kreis. Nur das Schließen des Tabs führt hinaus. Bei einem Cookie-Banner passiert das, bevor man überhaupt etwas gesehen hat.",
  },
  "dialog-no-escape": {
    plain: "Pop-up ignoriert die Escape-Taste",
    impact: "Escape ist die Taste, nach der alle zuerst greifen. Festhängen kann hier niemand, denn man kann weitertabben. Aber alle an der Tastatur probieren es, und nichts passiert.",
  },
  "dialog-focus-not-moved": {
    plain: "Das Pop-up bekommt den Fokus nie",
    impact: "Wer einen Screenreader nutzt, erfährt nie, dass es sich geöffnet hat. An der Tastatur muss man erst durch die ganze Seite darunter tabben. Erst dann erreicht man, was den Bildschirm nun bedeckt.",
  },
  "dialog-focus-lost-on-close": {
    plain: "Beim Schließen geht die Stelle verloren",
    impact: "Wer sich bis zur Mitte durchgetabbt hatte, muss wieder ganz von vorn anfangen.",
  },
  "dialog-no-close": {
    plain: "Kein sichtbarer Schließen-Knopf",
    impact: "Wenn der Klick daneben der einzige Ausweg ist, hängen Tastaturnutzer dahinter fest.",
  },
  "dialog-missing-role": {
    plain: "Einblendung nicht als Dialog gekennzeichnet",
    impact: "Screenreader sagen nicht an, dass sie sich geöffnet hat, und man tabbt direkt in die verdeckte Seite dahinter.",
  },
  "dialog-missing-name": {
    plain: "Das Pop-up sagt nicht, wozu es da ist",
    impact: "Beim Öffnen sagt ein Screenreader nur „Dialog“. Der Besucher weiß nicht, was gefragt wird und warum.",
  },

  "markup-validation": {
    plain: "Fehler im Code der Seite",
    impact: "Browser raten stillschweigend, wie sie das reparieren, und jeder rät anders. Ihre Seite funktioniert vielleicht nicht so, wie Sie denken.",
  },

  "motion-marquee": {
    plain: "Laufschrift ohne Pause",
    impact: "Bewegter Text ist für alle schwer zu lesen. Mit Problemen bei Aufmerksamkeit oder Gleichgewicht ist er unbrauchbar.",
  },
  "motion-autoplay-media": {
    plain: "Medien starten von selbst",
    impact: "Niemand kann es stoppen. Das verwirrt, und es übertönt Screenreader.",
  },
  "motion-infinite-no-reduced-motion": {
    plain: "Animation ignoriert die Einstellung für weniger Bewegung",
    impact: "Dauernde Bewegung zieht die Aufmerksamkeit von Ihrem Inhalt ab. Bei Gleichgewichtsstörungen kann sie Schwindel oder Übelkeit auslösen.",
  },

  "typo-caps-letterspacing": {
    plain: "Großbuchstaben ohne zusätzlichen Abstand",
    impact: "Großbuchstaben bilden gleichförmige Blöcke. Ohne etwas mehr Abstand dazwischen werden Überschriften und Beschriftungen schwer zu überfliegen.",
  },
  "typo-lowercase-letterspaced": {
    plain: "Zusätzlicher Abstand zwischen den Buchstaben",
    impact: "Zusätzlicher Abstand zwischen Kleinbuchstaben zerbricht die Wortbilder, die wir erkennen, und das bremst alle.",
  },
  "typo-negative-letterspacing": {
    plain: "Buchstaben berühren sich vor Enge",
    impact: "Gequetschte Buchstaben verschwimmen ineinander. Besonders in kleinen Größen und bei schwachem Sehvermögen.",
  },
  "typo-line-length-long": {
    plain: "Zeilen sind zu lang",
    impact: "Ab etwa 75 Zeichen pro Zeile verliert das Auge beim Zurückspringen die Stelle.",
  },
  "typo-line-length-short": {
    plain: "Zeilen sind zu kurz abgehackt",
    impact: "Wenn fast jede Wortgruppe in eine neue Zeile rutscht, zerfällt der Lesefluss. Der Inhalt wirkt schwerer, als er ist.",
  },
  "typo-justified-no-hyphens": {
    plain: "Blocksatz ohne Silbentrennung",
    impact: "Blocksatz dehnt die Wortabstände, damit jede Zeile voll wird. Die ungleichen Lücken bilden störende weiße „Flüsse“, die die Seite hinunterlaufen.",
  },
  "typo-font-size-small": {
    plain: "Fließtext sehr klein gesetzt",
    impact: "Kleine Schrift vertreibt alle, die am Handy, bei schlechtem Licht oder mit nicht perfekten Augen lesen.",
  },
  "typo-typeface-count": {
    plain: "Zu viele Schriftarten",
    impact: "Mehr als zwei oder drei Schriftarten wirken unruhig und lassen die Seite weniger vertrauenswürdig erscheinen.",
  },

  "typo-underline-nonlink": {
    plain: "Unterstrichener Text, der kein Link ist",
    impact: "Unterstreichungen wirken wie Links, also klicken Leute auf Text, der nirgendwohin führt.",
  },
  "typo-italic-body": {
    plain: "Ganze Absätze in Kursiv",
    impact: "Schräge Buchstaben werden nach ein paar Wörtern anstrengend. Mit Legasthenie oder schwachen Augen eine echte Hürde.",
  },
  "typo-allcaps-block": {
    plain: "Lange Passagen in GROSSBUCHSTABEN",
    impact: "Großbuchstaben nehmen die Wortbilder weg, an denen wir uns beim Lesen orientieren. Langsam und ermüdend, am schlimmsten bei Legasthenie.",
  },
  "typo-thin-weight": {
    plain: "Fließtext in sehr dünner Schrift",
    impact: "Dünne Striche verblassen auf billigen Bildschirmen, in der Sonne und bei schwachen Augen. Auch dann, wenn der Kontrast reicht.",
  },
};

export const FIXES_DE: Record<string, string | string[]> = {
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
  "aria-required-parent": [
    "Setzen Sie jeden Teil zurück in das Bedienelement, zu dem er gehört.",
    "Ein Menüpunkt für sich allein wird nie als Teil eines Menüs angesagt.",
  ],
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
  "component-form-autocomplete": "Kennzeichnen Sie jedes Feld mit dem, was es erfasst, damit Browser und Passwortmanager es ausfüllen können.",
  "component-input-type": [
    "Sagen Sie der Seite, welche Felder eine E-Mail-Adresse, eine Telefonnummer oder ein Datum enthalten.",
    "Handys zeigen dann die passende Tastatur statt einer einfachen.",
  ],
  "component-required-cue": [
    "Markieren Sie Pflichtfelder sichtbar, nicht nur im Code.",
    "Das Wort „Pflichtfeld“ neben der Beschriftung reicht.",
  ],
  "component-submit-clarity": "Geben Sie dem Formular einen klar beschrifteten Knopf, der sagt, was er tut, etwa „Anfrage senden“.",
  "component-nav-labels": [
    "Benennen Sie jedes Menü nach dem, was darin steht, etwa „Hauptmenü“ oder „Links in der Fußzeile“.",
    "Mehrere unbenannte Menüs werden gleich angesagt, also kann sie niemand unterscheiden.",
  ],
  "component-skip-link": [
    "Setzen Sie ganz oben einen Link, der direkt zum Hauptinhalt springt.",
    "Zeigen Sie ihn, sobald er den Tastaturfokus bekommt, damit die Leute von ihm wissen.",
  ],
  "mobile-target-spacing": "Lassen Sie etwas Platz zwischen Knöpfen und Links, damit ein Daumen nicht zwei auf einmal trifft.",
  "consent-blocks-reader": [
    "Setzen Sie den Tastaturfokus in das Banner, sobald es erscheint.",
    "Halten Sie ihn dort, bis eine Wahl getroffen ist — erst das macht es richtig, die Seite dahinter zu verstecken.",
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
  "text-zoom-horizontal-scroll": [
    "Lassen Sie die Seite umbrechen, wenn der Text größer wird, statt seitlich hinauszulaufen.",
    "Genau das erspart es, eine Zeile Wort für Wort seitwärts zu scrollen.",
  ],
  "dark-consent-no-reject": "Geben Sie dem Cookie-Banner eine Ablehnen-Option, die so leicht zu finden ist wie das Zustimmen.",
  "dark-consent-asymmetry": [
    "Geben Sie Zustimmen und Ablehnen dieselbe Größe, denselben Stil und dasselbe Gewicht.",
    "Die Wahl ist erst echt, wenn beide Optionen gleich verfügbar aussehen.",
  ],
  "dark-preselected-optin": [
    "Lassen Sie Häkchen für Werbung und Weitergabe leer.",
    "Lassen Sie die Leute selbst zustimmen, statt sie sich abmelden zu lassen.",
  ],
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
  "dialog-no-escape": [
    "Lassen Sie die Escape-Taste das Pop-up schließen.",
    "Es ist die erste Taste, nach der die Leute greifen.",
  ],
  "dialog-focus-not-moved": "Setzen Sie den Fokus beim Öffnen in das Pop-up, damit Tastaturnutzer darin beginnen.",
  "dialog-focus-lost-on-close": [
    "Setzen Sie den Fokus beim Schließen zurück auf das, was das Pop-up geöffnet hat.",
    "Sonst landen die Leute wieder ganz oben und müssen ihre Stelle neu suchen.",
  ],
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
  "markup-validation": [
    "Schicken Sie die Seite durch den W3C-Validator und beheben Sie, was er meldet.",
    "Kaputtes Markup ist für Screenreader Raterei, und sie raten unterschiedlich.",
  ],
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
  "typo-lowercase-letterspaced": [
    "Nehmen Sie den zusätzlichen Buchstabenabstand aus gewöhnlichem Text.",
    "Er zieht Wörter auseinander und bremst das Lesen.",
  ],
  "typo-negative-letterspacing": [
    "Quetschen Sie die Buchstaben nicht mehr zusammen.",
    "Buchstaben, die sich berühren, werden als eine Form gelesen.",
  ],
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
    "Nutzen Sie fett oder kursiv, wo Sie betonen wollen.",
  ],
  "typo-italic-body": [
    "Setzen Sie lange Passagen aufrecht und halten Sie Kursives auf einzelne Wortgruppen begrenzt.",
    "Kursives ist auf Länge schwerer zu lesen, besonders am Bildschirm.",
  ],
  "typo-allcaps-block": [
    "Setzen Sie lange Passagen in gewöhnlicher Groß- und Kleinschreibung.",
    "Großbuchstaben nehmen die Wortbilder weg, an denen wir lesen, also bleiben sie kurzen Beschriftungen vorbehalten.",
  ],
  "typo-thin-weight": [
    "Setzen Sie den Fließtext in einem normalen Schriftschnitt.",
    "Sehr dünne Schnitte verschwinden auf gewöhnlichen Bildschirmen und bei hellem Licht.",
  ],

  "aria-allowed-role": [
    "Nehmen Sie ein Element, das wirklich das ist, was es zu sein behauptet.",
    "Einen Knopf für einen Knopf, einen Navigationsblock für die Navigation.",
  ],
  "aria-allowed-attr": "Entfernen Sie die Angaben, die zu dieser Art von Element nicht gehören. Oder wechseln Sie zu einem, zu dem sie passen.",
  "aria-required-children": [
    "Geben Sie dem Element die Teile, die sein Typ verlangt.",
    "Eine Liste braucht Listeneinträge darin, keinen losen Text.",
  ],
  "landmark-unique": [
    "Benennen Sie jeden Bereich nach dem, was darin steht, etwa „Hauptmenü“ oder „Links in der Fußzeile“.",
    "Bereiche mit gleichem Namen werden gleich angesagt, also kann sie niemand unterscheiden.",
  ],
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
  "image-redundant-alt": "Geben Sie dem Bild ein leeres alt (alt=\"\"), wenn der Text daneben schon dasselbe sagt.",
  "color-contrast": [
    "Machen Sie den Text dunkler oder das, was dahinter liegt, heller.",
    "Gewöhnlicher Text braucht ein Kontrastverhältnis von mindestens 4.5:1.",
    "Großer Text, etwa 24px oder 19px fett, braucht 3:1.",
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
  "html-lang-valid": "Korrigieren Sie die Sprachangabe der Seite auf einen echten Sprachcode, etwa Deutsch oder Englisch.",
  "heading-order": [
    "Nutzen Sie Überschriften der Reihe nach, ohne eine Ebene zu überspringen.",
    "Springen Sie nicht von der zweiten Ebene direkt auf die vierte.",
  ],
  "page-has-heading-one": "Setzen Sie oben eine <h1>, die sagt, worum es auf der Seite geht.",
  "empty-heading": "Setzen Sie Text in die Überschrift oder entfernen Sie das leere Überschriften-Tag.",
  "link-in-text-block": "Geben Sie Links im Text ein zweites sichtbares Merkmal neben der Farbe, meist eine Unterstreichung.",
  "meta-viewport": "Entfernen Sie die Einstellung, die das Zoomen sperrt, damit die Seite auf jede nötige Größe wachsen kann.",
  "frame-title": "Geben Sie jedem eingebetteten Rahmen einen Namen, der sagt, was darin steckt, etwa „Anfahrtskarte“.",
  "duplicate-id-active": "Machen Sie jede id auf der Seite eindeutig. Keine zwei Elemente sollten sich eine teilen.",
  list: [
    "Zeichnen Sie echte Listen als Listen aus, mit jedem Eintrag in derselben Liste.",
    "Screenreader sagen dann an, wie viele Einträge es gibt.",
  ],
  listitem: "Setzen Sie jeden Listeneintrag in eine Liste, statt ihn allein stehen zu lassen.",
  "aria-required-attr": [
    "Ergänzen Sie die Attribute, die der Typ dieses Elements verlangt.",
    "Der Link „Mehr zu diesem Problem erfahren“ nennt die genaue Liste.",
  ],
  "aria-hidden-focus": [
    "Was vor Screenreadern versteckt ist, sollte auch mit der Tastatur nicht erreichbar sein.",
    "Machen Sie es entweder sichtbar oder nehmen Sie es zusätzlich aus der Tab-Reihenfolge.",
  ],
  region: [
    "Setzen Sie jeden Teil der Seite in einen benannten Bereich: Kopf, Navigation, Hauptinhalt, Fuß.",
    "Inhalt außerhalb davon wird übersprungen, wenn jemand zwischen Abschnitten springt.",
  ],
  "landmark-one-main": "Kennzeichnen Sie den Hauptinhalt der Seite als Hauptbereich, und nutzen Sie nur einen pro Seite.",
  tabindex: 'Entfernen Sie positive tabindex-Werte (tabindex="1" oder höher) und lassen Sie die natürliche Reihenfolge der Seite den Fokus bestimmen.',
  "scrollable-region-focusable": 'Ergänzen Sie tabindex="0" am scrollbaren Container, damit Tastaturnutzer darin scrollen können.',
};

export const UNDECIDED_DE: Record<string, { what: string; ask: string }> = {
  "color-contrast": {
    what: "Text auf einem Foto, einem Video oder einem Farbverlauf. Die Prüfung kann die Farbe des Textes lesen. Dahinter liegt aber keine einzelne Farbe zum Messen, und geraten wird nicht.",
    ask: "Bitten Sie Ihren Designer, jede Stelle gegen das Bild dahinter zu prüfen. Einmal an der hellsten Stelle des Bildes, einmal an der dunkelsten. Wo die Wörter untergehen, brauchen sie eine feste Fläche dahinter, einen dunklen Schleier über dem Bild oder eine andere Position.",
  },
  "link-in-text-block": {
    what: "Links in einem Absatz, die möglicherweise nur durch ihre Farbe gekennzeichnet sind. Die Prüfung kann nicht sagen, ob der Unterschied für sich allein stark genug ist.",
    ask: "Fragen Sie Ihren Designer, ob diese Links ohne die Farbe noch zu finden sind. Ist die Farbe das Einzige, was sie kennzeichnet, brauchen sie eine Unterstreichung oder ein anderes sichtbares Merkmal.",
  },
  "video-caption": {
    what: "Ein Video, das die Prüfung sehen, aber nicht anschauen kann. Sie kann nicht feststellen, ob Untertitel da sind oder ob sie etwas taugen.",
    ask: "Fragen Sie die Person, die das Video gemacht hat, ob es Untertitel hat und ob ein Mensch sie korrigiert hat. Automatisch erzeugte Untertitel allein zählen nicht.",
  },
  "media-video-captions": {
    what: "Video auf der Seite ohne Untertiteldatei. Das ist kein Beweis, dass eine nötig wäre: Ein stummer Clip braucht keine, und fest ins Bild gebrannte Untertitel zählen, hinterlassen aber keine Datei.",
    ask: "Fragen Sie bei jedem Video die Person, die es gemacht hat, ob darin gesprochen wird. Wenn ja, braucht es Untertitel, von einem Menschen korrigiert. Automatisch erzeugte Untertitel allein zählen nicht.",
  },
  "media-video-descriptions": {
    what: "Video mit Untertiteln, aber ohne Beschreibung dessen, was zu sehen ist. Untertitel tragen die Wörter; das Bild tragen sie nicht.",
    ask: "Fragen Sie, ob in diesen Videos etwas gezeigt statt gesagt wird – ein Diagramm, eine Vorführung, Text im Bild. Wenn ja, muss der Ton es selbst beschreiben. Eine schriftliche Fassung auf der Seite deckt nur die unterste Stufe des Standards ab.",
  },
  "form-error-association": {
    what: "Fehlermeldungen im Formular, die im Code nicht mit ihrem Feld verbunden sind. Ein Screenreader sagt das Feld an, aber nicht den Fehler daneben.",
    ask: "Bitten Sie Ihren Entwickler, jede Meldung mit aria-describedby an ihr Feld zu binden. Dann hört man das Problem im selben Moment wie das Feld.",
  },
  "media-audio-transcript": {
    what: "Ton auf der Seite. Ein Transkript ist gewöhnlicher Seitentext, also kann die Prüfung nicht feststellen, ob eines vorhanden ist.",
    ask: "Prüfen Sie, ob zu jeder Aufnahme der Wortlaut auf der Seite steht, nahe beim Abspieler. Und ob dieser Text alles Gesagte abdeckt.",
  },
  "media-embedded-player": {
    what: "Video, das über den Abspieler eines anderen Anbieters läuft. Das Video liegt auf dessen Seite, also kann die Prüfung nicht hineinsehen.",
    ask: "Öffnen Sie jedes Video und schalten Sie die Untertitel ein. Fehlt die Option oder stimmen die Untertitel nicht, korrigieren Sie das dort, wo das Video liegt.",
  },
  "consent-layer-in-frame": {
    what: "Die Zustimmungsebene kommt von der Website eines anderen Anbieters, in einem Rahmen. Der Scan kann nicht hineingreifen und beurteilen, was ein Screenreader dort vorfindet.",
    ask: "Lassen Sie jemanden das Banner mit einem Screenreader ausprobieren. Fragen Sie, ob es angesagt wird, ob der Fokus dorthin gelangt und ob Ablehnen so leicht ist wie Zustimmen.",
  },
  "consent-layer-unheralded": {
    what: "Eine Cookie-Ebene, die sich nie vorstellt. Sie trägt keine Dialog-Rolle und keinen Namen, und der Tastaturfokus erreicht sie nie.",
    ask: "Lassen Sie jemanden die Seite mit einem Screenreader ausprobieren. Wird die Ebene nie angesagt, braucht sie eine Dialog-Rolle, einen Namen und den Fokus beim Öffnen.",
  },
  "consent-trap-unnamed": {
    what: "Der Tastaturfokus bleibt in der Cookie-Ebene, aber die Ebene sagt nie, was sie ist. Keine Dialog-Rolle, kein Name.",
    ask: "Bitten Sie Ihren Entwickler, die Ebene als Dialog zu kennzeichnen und zu benennen. Eine Falle ohne Beschriftung lässt Screenreader-Nutzer in etwas Namenlosem festsitzen.",
  },
  "interaction-motion-actuation": {
    what: "Die Seite reagiert darauf, dass das Handy gekippt oder geschüttelt wird. Wer sein Handy in einer Halterung hat oder zittrige Hände, kann das nicht.",
    ask: "Fragen Sie Ihren Entwickler, ob sich jede Kipp- oder Schüttelaktion auch durch Tippen auf dem Bildschirm auslösen lässt. Fragen Sie dann, ob sich die Bewegungssteuerung abschalten lässt, damit eine zitternde Hand sie nicht versehentlich auslöst.",
  },
  "interaction-gesture-listeners": {
    what: "Die Seite horcht auf Wisch- und Ziehbewegungen. Wer zittert oder den Zeiger per Sprache oder Schalter steuert, bringt so eine Bewegung vielleicht nicht zustande.",
    ask: "Fragen Sie Ihren Entwickler, ob sich jedes Wischen und Ziehen auch durch Tippen erledigen lässt. Pfeile neben einem Karussell, ein Knopf neben einem Schieberegler.",
  },
  "interaction-key-shortcuts": {
    what: "Die Seite achtet auf Tastendrücke im ganzen Fenster. Wo ein einzelner Buchstabe ein Kürzel ist, löst ihn jeder aus, der mit seinem Computer spricht.",
    ask: "Fragen Sie Ihren Entwickler, ob ein Kürzel aus einem einzelnen Buchstaben oder einer Ziffer besteht. Jedes davon muss abschaltbar oder änderbar sein oder nur gelten, solange das Element den Fokus hat.",
  },
  "interaction-unmarked-language": {
    what: "Passagen in einer anderen Schrift als der Rest der Seite, ohne Angabe, welche Sprache das ist. Ein Screenreader spricht sie falsch aus, und dann sind sie oft nicht zu verstehen.",
    ask: "Bitten Sie Ihren Entwickler, jede Passage mit ihrer Sprache zu kennzeichnen. Automatisch erkennbar ist nur ein Schriftwechsel, fragen Sie also auch nach Passagen in Sprachen mit unserer Schrift.",
  },
  "interaction-title-tooltip": {
    what: "Kurzhinweise aus dem title-Attribut. Sie erscheinen nur beim Zeigen mit der Maus, also sieht sie an Tastatur oder Touchscreen niemand. Sie lassen sich auch nicht wegklicken und verschwinden, sobald man zu ihnen hinfährt, um zu Ende zu lesen.",
    ask: "Fragen Sie Ihren Entwickler, ob darin etwas Wichtiges steckt. Wenn ja, schreiben Sie es auf die Seite oder bauen Sie einen Hinweis, der stehen bleibt und mit Escape schließt.",
  },
  "interaction-orientation-lock": {
    what: "Ein Stylesheet dreht die Seite hier zurück oder blendet sie aus, wenn das Handy gedreht wird. So sieht eine Seite aus, die auf eine Ausrichtung festgelegt ist. Es kann auch eine gewollte Querformat-Ansicht für etwas Breites sein.",
    ask: "Fragen Sie Ihren Entwickler, ob die Seite in beiden Lagen funktioniert. Wer sein Handy oder Tablet am Rollstuhl befestigt hat, kann es nicht drehen.",
  },
  "interaction-no-status-region": {
    what: "Seiten aktualisieren sich ohne Neuladen – ein Filter kürzt eine Liste, ein Formular meldet, dass es gespeichert hat. Auf dieser Seite ist keine Stelle als der Ort gekennzeichnet, an dem so eine Änderung gesprochen wird. Der Screenreader schweigt, während sich die Seite unter ihm bewegt.",
    ask: "Fragen Sie Ihren Entwickler, ob sich hier etwas ohne Neuladen ändert. Wenn ja, braucht diese Änderung einen Live-Bereich, damit sie nicht nur gezeigt, sondern auch gesprochen wird.",
  },
  "interaction-acts-on-change": {
    what: "Menüs oder Kästchen, die offenbar sofort handeln, sobald man sie setzt, statt auf einen Knopf zu warten. Wir haben das aus dem Code gelesen und nicht ausprobiert: Auf Ihrer echten Website könnte das eine echte Bestellung auslösen.",
    ask: "Fragen Sie Ihren Entwickler, ob die Wahl einer Option hier absendet oder die Seite wechselt. Wenn ja, setzen Sie einen Knopf dafür ein oder weisen Sie vor dem Element darauf hin.",
  },
  "interaction-pointer-cancellation": {
    what: "Elemente, die schon beim Drücken handeln und nicht erst beim Loslassen. Wer versehentlich auf eines kommt, kann nicht mehr wegrutschen und loslassen.",
    ask: "Bitten Sie Ihren Entwickler, diese erst beim Loslassen auszulösen. Wem die Hand verrutscht oder wer länger zielt, kann dann noch weggehen, bevor er den Finger hebt.",
  },
  "aria-valid-attr-value": {
    what: "Angaben im Code, die auf einen anderen Teil der Seite zeigen. Die Prüfung kann nicht immer feststellen, ob das Ziel wirklich da ist.",
    ask: "Lassen Sie Ihren Entwickler prüfen, ob jede id, auf die ein aria-Attribut zeigt, auf der Seite existiert. Keine davon sollte in einem Block liegen, der versteckt oder entfernt wird.",
  },
  "aria-allowed-role": {
    what: "Teile der Seite, die im Code als etwas ausgezeichnet sind, das sie vielleicht nicht sein können. Ob es falsch ist, hängt davon ab, wie sich das Element verhält.",
    ask: "Lassen Sie Ihren Entwickler prüfen, ob sich jedes so verhält, wie seine Rolle es verspricht, Tastatur eingeschlossen. Sonst lassen Sie die Rolle weg und nehmen das native Element.",
  },
  "aria-prohibited-attr": {
    what: "Ein Element trägt einen Namen, den der Code ihm vielleicht nicht lässt. Ob er bleibt, hängt von der Rolle des Elements ab.",
    ask: "Lassen Sie Ihren Entwickler prüfen, ob jedes mit dem Namen angesagt wird, den Sie gemeint haben. Wo nicht, setzen Sie den Namen auf ein Element, das einen tragen darf.",
  },
  "css-orientation-lock": {
    what: "Stile, die die Seite auf Hoch- oder Querformat festlegen könnten. Die Prüfung, die das gefunden hat, ist experimentell, deshalb ist es eine Frage und kein Befund.",
    ask: "Fragen Sie Ihren Entwickler, ob sich die Seite mit dem Gerät dreht. Manche Menschen befestigen Handy oder Tablet am Rollstuhl in einer Lage und können es nicht drehen.",
  },
  "duplicate-id-aria": {
    what: "Eine id, die möglicherweise mehrfach verwendet wird. Jede Angabe im Code, die darauf zeigt, folgt nur der ersten, also kann ein Name still am falschen Element landen.",
    ask: "Bitten Sie Ihren Entwickler, jede id auf der Seite eindeutig zu machen, beginnend mit denen, auf die ein aria-Attribut zeigt.",
  },
};

export const PRINCIPLES_DE: Record<string, { principleLabel: string; plainTitle: string; plainDescription: string }> = {
  "1": {
    principleLabel: "Wahrnehmbar",
    plainTitle: "Können Menschen es sehen und hören?",
    plainDescription: "Alles, was Menschen nicht sehen oder hören können: Text, der zu blass zum Lesen ist, Bilder ohne ein Wort dazu und Videos ohne Untertitel.",
  },
  "2": {
    principleLabel: "Bedienbar",
    plainTitle: "Können Menschen es benutzen?",
    plainDescription: "Ob jemand wirklich durch Ihre Website kommt: mit der Tastatur statt der Maus, auf dem Handy oder ohne feine Kontrolle über die Hände.",
  },
  "3": {
    principleLabel: "Verständlich",
    plainTitle: "Können Menschen ihr folgen?",
    plainDescription: "Ob Ihre Formulierungen und Ihr Aufbau Sinn ergeben und ob sich die Seite so verhält, wie man es erwartet.",
  },
  "4": {
    principleLabel: "Robust",
    plainTitle: "Wird es weiter funktionieren?",
    plainDescription: "Ob Ihre Website auch in anderen Browsern und auf anderen Geräten läuft. Und mit dem Screenreader, der sie blinden Besuchern vorliest.",
  },
};

export const LEVEL_FRAMING_DE: Partial<Record<"A" | "AA" | "AAA", string>> = {
  A: "Grundanforderung (Stufe A)",
  AA: "In den meisten Ländern gesetzlich verlangt (Stufe AA)",
  AAA: "Erweitert (Stufe AAA): eine gute Idee, nicht Pflicht und nicht gewertet",
};
