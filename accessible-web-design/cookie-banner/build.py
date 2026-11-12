#!/usr/bin/env python3
"""Builds en/cookie-banner.html and de/cookie-banner.html from the kit files.
Run after editing consent.css / consent.js / consent.*.html.

The page is set out like the accessibility statement: a plain heading, a
facts grid, short sections that say what is so, numbered steps, and one note
to read before publishing. Business-owner sections come first; everything a
developer needs sits under one heading at the end."""
import html, json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import spec
import builder_page

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / "cookie-banner"

def esc(name):
    return html.escape((KIT / name).read_text())

# Wording of the page itself, in both languages. The banner's own wording is
# in consent.en/de.html and builder_page.py (GEN); change those together.
L = {
 "en": dict(
  lang="en", other="de", path="en/cookie-banner.html", snippet="consent.en.html",
  title="Accessible cookie banner — BarrierFreeWeb",
  desc="A free cookie banner for EU websites. Visitors can use it with a keyboard or a screen reader. Make yours in the browser.",
  skip="Skip to content", back="Back to the site", copy="Copy", copied="Copied",
  h1="Cookie banner for your website",
  lede="A consent banner that follows EU law and works with a keyboard or a screen reader. Free to use. Make yours below, then hand the files to your developer.",
  facts_label="What this banner is",
  facts=[
   ("Covers", "GDPR · ePrivacy", "The EU rules on cookie consent."),
   ("Built to", "WCAG 2.2 AA", "The international standard for accessible websites."),
   ("You get", "3 files", "Markup, stylesheet and script. No other software needed."),
   ("Your data", "Stays on this page", "The builder runs in your browser. Nothing you type is sent."),
  ],
  demo_h="See it working",
  demo_p="The banner on this page is the real template. Bring it back with the button, then try Tab, Escape and a screen reader.",
  demo_reset="Show the banner again", demo_settings="Open the settings",
  law_h="What the law asks, and what the banner does",
  law_p="Based on the GDPR (Articles 4 and 7), the ePrivacy Directive (Article 5) and the European Data Protection Board's guidance on cookie banners.",
  law=[
   ("Refusing is as easy as accepting.", "Accept all and Reject all sit side by side on the first screen, the same size and colour."),
   ("Nothing is pre-ticked.", "Optional cookies start switched off. Only the cookies your site needs to work are on."),
   ("Nothing is set before a choice.", "Scrolling is not consent. Scripts that need consent wait for a click."),
   ("Changing your mind is as easy.", "A Cookie settings button in the footer of every page reopens the choices."),
   ("Each category says what it does.", "What is collected, by whom and why, in plain words."),
   ("The site works if visitors refuse.", "No cookie wall. Visitors who decline can still read and use every page."),
  ],
  a11y_h="What it does for visitors with disabilities",
  a11y_p="The European Accessibility Act expects a banner like this to be usable by everyone.",
  a11y=[
   ("It never blocks the page.", "The banner sits at the bottom and covers at most 60% of the screen. Visitors can read the site while they decide."),
   ("Every control works from the keyboard.", "Tab reaches each button. Escape closes the banner and keeps only necessary cookies."),
   ("Screen readers announce it first.", "It is read out as a labelled region with a heading. The page follows."),
   ("The buttons are easy to hit.", "Each is 48px tall. The text is at least 15px."),
   ("The colours are readable.", "Text and borders pass the contrast check in light and dark mode. If your own colours fail, the builder warns you."),
   ("Zoom and small screens work.", "Nothing hides behind the banner at 400% zoom or 320px wide."),
  ],
  install_h="Put it on your site",
  install=[
   ("Make your banner above.", "Set your policy link, your cookie categories and your colours."),
   ("Give the three files to your developer.", "Or add them yourself: markup, stylesheet and script."),
   ("Paste the markup.", "The banner goes right after your skip link, before the header. The Cookie settings button goes in the footer of every page."),
   ("Mark each script that needs consent.", "Change its type to text/plain and add data-consent with the category name. It starts once that category is allowed."),
   ("Test it.", "Run the checks below before you publish."),
  ],
  test_h="Check it before you publish",
  test_p="Ten minutes, a keyboard and a screen reader.",
  test=[
   "Press Tab from the address bar. Focus lands on the skip link, then Accept all, Reject all and Settings.",
   "Press Escape in the banner. It closes, no analytics load, and it stays closed after a reload.",
   "Open Settings, then press Escape. The dialog closes and focus returns to the Settings button.",
   "Turn on VoiceOver or NVDA and reload. The banner is announced with its heading. Arrow past it and the page reads on.",
   "Zoom to 400% at 320px wide. Every button is reachable and nothing sits behind the banner.",
   "Switch to dark mode, then Windows high contrast. The buttons keep their borders and the focus ring shows.",
   "Clear site data and reload. The banner returns with every optional box off.",
  ],
  caveat_b="Read it before you publish.",
  caveat="Make sure the categories name the cookies your site really sets. A starting point, not legal advice.",
  dev_h="For your developer",
  dev_p="Files, scripting, design measurements and the WCAG criteria the banner meets.",
  files_h="Files", files_p="Save the files, or copy the code below:",
  api_h="Using the choice in your code",
  api_p="The script exposes a small API and an event. A script written as text/plain with a data-consent attribute switches on as soon as its category is allowed, including on later visits.",
  theme_h="Theming",
  theme_p="Override the --consent-* custom properties on .consent and .consent__dialog. Keep text at 4.5:1 and borders at 3:1 in both colour schemes. Keep Accept and Reject identical.",
  crit_h="WCAG criteria",
  crit_p="Each point maps to a WCAG 2.2 criterion, shown in brackets.",
  crit=[
   ("Not a modal.", "The first layer is a labelled region, not a dialog. The page stays active, focus is not moved and nothing is trapped. (2.1.2, 2.4.3)"),
   ("At most 60% of the screen.", "Fixed to the bottom, with matching padding on the page, so nothing hides behind it at 400% zoom or 320px wide. (1.4.10)"),
   ("Escape continues without consent.", "Only necessary cookies, choice stored, no repeat prompt. (2.1.1)"),
   ("Settings use a native dialog.", "The dialog element supplies the focus trap, the Escape key and the inert background, and returns focus to the opener. (2.4.3, 4.1.2)"),
   ("Real controls.", "Buttons are button elements. Categories are checkboxes in a fieldset with a legend, each with a visible label. (1.3.1, 4.1.2)"),
   ("48px targets, 18px text.", "Targets clear the 24px minimum. The smallest text is 15px. (2.5.8, 1.4.4)"),
   ("Visible focus.", "A 2px ring with a 1px inner contrast line, in both colour schemes and in Windows high contrast. (2.4.7, 2.4.11)"),
   ("Contrast in both schemes.", "Text 4.5:1 or better, borders 3:1 or better. Status changes go to a live region. (1.4.3, 1.4.11, 4.1.3)"),
   ("Reduced motion.", "The entrance slide runs only if the visitor has not asked for less motion. (2.3.3)"),
   ("Words live in the markup.", "The script holds no text. To translate the banner, edit the HTML."),
  ],
  footer_statement="Accessibility statement", footer_contact="Contact",
 ),
 "de": dict(
  lang="de", other="en", path="de/cookie-banner.html", snippet="consent.de.html",
  title="Barrierefreies Cookie-Banner — BarrierFreeWeb",
  desc="Ein kostenloses Cookie-Banner für EU-Websites. Besucher bedienen es mit Tastatur oder Screenreader. Erstellen Sie Ihres im Browser.",
  skip="Zum Inhalt springen", back="Zurück zur Website", copy="Kopieren", copied="Kopiert",
  h1="Cookie-Banner für Ihre Website",
  lede="Ein Einwilligungsbanner, das dem EU-Recht entspricht und mit Tastatur und Screenreader funktioniert. Kostenlos. Erstellen Sie unten Ihr Banner und geben Sie die Dateien an Ihre Entwicklung weiter.",
  facts_label="Was dieses Banner ist",
  facts=[
   ("Deckt ab", "DSGVO · ePrivacy", "Die EU-Regeln zur Cookie-Einwilligung."),
   ("Gebaut nach", "WCAG 2.2 AA", "Der internationale Standard für barrierefreie Websites."),
   ("Sie erhalten", "3 Dateien", "Markup, Stylesheet und Skript. Keine weitere Software nötig."),
   ("Ihre Daten", "Bleiben auf dieser Seite", "Der Generator läuft in Ihrem Browser. Nichts, was Sie eingeben, wird gesendet."),
  ],
  demo_h="Ausprobieren",
  demo_p="Das Banner auf dieser Seite ist die echte Vorlage. Holen Sie es mit der Schaltfläche zurück und probieren Sie Tab, Escape und einen Screenreader aus.",
  demo_reset="Banner erneut anzeigen", demo_settings="Einstellungen öffnen",
  law_h="Was das Recht verlangt und was das Banner tut",
  law_p="Grundlage sind die DSGVO (Artikel 4 und 7), die ePrivacy-Richtlinie (Artikel 5) und die Leitlinien des Europäischen Datenschutzausschusses zu Cookie-Bannern.",
  law=[
   ("Ablehnen ist so einfach wie Akzeptieren.", "„Alle akzeptieren“ und „Alle ablehnen“ stehen nebeneinander auf der ersten Ebene, gleich groß und gleich farbig."),
   ("Nichts ist vorangekreuzt.", "Optionale Cookies sind zunächst aus. Aktiv sind nur die Cookies, die Ihre Website zum Funktionieren braucht."),
   ("Ohne Entscheidung wird nichts gesetzt.", "Scrollen ist keine Einwilligung. Skripte, die eine Einwilligung brauchen, warten auf den Klick."),
   ("Die Entscheidung lässt sich ändern.", "Die Schaltfläche „Cookie-Einstellungen“ in der Fußzeile jeder Seite öffnet die Auswahl erneut."),
   ("Jede Kategorie sagt, was sie tut.", "Was erhoben wird, von wem und wozu, in einfachen Worten."),
   ("Die Website funktioniert auch nach einer Ablehnung.", "Keine Cookie-Wall. Wer ablehnt, kann jede Seite lesen und nutzen."),
  ],
  a11y_h="Was es für Besucher mit Behinderungen leistet",
  a11y_p="Das Barrierefreiheitsstärkungsgesetz erwartet, dass ein solches Banner für alle nutzbar ist.",
  a11y=[
   ("Es blockiert die Seite nie.", "Das Banner sitzt unten und bedeckt höchstens 60 % des Bildschirms. Besucher können die Seite lesen, während sie entscheiden."),
   ("Jedes Bedienelement funktioniert per Tastatur.", "Tab erreicht jede Schaltfläche. Escape schließt das Banner und behält nur notwendige Cookies."),
   ("Screenreader lesen es zuerst vor.", "Es wird als beschriftete Region mit Überschrift angesagt. Danach folgt die Seite."),
   ("Die Schaltflächen sind leicht zu treffen.", "Jede ist 48 px hoch. Der Text hat mindestens 15 px."),
   ("Die Farben sind gut lesbar.", "Text und Rahmen bestehen den Kontrastcheck, im hellen wie im dunklen Modus. Fallen Ihre eigenen Farben durch, warnt Sie der Generator."),
   ("Zoom und kleine Bildschirme funktionieren.", "Bei 400 % Zoom und 320 px Breite verschwindet nichts hinter dem Banner."),
  ],
  install_h="Auf Ihrer Website einbauen",
  install=[
   ("Banner oben erstellen.", "Legen Sie Datenschutz-Link, Cookie-Kategorien und Farben fest."),
   ("Drei Dateien an Ihre Entwicklung geben.", "Oder selbst einbauen: Markup, Stylesheet und Skript."),
   ("Markup einfügen.", "Das Banner kommt direkt nach den Sprunglink, vor den Header. Die Schaltfläche „Cookie-Einstellungen“ gehört in die Fußzeile jeder Seite."),
   ("Skripte kennzeichnen, die eine Einwilligung brauchen.", "Setzen Sie type auf text/plain und ergänzen Sie data-consent mit dem Namen der Kategorie. Das Skript startet, sobald die Kategorie erlaubt ist."),
   ("Testen.", "Gehen Sie vor dem Veröffentlichen die Prüfliste unten durch."),
  ],
  test_h="Vor dem Veröffentlichen prüfen",
  test_p="Zehn Minuten, eine Tastatur und ein Screenreader.",
  test=[
   "Von der Adressleiste aus Tab drücken. Der Fokus landet auf dem Sprunglink, dann auf „Alle akzeptieren“, „Alle ablehnen“ und „Einstellungen“.",
   "Im Banner Escape drücken. Es schließt sich, keine Analyse lädt, und nach dem Neuladen bleibt es geschlossen.",
   "Einstellungen öffnen, dann Escape drücken. Der Dialog schließt sich und der Fokus kehrt zur Schaltfläche „Einstellungen“ zurück.",
   "VoiceOver oder NVDA einschalten und neu laden. Das Banner wird mit seiner Überschrift angesagt. Mit den Pfeiltasten daran vorbei, dann wird die Seite gelesen.",
   "Auf 400 % zoomen, bei 320 px Breite. Jede Schaltfläche ist erreichbar, nichts liegt hinter dem Banner.",
   "Auf Dunkelmodus und dann auf den Windows-Kontrastmodus umstellen. Die Schaltflächen behalten ihre Rahmen, der Fokusring bleibt sichtbar.",
   "Website-Daten löschen und neu laden. Das Banner kehrt zurück, jede optionale Box ist aus.",
  ],
  caveat_b="Vor dem Veröffentlichen prüfen.",
  caveat="Die Kategorien müssen die Cookies nennen, die Ihre Website wirklich setzt. Ein Ausgangspunkt, keine Rechtsberatung.",
  dev_h="Für Ihre Entwicklung",
  dev_p="Dateien, Skripting, Designmaße und die WCAG-Kriterien, die das Banner erfüllt.",
  files_h="Dateien", files_p="Speichern Sie die Dateien oder kopieren Sie den Code unten:",
  api_h="Die Wahl im eigenen Code nutzen",
  api_p="Das Skript stellt eine kleine API und ein Ereignis bereit. Ein Skript mit type text/plain und einem data-consent-Attribut startet, sobald seine Kategorie erlaubt ist, auch bei späteren Besuchen.",
  theme_h="Gestaltung",
  theme_p="Überschreiben Sie die Custom Properties --consent-* auf .consent und .consent__dialog. Halten Sie Text bei 4,5:1 und Rahmen bei 3:1, in beiden Farbschemata. „Alle akzeptieren“ und „Alle ablehnen“ bleiben identisch.",
  crit_h="WCAG-Kriterien",
  crit_p="Jeder Punkt entspricht einem WCAG-2.2-Kriterium, in Klammern genannt.",
  crit=[
   ("Kein Modal.", "Die erste Ebene ist eine beschriftete Region, kein Dialog. Die Seite bleibt aktiv, der Fokus wird nicht verschoben, nichts wird eingesperrt. (2.1.2, 2.4.3)"),
   ("Höchstens 60 % des Bildschirms.", "Unten fixiert, die Seite bekommt passenden Abstand, sodass bei 400 % Zoom und 320 px Breite nichts dahinter verschwindet. (1.4.10)"),
   ("Escape heißt weiter ohne Einwilligung.", "Nur notwendige Cookies, Wahl gespeichert, keine erneute Abfrage. (2.1.1)"),
   ("Einstellungen in einem nativen Dialog.", "Das dialog-Element liefert Fokusfalle, Escape-Taste und inerten Hintergrund und gibt den Fokus an das öffnende Element zurück. (2.4.3, 4.1.2)"),
   ("Echte Bedienelemente.", "Buttons sind button-Elemente. Kategorien sind Checkboxen in einem fieldset mit legend, jede mit sichtbarer Beschriftung. (1.3.1, 4.1.2)"),
   ("48 px Zielgröße, 18 px Text.", "Die Ziele übertreffen das Minimum von 24 px. Der kleinste Text hat 15 px. (2.5.8, 1.4.4)"),
   ("Sichtbarer Fokus.", "Ein 2-px-Ring mit 1 px innerer Kontrastlinie, in beiden Farbschemata und im Windows-Kontrastmodus. (2.4.7, 2.4.11)"),
   ("Kontrast in beiden Schemata.", "Text mindestens 4,5:1, Rahmen mindestens 3:1. Statusmeldungen gehen an eine Live-Region. (1.4.3, 1.4.11, 4.1.3)"),
   ("Reduzierte Bewegung.", "Die Einblendung läuft nur, wenn der Besucher nicht um weniger Bewegung gebeten hat. (2.3.3)"),
   ("Die Wörter stehen im Markup.", "Das Skript enthält keinen Text. Zum Übersetzen des Banners bearbeiten Sie das HTML."),
  ],
  footer_statement="Erklärung zur Barrierefreiheit", footer_contact="Kontakt",
 ),
}

