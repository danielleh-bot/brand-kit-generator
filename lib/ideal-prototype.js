// ============================================================
//  Lekker-style Before / Split / After ideal feed prototypes
// ============================================================

const { commonVisualTokens } = require('./publisher-properties');

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PUBLISHER_CONTENT = {
  'business-insider': {
    lang: 'en',
    articleTitle: 'Markets are bracing for a pivotal Fed decision this week',
    deck: 'Investors are positioning for volatility as rate-cut odds shift and earnings season accelerates.',
    nav: ['Markets', 'Tech', 'Strategy', 'Politics', 'Reviews'],
    sectionHeader: 'More From Business Insider',
    moreBtn: 'Show more',
    sponsoredLabel: 'Sponsored',
    organicMetaKey: 'kicker',
    cards: [
      { type: 'organic', title: 'Apple is preparing a major AI overhaul for the iPhone', source: 'businessinsider.com', meta: 'TECH' },
      { type: 'sponsored', title: 'These high-yield accounts are beating most savings rates', source: 'finance-partner.com' },
      { type: 'organic', title: 'Why this market rally may not last', source: 'businessinsider.com', meta: 'OPINION' },
      { type: 'sponsored', title: 'Compare business credit cards for 2026', source: 'cards-compare.com' },
      { type: 'organic', title: 'Inside the startup quietly powering enterprise AI', source: 'businessinsider.com', meta: 'EXCLUSIVE' },
      { type: 'organic', title: 'Remote work is changing again — here is the new playbook', source: 'businessinsider.com', meta: 'STRATEGY' },
    ],
  },
  'fox-sports': {
    lang: 'en',
    articleTitle: 'NFL Draft: Top prospects to watch as Round 1 opens',
    deck: 'Scouts are split on the top of the board — here are the names that could hear their names called early.',
    nav: ['NFL', 'MLB', 'NBA', 'Soccer', 'College'],
    sectionHeader: 'More From FOX Sports',
    moreBtn: 'Show more',
    sponsoredLabel: 'Sponsored',
    organicMetaKey: 'score',
    cards: [
      { type: 'organic', title: 'Chiefs vs Bills — late drama in a AFC showdown', source: 'foxsports.com', meta: 'LIVE · KC 24 BUF 21' },
      { type: 'sponsored', title: 'Stream every game live this season', source: 'stream-sports.com' },
      { type: 'organic', title: 'MLB Midseason Awards: MVP Favorites at the Halfway Mark', source: 'foxsports.com', meta: 'MLB' },
      { type: 'sponsored', title: 'Fantasy football cheat sheet for busy managers', source: 'fantasy-edge.com' },
      { type: 'organic', title: 'College football transfer portal winners so far', source: 'foxsports.com', meta: 'CFB' },
      { type: 'organic', title: 'NASCAR: Pit strategy that decided Sunday’s race', source: 'foxsports.com', meta: 'NASCAR' },
    ],
  },
  'weather-channel': {
    lang: 'en',
    articleTitle: 'Here\'s why this weekend\'s storm risk is rising',
    deck: 'A strengthening system could bring heavy rain and localized severe weather across multiple states.',
    nav: ['Forecast', 'Radar', 'Severe', 'Maps', 'News'],
    sectionHeader: 'More From The Weather Channel',
    moreBtn: 'Show more',
    sponsoredLabel: 'Sponsored',
    organicMetaKey: 'alert',
    cards: [
      { type: 'organic', title: 'Tornado Watch expands across the Midwest tonight', source: 'weather.com', meta: 'SEVERE · Until 10 PM' },
      { type: 'sponsored', title: 'Backup power options before the next outage', source: 'home-power.com' },
      { type: 'organic', title: 'Here\'s what to expect from this weekend\'s cold front', source: 'weather.com', meta: 'FORECAST' },
      { type: 'sponsored', title: 'Travel insurance for storm season', source: 'travel-safe.com' },
      { type: 'organic', title: 'How humidity will shape next week\'s heat', source: 'weather.com', meta: 'EXPLAINER' },
      { type: 'organic', title: 'Tropical update: watching a disturbance in the Atlantic', source: 'weather.com', meta: 'TROPICAL' },
    ],
  },
};

function renderBeforeCards(content) {
  return content.cards
    .map((c) => {
      const sponsor = c.type === 'sponsored' ? `<div class="fc-sponsor">${esc(content.sponsoredLabel)}</div>` : '';
      return `<a class="fc" href="#">
        <div class="fc-img"></div>
        <div class="fc-body">
          <div class="fc-title">${esc(c.title)}</div>
          <div class="fc-source">${esc(c.source)}</div>
          ${sponsor}
        </div>
      </a>`;
    })
    .join('\n');
}

