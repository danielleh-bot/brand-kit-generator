#!/usr/bin/env node
/**
 * Mediahuis True Native mockups — Crime World + Belfast Telegraph, light + dark.
 *
 * Why this exists
 * ---------------
 * Mediahuis reviewed the first round of True Native mocks and asked for one thing:
 * the surrounding site has to look like their sites look *today*, so the feed reads
 * as part of the page rather than a widget dropped on top of it.
 *
 * Everything brand-specific lives in BRANDS[...] below — palette, type, masthead,
 * nav, article copy, feed inventory. Re-tuning a colour after seeing a screenshot
 * is a one-line edit here, not a hunt through four HTML files.
 *
 * Output: output/<brand>/mobile-prototype-<mode>.html (self-contained, no network
 * dependency — imagery is generated inline as SVG so the file renders in a
 * boardroom with flaky wifi).
 */

const fs = require('fs');
const path = require('path');

const OUT_ROOT = path.join(__dirname, '..', 'output');

/* ---------------------------------------------------------------------------
 * Shared platform notes
 *
 * belfasttelegraph.co.uk and crimeworld.com run on the same Mediahuis platform —
 * the /<section>/<slug>/a/<id>.html URL pattern on both sample pages is the tell.
 * So the page furniture (sticky masthead, section rail, breadcrumb kicker, serif
 * headline, standfirst, byline strip, hero + caption, tag row) is shared, and the
 * brands differ by token, masthead and content. That is also why the same feed
 * module can be dropped into both and stay native to each.
 * ------------------------------------------------------------------------- */

const TABOOLA_NOTE = 'Recommended by Taboola';

