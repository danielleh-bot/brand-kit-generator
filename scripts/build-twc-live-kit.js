#!/usr/bin/env node
/**
 * Rebuild Weather Channel deliverables from live crawl + captures.
 * Mirrors the BI live-kit structure (designer-style domains × live feed).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'output', 'weather-channel');
const CAP = path.join(DIR, 'captures');

function readJson(p, fallback = null) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function patchBrandKit() {
  const kit = readJson(path.join(DIR, 'brand-kit.json'));
  const cssVars = readJson(path.join(CAP, 'css-vars.json'), { computed: {}, scraped: {} });
  const meta = readJson(path.join(CAP, 'capture-meta.json'), {});
  const article = readJson(path.join(CAP, 'article-content.json'), {});
  const feed = readJson(path.join(CAP, 'feed-dom.json'), { cards: [] });
  const roles = readJson(path.join(CAP, 'role-styles.json'), {});

  const linkBlue = kit.colors?.secondary?.hex || kit.colors?.accents?.info_blue?.hex || '#3A61CC';
  const textPrimary = roles.h1?.color?.includes('rgb')
    ? '#252422'
    : (kit.colors?.text?.primary?.hex || '#252422');
  const textMeta = cssVars.scraped?.['--dd-text-meta-color'] || '#8c8c8c';
  const font = roles.h1?.fontFamily?.split(',')[0]?.replace(/"/g, '').trim() || kit.fonts?.primary?.family || 'Inter';

  kit.colors = kit.colors || {};
  kit.colors.primary = {
    name: 'TWC Link / Accent Blue',
    hex: linkBlue,
    usage: ['Links', 'CTAs', 'Interactive accents'],
    source: 'extracted',
  };
  kit.colors.primary_hover = {
    hex: '#2a4fa8',
    usage: ['Link hover'],
    source: 'derived',
  };
  kit.colors.masthead = {
    hex: '#0C2340',
    name: 'TWC Navy',
    usage: ['Header / dark chrome'],
    source: 'brand-reference+live',
  };
  kit.colors.text = kit.colors.text || {};
  kit.colors.text.primary = { hex: textPrimary, source: 'extracted', usage: ['Headlines'] };
  kit.colors.text.secondary = { hex: textMeta, source: 'extracted', usage: ['Meta / labels'] };
  kit.colors.backgrounds = kit.colors.backgrounds || {};
  kit.colors.backgrounds.base = { hex: cssVars.scraped?.['--background'] || '#FFFFFF', source: 'extracted' };
  kit.colors.backgrounds.section = { hex: '#f5f7fa', source: 'derived' };
  kit.colors.css_variables = { scraped: cssVars.scraped || {}, computed: cssVars.computed || {} };

  kit.fonts = kit.fonts || {};
  kit.fonts.primary = {
    family: font,
    fallbacks: ['Arial', 'sans-serif'],
    weights: { bold: 800, regular: 400 },
    usage: 'Headlines, body, navigation',
    source: 'extracted',
  };

  kit.photo_style = kit.photo_style || {};
  kit.photo_style.thumbnail_format = {
    aspect_ratio: kit.photo_style?.thumbnail_format?.aspect_ratio || '16:9',
    border_radius: '0px',
    source: 'extracted',
    note: 'Live crawl: sharp corners on thumbs',
  };

  const modes = feed.modes || [
    'organic-thumbs-feed-01-c-new',
    'thumbs-feed-01-b-new',
    'above-the-feed-premium-card-fp-delta',
  ];
  // Prefer the below-content thumbs mode from the live capture request / root class.
  const primaryMode =
    meta.requested?.mode ||
    modes.find((m) => /organic-thumbs-feed|thumbs-feed/i.test(m)) ||
    feed.mode ||
    'organic-thumbs-feed-01-c-new';
  const modesOrdered = [primaryMode, ...modes.filter((m) => m !== primaryMode)];

  kit.taboola = {
    publisher_id: meta.taboola?.publisherSlug || meta.requested?.publisher || 'theweatherchannel',
    loader_url:
      meta.taboola?.loaderUrl || 'https://cdn.taboola.com/libtrc/theweatherchannel/loader.js',
    mode: primaryMode,
    modes_in_use: modesOrdered,
    placement: feed.placement || meta.requested?.placement || 'Below Content Thumbnails',
    container: feed.container || meta.requested?.container || 'taboola-below-content-thumbnails-article',
    feed_label: feed.header || 'You May Like',
    capture_note: 'Feed captured live from weather.com article page.',
  };

  // Keep feed-dom primary mode aligned with the below-content capture.
  feed.mode = primaryMode;
  feed.modes = modesOrdered;
  feed.publisher = kit.taboola.publisher_id;
  fs.writeFileSync(path.join(CAP, 'feed-dom.json'), JSON.stringify(feed, null, 2) + '\n');

  kit.content = {
    title: article.title || kit.content?.title,
    deck: article.deck || kit.content?.deck,
    heroImage: article.hero || kit.content?.heroImage,
    paragraphs: article.paragraphs || kit.content?.paragraphs,
  };

  kit.brand_voice = {
    ...(kit.brand_voice || {}),
    language: 'en',
    headline_style: {
      format: 'sentence case / title case news',
      case: 'title case',
      pattern: roles.h1?.text || article.title,
    },
    content_labels: {
      ...(kit.brand_voice?.content_labels || {}),
      severe_weather: true,
      forecast: true,
      video: true,
      sponsored: true,
    },
  };

  kit.metadata = {
    ...(kit.metadata || {}),
    source_url: meta.articleUrl || kit.metadata?.source_url,
    home_url: meta.homeUrl || 'https://weather.com/',
    analysis_date: new Date().toISOString().slice(0, 10),
    capture_at: meta.capturedAt,
    baseline: 'live-publisher-and-taboola-feed',
  };

  fs.writeFileSync(path.join(DIR, 'brand-kit.json'), JSON.stringify(kit, null, 2) + '\n');
  return { kit, feed, article, meta, cssVars, roles };
}

function writeLoader(kit) {
  const primary = kit.colors.primary.hex;
  const hover = kit.colors.primary_hover?.hex || '#2a4fa8';
  const navy = kit.colors.masthead?.hex || '#0C2340';
  const text = kit.colors.text?.primary?.hex || '#252422';
  const muted = kit.colors.text?.secondary?.hex || '#8c8c8c';
  const modes = (kit.taboola.modes_in_use || []).map((m) => `    "${m}"`).join(',\n');

  const src = `/**
 * The Weather Channel Taboola Feed Loader — Brand Kit Integration
 * =============================================================
 * Publisher: theweatherchannel
 *
 * Brand Kit Source: weather-channel/brand-kit.json (LIVE crawl)
 * LIVE BASELINE: publisher theweatherchannel · mode ${kit.taboola.mode} ·
 * placement ${kit.taboola.placement} · container ${kit.taboola.container}
 */

