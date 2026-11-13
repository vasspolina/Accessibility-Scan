"""Builds the Accessible Web site: python3 build.py

Static pages, no framework. The copy is the studio's own; this file only
places it. The English name is Accessible Web; BarrierFreeWeb is the name
in German only, so a German build swaps BRAND and nothing else.
"""
from pathlib import Path
import illustrations as ill

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


def spread(text):
    """Letters set out across the full width, poster style. Decorative; the
    caller supplies the readable text separately."""
    cells = []
    for ch in text:
        cells.append('<span class="gap"></span>' if ch == " " else f"<span>{ch}</span>")
    return f'<span class="spread" aria-hidden="true">{"".join(cells)}</span>'


def vertical(word):
    return ('<div class="vertical" aria-hidden="true">'
            + "".join(f"<span>{c}</span>" for c in word) + "</div>")


def page(slug, title, description, body):
    nav = "".join(
        f'<li><a href="{href}"{" aria-current=\"page\"" if href == slug else ""}>{label}</a></li>'
        for href, label in NAV)
    foot_nav = "".join(f'<li><a href="{h}">{l}</a></li>' for h, l in NAV)
    full_title = f"{title} — {BRAND}" if title != BRAND else f"{BRAND} — websites everyone can use"
    html = f"""<!doctype html>
<html lang="{LANG}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{full_title}</title>
<meta name="description" content="{description}">
<script>try{{var t=localStorage.getItem("aw-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}}catch(e){{}}</script>
<link rel="preload" href="fonts/PPTelegraf-Light.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="style.css">
<script src="theme.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header wrap">
  <a class="wordmark" href="index.html"><span class="sr-only">{BRAND}, home</span>{spread(BRAND)}</a>
  <nav class="nav" aria-label="Main">
    <ul>{nav}</ul>
    <button class="theme-toggle" type="button" aria-pressed="false" data-theme-toggle><span class="dot" aria-hidden="true"></span>Dark theme</button>
  </nav>
</header>
<main id="main" class="wrap">
{body}
</main>
<footer class="site-footer wrap">
  <div class="foot-grid">
    <div>
      <p class="label">Contact</p>
      <p class="foot-mail"><a href="mailto:{MAIL}">{MAIL}</a></p>
      <p class="small muted">{BRAND}, design studio, Berlin</p>
    </div>
    <nav aria-label="Footer"><ul>{foot_nav}</ul></nav>
    <div>
      <p class="small muted">Built to WCAG 2.2 Level AA. Light and dark themes follow your system unless you choose one above.</p>
    </div>
  </div>
  <div class="mirror">{spread(BRAND)}</div>
</footer>
</body>
</html>
"""
    (OUT / slug).write_text(html, encoding="utf-8")


def sec(sid, label, heading, body, head_extra=""):
    return f"""<section class="sec" id="{sid}" aria-labelledby="{sid}-h">
  <div class="sec-head"><p class="label">{label}</p><h2 class="h2" id="{sid}-h">{heading}</h2>{head_extra}</div>
  <div class="sec-body">{body}</div>
</section>"""


def terms(pairs, numbered=False):
    rows = "".join(f"<div><dt>{a}</dt><dd>{b}</dd></div>" for a, b in pairs)
    return f'<dl class="terms{" numbered" if numbered else ""}">{rows}</dl>'


def dashes(items):
    return '<ul class="dash-list">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def cta(href, text, ghost=False):
    return f'<a class="cta{" ghost" if ghost else ""}" href="{href}">{text}<span aria-hidden="true">→</span></a>'


def p(*paras, cls="prose"):
    return f'<div class="{cls}">' + "".join(f"<p>{x}</p>" for x in paras) + "</div>"