const BRANDS = {
  'belfast-telegraph': {
    slug: 'belfast-telegraph',
    name: 'Belfast Telegraph',
    publisherId: '1284555',
    host: 'belfasttelegraph.co.uk',
    sampleUrl:
      'https://www.belfasttelegraph.co.uk/area/derry-londonderry/news/a-real-sense-of-shock-and-sadness-woman-50s-dies-after-one-vehicle-crash-in-limavady/a/160113143.html',
    fonts:
      'family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700',
    fontDisplay: '"Source Serif 4", Georgia, "Times New Roman", serif',
    fontUi: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    masthead: 'wordmark-serif',
    mastheadText: 'Belfast Telegraph',
    subscribeLabel: 'Subscribe',
    nav: ['News', 'Northern Ireland', 'Politics', 'Business', 'Sport', 'Life', 'Opinion', 'Podcasts', 'Puzzles'],
    navActive: 'News',
    breadcrumb: ['News', 'Derry / Londonderry'],
    kicker: 'Derry / Londonderry',
    premium: false,
    headline:
      '‘A real sense of shock and sadness’: Woman (50s) dies after one-vehicle crash in Limavady',
    standfirst:
      'Police have appealed for witnesses and dashcam footage after the collision on the Drumrane Road on Sunday afternoon.',
    byline: 'Belfast Telegraph Reporter',
    bylineRole: 'News',
    timestamp: 'Today at 08:41',
    readTime: '2 min read',
    heroMotif: 'road',
    heroCaption:
      'The road was closed for several hours while collision investigators examined the scene. Photo: Stock image',
    body: [
      'A woman in her 50s has died following a one-vehicle collision in Limavady, Co Derry, police have confirmed.',
      'Emergency services were called to the Drumrane Road area at around 2.50pm on Sunday following reports of a serious road traffic collision.',
      'Officers from the PSNI attended alongside colleagues from the Northern Ireland Ambulance Service, who provided medical treatment at the scene. The woman died from her injuries a short time later.',
    ],
    pullquote:
      'Limavady is a close-knit place, and news like this touches every single family in the town.',
    pullquoteAttr: 'Local councillor',
    bodyAfter: [
      'The road was closed for a number of hours while collision investigators carried out an examination of the scene. It has since reopened.',
      'Police have appealed for anyone who witnessed the collision, or who was travelling in the area at the time and may have dashcam footage, to contact them.',
    ],
    tags: ['Limavady', 'PSNI', 'Road safety'],
    feedTitle: 'More from Belfast Telegraph',
    feed: [
      { type: 'lead', kicker: 'Northern Ireland', motif: 'city', title: 'What the £310m Belfast city centre regeneration plan means for shoppers and traders', meta: 'Business' },
      { type: 'row', kicker: 'Motoring', motif: 'road', title: 'Warning for NI drivers as new average-speed enforcement goes live this month', meta: '4 min read' },
      { type: 'sponsored-row', motif: 'home', title: 'Homeowners in Northern Ireland are switching to heat pumps — here’s what it costs in 2026', advertiser: 'Aurora Energy' },
      { type: 'row', kicker: 'Weather', motif: 'weather', title: 'Yellow warning issued as heavy rain and gusts sweep across Northern Ireland', meta: '2 min read' },
      { type: 'grid', items: [
        { kicker: 'Courts', motif: 'court', title: 'Derry man awarded six-figure sum over workplace injury' },
        { kicker: 'Sport', motif: 'sport', title: 'Ulster hit by injury blow days out from URC opener' },
      ] },
      { type: 'sponsored-cta', motif: 'travel', title: 'The travel money card Irish holidaymakers are quietly switching to', advertiser: 'Kestrel Money', cta: 'Learn more' },
      { type: 'row', kicker: 'Life', motif: 'city', title: 'The Co Down village that has quietly become NI’s best weekend escape', meta: '6 min read' },
      { type: 'sponsored-row', motif: 'auto', title: 'Five signs your tyres won’t make it through another NI winter', advertiser: 'Northline Auto' },
    ],
    palettes: {
      light: {
        bg: '#FFFFFF', surface: '#FFFFFF', band: '#F3F4F6', line: '#E1E4E8', lineSoft: '#EDEFF2',
        text: '#14171A', textMuted: '#5A626B', textFaint: '#79818A',
        accent: '#CE0E2D', accentText: '#FFFFFF', accentSoft: '#FCE9EC',
        header: '#FFFFFF', headerText: '#14171A', headerLine: '#DFE3E8',
        chip: '#F3F4F6', shell: '#E7E9EC', stage: '#DFE3E8', stageInk: '#1D2126',
      },
      dark: {
        bg: '#0E1114', surface: '#151A1F', band: '#171C22', line: '#262D35', lineSoft: '#1F252C',
        text: '#EDF0F3', textMuted: '#9AA4AF', textFaint: '#7B8592',
        accent: '#FF3B54', accentText: '#14171A', accentSoft: '#2A151A',
        header: '#0B0E11', headerText: '#F4F6F8', headerLine: '#242B33',
        chip: '#1B2128', shell: '#05070A', stage: '#05070A', stageInk: '#E7EBEF',
      },
    },
  },

  'crime-world': {
    slug: 'crime-world',
    name: 'Crime World',
    publisherId: '1641788',
    host: 'crimeworld.com',
    sampleUrl:
      'https://www.crimeworld.com/courts/teens-charged-over-alex-coughlans-death-in-blanchardstown-set-for-murder-trial/a/160124238.html',
    fonts:
      'family=Oswald:wght@500;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;500;600;700',
    fontDisplay: '"Source Serif 4", Georgia, "Times New Roman", serif',
    fontUi: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    fontLogo: 'Oswald, "Arial Narrow", Impact, sans-serif',
    masthead: 'wordmark-block',
    mastheadText: 'CRIME WORLD',
    subscribeLabel: 'Subscribe',
    nav: ['Latest', 'Ireland', 'Courts', 'Gangland', 'Investigations', 'UK & World', 'Podcasts', 'Video'],
    navActive: 'Courts',
    breadcrumb: ['Courts'],
    kicker: 'Courts',
    premium: true,
    headline:
      'Teens charged over Alex Coughlan’s death in Blanchardstown set for murder trial',
    standfirst:
      'The two boys, aged 16 and 17, cannot be named because they are juveniles and remain in custody at Oberstown having been refused bail.',
    byline: 'Crime World Court Reporter',
    bylineRole: 'Courts',
    timestamp: 'Today at 11:12',
    readTime: '3 min read',
    heroMotif: 'court',
    heroCaption: 'The case was listed before the Dublin District Court. Photo: Stock image',
    body: [
      'Two teenage boys accused of attacking a man who died after being seriously injured in Blanchardstown, west Dublin, are to be tried for murder.',
      'Alex Coughlan (37) suffered serious injuries after he was assaulted on Mill Road at around 4.20pm on May 17 and was found unconscious. He was taken to hospital in a critical condition and was pronounced dead on May 20.',
      'A post-mortem examination established that Mr Coughlan had suffered “traumatic” head and neck injuries.',
    ],
    pullquote:
      'The case falls under the juvenile protocol, setting a strict 12-month limit to complete the trial process.',
    pullquoteAttr: 'Court reporting note',
    bodyAfter: [
      'Shortly after he died, gardaí charged two boys, aged 17 and 16, in connection with the incident. The pair, who cannot be named because they are juveniles, have been remanded to the Oberstown Children Detention Campus, having been refused bail.',
      'They were originally accused of causing serious harm to Mr Coughlan at Mill Road, contrary to section 4 of the Non-Fatal Offences Against the Person Act. They were also charged with robbing him of his bank cards and a €300 gold ring.',
    ],
    tags: ['Courts', 'Dublin', 'Oberstown'],
    podcastStrip: { label: 'Crime World Podcast', title: 'Nicola Tallant on the cases before the courts this week', meta: 'New episode · 38 min' },
    feedTitle: 'More from Crime World',
    feed: [
      { type: 'lead', kicker: 'Investigations', motif: 'night', title: 'Inside the feud that split one of Dublin’s biggest crime gangs — and what comes next', meta: 'Subscriber' },
      { type: 'row', kicker: 'Gangland', motif: 'port', title: 'Gardaí seize €1.2m of cocaine in Dublin Port container search', meta: '3 min read' },
      { type: 'sponsored-row', motif: 'security', title: 'The home security cameras Irish homeowners are installing this year', advertiser: 'Vantage Secure' },
      { type: 'row', kicker: 'Courts', motif: 'court', title: 'Convicted armed robber loses appeal over 12-year sentence', meta: '2 min read' },
      { type: 'grid', items: [
        { kicker: 'Podcast', motif: 'podcast', title: 'The disappearance that still haunts a Cork town' },
        { kicker: 'UK & World', motif: 'night', title: 'How an encrypted phone network brought down a cartel' },
      ] },
      { type: 'sponsored-cta', motif: 'digital', title: 'The €9 subscription that tells you when your data has leaked', advertiser: 'Sentinel ID', cta: 'Check my data' },
      { type: 'row', kicker: 'True Crime', motif: 'podcast', title: 'Twelve new true crime series worth your time this month', meta: '5 min read' },
      { type: 'sponsored-row', motif: 'digital', title: 'True crime fans are binging these box sets before they leave streaming', advertiser: 'StreamList IE' },
    ],
    palettes: {
      light: {
        bg: '#FFFFFF', surface: '#FFFFFF', band: '#F4F5F6', line: '#E2E5E8', lineSoft: '#EDEFF1',
        text: '#111315', textMuted: '#565C63', textFaint: '#767C84',
        accent: '#D81324', accentText: '#FFFFFF', accentSoft: '#FDE8EA',
        header: '#111315', headerText: '#FFFFFF', headerLine: '#26292D',
        chip: '#F1F2F4', shell: '#E4E6E9', stage: '#DCDFE3', stageInk: '#16181B',
      },
      dark: {
        bg: '#0A0B0D', surface: '#121417', band: '#141619', line: '#24272C', lineSoft: '#1C1F23',
        text: '#F2F4F6', textMuted: '#9AA1A9', textFaint: '#7A828B',
        accent: '#FF2D3F', accentText: '#0A0B0D', accentSoft: '#2A1013',
        header: '#000000', headerText: '#FFFFFF', headerLine: '#22262B',
        chip: '#191C20', shell: '#000000', stage: '#000000', stageInk: '#EDEFF2',
      },
    },
  },
};

