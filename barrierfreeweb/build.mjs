// Builds the BarrierFreeWeb studio site: `node build.mjs` writes one HTML
// file per page beside this script. No dependencies. The copy lives here, the
// look in styles.css.
//
// The layout follows a reference site (user's instruction, 15 Nov 2026):
// one face (PP Telegraf Regular) at one size, a centred wordmark over the left column, the
// navigation fixed in a narrow column beside it, and the home page as a list
// of centred entries, each with its excerpt set to its right.
//
// Typography: write " – " in copy and set() makes it a spaced en dash after a
// no-break space; an em dash in copy is a fault and fails the build.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MAIL = "gf@barrierfreeweb.de";
// The scan widget on scan.html is served by the deployed backend (../backend).
const SCAN = "https://a11y-checker-v2-production.up.railway.app";
const mailto = (subject) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}`;

/** Prose typesetting, applied to text only, never to tags or attributes. */
function set(html) {
  if (html.includes("—")) throw new Error(`Em dash in copy: ${html.slice(0, 80)}`);
  return html
    .split(/(<[^>]+>)/)
    .map((part) => (part.startsWith("<") ? part : part.replace(/ – /g, " – ")))
    .join("");
}

const p = (...paras) => paras.map((t) => `<p>${set(t)}</p>`).join("\n");
const dash = (items) => `<ul class="dash">\n${items.map((t) => `<li>${set(t)}</li>`).join("\n")}\n</ul>`;
const lines = (items) => `<ul class="lines">\n${items.map((t) => `<li>${set(t)}</li>`).join("\n")}\n</ul>`;
const cols = (pairs) =>
  `<dl class="pairs">\n${pairs.map(([t, d]) => `<div><dt>${set(t)}</dt><dd>${set(d)}</dd></div>`).join("\n")}\n</dl>`;
/** A call to action is a plain underlined link, as everything on this site is text. */
const btn = (label, subject) => `<a class="cta" href="${mailto(subject)}">${label}</a>`;
const sec = (title, body, id) =>
  `<section class="sec"${id ? ` id="${id}"` : ""}>\n<h2>${set(title)}</h2>\n${body}\n</section>`;
const hero = (title, rest = "") => `<h1>${set(title)}</h1>\n${rest}`;
const hl = (t) => t;

const SERVICES = [
  ["design-and-typography.html", "Design and typography"],
  ["ux-ui.html", "UX/UI design"],
  ["brand-development.html", "Brand development"],
  ["content-strategy.html", "Content strategy"],
  ["copywriting.html", "Copywriting"],
  ["accessibility.html", "Accessibility testing"],
];
const blocks = (current) =>
  `<ul class="lines">\n${SERVICES.map(
    ([href, name]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ""}>${name}</a></li>`,
  ).join("\n")}\n</ul>`;

// What clients have said, in their words: [quote, name, role or company].
// Only real, permitted quotes go here. While it is empty, reviews.html is not
// written and nothing links to it, so the site never shows an invented review.
const REVIEWS = [];

// One navigation, in two groups: the pages, then the two things to do.
const NAV = [
  [
    ["services.html", "Services"],
    ["accessibility.html", "Accessibility"],
    ...(REVIEWS.length ? [["reviews.html", "Reviews"]] : []),
    ["about.html", "About"],
  ],
  [
    ["scan.html", "Check your site"],
    [`mailto:${MAIL}`, "Contact"],
  ],
];

// The clock under the navigation, as on the reference: Berlin time, to the
// minute, so nothing on the page moves more than once a minute. Without
// script the line stays hidden.
const CLOCK = `<script>
(function () {
  var el = document.getElementById("clock");
  if (!el || !window.Intl) return;
  var f = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" });
  function tick() { el.textContent = "Berlin, " + f.format(new Date()); el.hidden = false; }
  tick(); setInterval(tick, 20000);
})();
</script>`;

function page({ file, title, description, section, lead = "", body, home = false, wide = false }) {
  const nav = NAV.map(
    (group) =>
      `<ul>\n${group
        .map(([href, name]) => `    <li><a href="${href}"${href === section ? ' aria-current="page"' : ""}>${name}</a></li>`)
        .join("\n")}\n  </ul>`,
  ).join("\n  ");
  const brand = home
    ? `<h1 class="brand"><a href="index.html" aria-current="page">BarrierFreeWeb</a></h1>`
    : `<p class="brand"><a href="index.html">BarrierFreeWeb</a></p>`;
  const main = home
    ? body
    : `<div class="lead">\n${lead}\n</div>\n<div class="body${wide ? " body-wide" : ""}">\n${body}\n</div>`;
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="preload" href="fonts/PPTelegraf-Regular.otf" as="font" type="font/otf" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body class="${home ? "home" : "inner"}">
<a class="skip" href="#main">Skip to content</a>
<header class="mast">
${brand}
</header>
<nav class="nav" aria-label="Main">
  ${nav}
  <p class="clock" id="clock" hidden></p>
</nav>
<main id="main">
${main}
</main>
<footer class="info">
  <p>BarrierFreeWeb<br>Design studio, Berlin<br><a href="mailto:${MAIL}">${MAIL}</a></p>
  <p>Not sure if your site is compliant?<br>${btn("Request an accessibility audit", "Accessibility audit")}</p>
</footer>
${CLOCK}
</body>
</html>
`;
  writeFileSync(join(here, file), html);
  console.log(`wrote ${file}`);
}

// ── Home: a list of entries, each a page ────────────────────────────────
// [category (the line in parentheses; empty for none), title, line under it,
// excerpt shown beside it, href]
const ENTRIES = [
  ["Studio", "BarrierFreeWeb", "Berlin", "We’re a design studio in Berlin building websites that everyone can use.", "about.html"],
  [
    "Law",
    "The European Accessibility Act is here.",
    "Since 28 June 2025",
    "As of 28 June 2025, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines. Not sure if your site is compliant? We can help.",
    "accessibility.html",
  ],
  [
    "",
    "Building websites that work for everyone.",
    "Web design, brand, content",
    "We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.",
    "services.html",
  ],
  ["", "Design and Typography", "Reflow, fluid layout, semantic markup, alt text", "We make sure your content works everywhere, for everyone.", "design-and-typography.html"],
  ["", "UX/UI and Web Development", "Components, robust code, status messages", "We build interfaces that actually work.", "ux-ui.html"],
  ["", "Brand Development", "Identity, voice, guidelines, art direction", "Brand identities that are clear, memorable, and work for everyone.", "brand-development.html"],
  ["", "Content Strategy", "Structure, navigation, inclusive language", "Structure and strategy that makes your content work better with assistive technologies.", "content-strategy.html"],
  ["", "Copywriting", "Clear, scannable, descriptive", "We believe in simplicity.", "copywriting.html"],
  ["Audit", "Check your site", "Accessibility testing", "Not sure if your site is compliant? We can help.", "scan.html"],
];
page({
  file: "index.html",
  home: true,
  title: "BarrierFreeWeb – accessible web design studio, Berlin",
  description: "A design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
  body: `<ol class="entries">
${ENTRIES.map(
  ([cat, title, line, more, href]) => `<li>
<a href="${href}">${cat ? `<span>(${cat})</span><br>` : ""}<span class="t">${set(title)}</span><br><span>${set(line)}</span></a>
<p class="more">${set(more)}</p>
</li>`,
).join("\n")}
</ol>
<p class="closing">If everyone can’t use the door, is it truly an entrance?</p>`,
});

// ── Check your site: the scan widget ────────────────────────────────────
page({
  file: "scan.html",
  section: "scan.html",
  wide: true,
  title: "Check your site – BarrierFreeWeb",
  description: "Scan a page against the accessibility requirements of the European Accessibility Act.",
  lead: hero(
    "Check your site",
    p("Not sure if your site is compliant? We can help.") +
      `\n<p>${btn("Request an accessibility audit", "Accessibility audit")}</p>`,
  ),
  body: `<div id="a11y-widget-business-root" data-api-base="${SCAN}" data-language="en"></div>
<script src="${SCAN}/widget-business.js" defer></script>`,
});

// ── Services ────────────────────────────────────────────────────────────
page({
  file: "services.html",
  section: "services.html",
  title: "Services – BarrierFreeWeb",
  description: "Accessible web design, brand development and content strategy that meet EAA accessibility standards.",
  lead: hero(
      "Building websites that work for everyone.",
      `<p class="lede">${set("We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.")}</p>
<p class="lede">${set("Think of it this way: A door that only opens if you’re exactly 5′10″ isn’t a broken door – it’s a badly designed one. Good design works for everyone.")}</p>`,
    ),
    body: [
    sec("What we offer", blocks(), "offer"),
    sec(
      "Our approach",
      cols([
        ["Focused", "Messages are clear, obvious, and impactful"],
        ["User-centered", "Navigation is smooth, intuitive, and inclusive"],
        ["Future-proof", "Content is purposeful, adaptable, and cost-effective"],
      ]) + p("Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites."),
    ),
    sec(
      "Mobile-first design",
      p("Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions."),
    ),
    sec(
      "Why not just fix your current site?",
      p(
        "Retrofitting older websites – especially those built on HTML 4 or earlier – is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No.",
        "Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance.",
      ),
    ),
    sec(
      "The EAA deadline has passed.",
      p(`As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach ${hl("€100,000")}.`),
    ),
    sec(
      "Who’s affected",
      lines([
        "Software, SaaS, and digital services",
        "Fintech and financial services",
        "E-commerce, fashion, and retail",
        "Education and online learning",
        "Branding and marketing agencies",
        "Art galleries and museums",
        "Architecture and design firms",
        "Travel, restaurants, and hospitality",
      ]) +
        p(
          "Companies with fewer than 10 employees and annual revenue under €2 million are exempt.",
          "This exemption does not apply to companies that offer products subject to accessibility requirements, such as:",
        ) +
        dash([
          "websites, apps, and e-commerce platforms",
          "consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices).",
        ]),
    ),
    sec(
      "But can’t I just use AI?",
      p(
        "No. AI’s great for breakup texts or visa forms – not accessibility compliance.",
        "It can flag missing alt text or contrast errors, but it can’t tell ‘K-pop band posing with fans’ from ‘group of people’. Real accessibility needs judgment and empathy, which only humans have.",
        "In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks.",
      ),
    ),
    sec(
      "Benefits of accessibility compliance",
      lines([
        "Legal protection",
        "Improved SEO and discoverability",
        "Expanded audience reach",
        "Enhanced brand reputation",
        "Modern, contemporary design",
      ]),
    ),
    sec(
      "What you get",
      p("A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards – verified through thorough testing.") +
        `\n<p>${btn("Request a quote today", "Quote request")}</p>`,
    ),
  ].join("\n"),
});

// ── The service pages ───────────────────────────────────────────────────
function service({ file, name, lede, intro = "", items }) {
  page({
    file,
    section: "services.html",
    title: `${name} – BarrierFreeWeb`,
    description: lede,
    lead: hero(name, `<p class="lede">${set(lede)}</p>`),
    body: [
      sec("What this covers", (intro ? p(intro) : "") + cols(items) + `\n<p>${btn("Request a quote", `Quote request: ${name}`)}</p>`),
      sec("More services", blocks(file)),
    ].join("\n"),
  });
}

service({
  file: "design-and-typography.html",
  name: "Design and Typography",
  lede: "We make sure your content works everywhere, for everyone.",
  items: [
    ["Text reflow", "Content resizes smoothly across all screen sizes"],
    ["Fluid design", "Flexible layouts that adapt without breaking or losing meaning"],
    ["Semantic markup", "Content organized so screen readers can understand it"],
    ["Alt text", "Written descriptions of images and videos for people using screen readers"],
  ],
});
service({
  file: "ux-ui.html",
  name: "UX/UI and Web Development",
  lede: "We build interfaces that actually work.",
  items: [
    ["Accessible components", "User interface elements with clear names, roles, and states"],
    ["Robust code", "Compatible with all browsers and assistive technologies"],
    ["Status messages", "Updates and alerts that don’t interfere with assistive technologies"],
    ["Color customization", "Works with any color settings users choose"],
  ],
});
service({
  file: "brand-development.html",
  name: "Brand Development",
  lede: "Brand identities that are clear, memorable, and work for everyone.",
  items: [
    ["Logo and visual identity", "Key elements that are memorable and convey your core values"],
    ["Brand voice", "Tone and language that’s authentic to your company and resonates with your audience"],
    ["Brand guidelines", "Comprehensive instructions for maintaining consistency across all touchpoints"],
    ["Optimized typography", "Readable fonts with strategic spacing and hierarchy"],
    ["Contrast optimization", "Visual elements that stand out and meet accessibility standards"],
    ["Strategic use of color", "Colors that ensure clarity"],
    ["Art direction", "Cohesive visual aesthetics aligned with your values"],
  ],
});
service({
  file: "content-strategy.html",
  name: "Content Strategy",
  lede: "Structure and strategy that makes your content work better with assistive technologies.",
  items: [
    ["Clear, logical structure", "Content organized with descriptive headings and intuitive flow"],
    ["Consistent navigation", "Predictable, easy-to-understand paths through your site"],
    ["Input assistance", "Clear instructions, error recognition, and helpful correction suggestions"],
    ["Inclusive language", "Respectful, non-discriminatory content that addresses diverse audiences"],
    ["Screen reader optimization", "Logical content order that reads naturally with assistive technology"],
    ["Meaningful descriptions", "Alt text and descriptive links that explain an image’s purpose, not just presence"],
  ],
});
service({
  file: "copywriting.html",
  name: "Copywriting",
  lede: "We believe in simplicity.",
  intro: "Good copy should be:",
  items: [
    ["Clear", "Concise language without jargon"],
    ["Accessible", "Easy to grasp for a broad audience"],
    ["Scannable", "Short paragraphs with logical breaks and clear bullet points"],
    ["Inclusive", "Respectful and resonant with diverse readers"],
    ["Descriptive", "Links and alt text that explain purpose, not just ‘click here’"],
    ["Screen reader-friendly", "Logical flow without visual cues like ‘see below’"],
  ],
});

// ── Accessibility ───────────────────────────────────────────────────────
page({
  file: "accessibility.html",
  section: "accessibility.html",
  title: "Accessibility – BarrierFreeWeb",
  description: "Why accessibility matters, what the law requires across Europe, and whether it applies to your business.",
  lead: hero(
      "Accessibility is a human right. No exceptions.",
      `<p class="lede">${set("Life has moved online. We depend on the internet for work, connection, and daily necessities. It’s our entertainment, but it’s also essential. Everyone needs to be able to use it.")}</p>
<p class="lede">${set("Remember: When you build a house, you don’t make the door optional. The same goes for digital access – everyone needs a way in.")}</p>`,
    ),
    body: [
    sec(
      "Accessibility benefits everyone.",
      p(
        "You’ve probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That’s accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea.",
        "These features weren’t designed exclusively for people with disabilities – they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks.",
        "Good accessible design doesn’t just help some users – it creates a better experience for everyone.",
      ),
    ),
    sec(
      "The legal landscape",
      p(
        `As of ${hl("28 June 2025")}, accessibility isn’t optional anymore – it’s the law across Europe. Germany has the BFSG (Barrier-Free Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet ${hl("WCAG 2.1 Level AA", "blue")} standards.`,
        `What happens if you don’t comply? Fines can reach up to ${hl("€100,000")} in Germany, and over €1,000,000 in some EU countries.`,
        "Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren’t fixed.",
      ),
    ),
    sec(
      "Who needs accessibility?",
      p("Here’s the thing: accessibility isn’t just for people with permanent disabilities. At some point, we all need these features.") +
        cols([
          ["Motor limitations", "Broken arms, carrying groceries, holding a baby"],
          ["Visual limitations", "Forgot your glasses, cracked phone screen, sun glare on your laptop"],
          ["Auditory limitations", "Loud café, ear infection, dead headphone battery"],
          ["Cognitive limitations", "Tired after a long day, stressed and distracted, trying to multitask"],
        ]) +
        p("Sound familiar? That’s because accessible design helps all of us."),
    ),
    sec(
      "What makes a website accessible?",
      p("Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG):") +
        cols([
          ["Perceivable", "Everyone can access your information, even if they can’t use all their senses"],
          ["Operable", "All your website’s functions work for everyone, no exceptions"],
          ["Understandable", "Your content is clear and your navigation makes sense"],
          ["Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future"],
        ]),
    ),
    sec(
      "Does this apply to my business?",
      p("Short answer: " + hl("Probably yes.", "green"), "If you operate in the EU and your website does any of the following, you need to comply:") +
        dash([
          "Sells products or services online",
          "Allows users to book appointments or reservations",
          "Provides banking, transport, or media services",
          "Was updated or published after 28 June 2025",
        ]) +
        p(
          "This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more.",
          "The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million.",
          "But even small businesses aren’t always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size.",
          "Not sure if this applies to you? Request a free accessibility audit and we’ll help you figure it out.",
        ) +
        `\n<p>${btn("Request a free accessibility audit", "Free accessibility audit")}</p>`,
    ),
  ].join("\n"),
});

// ── About ───────────────────────────────────────────────────────────────
page({
  file: "about.html",
  section: "about.html",
  title: "About – BarrierFreeWeb",
  description: "BarrierFreeWeb is a design studio in Berlin building websites that work for everyone.",
  lead: hero(
      "About BarrierFreeWeb",
      `<p class="lede">${set("We’re a design studio in Berlin building websites that work for everyone.")}</p>`,
    ),
    body: [
    sec(
      "Our approach",
      p(
        "Most studios design a beautiful website first, then try to make it accessible later. That’s like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one.",
        "With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive.",
      ),
    ),
    sec(
      "Our team",
      cols([
        ["Liza Gavrova", "Co-Founder & Managing Director"],
        ["Polina Vasilieva", "Co-Founder & Designer"],
      ]),
    ),
    sec(
      "Background",
      p(
        "Our practice sits between language, design, and technology.",
        "Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence – and that every project, no matter the scale, deserves both.",
      ),
    ),
    sec(
      "Contact",
      `<p><a href="mailto:${MAIL}">${MAIL}</a></p>`,
    ),
  ].join("\n"),
});

// ── Reviews ─────────────────────────────────────────────────────────────
// English quotations take single marks first (see ../CLAUDE.md, Punctuation).
if (REVIEWS.length) {
  page({
    file: "reviews.html",
    section: "reviews.html",
    title: "Reviews – BarrierFreeWeb",
    description: "What clients say about working with BarrierFreeWeb.",
    lead: hero("Don’t just take our word for it.", p("A few words from the people we’ve built websites for.")),
    body: [
      ...REVIEWS.map(
        ([quote, name, role]) =>
          `<section class="sec"><figure class="review">\n<blockquote><p>‘${set(quote)}’</p></blockquote>\n<figcaption>${set(name)}${role ? `<br>${set(role)}` : ""}</figcaption>\n</figure></section>`,
      ),
      `<section class="sec"><p>${btn("Work with us", "New project")}</p></section>`,
    ].join("\n"),
  });
}
