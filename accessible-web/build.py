"""Builds the Accessible Web site: python3 build.py

Static pages, no framework. The copy is the studio's own; this file only
places it. Every page has the same shape, after a Source Type product page:
a centred two-line title, a gallery of posters on a black stage with a
counter, a narrow column of text, and a Related grid.

The English name is Accessible Web; BarrierFreeWeb is the name in German
only, so a German build swaps BRAND, TAG and LANG and nothing else.
"""
from pathlib import Path
import posters as P

OUT = Path(__file__).parent
BRAND = "Accessible Web"
TAG = "#AccessibleWeb"
MAIL = "gf@barrierfreeweb.de"
LANG = "en"


def mailto(subject):
    return f"mailto:{MAIL}?subject={subject.replace(' ', '%20')}"


AUDIT = mailto("Accessibility audit")
QUOTE = mailto("Quote request")

NAV = [
    ("index.html", "Home"),
    ("services.html", "Services"),
    ("accessibility.html", "Accessibility"),
    ("about.html", "About"),
    ("journal.html", "Journal"),
]

# what each page shows in the gallery, and its card in Related
PAGES = {}

X_ICON = ('<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">'
          '<path class="stroke" stroke-width="1.6" d="M4,4 L26,26 M26,4 L4,26"/></svg>')
THEME_ICON = ('<svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">'
              '<circle cx="15" cy="15" r="10" stroke-width="1.6"/>'
              '<path d="M15,5 A10,10 0 0,1 15,25Z"/></svg>')


def gallery(keys):
    slides = "".join(
        f'<div class="slide" role="group" aria-roledescription="slide" '
        f'aria-label="{i} of {len(keys)}" data-name="{P.NAMES[k]}">{P.ALL[k]()}</div>'
        for i, k in enumerate(keys, 1))
    steps = len(keys) > 1
    prev = '<button class="step" type="button" data-prev aria-label="Previous poster">←</button>' if steps else "<span></span>"
    nxt = '<button class="step" type="button" data-next aria-label="Next poster">→</button>' if steps else "<span></span>"
    first = P.NAMES[keys[0]]
    return f"""<section class="gallery" data-gallery aria-roledescription="carousel" aria-label="Posters">
  <div class="track" tabindex="0" aria-label="Posters, scroll sideways or use the arrow keys">{slides}</div>
  <div class="count-row">{prev}<p class="count" aria-live="polite">1/{len(keys)} <span class="name">{first}</span></p>{nxt}</div>
</section>"""


def related(slugs):
    cards = ""
    for s in slugs:
        info = PAGES[s]
        cards += (f'<li><a href="{s}"><span class="thumb" aria-hidden="true">{P.ALL[info["poster"]]()}</span>'
                  f'<span class="rname">{info["name"]}</span><span class="rkind">{info["kind"]}</span></a></li>')
    return f'<section class="related" aria-labelledby="rel-h"><h2 id="rel-h">Related</h2><ul>{cards}</ul></section>'


def page(slug, title, second, description, posters_, body, rel):
    menu = "".join(
        f'<li><a href="{h}"{" aria-current=\"page\"" if h == slug else ""}>{l}</a></li>' for h, l in NAV)
    foot_nav = "".join(f'<li><a href="{h}">{l}</a></li>' for h, l in NAV)
    home = ("<span></span>" if slug == "index.html" else
            f'<a class="round" href="index.html" aria-label="Close, back to home">{X_ICON}</a>')
    head_title = f"{BRAND} — websites everyone can use" if slug == "index.html" else f"{title} — {BRAND}"
    html = f"""<!doctype html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{head_title}</title>
<meta name="description" content="{description}">
<script>try{{var t=localStorage.getItem("aw-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<link rel="preload" href="fonts/PPTelegraf-Light.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css">
<script src="theme.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="top">
  {home}
  <nav class="menu" aria-label="Main">
    <button class="pill" type="button" data-menu aria-expanded="false" aria-controls="menu-panel">{BRAND}</button>
    <div class="menu-panel" id="menu-panel" hidden><ul>{menu}</ul></div>
  </nav>
  <button class="round theme-btn" type="button" data-theme-toggle aria-pressed="false" aria-label="Dark theme">{THEME_ICON}</button>
</header>
<main id="main">
<h1 class="title">{title}<span class="second">{second}</span></h1>
{gallery(posters_)}
<div class="text">
{body}
</div>
{related(rel)}
</main>
<footer class="foot">
  <p class="mail"><a href="mailto:{MAIL}">{MAIL}</a></p>
  <nav aria-label="Footer"><ul>{foot_nav}</ul></nav>
  <p class="small">{BRAND}, design studio, Berlin. Built to WCAG 2.2 Level AA.</p>
</footer>
</body>
</html>
"""
    (OUT / slug).write_text(html, encoding="utf-8")