module.exports = { BRANDS, TABOOLA_NOTE, OUT_ROOT };

/* ---------------------------------------------------------------------------
 * Inline artwork
 *
 * These mocks get emailed around and shown in a meeting room, so every image is
 * generated as inline SVG. Nothing hotlinks a publisher CDN that could 404 or a
 * stock service that could rate-limit — the file looks identical offline.
 * The motifs are deliberately abstract editorial texture, not fake photography.
 * ------------------------------------------------------------------------- */

const MOTIFS = {
  road:     { c1: '#2B3A4A', c2: '#7C8A99', shapes: ['horizon', 'roadlines', 'beams'] },
  city:     { c1: '#243040', c2: '#8494A6', shapes: ['skyline', 'horizon', 'sun'] },
  court:    { c1: '#2A2622', c2: '#8C8378', shapes: ['columns', 'horizon'] },
  weather:  { c1: '#33414F', c2: '#93A3B3', shapes: ['rain', 'horizon', 'sun'] },
  sport:    { c1: '#1F3A2C', c2: '#7FA38C', shapes: ['arcs', 'horizon'] },
  home:     { c1: '#3A3128', c2: '#A2937F', shapes: ['house', 'horizon', 'sun'] },
  travel:   { c1: '#1F3A4A', c2: '#86AFC2', shapes: ['horizon', 'sun', 'arcs'] },
  auto:     { c1: '#2C2F36', c2: '#8A8F99', shapes: ['roadlines', 'arcs'] },
  night:    { c1: '#15181F', c2: '#4E5666', shapes: ['skyline', 'moon', 'beams'] },
  port:     { c1: '#1B2A33', c2: '#6F8A99', shapes: ['containers', 'horizon'] },
  security: { c1: '#232A33', c2: '#7C8A9B', shapes: ['grid', 'lens'] },
  podcast:  { c1: '#2A1F2C', c2: '#907E93', shapes: ['waveform', 'circlemic'] },
  digital:  { c1: '#1C2530', c2: '#6E8296', shapes: ['grid', 'beams'] },
};

function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17;
    h ^= h << 5; h >>>= 0;
    return (h >>> 0) / 4294967296;
  };
}

function shapeMarkup(kind, rnd, w, h) {
  const light = 'rgba(255,255,255,';
  const dark = 'rgba(0,0,0,';
  switch (kind) {
    case 'horizon':
      return `<rect x="0" y="${h * 0.62}" width="${w}" height="${h * 0.38}" fill="${dark}0.28)"/>`;
    case 'roadlines': {
      let d = '';
      for (let i = 0; i < 5; i++) {
        const y = h * (0.68 + i * 0.07);
        const wid = w * (0.06 + i * 0.03);
        d += `<rect x="${w / 2 - wid / 2}" y="${y}" width="${wid}" height="${h * 0.022}" rx="2" fill="${light}0.5)"/>`;
      }
      return d;
    }
    case 'skyline': {
      let d = '';
      let x = -w * 0.05;
      while (x < w) {
        const bw = w * (0.07 + rnd() * 0.09);
        const bh = h * (0.16 + rnd() * 0.34);
        d += `<rect x="${x}" y="${h * 0.62 - bh}" width="${bw * 0.92}" height="${bh}" fill="${dark}0.34)"/>`;
        x += bw;
      }
      return d;
    }
    case 'columns': {
      let d = '';
      const n = 6;
      for (let i = 0; i < n; i++) {
        const cw = w * 0.075;
        const gap = (w - n * cw) / (n + 1);
        const x = gap + i * (cw + gap);
        d += `<rect x="${x}" y="${h * 0.26}" width="${cw}" height="${h * 0.4}" fill="${light}0.16)"/>`;
      }
      d += `<rect x="${w * 0.05}" y="${h * 0.2}" width="${w * 0.9}" height="${h * 0.055}" fill="${light}0.22)"/>`;
      d += `<rect x="${w * 0.02}" y="${h * 0.655}" width="${w * 0.96}" height="${h * 0.05}" fill="${light}0.2)"/>`;
      return d;
    }
    case 'rain': {
      let d = '';
      for (let i = 0; i < 26; i++) {
        const x = rnd() * w, y = rnd() * h * 0.66, len = h * (0.05 + rnd() * 0.07);
        d += `<line x1="${x}" y1="${y}" x2="${x - len * 0.3}" y2="${y + len}" stroke="${light}0.3)" stroke-width="1.6" stroke-linecap="round"/>`;
      }
      return d;
    }
    case 'sun':
      return `<circle cx="${w * 0.76}" cy="${h * 0.27}" r="${h * 0.13}" fill="${light}0.3)"/>`;
    case 'moon':
      return `<circle cx="${w * 0.78}" cy="${h * 0.24}" r="${h * 0.1}" fill="${light}0.32)"/>`;
    case 'beams': {
      let d = '';
      for (let i = 0; i < 4; i++) {
        const x = w * (0.1 + i * 0.24);
        d += `<polygon points="${x},0 ${x + w * 0.1},0 ${x - w * 0.06},${h} ${x - w * 0.16},${h}" fill="${light}0.06)"/>`;
      }
      return d;
    }
    case 'arcs': {
      let d = '';
      for (let i = 0; i < 3; i++) {
        const r = h * (0.3 + i * 0.16);
        d += `<circle cx="${w * 0.5}" cy="${h * 0.95}" r="${r}" fill="none" stroke="${light}0.16)" stroke-width="2"/>`;
      }
      return d;
    }
    case 'house':
      return `<polygon points="${w * 0.5},${h * 0.24} ${w * 0.82},${h * 0.48} ${w * 0.18},${h * 0.48}" fill="${dark}0.3)"/>` +
             `<rect x="${w * 0.24}" y="${h * 0.46}" width="${w * 0.52}" height="${h * 0.2}" fill="${dark}0.34)"/>` +
             `<rect x="${w * 0.44}" y="${h * 0.55}" width="${w * 0.12}" height="${h * 0.11}" fill="${light}0.28)"/>`;
    case 'containers': {
      let d = '';
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 5; c++) {
          const bw = w * 0.17, bh = h * 0.1;
          d += `<rect x="${w * 0.04 + c * (bw + w * 0.02)}" y="${h * 0.62 - (r + 1) * (bh + h * 0.015)}" width="${bw}" height="${bh}" rx="1.5" fill="${(r + c) % 2 ? light + '0.16)' : dark + '0.28)'}"/>`;
        }
      }
      return d;
    }
    case 'grid': {
      let d = '';
      for (let i = 1; i < 8; i++) {
        d += `<line x1="${(w / 8) * i}" y1="0" x2="${(w / 8) * i}" y2="${h}" stroke="${light}0.1)" stroke-width="1"/>`;
      }
      for (let i = 1; i < 6; i++) {
        d += `<line x1="0" y1="${(h / 6) * i}" x2="${w}" y2="${(h / 6) * i}" stroke="${light}0.1)" stroke-width="1"/>`;
      }
      return d;
    }
    case 'lens':
      return `<circle cx="${w * 0.5}" cy="${h * 0.46}" r="${h * 0.2}" fill="none" stroke="${light}0.34)" stroke-width="3"/>` +
             `<circle cx="${w * 0.5}" cy="${h * 0.46}" r="${h * 0.08}" fill="${light}0.26)"/>`;
    case 'waveform': {
      let d = '';
      const bars = 22;
      for (let i = 0; i < bars; i++) {
        const bh = h * (0.08 + Math.abs(Math.sin(i * 0.9)) * 0.34);
        d += `<rect x="${(w / bars) * i + 2}" y="${h * 0.5 - bh / 2}" width="${w / bars - 4}" height="${bh}" rx="2" fill="${light}0.26)"/>`;
      }
      return d;
    }
    case 'circlemic':
      return `<circle cx="${w * 0.5}" cy="${h * 0.5}" r="${h * 0.3}" fill="none" stroke="${light}0.18)" stroke-width="2"/>`;
    default:
      return '';
  }
}

