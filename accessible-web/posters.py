"""Posters: the site's illustrations, set like the reference event posters.

Each is a 600 x 800 sheet: a word spread letter by letter across the top and
repeated upside down at the foot, one heavy black form in the middle with a
few red and blue markers, a row of spaced blue capitals, small credits at the
bottom right. They are objects, shown on a black stage, so their colours are
fixed in both themes (black on #f1f1ee measures 18.9:1; the blue and red text
inside measures 6.9:1 and 5.2:1).

Two series:
- Persona spectrum (touch, see, hear, speak), after Microsoft Inclusive
  Design's Persona Spectrum: one ability, three ways of losing it.
- The four WCAG principles, one poster per newsletter.
Plus two for the studio: the entrance, and the date of the Act.
"""

_n = 0


def _id(stem):
    global _n
    _n += 1
    return f"{stem}{_n}"


W, H = 600, 800


def _spread(word, y, size, x0=44, x1=556, cls="pk"):
    slots = list(word)
    n = len(slots)
    step = (x1 - x0) / (n - 1) if n > 1 else 0
    out = []
    for i, ch in enumerate(slots):
        if ch == " ":
            continue
        out.append(f'<text class="{cls}" x="{x0 + i*step:.1f}" y="{y}" '
                   f'font-size="{size}" text-anchor="middle">{ch}</text>')
    return "".join(out)


def _sheet(key, title, desc, word, word_size, inner):
    i = _id(key)
    top = _spread(word, 84, word_size)
    foot = f'<g transform="rotate(180 {W/2} {H/2})">{top}</g>'
    return (f'<svg class="poster" viewBox="0 0 {W} {H}" role="img" '
            f'aria-labelledby="{i}t {i}d" focusable="false">'
            f'<title id="{i}t">{title}</title><desc id="{i}d">{desc}</desc>'
            f'<rect class="pp" width="{W}" height="{H}"/>{top}{inner}{foot}</svg>')


def _credits(*lines, y=648):
    return "".join(f'<text class="pk" x="560" y="{y + k*18}" font-size="14" '
                   f'text-anchor="end">{l}</text>' for k, l in enumerate(lines))


def _row(text, y, size=15, cls="pbt"):
    return (f'<text class="{cls}" x="300" y="{y}" font-size="{size}" '
            f'text-anchor="middle" letter-spacing="{size*0.42:.1f}">{text}</text>')


def _blur(std):
    f = _id("bl")
    return f, (f'<filter id="{f}" x="-50%" y="-50%" width="200%" height="200%">'
               f'<feGaussianBlur stdDeviation="{std}"/></filter>')


# ---------------------------------------------------------------- spectrum
SPECTRUM_COLS = ("PERMANENT", "TEMPORARY", "SITUATIONAL")


def _marker(kind, cx, cy, r=9):
    if kind == 0:   # permanent: solid
        return f'<circle class="pr" cx="{cx}" cy="{cy}" r="{r}"/>'
    if kind == 1:   # temporary: half
        return (f'<circle class="pp" cx="{cx}" cy="{cy}" r="{r}" stroke="#e8341c" stroke-width="2"/>'
                f'<path class="pr" d="M{cx},{cy-r} A{r},{r} 0 0,1 {cx},{cy+r}Z"/>')
    return f'<circle fill="none" stroke="#e8341c" stroke-width="2.5" cx="{cx}" cy="{cy}" r="{r-1}"/>'


def _spectrum_row(examples):
    out = []
    for k, (label, ex) in enumerate(zip(SPECTRUM_COLS, examples)):
        cx = 110 + k * 190
        out.append(_marker(k, cx, 512))
        out.append(f'<text class="pbt" x="{cx}" y="{546}" font-size="13" '
                   f'text-anchor="middle" letter-spacing="3.2">{label}</text>')
        for j, line in enumerate(ex.split("|")):
            out.append(f'<text class="pk" x="{cx}" y="{580 + j*26}" font-size="22" '
                       f'text-anchor="middle">{line}</text>')
    return "".join(out)