# ===================================================================== home
def home():
    body = f"""
<section class="hero" aria-labelledby="hero-h">
  {ill.entrance()}
  <div class="hero-row">{spread("BERLIN · DESIGN · STUDIO")}</div>
  <h1 class="display" id="hero-h">We’re a design studio in Berlin building websites that everyone can use.</h1>
</section>
{sec("eaa", "The law", "The European Accessibility Act is here.",
     '<p class="date-mark" aria-hidden="true">28.06.2025</p>'
     + p("As of 28 June 2025, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines.",
         "Not sure if your site is compliant? We can help.")
     + cta(AUDIT, "Request an accessibility audit"))}
<section class="sec" aria-labelledby="pages-h">
  <div class="sec-head"><p class="label">Studio</p><h2 class="h2" id="pages-h">What we do</h2></div>
  <div class="sec-body">
    <ul class="index">
      <li><a href="services.html"><span class="name">Services</span><span class="line">Building websites that work for everyone.</span></a></li>
      <li><a href="accessibility.html"><span class="name">Accessibility</span><span class="line">Accessibility is a human right. No exceptions.</span></a></li>
      <li><a href="about.html"><span class="name">About</span><span class="line">We start with accessibility.</span></a></li>
      <li><a href="journal.html"><span class="name">Journal</span><span class="line">The four principles of accessibility, in plain language.</span></a></li>
    </ul>
  </div>
</section>
<section class="hero" aria-label="A question">
  {vertical("ENTRANCE")}
  <p class="question display">If everyone can’t use the door, is it truly an entrance?</p>
</section>
"""
    page("index.html", BRAND,
         "A design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
         body)


# ================================================================= services
OFFER = [
    ("design-typography.html", "Design and typography"),
    ("ux-ui.html", "UX/UI design"),
    ("brand.html", "Brand development"),
    ("content-strategy.html", "Content strategy"),
    ("copywriting.html", "Copywriting"),
    ("testing.html", "Accessibility testing"),
]


def services():
    offer = "".join(
        f'<li><a href="{h}"><span class="name">{n}</span><span class="more" aria-hidden="true">Learn more →</span></a></li>'
        for h, n in OFFER)
    body = f"""
<header class="page-head">
  <p class="label">Services</p>
  <h1 class="display">Building websites that work for everyone.</h1>
  <p class="lead">We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.</p>
</header>
{sec("door", "Think of it this way", "Good design works for everyone.",
     ill.figure(1, "A door that only opens at one height is not broken. It is badly designed.", ill.doors())
     + p("Think of it this way: A door that only opens if you’re exactly 5′10″ isn’t a broken door — it’s a badly designed one. Good design works for everyone."))}
{sec("offer", "Services", "What we offer", f'<ul class="offer">{offer}</ul>')}
{sec("approach", "Method", "Our approach",
     terms([("Focused", "Messages are clear, obvious, and impactful"),
            ("User-centered", "Navigation is smooth, intuitive, and inclusive"),
            ("Future-proof", "Content is purposeful, adaptable, and cost-effective")], numbered=True)
     + p("Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites.")
     + '<p><a href="accessibility.html#principles">The four principles of WCAG</a></p>')}
{sec("mobile", "Phones first", "Mobile-first design",
     ill.figure(2, "We design for the phone first, then let the layout grow.", ill.mobile_first())
     + p("Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions."))}
{sec("retrofit", "Rebuild or repair", "Why not just fix your current site?",
     p("Retrofitting older websites — especially those built on HTML 4 or earlier — is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No.",
       "Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance."))}
{sec("deadline", "The law", "The EAA deadline has passed.",
     '<p class="date-mark" aria-hidden="true">€100,000</p>'
     + p("As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach €100,000.")
     + '<p><a href="accessibility.html#legal">The legal landscape</a></p>')}
{sec("affected", "Sectors", "Who’s affected",
     dashes(["Software, SaaS, and digital services", "Fintech and financial services",
             "E-commerce, fashion, and retail", "Education and online learning",
             "Branding and marketing agencies", "Art galleries and museums",
             "Architecture and design firms", "Travel, restaurants, and hospitality"])
     + p("Companies with fewer than 10 employees and annual revenue under €2 million are exempt.",
         "This exemption does not apply to companies that offer products subject to accessibility requirements, such as:")
     + dashes(["websites, apps, and e-commerce platforms",
               "consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices)."]))}
{sec("ai", "Machines and people", "But can’t I just use AI?",
     ill.figure(3, "A machine can find the picture. Only a person can say what it shows.", ill.alt_text())
     + p("No. AI’s great for breakup texts or visa forms — not accessibility compliance.",
         "It can flag missing alt text or contrast errors, but it can’t tell “K-pop band posing with fans” from “group of people.” Real accessibility needs judgment and empathy, which only humans have.",
         "In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks."))}
{sec("benefits", "Why it pays", "Benefits of accessibility compliance",
     dashes(["Legal protection", "Improved SEO and discoverability", "Expanded audience reach",
             "Enhanced brand reputation", "Modern, contemporary design"]))}
{sec("get", "The result", "What you get",
     p("A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards — verified through thorough testing.", cls="prose lead")
     + cta(QUOTE, "Request a quote today"))}
"""
    page("services.html", "Services",
         "Accessible web design, UX/UI, brand development, content strategy, copywriting and accessibility testing.",
         body)