function art(motif, seedKey, w = 360, h = 220) {
  const m = MOTIFS[motif] || MOTIFS.city;
  const rnd = seeded(seedKey + motif);
  const id = 'a' + Math.abs(Math.floor(rnd() * 1e9)).toString(36);
  const shapes = m.shapes.map((s) => shapeMarkup(s, rnd, w, h)).join('');
  return `<svg class="art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrative image" xmlns="http://www.w3.org/2000/svg">
<defs>
<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="${m.c1}"/><stop offset="100%" stop-color="${m.c2}"/>
</linearGradient>
<radialGradient id="v${id}" cx="0.5" cy="0.42" r="0.75">
<stop offset="55%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,0.42)"/>
</radialGradient>
<filter id="n${id}"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix type="saturate" values="0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#g${id})"/>
${shapes}
<rect width="${w}" height="${h}" fill="url(#v${id})"/>
<rect width="${w}" height="${h}" filter="url(#n${id})" opacity="0.07"/>
</svg>`;
}

module.exports.art = art;

/* ---------------------------------------------------------------------------
 * Stylesheet
 *
 * Page furniture is modelled on the current Mediahuis article template: slim
 * sticky masthead, scrollable section rail, accent kicker, serif headline,
 * standfirst, byline strip, full-bleed hero + caption, hairline-separated
 * related lists. The feed module inherits those same rules — that is the whole
 * point of True Native, so it is styled with the publisher's tokens rather than
 * with a widget skin of its own.
 * ------------------------------------------------------------------------- */

