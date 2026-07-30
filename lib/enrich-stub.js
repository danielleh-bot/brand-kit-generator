// ============================================================
//  LAYER 2 — Gen AI enrichment STUB (not wired on main)
//
//  Soft brand attributes (tone of voice, headline style prose,
//  semantic colour naming, photo aesthetic) cannot be applied
//  rule-only. A fuller implementation lives on branch
//  feat/deep-crawl-enrich-feed-mapping as lib/enrich.js
//  (Claude tool-use → brand_voice.enriched, etc.).
//
//  This stub documents the plug-point so visual brand kits can
//  mark Soft/Gen AI properties without requiring ANTHROPIC_API_KEY.
// ============================================================

/**
 * Soft brand-kit paths that need Gen AI translation into feed
 * experience (copy, naming, interaction intent) — not CSS.
 */
const SOFT_BRAND_PATHS = [
  'brand_voice.tone',
  'brand_voice.personality_traits',
  'brand_voice.headline_style.tone',
  'brand_voice.headline_style.pattern',
  'brand_voice.content_distinction',
  'photo_style.food_photography.style',
  'photo_style.aesthetic',
  'logos.primary.description',
];

/**
 * No-op enrich. Returns kit unchanged with enrichment metadata
 * explaining why Soft-tier fields stay hand-authored in prototypes.
 *
 * @param {object} brandKit
 * @param {{ noEnrich?: boolean }} [opts]
 */
async function enrichBrandKitStub(brandKit, opts = {}) {
  const kit = brandKit || {};
  kit.metadata = kit.metadata || {};
  kit.metadata.enrichment = {
    status: 'stubbed_not_wired',
    reason:
      'Live Gen AI enrichment is not on main. Soft brand_voice fields are hand-authored in ideal prototypes. See feat/deep-crawl-enrich-feed-mapping lib/enrich.js for the Claude pipeline.',
    soft_paths: SOFT_BRAND_PATHS,
    skipped: true,
    noEnrich: Boolean(opts.noEnrich),
  };
  return kit;
}

module.exports = { enrichBrandKitStub, SOFT_BRAND_PATHS };
