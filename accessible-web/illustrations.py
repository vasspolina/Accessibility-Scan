"""Inline SVG illustrations, drawn in the vocabulary of the reference posters:
heavy ink shapes, small red and blue markers, spaced capitals, one blurred
gradient form. Every colour is a CSS variable, so each figure follows the
light and dark themes without a second file.

Classes: i-ink / i-paper / i-red / i-blue fill a shape; s-ink strokes one;
t-ink / t-red / t-blue colour text (the text tokens, which clear 4.5:1),
while i-red / i-blue are the brighter shape tokens (non-text, decorative).
"""

_n = 0


def _uid(stem):
    global _n
    _n += 1
    return f"{stem}{_n}"


def svg(stem, title, desc, view_box, inner, cls=""):
    """An SVG with a name and a description, read as one image."""
    i = _uid(stem)
    return (
        f'<svg class="ill {cls}" viewBox="{view_box}" role="img" '
        f'aria-labelledby="{i}-t {i}-d" focusable="false">'
        f'<title id="{i}-t">{title}</title><desc id="{i}-d">{desc}</desc>'
        f"{inner}</svg>"
    )


def figure(fig_no, caption, svg_markup, cls=""):
    return (
        f'<figure class="fig {cls}">{svg_markup}'
        f'<figcaption><span class="fig-no">Fig. {fig_no:02d}</span> {caption}</figcaption>'
        f"</figure>"
    )


# ---------------------------------------------------------------- entrance
def entrance():
    """Hero: a stepped block with a round opening. Four red markers sit on the
    inner steps; one blue square at the centre is the visitor."""
    pts = ("120,40 280,40 280,80 320,80 320,120 360,120 360,280 320,280 "
           "320,320 280,320 280,360 120,360 120,320 80,320 80,280 40,280 "
           "40,120 80,120 80,80 120,80")
    block = "M" + " L".join(pts.split()) + "Z"
    hole = "M200,72 a128,128 0 1,0 0.01,0Z"
    inner = (
        f'<path class="i-ink" fill-rule="evenodd" d="{block} {hole}"/>'
        '<circle class="i-red" cx="92" cy="92" r="11"/>'
        '<circle class="i-red" cx="308" cy="92" r="11"/>'
        '<circle class="i-red" cx="92" cy="308" r="11"/>'
        '<circle class="i-red" cx="308" cy="308" r="11"/>'
        '<rect class="i-blue" x="186" y="186" width="28" height="28"/>'
    )
    return svg("ent", "The entrance",
               "A heavy stepped block with a round opening cut through it. "
               "Four red dots mark its corners; a blue square stands in the "
               "middle of the opening, the visitor passing through.",
               "0 0 400 400", inner, "ill-hero")


# ---------------------------------------------------------------- doors
def doors():
    left = ("M20,40 H150 V270 H20Z "            # frame
            "M44,96 H126 V156 H44Z")            # the one-height opening
    right = ("M240,40 H380 V270 H240Z "
             "M266,68 H354 V270 H266Z")
    inner = (
        '<rect class="i-ink" x="0" y="268" width="400" height="5"/>'
        f'<path class="i-ink" fill-rule="evenodd" d="{left}"/>'
        f'<path class="i-ink" fill-rule="evenodd" d="{right}"/>'
        # the one person who fits
        '<circle class="i-blue" cx="85" cy="126" r="16"/>'
        # dimension mark
        '<path class="s-ink" stroke-width="2" d="M160,96 H176 M168,96 V156 M160,156 H176"/>'
        '<text class="t-ink" x="182" y="132" font-size="16">5′10″</text>'
        # everyone through the good door
        '<circle class="i-blue" cx="290" cy="126" r="16"/>'
        '<circle class="i-red" cx="328" cy="226" r="20"/>'
        '<rect class="i-red" x="276" y="226" width="24" height="24"/>'
        '<rect class="i-blue" x="322" y="150" width="16" height="16"/>'
        '<text class="t-ink" x="85" y="300" font-size="17" text-anchor="middle">Opens at one height</text>'
        '<text class="t-ink" x="310" y="300" font-size="17" text-anchor="middle">Opens for everyone</text>'
    )
    return svg("door", "Two doors",
               "Left, a heavy door whose only opening is a small window at "
               "5 foot 10 inches; one person of that height fits. Right, a "
               "door open from floor to lintel, with people of every height "
               "passing through, a wheelchair user and a child among them.",
               "0 0 400 312", inner)


