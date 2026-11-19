"""The "Make yours" section: a form that writes the banner for one site.
build.py puts it on en/ and de/cookie-banner.html and on the standalone
page. Behaviour is in builder.js; this file holds the form and every word
the builder writes, in both languages."""
import html, json

# Wording of the generated banner. Mirrors consent.en.html / consent.de.html;
# change both together.
GEN = {
 "en": dict(
  lowerInSentence=True, and_="and",
  c1="<!-- 1. The banner. Place it directly after your skip link, before the\n        header, so it is the first thing a screen reader meets and the\n        first Tab stop after \"Skip to content\". -->",
  c2="<!-- 2. The settings dialog. Anywhere in the body. -->",
  c3="<!-- 3. The way back. In the footer of every page, forever. -->",
  c4="<!-- 4. Scripts that wait for consent. Point src at your real scripts. -->",
  title="Cookies on this site",
  textNeed="We use necessary cookies to keep the site working.",
  textAsk="With your permission, we also use cookies for {purposes}.",
  textChange="Change your choice any time under “Cookie settings” in the footer.",
  policy="Privacy policy", policyDefault="/privacy/",
  accept="Accept all", acceptMsg="All cookies accepted.",
  reject="Reject all", rejectMsg="Only necessary cookies are in use.",
  settings="Settings", dialogTitle="Cookie settings",
  dialogIntro="Choose which cookies we may use. Necessary cookies are always on, because the site cannot work without them.",
  legend="Cookie categories", necessary="Necessary", always="always on",
  necessaryText="We store your cookie choice and keep the site working. Set by this site only.",
  save="Save choices", saveMsg="Your cookie choice is saved.", cancel="Cancel",
  scriptPlaceholder="/js/your-script.js",
  categories=[
   dict(name="analytics", label="Measurement", phrase="measurement", text="We count visits and see which pages people use, so we can improve them. Not used for advertising."),
   dict(name="media", label="Embedded media", phrase="embedded media", text="We show videos and maps from other providers. They set their own cookies when the content loads."),
   dict(name="marketing", label="Advertising", phrase="advertising", text="Our advertising partners show you ads based on the pages you visit here and on other sites."),
   dict(name="preferences", label="Preferences", phrase="remembering your preferences", text="We remember settings you choose, such as language or region, between visits."),
  ],
 ),
 "de": dict(
  lowerInSentence=False, and_="und",
  c1="<!-- 1. Das Banner. Direkt nach dem Sprunglink, vor dem Header: so ist es\n        das Erste, was ein Screenreader liest, und der erste Tabstopp nach\n        „Zum Inhalt springen“. -->",
  c2="<!-- 2. Der Einstellungsdialog. Irgendwo im Body. -->",
  c3="<!-- 3. Der Weg zurück. In der Fußzeile jeder Seite, dauerhaft. -->",
  c4="<!-- 4. Skripte, die auf Einwilligung warten. src auf Ihre echten Skripte setzen. -->",
  title="Cookies auf dieser Website",
  textNeed="Wir verwenden notwendige Cookies, damit die Website funktioniert.",
  textAsk="Mit Ihrer Erlaubnis verwenden wir auch Cookies für {purposes}.",
  textChange="Ändern Sie Ihre Wahl jederzeit unter „Cookie-Einstellungen“ in der Fußzeile.",
  policy="Datenschutzerklärung", policyDefault="/datenschutz/",
  accept="Alle akzeptieren", acceptMsg="Alle Cookies akzeptiert.",
  reject="Alle ablehnen", rejectMsg="Nur notwendige Cookies werden verwendet.",
  settings="Einstellungen", dialogTitle="Cookie-Einstellungen",
  dialogIntro="Wählen Sie, welche Cookies wir verwenden dürfen. Notwendige Cookies sind immer aktiv, weil die Website ohne sie nicht funktioniert.",
  legend="Cookie-Kategorien", necessary="Notwendig", always="immer aktiv",
  necessaryText="Wir speichern Ihre Cookie-Wahl und halten die Website funktionsfähig. Nur von dieser Website gesetzt.",
  save="Auswahl speichern", saveMsg="Ihre Cookie-Wahl ist gespeichert.", cancel="Abbrechen",
  scriptPlaceholder="/js/ihr-skript.js",
  categories=[
   dict(name="analytics", label="Messung", phrase="Messung", text="Wir zählen Besuche und sehen, welche Seiten genutzt werden, damit wir sie verbessern können. Nicht für Werbung."),
   dict(name="media", label="Eingebettete Medien", phrase="eingebettete Medien", text="Wir zeigen Videos und Karten anderer Anbieter. Diese setzen eigene Cookies, wenn der Inhalt geladen wird."),
   dict(name="marketing", label="Werbung", phrase="Werbung", text="Unsere Werbepartner zeigen Ihnen Anzeigen passend zu den Seiten, die Sie hier und auf anderen Websites besuchen."),
   dict(name="preferences", label="Präferenzen", phrase="Ihre Präferenzen", text="Wir merken uns Einstellungen, die Sie wählen, etwa Sprache oder Region, bis zum nächsten Besuch."),
  ],
 ),
}

