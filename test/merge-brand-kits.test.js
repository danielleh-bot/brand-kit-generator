// Unit tests for the multi-page brand-kit merge. No browser required — we feed
// in synthetic per-page kits shaped exactly like extractBrandKit() output and
// assert the merge votes correctly and fills single-page gaps.
const assert = require('node:assert');
const { mergeBrandKits } = require('../lib/crawler');

function color(hex, usage = [], source = 'extracted') {
  return { name: 'c', hex, rgb: 'rgb(0,0,0)', usage, source };
}
function typeRole(size, weight, source = 'extracted', family = 'Garnett') {
  return { size, weight, family, source };
}

// A thin article page: real primary, but card-title + body fell back, no accents.
const articlePage = {
  brand: { name: 'Business Insider', description: 'short', language: 'en-US' },
  logos: { primary: { type: 'text', text: 'Business Insider' } },
  colors: {
    primary: color('#002AFF', ['Links']),
    text: { primary: color('#000000'), secondary: color('#0A0A0A'), tertiary: color('#31313B') },
    backgrounds: { base: color('#FFFFFF'), section: color('#F7F9FC', [], 'fallback'), secondary: null, dark: color('#0A0A0A') },
    accents: {},
  },
  fonts: {
    primary: { family: 'Garnett', source: 'extracted', usage: 'Headlines' },
    secondary: { family: 'Garnett', source: 'extracted' },
    tertiary: [],
    type_scale: {
      article_title_card: typeRole('22px', 700, 'fallback'),
      article_body: typeRole('18px', 400, 'fallback'),
      navigation: typeRole('16px', 400, 'extracted'),
    },
  },
  buttons: { primary: { background_color: null, border_radius: '6px', source: 'fallback' } },
  photo_style: { thumbnail_format: { aspect_ratio: '16:9', border_radius: '0px' } },
  brand_voice: { headline_style: { case: 'sentence case' }, content_labels: { breaking: true } },
  graphics: { style: 'Minimal', elements: [{ name: 'Sign up', background_color: '#002AFF' }] },
  icons: { count_detected: 40, social_media_icons: { platforms: ['X (Twitter)'] } },
  layout_patterns: { grid: 'unknown', header: { layers: [] } },
  spacing: { grid_gap: '8px' },
};

// A section/listing page: real card titles + body, an accent, richer header.
const sectionPage = {
  brand: { name: 'Business Insider', description: 'A longer, richer description from the section page', language: 'en-US' },
  logos: { primary: { type: 'image', url: 'https://x/logo.png', text: 'Business Insider' } },
  colors: {
    primary: color('#002AFF', ['Buttons', 'Navigation']),
    text: { primary: color('#000000'), secondary: color('#0A0A0A'), tertiary: color('#31313B') },
    backgrounds: { base: color('#FFFFFF'), section: color('#F7F9FC'), secondary: null, dark: color('#0A0A0A') },
    accents: { negative_red: color('#E03625', ['Breaking']) },
  },
  fonts: {
    primary: { family: 'Garnett', source: 'extracted', usage: 'Headlines, Cards' },
    secondary: { family: 'Garnett', source: 'extracted' },
    tertiary: [{ family: 'Tiempos', source: 'extracted' }],
    type_scale: {
      article_title_card: typeRole('20px', 700, 'extracted'), // real value the article page lacked
      article_body: typeRole('18px', 400, 'extracted'),
      navigation: typeRole('16px', 400, 'extracted'),
    },
  },
  buttons: { primary: { background_color: '#002AFF', border_radius: '4px', font_weight: 600, source: 'extracted' } },
  photo_style: { thumbnail_format: { aspect_ratio: '16:9', border_radius: '0px' }, video_thumbnails: { indicator: 'Play button icon' } },
  brand_voice: { headline_style: { case: 'sentence case' }, content_labels: { live: true } },
  graphics: { style: 'Minimal', elements: [{ name: 'Play now', background_color: '#0A0A0A' }] },
  icons: { count_detected: 54, social_media_icons: { platforms: ['Facebook', 'LinkedIn'] } },
  layout_patterns: { grid: 'Two-column layout (main content + sidebar)', header: { background_color: '#FFFFFF', is_dark: false, layers: ['masthead', 'nav'], utility_bar: { background_color: '#FFFFFF' } } },
  spacing: { grid_gap: '16px', container_max_width: '1200px' },
};

