// Builds the BarrierFreeWeb site: one HTML file per page, written beside this
// script. No dependencies. Run: node build.mjs
// The copy lives here, in one place; the layout lives in styles.css.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const MAIL = "gf@barrierfreeweb.de";
const mail = (subject) => `mailto:${MAIL}?subject=${encodeURIComponent(subject)}`;
const QUOTE = mail("Quote request");
const AUDIT = mail("Accessibility audit request");

const NAV = [
  ["services.html", "Services"],
  ["accessibility.html", "Accessibility"],
  ["about.html", "About"],
];

const SERVICES = [
  ["design-typography.html", "Design and typography"],
  ["ux-ui.html", "UX/UI design"],
  ["brand-development.html", "Brand development"],
  ["content-strategy.html", "Content strategy"],
  ["copywriting.html", "Copywriting"],
  ["accessibility.html", "Accessibility testing"],
];

/* ---------- blocks ---------- */

const pad = (n) => String(n).padStart(2, "0");

const hero = ({ title, lead, note, buttons }) => `
<section class="hero wrap" aria-labelledby="page-title">
  <div class="hero-top">
    <h1 id="page-title">${title}</h1>
    <p class="hero-actions">${buttons}</p>
  </div>
  <div class="hero-bottom">
    <p class="hero-lead">${lead}</p>
    <p class="hero-note">${note}</p>
  </div>
</section>`;

const btnQuote = (label = "Request a quote") => `<a class="btn btn-accent" href="${QUOTE}">${label}</a>`;
const btnAudit = (label = "Request an accessibility audit") => `<a class="btn" href="${AUDIT}">${label}</a>`;

// The poster: a stack of coloured spines, one line of the sentence on each.
const poster = (lines) => `
<div class="wrap-wide">
  <div class="poster">
    <p class="spines">
      ${lines.map((l, i) => `<span class="spine s${(i % 6) + 1}">${l}</span>`).join("\n      ")}
    </p>
  </div>
</div>`;

const sectionHead = (id, title, aside = "") => `
  <div class="section-head">
    <h2 id="${id}">${title}</h2>
    ${aside ? `<p>${aside}</p>` : ""}
  </div>`;

// Left: a black card with big words. Right: the body.
const split = ({ id, title, aside, card, body }) => `
<section class="wrap section" aria-labelledby="${id}">${sectionHead(id, title, aside)}
  <div class="split">
    <div class="card-dark specimen"><p>${card}</p></div>
    <div class="split-body">${body}</div>
  </div>
</section>`;

// The list of services, set as the style list: a name and a number per row.
const offer = (id = "offer", current = "") => `
<section class="wrap section" aria-labelledby="${id}">${sectionHead(id, "What we offer", `${SERVICES.length} services`)}
  <div class="split">
    <div class="card-dark specimen"><p>Design<br>for every<br>body.</p></div>
    <ul class="rows">
      ${SERVICES.map(
        ([href, name], i) =>
          `<li><a class="row" href="${href}"${href === current ? ' aria-current="page"' : ""}><span class="row-name w${i + 1}">${name}</span><span class="row-more">Learn more <span aria-hidden="true">→</span></span></a></li>`
      ).join("\n      ")}
    </ul>
  </div>
</section>`;

// Tiles with a small red label and a large word or a sentence under it.
const features = ({ id, title, aside, items, big = false, cols = 3, after = "" }) => `
<section class="wrap section" aria-labelledby="${id}">${sectionHead(id, title, aside)}
  <ul class="tiles cols-${cols}">
    ${items
      .map(([label, text]) =>
        big
          ? `<li class="tile tile-big"><span class="tag">${label}</span><p>${text}</p></li>`
          : `<li class="tile"><span class="tag">${label}</span><p>${text}</p></li>`
      )
      .join("\n    ")}
  </ul>${after ? `\n  <div class="after">${after}</div>` : ""}
</section>`;