def _spectrum_desc(sense, examples):
    ex = [e.replace("|", " ") for e in examples]
    return (f"Poster titled {sense}. Three ways the same need arises: "
            f"permanent, {ex[0].lower()}; temporary, {ex[1].lower()}; "
            f"situational, {ex[2].lower()}. After Microsoft Inclusive "
            f"Design's Persona Spectrum.")


def touch():
    outer = "M200,140 H400 V250 H452 V350 H400 V470 H200 V350 H148 V250 H200Z"
    inner = "M228,168 H372 V278 H424 V322 H372 V442 H228 V322 H176 V278 H228Z"
    ex = ["One arm", "Arm injury", "New parent"]
    form = (f'<path class="pk" fill-rule="evenodd" d="{outer} {inner}"/>'
            '<circle class="pr" cx="300" cy="222" r="30"/>'
            '<circle class="pr" cx="300" cy="300" r="22"/>'
            '<circle class="pr" cx="300" cy="380" r="30"/>'
            '<rect class="pb" x="182" y="290" width="20" height="20"/>'
            '<rect class="pb" x="398" y="290" width="20" height="20"/>')
    return _sheet("touch", "Touch", _spectrum_desc("Touch", ex), "TOUCH", 52,
                  form + _spectrum_row(ex)
                  + _credits("Persona spectrum 01/04", "after Microsoft Inclusive Design"))


def see():
    f, defs = _blur(26)
    ex = ["Blind", "Cataract", "Distracted|driver"]
    form = (f'<defs>{defs}</defs><g filter="url(#{f})">'
            '<circle class="pr" cx="300" cy="305" r="150" opacity="0.6"/>'
            '<circle class="pb" cx="300" cy="305" r="122"/>'
            '<circle class="pk" cx="300" cy="305" r="58"/></g>'
            '<rect class="pk" x="290" y="295" width="20" height="20"/>')
    return _sheet("see", "See", _spectrum_desc("See", ex), "SEE", 56,
                  form + _spectrum_row(ex)
                  + _credits("Persona spectrum 02/04", "after Microsoft Inclusive Design", y=666))


def hear():
    ex = ["Deaf", "Ear infection", "Bartender"]
    form = ('<circle fill="none" stroke="#000" stroke-width="30" cx="300" cy="305" r="150"/>'
            '<circle fill="none" stroke="#000" stroke-width="30" cx="300" cy="305" r="92"/>'
            '<rect class="pp" x="288" y="130" width="24" height="350"/>'
            '<rect class="pk" x="288" y="293" width="24" height="24"/>'
            '<rect class="pb" x="138" y="293" width="24" height="24"/>'
            '<rect class="pb" x="438" y="293" width="24" height="24"/>'
            '<rect class="pr" x="196" y="293" width="24" height="24"/>'
            '<rect class="pr" x="380" y="293" width="24" height="24"/>')
    return _sheet("hear", "Hear", _spectrum_desc("Hear", ex), "HEAR", 56,
                  form + _spectrum_row(ex)
                  + _credits("Persona spectrum 03/04", "after Microsoft Inclusive Design"))


def speak():
    bubble = ("M200,150 H400 V182 H436 V218 H468 V362 H436 V398 H400 V430 "
              "H280 L232,478 V430 H200 V398 H164 V362 H132 V218 H164 V182 H200Z")
    hole = ("M216,178 H384 V206 H412 V234 H440 V346 H412 V374 H384 V402 "
            "H216 V374 H188 V346 H160 V234 H188 V206 H216Z")
    ex = ["Non-verbal", "Laryngitis", "Heavy accent"]
    form = (f'<path class="pk" fill-rule="evenodd" d="{bubble} {hole}"/>'
            '<rect class="pr" x="226" y="278" width="28" height="28"/>'
            '<rect class="pr" x="286" y="278" width="28" height="28"/>'
            '<rect class="pb" x="346" y="278" width="28" height="28"/>')
    return _sheet("speak", "Speak", _spectrum_desc("Speak", ex), "SPEAK", 52,
                  form + _spectrum_row(ex)
                  + _credits("Persona spectrum 04/04", "after Microsoft Inclusive Design"))


