#!/usr/bin/env node
// Spot-checks for brand-kit-generator Fix items. No network.

const assert = require('assert');
const { migrateLegacyToBase, countPrimaryOverload, nestGet } = require('../lib/aliases');
const { ensureBaseKit, emptyBaseKit } = require('../lib/base-schema');
const { extractBrandKitValue, computeAnalysis } = require('../lib/analysis');
const { DEAD_CTA_SELECTOR, LIVE_CTA_SELECTOR, computeCpGaps } = require('../lib/cp-bindings');

const template = emptyBaseKit();

// 1. Legacy colors.primary.hex must not write the same hex to CTA AND accent
const legacy = {
  colors: { primary: { hex: '#FF0000', usage: [] } },
  fonts: {
    type_scale: {
      article_title_hero: { family: 'HeroFont', weight: 900 },
      article_title_card: { family: 'CardFont', weight: 600, size: '18px' },
    },
    primary: { family: 'CardFont' },
  },
};
const migrated = migrateLegacyToBase(legacy, template, { migratedFrom: 'verify-fixture' });
const overload = countPrimaryOverload(migrated, '#FF0000');
assert.ok(overload <= 1, 'primary dump wrote to ' + overload + ' exclusive destinations');
const cta = nestGet(migrated, 'cta.sponsored.background');
const accent = nestGet(migrated, 'colors.feed_accent');
const rule = nestGet(migrated, 'chrome.header.accent_rule');
const hits = [cta, accent, rule].filter(v => v === '#FF0000');
assert.strictEqual(hits.length, 1, 'expected exactly one exclusive dest to receive #FF0000, got ' + hits.length);
assert.strictEqual(migrated.colors.primary, undefined, 'colors.primary must not be a write target');
console.log('ok  exclusive primary dump →', hits[0] === accent ? 'colors.feed_accent' : (hits[0] === cta ? 'cta' : 'accent_rule'));

// 1b. Dedicated button + primary: CTA from button, primary not also copied to CTA
const withButton = migrateLegacyToBase({
  colors: { primary: { hex: '#00AA00' } },
  buttons: { primary: { background_color: '#1111FF' } },
}, emptyBaseKit());
assert.strictEqual(nestGet(withButton, 'cta.sponsored.background'), '#1111FF');
assert.notStrictEqual(nestGet(withButton, 'colors.feed_accent'), '#1111FF');
assert.ok(countPrimaryOverload(withButton, '#00AA00') <= 1);
assert.ok(countPrimaryOverload(withButton, '#1111FF') <= 1);
console.log('ok  button fill ≠ primary dump on accent');

// 2. Hover default is not underline
const hoverRaw = extractBrandKitValue(migrated, 'textStyles.hoverDecoration');
assert.notStrictEqual(hoverRaw, 'underline');
assert.ok(hoverRaw == null || hoverRaw === undefined);
const analysis = computeAnalysis(migrated);
const hoverRow = analysis.propertyTable.find(r => r.key === 'textStyles.hoverDecoration');
assert.ok(hoverRow, 'hover row missing');
assert.notStrictEqual(hoverRow.after, 'underline');
console.log('ok  hover default is not underline (', hoverRow.after, ')');

// 3. Headline family/weight do not read article_title_hero
const family = extractBrandKitValue(legacy, 'fonts.headline.family');
const weight = extractBrandKitValue(legacy, 'fonts.headline.weight');
assert.notStrictEqual(family, 'HeroFont');
assert.notStrictEqual(weight, 900);
assert.strictEqual(family, 'CardFont');
assert.strictEqual(weight, 600);
const heroOnly = {
  fonts: { type_scale: { article_title_hero: { family: 'HeroOnly', weight: 900 } } },
};
assert.strictEqual(extractBrandKitValue(heroOnly, 'fonts.headline.family'), null);
assert.strictEqual(extractBrandKitValue(heroOnly, 'fonts.headline.weight'), null);
console.log('ok  card title family/weight from card scale, not hero');

// 4. ensureBaseKit emits schema name and strips primary
const ensured = ensureBaseKit(legacy);
assert.strictEqual(ensured.$schema_name, 'publisher-brand-kit.base');
assert.ok(!ensured.colors || !Object.prototype.hasOwnProperty.call(ensured.colors, 'primary') || ensured.colors.primary == null);
console.log('ok  schema publisher-brand-kit.base@1.1.0');

// 5. CP bindings know the dead CTA selector
const gaps = computeCpGaps(ensured);
const ctaRow = gaps.rows.find(r => r.kit_path === 'cta.sponsored.background');
assert.ok(ctaRow, 'cta binding missing');
assert.strictEqual(ctaRow.status, 'DEAD_SELECTOR');
assert.ok((ctaRow.live_selectors || []).some(s => s.indexOf(DEAD_CTA_SELECTOR) !== -1));
assert.ok((ctaRow.flags || []).some(f => f.indexOf(DEAD_CTA_SELECTOR) !== -1));
assert.strictEqual(LIVE_CTA_SELECTOR, 'button.video-cta-button');
console.log('ok  dead CTA selector flagged; live node is', LIVE_CTA_SELECTOR);

// 6. Hover wash mechanic documented
assert.ok(gaps.mechanics.hover_wash.live_node.indexOf('videoCube:hover') !== -1);
assert.ok(gaps.mechanics.hover_wash.not.indexOf('item-label-href') !== -1);
console.log('ok  hover wash is div.videoCube:hover, not a.item-label-href');

console.log('\nAll fix-item spot-checks passed.');