// Small square tiles, numbered, set as the glyph grid.
const grid = ({ id, title, aside, items, after = "" }) => `
<section class="wrap section" aria-labelledby="${id}">${sectionHead(id, title, aside)}
  <ol class="glyphs">
    ${items.map((t, i) => `<li><span class="num" aria-hidden="true">${pad(i + 1)}</span><span>${t}</span></li>`).join("\n    ")}
  </ol>${after ? `\n  <div class="after">${after}</div>` : ""}
</section>`;

const dark = ({ id, title, body }) => `
<section class="wrap-wide" aria-labelledby="${id}">
  <div class="card-dark essay">
    <h2 id="${id}">${title}</h2>
    <div class="essay-body">${body}</div>
  </div>
</section>`;

const prose = ({ id, title, aside, body }) => `
<section class="wrap section" aria-labelledby="${id}">${sectionHead(id, title, aside)}
  <div class="prose">${body}</div>
</section>`;

const cta = ({ id = "cta", title, body, label = "Request a quote", href = QUOTE }) => `
<section class="wrap-wide" aria-labelledby="${id}">
  <div class="card-dark cta">
    <h2 id="${id}">${title}</h2>
    ${body ? `<p>${body}</p>` : ""}
    <a class="btn-giant" href="${href}">${label} <span aria-hidden="true">→</span></a>
  </div>
</section>`;

/* ---------- shared content ---------- */

const approach = features({
  id: "approach",
  title: "Our approach",
  aside: "3 principles",
  big: true,
  items: [
    ["Focused", "Messages are clear, obvious, and impactful"],
    ["User-centered", "Navigation is smooth, intuitive, and inclusive"],
    ["Future-proof", "Content is purposeful, adaptable, and cost-effective"],
  ],
  after: `<p>Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites.</p>`,
});

/* ---------- pages ---------- */

const pages = {};

pages["index.html"] = {
  title: "BarrierFreeWeb – Accessible web design studio, Berlin",
  description: "A design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
  body: [
    hero({
      title: "BarrierFreeWeb",
      lead: "We're a design studio in Berlin building websites that everyone can use.",
      note: "Berlin<br>WCAG 2.1 Level AA",
      buttons: `${btnAudit("Request an audit")} ${btnQuote()}`,
    }),
    poster(["If everyone", "can’t use the door,", "is it truly", "an entrance?"], "A question"),
    split({
      id: "eaa",
      title: "The European Accessibility Act is here.",
      aside: "In force",
      card: "28 June<br>2025",
      body: `
      <p class="large">As of 28 June 2025, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines.</p>
      <p class="large">Not sure if your site is compliant? We can help.</p>
      <p>${btnAudit()}</p>`,
    }),
    offer(),
    approach,
    cta({
      title: "Not sure if your site is compliant?",
      body: "We can help.",
      label: "Request an accessibility audit",
      href: AUDIT,
    }),
  ],
};

