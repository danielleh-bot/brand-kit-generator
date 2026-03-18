// ============================================================
//  ANALYSIS ENGINE (Browser-compatible)
//  Diffs brand kit vs Taboola defaults
// ============================================================

const TABOOLA_DEFAULTS = {
  fonts: {
    headline: { family: 'Arial, Helvetica, sans-serif', weight: 700, transform: 'none', size: '14px', lineHeight: '1.3' },
    eyebrow: { family: 'Arial, Helvetica, sans-serif', size: '12px', weight: 400, transform: 'none', letterSpacing: '0' },
    body: { family: 'Arial, Helvetica, sans-serif', size: '14px', weight: 400, lineHeight: '1.5' }
  },
  colors: {
    headline: '#333333', body: '#666666', background: '#FFFFFF', cta: '#1a73e8',
    sourceLabel: '#888888', separator: '#f3f4f6', badgeBg: '#f3f4f6', badgeText: '#666666', hoverHighlight: null
  },
  spacing: { borderRadius: '6px', letterSpacing: '0', cardGap: '16px', accentRule: null },
  textStyles: { headlineWeight: 700, headlineTransform: 'none', hoverDecoration: 'none' },
  badges: { label: 'Sponsored', bg: '#f3f4f6', text: '#666666' },
  categoryLabel: null, watermark: null, thumbnailAspectRatio: '4:3'
};

function _getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, key) => (curr == null ? undefined : curr[key]), obj);
}