function css(brand, p, mode) {
  return `
:root {
  --bg: ${p.bg}; --surface: ${p.surface}; --band: ${p.band};
  --line: ${p.line}; --line-soft: ${p.lineSoft};
  --text: ${p.text}; --muted: ${p.textMuted}; --faint: ${p.textFaint};
  --accent: ${p.accent}; --accent-text: ${p.accentText}; --accent-soft: ${p.accentSoft};
  --header: ${p.header}; --header-text: ${p.headerText}; --header-line: ${p.headerLine};
  --chip: ${p.chip};
  --display: ${brand.fontDisplay};
  --ui: ${brand.fontUi};
  --logo: ${brand.fontLogo || brand.fontDisplay};
  --pad: 16px;
}

*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: var(--ui);
  background: ${p.stage};
  color: ${p.stageInk};
  min-height: 100vh;
  padding: 32px 16px 64px;
  -webkit-font-smoothing: antialiased;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; border: 0; background: none; cursor: pointer; color: inherit; }
svg.art { display: block; width: 100%; height: 100%; object-fit: cover; }

/* ---- stage furniture (outside the device; not part of the mock) ---- */
.stage { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.stage-head { text-align: center; max-width: 560px; }
.stage-head h1 {
  font-family: var(--ui); font-size: 15px; font-weight: 600;
  letter-spacing: 0.02em; margin: 0 0 4px;
}
.stage-head p { margin: 0; font-size: 12.5px; opacity: 0.72; line-height: 1.5; }
.stage-controls { display: flex; gap: 8px; align-items: center; }
.ctl {
  font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
  padding: 7px 13px; border-radius: 999px;
  border: 1px solid currentColor; opacity: 0.62;
}
.ctl:hover { opacity: 1; }
.legend {
  display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
  font-size: 11.5px; opacity: 0.7;
}
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.legend i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

/* ---- device ---- */
.phone {
  width: 393px; padding: 12px; border-radius: 54px;
  background: linear-gradient(160deg, #3a3a3c 0%, #1c1c1e 42%, #0a0a0a 100%);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.07), 0 28px 60px rgba(0,0,0,0.42);
  position: relative;
}
.screen {
  width: 369px; height: 800px; border-radius: 42px; overflow: hidden;
  background: var(--bg); position: relative;
}
.fullpage .screen { height: auto; }
.fullpage .scroll { overflow: visible; }
.scroll { height: 100%; overflow-y: auto; overflow-x: hidden; scrollbar-width: none; }
.scroll::-webkit-scrollbar { display: none; }
.island {
  position: absolute; top: 22px; left: 50%; transform: translateX(-50%);
  width: 108px; height: 30px; border-radius: 18px; background: #000; z-index: 60;
}
.fullpage .island { display: none; }
.home-bar {
  height: 22px; display: flex; align-items: center; justify-content: center;
  background: var(--header);
}
.home-bar::after {
  content: ''; width: 122px; height: 4px; border-radius: 4px;
  background: var(--header-text); opacity: 0.45;
}

/* ---- status bar ---- */
.status {
  height: 46px; padding: 14px 26px 0; display: flex; align-items: center;
  justify-content: space-between; background: var(--header); color: var(--header-text);
  font-size: 12.5px; font-weight: 600; letter-spacing: 0.01em;
  position: sticky; top: 0; z-index: 50;
}
.fullpage .status { position: static; }
.status .glyphs { display: flex; gap: 5px; align-items: center; opacity: 0.95; }
.status .bars { display: flex; gap: 1.5px; align-items: flex-end; }
.status .bars i { width: 3px; background: currentColor; border-radius: 1px; display: block; }
.status .batt {
  width: 22px; height: 11px; border: 1.2px solid currentColor; border-radius: 3px;
  padding: 1.5px; opacity: 0.9;
}
.status .batt span { display: block; height: 100%; width: 72%; background: currentColor; border-radius: 1px; }

/* ---- masthead ---- */
.masthead {
  position: sticky; top: 46px; z-index: 45;
  background: var(--header); color: var(--header-text);
  border-bottom: 1px solid var(--header-line);
}
.fullpage .masthead { position: static; }
.masthead-row {
  height: 52px; padding: 0 var(--pad);
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px;
}
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; }
.icon-btn svg { width: 19px; height: 19px; }
.masthead-left, .masthead-right { display: flex; align-items: center; gap: 10px; }
.masthead-right { justify-content: flex-end; }
.subscribe {
  background: var(--accent); color: var(--accent-text);
  font-size: 11.5px; font-weight: 700; letter-spacing: 0.03em;
  padding: 7px 13px; border-radius: 3px; white-space: nowrap;
}

.wordmark-serif {
  font-family: var(--display); font-weight: 700; font-size: 19px;
  letter-spacing: -0.015em; white-space: nowrap;
}
.wordmark-block {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--logo); font-weight: 700; font-size: 17px;
  letter-spacing: 0.06em; white-space: nowrap; text-transform: uppercase;
}
.wordmark-block .b1 { background: var(--accent); color: #fff; padding: 3px 6px 2px; border-radius: 2px; }
.wordmark-block .b2 { color: var(--header-text); }

/* ---- section rail ---- */
.rail {
  display: flex; gap: 18px; overflow-x: auto; scrollbar-width: none;
  padding: 0 var(--pad); background: var(--header); color: var(--header-text);
  border-bottom: 1px solid var(--header-line);
}
.rail::-webkit-scrollbar { display: none; }
.rail a {
  flex: 0 0 auto; font-size: 12.5px; font-weight: 600; letter-spacing: 0.01em;
  padding: 11px 0 9px; opacity: 0.72; border-bottom: 2.5px solid transparent;
  white-space: nowrap;
}
.rail a.on { opacity: 1; border-bottom-color: var(--accent); }

/* ---- article ---- */
.article { padding: 18px var(--pad) 0; background: var(--bg); }
.crumb {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent); display: flex; align-items: center; gap: 7px; margin-bottom: 10px;
}
.crumb .sep { color: var(--faint); font-weight: 400; letter-spacing: 0; }
.lock {
  display: inline-flex; align-items: center; gap: 4px;
  background: var(--accent); color: var(--accent-text);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em;
  padding: 3px 6px; border-radius: 2px;
}
h1.headline {
  font-family: var(--display); font-size: 25.5px; line-height: 1.16; font-weight: 700;
  letter-spacing: -0.016em; color: var(--text); margin: 0 0 12px;
}
.standfirst {
  font-family: var(--display); font-size: 16.5px; line-height: 1.48;
  color: var(--muted); margin: 0 0 16px; font-weight: 400;
}
.byline {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 0; border-top: 1px solid var(--line-soft); border-bottom: 1px solid var(--line-soft);
}
.avatar {
  width: 32px; height: 32px; border-radius: 50%; flex: 0 0 auto;
  background: var(--accent-soft); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.02em;
}
.byline .who { flex: 1; min-width: 0; }
.byline .name { font-size: 12.5px; font-weight: 700; color: var(--text); }
.byline .when { font-size: 11.5px; color: var(--faint); margin-top: 2px; }
.byline .share { display: flex; gap: 12px; color: var(--muted); }
.byline .share svg { width: 16px; height: 16px; }

figure.hero { margin: 16px calc(var(--pad) * -1) 0; }
figure.hero .frame { aspect-ratio: 3 / 2; overflow: hidden; background: var(--band); }
figure.hero figcaption {
  font-size: 11.5px; line-height: 1.45; color: var(--faint);
  padding: 8px var(--pad) 0; border-bottom: 1px solid var(--line-soft); padding-bottom: 12px;
}
.body { padding-top: 16px; }
.body p {
  font-family: var(--display); font-size: 17px; line-height: 1.62; color: var(--text);
  margin: 0 0 16px;
}
.pull {
  margin: 20px 0; padding: 2px 0 2px 16px; border-left: 3px solid var(--accent);
}
.pull q {
  font-family: var(--display); font-style: italic; font-size: 18.5px; line-height: 1.42;
  color: var(--text); quotes: none;
}
.pull .attr {
  display: block; margin-top: 8px; font-family: var(--ui);
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted);
}
.readmore {
  margin: 20px 0; padding: 12px 14px; background: var(--band);
  border-left: 3px solid var(--accent);
}
.readmore .lbl {
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--accent); display: block; margin-bottom: 5px;
}
.readmore .t { font-family: var(--display); font-size: 15px; line-height: 1.35; font-weight: 600; color: var(--text); }
.podstrip {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
  padding: 12px; background: var(--band); border: 1px solid var(--line-soft);
}
.podstrip .cover { width: 54px; height: 54px; flex: 0 0 auto; overflow: hidden; border-radius: 3px; }
.podstrip .lbl {
  font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent);
}
.podstrip .t { font-size: 13px; font-weight: 600; line-height: 1.32; color: var(--text); margin-top: 3px; }
.podstrip .m { font-size: 11px; color: var(--faint); margin-top: 3px; }
.podstrip .play {
  width: 30px; height: 30px; border-radius: 50%; flex: 0 0 auto;
  background: var(--accent); color: var(--accent-text);
  display: flex; align-items: center; justify-content: center;
}
.tags { display: flex; flex-wrap: wrap; gap: 7px; padding: 4px 0 20px; }
.tags a {
  font-size: 11.5px; font-weight: 600; color: var(--muted);
  background: var(--chip); border: 1px solid var(--line-soft);
  padding: 6px 10px; border-radius: 3px;
}
`;
}
module.exports.css = css;