# ---------------------------------------------------------------- principles
def _star_path(cx, cy, r):
    k = r * 0.3   # how far the sides pinch in
    return (f"M{cx},{cy-r} C{cx+k},{cy-k*1.1} {cx+k*1.1},{cy-k} {cx+r},{cy} "
            f"C{cx+k*1.1},{cy+k} {cx+k},{cy+k*1.1} {cx},{cy+r} "
            f"C{cx-k},{cy+k*1.1} {cx-k*1.1},{cy+k} {cx-r},{cy} "
            f"C{cx-k*1.1},{cy-k} {cx-k},{cy-k*1.1} {cx},{cy-r}Z")


def _star_layers(cx, cy, r, blur):
    f = _uid("blur")
    return (
        f'<defs><filter id="{f}" x="-40%" y="-40%" width="180%" height="180%">'
        f'<feGaussianBlur stdDeviation="{blur}"/></filter></defs>'
        f'<g filter="url(#{f})">'
        f'<path class="i-red" opacity="0.55" d="{_star_path(cx, cy, r)}"/>'
        f'<path class="i-blue" d="{_star_path(cx, cy, r*0.82)}"/>'
        f'<path class="i-ink" d="{_star_path(cx, cy, r*0.46)}"/>'
        "</g>"
    )


def principle(name):
    if name == "perceivable":
        inner = ('<circle class="s-ink" cx="80" cy="80" r="52" stroke-width="18"/>'
                 '<circle class="i-blue" cx="80" cy="80" r="20"/>')
        desc = "A heavy ring like a lens, with a blue pupil at its centre."
    elif name == "operable":
        inner = ('<rect class="s-blue" x="18" y="18" width="124" height="124" '
                 'stroke-width="4" stroke-dasharray="10 8"/>'
                 '<path class="i-ink" fill-rule="evenodd" '
                 'd="M34,34 H126 V126 H34Z M52,52 H108 V108 H52Z"/>'
                 '<circle class="i-red" cx="80" cy="80" r="16"/>')
        desc = ("A square button with a red dot pressed at its centre, "
                "ringed by a dashed blue focus outline.")
    elif name == "understandable":
        bars = "".join(
            f'<rect class="{"i-red" if i == 4 else "i-ink"}" x="{22 + i*24}" '
            f'y="{126 - (i+1)*20}" width="16" height="{(i+1)*20}"/>'
            for i in range(5))
        inner = f'<rect class="i-ink" x="14" y="128" width="132" height="4"/>{bars}'
        desc = "Five bars rising in order from short to tall, the last in red."
    else:
        inner = _star_layers(80, 80, 70, 7)
        desc = "A soft four-pointed star in blue with a dark core and a red haze."
    return svg("p", name.capitalize(), desc, "0 0 160 160", inner, "ill-glyph")


# ---------------------------------------------------------------- curb cut
def curb_cut():
    inner = (
        '<rect class="i-ink" x="0" y="190" width="360" height="6"/>'
        '<path class="i-ink" d="M0,120 H110 L230,190 H0Z"/>'
        # a wheelchair, a stroller, luggage, a hand truck
        '<circle class="i-blue" cx="54" cy="100" r="18"/>'
        '<circle class="i-red" cx="166" cy="134" r="13"/>'
        '<rect class="i-blue" x="250" y="160" width="26" height="26"/>'
        '<rect class="i-red" x="300" y="146" width="18" height="40"/>'
        '<path class="s-ink" stroke-width="2" stroke-dasharray="4 6" '
        'd="M74,104 C120,110 140,120 152,128 M180,144 C210,160 230,170 246,172 '
        'M280,174 H296"/>'
    )
    return svg("curb", "A curb cut",
               "A raised pavement slopes down to the road. A wheelchair, a "
               "stroller, a suitcase and a hand truck all follow the same "
               "slope from pavement to street.",
               "0 0 360 200", inner)


