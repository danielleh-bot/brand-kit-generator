#!/usr/bin/env node
/**
 * Rebuild BI deliverables from live crawl + captures + designer mapping.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'output', 'business-insider');
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

  // Designer mapping overrides where crawl is incomplete / wrong role
  kit.photo_style = kit.photo_style || {};
  kit.photo_style.thumbnail_format = {
    aspect_ratio: '4:3',
    border_radius: '0px',
    sizes: { large: '400x300', small: '100x75' },
    source: 'designer-mapping+live',
    note: 'From Brand Kit mapping BI.pdf — no border radius; 4:3 thumbs',
  };

  kit.colors = kit.colors || {};
  kit.colors.primary = {
    name: 'BI Link Blue',
    hex: (cssVars.computed && cssVars.computed['--base-a-color']) || kit.colors.primary?.hex || '#002AFF',
    rgb: 'rgb(0, 42, 255)',
    usage: ['Links', 'Subscribe', 'More Markets', 'Interactive text'],
    source: 'extracted',
  };
  kit.colors.primary_hover = {
    hex: (cssVars.computed && cssVars.computed['--base-a-hover-color']) || '#0022CC',
    usage: ['Link hover'],
    source: 'extracted',
  };
  if (kit.colors.text) {
    kit.colors.text.primary = {
      ...(kit.colors.text.primary || {}),
      hex: (cssVars.computed && cssVars.computed['--base-text-color']) || '#0a0a0a',
      source: 'extracted',
    };
    kit.colors.text.secondary = {
      ...(kit.colors.text.secondary || {}),
      hex: '#71717a',
      usage: ['N MIN READ labels', 'Secondary meta'],
      source: 'designer-mapping',
    };
  }
  kit.colors.backgrounds = kit.colors.backgrounds || {};
  kit.colors.backgrounds.base = {
    hex: (cssVars.computed && cssVars.computed['--app-background']) || '#FFFFFF',
    source: 'extracted',
  };
  kit.colors.backgrounds.section = {
    hex: '#faf7f5',
    name: 'Warm section',
    source: 'designer-mapping',
    note: '--primary-warm-grey-100 / Read next module',
  };
  kit.colors.css_variables = {
    ...cssVars.computed,
    sample_type_scale: Object.fromEntries(
      Object.entries(cssVars.scraped || {})
        .filter(([k]) => k.includes('font-size'))
        .slice(0, 40)
    ),
  };

  kit.taboola = {
    publisher_id: meta.taboola?.publisherSlug || 'businessinsider',
    loader_url: meta.taboola?.loaderUrl || 'https://cdn.taboola.com/libtrc/businessinsider/loader.js',
    mode: meta.taboola?.mode || feed.mode || 'thumbs-1r',
    placement: meta.taboola?.placement || 'below-main-column',
    container: meta.taboola?.container || 'taboola-below-main-column',
    target_type: meta.taboola?.targetType || 'mix',
    feed_label: feed.header || 'You May Like',
    capture_note: 'Feed DOM captured by bootstrapping loader.js in headed Chrome (xvfb).',
  };

  kit.content = {
    ...(kit.content || {}),
    title: article.title || kit.content?.title,
    deck: article.deck || kit.content?.deck,
    heroImage: article.hero || kit.content?.heroImage,
    paragraphs: article.paragraphs || kit.content?.paragraphs,
  };

  kit.designer_mapping = {
    source: 'docs/brand-kit-mapping-bi.pdf',
    domains: ['layout_grid', 'typography', 'colors', 'images', 'ui_elements'],
    key_tokens: {
      font: 'Garnett',
      link: '#002aff',
      link_hover: '#02c',
      text_primary: '#0a0a0a',
      text_secondary: '#71717a',
      thumb_radius: '0px',
      thumb_sizes: ['400x300', '100x75'],
      meta_label: 'N MIN READ',
      button_note: 'Map border-radius + font style, not necessarily fill color',
    },
  };

  kit.metadata = {
    ...(kit.metadata || {}),
    source_url: meta.articleUrl || kit.metadata?.source_url,
    home_url: meta.homeUrl || 'https://www.businessinsider.com/',
    analysis_date: new Date().toISOString().slice(0, 10),
    capture_at: meta.capturedAt,
    baseline: 'live-publisher-and-taboola-feed',
  };

  fs.writeFileSync(path.join(DIR, 'brand-kit.json'), JSON.stringify(kit, null, 2) + '\n');
  return { kit, feed, article, meta, cssVars };
}

function updateLoader(kit) {
  const loaderPath = path.join(DIR, 'loader.js');
  let src = fs.readFileSync(loaderPath, 'utf8');
  const primary = kit.colors.primary.hex;
  const hover = kit.colors.primary_hover?.hex || '#0022CC';
  const text = kit.colors.text?.primary?.hex || '#0a0a0a';
  const muted = kit.colors.text?.secondary?.hex || '#71717a';

  src = src.replace(/publisherName:\s*"[^"]+"/, 'publisherName:    "businessinsider"');
  // Replace key brand color constants if present
  src = src.replace(/biOrange:\s*"[^"]+"/, `biOrange:         "${primary}"`);
  src = src.replace(/biOrangeDark:\s*"[^"]+"/, `biOrangeDark:     "${hover}"`);
  src = src.replace(/nearBlack:\s*"[^"]+"/, `nearBlack:        "${text}"`);
  src = src.replace(/mediumGray:\s*"[^"]+"/, `mediumGray:       "${muted}"`);
  src = src.replace(
    /fontPrimary:\s*'[^']+'/,
    "fontPrimary:      \"'Garnett', 'Helvetica Neue', Arial, sans-serif\""
  );
  src = src.replace(
    /fontFallback:\s*'[^']+'/,
    "fontFallback:     \"'Garnett', 'Helvetica Neue', Arial, sans-serif\""
  );

  if (!src.includes('LIVE BASELINE')) {
    src = src.replace(
      /Brand Kit Source:[^\n]+/,
      'Brand Kit Source: business-insider/brand-kit.json (LIVE crawl)\n * LIVE BASELINE: publisher businessinsider · mode thumbs-1r · placement below-main-column'
    );
  }

  fs.writeFileSync(loaderPath, src);
}

function buildFeedPrototype({ kit, feed, article }) {
  const primary = kit.colors.primary.hex;
  const hover = kit.colors.primary_hover?.hex || '#0022CC';
  const text = kit.colors.text.primary.hex;
  const muted = kit.colors.text.secondary.hex;
  const font = "'Garnett', 'Helvetica Neue', Arial, sans-serif";
  const title = article.title || kit.content?.title || 'Business Insider article';
  const deck = article.deck || '';
  const hero = article.hero || '';
  const cards = (feed.cards || []).filter((c) => c.title && !/^discover more|^explore related|^recommended reading/i.test(c.title));

  const afterCards = cards
    .map((c) => {
      const thumb = c.thumbnail
        ? `<img class="trc_img" src="${esc(c.thumbnail)}" alt="">`
        : `<div class="trc_img placeholder"></div>`;
      const brand = c.branding ? `<div class="branding">${esc(c.branding)}</div>` : '';
      const sponsored = c.sponsored
        ? `<div class="trc_sponsored_overlay">Sponsored</div>`
        : '';
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
<title>Business Insider — Live feed baseline (Before / After)</title>
<style>
  @font-face { font-family: 'Garnett'; src: local('Garnett'), local('Helvetica Neue'); }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${font}; background: #e8e8e8; color: ${text}; }
  .proto-bar {
    position: sticky; top: 0; z-index: 50; background: #111; color: #fff;
    display: flex; gap: 12px; align-items: center; justify-content: center; height: 48px; font-size: 12px;
  }
  .proto-bar a { color: #9cf; }
  .toggle-group { display: flex; background: #333; border-radius: 999px; overflow: hidden; }
  .toggle-btn { border: 0; background: transparent; color: #aaa; padding: 6px 14px; font: inherit; font-weight: 700; cursor: pointer; }
  .toggle-btn.active { background: ${primary}; color: #fff; border-radius: 999px; }
  .split { display: flex; max-width: 1480px; margin: 0 auto; }
  .panel { flex: 1; background: #fff; min-height: 100vh; }
  .panel-label { position: sticky; top: 48px; z-index: 40; text-align: center; padding: 8px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .panel-before .panel-label { background: #b42318; color: #fff; }
  .panel-after .panel-label { background: ${primary}; color: #fff; }
  .divider { width: 3px; background: linear-gradient(${primary}, #111); }
  body.view-before .panel-after, body.view-before .divider { display: none; }
  body.view-after .panel-before, body.view-after .divider { display: none; }
  body.view-before .panel-before, body.view-after .panel-after { max-width: 820px; margin: 0 auto; }
  .chrome { border-bottom: 1px solid #cecece; }
  .chrome img { width: 100%; display: block; }
  .article { max-width: 720px; margin: 0 auto; padding: 28px 24px 12px; }
  .article h1 { font-size: 34px; line-height: 1.15; font-weight: 700; margin-bottom: 12px; }
  .article .deck { color: ${muted}; font-size: 16px; margin-bottom: 16px; }
  .article .hero { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #eee; margin-bottom: 12px; }
  .provenance {
    max-width: 720px; margin: 0 auto 12px; padding: 10px 12px; font-size: 12px; background: #f5f5f5; border-left: 3px solid #666;
  }
  .panel-after .provenance { border-left-color: ${primary}; background: #eef2ff; }
  .live-feed-shot { max-width: 720px; margin: 0 auto 24px; padding: 0 16px; }
  .live-feed-shot img { width: 100%; border: 1px solid #ddd; display: block; }
  .feed { max-width: 720px; margin: 0 auto; padding: 8px 16px 48px; }
  .tbl-feed-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e5e5; padding-bottom: 8px; margin-bottom: 12px; }
  .panel-after .tbl-feed-header { border-bottom: 2px solid ${primary}; }
  .tbl-feed-header-text { font-size: 13px; font-weight: 700; color: #777; text-transform: uppercase; }
  .panel-after .tbl-feed-header-text { font-size: 16px; color: ${text}; text-transform: none; }
  .tbl-feed-card { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f0f0f0; }
  .panel-after .tbl-feed-card { border-bottom-color: #cecece; }
  .tbl-feed-card a { display: flex; gap: 14px; text-decoration: none; color: inherit; width: 100%; }
  .thumbBlock { width: 148px; flex-shrink: 0; position: relative; }
  .trc_img, .placeholder { width: 148px; height: 111px; object-fit: cover; background: linear-gradient(135deg,#ddd,#bbb); display: block; border-radius: 0; }
  .video-title { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 700; color: #333; line-height: 1.3; margin-bottom: 6px; }
  .panel-after .video-title { font-family: ${font}; font-size: 18px; font-weight: 500; color: ${text}; line-height: 25px; }
  .panel-after .tbl-feed-card:hover .video-title {
    text-decoration: underline; text-decoration-color: ${primary}; text-decoration-thickness: 2px; text-underline-offset: 3px;
  }
  .branding { font-family: Arial, sans-serif; font-size: 11px; color: #aaa; }
  .panel-after .branding { font-family: ${font}; color: ${muted}; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; }
  .trc_sponsored_overlay {
    position: absolute; left: 6px; bottom: 6px; background: #f3f4f6; color: #666; font-size: 10px; padding: 2px 6px; border-radius: 3px;
  }
  .panel-after .trc_sponsored_overlay { background: #111; color: #fff; border-radius: 0; font-family: ${font}; font-weight: 700; text-transform: uppercase; }
  .tbl-feed-more-btn {
    display: block; margin: 20px auto 0; border: 1px solid #ddd; background: #f5f5f5; color: #777; padding: 10px 28px; font-size: 13px; cursor: pointer;
  }
  .panel-after .tbl-feed-more-btn {
    background: ${primary}; color: #fff; border: 0; border-radius: 4px; font-family: ${font}; font-weight: 700;
  }
  .meta { max-width: 720px; margin: 0 auto 24px; padding: 0 16px; font-size: 11px; color: #666; }
</style>
</head>
<body class="view-split">
<div class="proto-bar">
  <span>BI live baseline · ${esc(kit.taboola.mode)} · ${esc(kit.taboola.publisher_id)}</span>
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
    <div class="chrome"><img src="./captures/article-chrome.png" alt="Live BI article chrome"></div>
    <div class="article">
      <h1>${esc(title)}</h1>
      ${deck ? `<p class="deck">${esc(deck)}</p>` : ''}
      ${hero ? `<img class="hero" src="${esc(hero)}" alt="">` : ''}
    </div>
    <div class="provenance">
      <strong>Source of truth:</strong> screenshot of <code>#taboola-below-main-column</code> after loading
      <code>${esc(kit.taboola.loader_url)}</code> · mode <code>${esc(kit.taboola.mode)}</code> ·
      placement <code>${esc(kit.taboola.placement)}</code> · captured ${esc(kit.metadata.capture_at || '')}
    </div>
    <div class="live-feed-shot">
      <img src="./captures/current-feed.png" alt="Current live Taboola feed screenshot">
    </div>
    <p class="meta">This panel is the actual feed as rendered on businessinsider.com — not a reconstructed mock.</p>
  </div>

  <div class="divider"></div>

  <div class="panel panel-after">
    <div class="panel-label">After — Same feed anatomy + live brand kit (loader paint)</div>
    <div class="chrome"><img src="./captures/article-chrome.png" alt="Live BI article chrome"></div>
    <div class="article">
      <h1>${esc(title)}</h1>
      ${deck ? `<p class="deck">${esc(deck)}</p>` : ''}
      ${hero ? `<img class="hero" src="${esc(hero)}" alt="">` : ''}
    </div>
    <div class="provenance">
      Same card list from live capture, restyled with extracted tokens (Garnett, ${esc(primary)}, 0px radius, hover underline)
      the way <code>loader.js</code> targets <code>.video-title</code> / <code>.branding</code> / <code>.tbl-feed-more-btn</code>.
      Unique properties (category icons, MIN READ meta) are <strong>not</strong> invented here — see visual kit Unique tier.
    </div>
    <div class="feed" id="taboola-below-main-column">
      <div class="tbl-feed-header">
        <div class="tbl-feed-header-text">More From Business Insider</div>
        <div style="font-size:11px;color:#888">recommended by Taboola</div>
      </div>
      ${afterCards}
      <button class="tbl-feed-more-btn">Show more</button>
    </div>
    <p class="meta">${cards.length} cards from live feed-dom.json · publisher ${esc(kit.taboola.publisher_id)}</p>
  </div>
</div>
<script>
function setView(mode){
  document.body.className = 'view-' + mode;
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase() === mode);
  });
}
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIR, 'feed-prototype.html'), html);
}

function buildVisualKit({ kit, feed, cssVars }) {
  const primary = kit.colors.primary.hex;
  const hover = kit.colors.primary_hover?.hex || '#02c';
  const text = kit.colors.text.primary.hex;
  const muted = kit.colors.text.secondary.hex;
  const sectionBg = kit.colors.backgrounds.section.hex;
  const font = 'Garnett';

  const domains = [
    {
      id: 'layout',
      title: 'Layout & Grid',
      subtitle: 'Column structure, gutters, container max width, dividers',
      props: [
        {
          name: 'Grid / column structure (context)',
          token: 'layout_patterns.grid',
          value: 'Homepage multi-module grid (feature + list + section bands)',
          tier: 'unique',
          trc: 'No thumbs-1r hook for homepage module composition',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Designer mapped BI homepage modules. Current article feed is linear thumbs-1r — composition is Unique.',
        },
        {
          name: 'Card gutter / spacing',
          token: 'spacing.card_gap',
          value: kit.spacing?.card_gap || '16–20px (designer annotated gutters)',
          tier: 'partial',
          trc: '.tbl-feed-card margin/padding via loader CSS',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'MVP can approximate card stacking gap; not a full grid gutter system.',
        },
        {
          name: 'Container max width',
          token: 'spacing.container_max_width',
          value: kit.spacing?.container_max_width || '~720–1200px feed column',
          tier: 'partial',
          trc: 'Placement width owned by publisher page / mode',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Border / divider',
          token: 'colors.css_variables.--border-color-2',
          value: cssVars.computed?.['--border-color-2'] || '#cecece',
          tier: 'standard',
          trc: '.tbl-feed-card border-bottom-color',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
      ],
    },
    {
      id: 'type',
      title: 'Typography',
      subtitle: 'Garnett per-role scale — titles, links, MIN READ labels',
      props: [
        {
          name: 'Font family',
          token: 'fonts.primary.family',
          value: font,
          tier: 'standard',
          trc: '.video-title, .branding { font-family }',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Live crawl + CSS var --bs-body-font-family',
        },
        {
          name: 'Section title',
          token: 'fonts.type_scale.section_headings',
          value: 'Garnett 700 / ~28px / #0a0a0a (designer: Markets)',
          tier: 'standard',
          trc: '.tbl-feed-header-text',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Text link',
          token: 'colors.primary.hex',
          value: `${primary} · Garnett 600 ~14px (More Markets)`,
          tier: 'standard',
          trc: 'link color / hover on titles via loader',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Card title',
          token: 'fonts.type_scale.article_title_card',
          value: 'Garnett 500 · 18px / 15px (designer Title roles)',
          tier: 'standard',
          trc: '.video-title',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Label (N MIN READ)',
          token: 'brand_voice / meta label',
          value: 'Garnett 500 · 10px · #71717a · uppercase',
          tier: 'unique',
          trc: 'No dedicated read-time field on thumbs-1r cards',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Designer mapped MIN READ on BI modules — Unique for current feed mode.',
        },
      ],
    },
    {
      id: 'color',
      title: 'Colors',
      subtitle: 'Live :root vars + swatches from designer mapping',
      props: [
        {
          name: 'Brand / link primary',
          token: '--base-a-color',
          value: primary,
          tier: 'standard',
          trc: 'title hover underline, CTA, pre-label',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: primary,
        },
        {
          name: 'Brand hover',
          token: '--base-a-hover-color',
          value: hover,
          tier: 'standard',
          trc: 'link/CTA hover',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: hover,
        },
        {
          name: 'Primary text',
          token: '--base-text-color',
          value: text,
          tier: 'standard',
          trc: '.video-title color',
          sourceImg: './captures/article-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: text,
        },
        {
          name: 'Secondary text',
          token: 'secondary #71717a',
          value: muted,
          tier: 'standard',
          trc: '.branding / meta',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: muted,
        },
        {
          name: 'Bg section',
          token: 'colors.backgrounds.section',
          value: sectionBg,
          tier: 'partial',
          trc: 'No first-class section band on thumbs-1r',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          swatch: sectionBg,
          note: 'Designer: Read next warm background — Partial/Unique for feed bands.',
        },
      ],
    },
    {
      id: 'images',
      title: 'Images',
      subtitle: 'No radius · 4:3 · 400×300 / 100×75',
      props: [
        {
          name: 'Thumbnail border radius',
          token: 'photo_style.thumbnail_format.border_radius',
          value: '0px (no border radius)',
          tier: 'standard',
          trc: '.thumbBlock img / .trc_img',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Aspect / sizes',
          token: 'photo_style.thumbnail_format.sizes',
          value: '4:3 · 400×300 large · 100×75 small',
          tier: 'partial',
          trc: 'Mode controls thumb geometry; CSS can force object-fit',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
      ],
    },
    {
      id: 'ui',
      title: 'UI Elements',
      subtitle: 'Icons, tags, labels, buttons — radius/font not (!) color',
      props: [
        {
          name: 'Article category icon + label',
          token: 'graphics / brand_voice.content_labels',
          value: 'POWER HOURS / ROBOTICS circular icon + uppercase label',
          tier: 'unique',
          trc: '.trc-pre-label color only today — not icon system',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Video icon + duration',
          token: 'photo_style.video_thumbnails',
          value: 'Play icon + duration overlay',
          tier: 'partial',
          trc: '.trc-video-play-icon color; duration not a free field',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
        },
        {
          name: 'Button radius + font style',
          token: 'buttons.primary',
          value: 'Map radius + Garnett weight — not necessarily blue fill',
          tier: 'standard',
          trc: '.tbl-feed-more-btn',
          sourceImg: './captures/homepage-chrome.png',
          feedImg: './captures/current-feed.png',
          note: 'Per designer callout: border radius and font style, not (!) color.',
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
          return `<article class="prop" data-tier="${p.tier}">
            <header>
              <div>
                <h3>${esc(p.name)}</h3>
                <code>${esc(p.token)}</code>
              </div>
              <span class="tier" style="background:${t.bg};color:${t.color}">${t.label}</span>
            </header>
            <div class="value">${p.swatch ? `<span class="swatch" style="background:${esc(p.swatch)}"></span>` : ''}${esc(p.value)}</div>
            <div class="cols">
              <div>
                <div class="col-h">1 · Source (live publisher)</div>
                <div class="shot"><img src="${esc(p.sourceImg)}" alt="source"></div>
              </div>
              <div>
                <div class="col-h">2 · Current feed / suggested application</div>
                <div class="shot"><img src="${esc(p.feedImg)}" alt="feed"></div>
              </div>
            </div>
            <footer>
              <div><strong>TRC</strong> ${esc(p.trc)}</div>
              ${p.note ? `<div><strong>Note</strong> ${esc(p.note)}</div>` : ''}
            </footer>
          </article>`;
        })
        .join('\n');
      return `<section class="domain" id="${d.id}">
        <h2>${esc(d.title)}</h2>
        <p class="sub">${esc(d.subtitle)}</p>
        ${cards}
      </section>`;
    })
    .join('\n');

  const matrix = {
    slug: 'business-insider',
    brand: 'Business Insider',
    baseline: 'live',
    sourceArticle: kit.metadata.source_url,
    taboola: kit.taboola,
    designerMapping: 'docs/brand-kit-mapping-bi.pdf',
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
<title>Business Insider — Visual Brand Kit (Designer mapping × live feed)</title>
<style>
  :root { --ink:#12141a; --muted:#5c6470; --line:#e4e7ec; --primary:${primary}; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Garnett,Helvetica Neue,Arial,sans-serif;background:#f3f4f6;color:var(--ink);line-height:1.45}
  .top{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.95);border-bottom:1px solid var(--line);padding:14px 22px;display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center}
  h1{font-size:24px} h1 span{color:var(--primary)}
  .pill{background:#fff;border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:12px;font-weight:700}
  .wrap{max-width:1100px;margin:0 auto;padding:24px 16px 64px}
  .intro{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;margin-bottom:22px;font-size:14px;color:var(--muted)}
  .intro a{color:var(--primary)}
  .filters{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
  .filters button{border:1px solid var(--line);background:#fff;border-radius:999px;padding:6px 12px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}
  .filters button.active{background:#111;color:#fff}
  .domain{margin:28px 0}
  .domain h2{font-size:22px;margin-bottom:4px}
  .domain .sub{color:var(--muted);font-size:13px;margin-bottom:14px}
  .prop{background:#fff;border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:14px}
  .prop.hidden{display:none}
  .prop header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}
  .prop h3{font-size:16px}
  .prop code{font-size:11px;color:var(--muted)}
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
  .mvp h2{font-size:16px;margin-bottom:10px}
  .mvp-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  @media(max-width:800px){.mvp-cols{grid-template-columns:1fr}}
  .mvp li{margin:0 0 8px 18px;font-size:13px;color:var(--muted)}
</style>
</head>
<body>
  <div class="top">
    <div>
      <h1><span>Business Insider</span> Visual Brand Kit</h1>
      <div style="font-size:12px;color:var(--muted)">Designer mapping × live publisher × live Taboola ${esc(kit.taboola.mode)}</div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <span class="pill">MVP ${counts.standard}</span>
      <span class="pill">Partial ${counts.partial}</span>
      <span class="pill">Unique ${counts.unique}</span>
    </div>
  </div>
  <div class="wrap">
    <div class="intro">
      Built from the product designer’s <a href="../../docs/brand-kit-mapping-bi.pdf">Brand Kit mapping BI.pdf</a> and live captures of
      <a href="${esc(kit.metadata.source_url)}">the Amazon warehouse article</a> + homepage.
      Live Taboola: publisher <code>${esc(kit.taboola.publisher_id)}</code>, mode <code>${esc(kit.taboola.mode)}</code>,
      placement <code>${esc(kit.taboola.placement)}</code>.
      Each property shows a <strong>live source crop</strong> and the <strong>current feed capture</strong>, plus TRC selector and ship tier.
      <div style="margin-top:10px"><a href="./feed-prototype.html">Before/After feed prototype</a> ·
      <a href="./captures/current-feed.png">current-feed.png</a> ·
      <a href="./brand-kit.json">brand-kit.json</a></div>
      <div class="filters">
        <button class="active" onclick="filterTier('all')">All</button>
        <button onclick="filterTier('standard')">MVP</button>
        <button onclick="filterTier('partial')">Partial</button>
        <button onclick="filterTier('unique')">Unique</button>
      </div>
    </div>
    ${sections}
    <div class="mvp">
      <h2>A/B framing from this matrix</h2>
      <div class="mvp-cols">
        <div>
          <h3>Variant A — loader MVP</h3>
          <ul>
            ${domains.flatMap((d) => d.props).filter((p) => p.tier === 'standard' || p.tier === 'partial').map((p) => `<li><strong>${esc(p.name)}</strong> — ${esc(p.trc)}</li>`).join('')}
          </ul>
        </div>
        <div>
          <h3>Variant B — unique / platform</h3>
          <ul>
            ${domains.flatMap((d) => d.props).filter((p) => p.tier === 'unique').map((p) => `<li><strong>${esc(p.name)}</strong> — ${esc(p.note || p.trc)}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  </div>
<script>
function filterTier(tier){
  document.querySelectorAll('.prop').forEach(el => {
    el.classList.toggle('hidden', tier !== 'all' && el.dataset.tier !== tier);
  });
  document.querySelectorAll('.filters button').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.trim().toLowerCase().includes(tier === 'all' ? 'all' : tier === 'standard' ? 'mvp' : tier));
  });
}
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(DIR, 'visual-brand-kit.html'), html);

  const checklist = `# Business Insider — MVP vs Ideal (live baseline)

Source article: ${kit.metadata.source_url}
Taboola: \`${kit.taboola.publisher_id}\` · \`${kit.taboola.mode}\` · \`${kit.taboola.placement}\`
Designer mapping: \`docs/brand-kit-mapping-bi.pdf\`

## Variant A — MVP via loader.js

${domains.flatMap((d) => d.props).filter((p) => p.tier === 'standard' || p.tier === 'partial').map((p) => `- [ ] **${p.name}** (\`${p.tier}\`) — \`${p.token}\` → ${p.trc}`).join('\n')}

## Variant B — Unique / platform

${domains.flatMap((d) => d.props).filter((p) => p.tier === 'unique').map((p) => `- [ ] **${p.name}** — ${p.note || p.trc}`).join('\n')}

## Captures

- \`captures/homepage-chrome.png\`
- \`captures/article-chrome.png\`
- \`captures/current-feed.png\` (live Taboola)
- \`captures/feed-dom.json\`
- \`captures/css-vars.json\`
`;
  fs.writeFileSync(path.join(DIR, 'mvp-checklist.md'), checklist);
}

function updateReadme(kit) {
  const readmePath = path.join(DIR, 'README.md');
  let readme = fs.existsSync(readmePath) ? fs.readFileSync(readmePath, 'utf8') : '# Business Insider\n';
  const block = `

## Live baseline (2026-07-16)

Rebuilt from the **live publisher** and **live Taboola feed**, using the designer mapping in [\`docs/brand-kit-mapping-bi.pdf\`](../../docs/brand-kit-mapping-bi.pdf).

| Item | Value |
|---|---|
| Article | ${kit.metadata.source_url} |
| Publisher slug | \`${kit.taboola.publisher_id}\` |
| Mode | \`${kit.taboola.mode}\` |
| Placement / container | \`${kit.taboola.placement}\` / \`${kit.taboola.container}\` |
| Font | Garnett (live) |
| Link blue | ${kit.colors.primary.hex} |

Open first: [\`visual-brand-kit.html\`](./visual-brand-kit.html) and [\`feed-prototype.html\`](./feed-prototype.html) (Before = live feed PNG).

Regenerate:
\`\`\`bash
node generate.js --url "${kit.metadata.source_url}" --slug business-insider
xvfb-run -a node scripts/capture-live-baseline.js --url "${kit.metadata.source_url}" --slug business-insider
# then bootstrap feed extraction + node scripts/build-bi-live-kit.js
node scripts/build-bi-live-kit.js
\`\`\`
`;
  if (!readme.includes('Live baseline')) {
    readme = readme.trimEnd() + '\n' + block;
  } else {
    readme = readme.replace(/## Live baseline[\s\S]*$/, block.trim() + '\n');
  }
  fs.writeFileSync(readmePath, readme);
}

function markOthersPending() {
  for (const slug of ['fox-sports', 'weather-channel']) {
    const p = path.join(ROOT, 'output', slug, 'README.md');
    const note = `\n\n> **Not yet live-sourced.** Visual kit / feed-prototype on this slug may include synthetic samples. BI is the live baseline reference.\n`;
    if (!fs.existsSync(p)) {
      fs.writeFileSync(p, `# ${slug}\n${note}`);
    } else {
      const cur = fs.readFileSync(p, 'utf8');
      if (!cur.includes('Not yet live-sourced')) fs.writeFileSync(p, cur.trimEnd() + note);
    }
  }
  const docs = path.join(ROOT, 'docs', 'feed-integration-matrix.md');
  let md = fs.readFileSync(docs, 'utf8');
  if (!md.includes('Live BI baseline')) {
    md += `\n\n## Live BI baseline\n\nBusiness Insider was rebuilt from the live article + Taboola \`thumbs-1r\` capture and the designer PDF [\`brand-kit-mapping-bi.pdf\`](./brand-kit-mapping-bi.pdf). FOX Sports and Weather Channel are **not** live-sourced yet.\n`;
    fs.writeFileSync(docs, md);
  }
}

function main() {
  const ctx = patchBrandKit();
  updateLoader(ctx.kit);
  buildFeedPrototype(ctx);
  buildVisualKit(ctx);
  updateReadme(ctx.kit);
  markOthersPending();
  console.log('✓ BI live kit rebuilt');
  console.log('  feed cards:', (ctx.feed.cards || []).length);
  console.log('  taboola:', ctx.kit.taboola);
  console.log('  font/primary:', ctx.kit.fonts?.primary?.family, ctx.kit.colors.primary.hex);
}

main();