/* ---------------------------------------------------------------------------
 * Feed stylesheet
 *
 * Sponsored and organic cards deliberately share geometry, type scale and
 * separators — the only difference is the label slot ("Sponsored · advertiser"
 * where an organic card carries its section kicker) and the disclosure icon.
 * ------------------------------------------------------------------------- */

function feedCss() {
  return `
.tn { border-top: 7px solid var(--band); margin-top: 4px; padding: 20px var(--pad) 4px; background: var(--bg); }
.tn-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.tn-head h2 {
  font-family: var(--display); font-size: 18px; font-weight: 700; letter-spacing: -0.012em;
  color: var(--text); margin: 0; position: relative; padding-left: 11px;
}
.tn-head h2::before {
  content: ''; position: absolute; left: 0; top: 3px; bottom: 3px; width: 3px; background: var(--accent);
}
.tn-attr { font-size: 10px; color: var(--faint); letter-spacing: 0.03em; white-space: nowrap; }

.card { display: block; padding: 15px 0; border-bottom: 1px solid var(--line-soft); }
.card:last-child { border-bottom: 0; }
.kick {
  display: flex; align-items: center; flex-wrap: wrap; gap: 2px 6px; margin-bottom: 6px;
  font-size: 10.5px; font-weight: 800; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--accent);
}
.kick.spon { color: var(--faint); font-weight: 700; font-size: 10px; letter-spacing: 0.06em; }
.kick.spon b { white-space: nowrap; }
.kick.spon b { color: var(--muted); font-weight: 700; }
.kick .i {
  width: 12px; height: 12px; border-radius: 50%; border: 1px solid currentColor;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 700; letter-spacing: 0; opacity: 0.8;
}
.ct { font-family: var(--display); font-weight: 600; color: var(--text); line-height: 1.28; letter-spacing: -0.006em; }
.cm { font-size: 11px; color: var(--faint); margin-top: 6px; }

.c-lead .shot { aspect-ratio: 3 / 2; overflow: hidden; margin: 0 calc(var(--pad) * -1) 11px; background: var(--band); }
.c-lead .ct { font-size: 19.5px; }

.c-row { display: grid; grid-template-columns: 1fr 108px; gap: 12px; align-items: start; }
.c-row .shot { aspect-ratio: 4 / 3; overflow: hidden; background: var(--band); border-radius: 2px; }
.c-row .ct { font-size: 15px; }

.c-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.c-grid .shot { aspect-ratio: 4 / 3; overflow: hidden; margin-bottom: 8px; background: var(--band); border-radius: 2px; }
.c-grid .ct { font-size: 14px; }

.c-cta .shot { aspect-ratio: 16 / 9; overflow: hidden; margin: 0 calc(var(--pad) * -1) 11px; background: var(--band); }
.c-cta .ct { font-size: 17px; }
.c-cta .pill {
  display: inline-block; margin-top: 11px; padding: 9px 18px; border-radius: 999px;
  background: var(--accent); color: var(--accent-text);
  font-family: var(--ui); font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em;
}
.tn-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 0 18px; font-size: 10.5px; color: var(--faint);
}
.tn-foot .more { font-weight: 700; color: var(--muted); letter-spacing: 0.04em; }

footer.site {
  background: var(--header); color: var(--header-text); padding: 22px var(--pad) 18px; margin-top: 4px;
}
footer.site .fm { font-family: var(--display); font-size: 15px; font-weight: 700; margin-bottom: 12px; opacity: 0.95; }
footer.site .links { display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 11.5px; opacity: 0.72; }
footer.site .legal { margin-top: 14px; font-size: 10.5px; opacity: 0.5; line-height: 1.5; }
`;
}
module.exports.feedCss = feedCss;