# ---------------------------------------------------------------- helpers
def sec(heading, *parts, kicker=None, sid=None):
    k = f'<p class="kicker">{kicker}</p>' if kicker else ""
    i = f' id="{sid}"' if sid else ""
    return f"<section{i}>{k}<h2>{heading}</h2>{''.join(parts)}</section>"


def p(*paras, cls=None):
    c = f' class="{cls}"' if cls else ""
    return "".join(f"<p{c}>{x}</p>" for x in paras)


def plain(items):
    return '<ul class="plain">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def terms(pairs):
    return '<dl class="terms">' + "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in pairs) + "</dl>"


def cta(href, text):
    return f'<p class="actions"><a class="cta" href="{href}">{text}<span aria-hidden="true">→</span></a></p>'


# ---------------------------------------------------------------- registry
OFFER = [
    ("design-typography.html", "Design and typography"),
    ("ux-ui.html", "UX/UI design"),
    ("brand.html", "Brand development"),
    ("content-strategy.html", "Content strategy"),
    ("copywriting.html", "Copywriting"),
    ("testing.html", "Accessibility testing"),
]

SUB = {
    "design-typography.html": dict(
        name="Design and Typography", poster="perceivable",
        lead="We make sure your content works everywhere, for everyone.",
        terms=[("Text reflow", "Content resizes smoothly across all screen sizes"),
               ("Fluid design", "Flexible layouts that adapt without breaking or losing meaning"),
               ("Semantic markup", "Content organized so screen readers can understand it"),
               ("Alt text", "Written descriptions of images and videos for people using screen readers")]),
    "ux-ui.html": dict(
        name="UX/UI and Web Development", poster="operable",
        lead="We build interfaces that actually work.",
        terms=[("Accessible components", "User interface elements with clear names, roles, and states"),
               ("Robust code", "Compatible with all browsers and assistive technologies"),
               ("Status messages", "Updates and alerts that don’t interfere with assistive technologies"),
               ("Color customization", "Works with any color settings users choose")]),
    "brand.html": dict(
        name="Brand Development", poster="robust",
        lead="Brand identities that are clear, memorable, and work for everyone.",
        terms=[("Logo and visual identity", "Key elements that are memorable and convey your core values"),
               ("Brand voice", "Tone and language that’s authentic to your company and resonates with your audience"),
               ("Brand guidelines", "Comprehensive instructions for maintaining consistency across all touchpoints"),
               ("Optimized typography", "Readable fonts with strategic spacing and hierarchy"),
               ("Contrast optimization", "Visual elements that stand out and meet accessibility standards"),
               ("Strategic use of color", "Colors that ensure clarity"),
               ("Art direction", "Cohesive visual aesthetics aligned with your values")]),
    "content-strategy.html": dict(
        name="Content Strategy", poster="understandable",
        lead="Structure and strategy that makes your content work better with assistive technologies.",
        terms=[("Clear, logical structure", "Content organized with descriptive headings and intuitive flow"),
               ("Consistent navigation", "Predictable, easy-to-understand paths through your site"),
               ("Input assistance", "Clear instructions, error recognition, and helpful correction suggestions"),
               ("Inclusive language", "Respectful, non-discriminatory content that addresses diverse audiences"),
               ("Screen reader optimization", "Logical content order that reads naturally with assistive technology"),
               ("Meaningful descriptions", "Alt text and descriptive links that explain an image’s purpose, not just presence")]),
    "copywriting.html": dict(
        name="Copywriting", poster="speak",
        lead="We believe in simplicity.", intro="Good copy should be:",
        terms=[("Clear", "Concise language without jargon"),
               ("Accessible", "Easy to grasp for a broad audience"),
               ("Scannable", "Short paragraphs with logical breaks and clear bullet points"),
               ("Inclusive", "Respectful and resonant with diverse readers"),
               ("Descriptive", "Links and alt text that explain purpose, not just “click here”"),
               ("Screen reader-friendly", "Logical flow without visual cues like “see below”")]),
    "testing.html": dict(
        name="Accessibility Testing", poster="see",
        lead="In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks.",
        intro="Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites. We test against its four principles:",
        terms=[("Perceivable", "Everyone can access your information, even if they can’t use all their senses"),
               ("Operable", "All your website’s functions work for everyone, no exceptions"),
               ("Understandable", "Your content is clear and your navigation makes sense"),
               ("Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future")]),
}