(function () {
  "use strict";

  var BRAND = {
    linkBlue:         "${primary}",
    linkBlueDark:     "${hover}",
    navy:             "${navy}",
    nearBlack:        "${text}",
    darkGray:         "#676767",
    mediumGray:       "${muted}",
    white:            "#FFFFFF",
    offWhite:         "#f5f7fa",
    lightGray:        "#e5e7eb",

    fontPrimary:      "'Inter', Arial, sans-serif",
    fontFallback:     "'Inter', Arial, sans-serif",

    sectionHeadSize:  "20px",
    titleCardSize:    "18px",
    titleCardLineH:   "24px",
    bodySize:         "16px",
    bodyLineH:        "24px",
    metaSize:         "12px",
    buttonSize:       "13px",

    cardGap:          "16px",
    cardPadding:      "12px",
    cardRadius:       "0px",
    imageRadius:      "0px",
    buttonRadius:     "4px",

    publisherName:    "theweatherchannel"
  };

  window._taboola = window._taboola || [];
  window.TRC = window.TRC || {};

  TRC.perfConfOverride = {
    logTimer: 50000,
    logLength: 5,
    traffic: 50,
    measureEnable: true,
    measureTimeToSend: 10000,
    measureInterval: 10000,
    disableRawDataSend: true
  };

  _taboola.push({
    overrideConfig: {
      global: {
        "exclude-ms3": [],
        "is-ms3": "true",
        "perf_opt_fader": "tbt"
      },
      systemFlags: {
        loaderType: "trecs-3017-yielding_ctrl",
        experimentID: 29860
      }
    }
  });

  var brandCSS = [
    ".tbl-feed-card {",
    "  background-color: " + BRAND.white + ";",
    "  border: none;",
    "  border-bottom: 1px solid " + BRAND.lightGray + ";",
    "  border-radius: " + BRAND.cardRadius + ";",
    "  margin-bottom: " + BRAND.cardGap + ";",
    "  padding: " + BRAND.cardPadding + " 0;",
    "  font-family: " + BRAND.fontPrimary + ";",
    "}",

    ".tbl-feed-header {",
    "  margin-top: 28px;",
    "  margin-bottom: 14px;",
    "  font-family: " + BRAND.fontPrimary + ";",
    "}",

    ".tbl-feed-header-text,",
    ".trc_rbox_header .trcBoxHeader,",
    ".trc_rbox_header span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.sectionHeadSize + " !important;",
    "  font-weight: 800 !important;",
    "  color: " + BRAND.nearBlack + " !important;",
    "  letter-spacing: -0.01em;",
    "}",

    ".video-title,",
    ".thumbBlock + .video-label-box .video-title,",
    ".videoCube .video-label-box .video-title {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.titleCardSize + " !important;",
    "  line-height: " + BRAND.titleCardLineH + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.nearBlack + " !important;",
    "}",

    ".videoCube:hover .video-label-box .video-title {",
    "  color: " + BRAND.linkBlue + " !important;",
    "  text-decoration: underline;",
    "  text-decoration-color: " + BRAND.linkBlue + ";",
    "}",

    ".branding,",
    ".video-label-box .branding,",
    ".logoDiv a span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.metaSize + " !important;",
    "  font-weight: 600 !important;",
    "  color: " + BRAND.mediumGray + " !important;",
    "  text-transform: none;",
    "}",

    ".thumbBlock img,",
    ".trc_img,",
    ".thumbBlock {",
    "  border-radius: " + BRAND.imageRadius + " !important;",
    "}",

    ".trc_sponsored_overlay,",
    ".trc-pre-label {",
    "  background-color: " + BRAND.navy + " !important;",
    "  color: " + BRAND.white + " !important;",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 11px !important;",
    "  font-weight: 700 !important;",
    "}",

    ".tbl-feed-more-btn,",
    ".show-more-btn {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.buttonSize + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.white + " !important;",
    "  background-color: " + BRAND.linkBlue + " !important;",
    "  border: none !important;",
    "  border-radius: " + BRAND.buttonRadius + " !important;",
    "  padding: 12px 20px !important;",
    "}",

    ".tbl-feed-more-btn:hover,",
    ".show-more-btn:hover {",
    "  background-color: " + BRAND.linkBlueDark + " !important;",
    "}"
  ].join("\\n");

  var styleEl = document.createElement("style");
  styleEl.id = "twc-brand-kit-overrides";
  styleEl.textContent = brandCSS;
  (document.head || document.documentElement).appendChild(styleEl);

  var modeStyleOverrides = {
    ".video-title":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.titleCardSize + ";" +
      "line-height:" + BRAND.titleCardLineH + ";" +
      "font-weight:700;" +
      "color:" + BRAND.nearBlack + ";",

    ".branding":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.metaSize + ";" +
      "color:" + BRAND.mediumGray + ";",

    ".thumbBlock img":
      "border-radius:" + BRAND.imageRadius + ";",

    ".tbl-feed-more-btn":
      "background-color:" + BRAND.linkBlue + ";" +
      "color:" + BRAND.white + ";" +
      "border-radius:" + BRAND.buttonRadius + ";"
  };

  var targetModes = [
${modes},
    "organic-thumbs-feed-01-c-new",
    "thumbs-feed-01-b-new",
    "above-the-feed-premium-card-fp-delta",
    "organic-thumbs-feed-01-delta",
    "organic-thumbnails-feed-stream",
    "exchange-thumbnails-feed-with-header"
  ];

  var modeOverrideConfig = {};
  targetModes.forEach(function (modeName) {
    modeOverrideConfig[modeName] = { "__style__": modeStyleOverrides };
  });

  _taboola.push({ overrideConfig: modeOverrideConfig });

  try {
    (new Image()).src =
      "https://cdn.taboola.com/libtrc/tr5?abgroup=trecs-3017-yielding_ctrl&pub=" +
      BRAND.publisherName;
  } catch (e) { /* silent */ }

  (function loadTRC() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "//cdn.taboola.com/libtrc/" + BRAND.publisherName + "/loader.js";
    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  })();

})();
`;

  fs.writeFileSync(path.join(DIR, 'loader.js'), src);
}

function buildFeedPrototype({ kit, feed, article }) {
  const primary = kit.colors.primary.hex;
  const text = kit.colors.text.primary.hex;
  const muted = kit.colors.text.secondary.hex;
  const font = `'${kit.fonts.primary.family}', Arial, sans-serif`;
  const title = article.title || 'The Weather Channel article';
  const deck = article.deck || '';
  const hero = article.hero || '';
  const cards = (feed.cards || []).filter((c) => c.title && c.title.length > 12);

  const afterCards = cards
    .map((c) => {
      const thumb = c.thumbnail
        ? `<img class="trc_img" src="${esc(c.thumbnail)}" alt="">`
        : `<div class="trc_img placeholder"></div>`;
      const brand = c.branding ? `<div class="branding">${esc(c.branding)}</div>` : '';
      const sponsored = c.sponsored ? `<div class="trc_sponsored_overlay">Sponsored</div>` : '';
      return `<div class="tbl-feed-card videoCube ${c.sponsored ? 'trc-content-sponsored' : ''}">
        <a class="item-label-href" href="${esc(c.href || '#')}">
          <div class="thumbBlock">${thumb}${sponsored}</div>
          <div class="video-label-box">
            <div class="video-title">${esc(c.title)}</div>
            ${brand}
          </div>
        </a>
      </div>`;
    })
    .join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Weather Channel — Live feed baseline (Before / After)</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${font};background:#e8e8e8;color:${text}}
  .proto-bar{position:sticky;top:0;z-index:50;background:#0C2340;color:#fff;display:flex;gap:12px;align-items:center;justify-content:center;height:48px;font-size:12px}
  .proto-bar a{color:#9cf}
  .toggle-group{display:flex;background:#1a3a5c;border-radius:999px;overflow:hidden}
  .toggle-btn{border:0;background:transparent;color:#9ab;padding:6px 14px;font:inherit;font-weight:700;cursor:pointer}
  .toggle-btn.active{background:${primary};color:#fff;border-radius:999px}
  .split{display:flex;max-width:1480px;margin:0 auto}
  .panel{flex:1;background:#fff;min-height:100vh}
  .panel-label{position:sticky;top:48px;z-index:40;text-align:center;padding:8px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
  .panel-before .panel-label{background:#b42318;color:#fff}
  .panel-after .panel-label{background:${primary};color:#fff}
  .divider{width:3px;background:linear-gradient(${primary},#0C2340)}
  body.view-before .panel-after, body.view-before .divider{display:none}
  body.view-after .panel-before, body.view-after .divider{display:none}
  body.view-before .panel-before, body.view-after .panel-after{max-width:820px;margin:0 auto}
  .chrome img{width:100%;display:block}
  .article{max-width:720px;margin:0 auto;padding:28px 24px 12px}
  .article h1{font-size:34px;line-height:1.15;font-weight:800;margin-bottom:12px}
  .article .deck{color:${muted};font-size:16px;margin-bottom:16px}
  .article .hero{width:100%;aspect-ratio:16/9;object-fit:cover;background:#eee;margin-bottom:12px}
  .provenance{max-width:720px;margin:0 auto 12px;padding:10px 12px;font-size:12px;background:#f5f5f5;border-left:3px solid #666}
  .panel-after .provenance{border-left-color:${primary};background:#eef4ff}
  .live-feed-shot{max-width:720px;margin:0 auto 24px;padding:0 16px}
  .live-feed-shot img{width:100%;border:1px solid #ddd;display:block}
  .feed{max-width:720px;margin:0 auto;padding:8px 16px 48px}
  .tbl-feed-header{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e5e5;padding-bottom:8px;margin-bottom:12px}
  .panel-after .tbl-feed-header{border-bottom:2px solid ${primary}}
  .tbl-feed-header-text{font-size:13px;font-weight:700;color:#777;text-transform:uppercase}
  .panel-after .tbl-feed-header-text{font-size:16px;color:${text};text-transform:none}
  .tbl-feed-card{display:flex;gap:14px;padding:14px 0;border-bottom:1px solid #f0f0f0}
  .tbl-feed-card a{display:flex;gap:14px;text-decoration:none;color:inherit;width:100%}
  .thumbBlock{width:148px;flex-shrink:0;position:relative}
  .trc_img,.placeholder{width:148px;height:84px;object-fit:cover;background:linear-gradient(135deg,#ddd,#bbb);display:block;border-radius:0}
  .video-title{font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#333;line-height:1.3;margin-bottom:6px}
  .panel-after .video-title{font-family:${font};font-size:16px;font-weight:700;color:${text};line-height:1.3}
  .panel-after .tbl-feed-card:hover .video-title{color:${primary};text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
  .branding{font-family:Arial,sans-serif;font-size:11px;color:#aaa}
  .panel-after .branding{font-family:${font};color:${muted};font-weight:600}
  .trc_sponsored_overlay{position:absolute;left:6px;bottom:6px;background:#f3f4f6;color:#666;font-size:10px;padding:2px 6px}
  .panel-after .trc_sponsored_overlay{background:#0C2340;color:#fff;font-family:${font};font-weight:700;text-transform:uppercase}
  .tbl-feed-more-btn{display:block;margin:20px auto 0;border:1px solid #ddd;background:#f5f5f5;color:#777;padding:10px 28px;font-size:13px;cursor:pointer}
  .panel-after .tbl-feed-more-btn{background:${primary};color:#fff;border:0;border-radius:4px;font-family:${font};font-weight:700}
  .meta{max-width:720px;margin:0 auto 24px;padding:0 16px;font-size:11px;color:#666}
</style>
</head>
<body class="view-split">
<div class="proto-bar">
  <span>TWC live baseline · ${esc(kit.taboola.mode)} · ${esc(kit.taboola.publisher_id)}</span>
  <div class="toggle-group">
    <button class="toggle-btn" onclick="setView('before')">Before</button>
    <button class="toggle-btn active" onclick="setView('split')">Split</button>
    <button class="toggle-btn" onclick="setView('after')">After</button>
  </div>
  <a href="./visual-brand-kit.html">Visual brand kit</a>
  <a href="./captures/current-feed.png" target="_blank">Raw feed PNG</a>
</div>
<div class="split">
  <div class="panel panel-before">
    <div class="panel-label">Before — Current live Taboola feed (captured)</div>
    <div class="chrome"><img src="./captures/article-chrome.png" alt="Live TWC article chrome"></div>
    <div class="article">
      <h1>${esc(title)}</h1>
      ${deck ? `<p class="deck">${esc(deck)}</p>` : ''}
      ${hero ? `<img class="hero" src="${esc(hero)}" alt="">` : ''}
    </div>
    <div class="provenance">
      <strong>Source of truth:</strong> screenshot of <code>#${esc(kit.taboola.container)}</code> on weather.com ·
      publisher <code>${esc(kit.taboola.publisher_id)}</code> · modes <code>${esc((kit.taboola.modes_in_use||[]).join(', '))}</code> ·
      captured ${esc(kit.metadata.capture_at || '')}
    </div>
    <div class="live-feed-shot"><img src="./captures/current-feed.png" alt="Current live Taboola feed"></div>
    <p class="meta">Actual feed as rendered on weather.com — not a reconstructed mock.</p>
  </div>
  <div class="divider"></div>
  <div class="panel panel-after">
    <div class="panel-label">After — Same feed anatomy + live brand kit</div>
    <div class="chrome"><img src="./captures/article-chrome.png" alt="Live TWC article chrome"></div>
    <div class="article">
      <h1>${esc(title)}</h1>
      ${deck ? `<p class="deck">${esc(deck)}</p>` : ''}
      ${hero ? `<img class="hero" src="${esc(hero)}" alt="">` : ''}
    </div>
    <div class="provenance">
      Same card list from live capture, restyled with extracted tokens (${esc(kit.fonts.primary.family)}, ${esc(primary)}, 0px radius).
      Unique weather properties (SEVERE / FORECAST badges, TrueNative composition) are tiered in the visual kit — not invented in this After panel.
    </div>
    <div class="feed" id="${esc(kit.taboola.container)}">
      <div class="tbl-feed-header">
        <div class="tbl-feed-header-text">More From The Weather Channel</div>
        <div style="font-size:11px;color:#888">recommended by Taboola</div>
      </div>
      ${afterCards}
      <button class="tbl-feed-more-btn">Show more</button>
    </div>
    <p class="meta">${cards.length} cards from live feed-dom.json · ${esc(kit.taboola.publisher_id)}</p>
  </div>
</div>
<script>
function setView(mode){
  document.body.className='view-'+mode;
  document.querySelectorAll('.toggle-btn').forEach(btn=>{
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase()===mode);
  });
}
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(DIR, 'feed-prototype.html'), html);
}

function buildVisualKit({ kit, feed }) {
  const primary = kit.colors.primary.hex;
  const text = kit.colors.text.primary.hex;
  const muted = kit.colors.text.secondary.hex;
  const font = kit.fonts.primary.family;

  const domains = [
    {
      id: 'layout',
      title: 'Layout & Grid',
      subtitle: 'Article column + below-content Taboola placement',
      props: [
        {
          name: 'Feed container / placement',
          token: 'taboola.container',
          value: kit.taboola.container,
          tier: 'standard',
          trc: `#${kit.taboola.container}`,
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Live placement: Below Content Thumbnails on article pages',
        },
        {
          name: 'Mode composition (organic + thumbs mix)',
          token: 'taboola.modes_in_use',
          value: (kit.taboola.modes_in_use || []).join(', '),
          tier: 'partial',
          trc: 'Mode-owned card geometry; CSS can paint within mode',
          sourceImg: './captures/current-feed.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'TrueNative / mobile composition',
          token: 'layout_patterns (mobile)',
          value: 'TrueNative iPhone modules (existing mobile-prototype reference)',
          tier: 'unique',
          trc: 'Not expressible as paint on desktop thumbs modes alone',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './mobile-prototype.html',
          note: 'Keep mobile-prototype.html as ideal Unique composition reference.',
        },
        {
          name: 'Divider / border',
          token: 'colors.css_variables.--border / --dd-border-color',
          value: kit.colors.css_variables?.scraped?.['--border'] || '#e5e5e5',
          tier: 'standard',
          trc: '.tbl-feed-card border-bottom',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
      ],
    },
    {
      id: 'type',
      title: 'Typography',
      subtitle: `${font} — live article + feed titles`,
      props: [
        {
          name: 'Font family',
          token: 'fonts.primary.family',
          value: font,
          tier: 'standard',
          trc: '.video-title, .branding',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Article / section title',
          token: 'fonts.type_scale / h1',
          value: `${font} 800 · ~40px · ${text}`,
          tier: 'standard',
          trc: '.tbl-feed-header-text',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Card title',
          token: 'fonts.type_scale.article_title_card',
          value: `${font} 700 · ~16px · ${text}`,
          tier: 'standard',
          trc: '.video-title',
          sourceImg: './captures/current-feed.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Meta / secondary label',
          token: 'colors.text.secondary',
          value: muted,
          tier: 'standard',
          trc: '.branding',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
      ],
    },
    {
      id: 'color',
      title: 'Colors',
      subtitle: 'Live accents + navy chrome',
      props: [
        {
          name: 'Accent / link blue',
          token: 'colors.primary.hex',
          value: primary,
          tier: 'standard',
          trc: 'title hover, CTA, pre-label',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: primary,
        },
        {
          name: 'Masthead navy',
          token: 'colors.masthead',
          value: kit.colors.masthead.hex,
          tier: 'partial',
          trc: 'Feed header dark variant / sponsored overlay',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: kit.colors.masthead.hex,
        },
        {
          name: 'Primary text',
          token: 'colors.text.primary',
          value: text,
          tier: 'standard',
          trc: '.video-title color',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: text,
        },
        {
          name: 'Alert / severe accents',
          token: 'colors.accents / brand_voice.content_labels.severe_weather',
          value: 'SEVERE / WATCH / FORECAST multi-badge system',
          tier: 'unique',
          trc: 'Single .trc-pre-label today — not multi-alert inventory',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Highest weather-vertical unique gap vs current thumbs modes.',
        },
      ],
    },
    {
      id: 'images',
      title: 'Images',
      subtitle: 'Sharp thumbs · video play indicator',
      props: [
        {
          name: 'Thumbnail border radius',
          token: 'photo_style.thumbnail_format.border_radius',
          value: '0px',
          tier: 'standard',
          trc: '.thumbBlock img / .trc_img',
          sourceImg: './captures/current-feed.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Aspect ratio',
          token: 'photo_style.thumbnail_format.aspect_ratio',
          value: kit.photo_style.thumbnail_format.aspect_ratio || '16:9',
          tier: 'partial',
          trc: 'Mode-controlled; CSS object-fit can approximate',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Video play indicator',
          token: 'photo_style.video_thumbnails',
          value: kit.photo_style.video_thumbnails?.indicator || 'Play button overlay',
          tier: 'partial',
          trc: '.trc-video-play-icon',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
      ],
    },
    {
      id: 'ui',
      title: 'UI Elements',
      subtitle: 'Labels, sponsored treatment, CTAs',
      props: [
        {
          name: 'Sponsored label',
          token: 'badges / sponsored',
          value: 'Sponsored overlay on mixed feed',
          tier: 'standard',
          trc: '.trc_sponsored_overlay',
          sourceImg: './captures/current-feed.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'See more / CTA button',
          token: 'buttons.primary',
          value: `${primary} fill · Inter bold · modest radius`,
          tier: 'standard',
          trc: '.tbl-feed-more-btn',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Conversational forecast voice',
          token: 'brand_voice.headline_style',
          value: 'Here’s / Why / How explainers + urgent severe headlines',
          tier: 'soft',
          trc: 'Content rewrite — not loader CSS',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Soft/Gen AI tier — hand-authored in ideal copy; enrich stub on main.',
        },
      ],
    },
  ];

  const tierStyle = {
    standard: { bg: '#e8f7ef', color: '#1a7f4b', label: 'Standard / MVP' },
    partial: { bg: '#fff6e0', color: '#9a6b00', label: 'Partial' },
    unique: { bg: '#fdecea', color: '#b42318', label: 'Unique / needs platform' },
    soft: { bg: '#f3e8ff', color: '#5b21b6', label: 'Soft / Gen AI' },
  };
  const counts = { standard: 0, partial: 0, unique: 0, soft: 0 };
  domains.forEach((d) => d.props.forEach((p) => { counts[p.tier] = (counts[p.tier] || 0) + 1; }));

  const sections = domains
    .map((d) => {
      const cards = d.props
        .map((p) => {
          const t = tierStyle[p.tier];
          const feedSrc = p.feedImg.endsWith('.html') ? './captures/current-feed.png' : p.feedImg;
          return `<article class="prop" data-tier="${p.tier}">
            <header>
              <div><h3>${esc(p.name)}</h3><code>${esc(p.token)}</code></div>
              <span class="tier" style="background:${t.bg};color:${t.color}">${t.label}</span>
            </header>
            <div class="value">${p.swatch ? `<span class="swatch" style="background:${esc(p.swatch)}"></span>` : ''}${esc(p.value)}</div>
            <div class="cols">
              <div><div class="col-h">1 · Source (live publisher)</div><div class="shot"><img src="${esc(p.sourceImg)}" alt=""></div></div>
              <div><div class="col-h">2 · Current feed / application</div><div class="shot"><img src="${esc(feedSrc)}" alt=""></div></div>
            </div>
            <footer>
              <div><strong>TRC</strong> ${esc(p.trc)}</div>
              ${p.note ? `<div><strong>Note</strong> ${esc(p.note)}</div>` : ''}
            </footer>
          </article>`;
        })
        .join('\n');
      return `<section class="domain" id="${d.id}"><h2>${esc(d.title)}</h2><p class="sub">${esc(d.subtitle)}</p>${cards}</section>`;
    })
    .join('\n');

  const matrix = {
    slug: 'weather-channel',
    brand: 'The Weather Channel',
    baseline: 'live',
    sourceArticle: kit.metadata.source_url,
    taboola: kit.taboola,
    counts,
    domains: domains.map((d) => ({
      id: d.id,
      title: d.title,
      props: d.props.map(({ name, token, value, tier, trc, note }) => ({ name, token, value, tier, trc, note })),
    })),
  };
  fs.writeFileSync(path.join(DIR, 'property-matrix.json'), JSON.stringify(matrix, null, 2));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>The Weather Channel — Visual Brand Kit (live)</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  :root{--ink:#12141a;--muted:#5c6470;--line:#e4e7ec;--primary:${primary}}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,Arial,sans-serif;background:#f3f4f6;color:var(--ink);line-height:1.45}
  .top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.95);border-bottom:1px solid var(--line);padding:14px 22px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center}
  h1{font-size:24px} h1 span{color:var(--primary)}
  .pill{background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}
  .wrap{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
  .intro{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:22px;font-size:14px;color:var(--muted)}
  .intro a{color:var(--primary)}
  .filters{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  .filters button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
  .filters button.active{background:#111;color:#fff}
  .domain{margin:28px 0} .domain h2{font-size:22px;margin-bottom:4px} .domain .sub{color:var(--muted);font-size:13px;margin-bottom:14px}
  .prop{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
  .prop.hidden{display:none}
  .prop header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}
  .prop h3{font-size:16px} .prop code{font-size:11px;color:var(--muted)}
  .tier{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px}
  .value{background:#f8f9fb;border-radius:8px;padding:8px 10px;margin-bottom:12px;font-size:13px;display:flex;gap:8px;align-items:center}
  .swatch{width:18px;height:18px;border-radius:4px;border:1px solid #ddd;display:inline-block}
  .cols{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  @media(max-width:800px){.cols{grid-template-columns:1fr}}
  .col-h{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
  .shot{border:1px solid var(--line);border-radius:8px;overflow:hidden;background:#fafafa;max-height:220px}
  .shot img{width:100%;height:220px;object-fit:cover;object-position:top;display:block}
  footer{margin-top:12px;padding-top:10px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);display:grid;gap:4px}
  .mvp{margin-top:28px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px}
  .mvp-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:800px){.mvp-cols{grid-template-columns:1fr}}
  .mvp li{margin:0 0 8px 18px;font-size:13px;color:var(--muted)}
</style>
</head>
<body>
  <div class="top">
    <div>
      <h1><span>The Weather Channel</span> Visual Brand Kit</h1>
      <div style="font-size:12px;color:var(--muted)">Live publisher × live Taboola ${esc(kit.taboola.mode)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="pill">MVP ${counts.standard}</span>
      <span class="pill">Partial ${counts.partial}</span>
      <span class="pill">Unique ${counts.unique}</span>
      <span class="pill">Soft ${counts.soft}</span>
    </div>
  </div>
  <div class="wrap">
    <div class="intro">
      Built from the live article
      <a href="${esc(kit.metadata.source_url)}">${esc(kit.content.title || 'TWC article')}</a>
      and live Taboola capture. Publisher <code>${esc(kit.taboola.publisher_id)}</code>,
      container <code>${esc(kit.taboola.container)}</code>,
      modes <code>${esc((kit.taboola.modes_in_use||[]).join(', '))}</code>.
      <div style="margin-top:10px">
        <a href="./feed-prototype.html">Before/After feed prototype</a> ·
        <a href="./captures/current-feed.png">current-feed.png</a> ·
        <a href="./mobile-prototype.html">TrueNative mobile (ideal unique)</a> ·
        <a href="./brand-kit.json">brand-kit.json</a>
      </div>
      <div class="filters">
        <button class="active" onclick="filterTier('all')">All</button>
        <button onclick="filterTier('standard')">MVP</button>
        <button onclick="filterTier('partial')">Partial</button>
        <button onclick="filterTier('unique')">Unique</button>
        <button onclick="filterTier('soft')">Soft</button>
      </div>
    </div>
    ${sections}
    <div class="mvp">
      <h2>A/B framing</h2>
      <div class="mvp-cols">
        <div>
          <h3>Variant A — loader MVP</h3>
          <ul>${domains.flatMap((d)=>d.props).filter((p)=>p.tier==='standard'||p.tier==='partial').map((p)=>`<li><strong>${esc(p.name)}</strong> — ${esc(p.trc)}</li>`).join('')}</ul>
        </div>
        <div>
          <h3>Variant B — unique / soft</h3>
          <ul>${domains.flatMap((d)=>d.props).filter((p)=>p.tier==='unique'||p.tier==='soft').map((p)=>`<li><strong>${esc(p.name)}</strong> — ${esc(p.note||p.trc)}</li>`).join('')}</ul>
        </div>
      </div>
    </div>
  </div>
<script>
function filterTier(tier){
  document.querySelectorAll('.prop').forEach(el=>{
    el.classList.toggle('hidden', tier!=='all' && el.dataset.tier!==tier);
  });
  document.querySelectorAll('.filters button').forEach(btn=>{
    const label=btn.textContent.trim().toLowerCase();
    const active = tier==='all' ? label==='all' : label.includes(tier==='standard'?'mvp':tier);
    btn.classList.toggle('active', active);
  });
}
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(DIR, 'visual-brand-kit.html'), html);

  const checklist = `# The Weather Channel — MVP vs Ideal (live baseline)

Source: ${kit.metadata.source_url}
Taboola: \`${kit.taboola.publisher_id}\` · \`${kit.taboola.mode}\` · \`${kit.taboola.container}\`

## Variant A — MVP via loader CSS

${domains.flatMap((d) => d.props).filter((p) => p.tier === 'standard' || p.tier === 'partial').map((p) => `- [ ] **${p.name}** (\`${p.tier}\`) — \`${p.token}\` → ${p.trc}`).join('\n')}

## Variant B — Unique / Soft

${domains.flatMap((d) => d.props).filter((p) => p.tier === 'unique' || p.tier === 'soft').map((p) => `- [ ] **${p.name}** — ${p.note || p.trc}`).join('\n')}

## Captures
- \`captures/homepage-chrome.png\`
- \`captures/article-chrome.png\`
- \`captures/current-feed.png\`
- \`captures/feed-dom.json\`
`;
  fs.writeFileSync(path.join(DIR, 'mvp-checklist.md'), checklist);
}

function updateReadme(kit) {
  const readme = `# The Weather Channel — Taboola Brand Kit

## Live baseline

Rebuilt from the **live publisher** and **live Taboola feed** (same method as Business Insider).

| Item | Value |
|---|---|
| Article | ${kit.metadata.source_url} |
| Publisher slug | \`${kit.taboola.publisher_id}\` |
| Primary mode | \`${kit.taboola.mode}\` |
| Modes seen | ${(kit.taboola.modes_in_use || []).map((m) => `\`${m}\``).join(', ')} |
| Container | \`${kit.taboola.container}\` |
| Font | ${kit.fonts.primary.family} |
| Accent | ${kit.colors.primary.hex} |

Open first:
- [\`visual-brand-kit.html\`](./visual-brand-kit.html)
- [\`feed-prototype.html\`](./feed-prototype.html) (Before = live feed PNG)
- [\`mobile-prototype.html\`](./mobile-prototype.html) (TrueNative ideal / Unique reference)

\`\`\`bash
node generate.js --url "${kit.metadata.source_url}" --slug weather-channel
xvfb-run -a node scripts/capture-live-baseline.js \\
  --url "${kit.metadata.source_url}" --slug weather-channel --home "https://weather.com/" \\
  --publisher theweatherchannel --container taboola-below-content-thumbnails-article \\
  --mode organic-thumbs-feed-01-c-new --placement "Below Content Thumbnails"
node scripts/build-twc-live-kit.js
\`\`\`
`;
  fs.writeFileSync(path.join(DIR, 'README.md'), readme);
}

function updateDocs() {
  const docs = path.join(ROOT, 'docs', 'feed-integration-matrix.md');
  let md = fs.readFileSync(docs, 'utf8');
  md = md.replace(
    /Business Insider was rebuilt from the live article \+ Taboola `thumbs-1r` capture and the designer PDF \[`brand-kit-mapping-bi\.pdf`\]\(\.\/brand-kit-mapping-bi\.pdf\)\. FOX Sports and Weather Channel are \*\*not\*\* live-sourced yet\./,
    'Business Insider was rebuilt from the live article + Taboola `thumbs-1r` capture and the designer PDF [`brand-kit-mapping-bi.pdf`](./brand-kit-mapping-bi.pdf). The Weather Channel was rebuilt from the live North Dakota EF5 article + Taboola below-content capture. FOX Sports is **not** live-sourced yet.'
  );
  if (!md.includes('Live TWC baseline')) {
    md += `\n\n## Live TWC baseline\n\nThe Weather Channel was rebuilt from the live North Dakota EF5 article + Taboola \`organic-thumbs-feed-01-c-new\` / \`thumbs-feed-01-b-new\` capture (\`theweatherchannel\` / \`taboola-below-content-thumbnails-article\`).\n`;
  }
  fs.writeFileSync(docs, md);
}

function main() {
  const ctx = patchBrandKit();
  writeLoader(ctx.kit);
  buildFeedPrototype(ctx);
  buildVisualKit(ctx);
  updateReadme(ctx.kit);
  updateDocs();
  console.log('✓ TWC live kit rebuilt');
  console.log('  taboola:', ctx.kit.taboola);
  console.log('  font/primary:', ctx.kit.fonts.primary.family, ctx.kit.colors.primary.hex);
  console.log('  cards:', (ctx.feed.cards || []).length);
}

main();
