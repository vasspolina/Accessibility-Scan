// BarrierFreeWeb, set as a ruled sheet: dark ground, a stack of tag links on
// the left, every piece of copy on its own hairline row, two columns of sheets.
// `node build.mjs` writes one HTML file per page beside this script.
//
// The copy is the user's, verbatim (26 Nov 2026: "do not add or delete
// anything from text"). No typesetting pass: dashes, quote marks, typos and
// mixed straight/curly apostrophes stay exactly as supplied. Where a line is
// "Term - definition", the term and definition sit in two columns and the
// separator stays in the text, clipped from view (.sep), so copying a row
// still gives the original line.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const MAIL = "mailto:gf@barrierfreeweb.de";

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- rows -----------------------------------------------------------------
const p = (t) => ({ k: "p", t });
const li = (t) => ({ k: "li", t });
const kv = (term, sep, def) => ({ k: "kv", term, sep, def });
const more = (t, href) => ({ k: "more", t, href });
const cta = (t) => ({ k: "cta", t });

function row(r) {
  switch (r.k) {
    case "p":
      return `<p class="row">${esc(r.t)}</p>`;
    case "li":
      return `<li class="row">${esc(r.t)}</li>`;
    case "kv":
      return `<div class="row kv"><span class="term">${esc(r.term)}</span><span class="sep" aria-hidden="true">${esc(r.sep)}</span><span class="def">${r.html ?? esc(r.def)}</span></div>`;
    case "more":
      return `<li class="row more"><span>${esc(r.t)}</span><a class="tag" href="${r.href}" aria-label="Learn more: ${esc(r.t)}">Learn more</a></li>`;
    case "cta":
      return `<p class="row action"><a href="${MAIL}">${esc(r.t)}</a></p>`;
    case "raw":
      return r.html;
  }
}

// Consecutive li / more rows become one list.
function rows(list) {
  const out = [];
  for (let i = 0; i < list.length; ) {
    const k = list[i].k;
    if (k === "li" || k === "more") {
      const run = [];
      while (i < list.length && list[i].k === k) run.push(list[i++]);
      out.push(`<ul class="rows" role="list">\n${run.map(row).join("\n")}\n</ul>`);
    } else out.push(row(list[i++]));
  }
  return out.join("\n");
}

// A sheet: a header on a white rule, then hairline rows.
const sheet = (title, list, o = {}) => ({ title, list, ...o });

function renderSheet(s, level) {
  const h = s.h1 ? "h1" : `h${level}`;
  const head = s.title
    ? `<${h} class="head${s.quiet ? " quiet" : ""}">${esc(s.title)}</${h}>`
    : `<div class="head blank" aria-hidden="true"></div>`;
  return `<section class="sheet${s.wide ? " wide" : ""}">\n${head}\n${rows(s.list)}\n</section>`;
}

// ---- pages ----------------------------------------------------------------
const SUB = [
  ["design-and-typography.html", "Design and Typography"],
  ["ux-ui.html", "UX/UI and Web Development"],
  ["brand-development.html", "Brand Development"],
  ["content-strategy.html", "Content Strategy"],
  ["copywriting.html", "Copywriting"],
];
const MAIN = [
  ["index.html", "BarrierFreeWeb"],
  ["services.html", "Services"],
  ["accessibility.html", "Accessibility"],
  ["about.html", "About"],
];

const pages = [];