PAGES.update({
    "index.html": dict(name=BRAND, kind="Home", poster="entrance"),
    "services.html": dict(name="Services", kind="Building websites that work for everyone", poster="operable"),
    "accessibility.html": dict(name="Accessibility", kind="A human right, no exceptions", poster="touch"),
    "about.html": dict(name="About", kind="A design studio in Berlin", poster="entrance"),
    "journal.html": dict(name="Journal", kind="Four newsletters, five posts", poster="robust"),
})
for slug, d in SUB.items():
    PAGES[slug] = dict(name=d["name"], kind="Service", poster=d["poster"])


# ===================================================================== home
def home():
    body = (
        p("We’re a design studio in Berlin building websites that everyone can use.", cls="lead")
        + sec("The European Accessibility Act is here.",
              p('As of <span class="mark">28 June 2025</span>, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines.',
                "Not sure if your site is compliant? We can help."),
              cta(AUDIT, "Request an accessibility audit"))
        + '<p class="question">If everyone can’t use the door, is it truly an entrance?</p>'
    )
    page("index.html", BRAND, "Design studio, Berlin",
         "A design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
         ["entrance", "eaa", "touch", "see", "hear", "speak"], body,
         ["services.html", "accessibility.html", "journal.html"])


# ================================================================= services
def services():
    offer = "".join(f'<li><a href="{h}">{n}</a></li>' for h, n in OFFER)
    body = (
        p("We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.", cls="lead")
        + p("Think of it this way: A door that only opens if you’re exactly 5′10″ isn’t a broken door — it’s a badly designed one. Good design works for everyone.")
        + sec("What we offer", f'<ul class="offer">{offer}</ul>')
        + sec("Our approach",
              terms([("Focused", "Messages are clear, obvious, and impactful"),
                     ("User-centered", "Navigation is smooth, intuitive, and inclusive"),
                     ("Future-proof", "Content is purposeful, adaptable, and cost-effective")]),
              p('Our principles follow the <a href="accessibility.html#principles">Web Content Accessibility Guidelines (WCAG)</a>, the international standard for accessible websites.'))
        + sec("Mobile-first design",
              p("Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions."))
        + sec("Why not just fix your current site?",
              p("Retrofitting older websites — especially those built on HTML 4 or earlier — is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No.",
                "Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance."))
        + sec("The EAA deadline has passed.",
              p('As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach <span class="mark">€100,000</span>.'))
        + sec("Who’s affected",
              plain(["Software, SaaS, and digital services", "Fintech and financial services",
                     "E-commerce, fashion, and retail", "Education and online learning",
                     "Branding and marketing agencies", "Art galleries and museums",
                     "Architecture and design firms", "Travel, restaurants, and hospitality"]),
              p("Companies with fewer than 10 employees and annual revenue under €2 million are exempt.",
                "This exemption does not apply to companies that offer products subject to accessibility requirements, such as:"),
              plain(["websites, apps, and e-commerce platforms",
                     "consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices)."]))
        + sec("But can’t I just use AI?",
              p("No. AI’s great for breakup texts or visa forms — not accessibility compliance.",
                "It can flag missing alt text or contrast errors, but it can’t tell “K-pop band posing with fans” from “group of people.” Real accessibility needs judgment and empathy, which only humans have.",
                "In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks."))
        + sec("Benefits of accessibility compliance",
              plain(["Legal protection", "Improved SEO and discoverability", "Expanded audience reach",
                     "Enhanced brand reputation", "Modern, contemporary design"]))
        + sec("What you get",
              p("A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards — verified through thorough testing."),
              cta(QUOTE, "Request a quote today"))
    )
    page("services.html", "Building websites", "that work for everyone",
         "Accessible web design, UX/UI, brand development, content strategy, copywriting and accessibility testing.",
         ["perceivable", "operable", "understandable", "robust"], body,
         ["design-typography.html", "ux-ui.html", "testing.html"])


