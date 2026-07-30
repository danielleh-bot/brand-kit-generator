// ============================================================
//  PROPERTY TIERS — Unique vs Standard (feed integration)
//  Buckets brand-kit tokens by what today's Taboola feed can
//  ship via loader.js CSS + per-mode __style__, vs what needs
//  Transformer / card markup / Gen AI.
// ============================================================

const TIERS = {
  standard: {
    id: 'standard',
    label: 'Standard / MVP',
    short: 'MVP',
    color: '#1a7f4b',
    bg: '#e8f7ef',
    meaning: 'Ship today via loader CSS + __style__ on existing TRC selectors.',
  },
  partial: {
    id: 'partial',
    label: 'Partial',
    short: 'Partial',
    color: '#9a6b00',
    bg: '#fff6e0',
    meaning: 'A knob exists but value space is too narrow — A/B possible with fidelity loss.',
  },
  unique: {
    id: 'unique',
    label: 'Unique / needs platform',
    short: 'Unique',
    color: '#b42318',
    bg: '#fdecea',
    meaning: 'Ideal prototype shows it; current feed markup/config has no hook.',
  },
  soft: {
    id: 'soft',
    label: 'Soft / Gen AI',
    short: 'Gen AI',
    color: '#5b21b6',
    bg: '#f3e8ff',
    meaning: 'Not CSS — content/experience translation (tone, headline rewrite, naming).',
  },
};

/** Shared TRC selectors reachable from loader.js / __style__ today */
const TRC_TARGETS = {
  cardTitle: '.tbl-feed-card .video-title, .videoCube .video-title',
  cardTitleHover: '.tbl-feed-card:hover .video-title',
  branding: '.tbl-feed-card .branding, .video-label-box .branding',
  preLabel: '.tbl-feed-card .trc-pre-label',
  sponsored: '.trc_sponsored_overlay, .trc_sponsored_overlay_base',
  thumbnail: '.tbl-feed-card .thumbBlock, .videoCube .trc_img',
  moreBtn: '.tbl-feed-more-btn',
  feedHeader: '.tbl-feed-header, .tbl-feed-header-text',
  playIcon: '.tbl-feed-card .trc-video-play-icon',
  card: '.tbl-feed-card',
  disclosure: '.tbl-feed-card .trc-disclosure-label',
};

function prop(def) {
  return {
    id: def.id,
    label: def.label,
    tokenPath: def.tokenPath,
    value: def.value ?? null,
    tier: def.tier,
    trcTargets: def.trcTargets || [],
    abImplication: def.abImplication || '',
    notes: def.notes || '',
    sourceVisual: def.sourceVisual,
    feedVisual: def.feedVisual,
    provenance: def.provenance || 'prototype',
  };
}

module.exports = { TIERS, TRC_TARGETS, prop };
