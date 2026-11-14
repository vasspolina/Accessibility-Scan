// Builds the BarrierFreeWeb studio site: `node build.mjs` writes one HTML
// file per page beside this script. No dependencies. The copy lives here, the
// look in styles.css.
//
// Typography follows the widget's rules (../CLAUDE.md, "Punctuation"):
// write " – " in copy and set() makes it a spaced en dash after a no-break
// space; an em dash in copy is a fault and fails the build. A run of three or
// more capitals in prose (WCAG, EAA) is wrapped in .caps.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MAIL = "gf@barrierfreeweb.de";
const mailto = (subject) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}`;

/** Prose typesetting, applied to text only, never to tags or attributes. */
function set(html) {
  if (html.includes("—")) throw new Error(`Em dash in copy: ${html.slice(0, 80)}`);
  return html
    .split(/(<[^>]+>)/)
    .map((part) =>
      part.startsWith("<")
        ? part
        : part
            .replace(/ – /g, " – ")
            .replace(/\b[A-Z]{3,}\b/g, '<span class="caps">$&</span>'),
    )
    .join("");
}
/** Small sizes take the dash rule but not the capitals rule (that is for 27px prose). */
const small = (html) => set(html).replace(/<span class="caps">([A-Z]+)<\/span>/g, "$1");

const p = (...paras) => paras.map((t) => `<p>${set(t)}</p>`).join("\n");
const dash = (items) => `<ul class="dash">\n${items.map((t) => `<li>${set(t)}</li>`).join("\n")}\n</ul>`;
const lines = (items) => `<ul class="lines">\n${items.map((t) => `<li>${small(t)}</li>`).join("\n")}\n</ul>`;
const cols = (pairs) =>
  `<dl class="cols">\n${pairs.map(([t, d]) => `<div><dt>${small(t)}</dt><dd>${small(d)}</dd></div>`).join("\n")}\n</dl>`;
const btn = (label, subject, primary = true) =>
  `<a class="btn${primary ? " btn-primary" : ""}" href="${mailto(subject)}">${label}</a>`;
const sec = (title, body, id) =>
  `<section class="sec"${id ? ` id="${id}"` : ""}>\n<div>\n<h2>${small(title)}</h2>\n${body}\n</div>\n</section>`;
const hero = (title, rest = "") =>
  `<section class="hero">\n<h1 class="display">${title}</h1>\n${rest}\n</section>`;

const SERVICES = [
  ["design-and-typography.html", "Design and typography"],
  ["ux-ui.html", "UX/UI design"],
  ["brand-development.html", "Brand development"],
  ["content-strategy.html", "Content strategy"],
  ["copywriting.html", "Copywriting"],
  ["accessibility.html", "Accessibility testing"],
];
const blocks = (current) =>
  `<ul class="blocks">\n${SERVICES.map(
    ([href, name]) => `<li><a href="${href}"${href === current ? ' aria-current="page"' : ""}>${name}</a></li>`,
  ).join("\n")}\n</ul>`;

const NAV = [
  ["services.html", "Services"],
  ["accessibility.html", "Accessibility"],
  ["about.html", "About"],
];

function page({ file, title, description, section, body }) {
  const nav = NAV.map(
    ([href, name]) => `<li><a href="${href}"${href === section ? ' aria-current="page"' : ""}>${name}</a></li>`,
  ).join("\n        ");
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<link rel="preload" href="fonts/JokkerVF-TRIAL.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="index.html"${file === "index.html" ? ' aria-current="page"' : ""}>BarrierFreeWeb</a>
    <nav class="nav" aria-label="Main">
      <ul>
        ${nav}
        <li><a class="btn" href="mailto:${MAIL}">Contact</a></li>
      </ul>
    </nav>
  </div>
</header>
<main id="main" class="wrap">
${body}
</main>
<footer class="foot">
  <div class="wrap">
    <dl class="cols">
      <div><dt>Studio</dt><dd>BarrierFreeWeb<br>Berlin</dd></div>
      <div><dt>Contact</dt><dd><a href="mailto:${MAIL}">${MAIL}</a></dd></div>
      <div><dt>Services</dt><dd><ul>
        ${SERVICES.slice(0, 5).map(([href, name]) => `<li><a href="${href}">${name}</a></li>`).join("\n        ")}
      </ul></dd></div>
      <div><dt>Read</dt><dd><ul>
        <li><a href="accessibility.html">Accessibility</a></li>
        <li><a href="about.html">About</a></li>
      </ul></dd></div>
    </dl>
  </div>
</footer>
</body>
</html>
`;
  writeFileSync(join(here, file), html);
  console.log(`wrote ${file}`);
}

const hl = (t, colour = "") => `<span class="hl${colour ? ` hl-${colour}` : ""}">${t}</span>`;

// ── Home ────────────────────────────────────────────────────────────────
page({
  file: "index.html",
  title: "BarrierFreeWeb – accessible web design studio, Berlin",
  description: "A design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
  body: [
    hero("We’re a design studio in Berlin building websites that everyone can use."),
    sec(
      "The European Accessibility Act is here.",
      p(
        `As of ${hl("28 June 2025")}, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines.`,
        "Not sure if your site is compliant? We can help.",
      ) + `\n<div class="actions">${btn("Request an accessibility audit", "Accessibility audit")}</div>`,
    ),
    sec("What we offer", blocks()),
    `<section class="closing">\n<p class="display">If everyone can’t use the door, is it truly an entrance?</p>\n</section>`,
  ].join("\n"),
});

// ── Services ────────────────────────────────────────────────────────────
page({
  file: "services.html",
  section: "services.html",
  title: "Services – BarrierFreeWeb",
  description: "Accessible web design, brand development and content strategy that meet EAA accessibility standards.",
  body: [
    hero(
      "Building websites that work for everyone.",
      `<p class="lede">${set("We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.")}</p>
<p class="lede">${set("Think of it this way: A door that only opens if you’re exactly 5′10″ isn’t a broken door – it’s a badly designed one. Good design works for everyone.")}</p>`,
    ),
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
        `\n<div class="actions">${btn("Request a quote today", "Quote request")}</div>`,
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
    body: [
      hero(name, `<p class="lede">${set(lede)}</p>`),
      sec("What this covers", (intro ? p(intro) : "") + cols(items) + `\n<div class="actions">${btn("Request a quote", `Quote request: ${name}`)}</div>`),
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
  body: [
    hero(
      "Accessibility is a human right. No exceptions.",
      `<p class="lede">${set("Life has moved online. We depend on the internet for work, connection, and daily necessities. It’s our entertainment, but it’s also essential. Everyone needs to be able to use it.")}</p>
<p class="lede">${set("Remember: When you build a house, you don’t make the door optional. The same goes for digital access – everyone needs a way in.")}</p>`,
    ),
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
        `\n<div class="actions">${btn("Request a free accessibility audit", "Free accessibility audit")}</div>`,
    ),
  ].join("\n"),
});

// ── About ───────────────────────────────────────────────────────────────
page({
  file: "about.html",
  section: "about.html",
  title: "About – BarrierFreeWeb",
  description: "BarrierFreeWeb is a design studio in Berlin building websites that work for everyone.",
  body: [
    hero(
      "About BarrierFreeWeb",
      `<p class="lede">${set("We’re a design studio in Berlin building websites that work for everyone.")}</p>`,
    ),
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
        ["Co-Founder & Managing Director", "Liza Gavrova"],
        ["Co-Founder & Designer", "Polina Vasilieva"],
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