function _displayValue(val) {
  if (val === null || val === undefined) return '\u2014';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function _extractBrandKitValue(brandKit, property) {
  const map = {
    'fonts.headline.family':      () => _getNestedValue(brandKit, 'fonts.primary.family') || _getNestedValue(brandKit, 'fonts.type_scale.article_title_hero.family'),
    'fonts.eyebrow.family':       () => _getNestedValue(brandKit, 'fonts.type_scale.category_pills.family') || _getNestedValue(brandKit, 'fonts.type_scale.utility_bar.family'),
    'fonts.body.family':          () => _getNestedValue(brandKit, 'fonts.secondary.family') || _getNestedValue(brandKit, 'fonts.type_scale.article_body.family'),
    'colors.headline':            () => _getNestedValue(brandKit, 'colors.text.primary.hex'),
    'fonts.headline.size':        () => _getNestedValue(brandKit, 'fonts.type_scale.article_title_card.size'),
    'fonts.headline.weight':      () => _getNestedValue(brandKit, 'fonts.primary.weights.bold') || _getNestedValue(brandKit, 'fonts.type_scale.article_title_hero.weight'),
    'textStyles.headlineTransform': () => _getNestedValue(brandKit, 'fonts.type_scale.section_headings.transform') || 'none',
    'spacing.borderRadius':       () => _getNestedValue(brandKit, 'photo_style.thumbnail_format.border_radius'),
    'spacing.accentRule.color':   () => _getNestedValue(brandKit, 'colors.primary.hex'),
    'spacing.accentRule':         () => { const c = _getNestedValue(brandKit, 'colors.primary.hex'); return c ? `3px solid ${c}` : null; },
    'colors.cta':                 () => _getNestedValue(brandKit, 'colors.primary.hex'),
    'colors.sourceLabel':         () => _getNestedValue(brandKit, 'colors.text.tertiary.hex') || _getNestedValue(brandKit, 'colors.text.secondary.hex'),
    'colors.separator':           () => _getNestedValue(brandKit, 'colors.backgrounds.section.hex') || _getNestedValue(brandKit, 'colors.backgrounds.secondary.hex'),
    'badges':                     () => { const g = _getNestedValue(brandKit, 'graphics.elements'); if (g && g.length > 0) return g[0].label || 'Custom badge'; return null; },
    'spacing.letterSpacing':      () => _getNestedValue(brandKit, 'fonts.type_scale.section_headings.letterSpacing'),
    'textStyles.hoverDecoration': () => 'underline',
    'categoryLabel':              () => { const labels = _getNestedValue(brandKit, 'brand_voice.content_labels'); if (labels && Object.keys(labels).length > 0) return Object.keys(labels).join(', '); return null; },
    'colors.background':          () => _getNestedValue(brandKit, 'colors.backgrounds.base.hex'),
  };
  const fn = map[property];
  return fn ? fn() : undefined;
}

const ANALYSIS_PROPERTY_DEFS = [
  { key: 'fonts.headline.family',        label: 'Headline Font Family',     source: 'fonts.primary' },
  { key: 'fonts.eyebrow.family',         label: 'Eyebrow / Label Font',    source: 'fonts.type_scale' },
  { key: 'fonts.body.family',            label: 'Body Font Family',         source: 'fonts.secondary' },
  { key: 'colors.headline',              label: 'Headline Color',           source: 'colors.text' },
  { key: 'fonts.headline.size',          label: 'Headline Font Size',       source: 'fonts.type_scale' },
  { key: 'fonts.headline.weight',        label: 'Headline Font Weight',     source: 'fonts.primary' },
  { key: 'textStyles.headlineTransform', label: 'Headline Transform',       source: 'fonts.type_scale' },
  { key: 'spacing.borderRadius',         label: 'Card Border Radius',       source: 'photo_style' },
  { key: 'spacing.accentRule.color',     label: 'Accent Rule Color',        source: 'colors.primary' },
  { key: 'spacing.accentRule',           label: 'Accent Rule Style',        source: 'colors.primary' },
  { key: 'colors.cta',                   label: 'CTA / Link Color',        source: 'colors.primary' },
  { key: 'colors.sourceLabel',           label: 'Source Label Color',       source: 'colors.text' },
  { key: 'colors.separator',             label: 'Separator Color',          source: 'colors.backgrounds' },
  { key: 'badges',                       label: 'Badge / Label Style',      source: 'graphics' },
  { key: 'spacing.letterSpacing',        label: 'Letter Spacing',           source: 'fonts.type_scale' },
  { key: 'textStyles.hoverDecoration',   label: 'Hover Decoration',         source: 'textStyles' },
  { key: 'categoryLabel',                label: 'Category Labels',          source: 'brand_voice' },
  { key: 'colors.background',            label: 'Background Color',         source: 'colors.backgrounds' },
];

function computeAnalysis(brandKit) {
  const defaults = TABOOLA_DEFAULTS;
  const propertyTable = [];
  let driftCount = 0, missingCount = 0, exactCount = 0;

  for (const def of ANALYSIS_PROPERTY_DEFS) {
    const before = _displayValue(_getNestedValue(defaults, def.key));
    const afterRaw = _extractBrandKitValue(brandKit, def.key);
    const after = _displayValue(afterRaw);

    let status;
    if (before === '\u2014' && after !== '\u2014') {
      status = 'missing';
      missingCount++;
    } else if (before === after) {
      status = 'exact';
      exactCount++;
    } else if (after === '\u2014') {
      status = 'exact';
      exactCount++;
    } else {
      status = 'drift';
      driftCount++;
    }

    propertyTable.push({ property: def.label, key: def.key, before, after, source: def.source, status });
  }

  const totalProperties = ANALYSIS_PROPERTY_DEFS.length;
  const matchedByKit = driftCount + missingCount;

  const stats = {
    totalProperties, driftCount, missingCount, exactCount, matchedByKit,
    coveragePercent: Math.round((matchedByKit / totalProperties) * 100),
    driftPercent: Math.round((driftCount / totalProperties) * 100),
  };

  // Generate gaps
  const gaps = [];
  const drifted = propertyTable.filter(r => r.status === 'drift');
  const missing = propertyTable.filter(r => r.status === 'missing');

  const fontDrifts = drifted.filter(r => r.key.startsWith('fonts.'));
  if (fontDrifts.length > 0) {
    gaps.push({ category: 'Typography', severity: 'high', description: `${fontDrifts.length} typography properties differ from Taboola defaults. The publisher uses custom fonts that should replace generic Arial/Helvetica.`, properties: fontDrifts.map(r => r.property) });
  }
  const colorDrifts = drifted.filter(r => r.key.startsWith('colors.'));
  if (colorDrifts.length > 0) {
    gaps.push({ category: 'Colors', severity: 'high', description: `${colorDrifts.length} color values diverge from defaults. Publisher brand colors should be applied for native feel.`, properties: colorDrifts.map(r => r.property) });
  }
  const spacingDrifts = drifted.filter(r => r.key.startsWith('spacing.'));
  if (spacingDrifts.length > 0) {
    gaps.push({ category: 'Spacing & Layout', severity: 'medium', description: `${spacingDrifts.length} spacing/layout properties need publisher-specific values.`, properties: spacingDrifts.map(r => r.property) });
  }
  if (missing.length > 0) {
    gaps.push({ category: 'New Discoveries', severity: 'info', description: `${missing.length} properties discovered by the crawler that aren't in default Taboola config.`, properties: missing.map(r => r.property) });
  }

  // Workflow
  const publisherName = _getNestedValue(brandKit, 'brand.name') || 'Publisher';
  const primaryFont = _getNestedValue(brandKit, 'fonts.primary.family') || 'publisher fonts';
  const primaryColor = _getNestedValue(brandKit, 'colors.primary.hex') || 'brand color';
  const workflow = {
    manual: [
      `Open ${publisherName}'s website in browser`,
      'Inspect headline elements with DevTools to find font-family',
      `Identify ${primaryFont} and search for Google Fonts equivalent`,
      'Manually sample colors from headers, links, backgrounds',
      'Cross-reference with brand guidelines PDF (if available)',
      'Build Taboola config JSON by hand, property by property',
      'Test in staging, iterate on visual mismatches',
      'Document all values for future reference',
      'Repeat entire process when publisher redesigns',
    ],
    crawler: [
      `Enter ${publisherName}'s URL into the Brand Kit Generator`,
      'Crawler fetches page and parses all CSS styles',
      `Extracts ${primaryFont}, ${primaryColor}, and 50+ tokens automatically`,
      'Generates brand-kit.json with full nested structure',
      'Renders publisher-branded feed prototype',
      'Produces before/after analysis report',
      'Re-run anytime for updated results',
    ]
  };

  // Advantages
  const advantages = [
    { icon: '\u{1F3AF}', title: 'Pixel-Perfect Accuracy', desc: `Extracts ${totalProperties} design properties directly from ${publisherName}'s live site CSS.` },
    { icon: '\u26A1', title: 'Instant Generation', desc: 'Full brand kit generated in under 30 seconds vs. hours of manual configuration.' },
    { icon: '\u{1F504}', title: 'Always Up-to-Date', desc: 'Re-crawl anytime the publisher redesigns to automatically capture changes.' },
    { icon: '\u{1F4CA}', title: 'Deep Token Coverage', desc: 'Covers typography, colors, spacing, brand voice, photos, icons, and layout patterns.' },
    { icon: '\u{1F9E9}', title: 'Drop-In Integration', desc: 'Generates Taboola-ready property values that map directly to feed configuration.' },
    { icon: '\u{1F4C8}', title: 'Scalable', desc: 'Run against any publisher URL \u2014 no per-publisher manual work required.' },
  ];

  return { propertyTable, stats, gaps, workflow, advantages };
}