/* ------------------------------- components ------------------------------ */

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const ICON = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c1.6-3.6 4.4-5.4 8-5.4s6.4 1.8 8 5.4"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M12 15V3"/><path d="M8 7l4-4 4 4"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>',
};

function statusBar() {
  return `<div class="status">
  <span>09:41</span>
  <span class="glyphs">
    <span class="bars"><i style="height:5px"></i><i style="height:7px"></i><i style="height:9px"></i><i style="height:11px"></i></span>
    <svg viewBox="0 0 20 16" width="16" height="13" fill="currentColor"><path d="M10 13.4l2.2 2.2a.6.6 0 01-.85.85L10 15.1l-1.35 1.35a.6.6 0 01-.85-.85L10 13.4z"/><path d="M10 9.2c1.6 0 3.1.6 4.2 1.7l-1.2 1.2A4.3 4.3 0 0010 10.9a4.3 4.3 0 00-3 1.2l-1.2-1.2A6 6 0 0110 9.2z"/><path d="M10 4.8c2.8 0 5.4 1.1 7.3 2.9l-1.2 1.2A8.7 8.7 0 0010 6.5a8.7 8.7 0 00-6.1 2.4L2.7 7.7A10.4 10.4 0 0110 4.8z"/></svg>
    <span class="batt"><span></span></span>
  </span>
</div>`;
}

function masthead(brand) {
  const logo =
    brand.masthead === 'wordmark-block'
      ? `<span class="wordmark-block"><span class="b1">Crime</span><span class="b2">World</span></span>`
      : `<span class="wordmark-serif">${esc(brand.mastheadText)}</span>`;
  return `<header class="masthead">
  <div class="masthead-row">
    <div class="masthead-left">
      <button class="icon-btn" aria-label="Menu">${ICON.menu}</button>
      <button class="icon-btn" aria-label="Search">${ICON.search}</button>
    </div>
    ${logo}
    <div class="masthead-right">
      <button class="icon-btn" aria-label="My account">${ICON.user}</button>
      <a class="subscribe" href="#">${esc(brand.subscribeLabel)}</a>
    </div>
  </div>
  <nav class="rail">
    ${brand.nav.map((n) => `<a href="#" class="${n === brand.navActive ? 'on' : ''}">${esc(n)}</a>`).join('\n    ')}
  </nav>
</header>`;
}

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function articleBlock(brand) {
  const crumb = brand.breadcrumb
    .map((c) => `<span>${esc(c)}</span>`)
    .join('<span class="sep">›</span>');
  const premium = brand.premium ? `<span class="lock">SUBSCRIBER</span>` : '';
  const pod = brand.podcastStrip
    ? `<div class="podstrip">
      <div class="cover">${art('podcast', brand.slug + 'pod', 120, 120)}</div>
      <div style="flex:1;min-width:0">
        <span class="lbl">${esc(brand.podcastStrip.label)}</span>
        <div class="t">${esc(brand.podcastStrip.title)}</div>
        <div class="m">${esc(brand.podcastStrip.meta)}</div>
      </div>
      <span class="play">${ICON.play}</span>
    </div>`
    : '';

  return `<article class="article">
  <div class="crumb">${crumb}${premium}</div>
  <h1 class="headline">${esc(brand.headline)}</h1>
  <p class="standfirst">${esc(brand.standfirst)}</p>
  <div class="byline">
    <span class="avatar">${esc(initials(brand.byline))}</span>
    <span class="who">
      <span class="name">${esc(brand.byline)}</span>
      <span class="when">${esc(brand.timestamp)} · ${esc(brand.readTime)}</span>
    </span>
    <span class="share">
      <span class="icon-btn">${ICON.share}</span>
      <span class="icon-btn">${ICON.mail}</span>
      <span class="icon-btn">${ICON.bookmark}</span>
    </span>
  </div>
  <figure class="hero">
    <div class="frame">${art(brand.heroMotif, brand.slug + 'hero', 480, 320)}</div>
    <figcaption>${esc(brand.heroCaption)}</figcaption>
  </figure>
  <div class="body">
    ${brand.body.map((t) => `<p>${esc(t)}</p>`).join('\n    ')}
    <blockquote class="pull"><q>${esc(brand.pullquote)}</q><span class="attr">${esc(brand.pullquoteAttr)}</span></blockquote>
    ${brand.bodyAfter.map((t) => `<p>${esc(t)}</p>`).join('\n    ')}
    ${pod}
    <div class="readmore">
      <span class="lbl">Read more</span>
      <span class="t">${esc(brand.slug === 'crime-world'
        ? 'Judge warns social media users identifying teens charged over west Dublin attack'
        : 'PSNI renews appeal for dashcam footage after fatal Co Derry collision')}</span>
    </div>
  </div>
  <div class="tags">${brand.tags.map((t) => `<a href="#">${esc(t)}</a>`).join('')}</div>
</article>`;
}

/* The feed. Card geometry is shared; `sponsored` only swaps the label slot. */
function labelSlot(item) {
  if (item.advertiser) {
    return `<div class="kick spon"><span>Sponsored</span><span>·</span><b>${esc(item.advertiser)}</b><span class="i">i</span></div>`;
  }
  return `<div class="kick">${esc(item.kicker)}</div>`;
}