pages["services.html"] = {
  title: "Services – BarrierFreeWeb",
  description: "Accessible web design, brand development and content strategy that meets EAA accessibility standards.",
  body: [
    hero({
      title: "Services",
      lead: "Building websites that work for everyone. We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.",
      note: "Design, brand<br>and content",
      buttons: btnQuote(),
    }),
    poster(
      ["A door that only opens", "if you’re exactly 5′10″", "isn’t a broken door –", "it’s a badly designed one.", "Good design works for everyone."],
      "Think of it this way"
    ),
    offer(),
    approach,
    split({
      id: "mobile",
      title: "Mobile-first design",
      aside: "Phones first",
      card: "Phone<br>first.",
      body: `<p class="large">Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions.</p>`,
    }),
    dark({
      id: "retrofit",
      title: "Why not just fix your current site?",
      body: `
      <p>Retrofitting older websites – especially those built on HTML 4 or earlier – is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No.</p>
      <p>Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance.</p>`,
    }),
    split({
      id: "deadline",
      title: "The EAA deadline has passed.",
      aside: "Fines",
      card: "€100,000",
      body: `<p class="large">As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach €100,000.</p>`,
    }),
    grid({
      id: "affected",
      title: "Who’s affected",
      aside: "8 sectors",
      items: [
        "Software, SaaS, and digital services",
        "Fintech and financial services",
        "E-commerce, fashion, and retail",
        "Education and online learning",
        "Branding and marketing agencies",
        "Art galleries and museums",
        "Architecture and design firms",
        "Travel, restaurants, and hospitality",
      ],
      after: `
      <p>Companies with fewer than 10 employees and annual revenue under €2 million are exempt.</p>
      <p>This exemption does not apply to companies that offer products subject to accessibility requirements, such as:</p>
      <ul class="dash">
        <li>websites, apps, and e-commerce platforms</li>
        <li>consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices).</li>
      </ul>`,
    }),
    dark({
      id: "ai",
      title: "But can’t I just use AI?",
      body: `
      <p>No. AI’s great for breakup texts or visa forms – not accessibility compliance.</p>
      <p>It can flag missing alt text or contrast errors, but it can’t tell “K-pop band posing with fans” from “group of people.” Real accessibility needs judgment and empathy, which only humans have.</p>
      <p>In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks.</p>`,
    }),
    grid({
      id: "benefits",
      title: "Benefits of accessibility compliance",
      aside: "5 benefits",
      items: [
        "Legal protection",
        "Improved SEO and discoverability",
        "Expanded audience reach",
        "Enhanced brand reputation",
        "Modern, contemporary design",
      ],
    }),
    cta({
      title: "What you get",
      body: "A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards – verified through thorough testing.",
      label: "Request a quote today",
    }),
  ],
};

const servicePage = ({ file, title, lead, card, listTitle = "What that means", items, intro = "" }) => {
  pages[file] = {
    title: `${title} – BarrierFreeWeb`,
    description: lead,
    body: [
      hero({
        title,
        lead,
        note: `<a href="services.html">Services</a><br>${pad(SERVICES.findIndex(([f]) => f === file) + 1)} of ${pad(SERVICES.length)}`,
        buttons: btnQuote(),
      }),
      poster(card, title),
      features({
        id: "details",
        title: intro || listTitle,
        aside: `${items.length} parts`,
        items,
        cols: items.length % 3 === 0 ? 3 : 2,
      }),
      offer("more", file),
      cta({ title: "Your website should be usable by all." }),
    ],
  };
};

servicePage({
  file: "design-typography.html",
  title: "Design and Typography",
  lead: "We make sure your content works everywhere, for everyone.",
  card: ["Works", "everywhere,", "for everyone."],
  items: [
    ["Text reflow", "Content resizes smoothly across all screen sizes"],
    ["Fluid design", "Flexible layouts that adapt without breaking or losing meaning"],
    ["Semantic markup", "Content organized so screen readers can understand it"],
    ["Alt text", "Written descriptions of images and videos for people using screen readers"],
  ],
});

servicePage({
  file: "ux-ui.html",
  title: "UX/UI and Web Development",
  lead: "We build interfaces that actually work.",
  card: ["Interfaces", "that actually", "work."],
  items: [
    ["Accessible components", "User interface elements with clear names, roles, and states"],
    ["Robust code", "Compatible with all browsers and assistive technologies"],
    ["Status messages", "Updates and alerts that don't interfere with assistive technologies"],
    ["Color customization", "Works with any color settings users choose"],
  ],
});

servicePage({
  file: "brand-development.html",
  title: "Brand Development",
  lead: "Brand identities that are clear, memorable, and work for everyone.",
  card: ["Clear,", "memorable,", "for everyone."],
  items: [
    ["Logo and visual identity", "Key elements that are memorable and convey your core values"],
    ["Brand voice", "Tone and language that's authentic to your company and resonates with your audience"],
    ["Brand guidelines", "Comprehensive instructions for maintaining consistency across all touchpoints"],
    ["Optimized typography", "Readable fonts with strategic spacing and hierarchy"],
    ["Contrast optimization", "Visual elements that stand out and meet accessibility standards"],
    ["Strategic use of color", "Colors that ensure clarity"],
    ["Art direction", "Cohesive visual aesthetics aligned with your values"],
  ],
});

