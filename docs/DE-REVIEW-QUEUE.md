# German strings added in the session of 26 August 2026 — for native review

These were written by the assistant, not by a native speaker, and ship
today because the fallback would be English in a German report. Each
needs a native ear for register (Sie), for the product's house voice, and
for whether the short labels read naturally as buttons and badges. Change
the right-hand column in `widget-business/src/lib/strings.de.ts`.

| English key | German as shipped |
| --- | --- |
| Manual checks | Manuelle Prüfungen |
| Checked by a person | Von einer Person geprüft |
| Decided | (missing) |
| Meets it | Erfüllt |
| Partly | (missing) |
| Fails it | Nicht erfüllt |
| Does not apply | Trifft nicht zu |
| Undecided | (missing) |
| Marked | Markiert |
| Open | Offen |
| Ignored | Ignoriert |
| False positive | Fehlalarm |
| Fixed | Behoben |
| Marked fixed, still found | Als behoben markiert, weiterhin gefunden |
| Language | Sprache |
| The checklist's wording changes on the next scan. | Die Formulierung der Checkliste ändert sich beim nächsten Scan. |
| Scheduled scans | Geplante Scans |
| scan results | Scan-Ergebnisse |
| section in this report | Abschnitt in diesem Bericht |
| sections in this report | Abschnitte in diesem Bericht |
| This is the order a screen reader reads it in. | In dieser Reihenfolge liest ein Screenreader die Seite. |
| What to fix | Was zu beheben ist |
| What the law asks | Was das Gesetz verlangt |
| For your team | Für Ihr Team |
| Documents and other views | Dokumente und andere Ansichten |
| Report | Bericht |

Also added, in components rather than the dictionary, and only in English
so far (they fall back to English in every language): the Account row
("Signed in as…", "Keep this key", "Forget this key"), the manual-checks
answer form ("Your answer", "What you checked, in a sentence", "Your
name", "Save answer"), the triage control ("Mark this finding", "Mark as",
"Why, in a sentence"), and the schedule row ("Scan this page
automatically…", "How often", "Email for a worse result (optional)",
"Schedule it", "Pause", "Resume", "Delete the schedule"). Those are the
next batch to route through the dictionary once the German for this table
is settled.
