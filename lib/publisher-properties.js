// ============================================================
//  Per-publisher property catalogs for the visual brand kit.
//  Each property pairs a source visual (publisher site crop mock)
//  with a suggested feed application visual + integration tier.
// ============================================================

const { TRC_TARGETS, prop } = require('./property-tiers');

function hex(brandKit, path, fallback) {
  const parts = path.split('.');
  let cur = brandKit;
  for (const p of parts) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return cur || fallback;
}

function commonVisualTokens(brandKit) {
  const primary =
    hex(brandKit, 'colors.primary.hex', null) ||
    brandKit?.colors?.primary?.hex ||
    '#333333';
  const text =
    brandKit?.colors?.text?.primary?.hex ||
    brandKit?.colors?.text?.heading_alt?.hex ||
    '#111111';
  const muted =
    brandKit?.colors?.text?.secondary?.hex ||
    brandKit?.colors?.text?.tertiary?.hex ||
    brandKit?.colors?.text?.body?.hex ||
    '#767676';
  const font =
    brandKit?.fonts?.primary?.family ||
    brandKit?.fonts?.type_scale?.article_title_card?.family ||
    'Arial, Helvetica, sans-serif';
  const radius =
    brandKit?.photo_style?.thumbnail_format?.border_radius ||
    brandKit?.border_radius?.images ||
    '6px';
  const btnRadius =
    brandKit?.buttons?.primary?.border_radius ||
    brandKit?.border_radius?.buttons ||
    '4px';
  const name = brandKit?.brand?.name || 'Publisher';
  return { primary, text, muted, font, radius, btnRadius, name };
}

function standardCore(brandKit, extras = {}) {
  const t = commonVisualTokens(brandKit);
  return [
    prop({
      id: 'primary-color',
      label: 'Primary brand color',
      tokenPath: 'colors.primary.hex',
      value: t.primary,
      tier: 'standard',
      trcTargets: [TRC_TARGETS.cardTitleHover, TRC_TARGETS.preLabel, TRC_TARGETS.moreBtn, TRC_TARGETS.feedHeader],
      abImplication: 'MVP paint — measurable CTR/brand-fit lift with zero platform work.',
      notes: 'Maps to CTA, accent rule, title hover underline, pre-label.',
      sourceVisual: {
        kind: 'color-chip-header',
        primary: t.primary,
        label: t.name,
        caption: extras.primaryCaption || 'Header / CTA accent on publisher site',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'mvp',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: t.radius,
        btnRadius: t.btnRadius,
        highlight: 'accent',
        title: extras.sampleTitle || 'Sample feed headline matching publisher tone',
        source: (t.name || '').toLowerCase().replace(/\s+/g, '') + '.com',
      },
    }),
    prop({
      id: 'headline-font',
      label: 'Headline font family',
      tokenPath: 'fonts.primary.family',
      value: t.font,
      tier: 'standard',
      trcTargets: [TRC_TARGETS.cardTitle, TRC_TARGETS.branding],
      abImplication: 'MVP — largest native-feel lever after colour.',
      sourceVisual: {
        kind: 'type-specimen',
        font: t.font,
        text: t.text,
        sample: extras.typeSample || t.name,
        caption: 'Publisher article / card title type',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'mvp',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: t.radius,
        btnRadius: t.btnRadius,
        highlight: 'title',
        title: extras.sampleTitle || 'Branded type on .video-title',
        source: t.name,
      },
    }),
    prop({
      id: 'card-radius',
      label: 'Card / thumbnail border radius',
      tokenPath: 'photo_style.thumbnail_format.border_radius',
      value: t.radius,
      tier: 'standard',
      trcTargets: [TRC_TARGETS.thumbnail, TRC_TARGETS.card],
      abImplication: 'MVP — sharp vs rounded reads immediately as brand.',
      sourceVisual: {
        kind: 'radius-card',
        radius: t.radius,
        primary: t.primary,
        caption: `Publisher media corners (${t.radius})`,
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'mvp',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: t.radius,
        btnRadius: t.btnRadius,
        highlight: 'thumb',
        title: extras.sampleTitle || 'Thumbnail radius matched to brand',
        source: t.name,
      },
    }),
    prop({
      id: 'cta-button',
      label: 'CTA / See more button',
      tokenPath: 'buttons.primary',
      value: `${t.primary} · radius ${t.btnRadius}`,
      tier: 'standard',
      trcTargets: [TRC_TARGETS.moreBtn],
      abImplication: 'MVP — loader can restyle .tbl-feed-more-btn.',
      sourceVisual: {
        kind: 'button',
        primary: t.primary,
        btnRadius: t.btnRadius,
        font: t.font,
        label: extras.ctaLabel || 'Subscribe',
        caption: 'Publisher primary CTA',
      },
      feedVisual: {
        kind: 'more-button',
        primary: t.primary,
        btnRadius: t.btnRadius,
        font: t.font,
        label: extras.moreLabel || 'Show more',
      },
    }),
  ];
}