# The builder's own interface.
UI = {
 "en": dict(
  h="Make yours",
  p="Answer four questions. You get the banner as three files. Nothing you type leaves this page.",
  step="Step {n}:", s1="Describe your site", s2="Check the preview", s3="Take your files",
  lang="Language of the banner", policy="Link to your privacy policy", policy_hint="For example /privacy/ or a full web address.",
  cats="Which other cookies does your site use?", cats_hint="Tick only what you use. Say in your own words what each one does.",
  describe="What it does", own="Another category (optional)", own_label="Name", own_text="What it does",
  colours="Colours (light mode)", colours_hint="Dark mode keeps our colours.",
  bg="Background", text="Text", button="Buttons and links",
  none="If your site only uses necessary cookies, you need no banner. Tick a box if you use any others.",
  contrast="Can people read it?", preview="Preview", preview_hint="Click around, or use Tab and Escape.",
  code_hint="Give these three files to your developer. Their steps are at the end of this page.", show_code="Show the code", copy_file="Copy", f_html="The banner", f_css="Its look", f_js="Its script", download="Download all three files",
  ui=dict(
   c_text="Text on the background", c_button_text="Button text on the button", c_button_edge="Button against the background",
   c_link="Policy link on the background",
   pass_="readable", fail="too faint, needs {need}:1",
   failSay="{n} colour pair is hard to read. See the list.", failSayMany="{n} colour pairs are hard to read. See the list.", readySay="Banner updated. All colours are readable.",
   noneSay="No other cookies, so no banner is needed.",
   cssNote="Your colours, light mode. Written by the builder.",
   previewTitle="Banner preview", previewPage="Your page goes here.",
   copied="{name} copied.", notCopied="Code selected. Press Ctrl+C or Cmd+C to copy it.",
   saved="{name} saved.", notSaved="Not saved. Use Copy instead.",
  ),
 ),
 "de": dict(
  h="Ihr eigenes Banner",
  p="Beantworten Sie vier Fragen. Sie erhalten das Banner als drei Dateien. Ihre Eingaben verlassen diese Seite nicht.",
  step="Schritt {n}:", s1="Beschreiben Sie Ihre Website", s2="Vorschau prüfen", s3="Dateien übernehmen",
  lang="Sprache des Banners", policy="Link zu Ihrer Datenschutzerklärung", policy_hint="Zum Beispiel /datenschutz/ oder eine vollständige Webadresse.",
  cats="Welche weiteren Cookies nutzt Ihre Website?", cats_hint="Kreuzen Sie nur an, was Sie nutzen. Sagen Sie in eigenen Worten, was jedes tut.",
  describe="Was sie tut", own="Weitere Kategorie (optional)", own_label="Name", own_text="Was sie tut",
  colours="Farben (heller Modus)", colours_hint="Der dunkle Modus behält unsere Farben.",
  bg="Hintergrund", text="Text", button="Buttons und Links",
  none="Nutzt Ihre Website nur notwendige Cookies, brauchen Sie kein Banner. Kreuzen Sie an, wenn Sie weitere nutzen.",
  contrast="Ist es gut lesbar?", preview="Vorschau", preview_hint="Klicken Sie herum oder nutzen Sie Tab und Escape.",
  code_hint="Geben Sie diese drei Dateien Ihrer Entwicklung. Die Schritte dafür stehen am Ende der Seite.", show_code="Code anzeigen", copy_file="Kopieren:", f_html="Das Banner", f_css="Sein Aussehen", f_js="Sein Skript", download="Alle drei Dateien herunterladen",
  ui=dict(
   c_text="Text auf dem Hintergrund", c_button_text="Buttontext auf dem Button", c_button_edge="Button gegen den Hintergrund",
   c_link="Datenschutz-Link auf dem Hintergrund",
   pass_="gut lesbar", fail="zu blass, braucht {need}:1",
   failSay="{n} Farbpaar ist schwer lesbar. Siehe die Liste.", failSayMany="{n} Farbpaare sind schwer lesbar. Siehe die Liste.", readySay="Banner aktualisiert. Alle Farben sind gut lesbar.",
   noneSay="Keine weiteren Cookies, daher ist kein Banner nötig.",
   cssNote="Ihre Farben, heller Modus. Vom Generator geschrieben.",
   previewTitle="Banner-Vorschau", previewPage="Hier steht Ihre Seite.",
   copied="{name} kopiert.", notCopied="Code markiert. Drücken Sie Strg+C oder Cmd+C zum Kopieren.",
   saved="{name} gespeichert.", notSaved="Nicht gespeichert. Nutzen Sie Kopieren.",
  ),
 ),
}