pages.push({
  file: "index.html",
  title: "BarrierFreeWeb",
  body: [
    sheet("BarrierFreeWeb", [p("We're a design studio in Berlin building websites that everyone can use.")], { h1: true }),
    sheet("The European Accessibility Act is here.", [
      p("As of 28 June 2025, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines."),
      p("Not sure if your site is compliant? We can help."),
    ]),
  ],
  bar: { action: "Request an accessibility audit", line: "If everyone can’t use the door, is it truly an entrance?" },
  after: [
    { divider: "ALTS:" },
    sheet("Option 1", [
      p("BarrierFreeWeb"),
      p("We’re a Berlin-based design studio making the web usable by everyone."),
      p("Accessibility isn’t a trend — it’s now the law."),
      p("From 28 June 2025, websites in the EU must comply with the European Accessibility Act (EAA) or face fines."),
      p("We make compliance simple — and good design inevitable."),
      cta("Request a quote"),
      p("If your site isn’t accessible, are you truly reaching anyone?"),
    ], { level: 3 }),
    sheet("Option 2", [
      p("BarrierFreeWeb is a Berlin-based design studio dedicated to making the web usable by everyone. The European Accessibility Act was enacted on 28 June 2025, setting a new bar for digital design across the EU. We help companies meet these standards through thoughtful, human-centered design. Because connection only counts if everyone can access it."),
      cta("Request a quote"),
    ], { level: 3 }),
  ],
});

pages.push({
  file: "services.html",
  title: "Services",
  body: [
    sheet("Building websites that work for everyone.", [
      p("We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all."),
      p("Think of it this way: A door that only opens if you're exactly 5'10\" isn't a broken door — it's a badly designed one. Good design works for everyone."),
    ], { h1: true }),
    sheet("What we offer", [
      more("Design and typography", "design-and-typography.html"),
      more("UX/UI design", "ux-ui.html"),
      more("Brand development", "brand-development.html"),
      more("Content strategy", "content-strategy.html"),
      more("Copywriting", "copywriting.html"),
      more("Accessibility testing", "accessibility.html"),
    ]),
    sheet("Our approach", [
      kv("Focused", " - ", "Messages are clear, obvious, and impactful"),
      kv("User-centered", " - ", "Navigation is smooth, intuitive, and inclusive"),
      kv("Future-proof", " - ", "Content is purposeful, adaptable, and cost-effective"),
      p("Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites."),
    ]),
    sheet("Mobile-first design", [
      p("Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions."),
    ]),
    sheet("Why not just fix your current site?", [
      p("Retrofitting older websites — especially those built on HTML 4 or earlier — is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No."),
      p("Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance."),
    ]),
    sheet("The EAA deadline has passed.", [
      p("As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach €100,000."),
    ]),
    sheet("Who's affected", [
      li("Software, SaaS, and digital services"),
      li("Fintech and financial services"),
      li("E-commerce, fashion, and retail"),
      li("Education and online learning"),
      li("Branding and marketing agencies"),
      li("Art galleries and museums"),
      li("Architecture and design firms"),
      li("Travel, restaurants, and hospitality"),
      p("Companies with fewer than 10 employees and annual revenue under €2 million are exempt."),
      p("This exemption does not apply to companies that offer products subject to accessibility requirements, such as:"),
      li("— websites, apps, and e-commerce platforms"),
      li("— consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices)."),
    ]),
    sheet("But can’t I just use AI?", [
      p("No. AI’s great for breakup texts or visa forms — not accessibility compliance."),
      p("It can flag missing alt text or contrast errors, but it can’t tell “K-pop band posing with fans” from “group of people.” Real accessibility needs judgment and empathy, which only humans have."),
      p("In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks."),
    ]),
    sheet("Benefits of accessibility compliance", [
      li("Legal protection"),
      li("Improved SEO and discoverability"),
      li("Expanded audience reach"),
      li("Enhanced brand reputation"),
      li("Modern, contemporary design"),
    ]),
    sheet("What you get", [
      p("A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards—verified through thorough testing."),
    ]),
  ],
  bar: { action: "Request a quote today" },
});

const subpage = (file, title, intro, list, listHead) =>
  pages.push({
    file,
    title,
    sub: true,
    body: [sheet(title, intro.map(p), { h1: true }), sheet(listHead ?? null, list)],
  });

