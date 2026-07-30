// ============================================================
//  LAYER 3 — TOKEN → FEED HOOK REGISTRY
//  Declarative data (not code): every supported brand-token path,
//  its relationship to the Taboola feed surface, the target
//  selector(s)/property it drives, and per-target safety
//  constraints. The loader builder consumes this against a merged
//  brand kit to emit CSS, a generated loader, and a gap report.
//
//  Categories:
//   • mapped       — a current Taboola CSS hook exists; apply it.
//   • gap          — real brand expression with NO current hook;
//                    emit a recommendation for the workshop brief.
//   • safe-ignore  — detected but applying it risks breaking the
//                    feed; skip with a logged reason.
//
//  Token paths support dot notation and a trailing `.*` wildcard
//  (resolved by the loader builder). Adding a new publisher needs
//  no change here — only a richer brand kit. Adding a new Taboola
//  hook (because the workshop brief was accepted) is a registry edit.
// ============================================================

// Selectors owned by the TRC engine's own lifecycle. The loader builder
// must never install behaviours (transitions/animations) on these — doing
// so races the engine's DOM choreography.
const TRC_OWNED_SELECTORS = [
  '.tbl-loading-cards-placeholder',
  '.tbl-placeholder-card',
  '.tbl-masker',
  '.tbl-feed-loading',
  '.tbl-feed-loading-cards',
  '[class^="trc_"][data-state]',
];

// Properties that are safe to transition/animate (paint/composite only).
// Anything outside this list triggers layout and is dropped by the builder.
const SAFE_ANIMATABLE_PROPS = [
  'color', 'background-color', 'opacity', 'transform', 'filter',
  'box-shadow', 'text-decoration', 'text-decoration-color', 'border-color',
  'outline-color',
];