servicePage({
  file: "content-strategy.html",
  title: "Content Strategy",
  lead: "Structure and strategy that makes your content work better with assistive technologies.",
  card: ["Structure", "and", "strategy."],
  items: [
    ["Clear, logical structure", "Content organized with descriptive headings and intuitive flow"],
    ["Consistent navigation", "Predictable, easy-to-understand paths through your site"],
    ["Input assistance", "Clear instructions, error recognition, and helpful correction suggestions"],
    ["Inclusive language", "Respectful, non-discriminatory content that addresses diverse audiences"],
    ["Screen reader optimization", "Logical content order that reads naturally with assistive technology"],
    ["Meaningful descriptions", "Alt text and descriptive links that explain an image’s purpose, not just presence"],
  ],
});

servicePage({
  file: "copywriting.html",
  title: "Copywriting",
  lead: "We believe in simplicity.",
  card: ["We believe", "in", "simplicity."],
  intro: "Good copy should be:",
  items: [
    ["Clear", "Concise language without jargon"],
    ["Accessible", "Easy to grasp for a broad audience"],
    ["Scannable", "Short paragraphs with logical breaks and clear bullet points"],
    ["Inclusive", "Respectful and resonant with diverse readers"],
    ["Descriptive", "Links and alt text that explain purpose, not just “click here”"],
    ["Screen reader-friendly", "Logical flow without visual cues like “see below”"],
  ],
});

