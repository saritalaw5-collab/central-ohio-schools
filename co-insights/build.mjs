// Builds the Central Ohio School District Insights site into ./dist
// Usage: node build.mjs          (production, used by Netlify)
//        DEMO=1 node build.mjs   (preview build: forms don't post, links use index.html)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(ROOT, 'dist');
const DEMO = process.env.DEMO === '1';

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
const site = readJson('data/site.json');
const counties = readJson('data/counties.json');
const mapPaths = readJson('data/map-paths.json');

const slugify = (s) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const countyByName = Object.fromEntries(counties.map((c) => [c.name, c]));
const countyInfo = (name) => countyByName[name] || { name, slug: slugify(name), boardOfElections: null, auditor: null, offMap: true };

const districts = readJson('data/districts.json')
  .map((d) => ({ ...d, slug: slugify(d.name) }))
  .sort((a, b) => a.name.localeCompare(b.name));

for (const c of counties) {
  if (!mapPaths.find((m) => m.fips === c.fips)) throw new Error(`No map shape for ${c.name} County (fips ${c.fips})`);
}
const inCounty = (c) => districts.filter((d) => d.counties.includes(c.name));

// ---------- helpers ----------
const prefix = (depth) => (depth ? '../'.repeat(depth) : './');
const href = (p, route) => {
  if (!route) return DEMO ? `${p}index.html` : p;
  return DEMO ? `${p}${route}index.html` : `${p}${route}`;
};
const ext = (url, label, track, county) =>
  `<a class="ext" href="${esc(url)}" target="_blank" rel="noopener noreferrer" data-track-resource="${esc(track)}"${county ? ` data-county="${esc(county)}"` : ''}>${label}<span class="ext__icon" aria-hidden="true">↗</span><span class="sr-only"> (opens in a new tab)</span></a>`;

const boeLink = (name) => {
  const c = countyInfo(name);
  return c.boardOfElections
    ? ext(c.boardOfElections, `${esc(name)} County Board of Elections`, 'board_of_elections', name)
    : ext(site.officialLinks.boeDirectory, `${esc(name)} County Board of Elections <span class="muted">(state directory)</span>`, 'board_of_elections', name);
};
const auditorLink = (name) => {
  const c = countyInfo(name);
  return c.auditor
    ? ext(c.auditor, `Look up a home: ${esc(name)} County Auditor`, 'county_auditor', name)
    : ext(site.officialLinks.auditorDirectory, `Look up a home: ${esc(name)} County Auditor <span class="muted">(auditors’ directory)</span>`, 'county_auditor', name);
};

// ---------- map ----------
function mapSvg() {
  const primary = new Set(counties.map((c) => c.fips));
  const context = mapPaths.filter((m) => !primary.has(m.fips));
  const inView = (m) => m.cx > 40 && m.cx < 560 && m.cy > 24 && m.cy < 624;
  return `<svg class="map" viewBox="0 0 600 640" role="group" aria-label="Map of Central Ohio counties">
  <g class="map__context" aria-hidden="true">${context.map((m) => `<path d="${m.d}"></path>`).join('')}</g>
  <g class="map__context-labels" aria-hidden="true">${context.filter(inView).map((m) => `<text x="${m.cx}" y="${(m.cy + 4).toFixed(1)}">${esc(m.name)}</text>`).join('')}</g>
  <g class="map__counties">${counties.map((c) => {
    const m = mapPaths.find((x) => x.fips === c.fips);
    return `<path class="cty" data-county="${c.slug}" tabindex="0" role="button" aria-label="${esc(c.name)} County" aria-pressed="false" d="${m.d}"></path>`;
  }).join('')}</g>
  <g class="map__labels" aria-hidden="true">${counties.map((c) => `<text data-label="${c.slug}" x="${c.label[0]}" y="${c.label[1]}">${esc(c.name)}</text>`).join('')}</g>
</svg>`;
}