function feedCard(item, brand, idx) {
  const seed = brand.slug + idx;
  switch (item.type) {
    case 'lead':
      return `<a class="card c-lead" href="#">
    <div class="shot">${art(item.motif, seed, 480, 320)}</div>
    ${labelSlot(item)}
    <div class="ct">${esc(item.title)}</div>
    ${item.meta ? `<div class="cm">${esc(item.meta)}</div>` : ''}
  </a>`;
    case 'row':
    case 'sponsored-row':
      return `<a class="card c-row" href="#">
    <div>
      ${labelSlot(item)}
      <div class="ct">${esc(item.title)}</div>
      ${item.meta ? `<div class="cm">${esc(item.meta)}</div>` : ''}
    </div>
    <div class="shot">${art(item.motif, seed, 240, 180)}</div>
  </a>`;
    case 'grid':
      return `<div class="card c-grid">
    ${item.items
      .map(
        (g, i) => `<a href="#">
      <div class="shot">${art(g.motif, seed + 'g' + i, 240, 180)}</div>
      ${labelSlot(g)}
      <div class="ct">${esc(g.title)}</div>
    </a>`
      )
      .join('\n    ')}
  </div>`;
    case 'sponsored-cta':
      return `<a class="card c-cta" href="#">
    <div class="shot">${art(item.motif, seed, 480, 270)}</div>
    ${labelSlot(item)}
    <div class="ct">${esc(item.title)}</div>
    <span class="pill">${esc(item.cta)}</span>
  </a>`;
    default:
      return '';
  }
}

function feedBlock(brand) {
  return `<section class="tn">
  <div class="tn-head">
    <h2>${esc(brand.feedTitle)}</h2>
    <span class="tn-attr">${TABOOLA_NOTE}</span>
  </div>
  ${brand.feed.map((item, i) => feedCard(item, brand, i)).join('\n  ')}
  <div class="tn-foot">
    <span class="more">Load more stories</span>
    <span>Ads by Taboola · Sponsored links are marked</span>
  </div>
</section>`;
}

function footerBlock(brand) {
  const links = ['About us', 'Contact', 'Cookie policy', 'Privacy', 'Terms', 'Subscribe', 'Newsletters'];
  return `<footer class="site">
  <div class="fm">${esc(brand.name)}</div>
  <div class="links">${links.map((l) => `<a href="#">${esc(l)}</a>`).join('')}</div>
  <div class="legal">A Mediahuis website · © ${new Date().getFullYear()} ${esc(brand.name)}. Prototype for demonstration purposes.</div>
</footer>`;
}

/* --------------------------------- render -------------------------------- */

function render(brand, mode) {
  const p = brand.palettes[mode];
  const modeLabel = mode === 'dark' ? 'Dark mode' : 'Light mode';
  return `<!DOCTYPE html>
<html lang="en" data-brand="${brand.slug}" data-mode="${mode}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(brand.name)} — True Native prototype (${modeLabel})</title>
<meta name="description" content="Taboola True Native feed shown in the current ${esc(brand.name)} article template, ${modeLabel.toLowerCase()}." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?${brand.fonts}&display=swap" rel="stylesheet" />
<style>
/*
  ${brand.name} — Taboola True Native prototype (${modeLabel})
  Publisher ID ${brand.publisherId} · ${brand.host} · Mediahuis
  Modelled on: ${brand.sampleUrl}

  Built from the current Mediahuis article template so the feed is judged in the
  page it will actually live in. All imagery is inline SVG: the file is fully
  self-contained and renders identically offline.
*/
${css(brand, p, mode)}
${feedCss()}
</style>
</head>
<body>
<div class="stage" id="stage">
  <div class="stage-head">
    <h1>${esc(brand.name)} · True Native · ${modeLabel}</h1>
    <p>Publisher ID ${brand.publisherId}. The feed below the article is Taboola-served and rendered with ${esc(brand.name)}’s own type, colour and card rules.</p>
  </div>
  <div class="stage-controls">
    <button class="ctl" id="toggle">Show full page</button>
  </div>

  <div class="phone">
    <div class="island"></div>
    <div class="screen">
      <div class="scroll">
        ${statusBar()}
        ${masthead(brand)}
        ${articleBlock(brand)}
        ${feedBlock(brand)}
        ${footerBlock(brand)}
        <div class="home-bar"></div>
      </div>
    </div>
  </div>

  <div class="legend">
    <span><i style="background:${p.accent}"></i>Publisher accent ${p.accent}</span>
    <span><i style="background:${p.bg};border:1px solid ${p.line}"></i>Page ${p.bg}</span>
    <span>Organic and sponsored cards share identical geometry — only the label slot differs</span>
  </div>
</div>
<script>
  // Device view clips to an 800px screen like the real phone; full-page view
  // expands it so the whole article + feed can be captured in one screenshot.
  var stage = document.getElementById('stage');
  var btn = document.getElementById('toggle');
  // Open with #full to land straight in full-page view (handy for screenshots).
  if (location.hash === '#full') {
    stage.classList.add('fullpage');
    btn.textContent = 'Show device view';
  }
  btn.addEventListener('click', function () {
    var full = stage.classList.toggle('fullpage');
    btn.textContent = full ? 'Show device view' : 'Show full page';
  });
</script>
</body>
</html>
`;
}

/* ---------------------------------- main --------------------------------- */

function main() {
  const written = [];
  for (const brand of Object.values(BRANDS)) {
    const dir = path.join(OUT_ROOT, brand.slug);
    fs.mkdirSync(dir, { recursive: true });
    for (const mode of ['light', 'dark']) {
      const file = path.join(dir, `mobile-prototype-${mode}.html`);
      fs.writeFileSync(file, render(brand, mode), 'utf8');
      written.push(path.relative(path.join(__dirname, '..'), file));
    }
  }
  written.forEach((f) => console.log('wrote ' + f));
}

module.exports.render = render;

if (require.main === module) main();
