// ============================================================
//  BASE-SCHEMA ALIASES
//  Port of Documents/output/truenative-mve-flow/cp_map_analyzer.py ALIASES
//  plus crawl-source paths needed to land unique extractor output on base fields.
//  colors.primary.hex may fill at most ONE of CTA / feed_accent / header accent_rule.
// ============================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BrandKitAliases = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {

  const ALIASES = {
    'brand.name': ['brand.name', 'identity.name', '_meta.publisher'],
    'brand.language': ['brand.language', 'identity.lang', 'identity.direction'],
    'brand.tagline': ['brand.tagline'],
    'brand.website': ['brand.website'],
    'brand.description': ['brand.description'],
    'colors.text_headline': [
      'colors.text_headline',
      'color.text_headline',
      'color.light_live.text_primary',
      'colors.text.primary.hex',
    ],
    'colors.text_body': [
      'colors.text_body',
      'color.text_body',
      'color.light_live.text_secondary',
      'colors.text.secondary.hex',
    ],
    'colors.text_meta': [
      'colors.text_meta',
      'color.text_meta',
      'color.light_live.meta',
      'colors.text.tertiary.hex',
    ],
    'colors.card_surface': [
      'colors.card_surface',
      'color.surface_card',
      'color.light_live.surface',
      'colors.backgrounds.base.hex',
    ],
    'colors.page_background': [
      'colors.page_background',
      'color.page_background',
      'color.light_live.page',
      'colors.backgrounds.base.hex',
      'colors.backgrounds.page.hex',
    ],
    'colors.feed_well': [
      'colors.feed_well',
      'color.feed_well',
      'colors.backgrounds.section.hex',
    ],
    'colors.border': [
      'colors.border',
      'color.border_hairline',
      'color.light_live.hairline',
      'colors.backgrounds.secondary.hex',
      'colors.borders.primary.hex',
    ],
    'colors.link': [
      'colors.link',
      'color.link_hover',
      'color.brand_accent_secondary',
    ],
    'colors.feed_accent': [
      'colors.feed_accent',
      'color.brand_accent_primary',
      'color.light_live.accent',
      'colors.primary.hex',
    ],
    'typography.headline.family': [
      'typography.headline.family',
      'type.family',
      'fonts.primary.family',
      'fonts.type_scale.article_title_card.family',
    ],
    'typography.headline.fallbacks': [
      'typography.headline.fallbacks',
      'fonts.primary.fallbacks',
    ],
    'typography.headline.weights': [
      'typography.headline.weights',
      'fonts.primary.weights',
    ],
    'typography.body.family': [
      'typography.body.family',
      'type.family',
      'fonts.secondary.family',
      'fonts.primary.family',
    ],
    'typography.card_title.size': [
      'typography.card_title.size',
      'type.scale.card_title.size_px',
      'fonts.type_scale.article_title_card.size',
    ],
    'typography.card_title.weight': [
      'typography.card_title.weight',
      'type.scale.card_title.weight',
      'fonts.type_scale.article_title_card.weight',
    ],
    'typography.card_title.line_height': [
      'typography.card_title.line_height',
      'type.scale.card_title.leading_ratio',
      'fonts.type_scale.article_title_card.line_height',
    ],
    'typography.card_title.letter_spacing': [
      'typography.card_title.letter_spacing',
      'type.scale.card_title.letter_spacing_px',
      'fonts.type_scale.article_title_card.letter_spacing',
    ],
    'typography.card_title.text_transform': [
      'typography.card_title.text_transform',
      'type.scale.card_title.transform',
      'typography.headline_case',
    ],
    'typography.card_title.family': [
      'typography.card_title.family',
      'fonts.type_scale.article_title_card.family',
    ],
    'typography.article_hero_title.size': [
      'typography.article_hero_title.size',
      'fonts.type_scale.article_title_hero.size',
    ],
    'typography.article_hero_title.weight': [
      'typography.article_hero_title.weight',
      'fonts.type_scale.article_title_hero.weight',
    ],
    'typography.article_hero_title.line_height': [
      'typography.article_hero_title.line_height',
      'fonts.type_scale.article_title_hero.line_height',
    ],
    'typography.article_hero_title.letter_spacing': [
      'typography.article_hero_title.letter_spacing',
      'fonts.type_scale.article_title_hero.letter_spacing',
    ],
    'typography.article_hero_title.text_transform': [
      'typography.article_hero_title.text_transform',
      'fonts.type_scale.article_title_hero.text_transform',
    ],
    'typography.article_lead.size': [
      'typography.article_lead.size',
      'fonts.type_scale.article_lead.size',
    ],
    'typography.article_lead.weight': [
      'typography.article_lead.weight',
      'fonts.type_scale.article_lead.weight',
    ],
    'typography.article_lead.line_height': [
      'typography.article_lead.line_height',
      'fonts.type_scale.article_lead.line_height',
    ],
    'typography.article_body.size': [
      'typography.article_body.size',
      'fonts.type_scale.article_body.size',
    ],
    'typography.article_body.weight': [
      'typography.article_body.weight',
      'fonts.type_scale.article_body.weight',
    ],
    'typography.article_body.line_height': [
      'typography.article_body.line_height',
      'fonts.type_scale.article_body.line_height',
    ],
    'typography.card_description.size': [
      'typography.card_description.size',
      'type.scale.card_description.size_px',
      'fonts.type_scale.article_body.size',
    ],
    'typography.feed_section_label.size': [
      'typography.feed_section_label.size',
      'type.scale.section_header.size_px',
      'fonts.type_scale.section_headings.size',
    ],
    'typography.feed_section_label.weight': [
      'typography.feed_section_label.weight',
      'type.scale.section_header.weight',
      'fonts.type_scale.section_headings.weight',
    ],
    'typography.feed_section_label.text_transform': [
      'typography.feed_section_label.text_transform',
      'type.scale.section_header.transform',
      'fonts.type_scale.section_headings.text_transform',
    ],
    'typography.feed_section_label.letter_spacing': [
      'typography.feed_section_label.letter_spacing',
      'fonts.type_scale.section_headings.letter_spacing',
    ],
    'typography.kicker.size': [
      'typography.kicker.size',
      'type.scale.kicker.size_px',
      'fonts.type_scale.category_pills.size',
    ],
    'typography.kicker.weight': [
      'typography.kicker.weight',
      'fonts.type_scale.category_pills.weight',
    ],
    'typography.kicker.text_transform': [
      'typography.kicker.text_transform',
      'type.scale.kicker.transform',
      'fonts.type_scale.category_pills.text_transform',
    ],
    'typography.kicker.letter_spacing': [
      'typography.kicker.letter_spacing',
      'fonts.type_scale.category_pills.letter_spacing',
    ],
    'typography.meta.size': [
      'typography.meta.size',
      'type.scale.meta.size_px',
      'fonts.type_scale.meta_text.size',
    ],
    'typography.meta.weight': [
      'typography.meta.weight',
      'fonts.type_scale.meta_text.weight',
    ],
    'typography.navigation.size': [
      'typography.navigation.size',
      'fonts.type_scale.navigation.size',
    ],
    'typography.navigation.weight': [
      'typography.navigation.weight',
      'fonts.type_scale.navigation.weight',
    ],
    'typography.cta_label.size': [
      'typography.cta_label.size',
      'type.scale.cta.size_px',
      'cta.sponsored.font_size',
      'fonts.type_scale.buttons.size',
    ],
    'typography.cta_label.weight': [
      'typography.cta_label.weight',
      'fonts.type_scale.buttons.weight',
    ],
    'typography.headline_case': [
      'typography.headline_case',
      'brand_voice.headline_style.case',
    ],
    'card.border_radius': [
      'card.border_radius',
      'layout_patterns.content_cards.border_radius',
      'layout_patterns.card.border_radius',
      'spacing.card_border_radius',
    ],
    'card.border': ['card.border', 'layout_patterns.content_cards.border'],
    'card.shadow': ['card.shadow', 'layout_patterns.content_cards.shadow'],
    'card.padding': ['card.padding', 'layout_patterns.content_cards.padding'],
    'card.gap': ['card.gap', 'spacing.card_gap', 'spacing.grid_gap', 'layout.grid.gap'],
    'card.thumbnail.aspect_ratio': [
      'card.thumbnail.aspect_ratio',
      'photo_style.thumbnail_format.aspect_ratio',
    ],
    'card.thumbnail.border_radius': [
      'card.thumbnail.border_radius',
      'photo_style.thumbnail_format.border_radius',
    ],
    'card.video_play.indicator': [
      'card.video_play.indicator',
      'photo_style.video_thumbnails.indicator',
    ],
    'card.video_play.color': [
      'card.video_play.color',
      'photo_style.video_thumbnails.indicator_color',
    ],
    'card.hover.surface_background': [
      'card.hover.surface_background',
      'feed_ux_behavior.interaction.hover_surface',
    ],
    'card.hover.headline_color': [
      'card.hover.headline_color',
      'feed_ux_behavior.interaction.hover_headline_color',
      'color.link_hover',
    ],
    'card.hover.headline_underline_color': ['card.hover.headline_underline_color'],
    'card.hover.shadow': [
      'card.hover.shadow',
      'feed_ux_behavior.interaction.hover_surface_shadow',
    ],
    'card.hover.translate_y': ['card.hover.translate_y'],
    'cta.sponsored.background': [
      'cta.sponsored.background',
      'buttons.primary.background_color',
      'colors.primary.hex',
    ],
    'cta.sponsored.text_color': ['cta.sponsored.text_color', 'buttons.primary.text_color'],
    'cta.sponsored.hover_background': [
      'cta.sponsored.hover_background',
      'buttons.primary.hover_background',
    ],
    'cta.sponsored.border': ['cta.sponsored.border'],
    'cta.sponsored.border_radius': ['cta.sponsored.border_radius', 'buttons.primary.border_radius'],
    'cta.sponsored.font_size': ['cta.sponsored.font_size', 'buttons.primary.font_size'],
    'cta.sponsored.font_weight': ['cta.sponsored.font_weight', 'buttons.primary.font_weight'],
    'cta.sponsored.text_transform': ['cta.sponsored.text_transform', 'buttons.primary.text_transform'],
    'feed.labels.organic': ['feed.labels.organic', 'taboola.feed_label'],
    'feed.labels.sponsored': ['feed.labels.sponsored', 'taboola.sponsored_label'],
    'chrome.header.background': [
      'chrome.header.background',
      'identity.masthead.background',
      'color.light_live.masthead',
      'layout_patterns.header.background_color',
      'layout_patterns.header.background',
    ],
    'chrome.header.accent_rule': [
      'chrome.header.accent_rule',
      'editorial_grammar.section_header.color_on_light',
      'editorial_grammar.section_header.trailing_rule.color_on_light',
      'layout_patterns.header.accent_rule_color',
      'layout_patterns.header.accent_bar_color',
    ],
    'chrome.header.is_dark': ['chrome.header.is_dark'],
    'chrome.header.height_px': ['chrome.header.height_px'],
    'logos.masthead.type': ['logos.masthead.type', 'logos.primary.type'],
    'logos.masthead.text': ['logos.masthead.text', 'logos.primary.text'],
    'logos.masthead.svg': ['logos.masthead.svg', 'logos.primary.svg'],
    'logos.masthead.image_url': ['logos.masthead.image_url', 'logos.primary.image_url', 'logos.primary.url'],
    'logos.masthead.color': ['logos.masthead.color', 'logos.primary.color'],
    'logos.favicon_url': ['logos.favicon_url'],
  };

  /** Paths that must not share a single colors.primary.hex dump. */
  const PRIMARY_EXCLUSIVE_PATHS = [
    'cta.sponsored.background',
    'colors.feed_accent',
    'chrome.header.accent_rule',
  ];

  const PRIMARY_ALIAS = 'colors.primary.hex';

  function nestGet(obj, path) {
    if (!obj || !path) return undefined;
    return String(path).split('.').reduce((curr, key) => {
      if (curr == null) return undefined;
      return curr[key];
    }, obj);
  }

  function nestSet(obj, path, value) {
    if (!obj || !path) return obj;
    const keys = String(path).split('.');
    let curr = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (curr[key] == null || typeof curr[key] !== 'object' || Array.isArray(curr[key])) {
        curr[key] = {};
      }
      curr = curr[key];
    }
    curr[keys[keys.length - 1]] = value;
    return obj;
  }

  function isEmpty(v) {
    if (v === null || v === undefined) return true;
    if (v === '') return true;
    if (Array.isArray(v) && v.length === 0) return true;
    if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) return true;
    return false;
  }

  function isBaseKit(kit) {
    if (!kit || typeof kit !== 'object') return false;
    const name = kit.$schema_name || (kit.metadata && kit.metadata.schema);
    return name === 'publisher-brand-kit.base' ||
      (typeof name === 'string' && name.indexOf('publisher-brand-kit.base') === 0);
  }

  /**
   * Resolve a base field from a kit (base or legacy) via ALIASES.
   * Does not apply exclusive-primary rules — use migrateLegacyToBase for writes.
   */
  function resolveField(kit, kitPath) {
    const aliases = ALIASES[kitPath] || [kitPath];
    for (const alias of aliases) {
      const v = nestGet(kit, alias);
      if (!isEmpty(v)) return { value: v, source: alias };
    }
    return { value: null, source: null };
  }

  function primaryUsageText(kit) {
    const usage = nestGet(kit, 'colors.primary.usage');
    if (Array.isArray(usage)) return usage.join(' ').toLowerCase();
    if (usage == null) return '';
    return String(usage).toLowerCase();
  }

  /**
   * Pick at most one exclusive destination for a leftover colors.primary.hex dump.
   * Dedicated aliases (buttons.primary, header accent_rule, brand_accent) win first.
   */
  function assignPrimaryDump(base, kit, notes) {
    const primaryHex = nestGet(kit, PRIMARY_ALIAS);
    if (isEmpty(primaryHex)) return;

    const ctaEmpty = isEmpty(nestGet(base, 'cta.sponsored.background'));
    const accentEmpty = isEmpty(nestGet(base, 'colors.feed_accent'));
    const ruleEmpty = isEmpty(nestGet(base, 'chrome.header.accent_rule'));
    const usage = primaryUsageText(kit);
    const mentionsButtons = /button/.test(usage);
    const mentionsHeader = /header|theme|masthead|nav/.test(usage);

    let dest = null;
    if (mentionsButtons && ctaEmpty) dest = 'cta.sponsored.background';
    else if (mentionsHeader && ruleEmpty) dest = 'chrome.header.accent_rule';
    else if (accentEmpty) dest = 'colors.feed_accent';
    else if (ruleEmpty) dest = 'chrome.header.accent_rule';
    else if (ctaEmpty) dest = 'cta.sponsored.background';

    if (!dest) {
      notes.push('legacy colors.primary.hex unused — CTA / feed_accent / accent_rule already had dedicated values');
      return;
    }

    nestSet(base, dest, primaryHex);
    notes.push('legacy colors.primary.hex assigned to ' + dest + ' only — not copied to CTA and accent');
  }

  /**
   * Map a legacy unique-schema kit onto a base-template clone.
   * Never writes colors.primary. Never copies one primary dump to both CTA and accent.
   */
  function migrateLegacyToBase(kit, template, options) {
    const opts = options || {};
    const notes = [];
    const base = JSON.parse(JSON.stringify(template));

    if (!kit || typeof kit !== 'object') {
      nestSet(base, 'metadata.provenance_notes', ['empty source kit']);
      return base;
    }

    for (const path of Object.keys(ALIASES)) {
      const aliases = ALIASES[path].filter(a => a !== PRIMARY_ALIAS);
      let found = null;
      let src = null;
      for (const alias of aliases) {
        const v = nestGet(kit, alias);
        if (!isEmpty(v)) {
          found = v;
          src = alias;
          break;
        }
      }
      if (found != null) {
        nestSet(base, path, found);
        if (src !== path) notes.push(path + ' ← ' + src);
      }
    }

    assignPrimaryDump(base, kit, notes);

    // Preserve editorial_grammar / requires_new_client_properties if already present
    if (kit.editorial_grammar && typeof kit.editorial_grammar === 'object') {
      base.editorial_grammar = Object.assign({}, base.editorial_grammar, kit.editorial_grammar);
    }
    if (kit.requires_new_client_properties && Array.isArray(kit.requires_new_client_properties.items)) {
      base.requires_new_client_properties.items = kit.requires_new_client_properties.items.slice();
    }

    base.$schema_name = 'publisher-brand-kit.base';
    base.$schema_version = '1.1.0';
    nestSet(base, 'metadata.schema', 'publisher-brand-kit.base@1.1.0');
    nestSet(base, 'metadata.migrated_from', opts.migratedFrom || kit.metadata && kit.metadata.schema || 'legacy-unique-schema');
    const existingNotes = nestGet(kit, 'metadata.provenance_notes');
    const mergedNotes = []
      .concat(Array.isArray(existingNotes) ? existingNotes : [])
      .concat(notes);
    nestSet(base, 'metadata.provenance_notes', mergedNotes);

    if (kit.metadata) {
      if (kit.metadata.analysis_date) nestSet(base, 'metadata.analysis_date', kit.metadata.analysis_date);
      if (kit.metadata.source_url) nestSet(base, 'metadata.source_url', kit.metadata.source_url);
      if (kit.metadata.homepage_url) nestSet(base, 'metadata.homepage_url', kit.metadata.homepage_url);
      if (kit.metadata.extraction_method || kit.metadata.analysis_method) {
        nestSet(base, 'metadata.extraction_method', kit.metadata.extraction_method || kit.metadata.analysis_method);
      }
    }

    return base;
  }

  /**
   * Spot-check helper: how many exclusive destinations received this hex.
   */
  function countPrimaryOverload(base, hex) {
    if (!hex) return 0;
    const normalized = String(hex).toUpperCase();
    let n = 0;
    for (const path of PRIMARY_EXCLUSIVE_PATHS) {
      const v = nestGet(base, path);
      if (v && String(v).toUpperCase() === normalized) n++;
    }
    return n;
  }

  return {
    ALIASES,
    PRIMARY_EXCLUSIVE_PATHS,
    PRIMARY_ALIAS,
    nestGet,
    nestSet,
    isEmpty,
    isBaseKit,
    resolveField,
    migrateLegacyToBase,
    countPrimaryOverload,
  };
}));
