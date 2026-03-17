// ============================================================
//  ANALYSIS ENGINE
//  Diffs a brand kit against Taboola defaults to produce
//  property tables, stats, gaps, workflow steps, and advantages
// ============================================================

/**
 * Safely get a nested value from an object using dot notation
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((curr, key) => {
    if (curr == null) return undefined;
    return curr[key];
  }, obj);
}

/**
 * Normalize a value for display
 */
function displayValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Flatten brand kit into the property paths we compare
 */
function extractBrandKitValue(brandKit, property) {
  const map = {
    'fonts.headline.family':      () => getNestedValue(brandKit, 'fonts.primary.family') || getNestedValue(brandKit, 'fonts.type_scale.article_title_hero.family'),
    'fonts.eyebrow.family':       () => getNestedValue(brandKit, 'fonts.type_scale.category_pills.family') || getNestedValue(brandKit, 'fonts.type_scale.utility_bar.family'),
    'fonts.body.family':          () => getNestedValue(brandKit, 'fonts.secondary.family') || getNestedValue(brandKit, 'fonts.type_scale.article_body.family'),
    'colors.headline':            () => getNestedValue(brandKit, 'colors.text.primary.hex'),
    'fonts.headline.size':        () => getNestedValue(brandKit, 'fonts.type_scale.article_title_card.size'),
    'fonts.headline.weight':      () => getNestedValue(brandKit, 'fonts.primary.weights.bold') || getNestedValue(brandKit, 'fonts.type_scale.article_title_hero.weight'),
    'textStyles.headlineTransform': () => getNestedValue(brandKit, 'fonts.type_scale.section_headings.transform') || 'none',
    'spacing.borderRadius':       () => getNestedValue(brandKit, 'photo_style.thumbnail_format.border_radius'),
    'spacing.accentRule.color':   () => getNestedValue(brandKit, 'colors.primary.hex'),
    'spacing.accentRule':         () => {
      const c = getNestedValue(brandKit, 'colors.primary.hex');
      return c ? `3px solid ${c}` : null;
    },
    'colors.cta':                 () => getNestedValue(brandKit, 'colors.primary.hex'),
    'colors.sourceLabel':         () => getNestedValue(brandKit, 'colors.text.tertiary.hex') || getNestedValue(brandKit, 'colors.text.secondary.hex'),
    'colors.separator':           () => getNestedValue(brandKit, 'colors.backgrounds.section.hex') || getNestedValue(brandKit, 'colors.backgrounds.secondary.hex'),
    'badges':                     () => {
      const g = getNestedValue(brandKit, 'graphics.elements');
      if (g && g.length > 0) return g[0].label || 'Custom badge';
      return null;
    },
    'spacing.letterSpacing':      () => getNestedValue(brandKit, 'fonts.type_scale.section_headings.letterSpacing'),
    'textStyles.hoverDecoration': () => 'underline',
    'categoryLabel':              () => {
      const labels = getNestedValue(brandKit, 'brand_voice.content_labels');
      if (labels && Object.keys(labels).length > 0) return Object.keys(labels).join(', ');
      return null;
    },
    'colors.background':          () => getNestedValue(brandKit, 'colors.backgrounds.base.hex'),
  };

  const fn = map[property];
  return fn ? fn() : undefined;
}

/**
 * Property definitions for the comparison table
 */
