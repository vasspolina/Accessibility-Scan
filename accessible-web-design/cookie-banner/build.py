#!/usr/bin/env python3
"""Builds en/cookie-banner.html and de/cookie-banner.html from the kit files.
Run after editing consent.css / consent.js / consent.*.html."""
import html, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import spec
import builder_page

ROOT = pathlib.Path(__file__).resolve().parent.parent
KIT = ROOT / "cookie-banner"

def esc(name):
    return html.escape((KIT / name).read_text())

def code(title, meta, name, lang):
    return f'''<details class="code-block" open>
  <summary>{title} <span class="meta">{meta}</span></summary>
  <div class="code-tools"><button type="button" class="copy" data-copy="{name}" data-copied="{lang['copied']}">{lang['copy']}</button></div>
  <pre tabindex="0"><code id="{name}">{esc(name)}</code></pre>
</details>'''

L = {
 "en": dict(
  lang="en", other="de", path="en/cookie-banner.html", snippet="consent.en.html",
  title="Accessible cookie banner template — BarrierFreeWeb",
  desc="A cookie consent banner for EU websites that screen readers can read past, keyboards can operate and regulators accept. Free HTML, CSS and JavaScript.",
  skip="Skip to content", back="Back to the site", copy="Copy", copied="Copied",
  h1="A cookie banner everyone can get past.",
  lede="Most consent banners in the EU fail twice: they steer people toward “Accept”, and they stop screen-reader and keyboard users from reaching the page at all. This template does neither. Take it, restyle it, ship it.",
  demo_h="See it work",
  demo_p="The banner on this page is the template itself, in this site's colours. Press the button to bring it back, then try it with Tab, Escape and a screen reader.",
  demo_reset="Show the banner again", demo_settings="Open the settings",
  law_h="What EU law asks of a banner",
  law_p="These are the requirements of the GDPR (Articles 4(11) and 7), the ePrivacy Directive (Article 5(3)) and the EDPB's consent guidelines and its 2023 cookie banner taskforce report, as they apply to the banner itself.",
  law=[
   ("Refusing is as easy as accepting.", "A “Reject all” button on the first layer, the same size and colour as “Accept all”. Not a link in the small print, not a second screen."),
   ("Nothing is pre-ticked.", "Every optional category starts off. Only strictly necessary cookies are on, and the banner says so in words."),
   ("No consent is set until a choice is made.", "Scrolling, closing or ignoring the banner is not consent. Scripts that need consent wait for it."),
   ("Withdrawing is as easy as giving.", "A “Cookie settings” control in the footer of every page reopens the dialog. The stored choice can be changed in two clicks."),
   ("The banner says what the cookies do.", "Plain words per category: what is collected, by whom, and why. No “we value your privacy”, no illustrations of biscuits."),
   ("The site stays usable without consent.", "No cookie wall. The page behind the banner can be read and used by someone who refuses."),
  ],
  a11y_h="What accessibility asks of it",
  a11y_p="The design decisions below are the ones that matter in practice. Each maps to a WCAG 2.2 criterion that the European Accessibility Act, through EN 301 549, makes mandatory.",
  a11y=[
   ("It is not a modal.", "The first layer is a labelled region, not a dialog. The page is not made inert, focus is not stolen, and nothing is trapped. A screen reader meets the banner first, hears what it is, and can keep reading the site. (WCAG 2.1.2, 2.4.3)"),
   ("It covers at most 60% of the screen.", "The banner sits at the bottom and the page gets matching padding, so nothing is hidden behind it, including at 400% zoom and 320px wide. (1.4.10)"),
   ("Escape means “continue without consent”.", "A keyboard user who presses Escape inside the banner gets the lawful outcome: only necessary cookies, choice stored, no nagging on the next page. (2.1.1)"),
   ("The settings are a native dialog.", "The second layer uses the HTML dialog element. The browser provides the focus trap, the Escape key and the inert background, and gives focus back to the control that opened it. (2.4.3, 4.1.2)"),
   ("Controls are real controls.", "Buttons are button elements, categories are checkboxes inside a fieldset with a legend, every input has a visible label. Nothing is a div with a click handler. (1.3.1, 4.1.2)"),
   ("Everything is 48px tall and 18px big.", "Buttons and checkboxes meet the 24px target minimum with room to spare; the smallest text is 15px. (2.5.8, 1.4.4)"),
   ("Focus is visible everywhere.", "A 2px ring with a 1px inner contrast line, in both colour schemes and in Windows high contrast. (2.4.7, 2.4.11)"),
   ("Colours pass in both schemes.", "Text is at least 4.5:1 and borders at least 3:1 against the background, in light and dark mode, and the result is announced to a live region so a screen reader hears it. (1.4.3, 1.4.11, 4.1.3)"),
   ("Motion respects the setting.", "The entrance slide runs only when the user has not asked for reduced motion. (2.3.3)"),
   ("Words live in the markup.", "Translating the banner is editing the HTML. The script reads no strings, so no language is hard-coded. The German version is on this site's German page."),
  ],
  code_h="The code",
  code_p="Three files and a snippet. Copy the files to your site, paste the markup where the comments say, change the privacy-policy link and the category texts, and mark each script that needs consent with its category.",
  files_h="Download", files_p="The same files, ready to save:",
  api_h="Using the choice in your own code",
  api_p="The script exposes a small API and an event. A script written as text/plain with a data-consent attribute is switched on the moment that category is allowed, including on later visits.",
  test_h="Before you publish, test it",
  test=[
   "Tab from the address bar. The first stops are the skip link, then “Accept all”, “Reject all”, “Settings”. Nothing is skipped and nothing traps.",
   "Press Escape in the banner. It closes, the page gets no analytics, and reloading does not bring it back.",
   "Open Settings and press Escape. The dialog closes, focus returns to the Settings button, nothing has changed.",
   "Turn on VoiceOver or NVDA and reload. The banner is announced as a region with its heading. Arrow past it: the page reads.",
   "Zoom to 400% and set the window to 320px wide. Every button is reachable; the page content is not hidden behind the banner.",
   "Switch the system to dark mode and to Windows high contrast. Both buttons still have borders and the focus ring is visible.",
   "Clear site data. The banner is back, every optional box is off.",
  ],
  footer_statement="Accessibility statement", footer_contact="Contact",
 ),
 "de": dict(
  lang="de", other="en", path="de/cookie-banner.html", snippet="consent.de.html",
  title="Barrierefreies Cookie-Banner als Vorlage — BarrierFreeWeb",
  desc="Ein Cookie-Banner für EU-Websites, das Screenreader lesen, Tastaturen bedienen und Aufsichtsbehörden akzeptieren. Kostenlos als HTML, CSS und JavaScript.",
  skip="Zum Inhalt springen", back="Zurück zur Website", copy="Kopieren", copied="Kopiert",
  h1="Ein Cookie-Banner, an dem niemand hängen bleibt.",
  lede="Die meisten Einwilligungsbanner in der EU scheitern zweimal: Sie drängen zu „Akzeptieren“, und sie hindern Screenreader- und Tastaturnutzer daran, die Seite überhaupt zu erreichen. Diese Vorlage tut beides nicht. Nehmen, umfärben, veröffentlichen.",
  demo_h="So funktioniert es",
  demo_p="Das Banner auf dieser Seite ist die Vorlage selbst, in den Farben dieser Website. Holen Sie es mit dem Button zurück und probieren Sie es mit Tab, Escape und einem Screenreader.",
  demo_reset="Banner erneut anzeigen", demo_settings="Einstellungen öffnen",
  law_h="Was das EU-Recht von einem Banner verlangt",
  law_p="Das sind die Anforderungen der DSGVO (Artikel 4 Nr. 11 und 7), der ePrivacy-Richtlinie (Artikel 5 Absatz 3) sowie der Einwilligungsleitlinien des EDSA und seines Cookie-Banner-Taskforce-Berichts von 2023, soweit sie das Banner selbst betreffen.",
  law=[
   ("Ablehnen ist so einfach wie Akzeptieren.", "Ein Button „Alle ablehnen“ auf der ersten Ebene, in Größe und Farbe gleich mit „Alle akzeptieren“. Kein Link im Kleingedruckten, keine zweite Ebene."),
   ("Nichts ist vorangekreuzt.", "Jede optionale Kategorie beginnt ausgeschaltet. Nur unbedingt notwendige Cookies sind aktiv, und das Banner sagt es in Worten."),
   ("Ohne Entscheidung wird nichts gesetzt.", "Scrollen, Schließen oder Ignorieren ist keine Einwilligung. Skripte, die eine Einwilligung brauchen, warten darauf."),
   ("Widerrufen ist so einfach wie Erteilen.", "Ein Bedienelement „Cookie-Einstellungen“ in der Fußzeile jeder Seite öffnet den Dialog erneut. Die gespeicherte Wahl ist in zwei Klicks geändert."),
   ("Das Banner sagt, was die Cookies tun.", "Klare Worte pro Kategorie: was erhoben wird, von wem und warum. Kein „Ihre Privatsphäre ist uns wichtig“, keine Keksbilder."),
   ("Die Website bleibt ohne Einwilligung nutzbar.", "Keine Cookie-Wall. Wer ablehnt, kann die Seite hinter dem Banner lesen und benutzen."),
  ],
  a11y_h="Was die Barrierefreiheit verlangt",
  a11y_p="Die folgenden Entscheidungen sind die, die in der Praxis zählen. Jede entspricht einem Kriterium der WCAG 2.2, das das Barrierefreiheitsstärkungsgesetz über die EN 301 549 verbindlich macht.",
  a11y=[
   ("Es ist kein Modal.", "Die erste Ebene ist eine beschriftete Region, kein Dialog. Die Seite wird nicht inert, der Fokus wird nicht entführt, nichts wird eingesperrt. Ein Screenreader trifft das Banner zuerst, hört, was es ist, und kann die Seite weiterlesen. (WCAG 2.1.2, 2.4.3)"),
   ("Es bedeckt höchstens 60 % des Bildschirms.", "Das Banner sitzt unten, die Seite bekommt passenden Abstand, sodass nichts dahinter verschwindet, auch bei 400 % Zoom und 320 px Breite. (1.4.10)"),
   ("Escape heißt „ohne Einwilligung weiter“.", "Wer in dem Banner Escape drückt, bekommt das rechtmäßige Ergebnis: nur notwendige Cookies, Wahl gespeichert, kein Nachfragen auf der nächsten Seite. (2.1.1)"),
   ("Die Einstellungen sind ein nativer Dialog.", "Die zweite Ebene nutzt das HTML-Element dialog. Der Browser liefert Fokusfalle, Escape-Taste und inerten Hintergrund und gibt den Fokus an das öffnende Element zurück. (2.4.3, 4.1.2)"),
   ("Bedienelemente sind echte Bedienelemente.", "Buttons sind button-Elemente, Kategorien sind Checkboxen in einem fieldset mit legend, jedes Eingabefeld hat eine sichtbare Beschriftung. Nichts ist ein div mit Klick-Handler. (1.3.1, 4.1.2)"),
   ("Alles ist 48 px hoch und 18 px groß.", "Buttons und Checkboxen übertreffen die Mindestzielgröße von 24 px deutlich; der kleinste Text hat 15 px. (2.5.8, 1.4.4)"),
   ("Der Fokus ist überall sichtbar.", "Ein 2-px-Ring mit 1 px innerer Kontrastlinie, in beiden Farbschemata und im Windows-Kontrastmodus. (2.4.7, 2.4.11)"),
   ("Die Farben bestehen in beiden Schemata.", "Text hat mindestens 4,5:1, Rahmen mindestens 3:1 zum Hintergrund, hell wie dunkel. Das Ergebnis wird in eine Live-Region geschrieben, damit ein Screenreader es hört. (1.4.3, 1.4.11, 4.1.3)"),
   ("Bewegung respektiert die Einstellung.", "Die Einblendung läuft nur, wenn keine reduzierte Bewegung gewünscht ist. (2.3.3)"),
   ("Die Wörter stehen im Markup.", "Übersetzen heißt HTML bearbeiten. Das Skript enthält keine Texte, keine Sprache ist fest verdrahtet. Die englische Fassung steht auf der englischen Seite."),
  ],
  code_h="Der Code",
  code_p="Drei Dateien und ein Schnipsel. Kopieren Sie die Dateien auf Ihre Website, fügen Sie das Markup ein, wo die Kommentare es sagen, ändern Sie den Link zur Datenschutzerklärung und die Kategorietexte, und kennzeichnen Sie jedes Skript, das Einwilligung braucht, mit seiner Kategorie.",
  files_h="Herunterladen", files_p="Dieselben Dateien, zum Speichern:",
  api_h="Die Wahl im eigenen Code nutzen",
  api_p="Das Skript stellt eine kleine API und ein Ereignis bereit. Ein Skript mit type text/plain und einem data-consent-Attribut wird eingeschaltet, sobald die Kategorie erlaubt ist, auch bei späteren Besuchen.",
  test_h="Vor dem Veröffentlichen testen",
  test=[
   "Mit Tab von der Adressleiste aus. Die ersten Stopps sind der Sprunglink, dann „Alle akzeptieren“, „Alle ablehnen“, „Einstellungen“. Nichts wird übersprungen, nichts hält fest.",
   "Escape im Banner drücken. Es schließt sich, die Seite lädt keine Analyse, und ein Neuladen bringt es nicht zurück.",
   "Einstellungen öffnen und Escape drücken. Der Dialog schließt sich, der Fokus kehrt zum Button „Einstellungen“ zurück, nichts hat sich geändert.",
   "VoiceOver oder NVDA einschalten und neu laden. Das Banner wird als Region mit seiner Überschrift angesagt. Mit den Pfeiltasten daran vorbei: die Seite wird gelesen.",
   "Auf 400 % zoomen und das Fenster auf 320 px Breite setzen. Jeder Button ist erreichbar; der Seiteninhalt verschwindet nicht hinter dem Banner.",
   "System auf Dunkelmodus und auf Windows-Kontrastmodus stellen. Beide Buttons haben weiterhin Rahmen, der Fokusring ist sichtbar.",
   "Website-Daten löschen. Das Banner ist zurück, jede optionale Box ist aus.",
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

def rules(items):
    return '<ol class="rules">' + "".join(f"<li><span><strong>{html.escape(h)}</strong>{html.escape(p)}</span></li>" for h, p in items) + "</ol>"

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
    other = L["other"]
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

    {spec.section(L['lang'], banner_live, dialog_live)}

    <h2 id="code">{L['code_h']}</h2>
    <p>{L['code_p']}</p>
    {code("HTML", L['snippet'], L['snippet'], L)}
    {code("CSS", "consent.css", "consent.css", L)}
    {code("JavaScript", "consent.js", "consent.js", L)}

    <h3>{L['files_h']}</h3>
    <p>{L['files_p']}
      <a class="link" href="../cookie-banner/consent.css" download>consent.css</a>,
      <a class="link" href="../cookie-banner/consent.js" download>consent.js</a>,
      <a class="link" href="../cookie-banner/consent.en.html" download>consent.en.html</a>,
      <a class="link" href="../cookie-banner/consent.de.html" download>consent.de.html</a></p>

    <h2>{L['api_h']}</h2>
    <p>{L['api_p']}</p>
    <details class="code-block" open>
      <summary>HTML + JavaScript</summary>
      <pre tabindex="0"><code>{html.escape(API_EXAMPLE)}</code></pre>
    </details>

    <h2>{L['test_h']}</h2>
    <ol class="rules">{"".join(f"<li><span>{html.escape(t)}</span></li>" for t in L['test'])}</ol>

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
import json
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
    <h3 id="h-{name}">{title} <span class="meta">{name}</span></h3>
    <div class="code__tools">
      <button type="button" class="btn btn--small" data-copy="{name}">Copy</button>
      <button type="button" class="btn btn--small" data-download="{name}">Download</button>
    </div>
  </div>
  <pre tabindex="0"><code id="{name}">{html.escape(sources[name])}</code></pre>
</section>'''

def rules_ol(items):
    return '<ol class="rules">' + "".join(f"<li><strong>{html.escape(h)}</strong><span>{html.escape(p)}</span></li>" for h, p in items) + "</ol>"

install = [
 ("Download the four files.", "Use the button above for a zip, or take each file below. You need consent.css, consent.js and the snippet in your language; the other language is there for a second locale."),
 ("Put the stylesheet and script on every page.", "Load consent.css before your own stylesheet so your colours win, and consent.js with defer at the end of the body."),
 ("Paste the three pieces of markup where the snippet's comments say.", "The banner goes right after your skip link, before the header. The dialog can sit anywhere in the body. The “Cookie settings” button goes in the footer of every page."),
 ("Edit the words.", "Change the privacy-policy link, and rewrite each category's label and description to say what your cookies really do. Delete a category you do not use; add one by copying a row and giving its input a new name."),
 ("Mark the scripts that need consent.", "Change each one's type to text/plain and add data-consent with the category's name. It is switched on the moment that category is allowed."),
 ("Theme it.", "Override the --consent-* custom properties on .consent and .consent__dialog. Keep text at 4.5:1 and borders at 3:1 in both colour schemes; keep Accept and Reject identical."),
 ("Run the test list at the end of this page.", "Ten minutes with a keyboard and a screen reader. Then publish."),
]

TITLE = "<title>Accessible Consent Banner</title>\n"
page = f'''<style>
/* Layout: one 68ch column of instruction, full-width code blocks, the banner itself live at the bottom. */
:root {{
  --bg: #fbfaf7; --fg: #1d1c1a; --muted: #5b5955; --line: #c9c6bf; --accent: #0b5cad; --surface: #f1efe9; --code: #f4f2ec;
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
h3 {{ font-size: 18px; font-weight: 500; margin: 0; }}
p {{ margin: 0 0 16px; max-width: 68ch; }}
.lede {{ font-size: 18px; color: var(--muted); max-width: 60ch; }}
a {{ color: var(--accent); text-underline-offset: 3px; }}
.meta {{ color: var(--muted); font-weight: 400; font-family: var(--mono); font-size: 15px; }}
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

{spec.CSS}
/* ── the template's own stylesheet, unchanged ── */
{css_src}
</style>

<a class="visually-hidden" href="#main">Skip to content</a>
{banner_live}
{dialog_live}

<div class="wrap">
<main id="main">
  <h1>A cookie banner everyone can get past.</h1>
  <p class="lede">A consent banner for EU websites that a screen reader can read past, a keyboard can operate and a regulator can live with. Four small files, no dependencies, free to use.</p>
  <div class="actions">
    <button type="button" class="btn" id="download-all">Download all four files (.zip)</button>
    <button type="button" class="btn btn--quiet" id="show-banner">Show the banner again</button>
  </div>
  <p class="status" role="status" id="dl-status"></p>
  <p>The banner at the bottom of this page is the template itself. Try it with Tab, Escape and a screen reader before you read on.</p>

  {builder_page.section('en')}

  <h2>Install it in seven steps</h2>
  {rules_ol(install)}

  <h2>The files</h2>
  {block("Stylesheet", "consent.css")}
  {block("Script", "consent.js")}
  {block("Markup, English", "consent.en.html")}
  {block("Markup, German", "consent.de.html")}

  <h2>Using the choice in your own code</h2>
  <p>{E['api_p']}</p>
  <section class="code" aria-label="API example"><pre tabindex="0"><code>{html.escape(API_EXAMPLE)}</code></pre></section>

  <h2>{E['law_h']}</h2>
  <p>{E['law_p']}</p>
  {rules_ol(E['law'])}

  <h2>{E['a11y_h']}</h2>
  <p>{E['a11y_p']}</p>
  {rules_ol(E['a11y'])}

  {spec.section("en", banner_live, dialog_live)}

  <h2>{E['test_h']}</h2>
  <ol class="rules rules--plain">{"".join(f"<li><span>{html.escape(t)}</span></li>" for t in E['test'])}</ol>

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