// ---------- situations (buying / selling / staying) ----------
const SITUATIONS = [
  {
    key: 'buying', label: 'Buying', title: 'If you’re buying',
    intro: 'School district lines and tax bills vary from street to street, so check each address you’re considering.',
    tips: [
      'Confirm the school district for each address on the county auditor site. It doesn’t always match the mailing city.',
      'Build property taxes, and any school income tax, into your monthly budget with your lender.',
      'Look at recent and upcoming levies, since they can change future tax bills.'
    ]
  },
  {
    key: 'selling', label: 'Selling', title: 'If you’re selling',
    intro: 'Buyers ask about schools and taxes early. Having the facts ready keeps conversations moving.',
    tips: [
      'Have your home’s school district, yearly property taxes and any school income tax ready to share.',
      'List the improvements you’ve made, with approximate dates.',
      'Know what similar homes nearby have recently sold for before you set a price.'
    ]
  },
  {
    key: 'staying', label: 'Staying', title: 'If you’re staying put',
    intro: 'Levies and reappraisals affect what you pay each year, even if you never move.',
    tips: [
      'Review your tax bill and make sure you receive the owner-occupancy credits you qualify for.',
      'Follow upcoming levies and renewals in your district so changes don’t surprise you.',
      'If you disagree with your home’s appraised value, your county Board of Revision hears valuation complaints. Ask the auditor about the yearly filing deadline.'
    ]
  }
];

// ---------- shared pieces ----------
const brandLockup = (p) => `<span class="brand-lockup"><img class="brand-lockup__agency" src="${p}assets/brand-agency.png" alt="The Agency Real Estate Group" width="714" height="240"><img class="brand-lockup__cb" src="${p}assets/brand-cb.png" alt="Coldwell Banker Realty" width="1190" height="240"></span>`;

const guideCover = (small) => `<div class="cover${small ? ' cover--small' : ''}" aria-hidden="true">
  <div class="cover__eyebrow">Research guide</div>
  <div class="cover__title">The Central Ohio School District Research Guide</div>
  <div class="cover__foot">Free PDF · Official sources</div>
</div>`;