def service_pages():
    slugs = [h for h, _ in OFFER]
    for i, slug in enumerate(slugs):
        d = SUB[slug]
        intro = p(d["intro"]) if d.get("intro") else ""
        body = (p(d["lead"], cls="lead") + intro + terms(d["terms"]) + cta(QUOTE, "Request a quote")
                + p('<a href="services.html">All services</a>'))
        others = [slugs[(i + k) % len(slugs)] for k in (1, 2, 3)]
        page(slug, d["name"], f"Service {i + 1:02d} of 06", d["lead"], [d["poster"]], body, others)


# ============================================================ accessibility
def accessibility():
    body = (
        p("Life has moved online. We depend on the internet for work, connection, and daily necessities. It’s our entertainment, but it’s also essential. Everyone needs to be able to use it.", cls="lead")
        + p("Remember: When you build a house, you don’t make the door optional. The same goes for digital access — everyone needs a way in.")
        + sec("Accessibility benefits everyone.",
              p("You’ve probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That’s accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea.",
                "These features weren’t designed exclusively for people with disabilities — they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks.",
                "Good accessible design doesn’t just help some users — it creates a better experience for everyone."))
        + sec("The legal landscape",
              p("As of June 28, 2025, accessibility isn’t optional anymore — it’s the law across Europe. Germany has the BFSG (Barrierefreiheitsstärkungsgesetz, the Accessibility Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet WCAG 2.1 Level AA standards.",
                'What happens if you don’t comply? Fines can reach up to <span class="mark">€100,000</span> in Germany, and over <span class="mark">€1,000,000</span> in some EU countries.',
                "Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren’t fixed."), sid="legal")
        + sec("Who needs accessibility?",
              p("Here’s the thing: accessibility isn’t just for people with permanent disabilities. At some point, we all need these features."),
              terms([("Motor limitations", "Broken arms, carrying groceries, holding a baby"),
                     ("Visual limitations", "Forgot your glasses, cracked phone screen, sun glare on your laptop"),
                     ("Auditory limitations", "Loud café, ear infection, dead headphone battery"),
                     ("Cognitive limitations", "Tired after a long day, stressed and distracted, trying to multitask")]),
              p("Sound familiar? That’s because accessible design helps all of us."))
        + sec("What makes a website accessible?",
              p("Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG):"),
              terms([("Perceivable", "Everyone can access your information, even if they can’t use all their senses"),
                     ("Operable", "All your website’s functions work for everyone, no exceptions"),
                     ("Understandable", "Your content is clear and your navigation makes sense"),
                     ("Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future")]),
              sid="principles")
        + sec("Does this apply to my business?",
              p("Short answer: Probably yes.", cls="lead"),
              p("If you operate in the EU and your website does any of the following, you need to comply:"),
              plain(["Sells products or services online", "Allows users to book appointments or reservations",
                     "Provides banking, transport, or media services", "Was updated or published after June 28, 2025"]),
              p("This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more.",
                "The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million.",
                "But even small businesses aren’t always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size.",
                "Not sure if this applies to you? Request a free audit and we’ll help you figure it out."),
              cta(mailto("Free accessibility audit"), "Request a free accessibility audit"))
        + p('The posters above redraw the <a href="https://inclusive.microsoft.design/">Persona Spectrum</a> from Microsoft Inclusive Design: one ability, three ways of losing it, permanent, temporary or situational.', cls="kicker")
    )
    page("accessibility.html", "Accessibility is a human right.", "No exceptions.",
         "Why accessibility is a human right, who it helps, what the law requires, and whether it applies to your business.",
         ["touch", "see", "hear", "speak"], body,
         ["journal.html", "testing.html", "services.html"])


# ==================================================================== about
def about():
    body = (
        p("We’re a design studio in Berlin building websites that work for everyone.", cls="lead")
        + sec("Our approach",
              p("Most studios design a beautiful website first, then try to make it accessible later. That’s like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one.",
                "With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive."))
        + sec("Our team",
              '<dl class="team"><div><dt>Liza Gavrova</dt><dd>Co-Founder &amp; Managing Director</dd></div>'
              '<div><dt>Polina Vasilieva</dt><dd>Co-Founder &amp; Designer</dd></div></dl>')
        + sec("Background",
              p("Our practice sits between language, design, and technology.",
                "Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence — and that every project, no matter the scale, deserves both."))
        + sec("Contact", f'<p style="text-align:center"><a href="mailto:{MAIL}">{MAIL}</a></p>', cta(QUOTE, "Request a quote"))
    )
    page("about.html", f"About {BRAND}", "Language, design, technology",
         "A Berlin design studio between language, design and technology. We start with accessibility.",
         ["entrance"], body, ["services.html", "accessibility.html", "journal.html"])