subpage("design-and-typography.html", "Design and Typography", ["We make sure your content works everywhere, for everyone."], [
  kv("Text reflow", " - ", "Content resizes smoothly across all screen sizes"),
  kv("Fluid design", " - ", "Flexible layouts that adapt without breaking losing meaning"),
  kv("Semantic markup", " - ", "Content organized so screen readers can understand it"),
  kv("Alt text", " - ", "Written descriptions of images and videos for people using screen readers"),
]);
subpage("ux-ui.html", "UX/UI and Web Development", ["We build interfaces that actually work."], [
  kv("Accessible components", " - ", "User interface elements with clear names, roles, and states"),
  kv("Robust code", " - ", "Compatible with all browsers and assistive technologies"),
  kv("Status messages", " - ", "Updates and alerts that don't interfere with assistive technologies"),
  kv("Color customization", " - ", "Works with any color settings users choose"),
]);
subpage("brand-development.html", "Brand Development", ["Brand identities that are clear, memorable, and work for everyone."], [
  kv("Logo and visual identity", " - ", "Key elements that are memorable and convey your core values"),
  kv("Brand voice", " - ", "Tone and language that's authentic to your company and resonates with your audience"),
  kv("Brand guidelines", " - ", "Comprehensive instructions for maintaining consistency across all touchpoints"),
  kv("Optimized typography", " - ", "Readable fonts with strategic spacing and hierarchy"),
  kv("Contrast optimization", " - ", "Visual elements that standout and accessibility standards"),
  kv("Strategic use of color", " - ", "Colors that ensure clarity"),
  kv("Art direction", " - ", "Cohesive visual aesthetics aligned with your values"),
]);
subpage("content-strategy.html", "Content Strategy", ["Structure and strategy that makes your content work better with assistive technologies."], [
  kv("Clear, logical structure", " - ", "Content organized with descriptive headings and intuitive flow"),
  kv("Consistent navigation", " - ", "Predictable, easy-to-understand paths through your site"),
  kv("Input assistance", " - ", "Clear instructions, error recognition, and helpful correction suggestions"),
  kv("Inclusive language", " - ", "Respectful, non-discriminatory content that addresses diverse audiences"),
  kv("Screen reader optimization", " - ", "Logical content order that reads naturally with assistive technology"),
  kv("Meaningful descriptions", " - ", "Alt text and descriptive links that explain an image’s purpose, not just presence"),
]);
subpage("copywriting.html", "Copywriting", ["We believe in simplicity."], [
  kv("Clear", " - ", "Concise language without jargon"),
  kv("Accessible", " - ", "Easy to grasp for a broad audience"),
  kv("Scannable", " - ", "Short paragraphs with logical breaks and clear bullet points"),
  kv("Inclusive", " - ", "Respectful and resonant with diverse readers"),
  kv("Descriptive", " - ", "Links and alt text that explain purpose, not just \"click here\""),
  kv("Screen reader-friendly", " - ", "Logical flow without visual cues like \"see below\""),
], "Good copy should be:");

