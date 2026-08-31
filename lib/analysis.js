// ============================================================
//  ANALYSIS ENGINE
//  Primary: kit field → live CP binding (cp-bindings.json)
//  Secondary: vs generic Taboola defaults (Arial 14/700) — optional column
// ============================================================

const defaultsBaseline = require('./defaults');
const aliases = require('./aliases');
const { ensureBaseKit } = require('./base-schema');
const { computeCpGaps, generateMechanicGaps, FEED_MECHANICS, DEAD_CTA_SELECTOR, LIVE_CTA_SELECTOR } = require('./cp-bindings');

const { nestGet, isEmpty, resolveField } = aliases;

function getNestedValue(obj, path) {
  return nestGet(obj, path);
}

function displayValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

/**
 * Read a comparison property from a (possibly legacy) kit.
 * Card title family/weight never fall back to article_title_hero.
 * Hover decoration is never invented as underline.
 * CTA and accent are separate fields — no colors.primary dual-write.
 */
function extractBrandKitValue(brandKit, property) {
  const map = {
    'fonts.headline.family': () => {
      const v = resolveField(brandKit, 'typography.headline.family');
      if (!isEmpty(v.value)) return v.value;
      const card = nestGet(brandKit, 'typography.card_title.family') || nestGet(brandKit, 'fonts.type_scale.article_title_card.family');
      return isEmpty(card) ? null : card;
    },
    'fonts.eyebrow.family': () => nestGet(brandKit, 'typography.kicker.family') || nestGet(brandKit, 'fonts.type_scale.category_pills.family') || null,
    'fonts.body.family': () => resolveField(brandKit, 'typography.body.family').value,
    'colors.headline': () => resolveField(brandKit, 'colors.text_headline').value,
    'fonts.headline.size': () => resolveField(brandKit, 'typography.card_title.size').value,
    'fonts.headline.weight': () => {
      const card = resolveField(brandKit, 'typography.card_title.weight');
      if (!isEmpty(card.value)) return card.value;
      return nestGet(brandKit, 'fonts.type_scale.article_title_card.weight') || null;
    },
    'textStyles.headlineTransform': () => resolveField(brandKit, 'typography.card_title.text_transform').value || resolveField(brandKit, 'typography.headline_case').value || null,
    'spacing.borderRadius': () => resolveField(brandKit, 'card.thumbnail.border_radius').value || resolveField(brandKit, 'card.border_radius').value,
    'spacing.accentRule.color': () => {
      const rule = resolveField(brandKit, 'chrome.header.accent_rule').value;
      if (!isEmpty(rule)) return rule;
      return resolveField(brandKit, 'colors.feed_accent').value;
    },
    'spacing.accentRule': () => {
      const c = nestGet(brandKit, 'chrome.header.accent_rule') || nestGet(brandKit, 'colors.feed_accent');
      return c ? String(c) : null;
    },
    'colors.cta': () => resolveField(brandKit, 'cta.sponsored.background').value,
    'colors.sourceLabel': () => resolveField(brandKit, 'colors.text_meta').value,
    'colors.separator': () => resolveField(brandKit, 'colors.border').value,
    'badges': () => {
      const enabled = nestGet(brandKit, 'badges.enabled');
      if (Array.isArray(enabled) && enabled.length) return enabled.join(', ');
      const labels = nestGet(brandKit, 'editorial_grammar.content_labels.labels_verbatim');
      if (Array.isArray(labels) && labels.length) return labels.join(', ');
      return null;
    },
    'spacing.letterSpacing': () => resolveField(brandKit, 'typography.card_title.letter_spacing').value || resolveField(brandKit, 'typography.feed_section_label.letter_spacing').value,
    'textStyles.hoverDecoration': () => {
      const underline = nestGet(brandKit, 'card.hover.headline_underline_color');
      if (isEmpty(underline)) return null;
      return underline;
    },
    'categoryLabel': () => {
      const labels = nestGet(brandKit, 'editorial_grammar.content_labels.labels_verbatim') || nestGet(brandKit, 'brand_voice.content_labels');
      if (Array.isArray(labels) && labels.length) return labels.join(', ');
      if (labels && typeof labels === 'object' && Object.keys(labels).length) return Object.keys(labels).join(', ');
      return null;
    },
    'colors.background': () => resolveField(brandKit, 'colors.page_background').value,
  };

  const fn = map[property];
  return fn ? fn() : undefined;
}