function lekkerProperties(brandKit) {
  const t = commonVisualTokens(brandKit);
  const softMint = brandKit?.colors?.accent?.soft_mint?.hex || '#b2dcc0';
  const yellow = brandKit?.colors?.secondary?.hex || '#faeb5b';
  return [
    ...standardCore(brandKit, {
      primaryCaption: 'Forest green masthead + newsletter CTA',
      typeSample: 'Leckerschmecker',
      sampleTitle: 'Spargel-Pasta: Das Rezept für den Frühling',
      ctaLabel: 'Newsletter',
      moreLabel: 'Mehr Empfehlungen laden',
    }),
    prop({
      id: 'anzeige-pill',
      label: 'Sponsored label (Anzeige pill)',
      tokenPath: 'recipe_card.sponsor_label',
      value: `${softMint} / #000`,
      tier: 'partial',
      trcTargets: [TRC_TARGETS.sponsored],
      abImplication: 'Partial — single badge style only; mint pill vs black bar is a fidelity tradeoff.',
      notes: 'Transformer exposes one sponsored badge style; Lekker uses soft-mint pills.',
      sourceVisual: {
        kind: 'badge',
        bg: softMint,
        color: '#000',
        label: 'Anzeige',
        radius: '9999px',
        caption: 'Soft-mint Anzeige on Lekker cards',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'sponsored',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: t.btnRadius,
        badgeBg: softMint,
        badgeColor: '#000',
        badgeLabel: 'Anzeige',
        badgeRadius: '9999px',
        highlight: 'badge',
        title: 'Solaranlage für Ihr Dach: Jetzt bis zu 40% sparen',
        source: 'solar-vergleich.de',
      },
    }),
    prop({
      id: 'cook-time',
      label: 'Cook / prep time on organic cards',
      tokenPath: 'layout_patterns.content_cards.recipe',
      value: 'Image + title + prep time badge + ingredient count',
      tier: 'unique',
      trcTargets: [],
      abImplication: 'Unique — highest food-vertical RPM bet; needs card meta field or custom UI mode.',
      notes: 'Ideal prototype shows ⏱ 25 Min. under source. No TRC DOM hook today.',
      sourceVisual: {
        kind: 'recipe-strip',
        primary: t.primary,
        items: [
          { strong: '30 Min.', label: 'Zubereitungszeit' },
          { strong: '4', label: 'Portionen' },
          { strong: 'Einfach', label: 'Schwierigkeit' },
        ],
        caption: 'Recipe meta strip on leckerschmecker.me',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'unique-meta',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: t.btnRadius,
        highlight: 'meta',
        title: 'Karamellisierte Spargel-Pasta: Das Rezept für den Frühling',
        source: 'leckerschmecker.me',
        uniqueMeta: '⏱ 25 Min.',
        platformNote: 'Requires new card field / custom mode',
      },
    }),
    prop({
      id: 'mehr-von-section',
      label: '“Mehr von …” organic section band',
      tokenPath: 'layout_patterns.header.layers',
      value: 'Section label + 2×2 organic grid with cook times',
      tier: 'unique',
      trcTargets: [],
      abImplication: 'Unique — recirculation layout; not expressible as paint on thumbs-feed-01.',
      sourceVisual: {
        kind: 'section-label',
        primary: t.primary,
        font: t.font,
        label: 'Mehr von Leckerschmecker',
        caption: 'Publisher organic discovery pattern',
      },
      feedVisual: {
        kind: 'section-grid',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        label: 'Mehr von Leckerschmecker',
        platformNote: 'Needs custom UI mode / section composition',
      },
    }),
    prop({
      id: 'brand-voice-tone',
      label: 'Brand voice / headline tone',
      tokenPath: 'brand_voice.tone',
      value: brandKit?.brand_voice?.tone || 'Warm, enthusiastic food inspiration',
      tier: 'soft',
      trcTargets: [],
      abImplication: 'Soft — Gen AI (or editorial) rewrite; not loader CSS.',
      notes: 'Hand-authored in ideal After panel. Live enrich.js not on main.',
      sourceVisual: {
        kind: 'voice',
        primary: t.primary,
        font: t.font,
        tone: brandKit?.brand_voice?.tone || 'Warm, enthusiastic',
        sample: 'Käse-Puffs aus dem Airfryer: einfacher Snack für jeden Tag',
        caption: 'Sentence-case, appetizing German headlines',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'soft-copy',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: t.btnRadius,
        highlight: 'title',
        title: 'Weißer Grieche Aufstrich: Fertig in nur 10 Minuten',
        source: 'leckerschmecker.me',
        softNote: 'Suggested copy — Gen AI translation stubbed',
      },
    }),
    prop({
      id: 'pill-buttons',
      label: 'Pill button radius (9999px)',
      tokenPath: 'border_radius.buttons',
      value: brandKit?.border_radius?.buttons || '9999px',
      tier: 'standard',
      trcTargets: [TRC_TARGETS.moreBtn],
      abImplication: 'MVP — more-button radius is loader-safe.',
      sourceVisual: {
        kind: 'button',
        primary: yellow,
        textColor: t.primary,
        btnRadius: '9999px',
        font: t.font,
        label: 'Newsletter',
        caption: 'Yellow pill CTA on dark green header',
      },
      feedVisual: {
        kind: 'more-button',
        primary: t.primary,
        btnRadius: '9999px',
        font: t.font,
        label: 'Mehr Empfehlungen laden',
      },
    }),
  ];
}