const TOKEN_HOOKS = [
  // ─────────────── VISUAL: colours ───────────────
  {
    token: 'colors.primary.hex',
    category: 'mapped',
    criticality: 'critical',
    // Note: the "See more" CTA background is owned by
    // buttons.primary.background_color (the publisher's real button colour),
    // so primary.hex drives the title-hover underline + pre-label only.
    targets: [
      { selector: '.tbl-feed-card:hover .video-title', property: 'text-decoration-color' },
      { selector: '.tbl-feed-card .trc-pre-label', property: 'color' },
    ],
    safety: { contrast_against: 'colors.backgrounds.base.hex', min_ratio: 4.5, role: 'cta' },
  },
  {
    token: 'colors.text.primary.hex',
    category: 'mapped',
    criticality: 'critical',
    targets: [{ selector: '.tbl-feed-card .video-title', property: 'color' }],
    safety: { contrast_against: 'colors.backgrounds.base.hex', min_ratio: 4.5, role: 'text' },
  },
  {
    token: 'colors.text.secondary.hex',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .branding, .tbl-feed-card .tbl-card-desc', property: 'color' }],
    safety: { contrast_against: 'colors.backgrounds.base.hex', min_ratio: 4.5, role: 'text' },
  },
  {
    token: 'colors.text.tertiary.hex',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .time-ago, .tbl-feed-card .source', property: 'color' }],
    safety: { contrast_against: 'colors.backgrounds.base.hex', min_ratio: 4.5, role: 'text' },
  },
  {
    token: 'colors.backgrounds.base.hex',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card', property: 'background-color' }],
  },
  {
    token: 'colors.borders.divider.hex',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card', property: 'border-bottom-color' }],
  },
  {
    token: 'colors.show_brand_colors.*',
    category: 'gap',
    criticality: 'enhances',
    recommendation: 'Per-section card band — propose a new mode-level `__sectionBand__` config that wraps every Nth feed-card in a colored container keyed to the publisher\'s show/section colours. No hook today.',
  },
  {
    token: 'colors.ui_overlays.video_scrim.value',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .video-thumbnail::after', property: 'background' }],
  },

  // ─────────────── VISUAL: typography ───────────────
  {
    token: 'fonts.primary.family',
    category: 'mapped',
    criticality: 'critical',
    targets: [{ selector: '.tbl-feed-card .video-title, .tbl-feed-card .branding', property: 'font-family' }],
    safety: { font_fallback_required: true, max_custom_face_kb: 200 },
  },
  {
    token: 'fonts.type_scale_extended[role=card_title].size',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .video-title', property: 'font-size' }],
    safety: { clamp: [11, 30] },
  },
  {
    token: 'fonts.type_scale_extended[role=card_title].weight',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .video-title', property: 'font-weight' }],
  },
  {
    token: 'fonts.type_scale_extended[role=kicker].text_transform',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .trc-pre-label', property: 'text-transform' }],
  },

  // ─────────────── VISUAL: buttons / shape ───────────────
  {
    token: 'buttons.primary.border_radius',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-more-btn', property: 'border-radius' }],
    safety: { clamp: [0, 9999] },
  },
  {
    token: 'buttons.primary.background_color',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-more-btn', property: 'background-color' }],
    safety: { contrast_against: 'buttons.primary.text_color', min_ratio: 4.5, role: 'cta' },
  },
  {
    token: 'border_radius.cards',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card, .tbl-feed-card .thumbnail', property: 'border-radius' }],
    safety: { clamp: [0, 40] },
  },
  {
    token: 'shadows.natural',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card', property: 'box-shadow' }],
  },
  {
    token: 'logos.brand_mark.dot_color',
    category: 'gap',
    criticality: 'enhances',
    recommendation: 'Per-section heading suffix dot — propose a feed-header `__sectionMark__` slot rendering a coloured dot/glyph after the section label (e.g. t-online magenta dot). No hook today.',
  },

  // ─────────────── VISUAL: photo/media ───────────────
  {
    token: 'photo_style.video_thumbnails.indicator_color',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .trc-video-play-icon', property: 'color' }],
  },
  {
    token: 'photo_style.thumbnail_format.border_radius',
    category: 'mapped',
    criticality: 'enhances',
    targets: [{ selector: '.tbl-feed-card .thumbnail', property: 'border-radius' }],
    safety: { clamp: [0, 40] },
  },

  // ─────────────── BEHAVIOURAL ───────────────
  {
    token: 'behaviors.hover_states[role=link]',
    category: 'mapped',
    criticality: 'critical',
    behavioral: true,
    targets: [{ selector: '.tbl-feed-card:hover .video-title' }],
    safety: { max_duration_ms: 400, respect_reduced_motion: true, no_trc_conflict: true, no_layout_thrash: true },
  },
  {
    token: 'behaviors.hover_states[role=card]',
    category: 'mapped',
    criticality: 'enhances',
    behavioral: true,
    targets: [{ selector: '.tbl-feed-card' }],
    safety: { max_duration_ms: 400, respect_reduced_motion: true, no_trc_conflict: true, no_layout_thrash: true },
  },
  {
    token: 'behaviors.keyframes[role=badge_pulse]',
    category: 'mapped',
    criticality: 'enhances',
    behavioral: true,
    targets: [{ selector: '.tbl-feed-card .trc-pre-label[data-kind="live"]' }],
    safety: { max_continuous_animation: true, respect_reduced_motion: true, cpu_budget_check: true },
  },
  {
    token: 'behaviors.scroll_reveal[role=card]',
    category: 'gap',
    criticality: 'enhances',
    behavioral: true,
    recommendation: 'Per-card scroll-reveal — propose a feed-card `data-tbl-reveal` attribute + a TRC-engine-managed IntersectionObserver that adds a reveal class. Keeping loader.js declarative-CSS-only avoids racing TRC\'s own viewport observer.',
  },
  {
    token: 'behaviors.entry_animations[js_driven]',
    category: 'safe-ignore',
    behavioral: true,
    reason: 'JS-driven (Web Animations API) entry animations would race the TRC engine\'s DOM-insertion lifecycle. Surfaced in the gap report as "advanced behaviour — needs TRC engine integration".',
  },
  {
    token: 'behaviors.tickers',
    category: 'safe-ignore',
    behavioral: true,
    reason: 'Marquee/ticker animations are off-context for a content feed. Skipped by design.',
  },

  // ─────────────── SAFE-IGNORE (visual) ───────────────
  {
    token: 'colors.css_custom_properties',
    category: 'safe-ignore',
    reason: 'Raw CSS custom-property cascade; resolving scoped variable references reliably is deferred to v2.',
  },
  {
    token: 'charts',
    category: 'safe-ignore',
    reason: 'Publisher chart embeds (Datawrapper/Flourish/etc.) are editorial content, not feed chrome.',
  },
];

module.exports = { TOKEN_HOOKS, TRC_OWNED_SELECTORS, SAFE_ANIMATABLE_PROPS };