function renderAfterCards(content, t) {
  return content.cards
    .map((c) => {
      if (c.type === 'sponsored') {
        return `<a class="fc" href="#">
          <div class="fc-img" style="border-radius:${esc(t.radius)}"></div>
          <div class="fc-body">
            <div class="fc-title" style="font-family:${esc(t.font)};color:${esc(t.text)}">${esc(c.title)}</div>
            <div class="fc-source" style="color:${esc(t.muted)}">${esc(c.source)}</div>
            <div class="fc-sponsor branded">${esc(content.sponsoredLabel)}</div>
          </div>
        </a>`;
      }
      return `<a class="fc" href="#">
        <div class="fc-img" style="border-radius:${esc(t.radius)}"></div>
        <div class="fc-body">
          <div class="fc-kicker" style="color:${esc(t.primary)}">${esc(c.meta || '')}</div>
          <div class="fc-title" style="font-family:${esc(t.font)};color:${esc(t.text)}">${esc(c.title)}</div>
          <div class="fc-source" style="color:${esc(t.muted)}">${esc(c.source)}</div>
        </div>
      </a>`;
    })
    .join('\n');
}

function renderIdealPrototypeHtml(slug, brandKit) {
  const content = PUBLISHER_CONTENT[slug];
  if (!content) {
    throw new Error(`No ideal prototype content for slug: ${slug}`);
  }
  const t = commonVisualTokens(brandKit);
  const headerBg =
    brandKit?.layout_patterns?.header?.background_color ||
    brandKit?.colors?.backgrounds?.dark?.hex ||
    brandKit?.colors?.secondary?.hex ||
    '#111111';
  const nav = content.nav.map((n, i) => `<a href="#" class="${i === 0 ? 'active' : ''}">${esc(n)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="${esc(content.lang)}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(t.name)} — Taboola Feed: Before &amp; After Brand Kit</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', Arial, sans-serif; background: #eee; color: #333; line-height: 1.5; }
  .proto-bar {
    position: sticky; top: 0; z-index: 200; background: #111; color: #fff;
    display: flex; align-items: center; justify-content: center; gap: 16px; height: 44px; font-size: 13px;
  }
  .proto-bar .label { opacity: 0.5; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
  .toggle-group { display: flex; background: rgba(255,255,255,0.1); border-radius: 9999px; overflow: hidden; }
  .toggle-btn {
    padding: 5px 18px; font-family: inherit; font-size: 12px; font-weight: 600; border: none; cursor: pointer;
    background: transparent; color: rgba(255,255,255,0.5);
  }
  .toggle-btn.active { background: ${esc(t.primary)}; color: #fff; border-radius: 9999px; }
  .split-view { display: flex; max-width: 1440px; margin: 0 auto; }
  .panel { flex: 1; overflow-y: auto; }
  .panel-label {
    position: sticky; top: 44px; z-index: 50; text-align: center; padding: 8px 16px;
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em;
  }
  .panel-before .panel-label { background: #c0392b; color: #fff; }
  .panel-after .panel-label { background: ${esc(t.primary)}; color: #fff; }
  .divider { width: 3px; background: linear-gradient(180deg, ${esc(t.primary)}, #999); flex-shrink: 0; }
  body.view-before .panel-after, body.view-before .divider { display: none; }
  body.view-after .panel-before, body.view-after .divider { display: none; }
  body.view-before .panel-before, body.view-after .panel-after { max-width: 800px; margin: 0 auto; }
  .site-page { background: #fff; min-height: 100vh; }
  .site-header { background: ${esc(headerBg)}; color: #fff; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
  .site-logo { font-weight: 800; letter-spacing: 0.04em; font-size: 18px; }
  .site-nav { display: flex; gap: 14px; padding: 10px 24px; border-bottom: 1px solid #eee; font-size: 13px; font-weight: 600; overflow-x: auto; }
  .site-nav a { color: #555; text-decoration: none; white-space: nowrap; }
  .site-nav a.active { color: ${esc(t.primary)}; }
  .article-wrap { max-width: 720px; margin: 0 auto; padding: 28px 24px 8px; }
  .article-title { font-size: 32px; line-height: 1.15; font-weight: 800; color: ${esc(t.text)}; margin-bottom: 10px; font-family: ${esc(t.font)}, 'DM Sans', sans-serif; }
  .article-deck { color: #555; font-size: 16px; margin-bottom: 18px; }
  .article-hero { width: 100%; aspect-ratio: 16/9; background: linear-gradient(135deg, #bbb, #777); border-radius: 0; margin-bottom: 16px; }
  .feed-wrap { max-width: 720px; margin: 0 auto; padding: 12px 24px 48px; }
  .feed-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 8px; border-bottom: 2px solid #e5e5e5; }
  .panel-after .feed-header { border-bottom-color: ${esc(t.primary)}; }
  .feed-header h3 { font-size: 13px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.04em; }
  .panel-after .feed-header h3 { font-size: 16px; color: ${esc(t.primary)}; text-transform: none; letter-spacing: 0; font-family: ${esc(t.font)}, 'DM Sans', sans-serif; }
  .tbl-logo { font-size: 11px; color: #bbb; }
  .fc { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; text-decoration: none; color: inherit; }
  .fc-img { width: 148px; height: 100px; flex-shrink: 0; object-fit: cover; border-radius: 3px; background: linear-gradient(135deg, #d0d0d0, #9a9a9a); }
  .panel-before .fc-title { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: #333; line-height: 1.3; margin-bottom: 5px; }
  .panel-before .fc-source { font-family: Arial, sans-serif; font-size: 11px; color: #aaa; }
  .panel-before .fc-sponsor { font-family: Arial, sans-serif; font-size: 10px; color: #ccc; margin-top: 3px; }
  .panel-after .fc-title { font-size: 16px; font-weight: 700; line-height: 1.25; margin-bottom: 4px; }
  .panel-after .fc-source { font-size: 12px; }
  .panel-after .fc-kicker { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 4px; }
  .panel-after .fc-sponsor.branded {
    display: inline-block; margin-top: 6px; font-size: 10px; font-weight: 700;
    background: ${esc(t.primary)}; color: #fff; padding: 2px 8px; border-radius: ${esc(t.btnRadius)};
  }
  .feed-more-btn {
    display: block; margin: 20px auto 0; font-family: Arial, sans-serif; background: #f5f5f5; color: #777;
    border: 1px solid #ddd; padding: 8px 36px; font-size: 13px; border-radius: 3px; cursor: pointer;
  }
  .panel-after .feed-more-btn {
    background: ${esc(t.primary)}; color: #fff; border: none; border-radius: ${esc(t.btnRadius)};
    font-family: ${esc(t.font)}, 'DM Sans', sans-serif; font-weight: 700;
  }
  .site-footer { border-top: 1px solid #eee; padding: 24px; text-align: center; font-size: 12px; color: #888; }
  .unique-callout {
    margin: 8px 24px 0; max-width: 720px; margin-left: auto; margin-right: auto;
    font-size: 11px; color: #b42318; background: #fdecea; padding: 8px 10px; border-radius: 6px;
  }
  .panel-before .unique-callout { display: none; }
</style>
</head>
<body class="view-split">
<div class="proto-bar">
  <span class="label">${esc(t.name)} Feed Prototype</span>
  <div class="toggle-group">
    <button class="toggle-btn" onclick="setView('before')">Before</button>
    <button class="toggle-btn active" onclick="setView('split')">Split</button>
    <button class="toggle-btn" onclick="setView('after')">After</button>
  </div>
  <a href="./visual-brand-kit.html" style="color:#fff;font-size:11px;opacity:0.7;margin-left:12px">Visual brand kit ↗</a>
</div>

<div class="split-view">
  <div class="panel panel-before">
    <div class="panel-label">Before — Generic Default Feed</div>
    <div class="site-page">
      <div class="site-header"><div class="site-logo">${esc(t.name)}</div></div>
      <nav class="site-nav">${nav}</nav>
      <div class="article-wrap">
        <h1 class="article-title">${esc(content.articleTitle)}</h1>
        <p class="article-deck">${esc(content.deck)}</p>
        <div class="article-hero"></div>
      </div>
      <div class="feed-wrap">
        <div class="feed-header"><h3>You May Like</h3><span class="tbl-logo">by Taboola</span></div>
        ${renderBeforeCards(content)}
        <button class="feed-more-btn">Show more</button>
      </div>
      <div class="site-footer">© Generic Taboola defaults — Arial / #333 / 6px radius</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="panel panel-after">
    <div class="panel-label">After — Brand Kit Applied (Ideal Native)</div>
    <div class="site-page">
      <div class="site-header"><div class="site-logo">${esc(t.name)}</div></div>
      <nav class="site-nav">${nav}</nav>
      <div class="article-wrap">
        <h1 class="article-title">${esc(content.articleTitle)}</h1>
        <p class="article-deck">${esc(content.deck)}</p>
        <div class="article-hero" style="border-radius:${esc(t.radius)}"></div>
      </div>
      <div class="unique-callout">Ideal After includes unique card meta (kickers / LIVE / alerts) that today’s default thumbs mode cannot paint via loader alone — see visual-brand-kit.html.</div>
      <div class="feed-wrap">
        <div class="feed-header"><h3>${esc(content.sectionHeader)}</h3><span class="tbl-logo">recommended by Taboola</span></div>
        ${renderAfterCards(content, t)}
        <button class="feed-more-btn">${esc(content.moreBtn)}</button>
      </div>
      <div class="site-footer">Ideal native experience from ${esc(t.name)} brand kit — not all properties ship via MVP loader</div>
    </div>
  </div>
</div>

<script>
function setView(mode) {
  document.body.className = 'view-' + mode;
  document.querySelectorAll('.toggle-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === mode);
  });
}
</script>
</body>
</html>`;
}

module.exports = { renderIdealPrototypeHtml, PUBLISHER_CONTENT };