# ============================================================ service pages
SUB = {
    "design-typography.html": dict(
        name="Design and typography",
        lead="We make sure your content works everywhere, for everyone.",
        fig=(ill.mobile_first, "The same content, set for every screen."),
        terms=[("Text reflow", "Content resizes smoothly across all screen sizes"),
               ("Fluid design", "Flexible layouts that adapt without breaking or losing meaning"),
               ("Semantic markup", "Content organized so screen readers can understand it"),
               ("Alt text", "Written descriptions of images and videos for people using screen readers")]),
    "ux-ui.html": dict(
        name="UX/UI and Web Development",
        lead="We build interfaces that actually work.",
        fig=(ill.x_mark, "A control needs a name, or a screen reader cannot say what it does."),
        terms=[("Accessible components", "User interface elements with clear names, roles, and states"),
               ("Robust code", "Compatible with all browsers and assistive technologies"),
               ("Status messages", "Updates and alerts that don’t interfere with assistive technologies"),
               ("Color customization", "Works with any color settings users choose")]),
    "brand.html": dict(
        name="Brand Development",
        lead="Brand identities that are clear, memorable, and work for everyone.",
        fig=(ill.star, "A clear mark keeps its shape, whatever it is seen through."),
        terms=[("Logo and visual identity", "Key elements that are memorable and convey your core values"),
               ("Brand voice", "Tone and language that’s authentic to your company and resonates with your audience"),
               ("Brand guidelines", "Comprehensive instructions for maintaining consistency across all touchpoints"),
               ("Optimized typography", "Readable fonts with strategic spacing and hierarchy"),
               ("Contrast optimization", "Visual elements that stand out and meet accessibility standards"),
               ("Strategic use of color", "Colors that ensure clarity"),
               ("Art direction", "Cohesive visual aesthetics aligned with your values")]),
    "content-strategy.html": dict(
        name="Content Strategy",
        lead="Structure and strategy that makes your content work better with assistive technologies.",
        fig=(ill.library, "Order is what makes a collection usable."),
        terms=[("Clear, logical structure", "Content organized with descriptive headings and intuitive flow"),
               ("Consistent navigation", "Predictable, easy-to-understand paths through your site"),
               ("Input assistance", "Clear instructions, error recognition, and helpful correction suggestions"),
               ("Inclusive language", "Respectful, non-discriminatory content that addresses diverse audiences"),
               ("Screen reader optimization", "Logical content order that reads naturally with assistive technology"),
               ("Meaningful descriptions", "Alt text and descriptive links that explain an image’s purpose, not just presence")]),
    "copywriting.html": dict(
        name="Copywriting",
        lead="We believe in simplicity.",
        intro="Good copy should be:",
        fig=(ill.alt_text, "Description that says what is there, not only that something is."),
        terms=[("Clear", "Concise language without jargon"),
               ("Accessible", "Easy to grasp for a broad audience"),
               ("Scannable", "Short paragraphs with logical breaks and clear bullet points"),
               ("Inclusive", "Respectful and resonant with diverse readers"),
               ("Descriptive", "Links and alt text that explain purpose, not just “click here”"),
               ("Screen reader-friendly", "Logical flow without visual cues like “see below”")]),
    "testing.html": dict(
        name="Accessibility testing",
        lead="In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks.",
        intro="Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites. We test against its four principles:",
        fig=(ill.alt_text, "A machine can flag a missing description. Only a person can judge one."),
        terms=[("Perceivable", "Everyone can access your information, even if they can’t use all their senses"),
               ("Operable", "All your website’s functions work for everyone, no exceptions"),
               ("Understandable", "Your content is clear and your navigation makes sense"),
               ("Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future")]),
}