# ---------------------------------------------------------------- principles
def perceivable():
    f, defs = _blur(14)
    block = "M150,140 H450 V460 H150Z"
    hole = "M300,170 a130,130 0 1,0 0.01,0Z"
    form = (f'<defs>{defs}</defs>'
            f'<path class="pk" fill-rule="evenodd" d="{block} {hole}"/>'
            f'<circle class="pb" cx="300" cy="300" r="70" filter="url(#{f})"/>'
            '<rect class="pk" x="288" y="288" width="24" height="24"/>'
            '<rect class="pr" x="288" y="148" width="24" height="16"/>'
            '<rect class="pr" x="288" y="436" width="24" height="16"/>')
    return _sheet("perc", "Perceivable",
                  "Poster titled Perceivable: a heavy black block with a round "
                  "opening, a soft blue disc and a black square inside it. "
                  "Below: see, hear, find. WCAG principle 1.",
                  "PERCEIVABLE", 40,
                  form + _row("SEE · HEAR · FIND", 540, 18)
                  + '<text class="pk" x="300" y="590" font-size="24" text-anchor="middle">If you can’t see it, it’s not there.</text>'
                  + _credits("WCAG principle 1", "Newsletter 01/04"))


def operable():
    frame = "M170,150 H430 V450 H170Z"
    hole = "M196,176 H404 V424 H196Z"
    form = (f'<path class="pk" fill-rule="evenodd" d="{frame} {hole}"/>'
            '<path stroke="#000" stroke-width="34" stroke-linecap="butt" d="M232,212 L368,388 M368,212 L232,388"/>'
            '<rect class="pr" x="210" y="190" width="24" height="24"/>'
            '<rect class="pr" x="366" y="386" width="24" height="24"/>'
            '<rect class="pb" x="366" y="190" width="24" height="24"/>'
            '<rect class="pb" x="210" y="386" width="24" height="24"/>'
            '<rect fill="none" stroke="#4f6bd8" stroke-width="4" stroke-dasharray="12 10" x="150" y="130" width="300" height="340"/>')
    return _sheet("oper", "Operable",
                  "Poster titled Operable: a heavy X in a black square frame, "
                  "red and blue squares at its four ends, a dashed blue focus "
                  "outline around it. Below: click, tap, scroll, voice. WCAG "
                  "principle 2.",
                  "OPERABLE", 46,
                  form + _row("CLICK · TAP · SCROLL · VOICE", 540, 15)
                  + '<text class="pk" x="300" y="590" font-size="24" text-anchor="middle">If it’s impossible to click,</text>'
                  + '<text class="pk" x="300" y="618" font-size="24" text-anchor="middle">it’s not a button.</text>'
                  + _credits("WCAG principle 2", "Newsletter 02/04", y=666))


def understandable():
    books = []
    for shelf in range(3):
        base = 230 + shelf * 105
        for i in range(9):
            h = 40 + i * 6
            cls = "pr" if (shelf == 1 and i == 5) else "pk"
            books.append(f'<rect class="{cls}" x="{160 + i*32}" y="{base - h}" width="24" height="{h}"/>')
        books.append(f'<rect class="pk" x="150" y="{base}" width="300" height="6"/>')
    form = "".join(books) + '<rect class="pb" x="440" y="130" width="20" height="20"/>'
    return _sheet("und", "Understandable",
                  "Poster titled Understandable: three shelves of black books "
                  "in rising order, one red book easy to find. Below: clear, "
                  "predictable, in order. WCAG principle 3.",
                  "UNDERSTANDABLE", 32,
                  form + _row("CLEAR · PREDICTABLE · IN ORDER", 540, 14)
                  + '<text class="pk" x="300" y="590" font-size="24" text-anchor="middle">Confusion isn’t a design feature.</text>'
                  + _credits("WCAG principle 3", "Newsletter 03/04"))


def _star(cx, cy, r, k=0.3):
    k = r * k
    return (f"M{cx},{cy-r} C{cx+k},{cy-k} {cx+k},{cy-k} {cx+r},{cy} "
            f"C{cx+k},{cy+k} {cx+k},{cy+k} {cx},{cy+r} "
            f"C{cx-k},{cy+k} {cx-k},{cy+k} {cx-r},{cy} "
            f"C{cx-k},{cy-k} {cx-k},{cy-k} {cx},{cy-r}Z")