API_EXAMPLE = '''<!-- A script that waits for the "analytics" category -->
<script type="text/plain" data-consent="analytics" src="/js/analytics.js"></script>

<script>
  // Ask before doing something that needs consent
  if (consent.allows("media")) loadVideoEmbeds();

  // React when the choice changes
  window.addEventListener("consentchange", function (e) {
    console.log(e.detail.categories);   // { necessary: true, analytics: false, media: true }
  });

  // Reopen the dialog from your own control
  consent.open();
</script>'''

# Shared by the site pages and the standalone page. --rule and --sub are set
# by each: the site's soft border and muted text, the standalone's own.
SHARED_CSS = '''
/* Facts, steps and the closing note: the accessibility statement's shape. */
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin: 0 0 40px; padding: 0; max-width: 1100px; }
.facts > div { border-top: 1px solid var(--rule); padding-top: 12px; min-width: 0; }
.facts dt { font-size: 15px; letter-spacing: 0.01em; color: var(--sub); margin: 0 0 6px; }
.facts dd { margin: 0; font-size: 18px; letter-spacing: 0.01em; overflow-wrap: anywhere; }
.facts .gloss { display: block; font-size: 15px; color: var(--sub); margin-top: 6px; }
.step-head { display: flex; flex-wrap: wrap; gap: 0 0.5em; align-items: baseline; margin-top: 40px; }
.step-num { color: var(--sub); font-weight: 400; }
.caveat { border-top: 1px solid var(--rule); padding-top: 16px; margin-top: 40px; }
.caveat strong { font-weight: 500; }
'''