const PROPERTY_DEFS = [
  { key: 'fonts.headline.family',        label: 'Card title font family',   source: 'typography.headline.family' },
  { key: 'fonts.eyebrow.family',         label: 'Kicker / eyebrow font',    source: 'typography.kicker' },
  { key: 'fonts.body.family',            label: 'Body font family',         source: 'typography.body.family' },
  { key: 'colors.headline',              label: 'Headline color',           source: 'colors.text_headline' },
  { key: 'fonts.headline.size',          label: 'Card title size',          source: 'typography.card_title.size' },
  { key: 'fonts.headline.weight',        label: 'Card title weight',        source: 'typography.card_title.weight' },
  { key: 'textStyles.headlineTransform', label: 'Card title transform',     source: 'typography.card_title.text_transform' },
  { key: 'spacing.borderRadius',         label: 'Card / thumb radius',      source: 'card.border_radius' },
  { key: 'spacing.accentRule.color',     label: 'Header / feed accent',     source: 'chrome.header.accent_rule | colors.feed_accent' },
  { key: 'colors.cta',                   label: 'Sponsored CTA fill',       source: 'cta.sponsored.background' },
  { key: 'colors.sourceLabel',           label: 'Meta / source color',      source: 'colors.text_meta' },
  { key: 'colors.separator',             label: 'Border / separator',       source: 'colors.border' },
  { key: 'badges',                       label: 'Badge / label ids',        source: 'badges.enabled' },
  { key: 'spacing.letterSpacing',        label: 'Card title tracking',      source: 'typography.card_title.letter_spacing' },
  { key: 'textStyles.hoverDecoration',   label: 'Hover underline (crawled)', source: 'card.hover.headline_underline_color' },
  { key: 'categoryLabel',                label: 'Content labels',           source: 'editorial_grammar.content_labels' },
  { key: 'colors.background',            label: 'Page background',          source: 'colors.page_background' },
];

function computeVsDefaultsTable(brandKit, defaults) {
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
      status = 'missing';
      missingCount++;
    } else if (before === after || after === '—') {
      status = 'exact';
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

  return { propertyTable, driftCount, missingCount, exactCount };
}

function generateWorkflow(publisherName, brandKit) {
  const headlineFont = nestGet(brandKit, 'typography.headline.family') || 'publisher fonts';
  const cta = nestGet(brandKit, 'cta.sponsored.background') || nestGet(brandKit, 'colors.feed_accent') || 'crawled tokens';

  const manual = [
    `Open ${publisherName}'s website in browser`,
    'Inspect homepage card titles (not article hero) for family/weight',
    `Identify ${headlineFont} and search for Google Fonts equivalent`,
    'Sample CTA fill from live buttons; sample header rule separately — never one primary for both',
    'Cross-reference with brand guidelines PDF (if available)',
    'Map each kit field to a live CP selector (not .tbl-cta-style .cta-button)',
    'Test in staging, iterate on visual mismatches',
    'Document all values for future reference',
    'Repeat entire process when publisher redesigns',
  ];

  const crawler = [
    `Run: node generate.js --url "${nestGet(brandKit, 'brand.website') || 'https://...'}"`,
    'Puppeteer loads page, executes all JavaScript',
    `Extracts ${headlineFont}, CTA/accent as separate roles, and base-template fields`,
    'Writes publisher-brand-kit.base@1.1.0 (nulls left null; no unique top-level keys)',
    'Diffs kit fields against live CP bindings',
    'Renders publisher-branded feed prototype',
    'Re-run anytime for updated results',
  ];

  return { manual, crawler };
}

/**
 * Compute full analysis. Primary table is CP bindings.
 * @param {object} brandKit
 * @param {object} [defaults]
 */