pages["accessibility.html"] = {
  title: "Accessibility – BarrierFreeWeb",
  description: "Accessibility is a human right. What the law requires, who needs accessibility, and whether it applies to your business.",
  body: [
    hero({
      title: "Accessibility",
      lead: "Accessibility is a human right. No exceptions.",
      note: "EAA, BFSG<br>Equality Act 2010",
      buttons: btnAudit("Request a free audit"),
    }),
    poster(["When you build a house,", "you don’t make", "the door optional.", "Everyone needs a way in."], "Remember"),
    prose({
      id: "right",
      title: "A human right",
      body: `
      <p class="large">Life has moved online. We depend on the internet for work, connection, and daily necessities. It's our entertainment, but it's also essential. Everyone needs to be able to use it.</p>
      <p class="large">Remember: When you build a house, you don't make the door optional. The same goes for digital access – everyone needs a way in.</p>`,
    }),
    dark({
      id: "everyone",
      title: "Accessibility benefits everyone.",
      body: `
      <p>You've probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That's accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea.</p>
      <p>These features weren't designed exclusively for people with disabilities – they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks.</p>
      <p>Good accessible design doesn't just help some users – it creates a better experience for everyone.</p>`,
    }),
    split({
      id: "legal",
      title: "The legal landscape",
      aside: "WCAG 2.1 Level AA",
      card: "It’s<br>the law.",
      body: `
      <p>As of June 28, 2025, accessibility isn't optional anymore – it's the law across Europe. Germany has the BFSG (Barrier-Free Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet WCAG 2.1 Level AA standards.</p>
      <p>What happens if you don't comply? Fines can reach up to €100,000 in Germany, and over €1,000,000 in some EU countries.</p>
      <p>Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren't fixed.</p>`,
    }),
    features({
      id: "who",
      title: "Who needs accessibility?",
      aside: "At some point, all of us",
      cols: 2,
      items: [
        ["Motor limitations", "Broken arms, carrying groceries, holding a baby"],
        ["Visual limitations", "Forgot your glasses, cracked phone screen, sun glare on your laptop"],
        ["Auditory limitations", "Loud café, ear infection, dead headphone battery"],
        ["Cognitive limitations", "Tired after a long day, stressed and distracted, trying to multitask"],
      ],
      after: `
      <p>Here's the thing: accessibility isn't just for people with permanent disabilities. At some point, we all need these features.</p>
      <p>Sound familiar? That's because accessible design helps all of us.</p>`,
    }),
    features({
      id: "principles",
      title: "What makes a website accessible?",
      aside: "4 principles",
      cols: 2,
      big: true,
      items: [
        ["Perceivable", "Everyone can access your information, even if they can't use all their senses"],
        ["Operable", "All your website's functions work for everyone, no exceptions"],
        ["Understandable", "Your content is clear and your navigation makes sense"],
        ["Robust", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future"],
      ],
      after: `<p>Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG).</p>`,
    }),
    grid({
      id: "applies",
      title: "Does this apply to my business?",
      aside: "Short answer: Probably yes.",
      items: [
        "Sells products or services online",
        "Allows users to book appointments or reservations",
        "Provides banking, transport, or media services",
        "Was updated or published after June 28, 2025",
      ],
      after: `
      <p>If you operate in the EU and your website does any of the above, you need to comply. This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more.</p>
      <p>The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million.</p>
      <p>But even small businesses aren't always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size.</p>`,
    }),
    cta({
      title: "Not sure if this applies to you?",
      body: "We'll help you figure it out.",
      label: "Request a free accessibility audit",
      href: AUDIT,
    }),
  ],
};

pages["about.html"] = {
  title: "About – BarrierFreeWeb",
  description: "BarrierFreeWeb is a design studio in Berlin building websites that work for everyone.",
  body: [
    hero({
      title: "About BarrierFreeWeb",
      lead: "We're a design studio in Berlin building websites that work for everyone.",
      note: "Berlin<br>US and EU markets",
      buttons: `<a class="btn btn-accent" href="mailto:${MAIL}">Contact us</a>`,
    }),
    poster(["We start", "with accessibility.", "From day one."], "Our approach"),
    split({
      id: "approach",
      title: "Our approach",
      aside: "Accessibility first",
      card: "Foundation<br>first.",
      body: `
      <p class="large">Most studios design a beautiful website first, then try to make it accessible later. That's like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one.</p>
      <p>With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive.</p>`,
    }),
    features({
      id: "team",
      title: "Our team",
      aside: "2 founders",
      cols: 2,
      big: true,
      items: [
        ["Co-Founder & Managing Director", "Liza Gavrova"],
        ["Co-Founder & Designer", "Polina Vasilieva"],
      ],
    }),
    dark({
      id: "background",
      title: "Background",
      body: `
      <p>Our practice sits between language, design, and technology.</p>
      <p>Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence – and that every project, no matter the scale, deserves both.</p>`,
    }),
    cta({ id: "contact", title: "Contact", label: MAIL, href: `mailto:${MAIL}` }),
  ],
};

/* ---------- shell ---------- */

const shell = (file, page) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<link rel="preload" href="fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="top-in">
    <a class="brand" href="index.html"${file === "index.html" ? ' aria-current="page"' : ""}>BarrierFreeWeb</a>
    <nav aria-label="Main">
      <ul>
        ${NAV.map(([href, name]) => `<li><a href="${href}"${href === file ? ' aria-current="page"' : ""}>${name}</a></li>`).join("\n        ")}
      </ul>
    </nav>
    <p class="top-actions"><a class="btn btn-small" href="${AUDIT}">Request an audit</a> <a class="btn btn-small btn-accent" href="${QUOTE}">Request a quote</a></p>
  </div>
</header>
<main id="main" tabindex="-1">
${page.body.join("\n")}
</main>
<footer class="foot">
  <div class="wrap foot-in">
    <p class="foot-brand">BarrierFreeWeb</p>
    <div>
      <h2>Studio</h2>
      <ul>
        ${NAV.map(([href, name]) => `<li><a href="${href}">${name}</a></li>`).join("\n        ")}
      </ul>
    </div>
    <div>
      <h2>Services</h2>
      <ul>
        ${SERVICES.map(([href, name]) => `<li><a href="${href}">${name}</a></li>`).join("\n        ")}
      </ul>
    </div>
    <div>
      <h2>Contact</h2>
      <ul>
        <li><a href="mailto:${MAIL}">${MAIL}</a></li>
        <li>Berlin</li>
      </ul>
    </div>
  </div>
</footer>
</body>
</html>
`;

for (const [file, page] of Object.entries(pages)) {
  fs.writeFileSync(path.join(root, file), shell(file, page));
}
console.log(`Built ${Object.keys(pages).length} pages`);
