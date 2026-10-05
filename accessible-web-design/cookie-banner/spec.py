"""Design spec section: an annotated static replica of the banner and dialog,
measurement table, palette with contrast, states. Shared by build.py."""
import html, re

T = {
 "en": dict(
  h="Design spec", intro="For the designer restyling it. Every measurement below is in the stylesheet; change the colours, keep the sizes.",
  banner_cap="First layer, desktop. Markers refer to the table.", dialog_cap="Second layer, the settings dialog.",
  cols=("Marker", "Element", "Specification"),
  marks=[
   ("A","Banner container","Fixed to the bottom edge, full width, max height 60% of the viewport, scrolls inside if taller. 1px top border, soft shadow. Content column max 1100px, padding 24px 16px, rows 16px apart."),
   ("B","Title","18px, weight 500, letter-spacing 0.01em. An h2, so it lands in the heading list."),
   ("C","Text","18px, weight 400, line-height 1.5, max 70 characters per line. Links underlined, offset 3px, in the accent colour."),
   ("D","Accept all / Reject all","Identical: min-height 48px, padding 10px 20px, 18px weight 500, 2px border, 2px radius. Solid fill. Gap between buttons 12px. On screens under 480px they stack full-width."),
   ("E","Settings","Same size, outline only: transparent fill, 2px border in the border colour. Visibly secondary but the same target."),
   ("F","Focus ring","2px outline in the focus colour, 2px offset, plus a 1px line in the background colour so it reads on any fill. Keyboard focus only."),
   ("G","Dialog","Width min(100% − 32px, 640px), max height 100vh − 32px, 1px border, 2px radius, padding 24px, rows 20px apart. Backdrop 50% black. Title 24px weight 500."),
   ("H","Category row","Grid: 24px checkbox, 12px gap, label 18px weight 500, description 15px in the muted colour. 12px padding, 1px border. “Always on” in 15px muted text, never a greyed box."),
   ("I","Save choices / Cancel","Same pair as D and E: one solid, one outline, both 48px."),
  ],
  palette_h="Palette and contrast", palette_intro="Each role, in both schemes, with its contrast against the surface. Text needs 4.5:1, borders and focus 3:1.",
  pcols=("Role","Light","Dark","Used for"),
  roles=[
   ("Surface","#ffffff","#111111","Banner and dialog background"),
   ("Text","#1a1a1a · 17.4:1","#f2f2f2 · 16.9:1","Title, body, labels"),
   ("Muted text","#4a4a4a · 8.9:1","#c4c4c4 · 10.8:1","Category descriptions, “always on”"),
   ("Accent","#0b5cad · 6.7:1","#7cbcff · 9.4:1","Links, checkbox tick"),
   ("Border","#767676 · 4.5:1","#8a8a8a · 5.5:1","Edges, outline buttons, category rows"),
   ("Button","#1a1a1a on #ffffff","#f2f2f2 on #111111","Solid buttons, text inverted, 17:1"),
   ("Focus","#0b5cad","#ffffff","The ring"),
  ],
  states_h="States", states=[
   ("Hover","Buttons drop to 92% opacity. Nothing else moves."),
   ("Focus","The ring from F. The dialog opens with focus on its title, so the reader hears the name first."),
   ("Checked","Native checkbox, tinted with the accent through accent-color. No custom drawing."),
   ("Disabled","Only the Necessary checkbox. Checked and disabled, with the words “always on” beside it."),
   ("Forced colours","Windows high contrast: borders switch to the system colours so both buttons still have edges."),
   ("Reduced motion","The 240ms slide-in is skipped. Nothing else animates."),
   ("Under 480px","Buttons stack to full width, 12px apart. Text wraps; nothing is cut."),
  ],
  type_h="Type", type_p="Two sizes only: 18px for anything read, 15px for secondary notes. Weights 400 and 500. Letter-spacing 0.01em throughout. The font is inherited from the site.",
  spacing_h="Spacing", spacing_p="A 4px grid: 12 between buttons and inside rows, 16 between banner rows and at the sides, 20 between dialog rows, 24 around the dialog and above the banner text.",
 ),
 "de": dict(
  h="Design-Spezifikation", intro="Für die Designerin, die es umgestaltet. Jedes Maß unten steht im Stylesheet; Farben ändern, Größen behalten.",
  banner_cap="Erste Ebene, Desktop. Die Markierungen verweisen auf die Tabelle.", dialog_cap="Zweite Ebene, der Einstellungsdialog.",
  cols=("Markierung","Element","Spezifikation"),
  marks=[
   ("A","Banner-Container","Fest am unteren Rand, volle Breite, maximal 60 % der Viewporthöhe, scrollt innen, wenn höher. 1 px Rahmen oben, weicher Schatten. Inhaltsspalte max. 1100 px, Innenabstand 24 px 16 px, Zeilen 16 px auseinander."),
   ("B","Titel","18 px, Stärke 500, Laufweite 0,01em. Ein h2, damit er in der Überschriftenliste erscheint."),
   ("C","Text","18 px, Stärke 400, Zeilenhöhe 1,5, max. 70 Zeichen pro Zeile. Links unterstrichen, 3 px versetzt, in der Akzentfarbe."),
   ("D","Alle akzeptieren / Alle ablehnen","Identisch: Mindesthöhe 48 px, Innenabstand 10 px 20 px, 18 px Stärke 500, 2 px Rahmen, 2 px Radius. Gefüllt. Abstand zwischen Buttons 12 px. Unter 480 px Breite stapeln sie sich in voller Breite."),
   ("E","Einstellungen","Gleiche Größe, nur Kontur: transparent, 2 px Rahmen in der Rahmenfarbe. Sichtbar nachrangig, aber dasselbe Ziel."),
   ("F","Fokusring","2 px Kontur in der Fokusfarbe, 2 px Versatz, plus 1 px Linie in der Hintergrundfarbe, damit er auf jeder Füllung lesbar ist. Nur bei Tastaturfokus."),
   ("G","Dialog","Breite min(100 % − 32 px, 640 px), max. Höhe 100vh − 32 px, 1 px Rahmen, 2 px Radius, Innenabstand 24 px, Zeilen 20 px auseinander. Hintergrund 50 % Schwarz. Titel 24 px Stärke 500."),
   ("H","Kategoriezeile","Raster: 24 px Checkbox, 12 px Abstand, Beschriftung 18 px Stärke 500, Beschreibung 15 px in der gedämpften Farbe. 12 px Innenabstand, 1 px Rahmen. „immer aktiv“ als 15 px gedämpfter Text, nie als graues Kästchen."),
   ("I","Auswahl speichern / Abbrechen","Dasselbe Paar wie D und E: einer gefüllt, einer Kontur, beide 48 px."),
  ],
  palette_h="Palette und Kontrast", palette_intro="Jede Rolle in beiden Schemata mit ihrem Kontrast zur Fläche. Text braucht 4,5:1, Rahmen und Fokus 3:1.",
  pcols=("Rolle","Hell","Dunkel","Verwendung"),
  roles=[
   ("Fläche","#ffffff","#111111","Hintergrund von Banner und Dialog"),
   ("Text","#1a1a1a · 17,4:1","#f2f2f2 · 16,9:1","Titel, Fließtext, Beschriftungen"),
   ("Gedämpfter Text","#4a4a4a · 8,9:1","#c4c4c4 · 10,8:1","Kategoriebeschreibungen, „immer aktiv“"),
   ("Akzent","#0b5cad · 6,7:1","#7cbcff · 9,4:1","Links, Häkchen"),
   ("Rahmen","#767676 · 4,5:1","#8a8a8a · 5,5:1","Kanten, Kontur-Buttons, Kategoriezeilen"),
   ("Button","#1a1a1a auf #ffffff","#f2f2f2 auf #111111","Gefüllte Buttons, Text invertiert, 17:1"),
   ("Fokus","#0b5cad","#ffffff","Der Ring"),
  ],
  states_h="Zustände", states=[
   ("Hover","Buttons gehen auf 92 % Deckkraft. Sonst bewegt sich nichts."),
   ("Fokus","Der Ring aus F. Der Dialog öffnet mit Fokus auf dem Titel, damit der Reader zuerst den Namen hört."),
   ("Angekreuzt","Native Checkbox, über accent-color in der Akzentfarbe. Keine eigene Zeichnung."),
   ("Deaktiviert","Nur die Checkbox „Notwendig“. Angekreuzt und deaktiviert, mit den Worten „immer aktiv“ daneben."),
   ("Erzwungene Farben","Windows-Kontrastmodus: Rahmen wechseln auf Systemfarben, damit beide Buttons Kanten behalten."),
   ("Reduzierte Bewegung","Das 240-ms-Einblenden entfällt. Sonst animiert nichts."),
   ("Unter 480 px","Buttons stapeln sich in voller Breite, 12 px auseinander. Text bricht um; nichts wird abgeschnitten."),
  ],
  type_h="Schrift", type_p="Nur zwei Größen: 18 px für alles Lesbare, 15 px für Nebenbemerkungen. Stärken 400 und 500. Laufweite überall 0,01em. Die Schrift wird von der Website geerbt.",
  spacing_h="Abstände", spacing_p="Ein 4-px-Raster: 12 zwischen Buttons und in Zeilen, 16 zwischen Bannerzeilen und seitlich, 20 zwischen Dialogzeilen, 24 um den Dialog und über dem Bannertext.",
 ),
}