def service_pages():
    slugs = [h for h, _ in OFFER]
    for i, slug in enumerate(slugs):
        d = SUB[slug]
        prev_s, next_s = slugs[i - 1], slugs[(i + 1) % len(slugs)]
        fig_fn, cap = d["fig"]
        intro = f'<p class="lead">{d["intro"]}</p>' if d.get("intro") else ""
        body = f"""
<header class="page-head">
  <p class="label"><a href="services.html">Services</a> / {i + 1:02d}</p>
  <h1 class="display">{d["name"]}</h1>
  <p class="lead">{d["lead"]}</p>
</header>
<section class="sec" aria-labelledby="what-h">
  <div class="sec-head"><p class="label">What it covers</p><h2 class="h2" id="what-h">In practice</h2></div>
  <div class="sec-body">
    {ill.figure(1, cap, fig_fn())}
    {intro}
    {terms(d["terms"])}
    {cta(QUOTE, "Request a quote")}
  </div>
</section>
<nav class="pager" aria-label="Services">
  <a class="prev" href="{prev_s}"><span aria-hidden="true">← </span>{SUB[prev_s]["name"]}</a>
  <a class="next" href="{next_s}">{SUB[next_s]["name"]}<span aria-hidden="true"> →</span></a>
</nav>
"""
        page(slug, d["name"], d["lead"], body)


# ============================================================ accessibility
def accessibility():
    principles = [
        ("perceivable", "Perceivable", "Everyone can access your information, even if they can’t use all their senses"),
        ("operable", "Operable", "All your website’s functions work for everyone, no exceptions"),
        ("understandable", "Understandable", "Your content is clear and your navigation makes sense"),
        ("robust", "Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future"),
    ]
    plist = "".join(
        f'<li>{ill.principle(k)}<h3>{n}</h3><p>{t}</p></li>' for k, n, t in principles)
    body = f"""
<header class="page-head">
  <p class="label">Accessibility</p>
  <h1 class="display">Accessibility is a human right. No exceptions.</h1>
  <p class="lead">Life has moved online. We depend on the internet for work, connection, and daily necessities. It’s our entertainment, but it’s also essential. Everyone needs to be able to use it.</p>
  <p class="aside prose">Remember: When you build a house, you don’t make the door optional. The same goes for digital access — everyone needs a way in.</p>
</header>
{sec("everyone", "For everyone", "Accessibility benefits everyone.",
     ill.figure(1, "One curb cut, built for wheelchairs, used by everyone.", ill.curb_cut())
     + p("You’ve probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That’s accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea.",
         "These features weren’t designed exclusively for people with disabilities — they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks.",
         "Good accessible design doesn’t just help some users — it creates a better experience for everyone."))}
{sec("legal", "The law", "The legal landscape",
     p("As of June 28, 2025, accessibility isn’t optional anymore — it’s the law across Europe. Germany has the BFSG (Barrierefreiheitsstärkungsgesetz, the Accessibility Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet WCAG 2.1 Level AA standards.")
     + ill.figure(2, "Maximum fines, drawn to scale by area.", ill.fines())
     + p("What happens if you don’t comply? Fines can reach up to €100,000 in Germany, and over €1,000,000 in some EU countries.",
         "Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren’t fixed."))}
{sec("who", "Situations", "Who needs accessibility?",
     p("Here’s the thing: accessibility isn’t just for people with permanent disabilities. At some point, we all need these features.")
     + terms([("Motor limitations", "Broken arms, carrying groceries, holding a baby"),
              ("Visual limitations", "Forgot your glasses, cracked phone screen, sun glare on your laptop"),
              ("Auditory limitations", "Loud café, ear infection, dead headphone battery"),
              ("Cognitive limitations", "Tired after a long day, stressed and distracted, trying to multitask")])
     + p("Sound familiar? That’s because accessible design helps all of us."))}
{sec("principles", "WCAG", "What makes a website accessible?",
     p("Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG):")
     + f'<ul class="principles">{plist}</ul>')}
{sec("apply", "Your business", "Does this apply to my business?",
     p("Short answer: Probably yes.", cls="prose lead")
     + p("If you operate in the EU and your website does any of the following, you need to comply:")
     + dashes(["Sells products or services online", "Allows users to book appointments or reservations",
               "Provides banking, transport, or media services", "Was updated or published after June 28, 2025"])
     + p("This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more.",
         "The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million.",
         "But even small businesses aren’t always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size.",
         "Not sure if this applies to you? Request a free audit and we’ll help you figure it out.")
     + cta(mailto("Free accessibility audit"), "Request a free accessibility audit"))}
"""
    page("accessibility.html", "Accessibility",
         "Why accessibility is a human right, who it helps, what the law requires, and whether it applies to your business.",
         body)