def rules(items):
    return '<ol class="rules">' + "".join(f"<li><span><strong>{html.escape(h)}</strong>{html.escape(p)}</span></li>" for h, p in items) + "</ol>"

def facts(t):
    cards = "".join(
        f'<div><dt>{html.escape(f)}</dt><dd>{html.escape(v)}<span class="gloss">{html.escape(g)}</span></dd></div>'
        for f, v, g in t["facts"])
    return f'<dl class="facts" aria-label="{html.escape(t["facts_label"])}">{cards}</dl>'

def plain_list(items):
    return '<ol class="rules">' + "".join(f"<li><span>{html.escape(x)}</span></li>" for x in items) + "</ol>"

def code(title, name, lang):
    return f'''<details class="code-block" open>
  <summary>{title}, {name}</summary>
  <div class="code-tools"><button type="button" class="copy" data-copy="{name}" data-copied="{lang['copied']}">{lang['copy']}</button></div>
  <pre tabindex="0"><code id="{name}">{esc(name)}</code></pre>
</details>'''

def build(L):
    snippet = (KIT / L["snippet"]).read_text()
    # the live demo: the snippet without its comments, link tags and the placeholder analytics script
    live = "\n".join(l for l in snippet.splitlines()
                     if not l.lstrip().startswith("<!--") and "text/plain" not in l
                     and 'rel="stylesheet"' not in l and 'consent.js' not in l
                     and not l.strip().startswith(("1.", "2.", "3.", "4.", "header", "first", "comments", "first Tab", "das Erste", "„Zum", "Das Banner")))
    live = live.replace('href="/privacy/"', 'href="statement.html"').replace('href="/datenschutz/"', 'href="statement.html"')
    banner_live = live.split("<dialog")[0]
    dialog_live = "<dialog" + live.split("<dialog")[1].split("<button type=\"button\" class=\"consent__reopen\"")[0]
    reopen_live = "<button type=\"button\" class=\"consent__reopen\"" + live.split("<button type=\"button\" class=\"consent__reopen\"")[1]
    page = f'''<!doctype html>
<html lang="{L['lang']}" dir="ltr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{L['title']}</title>
<meta name="description" content="{html.escape(L['desc'])}" />
  <link rel="alternate" hreflang="en" href="https://barrierfreeweb.de/en/cookie-banner.html" />
  <link rel="alternate" hreflang="de" href="https://barrierfreeweb.de/de/cookie-banner.html" />
  <link rel="alternate" hreflang="x-default" href="https://barrierfreeweb.de/en/cookie-banner.html" />
<link rel="canonical" href="https://barrierfreeweb.de/{L['lang']}/cookie-banner.html" />
<link rel="stylesheet" href="../cookie-banner/consent.css" />
<link rel="stylesheet" href="../styles.css" />
<style>:root {{ --rule: var(--border-soft); --sub: var(--muted-text); }}{SHARED_CSS}</style>
</head>
<body>
<a class="skip-link" href="#main-content">{L['skip']}</a>

{banner_live}
{dialog_live}

<header class="site-header">
  <div class="container">
    <a href="./" class="logo">BarrierFreeWeb</a>
    <nav class="main-nav" aria-label="Primary">
      <a href="./">{L['back']}</a>
      <nav class="lang-switch" aria-label="Language">
        <ul class="lang-list">
        <li>
          <a href="/en/cookie-banner.html" hreflang="en" lang="en"{' aria-current="true" class="lang-option is-current"' if L['lang']=='en' else ' class="lang-option"'}>English</a>
        </li>
        <li>
          <a href="/de/cookie-banner.html" hreflang="de" lang="de"{' aria-current="true" class="lang-option is-current"' if L['lang']=='de' else ' class="lang-option"'}>Deutsch</a>
        </li>
        </ul>
      </nav>
    </nav>
  </div>
</header>

<div class="container">
  <main class="content" id="main-content">
    <h1>{L['h1']}</h1>
    <p class="lede">{L['lede']}</p>
    {facts(L)}

    <h2>{L['demo_h']}</h2>
    <p>{L['demo_p']}</p>
    <div class="demo-actions">
      <button type="button" class="demo-button" onclick="consent.reset()">{L['demo_reset']}</button>
      <button type="button" class="demo-button" data-consent-action="settings">{L['demo_settings']}</button>
    </div>

    {builder_page.section(L['lang'])}

    <h2>{L['law_h']}</h2>
    <p>{L['law_p']}</p>
    {rules(L['law'])}

    <h2>{L['a11y_h']}</h2>
    <p>{L['a11y_p']}</p>
    {rules(L['a11y'])}

    <h2>{L['install_h']}</h2>
    {rules(L['install'])}

    <h2>{L['test_h']}</h2>
    <p>{L['test_p']}</p>
    {plain_list(L['test'])}

    <p class="caveat"><strong>{L['caveat_b']}</strong> {L['caveat']}</p>

    <h2>{L['dev_h']}</h2>
    <p>{L['dev_p']}</p>

    <h3 id="code">{L['files_h']}</h3>
    <p>{L['files_p']}
      <a class="link" href="../cookie-banner/consent.css" download>consent.css</a>,
      <a class="link" href="../cookie-banner/consent.js" download>consent.js</a>,
      <a class="link" href="../cookie-banner/consent.en.html" download>consent.en.html</a>,
      <a class="link" href="../cookie-banner/consent.de.html" download>consent.de.html</a></p>
    {code("HTML", L['snippet'], L)}
    {code("CSS", "consent.css", L)}
    {code("JavaScript", "consent.js", L)}

    <h3>{L['api_h']}</h3>
    <p>{L['api_p']}</p>
    <details class="code-block" open>
      <summary>HTML + JavaScript</summary>
      <pre tabindex="0"><code>{html.escape(API_EXAMPLE)}</code></pre>
    </details>

    <h3>{L['theme_h']}</h3>
    <p>{L['theme_p']}</p>

    {spec.section(L['lang'], banner_live, dialog_live, h_open="<h3>", h_close="</h3>", sub="h4")}

    <h3>{L['crit_h']}</h3>
    <p>{L['crit_p']}</p>
    {rules(L['crit'])}

    <footer class="site-footer">
      <a href="statement.html">{L['footer_statement']}</a>
      <a href="mailto:gf@barrierfreeweb.de">{L['footer_contact']}</a>
      {reopen_live}
    </footer>
  </main>
</div>

<script src="../cookie-banner/consent.js" defer></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js" defer></script>
<script src="../cookie-banner/builder.js" defer></script>
<script>
  document.querySelectorAll(".copy").forEach(function (b) {{
    b.addEventListener("click", function (e) {{
      e.preventDefault();
      var text = document.getElementById(b.dataset.copy).textContent;
      navigator.clipboard.writeText(text).then(function () {{
        var was = b.textContent; b.textContent = b.dataset.copied;
        setTimeout(function () {{ b.textContent = was; }}, 1500);
      }});
    }});
  }});
</script>
</body>
</html>
'''
    (ROOT / L["path"]).write_text(page)
    print("wrote", L["path"])