# ---------------------------------------------------------------- fines
def fines():
    big = 200
    small = round(big / 10 ** 0.5)
    inner = (
        f'<rect class="s-blue" x="148" y="{240-big}" width="{big}" height="{big}" stroke-width="4"/>'
        f'<rect class="i-red" x="20" y="{240-small}" width="{small}" height="{small}"/>'
        f'<text class="t-ink" x="20" y="{240-small-30}" font-size="17">€100,000</text>'
        f'<text class="t-ink" x="20" y="{240-small-10}" font-size="15">Germany</text>'
        f'<text class="t-ink" x="164" y="{240-big+30}" font-size="17">€1,000,000+</text>'
        f'<text class="t-ink" x="164" y="{240-big+50}" font-size="15">some EU countries</text>'
    )
    return svg("fine", "Maximum fines, drawn to scale",
               "A small red square for a fine of up to 100,000 euros in "
               "Germany beside a large blue square, ten times its area, for "
               "fines above 1,000,000 euros in some EU countries.",
               "0 0 360 246", inner)


# ---------------------------------------------------------------- foundation
def foundation():
    inner = (
        # later: blocks slip, foundation dashed underneath
        '<g transform="rotate(-3 100 160)">'
        '<path class="i-ink" d="M44,96 L100,56 L156,96Z"/>'
        '<rect class="i-ink" x="50" y="100" width="100" height="34"/>'
        '<rect class="i-ink" x="56" y="138" width="100" height="34"/>'
        '<rect class="i-ink" x="44" y="176" width="100" height="34"/>'
        '</g>'
        '<rect class="s-ink" x="30" y="222" width="140" height="18" stroke-width="2" stroke-dasharray="6 5"/>'
        # first: red foundation, square stack
        '<rect class="i-red" x="210" y="222" width="140" height="18"/>'
        '<path class="i-ink" d="M224,96 L280,56 L336,96Z"/>'
        '<rect class="i-ink" x="230" y="100" width="100" height="34"/>'
        '<rect class="i-ink" x="230" y="138" width="100" height="34"/>'
        '<rect class="i-ink" x="230" y="176" width="100" height="42"/>'
        '<text class="t-ink" x="100" y="270" font-size="17" text-anchor="middle">Added afterwards</text>'
        '<text class="t-ink" x="280" y="270" font-size="17" text-anchor="middle">From day one</text>'
    )
    return svg("fdn", "Two houses",
               "Left, a house whose blocks lean out of line, with a dashed "
               "outline under it for a foundation added afterwards. Right, "
               "the same house standing straight on a solid red foundation "
               "laid first.",
               "0 0 380 282", inner)


# ---------------------------------------------------------------- mobile
def mobile_first():
    inner = (
        '<rect class="s-ink" x="20" y="34" width="320" height="196" stroke-width="3"/>'
        '<rect class="s-ink" x="20" y="96" width="176" height="134" stroke-width="3"/>'
        '<rect class="i-ink" x="20" y="146" width="66" height="84"/>'
        '<rect class="i-red" x="30" y="156" width="46" height="20"/>'
        '<rect class="i-paper" x="30" y="184" width="46" height="5"/>'
        '<rect class="i-paper" x="30" y="195" width="34" height="5"/>'
        '<rect class="i-paper" x="30" y="206" width="40" height="5"/>'
        '<text class="t-red" x="96" y="168" font-size="16">01 Phone</text>'
        '<text class="t-ink" x="30" y="122" font-size="16">02 Tablet</text>'
        '<text class="t-ink" x="30" y="60" font-size="16">03 Desktop</text>'
    )
    return svg("mob", "Phone first",
               "Three screen outlines nested in one corner: a filled phone, "
               "then a tablet around it, then a desktop around both, numbered "
               "in the order they are designed.",
               "0 0 360 244", inner)