CSS = '''
/* Design spec: static replicas of the banner and dialog with lettered markers. */
.spec-figure { margin: 0 0 24px; }
.spec-figure figcaption { font-size: 15px; letter-spacing: 0.01em; margin: 8px 0 0; }
.spec-wrap { overflow-x: auto; }
.spec { position: relative; padding: 16px 0 0 16px; }
.spec .consent { position: relative; max-height: none; animation: none; box-shadow: none; border: 1px solid var(--consent-border); }
.spec .consent__dialog { display: block; position: relative; margin: 0; max-height: none; width: 100%; }
.spec .consent__dialog > div { display: grid; gap: 20px; padding: 24px; }
.spec .consent__fields { display: grid; gap: 12px; }
.spec .consent__legend { margin: 0; font-size: 18px; font-weight: 500; }
.spec .consent__dialog h2 { margin: 0; font-size: 24px; font-weight: 500; line-height: 1.3; }
.spec .consent__title, .spec .consent__text, .spec .consent__button, .spec .consent__option { position: relative; }
.spec * { pointer-events: none; }
.spec .is-focus { outline: 2px solid var(--consent-focus); outline-offset: 2px; box-shadow: 0 0 0 1px var(--consent-bg); }
.mark { position: absolute; top: -12px; left: -12px; display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 14px; font-weight: 500; letter-spacing: 0.01em; background: #fdd84b; color: #000; border: 1px solid #000; z-index: 2; }
.mark--right { left: auto; right: -12px; }
.spec-table { width: 100%; border-collapse: collapse; margin: 0 0 24px; font-size: 15px; letter-spacing: 0.01em; }
.spec-table th, .spec-table td { text-align: left; vertical-align: top; padding: 10px 12px 10px 0; border-top: 1px solid var(--consent-border, currentColor); }
.spec-table th { font-weight: 500; }
.spec-table td:first-child, .spec-table th:first-child { white-space: nowrap; width: 1%; }
.spec-table .mark { position: static; }
.swatch { display: inline-block; width: 14px; height: 14px; border: 1px solid currentColor; vertical-align: -2px; margin-inline-end: 6px; }
'''

