/* Deutsche Fassung der Kriterientexte. Der Rückfall erfolgt pro id. */
export const CRITERIA_DE: Record<string, { plain: string; failing: string }> = {
  // ---- Wahrnehmbar ------------------------------------------------------
  "1.1.1": {
    plain: "Haben Bilder eine Beschreibung für Menschen, die sie nicht sehen können?",
    failing: "Bildern fehlt eine Beschreibung für Menschen, die sie nicht sehen können",
  },
  "1.2.1": {
    plain: "Gibt es zu Ton und Video eine Textfassung?",
    failing: "Zu Ton und Video gibt es keine Textfassung",
  },
  "1.2.2": {
    plain: "Haben Ihre Videos Untertitel?",
    failing: "Videos laufen ohne Untertitel",
  },
  "1.2.3": {
    plain: "Sagen Videos laut, was auf dem Bildschirm zu sehen ist?",
    failing: "Videos sagen nie laut, was auf dem Bildschirm zu sehen ist",
  },
  "1.2.4": {
    plain: "Hat Live-Video auch Live-Untertitel?",
    failing: "Live-Video läuft ohne Untertitel",
  },
  "1.2.5": {
    plain: "Haben Videos eine gesprochene Beschreibung dessen, was zu sehen ist?",
    failing: "Videos haben keine gesprochene Beschreibung dessen, was zu sehen ist",
  },
  "1.3.1": {
    plain: "Gibt es Ihre Listen und Überschriften auch im Code und nicht nur im Design?",
    failing: "Listen und Überschriften sehen richtig aus, aber der Code sagt nicht, was sie sind",
  },
  "1.3.2": {
    plain: "Lesen Screenreader die Seite in einer sinnvollen Reihenfolge?",
    failing: "Screenreader lesen Teile der Seite in der falschen Reihenfolge",
  },
  "1.3.3": {
    plain: "Funktionieren Anweisungen, ohne Form, Größe oder Position zu sehen?",
    failing: "Anweisungen setzen voraus, dass man Form, Größe oder Position sieht",
  },
  "1.3.4": {
    plain: "Funktioniert die Seite auch quer gehalten?",
    failing: "Die Seite funktioniert nicht, wenn das Handy quer gehalten wird",
  },
  "1.3.5": {
    plain: "Sagen Formularfelder, wofür sie da sind, damit Browser sie ausfüllen können?",
    failing: "Formularfelder sagen nicht, wofür sie da sind, also können Browser sie nicht ausfüllen",
  },
  "1.4.1": {
    plain: "Wird etwas allein durch Farbe gezeigt?",
    failing: "Die Farbe allein trägt die Bedeutung, also entgeht sie farbenblinden Besuchern",
  },
  "1.4.2": {
    plain: "Lässt sich Ton, der von selbst startet, abschalten?",
    failing: "Ton startet von selbst und lässt sich nicht abschalten",
  },
  "1.4.3": {
    plain: "Ist der Text dunkel genug, um sich vom Hintergrund abzuheben?",
    failing: "Text ist zu blass, um sich vom Hintergrund abzuheben",
  },
  "1.4.4": {
    plain: "Bleibt Text lesbar, wenn jemand ihn vergrößert?",
    failing: "Text wird abgeschnitten, wenn jemand ihn vergrößert",
  },
  "1.4.5": {
    plain: "Ist Text echter Text und kein Bild von Text?",
    failing: "Bilder von Text verschwimmen, wenn jemand sie vergrößert",
  },
  "1.4.10": {
    plain: "Passt die Seite auf einen Handy-Bildschirm, ohne seitwärts zu scrollen?",
    failing: "Die Seite scrollt auf dem Handy seitwärts",
  },
  "1.4.11": {
    plain: "Sind Knöpfe und Symbole kräftig genug, um sie zu erkennen?",
    failing: "Knöpfe und Symbole sind zu blass, um sie zu erkennen",
  },
  "1.4.12": {
    plain: "Übersteht die Seite es, wenn jemand den Text zum Lesen auseinanderzieht?",
    failing: "Text überlappt und läuft ineinander, wenn jemand ihn zum Lesen auseinanderzieht",
  },
  "1.4.13": {
    plain: "Lassen sich Einblendungen schließen, und bleiben sie aus dem Weg?",
    failing: "Einblendungen lassen sich nicht schließen oder verdecken, was man gerade liest",
  },

  // ---- Bedienbar --------------------------------------------------------
  "2.1.1": {
    plain: "Funktioniert alles ohne Maus?",
    failing: "Teile der Seite funktionieren nur mit der Maus",
  },
  "2.1.2": {
    plain: "Kommt man mit der Tastatur immer wieder heraus?",
    failing: "An der Tastatur bleibt man hängen und kommt nicht wieder heraus",
  },
  "2.1.4": {
    plain: "Lassen sich Kürzel aus einer einzelnen Taste abschalten?",
    failing:
      "Kürzel aus einer einzelnen Taste lassen sich nicht abschalten, also lösen sie beim Sprechen versehentlich aus",
  },
  "2.2.1": {
    plain: "Lässt sich ein Zeitlimit verlängern oder abschalten?",
    failing: "Ein Zeitlimit lässt sich weder verlängern noch abschalten",
  },
  "2.2.2": {
    plain: "Lässt sich bewegter Inhalt anhalten?",
    failing: "Bewegter Inhalt lässt sich nicht anhalten",
  },
  "2.3.1": {
    plain: "Blinkt etwas schnell genug, um einen Anfall auszulösen?",
    failing: "Etwas blinkt schnell genug, um einen Anfall auszulösen",
  },
  "2.4.1": {
    plain: "Gibt es einen Weg, das Menü zu überspringen und zum Hauptinhalt zu kommen?",
    failing: "Es gibt keinen Weg, das Menü zu überspringen und zum Hauptinhalt zu kommen",
  },
  "2.4.2": {
    plain: "Sagt der Browser-Tab, was diese Seite ist?",
    failing: "Der Browser-Tab sagt nicht, was diese Seite ist",
  },
  "2.4.3": {
    plain: "Geht die Tab-Taste in der Reihenfolge durch die Seite, in der man sie liest?",
    failing: "Die Tab-Taste springt in verwirrender Reihenfolge über die Seite",
  },
  "2.4.4": {
    plain: "Sagt jeder Link, wohin er führt?",
    failing: "Links sagen nicht, wohin sie führen",
  },
  "2.4.5": {
    plain: "Gibt es mehr als einen Weg zu einer Seite?",
    failing: "Seiten lassen sich nur auf einem Weg erreichen",
  },
  "2.4.6": {
    plain: "Beschreiben Überschriften und Beschriftungen, was darunter steht?",
    failing: "Überschriften und Beschriftungen beschreiben nicht, was darunter steht",
  },
  "2.4.7": {
    plain: "Sehen Sie beim Durchtabben, wo Sie gerade sind?",
    failing: "Beim Durchtabben ist nicht zu sehen, wo man gerade ist",
  },
  "2.5.1": {
    plain: "Gibt es einen einfacheren Weg für alles, was Wischen oder Zusammenziehen verlangt?",
    failing: "Etwas geht nur durch Wischen oder Zusammenziehen",
  },
  "2.5.2": {
    plain: "Kann man nach einem Fehlgriff den Finger wegziehen und ihn rückgängig machen?",
    failing: "Ein Fehlgriff lässt sich nicht rückgängig machen, indem man den Finger wegzieht",
  },
  "2.5.3": {
    plain: "Stimmt der gesprochene Name eines Knopfes mit den Wörtern darauf überein?",
    failing: "Der gesprochene Name eines Knopfes stimmt nicht mit den Wörtern darauf überein",
  },
  "2.5.4": {
    plain: "Gibt es ein gewöhnliches Bedienelement für alles, was durch Schütteln oder Kippen geht?",
    failing: "Eine Aktion funktioniert nur durch Schütteln oder Kippen des Geräts",
  },

  // ---- Verständlich -----------------------------------------------------
  "3.1.1": {
    plain: "Sagt die Seite, in welcher Sprache sie geschrieben ist?",
    failing: "Die Seite sagt nicht, in welcher Sprache sie ist, also sprechen Screenreader sie falsch aus",
  },
  "3.1.2": {
    plain: "Sind Wörter in einer anderen Sprache als solche gekennzeichnet?",
    failing: "Wörter in einer anderen Sprache sind nicht gekennzeichnet, also werden sie falsch vorgelesen",
  },
  "3.2.1": {
    plain: "Ändert sich etwas allein dadurch, dass man mit Tab darauf kommt?",
    failing: "Mit Tab auf etwas zu kommen verändert die Seite",
  },
  "3.2.2": {
    plain: "Verändert das Ausfüllen eines Feldes die Seite unerwartet?",
    failing: "Das Ausfüllen eines Feldes verändert die Seite unerwartet",
  },
  "3.2.3": {
    plain: "Bleibt das Menü auf jeder Seite an derselben Stelle?",
    failing: "Das Menü wandert von Seite zu Seite",
  },
  "3.2.4": {
    plain: "Heißt dieselbe Sache überall gleich?",
    failing: "Dieselbe Sache heißt an verschiedenen Stellen verschieden",
  },
  "3.3.1": {
    plain: "Sagen Formularfehler, welches Feld falsch ist?",
    failing: "Formularfehler sagen nicht, welches Feld falsch ist",
  },
  "3.3.2": {
    plain: "Sagen Formularfelder, was einzutragen ist?",
    failing: "Formularfelder sagen nicht, was einzutragen ist",
  },
  "3.3.3": {
    plain: "Sagen Fehlermeldungen, wie sich das Problem beheben lässt?",
    failing: "Fehlermeldungen sagen nicht, wie sich das Problem beheben lässt",
  },
  "3.3.4": {
    plain: "Lassen sich wichtige Eingaben prüfen oder rückgängig machen?",
    failing: "Wichtige Eingaben lassen sich weder prüfen noch rückgängig machen",
  },

  // ---- Robust -----------------------------------------------------------
  "4.1.1": {
    plain: "Ist der Code der Seite frei von Fehlern, die Screenreader verwirren?",
    failing: "Der Code der Seite hat Fehler, die Screenreader verwirren können",
  },
  "4.1.2": {
    plain: "Sagen Knöpfe und Menüs den Screenreadern, was sie sind?",
    failing: "Knöpfe und Menüs sagen den Screenreadern nicht, was sie sind",
  },
  "4.1.3": {
    plain: "Werden Änderungen wie „in den Warenkorb gelegt“ laut angesagt?",
    failing: "Änderungen wie „in den Warenkorb gelegt“ werden nicht laut angesagt",
  },
};
