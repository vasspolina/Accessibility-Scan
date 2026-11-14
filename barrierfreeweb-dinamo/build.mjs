// Writes the nine static pages. Run: node build.mjs
import { writeFileSync } from "node:fs";
const MAIL = "mailto:gf@barrierfreeweb.de";
const NAV = [["index.html","Home"],["services.html","Services"],["accessibility.html","Accessibility"],["about.html","About"]];
const OFFER = [
  ["design-typography.html","Design and typography"],["ux-ui.html","UX/UI design"],["brand.html","Brand development"],
  ["content-strategy.html","Content strategy"],["copywriting.html","Copywriting"],["accessibility.html","Accessibility testing"]];
const esc = s => s.replace(/&/g,"&amp;");
const band = (tone, id, h, body, xl, style) => `<section class="band${tone?` tone-${tone}`:""}"${id?` id="${id}"`:""}${style?` style="${style}"`:""}>
${h?`<h2${xl?' class="xl"':""}>${h}</h2>`:""}
${body}
</section>`;
const dl = items => `<dl>${items.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join("")}</dl>`;
const tags = items => `<ul class="tags">${items.map(i=>`<li>${i}</li>`).join("")}</ul>`;
const cta = (label, href=MAIL, dark=true) => `<p class="cta"><a class="pill big${dark?" dark":""}" href="${href}">${label}</a></p>`;
const rows = `<ul class="rows">${OFFER.map(([h,t])=>`<li><a href="${h}"><span>${t}</span><span class="pill" aria-hidden="true">Learn more →</span></a></li>`).join("")}</ul>`;