def _sw(cell):
    hexs = [w for w in cell.replace("auf", "on").split() if w.startswith("#")]
    return "".join(f'<span class="swatch" style="background:{h}" aria-hidden="true"></span>' for h in hexs[:1]) + html.escape(cell)

def _static(markup):
    """A replica: no ids, no landmark, no dialog element, hidden from AT (the table carries the words)."""
    markup = re.sub(r' (id|for|aria-labelledby|data-consent-action|data-consent-message|data-consent-status)="[^"]*"', "", markup)
    markup = markup.replace("<section ", '<div aria-hidden="true" inert ').replace("</section>", "</div>")
    markup = markup.replace("<dialog ", '<div aria-hidden="true" inert ').replace("</dialog>", "</div>")
    markup = markup.replace("<form ", "<div ").replace("</form>", "</div>").replace("<fieldset>", "<div class=\"consent__fields\">").replace("</fieldset>", "</div>").replace("<legend>", "<p class=\"consent__legend\">").replace("</legend>", "</p>")
    return markup

def _mark(letter, right=False):
    return f'<span class="mark{" mark--right" if right else ""}">{letter}</span>'

def _inject(markup, selector_open, letter, right=False, nth=1):
    """Insert a marker right after the nth opening tag that starts with selector_open."""
    idx = -1
    for _ in range(nth):
        idx = markup.index(selector_open, idx + 1)
    close = markup.index(">", idx) + 1
    return markup[:close] + _mark(letter, right) + markup[close:]