for k in L: build(L[k])

# ── Standalone single-file page: cookie-banner/index.html ──────────────────
E = L["en"]
FILES = ["consent.css", "consent.js", "consent.en.html", "consent.de.html"]
sources = {n: (KIT / n).read_text() for n in FILES}
css_src = sources["consent.css"]
builder_src = (KIT / "builder.js").read_text().replace("</script", "<\\/script")
js_src = sources["consent.js"].replace("</script", "<\\/script")
snippet = sources["consent.en.html"]
live = "\n".join(l for l in snippet.splitlines() if not l.lstrip().startswith("<!--") and "text/plain" not in l
                 and 'rel="stylesheet"' not in l and 'consent.js' not in l
                 and not l.strip().startswith(("header", "first", "comments", "first Tab")))
live = live.replace('href="/privacy/"', 'href="#policy"')
banner_live = live.split("<dialog")[0]
dialog_live = "<dialog" + live.split("<dialog")[1].split('<button type="button" class="consent__reopen"')[0]
reopen_live = '<button type="button" class="consent__reopen"' + live.split('<button type="button" class="consent__reopen"')[1]

def block(title, name):
    return f'''<section class="code" aria-labelledby="h-{name}">
  <div class="code__bar">
    <h4 id="h-{name}">{title}, {name}</h4>
    <div class="code__tools">
      <button type="button" class="btn btn--small" data-copy="{name}">Copy</button>
      <button type="button" class="btn btn--small" data-download="{name}">Download</button>
    </div>
  </div>
  <pre tabindex="0"><code id="{name}">{html.escape(sources[name])}</code></pre>
</section>'''