# ================================================================== journal
LETTERS = [
    dict(id="perceivable", n=1, header="Perceivable", subject="If you can’t see it, it’s not there.",
         paras=[
             f"At {BRAND}, we don’t just believe in good design — we believe in accessible design. Not everyone knows the ins and outs of accessibility (and honestly, WCAG sounds like a stock ticker), so we’re breaking it down.",
             "This is part one of our four-part series on the core principles of accessibility: Perceivable, Operable, Understandable, and Robust — the not-so-secret recipe for websites that everyone can use.",
             "If people can’t see, hear, or find your content, it doesn’t exist to them.",
             "“Perceivable” means designing information so everyone can experience it — whether through alt text, captions, or proper contrast.",
             "Think of it like this: if your image description says “group of people” when it’s actually a K-pop band posing with fans, you’ve already lost half your audience (and maybe a few fans).",
             "Accessibility is about giving everyone the full picture — not just a faint outline.",
             f"{BRAND} helps brands make sure their work isn’t invisible to the people who want to see it."],
         cta=("accessibility.html#principles", "Learn more")),
    dict(id="operable", n=2, header="Operable", subject="If it’s impossible to click, it’s not a button.",
         paras=[
             f"At {BRAND}, we don’t just make things look good — we make them work for everyone. Accessibility can feel abstract, so we’re simplifying it through our four-part series on WCAG’s core principles: Perceivable, Operable, Understandable, and Robust.",
             "Today’s focus: Operable — how people actually use your site.",
             "A website shouldn’t feel like an obstacle course.",
             "“Operable” means every visitor can interact — whether they click, tap, scroll, or navigate by voice.",
             "Imagine driving a forklift, but someone’s replaced the steering wheel with a touchscreen — that’s what poor UX feels like. You can move, technically, but not well (and probably not safely). Accessibility is just the difference between steering confidently and guessing.",
             f"{BRAND} builds sites that operate as smoothly as they look — no forklift license required."],
         cta=(AUDIT, "Request an accessibility audit")),
    dict(id="understandable", n=3, header="Understandable", subject="Confusion isn’t a design feature.",
         paras=[
             "We started this four-part series because accessibility shouldn’t be mysterious.",
             f"At {BRAND}, we’re translating WCAG’s principles — Perceivable, Operable, Understandable, and Robust — into plain language and real examples.",
             "Today’s topic: Understandable — clarity as the ultimate design goal.",
             "If your site feels like a maze, people won’t stay long enough to find the exit.",
             "“Understandable” means content that reads clearly, layouts that behave predictably, and forms that don’t feel like riddles.",
             "Think of a library where all the books are filed by color. It might look nice, but nobody’s finding Dostoevsky in the blue section.",
             "Accessibility is the Dewey Decimal System for design — order that invites exploration.",
             f"{BRAND} helps brands say less, mean more, and stay compliant while doing it."],
         cta=("content-strategy.html", "Make your content accessible")),
    dict(id="robust", n=4, header="Robust", subject="Future-proof or future problem?",
         paras=[
             "This is the final part of our accessibility series, where we unpack WCAG’s four key principles — Perceivable, Operable, Understandable, and Robust.",
             f"At {BRAND}, we believe accessibility is less about checking boxes and more about building something that lasts.",
             "“Robust” means your website works across browsers, devices, and assistive tools — not just the one you happen to like.",
             "Think of a farm built only for one season: great when it rains, useless in a drought. A truly robust site can weather change — whether it’s a new OS, browser, or accessibility update.",
             "Accessibility is what makes a digital ecosystem sustainable.",
             f"{BRAND} builds resilient sites that stay compliant, elegant, and alive — no matter the forecast."],
         cta=(QUOTE, "Future-proof your site")),
]