function computeAnalysis(brandKit, defaults) {
  const baseline = defaults || defaultsBaseline;
  const kit = ensureBaseKit(brandKit, { provenanceNote: 'analysis normalized to base schema' });

  const cpGaps = computeCpGaps(kit, baseline);
  const vsDefaults = computeVsDefaultsTable(kit, baseline);

  const filledMapped = cpGaps.rows.filter(r => r.filled && r.status === 'MAPPED_LIVE').length;
  const filledTotal = cpGaps.rows.filter(r => r.filled).length;
  const liveTotal = cpGaps.rows.filter(r => r.status === 'MAPPED_LIVE').length;

  const stats = {
    totalProperties: cpGaps.rows.length,
    filledKitFields: filledTotal,
    liveMappedFilled: filledMapped,
    liveMappedTotal: liveTotal,
    deadSelectorCount: cpGaps.rows.filter(r => r.status === 'DEAD_SELECTOR').length,
    needsNewCpCount: cpGaps.rows.filter(r => r.status === 'NEEDS_NEW_CP' || r.status === 'NEEDS_RENDERER').length,
    driftCount: vsDefaults.driftCount,
    missingCount: vsDefaults.missingCount,
    exactCount: vsDefaults.exactCount,
    matchedByKit: filledTotal,
    coveragePercent: liveTotal ? Math.round((filledMapped / liveTotal) * 100) : 0,
    driftPercent: vsDefaults.propertyTable.length ? Math.round((vsDefaults.driftCount / vsDefaults.propertyTable.length) * 100) : 0,
  };

  const gaps = generateMechanicGaps(cpGaps).concat(generateLegacyStyleGaps(vsDefaults.propertyTable));

  const publisherName = nestGet(kit, 'brand.name') || 'Publisher';
  const workflow = generateWorkflow(publisherName, kit);

  const advantages = [
    { icon: '🎯', title: 'Base schema, not a unique crawl shape', desc: `Emits publisher-brand-kit.base@1.1.0. Unique grammar stays in editorial_grammar + requires_new_client_properties.` },
    { icon: '🔗', title: 'Diff vs live CP bindings', desc: `Primary gap table is kit field → live selector. Dead selector ${DEAD_CTA_SELECTOR} is flagged; live CTA is ${LIVE_CTA_SELECTOR}.` },
    { icon: '🚫', title: 'No primary overload', desc: 'CTA fill and feed/header accent are separate. One colors.primary dump never writes both.' },
    { icon: '✏️', title: 'Hover only if crawled', desc: 'Hover decoration is never defaulted to underline. Recolour/keep only when observed.' },
    { icon: '🃏', title: 'Card scale ≠ article hero', desc: 'Card title family/weight come from typography.card_title only. Hero stays typography.article_hero_title.' },
    { icon: '📺', title: 'Live feed mechanics', desc: 'Syndicated twins, ctaWidget gate, video-cta-style-removed, cube hover wash — documented in the gap table.' },
  ];

  return {
    propertyTable: vsDefaults.propertyTable,
    cpGapTable: cpGaps.rows,
    cpStatusCounts: cpGaps.statusCounts,
    feedMechanics: FEED_MECHANICS,
    stats,
    gaps,
    workflow,
    advantages,
  };
}

function generateLegacyStyleGaps(propertyTable) {
  const gaps = [];
  const drifted = propertyTable.filter(r => r.status === 'drift');
  const fontDrifts = drifted.filter(r => r.key.startsWith('fonts.'));
  if (fontDrifts.length > 0) {
    gaps.push({
      category: 'Typography vs generic defaults',
      severity: 'medium',
      description: `${fontDrifts.length} typography properties differ from generic Arial/Helvetica defaults. Secondary comparison only — primary gap is the CP table.`,
      properties: fontDrifts.map(r => r.property),
    });
  }
  return gaps;
}

module.exports = {
  computeAnalysis,
  getNestedValue,
  extractBrandKitValue,
  PROPERTY_DEFS,
};