function layout({ title, description, depth, main, page }) {
  const p = prefix(depth);
  const home = href(p, '');
  const clarity = site.analytics.clarityProjectId
    ? `<script>(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${esc(site.analytics.clarityProjectId)}");</script>`
    : '';
  const a = site.agent;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&amp;family=Jost:wght@400;500;600&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="${p}assets/site.css">
${clarity}
</head>
<body class="tex" data-page="${page}" data-demo="${DEMO ? 1 : 0}" data-home="${home}">
<a class="skip" href="#main">Skip to content</a>
<div class="topbar"><div class="wrap topbar__row">
  <span>An independent regional resource. Not affiliated with or endorsed by Ohio government agencies, school districts or election authorities.</span>
  ${DEMO ? '<span class="topbar__demo">Preview · forms do not send</span>' : ''}
</div></div>
<header class="header"><div class="wrap header__row">
  <a class="brand" href="${home}"><span class="brand__eyebrow">Central Ohio</span><span class="brand__name">School District Insights</span></a>
  <nav class="nav" aria-label="Main">
    <a href="${home}#explore">Explore the map</a>
    <a href="${home}#resources">Official resources</a>
    <a class="btn btn--outline" href="${href(p, 'guide/')}" data-guide-source="nav">Free research guide</a>
  </nav>
</div></header>
<main id="main">
${main}
</main>
<footer class="footer"><div class="wrap footer__row">
  <div class="footer__about">
    <h2 class="footer__title">About this resource</h2>
    <p>Central Ohio School District Insights is an independent educational resource. It is not affiliated with or endorsed by the State of Ohio, the Ohio Department of Education and Workforce, any school district, or any board of elections. It does not rank districts or recommend neighborhoods. Always confirm details with the official source.</p>
    <p>Analytics record page activity only, never names, emails or addresses. <a href="${href(p, 'privacy/')}">Privacy policy</a></p>
  </div>
  <div class="footer__agent">
    <img src="${p}assets/sarita-headshot.jpg" alt="" width="92" height="116">
    <div>
      <div class="eyebrow">Presented by</div>
      <div class="footer__name">${esc(a.name)}</div>
      ${brandLockup(p)}
      <div><a href="${a.phoneHref}">${esc(a.phone)}</a> · <a href="mailto:${esc(a.email)}">Email</a></div>
      <div class="muted">Equal Housing Opportunity</div>
    </div>
  </div>
</div></footer>
<a class="float-portrait" href="${a.phoneHref}" aria-label="Call ${esc(a.name)} at ${esc(a.phone)}">
  <img src="${p}assets/sarita-portrait.png" alt="" width="700" height="696">
  <span class="float-portrait__card"><span class="float-portrait__name">${esc(a.name)}</span><span class="float-portrait__phone">${esc(a.phone)}</span></span>
</a>
<script src="${p}assets/track.js"></script>
<script src="${p}assets/site.js"></script>
</body>
</html>
`;
}

// ---------- pages ----------
function homePage() {
  const depth = 0;
  const p = prefix(depth);
  const countyNames = counties.map((c) => c.name).join(' · ');
  const panels = counties.map((c) => {
    const list = inCounty(c);
    return `<div class="county-panel" data-county-panel="${c.slug}" hidden>
      <h3 class="county-panel__title">${esc(c.name)} County</h3>
      <p class="muted">${list.length} school districts serve part of the county</p>
      <ul class="district-grid">${list.map((d) => `<li><a class="district-link" href="${href(p, `districts/${d.slug}/`)}" data-district="${esc(d.name)}" data-county="${esc(c.name)}"><span>${esc(d.name)}</span>${d.counties.length > 1 ? `<span class="district-link__note">Spans ${d.counties.length} counties</span>` : ''}</a></li>`).join('')}</ul>
    </div>`;
  }).join('');
  const main = `
<section class="hero"><div class="wrap">
  <div class="eyebrow">${esc(countyNames)}</div>
  <h1 class="display">Understand your school district, straight from the official sources.</h1>
  <p class="lead">Find Ohio School Report Cards, levy and election results, and property tax records for Central Ohio districts, in one place and in plain language.</p>
  <div class="actions">
    <a class="btn" href="#explore">Explore the county map</a>
    <a class="textlink" href="${href(p, 'guide/')}" data-guide-source="hero">Or get the free research guide</a>
  </div>
  <div class="hero-brand">
    <div class="eyebrow">Presented by ${esc(site.agent.name)}</div>
    ${brandLockup(p)}
  </div>
</div></section>

<section id="explore" class="band band--sand"><div class="wrap">
  <div class="section-head">
    <div><div class="eyebrow eyebrow--accent">Explore</div><h2 class="h2">Start with your county</h2></div>
  </div>
  <div class="explore">
    <div class="explore__map">
      ${mapSvg()}
      <p class="caption">Select a county on the map or from the list. Neighboring counties are shown for context. Boundaries: U.S. Census Bureau.</p>
    </div>
    <div class="explore__panel">
      <label class="field-label eyebrow" for="county-select">Step 1 · County</label>
      <select id="county-select" class="input">
        <option value="">Choose a county…</option>
        ${counties.map((c) => `<option value="${c.slug}">${esc(c.name)} County</option>`).join('')}
      </select>
      <div class="eyebrow step2">Step 2 · School district</div>
      <div class="empty" data-county-empty>Select a county on the map or from the list above to see the school districts that serve it.</div>
      ${panels}
    </div>
  </div>
</div></section>

<section id="resources" class="band"><div class="wrap">
  <div class="eyebrow eyebrow--accent">Official resources</div>
  <h2 class="h2">Three places to look, and what each one tells you</h2>
  <p class="lead lead--small">These are public resources. No sign-up is needed, and every link opens the official site in a new tab.</p>
  <div class="cols3">
    <article class="col">
      <div class="num">01</div>
      <h3 class="h3">Ohio School Report Cards</h3>
      <p>The state's annual report on every public district and school, with star ratings for areas such as achievement, progress, gap closing, early literacy and graduation.</p>
      ${ext(site.officialLinks.reportCards, 'Visit Ohio School Report Cards', 'report_cards')}
    </article>
    <article class="col">
      <div class="num">02</div>
      <h3 class="h3">Levy &amp; election results</h3>
      <p>County boards of elections publish and certify results. When a district crosses county lines, each county reports only its own share of the vote.</p>
      ${ext(site.officialLinks.boeDirectory, 'County boards of elections directory', 'boe_directory')}
    </article>
    <article class="col">
      <div class="num">03</div>
      <h3 class="h3">What will I pay in taxes?</h3>
      <p>Two homes at the same price can have very different tax bills depending on the school district. Look up any address to see its yearly property taxes, and check whether the district also has a school income tax.</p>
      ${ext(site.officialLinks.theFinder, 'Check for a school income tax (The Finder)', 'the_finder')}
    </article>
  </div>
</div></section>

<section id="your-move" class="band band--sand"><div class="wrap">
  <div class="eyebrow eyebrow--accent">Your next move</div>
  <h2 class="h2">Buying, selling, or staying?</h2>
  <p class="lead lead--small">The same public records answer different questions depending on where you are. Start with the one that fits you.</p>
  <div class="cols3">
    ${SITUATIONS.map((s) => `<article class="col situation">
      <div class="situation__label">${esc(s.label)}</div>
      <h3 class="h3">${esc(s.title)}</h3>
      <p>${esc(s.intro)}</p>
      <ul class="ticks ticks--tight">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
      ${s.key === 'buying'
        ? `<a class="textlink" href="${href(p, 'guide/')}?situation=buying" data-guide-source="situation_buying">Get the free research guide</a>`
        : `<a class="textlink" href="${href(p, 'property-review/')}?situation=${s.key}">Request a personalized property review</a>`}
    </article>`).join('')}
  </div>
</div></section>

<section class="band band--dark"><div class="wrap guide-band">
  ${guideCover(false)}
  <div class="guide-band__text">
    <div class="eyebrow eyebrow--light">Free guide</div>
    <h2 class="h2">Everything you need to research your school district before your next housing decision.</h2>
    <ul class="ticks">
      <li>Reading an Ohio School Report Card</li>
      <li>Finding levy results, including districts that cross county lines</li>
      <li>How property taxes and school income taxes work</li>
      <li>A district research checklist</li>
      <li>Housing considerations for buyers and homeowners</li>
    </ul>
    <a class="btn btn--gold" href="${href(p, 'guide/')}" data-guide-source="home_band">Get My Free District Research Guide</a>
  </div>
</div></section>`;
  return layout({ title: `${site.siteName} · Official school district resources`, description: 'Find Ohio School Report Cards, school levy results and property tax resources for Central Ohio school districts, in plain language.', depth, main, page: 'home' });
}

function districtPage(d) {
  const depth = 2;
  const p = prefix(depth);
  const first = countyInfo(d.counties[0]);
  const levy = d.levy
    ? `<div class="levy">
        <div class="eyebrow">${esc(d.levy.date)} · ${esc(d.levy.status)}</div>
        <div class="levy__result">${esc(d.levy.result)}</div>
        <dl class="levy__grid"><dt>Issue</dt><dd>${esc(d.levy.issue)}</dd><dt>Amount</dt><dd>${esc(d.levy.amount)}</dd><dt>Vote</dt><dd>${esc(d.levy.vote)}</dd></dl>
        <p class="levy__source">${esc(d.levy.source)}</p>
      </div>`
    : `<div class="empty">No recent school issue is loaded for ${esc(d.name)}. Check the county board of elections below for current and past results.</div>`;
  const main = `
<div class="wrap"><a class="back" href="${href(p, '')}?county=${first.slug}#explore" data-back-link>← Back to ${esc(first.name)} County districts</a></div>
<section class="band band--tight"><div class="wrap">
  <div class="eyebrow">School district resources</div>
  <h1 class="display display--md">${esc(d.name)}</h1>
  <div class="chips">${d.counties.map((c) => `<span class="chip">${esc(c)} County</span>`).join('')}</div>
  ${d.counties.length > 1 ? `<div class="callout"><strong>This district crosses county lines.</strong> Each county board of elections reports only the votes cast in its county. Add the results from every county listed above for the districtwide outcome.</div>` : ''}
</div></section>

<section class="band band--rule"><div class="wrap cols3 cols3--district">
  <article class="col">
    <h2 class="h3">Ohio School Report Cards</h2>
    <p>Report cards measure how a district and each of its schools perform on state standards, using star ratings across components such as Achievement, Progress, Gap Closing, Early Literacy and Graduation, plus an overall rating.</p>
    <div class="empty">Ratings are not reproduced here. Look up ${esc(d.name)} on the official site for its current report card.</div>
    ${ext(site.officialLinks.reportCards, 'Open Ohio School Report Cards', 'report_cards', first.name)}
  </article>
  <article class="col">
    <h2 class="h3">Levy &amp; election results</h2>
    <p>Official results are published and certified by the county board of elections where votes were cast. Results on election night are unofficial until certified.</p>
    ${levy}
    <div class="linklist">${d.counties.map(boeLink).join('')}</div>
  </article>
  <article class="col">
    <h2 class="h3">What will I pay in taxes here?</h2>
    <p>School levies are paid through property taxes, and some districts also tax residents' income. Both affect your monthly cost of owning a home.</p>
    <ol class="steps">
      <li><strong>Look up the address</strong> on the county auditor site to see the home's current yearly tax bill and its school district.</li>
      <li><strong>Check for a school income tax</strong> with the state's address lookup, The Finder.</li>
      <li><strong>Share both numbers with your lender</strong> so your monthly payment estimate is accurate.</li>
    </ol>
    <div class="linklist">
      ${d.counties.map(auditorLink).join('')}
      ${ext(site.officialLinks.theFinder, 'Check for a school income tax (The Finder)', 'the_finder', first.name)}
      ${ext(site.officialLinks.dew, 'District budgets &amp; forecasts (Ohio Dept. of Education &amp; Workforce)', 'ohio_dew', first.name)}
    </div>
  </article>
</div></section>

<section class="band band--sand band--rule"><div class="wrap split">
  <div>
    <h2 class="h2 h2--sm">Keep this research in one place</h2>
    <p class="lead lead--small">The free research guide walks through each of these sources step by step, with a checklist you can use for any district.</p>
  </div>
  <a class="btn" href="${href(p, 'guide/')}?district=${d.slug}" data-guide-source="district_page">Get My Free District Research Guide</a>
</div></section>
<section class="band band--tight"><div class="wrap inline-offer">
  <span>Own a home here? Curious what it's worth in today's market?</span>
  <a class="textlink" href="${href(p, 'property-review/')}?district=${d.slug}">Request a personalized property review</a>
</div></section>`;
  return layout({ title: `${d.name} · School district resources · ${site.siteName}`, description: `Official report card, levy and property tax resources for ${d.name}, serving ${d.counties.join(', ')} ${d.counties.length > 1 ? 'counties' : 'County'}.`, depth, main, page: 'district' });
}

function guidePage() {
  const depth = 1;
  const p = prefix(depth);
  const main = `
<section class="band"><div class="wrap form-layout">
  <div class="form-layout__intro">
    <div class="eyebrow eyebrow--accent">Free research guide</div>
    <h1 class="display display--sm">The Central Ohio School District Research Guide</h1>
    <p class="lead lead--small">Everything you need to research your school district before making your next housing decision.</p>
    ${guideCover(true)}
    <p class="muted small">The official resources on this site are always free to use, with no email required. <a href="${href(p, '')}#explore">Return to the map</a></p>
  </div>
  <form class="form" name="district-guide" method="POST" action="${href(p, 'guide/thanks/')}" data-netlify="true" netlify-honeypot="bot-field" data-ajax-form="guide" novalidate>
    <input type="hidden" name="form-name" value="district-guide">
    <input type="hidden" name="source" value="">
    <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <h2 class="h3">Where should we send your guide?</h2>
    <div class="field"><label for="g-first">First name</label><input class="input" id="g-first" name="first_name" type="text" autocomplete="given-name" required></div>
    <div class="field"><label for="g-email">Email address</label><input class="input" id="g-email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="g-district">School district</label>
      <select class="input" id="g-district" name="district">
        <option value="">Not sure yet</option>
        ${districts.map((d) => `<option value="${esc(d.name)}" data-slug="${d.slug}">${esc(d.name)}</option>`).join('')}
      </select>
    </div>
    <fieldset class="field">
      <legend>Which best describes you?</legend>
      <label class="choice"><input type="radio" name="situation" value="buying" required> I’m considering buying a home.</label>
      <label class="choice"><input type="radio" name="situation" value="selling"> I’m considering selling my home.</label>
      <label class="choice"><input type="radio" name="situation" value="staying"> I’m planning to stay where I am.</label>
      <label class="choice"><input type="radio" name="situation" value="researching"> I’m just researching.</label>
    </fieldset>
    <label class="choice choice--consent"><input type="checkbox" name="marketing_consent" value="yes"> <span>Optional: I’d also like occasional emails about Central Ohio schools and housing from ${esc(site.agent.name)}. Unsubscribe anytime.</span></label>
    <div class="form__error" role="alert" hidden></div>
    <button class="btn btn--block" type="submit">Get My Free District Research Guide</button>
    <p class="muted small">We use your details only to send your guide and, if you ask, to follow up. We never sell your information. <a href="${href(p, 'privacy/')}">Privacy policy</a></p>
  </form>
</div></section>`;
  return layout({ title: `Free School District Research Guide · ${site.siteName}`, description: 'Get the free Central Ohio School District Research Guide: report cards, levy results, property taxes and a district research checklist.', depth, main, page: 'guide' });
}

function guideThanksPage() {
  const depth = 2;
  const p = prefix(depth);
  const main = `
<section class="band"><div class="wrap narrow">
  <div class="rule-accent"></div>
  <h1 class="display display--sm">Thank you. Your guide is ready.</h1>
  <p class="lead lead--small">Download the Central Ohio School District Research Guide below. You'll also receive a copy by email, so you can find it later.</p>
  <div class="download">
    <a class="btn btn--gold" href="${p}downloads/central-ohio-school-district-research-guide.pdf" target="_blank" rel="noopener" data-track-download>Download the guide (PDF, 11 pages)</a>
    <span class="muted small">Includes a printable district research worksheet</span>
  </div>
  ${DEMO ? '<p class="demo-note">Preview: nothing was sent.</p>' : ''}
  ${SITUATIONS.map((s) => `<div class="next" data-situation-block="${s.key}" hidden>
    <div class="eyebrow eyebrow--accent">Your next steps</div>
    <h2 class="h2 h2--sm">${esc(s.title)}</h2>
    <p>${esc(s.intro)}</p>
    <ol class="steps">${s.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
  </div>`).join('')}
  <div class="next" data-situation-block="researching" hidden>
    <div class="eyebrow eyebrow--accent">Your next steps</div>
    <h2 class="h2 h2--sm">While you research</h2>
    <ol class="steps">
      <li>Pick a county on the map and open each district you’re curious about.</li>
      <li>Compare report cards, recent levy results and tax lookups side by side.</li>
      <li>Use the checklist in your guide whenever a specific address comes up.</li>
    </ol>
  </div>
  <div class="offer" data-valuation-offer hidden>
    <h2 class="h2 h2--sm">Curious What Your Home Is Worth in Today’s Market?</h2>
    <p>Request a personalized property review. This isn't an automated estimate: a real estate professional looks at your home and recent local market activity before preparing your report.</p>
    <a class="btn" href="${href(p, 'property-review/')}" data-situation-link>Request a property review</a>
  </div>
  <div class="offer offer--quiet" data-buyer-contact hidden>
    <h2 class="h2 h2--sm">Questions about a specific home?</h2>
    <p>Sarita can walk you through the school district, tax and levy records for any address you're considering. No obligation.</p>
    <p class="contact-line"><span>${esc(site.agent.phone)}</span><span>${esc(site.agent.email)}</span></p>
  </div>
  <p><a class="btn btn--outline" href="${href(p, '')}#explore">Keep exploring districts</a></p>
</div></section>`;
  return layout({ title: `Thank you · ${site.siteName}`, description: 'Your research guide request was received.', depth, main, page: 'guide-thanks' });
}

function reviewPage() {
  const depth = 1;
  const p = prefix(depth);
  const a = site.agent;
  const main = `
<section class="band"><div class="wrap form-layout">
  <div class="form-layout__intro">
    <div class="eyebrow eyebrow--accent">Personalized property review</div>
    <h1 class="display display--sm">Curious What Your Home Is Worth in Today’s Market?</h1>
    <p class="lead lead--small">This is not an automated valuation. A licensed real estate professional will personally review your property and relevant market activity before preparing your report.</p>
    <ol class="steps">
      <li>Tell us about the property</li>
      <li>Sarita reviews comparable sales and current listings</li>
      <li>You receive a written review, with no obligation</li>
    </ol>
    <div class="agent-card">
      <img src="${p}assets/sarita-headshot.jpg" alt="" width="96" height="120">
      <div><div class="agent-card__name">${esc(a.name)}</div>${brandLockup(p)}<div class="muted">Personally prepares every review</div></div>
    </div>
  </div>
  <form class="form" name="property-review" method="POST" action="${href(p, 'property-review/thanks/')}" data-netlify="true" netlify-honeypot="bot-field" data-ajax-form="review" novalidate>
    <input type="hidden" name="form-name" value="property-review">
    <input type="hidden" name="district" value="">
    <input type="hidden" name="situation" value="">
    <p class="hp"><label>Leave this empty <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <div class="field"><label for="r-name">Name</label><input class="input" id="r-name" name="name" type="text" autocomplete="name" required></div>
    <div class="field"><label for="r-email">Email address</label><input class="input" id="r-email" name="email" type="email" autocomplete="email" required></div>
    <div class="field"><label for="r-address">Property address</label><input class="input" id="r-address" name="address" type="text" autocomplete="street-address" required></div>
    <div class="field"><label for="r-improve">Significant improvements <span class="muted">(roof, kitchen, additions, etc.)</span></label><textarea class="input" id="r-improve" name="improvements" rows="4"></textarea></div>
    <div class="field"><label for="r-timeline">Selling timeline</label>
      <select class="input" id="r-timeline" name="timeline" required>
        <option value="" disabled selected>Choose a timeline</option>
        <option value="0-3 months">Within 3 months</option>
        <option value="3-6 months">3 to 6 months</option>
        <option value="6-12 months">6 to 12 months</option>
        <option value="12+ months">More than a year</option>
        <option value="not planning">Not planning to sell</option>
      </select>
    </div>
    <div class="form__error" role="alert" hidden></div>
    <button class="btn btn--block" type="submit">Request my property review</button>
    <p class="muted small">Your information is used only to prepare and send your review. We never sell it. <a href="${href(p, 'privacy/')}">Privacy policy</a></p>
  </form>
</div></section>`;
  return layout({ title: `Personalized Property Review · ${site.siteName}`, description: 'Request a personal property review from a local real estate professional. Not an automated valuation.', depth, main, page: 'review' });
}

function reviewThanksPage() {
  const depth = 2;
  const p = prefix(depth);
  const main = `
<section class="band"><div class="wrap narrow">
  <div class="rule-accent"></div>
  <h1 class="display display--sm">Thank you. Your request is in.</h1>
  <p class="lead lead--small">Sarita will review your property and recent market activity, then reach out by email with your personalized review. There's no obligation.</p>
  ${DEMO ? '<p class="demo-note">Preview: nothing was sent.</p>' : ''}
  <p><a class="btn btn--outline" href="${href(p, '')}#explore">Back to the map</a></p>
</div></section>`;
  return layout({ title: `Thank you · ${site.siteName}`, description: 'Your property review request was received.', depth, main, page: 'review-thanks' });
}

function privacyPage() {
  const depth = 1;
  const p = prefix(depth);
  const a = site.agent;
  const main = `
<section class="band"><div class="wrap narrow prose">
  <p class="demo-note">Draft for review before launch. Have your broker or an attorney approve this policy.</p>
  <h1 class="display display--sm">Privacy policy</h1>
  <p><strong>What we collect.</strong> When you request the research guide, we collect your first name, email address, the school district you choose (optional) and which description fits you. When you request a property review, we collect your name, email address, property address, any improvements you list and your selling timeline.</p>
  <p><strong>How we use it.</strong> To send what you requested and, if you ask for it, to follow up. If you check the optional box, you may also receive occasional emails about Central Ohio schools and housing. You can unsubscribe anytime.</p>
  <p><strong>What we don't do.</strong> We never sell your information. Site analytics record how pages are used, never names, emails or addresses.</p>
  <p><strong>Public resources.</strong> Links to government websites are free to use with no sign-up and open those sites in a new tab. Their own privacy policies apply there.</p>
  <p><strong>Contact.</strong> ${esc(a.name)}, ${esc(a.brokerage)}, <a href="mailto:${esc(a.email)}">${esc(a.email)}</a>, <a href="${a.phoneHref}">${esc(a.phone)}</a>.</p>
  <p><a href="${href(p, '')}">Back to home</a></p>
</div></section>`;
  return layout({ title: `Privacy policy · ${site.siteName}`, description: 'How Central Ohio School District Insights handles your information.', depth, main, page: 'privacy' });
}

function notFoundPage() {
  const main = `<section class="band"><div class="wrap narrow"><h1 class="display display--sm">Page not found</h1><p class="lead lead--small">That page doesn't exist. Try the county map instead.</p><p><a class="btn" href="/#explore">Explore the county map</a></p></div></section>`;
  // 404 is served at any path, so it uses absolute links
  return layout({ title: `Page not found · ${site.siteName}`, description: 'Page not found.', depth: 0, main, page: '404' })
    .replaceAll('href="./', 'href="/').replaceAll('src="./', 'src="/');
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
const write = (rel, html) => {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
};
write('index.html', homePage());
for (const d of districts) write(`districts/${d.slug}/index.html`, districtPage(d));
write('guide/index.html', guidePage());
write('guide/thanks/index.html', guideThanksPage());
write('property-review/index.html', reviewPage());
write('property-review/thanks/index.html', reviewThanksPage());
write('privacy/index.html', privacyPage());
write('404.html', notFoundPage());

fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) fs.copyFileSync(path.join(ROOT, 'assets', f), path.join(OUT, 'assets', f));
for (const f of ['site.css', 'site.js', 'track.js']) fs.copyFileSync(path.join(ROOT, 'src', f), path.join(OUT, 'assets', f));
fs.mkdirSync(path.join(OUT, 'downloads'), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, 'static'))) fs.copyFileSync(path.join(ROOT, 'static', f), path.join(OUT, 'downloads', f));

const sitemap = [''].concat(districts.map((d) => `districts/${d.slug}/`), ['guide/', 'property-review/', 'privacy/'])
  .map((r) => `  <url><loc>${site.siteUrl.replace(/\/$/, '')}/${r}</loc></url>`).join('\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /downloads/\nDisallow: /guide/thanks/\nDisallow: /property-review/thanks/\nSitemap: ${site.siteUrl.replace(/\/$/, '')}/sitemap.xml\n`);

console.log(`Built ${districts.length} district pages + 7 pages into dist/${DEMO ? ' (preview mode)' : ''}`);