def section(lang, banner_html, dialog_html, h_open="<h2>", h_close="</h2>"):
    t = T[lang]
    banner_html, dialog_html = _static(banner_html), _static(dialog_html)
    b = banner_html.replace(" hidden", "").replace('class="consent__button"', 'class="consent__button is-focus"', 1)
    b = _inject(b, '<div aria-hidden="true" inert class="consent"', "A")
    b = _inject(b, '<h2 class="consent__title"', "B")
    b = _inject(b, '<p class="consent__text"', "C")
    b = _inject(b, '<button type="button" class="consent__button is-focus"', "D")
    b = _inject(b, '<button type="button" class="consent__button is-focus"', "F", right=True)
    b = _inject(b, '<button type="button" class="consent__button consent__button--quiet"', "E")
    d = _inject(dialog_html, '<div aria-hidden="true" inert class="consent__dialog"', "G")
    d = _inject(d, '<div class="consent__option">', "H")
    d = _inject(d, '<button type="submit" class="consent__button"', "I")
    banner = f'''<figure class="spec-figure"><div class="spec-wrap"><div class="spec">{b}</div></div><figcaption>{html.escape(t["banner_cap"])}</figcaption></figure>'''
    dialog = f'''<figure class="spec-figure"><div class="spec-wrap"><div class="spec">{d}</div></div><figcaption>{html.escape(t["dialog_cap"])}</figcaption></figure>'''
    rows = "".join(f'<tr><td><span class="mark" aria-hidden="true">{m}</span><span class="visually-hidden">{m}</span></td><td>{html.escape(e)}</td><td>{html.escape(s)}</td></tr>' for m,e,s in t["marks"])
    prow = "".join(f'<tr><td>{html.escape(r)}</td><td>{_sw(l)}</td><td>{_sw(d)}</td><td>{html.escape(u)}</td></tr>' for r,l,d,u in t["roles"])
    states = "".join(f'<li><strong>{html.escape(a)}</strong><span>{html.escape(b)}</span></li>' for a,b in t["states"])
    return f'''
    {h_open}{t["h"]}{h_close}
    <p>{html.escape(t["intro"])}</p>
    {banner}
    {dialog}
    <div class="spec-wrap"><table class="spec-table"><thead><tr>{"".join(f"<th>{c}</th>" for c in t["cols"])}</tr></thead><tbody>{rows}</tbody></table></div>
    <h3>{t["palette_h"]}</h3>
    <p>{html.escape(t["palette_intro"])}</p>
    <div class="spec-wrap"><table class="spec-table"><thead><tr>{"".join(f"<th>{c}</th>" for c in t["pcols"])}</tr></thead><tbody>{prow}</tbody></table></div>
    <h3>{t["type_h"]}</h3><p>{html.escape(t["type_p"])}</p>
    <h3>{t["spacing_h"]}</h3><p>{html.escape(t["spacing_p"])}</p>
    <h3>{t["states_h"]}</h3>
    <ol class="rules">{states}</ol>
'''