function biProperties(brandKit) {
  const t = commonVisualTokens(brandKit);
  const red = brandKit?.colors?.secondary?.hex || '#E03625';
  return [
    ...standardCore(brandKit, {
      primaryCaption: 'BI Orange subscribe + section rules',
      typeSample: 'BUSINESS INSIDER',
      sampleTitle: 'Markets are bracing for a pivotal Fed decision',
      ctaLabel: 'Subscribe',
      moreLabel: 'Show more',
    }),
    prop({
      id: 'orange-accent-dot',
      label: 'Section accent orange dot',
      tokenPath: 'colors.primary.hex',
      value: t.primary,
      tier: 'partial',
      trcTargets: [TRC_TARGETS.feedHeader],
      abImplication: 'Partial — can fake with ::before on header text in loader; not a first-class Transformer prop.',
      sourceVisual: {
        kind: 'accent-dot',
        primary: t.primary,
        text: t.text,
        font: t.font,
        label: 'MARKETS',
        caption: 'BI section kicker with orange dot',
      },
      feedVisual: {
        kind: 'feed-header',
        primary: t.primary,
        text: t.text,
        font: t.font,
        label: 'More From Business Insider',
        withDot: true,
      },
    }),
    prop({
      id: 'breaking-kicker',
      label: 'BREAKING / LIVE / OPINION kickers',
      tokenPath: 'brand_voice.content_labels',
      value: Object.keys(brandKit?.brand_voice?.content_labels || {}).join(', '),
      tier: 'unique',
      trcTargets: [TRC_TARGETS.preLabel],
      abImplication: 'Unique inventory — one pre-label colour exists; multi-label system needs platform.',
      notes: 'BI red BREAKING vs orange OPINION vs yellow PREMIUM.',
      sourceVisual: {
        kind: 'kicker-row',
        items: [
          { bg: red, color: '#fff', label: 'BREAKING' },
          { bg: t.primary, color: '#fff', label: 'OPINION' },
          { bg: '#FFC700', color: '#111', label: 'BI PREMIUM' },
        ],
        caption: 'Multi-badge system on BI article pages',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'unique-meta',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: '2px',
        highlight: 'kicker',
        kicker: 'OPINION',
        kickerColor: t.primary,
        title: 'Why this market rally may not last',
        source: 'businessinsider.com',
        platformNote: 'Per-label styles need custom mode slots',
      },
    }),
    prop({
      id: 'brand-voice-bi',
      label: 'Editorial voice / sentence-case news',
      tokenPath: 'brand_voice.headline_style',
      value: brandKit?.brand_voice?.headline_style?.pattern || 'sentence case editorial',
      tier: 'soft',
      trcTargets: [],
      abImplication: 'Soft — Gen AI or editorial rewrite of feed headlines.',
      sourceVisual: {
        kind: 'voice',
        primary: t.primary,
        font: t.font,
        tone: 'Factual, scannable business news with occasional BREAKING prefix',
        sample: 'Apple is preparing a major AI overhaul for the iPhone',
        caption: 'BI headline style on site',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'soft-copy',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: '2px',
        highlight: 'title',
        title: 'Apple is preparing a major AI overhaul for the iPhone',
        source: 'businessinsider.com',
        softNote: 'Suggested copy — Gen AI translation stubbed',
      },
    }),
  ];
}