# ---------------------------------------------------------------- the X
def x_mark():
    inner = (
        '<rect class="s-ink" x="20" y="40" width="120" height="120" stroke-width="4"/>'
        '<path class="s-ink" stroke-width="16" stroke-linecap="square" d="M52,72 L108,128 M108,72 L52,128"/>'
        '<path class="s-ink" stroke-width="2" d="M150,80 H170 M150,124 H170"/>'
        '<text class="t-blue" x="180" y="74" font-size="15">With a name</text>'
        '<text class="t-ink" x="180" y="96" font-size="18">“Close, button”</text>'
        '<text class="t-red" x="180" y="128" font-size="15">Without one</text>'
        '<text class="t-ink" x="180" y="150" font-size="18">“Button”</text>'
    )
    return svg("x", "One X, two readings",
               "A heavy X in a square. Given a name, a screen reader "
               "announces it as Close, button. Without a name it says only "
               "Button, and the visitor has to guess.",
               "0 0 360 200", inner)


# ---------------------------------------------------------------- alt text
def alt_text():
    band = "".join(f'<circle class="i-blue" cx="{110 + i*35}" cy="70" r="14"/>' for i in range(5))
    fans = "".join(
        f'<circle class="i-red" cx="{48 + (i % 12)*24}" cy="{118 + (i // 12)*20}" r="6"/>'
        for i in range(24))
    inner = (
        '<rect class="s-ink" x="20" y="20" width="320" height="150" stroke-width="4"/>'
        f"{band}{fans}"
        '<text class="t-red" x="20" y="200" font-size="15">A machine writes</text>'
        '<text class="t-ink" x="20" y="222" font-size="18">“Group of people”</text>'
        '<text class="t-blue" x="20" y="252" font-size="15">A person writes</text>'
        '<text class="t-ink" x="20" y="274" font-size="18">“K-pop band posing with fans”</text>'
    )
    return svg("alt", "Two descriptions of one picture",
               "A framed picture: five blue figures in a row above a crowd of "
               "small red figures. A machine describes it as a group of "
               "people; a person describes it as a K-pop band posing with fans.",
               "0 0 360 288", inner)


# ---------------------------------------------------------------- library
def library():
    colour = ["i-blue", "i-blue", "i-blue", "i-red", "i-red", "i-ink", "i-ink", "i-ink", "i-ink", "i-red"]
    colour.sort()
    hs = [58, 44, 62, 50, 40, 64, 48, 56, 42, 60]
    top = "".join(f'<rect class="{c}" x="{20 + i*32}" y="{100-h}" width="26" height="{h}"/>'
                  for i, (c, h) in enumerate(zip(colour, hs)))
    bottom = "".join(
        f'<rect class="{"i-red" if i == 6 else "i-ink"}" x="{20 + i*32}" y="{214-(36+i*3)}" width="26" height="{36+i*3}"/>'
        for i in range(10))
    inner = (
        '<text class="t-ink" x="20" y="24" font-size="15">Filed by colour</text>'
        f'{top}<rect class="i-ink" x="14" y="100" width="330" height="4"/>'
        '<text class="t-ink" x="20" y="138" font-size="15">Filed in order</text>'
        f'{bottom}<rect class="i-ink" x="14" y="214" width="330" height="4"/>'
    )
    return svg("lib", "Two shelves",
               "Top, books filed by colour: tidy, but nothing can be found. "
               "Bottom, the same books in order of size, with the one you are "
               "looking for, in red, easy to spot.",
               "0 0 360 226", inner)


# ---------------------------------------------------------------- star
def star():
    return svg("star", "A weathered star",
               "A soft four-pointed star: a dark core, a blue body and a red "
               "haze at its edges, holding its shape though its outline is "
               "blurred.",
               "0 0 400 400", _star_layers(200, 200, 180, 16), "ill-star")