pages.push({
  file: "accessibility.html",
  title: "Accessibility",
  body: [
    sheet("Accessibility is a human right. No exceptions.", [
      p("Life has moved online. We depend on the internet for work, connection, and daily necessities. It's our entertainment, but it's also essential. Everyone needs to be able to use it."),
      p("Remember: When you build a house, you don't make the door optional. The same goes for digital access—everyone needs a way in."),
    ], { h1: true }),
    sheet("Accessibility benefits everyone.", [
      p("You've probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That's accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea."),
      p("These features weren't designed exclusively for people with disabilities—they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks."),
      p("Good accessible design doesn't just help some users—it creates a better experience for everyone."),
    ]),
    sheet("The legal landscape", [
      p("As of June 28, 2025, accessibility isn't optional anymore—it's the law across Europe. Germany has the BFSG (Barrier-Free Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet WCAG 2.1 Level AA standards."),
      p("What happens if you don't comply? Fines can reach €100,000. up to €100,000 in Germany, and over €1,000,000 in some EU countries."),
      p("Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren't fixed."),
    ]),
    sheet("Who needs accessibility?", [
      p("Here's the thing: accessibility isn't just for people with permanent disabilities. At some point, we all need these features."),
      kv("Motor limitations", " - ", "Broken arms, carrying groceries, holding a baby"),
      kv("Visual limitations", " - ", "Forgot your glasses, cracked phone screen, sun glare on your laptop"),
      kv("Auditory limitations", " - ", "Loud café, ear infection, dead headphone battery"),
      kv("Cognitive limitations", " - ", "Tired after a long day, stressed and distracted, trying to multitask"),
      p("Sound familiar? That's because accessible design helps all of us."),
    ]),
    sheet("What makes a website accessible?", [
      p("Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG):"),
      kv("Perceivable", " - ", "Everyone can access your information, even if they can't use all their senses"),
      kv("Operable", " - ", "All your website's functions work for everyone, no exceptions"),
      kv("Understandable", " - ", "Your content is clear and your navigation makes sense"),
      kv("Robust", " - ", "Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future"),
    ]),
    sheet("Does this apply to my business?", [
      p("Short answer: Probably yes."),
      p("If you operate in the EU and your website does any of the following, you need to comply:"),
      li("Sells products or services online"),
      li("Allows users to book appointments or reservations"),
      li("Provides banking, transport, or media services"),
      li("Was updated or published after June 28, 2025"),
      p("This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more."),
      p("The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million."),
      p("But even small businesses aren't always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size."),
      { k: "raw", html: `<p class="row">Not sure if this applies to you? <a class="inline" href="${MAIL}">Request a free accessibility audit</a> and we'll help you figure it out.</p>` },
    ]),
  ],
});

pages.push({
  file: "about.html",
  title: "About",
  body: [
    sheet("About BarrierFreeWeb", [
      p("We're a design studio in Berlin building websites that work for everyone."),
      p("Our approach: Most studios design a beautiful website first, then try to make it accessible later. That's like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one."),
      p("With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive."),
    ], { h1: true }),
    sheet("Our team", [
      kv("Liza Gavrova", " — ", "Co-Founder & Managing Director"),
      kv("Polina Vasilieva", " — ", "Co-Founder & Designer"),
    ]),
    sheet("Background", [
      p("Our practice sits between language, design, and technology."),
      p("Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence — and that every project, no matter the scale, deserves both."),
    ]),
    sheet(null, [
      { ...kv("Contact:", " ", ""), html: `<a href="${MAIL}">gf@barrierfreeweb.de</a>` },
    ]),
  ],
});

// ---- page shell -----------------------------------------------------------
function nav(current) {
  const tag = ([href, label]) =>
    `<li><a class="tag" href="${href}"${href === current ? ' aria-current="page"' : ""}>${esc(label)}</a></li>`;
  return `<nav class="tags" aria-label="Site">
<ul role="list">
${MAIN.map(tag).join("\n")}
</ul>
<ul role="list">
${SUB.map(tag).join("\n")}
</ul>
</nav>`;
}

function render(pg) {
  let level = 2;
  const parts = [];
  parts.push(`<div class="sheets">\n${pg.body.map((s) => renderSheet(s, 2)).join("\n")}\n</div>`);
  if (pg.bar) {
    parts.push(`<div class="bar">
<p class="row action"><a href="${MAIL}">${esc(pg.bar.action)}</a></p>
${pg.bar.line ? `<p class="row line">${esc(pg.bar.line)}</p>` : ""}
</div>`);
  }
  if (pg.after) {
    const [div, ...rest] = pg.after;
    parts.push(`<h2 class="divider">${esc(div.divider)}</h2>`);
    parts.push(`<div class="sheets">\n${rest.map((s) => renderSheet(s, s.level ?? 3)).join("\n")}\n</div>`);
  }
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>${esc(pg.title)}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header>
${nav(pg.file)}
</header>
<main>
${parts.join("\n")}
</main>
</body>
</html>
`;
}

for (const pg of pages) writeFileSync(join(here, pg.file), render(pg));
console.log(`wrote ${pages.length} pages`);