// Homepage: agrees on primary, adds another accent, most social platforms.
const homePage = {
  brand: { name: 'Business Insider', description: '', language: 'en-US' },
  logos: { primary: { type: 'image', url: 'https://x/logo.png' } },
  colors: {
    primary: color('#002AFF', ['Tags']),
    text: { primary: color('#000000'), secondary: color('#0A0A0A'), tertiary: color('#31313B') },
    backgrounds: { base: color('#FFFFFF'), section: color('#F7F9FC'), secondary: null, dark: color('#0A0A0A') },
    accents: { info_blue: color('#002AFF') },
  },
  fonts: {
    primary: { family: 'Garnett', source: 'extracted' },
    secondary: { family: 'Garnett', source: 'extracted' },
    tertiary: [],
    type_scale: { article_title_card: typeRole('20px', 700, 'extracted'), navigation: typeRole('16px', 400, 'extracted') },
  },
  buttons: { primary: { background_color: '#002AFF', border_radius: '4px', source: 'extracted' } },
  photo_style: { thumbnail_format: { aspect_ratio: '16:9', border_radius: '0px' } },
  brand_voice: { headline_style: { case: 'sentence case' }, content_labels: { video: true } },
  graphics: { style: 'Minimal', elements: [{ name: 'Sign up', background_color: '#002AFF' }] },
  icons: { count_detected: 50, social_media_icons: { platforms: ['Facebook', 'Instagram', 'YouTube'] } },
  layout_patterns: { grid: 'Two-column layout (main content + sidebar)', header: { background_color: '#FFFFFF', is_dark: false, layers: ['masthead'] } },
  spacing: { grid_gap: '16px' },
};

const merged = mergeBrandKits([articlePage, sectionPage, homePage]);
let passed = 0;
const ok = (label, cond) => { assert.ok(cond, label); console.log('  ✓ ' + label); passed++; };

// 1. Primary color agreed across all three pages.
ok('primary color is #002AFF', merged.colors.primary.hex === '#002AFF');
ok('primary records 3/3 agreement', merged.colors.primary._agreement === '3/3 pages');
ok('primary usage merged across pages', merged.colors.primary.usage.length >= 3);

// 2. THE KEY WIN: card title was a fallback on the article page but extracted
//    on the section/home pages — the merge must take the real value.
ok('article_title_card is now extracted (gap filled)', merged.fonts.type_scale.article_title_card.source === 'extracted');
ok('article_title_card took the real 20px value', merged.fonts.type_scale.article_title_card.size === '20px');
ok('article_body is now extracted (gap filled)', merged.fonts.type_scale.article_body.source === 'extracted');

// 3. Accents are unioned across pages (red from section, blue from home).
ok('accents unioned: negative_red present', !!merged.colors.accents.negative_red);
ok('accents unioned: info_blue present', !!merged.colors.accents.info_blue);

// 4. Buttons: the extracted button with a real bg beats the article fallback.
ok('button is extracted with real bg', merged.buttons.primary.source === 'extracted' && merged.buttons.primary.background_color === '#002AFF');

// 5. Logo: an image-with-url beats text-only.
ok('logo picks image with url', merged.logos.primary.type === 'image' && merged.logos.primary.url);

// 6. Content labels unioned across pages.
ok('content_labels unioned (breaking+live+video)', merged.brand_voice.content_labels.breaking && merged.brand_voice.content_labels.live && merged.brand_voice.content_labels.video);

// 7. Icons: max count + unioned platforms.
ok('icon count is the max (54)', merged.icons.count_detected === 54);
ok('social platforms unioned (>=4)', merged.icons.social_media_icons.platforms.length >= 4);

// 8. Layout: richest header (with utility_bar + layers) wins.
ok('layout header has utility_bar', merged.layout_patterns.header.utility_bar);

// 9. tertiary font unioned (Tiempos discovered on section page).
ok('tertiary font Tiempos carried in', merged.fonts.tertiary.some(t => t.family === 'Tiempos'));

// 10. Extraction quality improved vs the article page alone.
const articleOnly = mergeBrandKits([articlePage, articlePage]); // single-distinct → still has fallbacks
ok('merged extraction_ratio > article-only ratio',
  merged.extraction_quality.extraction_ratio > articleOnly.extraction_quality.extraction_ratio);

// 11. Description: longest non-empty wins.
ok('description takes the richest non-empty', merged.brand.description.includes('richer description'));

console.log(`\n${passed} assertions passed.`);