TITLE = "<title>Accessible Consent Banner</title>\n"
page = f'''<style>
/* Layout: one 68ch column of instruction, full-width code blocks, the banner itself live at the bottom. */
:root {{
  --bg: #fbfaf7; --fg: #1d1c1a; --muted: #5b5955; --line: #c9c6bf; --accent: #0b5cad; --surface: #f1efe9; --code: #f4f2ec;
  --rule: var(--line); --sub: var(--muted);
  --font: "PP Telegraf", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --bg: #121211; --fg: #efede8; --muted: #b4b1aa; --line: #4a4844; --accent: #8cc2ff; --surface: #1c1b19; --code: #1a1917; color-scheme: dark }} }}
:root[data-theme="dark"] {{ --bg: #121211; --fg: #efede8; --muted: #b4b1aa; --line: #4a4844; --accent: #8cc2ff; --surface: #1c1b19; --code: #1a1917; color-scheme: dark }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 18px; line-height: 1.5; letter-spacing: 0.01em; }}
.wrap {{ max-width: 960px; margin-inline: auto; padding-block: 48px 96px; padding-inline: 16px; }}
h1 {{ font-size: 40px; font-weight: 300; line-height: 1.1; margin: 0 0 16px; text-wrap: balance; max-width: 20ch; }}
h2 {{ font-size: 28px; font-weight: 400; line-height: 1.2; margin: 64px 0 16px; text-wrap: balance; }}
h3 {{ font-size: 18px; font-weight: 500; margin: 32px 0 8px; }}
h4 {{ font-size: 18px; font-weight: 500; margin: 0; }}
p {{ margin: 0 0 16px; max-width: 68ch; }}
.lede {{ font-size: 18px; color: var(--muted); max-width: 60ch; }}
a {{ color: var(--accent); text-underline-offset: 3px; }}
.btn {{ font: inherit; font-size: 18px; letter-spacing: 0.01em; min-height: 48px; padding: 0 20px; border: 2px solid var(--fg); border-radius: 2px; background: var(--fg); color: var(--bg); cursor: pointer; }}
.btn--quiet {{ background: transparent; color: var(--fg); }}
.btn--small {{ min-height: 40px; font-size: 15px; padding: 0 14px; background: transparent; color: var(--fg); border-width: 1px; border-color: var(--line); }}
.btn:hover {{ opacity: 0.9; }}
:focus-visible {{ outline: 2px solid var(--accent); outline-offset: 2px; }}
.actions {{ display: flex; flex-wrap: wrap; gap: 12px; margin: 24px 0 8px; }}
.rules {{ list-style: none; margin: 0 0 16px; padding: 0; counter-reset: r; }}
.rules li {{ counter-increment: r; display: grid; grid-template-columns: 3ch 1fr; gap: 0 16px; padding: 14px 0; border-top: 1px solid var(--line); max-width: 68ch; }}
.rules li::before {{ content: counter(r, decimal-leading-zero); color: var(--muted); font-family: var(--mono); font-size: 15px; padding-top: 3px; }}
.rules li strong {{ font-weight: 500; }}
.rules li span {{ grid-column: 2; color: var(--fg); }}
.rules li strong + span {{ margin-top: 2px; }}
.rules--plain li {{ grid-template-columns: 3ch 1fr; }}
.code {{ margin: 24px 0; border: 1px solid var(--line); border-radius: 2px; background: var(--code); }}
.code__bar {{ display: flex; flex-wrap: wrap; gap: 12px; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--line); }}
.code__tools {{ display: flex; gap: 8px; }}
.code pre {{ margin: 0; padding: 16px; overflow: auto; max-height: 480px; font-family: var(--mono); font-size: 14px; line-height: 1.5; tab-size: 2; }}
.status {{ color: var(--muted); font-size: 15px; min-height: 1.5em; }}
footer {{ margin-top: 64px; padding-top: 24px; border-top: 1px solid var(--line); display: flex; flex-wrap: wrap; gap: 24px; font-size: 15px; color: var(--muted); }}
.visually-hidden {{ position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }}
@media (max-width: 480px) {{ h1 {{ font-size: 32px; }} .btn {{ width: 100%; }} .actions {{ display: grid; }} }}
{SHARED_CSS}
{spec.CSS}
/* ── the template's own stylesheet, unchanged ── */
{css_src}
</style>

<a class="visually-hidden" href="#main">{E['skip']}</a>
{banner_live}
{dialog_live}

<div class="wrap">
<main id="main">
  <h1>{E['h1']}</h1>
  <p class="lede">{E['lede']}</p>
  {facts(E)}

  <h2>{E['demo_h']}</h2>
  <p>{E['demo_p']}</p>
  <div class="actions">
    <button type="button" class="btn btn--quiet" id="show-banner">{E['demo_reset']}</button>
    <button type="button" class="btn btn--quiet" data-consent-action="settings">{E['demo_settings']}</button>
  </div>

  {builder_page.section('en')}

  <h2>{E['law_h']}</h2>
  <p>{E['law_p']}</p>
  {rules(E['law'])}

  <h2>{E['a11y_h']}</h2>
  <p>{E['a11y_p']}</p>
  {rules(E['a11y'])}

  <h2>{E['install_h']}</h2>
  {rules(E['install'])}

  <h2>{E['test_h']}</h2>
  <p>{E['test_p']}</p>
  <ol class="rules rules--plain">{"".join(f"<li><span>{html.escape(t)}</span></li>" for t in E['test'])}</ol>

  <p class="caveat"><strong>{E['caveat_b']}</strong> {E['caveat']}</p>

  <h2>{E['dev_h']}</h2>
  <p>{E['dev_p']}</p>

  <h3>{E['files_h']}</h3>
  <p>Take every file at once, or one at a time.</p>
  <div class="actions">
    <button type="button" class="btn" id="download-all">Download all files (.zip)</button>
  </div>
  <p class="status" role="status" id="dl-status"></p>
  {block("Stylesheet", "consent.css")}
  {block("Script", "consent.js")}
  {block("Markup, English", "consent.en.html")}
  {block("Markup, German", "consent.de.html")}

  <h3>{E['api_h']}</h3>
  <p>{E['api_p']}</p>
  <section class="code" aria-label="API example"><pre tabindex="0"><code>{html.escape(API_EXAMPLE)}</code></pre></section>

  <h3>{E['theme_h']}</h3>
  <p>{E['theme_p']}</p>

  {spec.section("en", banner_live, dialog_live, h_open="<h3>", h_close="</h3>", sub="h4")}

  <h3>{E['crit_h']}</h3>
  <p>{E['crit_p']}</p>
  {rules(E['crit'])}

  <footer>
    <span>BarrierFreeWeb, Berlin. Free to copy, change and ship.</span>
    <span id="policy">On a real site the banner's policy link points at your privacy policy.</span>
    {reopen_live}
  </footer>
</main>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>
{js_src}
</script>
<script>
{builder_src}
</script>
<script>
(function () {{
  var status = document.getElementById("dl-status");
  function say(t) {{ status.textContent = t; }}
  function text(name) {{ return document.getElementById(name).textContent; }}
  /* Inside the claude.ai viewer the page saves through its downloads
     capability (viewer confirms each file). Anywhere else, a plain link. */
  var viewerSave = (window.claude && window.claude.use) ? window.claude.use("downloads") : Promise.resolve(null);
  function plainSave(blob, name) {{
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () {{ URL.revokeObjectURL(a.href); }}, 2000);
    say(name + " downloaded. If nothing happened, your browser blocked it: use Copy instead.");
  }}
  function save(blob, name) {{
    viewerSave.then(function (dl) {{
      if (!dl) return plainSave(blob, name);
      dl.save({{ filename: name, data: blob }}).then(function () {{ say(name + " saved."); }}, function (err) {{
        if (err && err.code === "rejected_extension" && window.JSZip) {{
          var z = new JSZip(); z.file(name, blob);
          z.generateAsync({{ type: "blob" }}).then(function (b) {{ return dl.save({{ filename: name + ".zip", data: b }}); }})
            .then(function () {{ say(name + ".zip saved."); }}, function () {{ say("Not saved. Use Copy instead."); }});
        }} else if (err && err.code === "declined") say("Not saved.");
        else say("Not saved. Use Copy instead.");
      }});
    }});
  }}
  document.querySelectorAll("[data-download]").forEach(function (b) {{
    b.addEventListener("click", function () {{ save(new Blob([text(b.dataset.download)], {{ type: "text/plain" }}), b.dataset.download); }});
  }});
  document.querySelectorAll("[data-copy]").forEach(function (b) {{
    b.addEventListener("click", function () {{
      var t = text(b.dataset.copy);
      var done = function () {{ var was = b.textContent; b.textContent = "Copied"; setTimeout(function () {{ b.textContent = was; }}, 1500); }};
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () {{ fallback(); }});
      else fallback();
      function fallback() {{ var r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); var s = getSelection(); s.removeAllRanges(); s.addRange(r); say("Text selected. Press Ctrl+C or Cmd+C to copy."); }}
    }});
  }});
  document.getElementById("download-all").addEventListener("click", function () {{
    if (!window.JSZip) {{ say("The zip library did not load. Download the files one by one below."); return; }}
    var zip = new JSZip();
    {json.dumps(FILES)}.forEach(function (n) {{ zip.file(n, text(n)); }});
    zip.generateAsync({{ type: "blob" }}).then(function (b) {{ save(b, "accessible-consent-banner.zip"); }});
  }});
  document.getElementById("show-banner").addEventListener("click", function () {{ consent.reset(); }});
}})();
</script>
'''
(KIT / "index.html").write_text("<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n<meta name=\"description\" content=\"" + html.escape(E["desc"]) + "\">\n<title>Accessible Consent Banner</title>\n</head>\n<body>\n" + page + "</body>\n</html>\n")
(KIT / "artifact.html").write_text(TITLE + page)
print("wrote cookie-banner/index.html and artifact.html")