function foxProperties(brandKit) {
  const t = commonVisualTokens(brandKit);
  const live = brandKit?.colors?.accents?.negative_red?.hex || '#E31C3D';
  return [
    ...standardCore(brandKit, {
      primaryCaption: 'FOX Blue accents on dark navy header',
      typeSample: 'FOX SPORTS',
      sampleTitle: 'NFL Draft: Top prospects to watch tonight',
      ctaLabel: 'Watch Live',
      moreLabel: 'Show more',
    }),
    prop({
      id: 'live-badge',
      label: 'LIVE badge / score-adjacent kicker',
      tokenPath: 'brand_voice.content_labels.live',
      value: 'LIVE',
      tier: 'unique',
      trcTargets: [TRC_TARGETS.preLabel],
      abImplication: 'Unique — LIVE pulse + score line is sports-native; needs card meta + optional motion.',
      sourceVisual: {
        kind: 'live-badge',
        live,
        primary: t.primary,
        caption: 'LIVE indicator on FOX Sports score modules',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'unique-meta',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: '4px',
        highlight: 'kicker',
        kicker: 'LIVE',
        kickerColor: live,
        title: 'Chiefs vs Bills — 4th quarter thriller',
        source: 'foxsports.com',
        uniqueMeta: 'KC 24 · BUF 21',
        platformNote: 'Score/LIVE meta not in standard thumbs card',
      },
    }),
    prop({
      id: 'premium-card-types',
      label: 'Premium Feed card compositions (1×1 / 2×1 / 4×1)',
      tokenPath: 'layout_patterns.content_cards',
      value: 'Mixed stream card types',
      tier: 'unique',
      trcTargets: [],
      abImplication: 'Unique — composition change, not CSS paint on a single mode.',
      sourceVisual: {
        kind: 'card-types',
        primary: t.primary,
        caption: 'FOX Premium Feed mixed card stream',
      },
      feedVisual: {
        kind: 'premium-stream',
        primary: t.primary,
        text: t.text,
        font: t.font,
        platformNote: 'Requires Premium Feed / custom UI mode',
      },
    }),
    prop({
      id: 'brand-voice-fox',
      label: 'Sports headline voice (Title Case energy)',
      tokenPath: 'brand_voice.headline_style',
      value: brandKit?.brand_voice?.headline_style?.case || 'title case',
      tier: 'soft',
      trcTargets: [],
      abImplication: 'Soft — Gen AI rewrite into sports Title Case energy.',
      sourceVisual: {
        kind: 'voice',
        primary: t.primary,
        font: t.font,
        tone: 'Bold, urgent sports commentary',
        sample: 'MLB Midseason Awards: MVP Favorites at the Halfway Mark',
        caption: 'FOX Sports headline style',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'soft-copy',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '0px',
        btnRadius: '4px',
        highlight: 'title',
        title: 'MLB Midseason Awards: MVP Favorites at the Halfway Mark',
        source: 'foxsports.com',
        softNote: 'Suggested copy — Gen AI translation stubbed',
      },
    }),
  ];
}