POSTS = [
    dict(text="If everyone can’t use the door, is it really an entrance?",
         caption=["Good design isn’t just beautiful — it’s usable. Accessibility is how you make sure your audience can get in.",
                  "We’re a Berlin-based design studio specializing in accessible web design, UX/UI, and brand systems that work for everyone. We don’t retrofit — we rebuild. So your site feels seamless, compliant, and genuinely human.",
                  "Because design means nothing if no one can reach it."],
         tags="#AccessibilityDesign #InclusiveDesign #DesignForAll #EAA2025 #BerlinDesignStudio"),
    dict(text="The European Accessibility Act is here.",
         caption=["As of June 28 2025, the European Accessibility Act (EAA) is in effect. That means websites and digital services operating in the EU are now legally required to meet accessibility standards.",
                  "If your site isn’t compliant yet, you’re already behind — but it’s not too late to fix it.",
                  f"{BRAND} helps businesses redesign their sites to meet EAA and WCAG standards without compromising aesthetics. Accessible, compliant, and genuinely well-designed.",
                  "Accessibility isn’t a feature. It’s the foundation."],
         tags="#WebAccessibility #EAA2025 #InclusiveDesign #AccessibilityMatters #BerlinDesignStudio"),
    dict(text="Accessibility is a human right.",
         caption=["Accessibility isn’t about compliance — it’s about equality.",
                  "Everyone deserves to access information, products, and ideas online. The web was built to connect us, not to leave people out.",
                  f"At {BRAND}, we help businesses design for everyone — not just for the average user. From accessible web design and UX to content strategy and testing, we turn inclusivity into good design practice.",
                  "Because when access is universal, ideas travel further."],
         tags="#AccessibilityDesign #InclusiveDesign #AccessibilityMatters #HumanRights #WebAccessibility #DesignForAll #BerlinDesignStudio"),
    dict(poster="understandable",
         note="Stand-in poster. The post itself uses a Thomas Ruff photograph of a library, or another formalist library image; the rights need clearing before it is posted.",
         caption=["Before the internet, this was the original search engine.",
                  "And even then, it only worked if you could find the card catalog, understand the Dewey Decimal System, and read the handwriting of whoever filed “Photography — Germany — Late 20th Century.”",
                  "Accessibility is the modern version of that problem — making sure everyone can find, understand, and use what’s already there.",
                  f"At {BRAND}, we build websites that don’t need a librarian to navigate."],
         tags="#WebAccessibility #InclusiveDesign #DesignForAll #AccessibilityMatters #InformationDesign #BerlinDesignStudio"),
    dict(poster="operable",
         note="Stand-in poster. The post itself is a carousel of works by Wade Guyton, Shannon Ebner, Cady Noland and Kazimir Malevich; the rights need clearing before it is posted.",
         caption=["An X is one of design’s oldest signals: a mark to indicate, obscure, or cancel. In art, it’s a structure — a formal device that organizes space. In interface design, it’s a command — close, exit, delete.",
                  "Accessibility reframes what an X communicates. To some users, that symbol reads as a button. To others, it’s just an unlabeled icon. Without context, it’s ambiguity coded into design.",
                  f"At {BRAND}, we pay attention to what symbols actually say — to software, to screen readers, and to the people using them."],
         tags="#AccessibilityDesign #WebAccessibility #InformationDesign #WadeGuyton #ShannonEbner #CadyNoland #Malevich #BerlinDesignStudio #UIUX #InclusiveDesign"),
]


def journal():
    letters = "".join(
        sec(l["header"], p(l["subject"], cls="lead"), p(*l["paras"]), cta(*l["cta"]),
            kicker=f"Newsletter {l['n']} of 4", sid=l["id"])
        for l in LETTERS)
    posts = ""
    for i, post in enumerate(POSTS, 1):
        if "text" in post:
            image = (f'<div class="stage"><div class="tile" role="img" aria-label="Post image: white background with black type reading, {post["text"]}">'
                     f'<span aria-hidden="true">{post["text"]}</span></div></div>')
            note = ""
        else:
            image = f'<div class="stage">{P.ALL[post["poster"]]()}</div>'
            note = f'<p class="note">{post["note"]}</p>'
        cap = "".join(f"<p>{c}</p>" for c in post["caption"])
        posts += (f'<li class="post"><h3 class="kicker">Post {i:02d}</h3>{image}{note}{cap}'
                  f'<p class="tags">{TAG} {post["tags"]}</p></li>')
    body = (p("A four-part series on the core principles of accessibility, in plain language and real examples.", cls="lead")
            + letters
            + sec("Posts", f'<ul class="posts">{posts}</ul>', kicker="Instagram", sid="posts"))
    page("journal.html", "Perceivable, Operable,", "Understandable, Robust",
         "The four principles of accessibility, one newsletter each, and the studio's posts.",
         ["perceivable", "operable", "understandable", "robust"], body,
         ["accessibility.html", "content-strategy.html", "about.html"])


if __name__ == "__main__":
    home()
    services()
    service_pages()
    accessibility()
    about()
    journal()
    print("built", len(list(OUT.glob("*.html"))), "pages")