# ==================================================================== about
def about():
    body = f"""
<header class="page-head">
  <p class="label">About</p>
  <h1 class="display">About {BRAND}</h1>
  <p class="lead">We’re a design studio in Berlin building websites that work for everyone.</p>
</header>
{sec("approach", "Method", "Our approach",
     ill.figure(1, "Accessibility is the foundation, not a later addition.", ill.foundation())
     + p("Most studios design a beautiful website first, then try to make it accessible later. That’s like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one.",
         "With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive."))}
{sec("team", "People", "Our team",
     '<dl class="team"><div><dt>Liza Gavrova</dt><dd>Co-Founder &amp; Managing Director</dd></div>'
     '<div><dt>Polina Vasilieva</dt><dd>Co-Founder &amp; Designer</dd></div></dl>')}
{sec("background", "Background", "Between language, design, and technology",
     p("Our practice sits between language, design, and technology.",
       "Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence — and that every project, no matter the scale, deserves both."))}
{sec("contact", "Contact", "Write to us",
     f'<p class="lead"><a href="mailto:{MAIL}">{MAIL}</a></p>' + cta(QUOTE, "Request a quote"))}
"""
    page("about.html", "About",
         "A Berlin design studio between language, design and technology. We start with accessibility.",
         body)


# ================================================================== journal
LETTERS = [
    dict(id="perceivable", n=1, header="Perceivable", subject="If you can’t see it, it’s not there.",
         fig=(ill.alt_text, "The full picture, not a faint outline."),
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
         fig=(lambda: ill.principle("operable"), "A control you can reach, press and see in focus."),
         paras=[
             f"At {BRAND}, we don’t just make things look good — we make them work for everyone. Accessibility can feel abstract, so we’re simplifying it through our four-part series on WCAG’s core principles: Perceivable, Operable, Understandable, and Robust.",
             "Today’s focus: Operable — how people actually use your site.",
             "A website shouldn’t feel like an obstacle course.",
             "“Operable” means every visitor can interact — whether they click, tap, scroll, or navigate by voice.",
             "Imagine driving a forklift, but someone’s replaced the steering wheel with a touchscreen — that’s what poor UX feels like. You can move, technically, but not well (and probably not safely). Accessibility is just the difference between steering confidently and guessing.",
             f"{BRAND} builds sites that operate as smoothly as they look — no forklift license required."],
         cta=(AUDIT, "Request an accessibility audit")),
    dict(id="understandable", n=3, header="Understandable", subject="Confusion isn’t a design feature.",
         fig=(ill.library, "Nobody finds Dostoevsky in the blue section."),
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
         fig=(ill.star, "A site that keeps its shape through every change."),
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
    dict(fig=ill.library,
         note="Stand-in drawing. The post itself uses a Thomas Ruff photograph of a library, or another formalist library image; the rights need clearing before it is posted.",
         caption=["Before the internet, this was the original search engine.",
                  "And even then, it only worked if you could find the card catalog, understand the Dewey Decimal System, and read the handwriting of whoever filed “Photography — Germany — Late 20th Century.”",
                  "Accessibility is the modern version of that problem — making sure everyone can find, understand, and use what’s already there.",
                  f"At {BRAND}, we build websites that don’t need a librarian to navigate."],
         tags="#WebAccessibility #InclusiveDesign #DesignForAll #AccessibilityMatters #InformationDesign #BerlinDesignStudio"),
    dict(fig=ill.x_mark,
         note="Stand-in drawing. The post itself is a carousel of works by Wade Guyton, Shannon Ebner, Cady Noland and Kazimir Malevich; the rights need clearing before it is posted.",
         caption=["An X is one of design’s oldest signals: a mark to indicate, obscure, or cancel. In art, it’s a structure — a formal device that organizes space. In interface design, it’s a command — close, exit, delete.",
                  "Accessibility reframes what an X communicates. To some users, that symbol reads as a button. To others, it’s just an unlabeled icon. Without context, it’s ambiguity coded into design.",
                  f"At {BRAND}, we pay attention to what symbols actually say — to software, to screen readers, and to the people using them."],
         tags="#AccessibilityDesign #WebAccessibility #InformationDesign #WadeGuyton #ShannonEbner #CadyNoland #Malevich #BerlinDesignStudio #UIUX #InclusiveDesign"),
]


def journal():
    toc = "".join(f'<li><a href="#{l["id"]}">{l["n"]:02d} {l["header"]}</a></li>' for l in LETTERS)
    letters = ""
    for l in LETTERS:
        fn, cap = l["fig"]
        body = (f'<p class="lead subject"><span>Subject:</span> {l["subject"]}</p>'
                + ill.figure(l["n"], cap, fn())
                + p(*l["paras"])
                + cta(l["cta"][0], l["cta"][1], ghost=True))
        letters += sec(l["id"], f"Newsletter {l['n']} of 4", l["header"], f'<div class="letter">{body}</div>')
    posts = ""
    for i, post in enumerate(POSTS, 1):
        if "text" in post:
            image = (f'<div class="post-image text" role="img" aria-label="Post image: white background with black type reading, {post["text"]}">'
                     f'<span aria-hidden="true">{post["text"]}</span></div>')
            note = ""
        else:
            image = f'<div class="post-image">{post["fig"]()}</div>'
            note = f'<p class="note">{post["note"]}</p>'
        cap = "".join(f"<p>{c}</p>" for c in post["caption"])
        posts += (f'<li class="post"><h3 class="label red">Post {i:02d}</h3>{image}{note}'
                  f'<div class="prose small">{cap}</div><p class="tags">{TAG} {post["tags"]}</p></li>')
    body = f"""
<header class="page-head">
  <p class="label">Journal</p>
  <h1 class="display">Perceivable, Operable, Understandable, Robust.</h1>
  <p class="lead">A four-part series on the core principles of accessibility, in plain language and real examples.</p>
  <nav aria-label="Newsletters"><ul class="toc">{toc}<li><a href="#posts">05 Posts</a></li></ul></nav>
</header>
{letters}
<section class="sec" id="posts" aria-labelledby="posts-h">
  <div class="sec-head"><p class="label">Instagram</p><h2 class="h2" id="posts-h">Posts</h2></div>
  <div class="sec-body"><ul class="posts">{posts}</ul></div>
</section>
"""
    page("journal.html", "Journal",
         "The four principles of accessibility, one newsletter each, and the studio's posts.",
         body)


if __name__ == "__main__":
    home()
    services()
    service_pages()
    accessibility()
    about()
    journal()
    print("built", sorted(x.name for x in OUT.glob("*.html")))