def robust():
    f, defs = _blur(20)
    form = (f'<defs>{defs}</defs><g filter="url(#{f})">'
            f'<path class="pr" opacity="0.55" d="{_star(300, 300, 190)}"/>'
            f'<path class="pb" d="{_star(300, 300, 150)}"/>'
            f'<path class="pk" d="{_star(300, 300, 80)}"/></g>')
    return _sheet("rob", "Robust",
                  "Poster titled Robust: a soft four-pointed star, dark at the "
                  "core, blue through the body, red at the edges, holding its "
                  "shape though its outline is blurred. Below: browsers, "
                  "devices, tools. WCAG principle 4.",
                  "ROBUST", 50,
                  form + _row("BROWSERS · DEVICES · TOOLS", 540, 15)
                  + '<text class="pk" x="300" y="590" font-size="24" text-anchor="middle">Future-proof or future problem?</text>'
                  + _credits("WCAG principle 4", "Newsletter 04/04"))


# ---------------------------------------------------------------- studio
def entrance():
    frame = "M210,130 H390 V438 H364 V156 H236 V438 H210Z"
    form = ('<rect class="pk" x="40" y="470" width="520" height="8"/>'
            '<rect class="pk" x="170" y="438" width="260" height="32"/>'
            f'<path class="pk" d="{frame}"/>'
            '<path class="pk" d="M430,438 L556,470 L430,470Z"/>'
            '<rect class="pr" x="288" y="138" width="24" height="14"/>'
            '<rect class="pb" x="214" y="290" width="18" height="18"/>'
            '<rect class="pb" x="368" y="290" width="18" height="18"/>'
            '<circle class="pr" cx="300" cy="408" r="28"/>'
            '<circle class="pr" cx="496" cy="430" r="14"/>')
    return _sheet("ent", "Entrance",
                  "Poster titled Accessible: a tall black doorway on a raised "
                  "step, a ramp rising to its threshold, red discs going up "
                  "and through. Below: if everyone can’t use the door, is it truly "
                  "an entrance?",
                  "ACCESSIBLE", 42,
                  form + _row("EVERYONE · IN", 530, 16)
                  + '<text class="pk" x="300" y="580" font-size="26" text-anchor="middle">If everyone can’t use the door,</text>'
                  + '<text class="pk" x="300" y="612" font-size="26" text-anchor="middle">is it truly an entrance?</text>'
                  + _credits("Accessible Web", "Design studio, Berlin", y=666))


def eaa():
    frame = "M150,140 H450 V460 H150Z"
    hole = "M176,166 H424 V434 H176Z"
    form = (f'<path class="pk" fill-rule="evenodd" d="{frame} {hole}"/>'
            '<rect class="pr" x="400" y="140" width="50" height="50"/>'
            '<text class="pk" x="300" y="350" font-size="190" text-anchor="middle" letter-spacing="-6">28</text>'
            '<text class="pbt" x="300" y="404" font-size="30" text-anchor="middle" letter-spacing="10">06 · 2025</text>')
    return _sheet("eaa", "The European Accessibility Act",
                  "Poster titled EAA: a heavy black square frame like a "
                  "calendar page with a red corner, showing 28, and below it "
                  "06 2025. Below: European Accessibility Act, in force.",
                  "E A A", 64,
                  form + _row("EUROPEAN ACCESSIBILITY ACT", 540, 14)
                  + '<text class="pk" x="300" y="590" font-size="24" text-anchor="middle">In force across the EU.</text>'
                  + _credits("Fines up to €100,000 in Germany", "Accessible Web, Berlin"))


ALL = {
    "entrance": entrance, "eaa": eaa,
    "touch": touch, "see": see, "hear": hear, "speak": speak,
    "perceivable": perceivable, "operable": operable,
    "understandable": understandable, "robust": robust,
}

NAMES = {
    "entrance": "Entrance", "eaa": "EAA", "touch": "Touch", "see": "See",
    "hear": "Hear", "speak": "Speak", "perceivable": "Perceivable",
    "operable": "Operable", "understandable": "Understandable", "robust": "Robust",
}