CSS = """
.builder { display: grid; gap: 24px; margin-block: 16px 32px; }
.builder fieldset { border: 1px solid currentColor; border-radius: 2px; padding: 16px; margin: 0; display: grid; gap: 16px; min-width: 0; }
.builder legend { font-size: 18px; font-weight: 500; padding-inline: 4px; }
.builder .hint { font-size: 15px; margin: 0; opacity: 0.85; }
.builder .field { display: grid; gap: 4px; }
.builder label { font-size: 18px; }
.builder input[type="text"], .builder textarea { font: inherit; font-size: 18px; letter-spacing: 0.01em; color: inherit; background: transparent; border: 1px solid currentColor; border-radius: 2px; padding: 8px 12px; min-height: 48px; width: 100%; }
.builder textarea { min-height: 96px; resize: vertical; }
.builder .check, .builder .radio { display: flex; gap: 12px; align-items: center; min-height: 48px; }
.builder .check input, .builder .radio input { width: 24px; height: 24px; margin: 0; flex: none; }
.builder .colour { display: flex; gap: 12px; align-items: center; min-height: 48px; }
.builder input[type="color"] { width: 64px; height: 48px; padding: 0; border: 1px solid currentColor; border-radius: 2px; background: transparent; }
.builder .colours { display: flex; flex-wrap: wrap; gap: 8px 32px; }
.builder .cat-row { display: grid; gap: 4px; padding-inline-start: 36px; }
.builder-result { display: grid; gap: 16px; }
.builder-result h4 { font-size: 18px; font-weight: 500; margin: 8px 0 0; }
.builder-result h3 { font-size: 18px; font-weight: 500; margin: 16px 0 0; }
.builder-result ul { margin: 0; padding-inline-start: 24px; }
.builder-result iframe { width: 100%; height: 480px; border: 1px solid currentColor; border-radius: 2px; background: #f4f4f4; }
.builder-result pre { max-height: 420px; overflow: auto; font-size: 15px; }
.builder-code summary { font-size: 18px; min-height: 48px; display: flex; align-items: center; cursor: pointer; }
.builder-code[open] > summary { margin-bottom: 16px; }
.builder-code { display: grid; gap: 16px; }
.builder-actions { display: flex; flex-wrap: wrap; gap: 12px; }
.builder-actions button { font: inherit; font-size: 18px; letter-spacing: 0.01em; min-height: 48px; padding: 0 20px; border: 2px solid currentColor; border-radius: 2px; background: transparent; color: inherit; cursor: pointer; }
.builder .cat-row[hidden], .builder-result[hidden] { display: none; }
.builder-actions button:focus-visible, .builder input:focus-visible, .builder textarea:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
"""

def strings(default):
    out = {"defaultLang": default}
    for k, g in GEN.items():
        g = dict(g); g["and"] = g.pop("and_")
        out[k] = g
    ui = dict(UI[default]["ui"]); ui["pass"] = ui.pop("pass_")
    out["ui"] = ui
    # Safe inside <script>: no "</" can close it early.
    return json.dumps(out, ensure_ascii=False).replace("</", "<\\/")