function twcProperties(brandKit) {
  const t = commonVisualTokens(brandKit);
  const severe = brandKit?.colors?.accents?.warning_yellow?.hex || '#FFCC00';
  const alertRed = brandKit?.colors?.accents?.negative_red?.hex || '#D32F2F';
  return [
    ...standardCore(brandKit, {
      primaryCaption: 'TWC Blue CTAs on navy masthead',
      typeSample: 'The Weather Channel',
      sampleTitle: 'Here\'s why this weekend\'s storm risk is rising',
      ctaLabel: 'See Forecast',
      moreLabel: 'Show more',
    }),
    prop({
      id: 'severe-badge',
      label: 'SEVERE WEATHER / alert badges',
      tokenPath: 'brand_voice.content_labels.severe_weather',
      value: 'SEVERE WEATHER',
      tier: 'unique',
      trcTargets: [TRC_TARGETS.preLabel],
      abImplication: 'Unique — alert colour system is weather-native RPM; needs multi-badge + urgency styling.',
      sourceVisual: {
        kind: 'kicker-row',
        items: [
          { bg: alertRed, color: '#fff', label: 'SEVERE' },
          { bg: severe, color: '#111', label: 'WATCH' },
          { bg: t.primary, color: '#fff', label: 'FORECAST' },
        ],
        caption: 'Alert chips on weather.com',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'unique-meta',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '6px',
        btnRadius: '4px',
        highlight: 'kicker',
        kicker: 'SEVERE',
        kickerColor: alertRed,
        title: 'Tornado Watch expands across the Midwest tonight',
        source: 'weather.com',
        uniqueMeta: 'Until 10 PM CDT',
        platformNote: 'Alert meta + multi-badge need custom mode',
      },
    }),
    prop({
      id: 'truenative-layout',
      label: 'TrueNative mobile feed composition',
      tokenPath: 'layout_patterns',
      value: 'TrueNative iPhone feed modules',
      tier: 'unique',
      trcTargets: [],
      abImplication: 'Unique — layout/product mode, not paint on default thumbs.',
      sourceVisual: {
        kind: 'phone-frame',
        primary: t.primary,
        caption: 'TWC TrueNative mobile modules',
      },
      feedVisual: {
        kind: 'phone-feed',
        primary: t.primary,
        text: t.text,
        font: t.font,
        platformNote: 'TrueNative / custom mobile mode',
      },
    }),
    prop({
      id: 'brand-voice-twc',
      label: 'Conversational forecast voice',
      tokenPath: 'brand_voice.headline_style',
      value: brandKit?.brand_voice?.headline_style?.pattern || 'Here\'s / Why / How explainers',
      tier: 'soft',
      trcTargets: [],
      abImplication: 'Soft — Gen AI rewrite into accessible forecast voice.',
      sourceVisual: {
        kind: 'voice',
        primary: t.primary,
        font: t.font,
        tone: brandKit?.brand_voice?.tone || 'Conversational, informative',
        sample: 'Here\'s what to expect from this weekend\'s cold front',
        caption: 'TWC sentence-case explainer style',
      },
      feedVisual: {
        kind: 'feed-card',
        variant: 'soft-copy',
        primary: t.primary,
        text: t.text,
        muted: t.muted,
        font: t.font,
        radius: '6px',
        btnRadius: '4px',
        highlight: 'title',
        title: 'Here\'s what to expect from this weekend\'s cold front',
        source: 'weather.com',
        softNote: 'Suggested copy — Gen AI translation stubbed',
      },
    }),
  ];
}

const BUILDERS = {
  leckerschmecker: lekkerProperties,
  'business-insider': biProperties,
  'fox-sports': foxProperties,
  'weather-channel': twcProperties,
};

function buildPublisherProperties(slug, brandKit) {
  const fn = BUILDERS[slug];
  if (!fn) {
    return standardCore(brandKit);
  }
  return fn(brandKit);
}

module.exports = {
  buildPublisherProperties,
  BUILDERS,
  commonVisualTokens,
};