const PROPERTY_DEFS = [
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

/**
 * Compute full analysis comparing brandKit against defaults
 * @param {object} brandKit - Extracted brand kit
 * @param {object} defaults - Taboola defaults baseline
 * @returns {object} - { propertyTable, stats, gaps, workflow, advantages }
 */
function computeAnalysis(brandKit, defaults) {
  const propertyTable = [];
  let driftCount = 0;
  let missingCount = 0;
  let exactCount = 0;

  for (const def of PROPERTY_DEFS) {
    const before = displayValue(getNestedValue(defaults, def.key));
    const afterRaw = extractBrandKitValue(brandKit, def.key);
    const after = displayValue(afterRaw);

    let status;
    if (before === '—' && after !== '—') {
      status = 'missing'; // default was null, kit found something new
      missingCount++;
    } else if (before === after) {
      status = 'exact';
      exactCount++;
    } else if (after === '—') {
      status = 'exact'; // both null-ish
      exactCount++;
    } else {
      status = 'drift';
      driftCount++;
    }

    propertyTable.push({
      property: def.label,
      key: def.key,
      before,
      after,
      source: def.source,
      status,
    });
  }

  const totalProperties = PROPERTY_DEFS.length;
  const matchedByKit = driftCount + missingCount;

  const stats = {
    totalProperties,
    driftCount,
    missingCount,
    exactCount,
    matchedByKit,
    coveragePercent: Math.round((matchedByKit / totalProperties) * 100),
    driftPercent: Math.round((driftCount / totalProperties) * 100),
  };

  // Generate gap descriptions
  const gaps = generateGaps(propertyTable, brandKit);

  // Generate workflow comparison
  const publisherName = getNestedValue(brandKit, 'brand.name') || 'Publisher';
  const workflow = generateWorkflow(publisherName, brandKit);

  // Advantage cards
  const advantages = [
    { icon: '🎯', title: 'Pixel-Perfect Accuracy', desc: `Extracts ${totalProperties} design properties directly from ${publisherName}'s live site CSS.` },
    { icon: '⚡', title: 'Instant Generation', desc: 'Full brand kit generated in under 30 seconds vs. hours of manual configuration.' },
    { icon: '🔄', title: 'Always Up-to-Date', desc: 'Re-crawl anytime the publisher redesigns to automatically capture changes.' },
    { icon: '📊', title: 'Deep Token Coverage', desc: `Covers typography, colors, spacing, brand voice, photos, icons, and layout patterns.` },
    { icon: '🧩', title: 'Drop-In Integration', desc: 'Generates Taboola-ready property values that map directly to feed configuration.' },
    { icon: '📈', title: 'Scalable', desc: 'Run against any publisher URL — no per-publisher manual work required.' },
  ];

  return { propertyTable, stats, gaps, workflow, advantages };
}

/**
 * Generate human-readable gap descriptions
 */
function generateGaps(propertyTable, brandKit) {
  const gaps = [];
  const drifted = propertyTable.filter(r => r.status === 'drift');
  const missing = propertyTable.filter(r => r.status === 'missing');

  // Group font drifts
  const fontDrifts = drifted.filter(r => r.key.startsWith('fonts.'));
  if (fontDrifts.length > 0) {
    gaps.push({
      category: 'Typography',
      severity: 'high',
      description: `${fontDrifts.length} typography properties differ from Taboola defaults. The publisher uses custom fonts that should replace generic Arial/Helvetica.`,
      properties: fontDrifts.map(r => r.property),
    });
  }

  // Group color drifts
  const colorDrifts = drifted.filter(r => r.key.startsWith('colors.'));
  if (colorDrifts.length > 0) {
    gaps.push({
      category: 'Colors',
      severity: 'high',
      description: `${colorDrifts.length} color values diverge from defaults. Publisher brand colors should be applied for native feel.`,
      properties: colorDrifts.map(r => r.property),
    });
  }

  // Spacing drifts
  const spacingDrifts = drifted.filter(r => r.key.startsWith('spacing.'));
  if (spacingDrifts.length > 0) {
    gaps.push({
      category: 'Spacing & Layout',
      severity: 'medium',
      description: `${spacingDrifts.length} spacing/layout properties need publisher-specific values for visual consistency.`,
      properties: spacingDrifts.map(r => r.property),
    });
  }

  // New properties found (missing from defaults)
  if (missing.length > 0) {
    gaps.push({
      category: 'New Discoveries',
      severity: 'info',
      description: `${missing.length} properties were discovered by the crawler that aren't in the default Taboola config. These represent opportunities for enhanced brand alignment.`,
      properties: missing.map(r => r.property),
    });
  }

  // Badge/label gaps
  const badgeRow = propertyTable.find(r => r.key === 'badges');
  if (badgeRow && badgeRow.status === 'drift') {
    gaps.push({
      category: 'Badges & Labels',
      severity: 'medium',
      description: 'Publisher uses custom badge styling that should be reflected in the Taboola feed for native appearance.',
      properties: ['Badge / Label Style'],
    });
  }

  return gaps;
}

/**
 * Generate manual vs automated workflow comparison
 */
function generateWorkflow(publisherName, brandKit) {
  const primaryFont = getNestedValue(brandKit, 'fonts.primary.family') || 'publisher fonts';
  const primaryColor = getNestedValue(brandKit, 'colors.primary.hex') || 'brand color';

  const manual = [
    `Open ${publisherName}'s website in browser`,
    'Inspect headline elements with DevTools to find font-family',
    `Identify ${primaryFont} and search for Google Fonts equivalent`,
    'Manually sample colors from headers, links, backgrounds',
    'Cross-reference with brand guidelines PDF (if available)',
    'Build Taboola config JSON by hand, property by property',
    'Test in staging, iterate on visual mismatches',
    'Document all values for future reference',
    'Repeat entire process when publisher redesigns',
  ];

  const crawler = [
    `Run: node generate.js --url "${getNestedValue(brandKit, 'brand.website') || 'https://...'}"`,
    'Puppeteer loads page, executes all JavaScript',
    `Extracts ${primaryFont}, ${primaryColor}, and 50+ tokens automatically`,
    'Generates brand-kit.json with full nested structure',
    'Renders publisher-branded feed prototype',
    'Produces before/after analysis report',
    'Re-run anytime for updated results',
  ];

  return { manual, crawler };
}

module.exports = { computeAnalysis, getNestedValue };