def section(lang, heading="h2"):
    U, G = UI[lang], GEN[lang]
    e = html.escape
    cats = "".join(f'''
      <div class="check"><input type="checkbox" id="cat-{c['name']}" name="cat-{c['name']}"{' checked' if c['name'] == 'analytics' else ''}>
        <label for="cat-{c['name']}" id="label-{c['name']}">{e(c['label'])}</label></div>
      <div class="cat-row field" id="row-{c['name']}">
        <label for="text-{c['name']}">{e(U['describe'])}</label>
        <textarea id="text-{c['name']}" name="text-{c['name']}">{e(c['text'])}</textarea>
      </div>''' for c in G["categories"])
    langs = "".join(f'''
      <div class="radio"><input type="radio" id="lang-{k}" name="lang" value="{k}"{' checked' if k == lang else ''}>
        <label for="lang-{k}" lang="{k}">{name}</label></div>''' for k, name in (("en", "English"), ("de", "Deutsch")))
    def step(n, title):
        return f'''<h3 class="step-head"><span class="step-num" aria-hidden="true">{e(U['step'].format(n=n))}</span> {e(title)}</h3>'''
    return f'''<{heading} id="make">{e(U['h'])}</{heading}>
    <p>{e(U['p'])}</p>
    <style>{CSS}</style>
    {step(1, U['s1'])}
    <form class="builder" id="builder" novalidate>
      <fieldset><legend>{e(U['lang'])}</legend>{langs}
      </fieldset>
      <div class="field">
        <label for="policy">{e(U['policy'])}</label>
        <p class="hint" id="policy-hint">{e(U['policy_hint'])}</p>
        <input type="text" id="policy" name="policy" value="{e(G['policyDefault'])}" aria-describedby="policy-hint" autocomplete="url" spellcheck="false">
      </div>
      <fieldset aria-describedby="cats-hint"><legend>{e(U['cats'])}</legend>
        <p class="hint" id="cats-hint">{e(U['cats_hint'])}</p>{cats}
        <div class="field"><label for="own-label">{e(U['own'])}: {e(U['own_label'])}</label>
          <input type="text" id="own-label" name="own-label"></div>
        <div class="field"><label for="own-text">{e(U['own'])}: {e(U['own_text'])}</label>
          <textarea id="own-text" name="own-text"></textarea></div>
      </fieldset>
      <fieldset aria-describedby="colours-hint"><legend>{e(U['colours'])}</legend>
        <p class="hint" id="colours-hint">{e(U['colours_hint'])}</p>
        <div class="colours">
          <div class="colour"><input type="color" id="c-bg" name="bg" value="#ffffff"><label for="c-bg">{e(U['bg'])}</label></div>
          <div class="colour"><input type="color" id="c-text" name="text" value="#1a1a1a"><label for="c-text">{e(U['text'])}</label></div>
          <div class="colour"><input type="color" id="c-button" name="button" value="#1a1a1a"><label for="c-button">{e(U['button'])}</label></div>
        </div>
      </fieldset>
    </form>
    <p class="builder-status" role="status" id="builder-status"></p>
    <p id="builder-none" hidden>{e(U['none'])}</p>
    <div class="builder-result" id="builder-result">
      {step(2, U['s2'])}
      <h4>{e(U['contrast'])}</h4>
      <ul id="builder-contrast"></ul>
      <h4>{e(U['preview'])}</h4>
      <p class="hint">{e(U['preview_hint'])}</p>
      <iframe id="builder-preview" title="{e(U['ui']['previewTitle'])}"></iframe>
      {step(3, U['s3'])}
      <div class="builder-actions">
        <button type="button" id="builder-download">{e(U['download'])}</button>
      </div>
      <p>{e(U['code_hint'])}</p>
      <details class="builder-code">
        <summary>{e(U['show_code'])}</summary>
        <h4 class="builder-file">{e(U['f_html'])}, consent.html</h4>
        <div class="builder-actions"><button type="button" data-builder-copy="builder-output">{e(U['copy_file'])} consent.html</button></div>
        <pre tabindex="0" aria-label="consent.html"><code id="builder-output"></code></pre>
        <h4 class="builder-file">{e(U['f_css'])}, consent.css</h4>
        <div class="builder-actions"><button type="button" data-builder-copy="builder-css">{e(U['copy_file'])} consent.css</button></div>
        <pre tabindex="0" aria-label="consent.css"><code id="builder-css"></code></pre>
        <h4 class="builder-file">{e(U['f_js'])}, consent.js</h4>
        <div class="builder-actions"><button type="button" data-builder-copy="builder-js">{e(U['copy_file'])} consent.js</button></div>
        <pre tabindex="0" aria-label="consent.js"><code id="builder-js"></code></pre>
      </details>
    </div>
    <script type="application/json" id="builder-strings">{strings(lang)}</script>'''