function page(file, title, desc, chips, main, navFile=file){
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title==="Home"?"BarrierFreeWeb — accessible web design, Berlin":`${esc(title)} — BarrierFreeWeb`}</title>
<meta name="description" content="${desc}">
<link rel="preload" href="fonts/JokkerVF-TRIAL.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="pill dark skip" href="#main">Skip to main content</a>
<header class="top">
<nav class="nav" aria-label="Main"><ul>
${NAV.map(([h,t])=>`<li><a href="${h}"${h===navFile?' aria-current="page"':""}>${t}</a></li>`).join("\n")}
</ul></nav>
<a class="logo" href="index.html" aria-label="BarrierFreeWeb, home">BarrierFreeWeb</a>
<div class="tools"><span class="pill opt" style="pointer-events:none">Berlin</span><a class="pill opt" href="${MAIL}">Contact</a><a class="pill dark" href="${MAIL}">Request an audit</a></div>
</header>
<main id="main">
${chips?`<nav class="chips" aria-label="${chips.label}">${chips.items.map(([h,t])=>`<a class="pill" href="${h}"${h===file?' aria-current="page"':""}>${t}</a>`).join("")}</nav>`:""}
${main}
</main>
<footer>
<div class="foot">
<div><h2>Studio</h2><ul>${NAV.map(([h,t])=>`<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
<div><h2>What we offer</h2><ul>${OFFER.map(([h,t])=>`<li><a href="${h}">${t}</a></li>`).join("")}</ul></div>
<div><h2>Contact</h2><ul><li><a href="${MAIL}">gf@barrierfreeweb.de</a></li><li>Berlin</li></ul></div>
</div>
<p class="wordmark" aria-hidden="true">BarrierFreeWeb</p>
<p class="legal small"><span>© 2026 BarrierFreeWeb</span><span>Websites that everyone can use.</span></p>
</footer>
</body>
</html>
`;
  writeFileSync(new URL(file, import.meta.url), html);
}

const door = `<svg viewBox="0 0 300 300" role="img" aria-label="An open door with a ramp leading up to it"><rect x="70" y="30" width="150" height="230" fill="#ffee00"/><path d="M70 30 L170 55 V285 L70 260Z" fill="#fff"/><circle cx="152" cy="165" r="7" fill="#000"/><path d="M0 285 H300 V260 H220 L170 285Z" fill="#1a2bff"/></svg>`;

/* ---------- HOME ---------- */
page("index.html","Home","BarrierFreeWeb is a design studio in Berlin building websites that everyone can use, and that meet the European Accessibility Act.",
 {label:"On this site",items:[...OFFER.slice(0,5),["accessibility.html","Accessibility"]]},
`<div class="hero"><div class="card">
<h1>We’re a design studio in Berlin building websites that everyone can use.</h1>
${door}
<p class="bar"><span>BarrierFreeWeb</span><a class="pill" href="services.html">Explore</a></p>
</div></div>
${band("yellow","eaa","The European Accessibility Act is here.",`<p>As of 28 June 2025, websites operating in the EU must meet EAA accessibility requirements. Non-compliance can result in fines.</p>
<p>Not sure if your site is compliant? We can help.</p>
${cta("Request an accessibility audit")}`)}
${band("","",null,`<p class="quote">If everyone can’t use the door, is it truly an entrance?</p>`)}
${band("black","offer","What we offer",rows.replaceAll('class="pill"','class="pill" style="background:#fff"')+cta("All services","services.html"))}`);

/* ---------- SERVICES ---------- */
page("services.html","Services","Accessible web design, brand development and content strategy from BarrierFreeWeb, Berlin.",
 {label:"On this page",items:[["#offer","What we offer"],["#approach","Our approach"],["#mobile","Mobile-first"],["#redesign","Why not just fix it?"],["#eaa","EAA"],["#affected","Who’s affected"],["#ai","AI"],["#benefits","Benefits"]]},
`<h1>Building websites that work for everyone.</h1>
${band("","",null,`<p>We specialize in accessible web design, brand development, and content strategy. Your website should be future-proof and usable by all.</p>
<p>Think of it this way: A door that only opens if you’re exactly 5'10" isn’t a broken door — it’s a badly designed one. Good design works for everyone.</p>`,"","padding-top:0")}
${band("grey","offer","What we offer",rows.replaceAll('class="pill"','class="pill" style="background:#fff"'))}
${band("blue","approach","Our approach",`<div class="three">
<div><b>Focused</b><span>Messages are clear, obvious, and impactful</span></div>
<div><b>User-centered</b><span>Navigation is smooth, intuitive, and inclusive</span></div>
<div><b>Future-proof</b><span>Content is purposeful, adaptable, and cost-effective</span></div></div>
<p style="margin-top:clamp(32px,4.5vw,64px)">Our principles follow the Web Content Accessibility Guidelines (WCAG), the international standard for accessible websites.</p>`)}
${band("","mobile","Mobile-first design",`<p>Most EU residents visit websites on their phones first. Since mobile drives the majority of e-commerce, we prioritize mobile experience to improve usability and increase conversions.</p>`)}
${band("pink","redesign","Why not just fix your current site?",`<p>Retrofitting older websites — especially those built on HTML 4 or earlier — is like trying to make a flip phone run Instagram. Technically possible? Maybe. Worth it? No.</p>
<p>Legacy code and inaccessible design make true WCAG compliance nearly impossible. Most websites need redesigning every 3–5 years anyway to stay competitive. Delaying this risks excluding users and falling out of compliance.</p>`)}
${band("yellow","eaa","The EAA deadline has passed.",`<p>As of 28 June 2025, the European Accessibility Act requires EU websites to meet accessibility standards. Fines for non-compliance can reach €100,000.</p>`,true)}
${band("","affected","Who’s affected",tags(["Software, SaaS, and digital services","Fintech and financial services","E-commerce, fashion, and retail","Education and online learning","Branding and marketing agencies","Art galleries and museums","Architecture and design firms","Travel, restaurants, and hospitality"])+`
<p>Companies with fewer than 10 employees and annual revenue under €2 million are exempt.</p>
<p>This exemption does not apply to companies that offer products subject to accessibility requirements, such as:</p>
<ul class="dash"><li>websites, apps, and e-commerce platforms</li><li>consumer electronics (e.g., smartphones, ATMs, e-book readers, and similar devices).</li></ul>`)}
${band("black","ai","But can’t I just use AI?",`<p>No. AI’s great for breakup texts or visa forms — not accessibility compliance.</p>
<p>It can flag missing alt text or contrast errors, but it can’t tell “K-pop band posing with fans” from “group of people.” Real accessibility needs judgment and empathy, which only humans have.</p>
<p>In the end, real people with real disabilities test your site. Their verdict depends on how it feels to use, not how many boxes a machine ticks.</p>`,true)}
${band("green","benefits","Benefits of accessibility compliance",tags(["Legal protection","Improved SEO and discoverability","Expanded audience reach","Enhanced brand reputation","Modern, contemporary design"]))}
${band("","get","What you get",`<p>A beautifully designed website, brand identity, and content strategy that meets EAA accessibility standards — verified through thorough testing.</p>
${cta("Request a quote today")}`)}`);

/* ---------- OFFER SUB PAGES ---------- */
const subChips = {label:"What we offer",items:OFFER};
const sub = (file,title,lead,items,tone,pre="") => page(file,title,lead,subChips,
`<h1>${title}</h1>
${band(tone,"",null,`<p>${lead}</p>${pre}`,"","padding-top:clamp(40px,5vw,72px);padding-bottom:clamp(40px,5vw,72px)")}
${band("","",null,dl(items)+cta("Request a quote"))}`,"services.html");

sub("design-typography.html","Design and Typography","We make sure your content works everywhere, for everyone.",[
["Text reflow","Content resizes smoothly across all screen sizes"],
["Fluid design","Flexible layouts that adapt without breaking or losing meaning"],
["Semantic markup","Content organized so screen readers can understand it"],
["Alt text","Written descriptions of images and videos for people using screen readers"]],"yellow");
sub("ux-ui.html","UX/UI and Web Development","We build interfaces that actually work.",[
["Accessible components","User interface elements with clear names, roles, and states"],
["Robust code","Compatible with all browsers and assistive technologies"],
["Status messages","Updates and alerts that don’t interfere with assistive technologies"],
["Color customization","Works with any color settings users choose"]],"green");
sub("brand.html","Brand Development","Brand identities that are clear, memorable, and work for everyone.",[
["Logo and visual identity","Key elements that are memorable and convey your core values"],
["Brand voice","Tone and language that’s authentic to your company and resonates with your audience"],
["Brand guidelines","Comprehensive instructions for maintaining consistency across all touchpoints"],
["Optimized typography","Readable fonts with strategic spacing and hierarchy"],
["Contrast optimization","Visual elements that stand out and meet accessibility standards"],
["Strategic use of color","Colors that ensure clarity"],
["Art direction","Cohesive visual aesthetics aligned with your values"]],"pink");
sub("content-strategy.html","Content Strategy","Structure and strategy that makes your content work better with assistive technologies.",[
["Clear, logical structure","Content organized with descriptive headings and intuitive flow"],
["Consistent navigation","Predictable, easy-to-understand paths through your site"],
["Input assistance","Clear instructions, error recognition, and helpful correction suggestions"],
["Inclusive language","Respectful, non-discriminatory content that addresses diverse audiences"],
["Screen reader optimization","Logical content order that reads naturally with assistive technology"],
["Meaningful descriptions","Alt text and descriptive links that explain an image’s purpose, not just presence"]],"blue");
sub("copywriting.html","Copywriting","We believe in simplicity.",[
["Clear","Concise language without jargon"],
["Accessible","Easy to grasp for a broad audience"],
["Scannable","Short paragraphs with logical breaks and clear bullet points"],
["Inclusive","Respectful and resonant with diverse readers"],
["Descriptive","Links and alt text that explain purpose, not just “click here”"],
["Screen reader-friendly","Logical flow without visual cues like “see below”"]],"yellow",`<p>Good copy should be:</p>`);

/* ---------- ACCESSIBILITY ---------- */
page("accessibility.html","Accessibility","Why accessibility matters, what the law requires, and whether it applies to your business.",
 {label:"On this page",items:[["#everyone","Benefits everyone"],["#law","The legal landscape"],["#who","Who needs it?"],["#what","What makes a site accessible?"],["#business","Does this apply to me?"]]},
`<h1>Accessibility is a human right. No exceptions.</h1>
${band("","",null,`<p>Life has moved online. We depend on the internet for work, connection, and daily necessities. It’s our entertainment, but it’s also essential. Everyone needs to be able to use it.</p>
<p>Remember: When you build a house, you don’t make the door optional. The same goes for digital access — everyone needs a way in.</p>`,"","padding-top:0")}
${band("green","everyone","Accessibility benefits everyone.",`<p>You’ve probably used accessible features without realizing it. Ever turn on captions while watching TV in a noisy room? That’s accessibility. Dictate a text message while driving? Also accessibility. Use voice commands when your hands are full? You get the idea.</p>
<p>These features weren’t designed exclusively for people with disabilities — they were designed for situations we all face. Curb cuts help wheelchair users, but they also help parents with strollers, travelers with luggage, and delivery workers with hand trucks.</p>
<p>Good accessible design doesn’t just help some users — it creates a better experience for everyone.</p>`,true)}
${band("yellow","law","The legal landscape",`<p>As of June 28, 2025, accessibility isn’t optional anymore — it’s the law across Europe. Germany has the BFSG (Barrier-Free Strengthening Act), the EU has the European Accessibility Act, and the UK enforces accessibility through the Equality Act 2010. All of these require websites to meet WCAG 2.1 Level AA standards.</p>
<p>What happens if you don’t comply? Fines can reach up to €100,000 in Germany, and over €1,000,000 in some EU countries.</p>
<p>Plus, consumers and advocacy groups can request inspections and take legal action if accessibility problems aren’t fixed.</p>`)}
${band("","who","Who needs accessibility?",`<p>Here’s the thing: accessibility isn’t just for people with permanent disabilities. At some point, we all need these features.</p>
${dl([["Motor limitations","Broken arms, carrying groceries, holding a baby"],["Visual limitations","Forgot your glasses, cracked phone screen, sun glare on your laptop"],["Auditory limitations","Loud café, ear infection, dead headphone battery"],["Cognitive limitations","Tired after a long day, stressed and distracted, trying to multitask"]])}
<p style="margin-top:1.1em">Sound familiar? That’s because accessible design helps all of us.</p>`)}
${band("blue","what","What makes a website accessible?",`<p>Accessible websites follow four core principles from the Web Content Accessibility Guidelines (WCAG):</p>
<div class="three" style="margin-top:clamp(24px,3vw,40px)">
<div><b>Perceivable</b><span>Everyone can access your information, even if they can’t use all their senses</span></div>
<div><b>Operable</b><span>All your website’s functions work for everyone, no exceptions</span></div>
<div><b>Understand­able</b><span>Your content is clear and your navigation makes sense</span></div>
<div><b>Robust</b><span>Your site works on any device with any assistive technology, today, tomorrow, and for the foreseeable future</span></div></div>`)}
${band("","business","Does this apply to my business?",`<p>Short answer: Probably yes.</p>
<p>If you operate in the EU and your website does any of the following, you need to comply:</p>
${tags(["Sells products or services online","Allows users to book appointments or reservations","Provides banking, transport, or media services","Was updated or published after June 28, 2025"])}
<p>This includes e-commerce sites, booking platforms, SaaS companies, restaurants with online ordering, and more.</p>
<p>The only exemption: Companies with fewer than 10 employees and annual revenue under €2 million.</p>
<p>But even small businesses aren’t always exempt. If you sell products like smartphones, tablets, or e-readers, you must comply regardless of company size.</p>`)}
${band("black","audit",null,`<p class="quote" style="font-size:clamp(34px,4.6vw,68px)">Not sure if this applies to you? We’ll help you figure it out.</p>
${cta("Request a free accessibility audit")}`)}`);

/* ---------- ABOUT ---------- */
page("about.html","About","BarrierFreeWeb is a Berlin design studio founded by Liza Gavrova and Polina Vasilieva.",
 {label:"On this page",items:[["#approach","Our approach"],["#team","Our team"],["#background","Background"],["#contact","Contact"]]},
`<h1>About BarrierFreeWeb</h1>
${band("","",null,`<p>We’re a design studio in Berlin building websites that work for everyone.</p>`,"","padding-top:0")}
${band("yellow","approach","Our approach",`<p>Most studios design a beautiful website first, then try to make it accessible later. That’s like building a house and adding the foundation afterward. We start with accessibility. Because good design should work for everyone from day one.</p>
<p>With experience across US and EU markets, we understand the legal requirements and design standards on both sides of the Atlantic. We help businesses meet accessibility compliance while creating digital experiences that are functional, future-proof, and inclusive.</p>`)}
${band("","team","Our team",dl([["Liza Gavrova","Co-Founder &amp; Managing Director"],["Polina Vasilieva","Co-Founder &amp; Designer"]]))}
${band("pink","background","Background",`<p>Our practice sits between language, design, and technology.</p>
<p>Educated in linguistics at Humboldt-Universität zu Berlin and design at Yale, we’ve since worked with Apple, Google, Verizon, and McKinsey, translating complex systems into clear, accessible experiences. We believe precision and empathy belong in the same sentence — and that every project, no matter the scale, deserves both.</p>`)}
${band("black","contact","Contact",`<p class="quote" style="font-size:clamp(28px,6vw,92px)"><a href="${MAIL}">gf@barrierfreeweb.de</a></p>`)}`);
console.log("built");
