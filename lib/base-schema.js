// ============================================================
//  BASE BRAND-KIT SCHEMA
//  Empty template + crawl → publisher-brand-kit.base@1.1.0
//  Unique grammar only in editorial_grammar + requires_new_client_properties.
// ============================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./aliases'),
      (function () {
        try { return require('../data/brand-kit.base.template.json'); } catch (e) { return null; }
      })()
    );
  } else {
    root.BrandKitBaseSchema = factory(root.BrandKitAliases, root.BASE_TEMPLATE);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (aliases, embeddedTemplate) {

  const {
    nestGet, nestSet, isEmpty, isBaseKit, migrateLegacyToBase,
  } = aliases;

  function loadTemplate() {
    if (embeddedTemplate) return JSON.parse(JSON.stringify(embeddedTemplate));
    throw new Error('base template not loaded — include js/base-template-data.js or data/brand-kit.base.template.json');
  }

  function emptyBaseKit() {
    return loadTemplate();
  }

  function mergeIntoBase(base, overlay) {
    if (!overlay || typeof overlay !== 'object') return base;
    function walk(src, prefix) {
      if (src == null) return;
      if (typeof src !== 'object' || Array.isArray(src)) {
        if (!isEmpty(src) && prefix) nestSet(base, prefix, src);
        return;
      }
      for (const key of Object.keys(src)) {
        if (key.startsWith('$') && prefix) continue;
        const next = prefix ? prefix + '.' + key : key;
        const val = src[key];
        if (val && typeof val === 'object' && !Array.isArray(val)) walk(val, next);
        else if (!isEmpty(val)) nestSet(base, next, val);
      }
    }
    walk(overlay, '');
    return base;
  }

  /**
   * Ensure any crawl / legacy kit becomes a base-template document.
   * Does not invent values. Leaves nulls. Records provenance.
   */
  function ensureBaseKit(source, options) {
    const opts = options || {};
    const template = loadTemplate();

    if (!source || typeof source !== 'object') {
      const empty = template;
      nestSet(empty, 'metadata.provenance_notes', ['no source kit']);
      return empty;
    }

    let base;
    if (isBaseKit(source) && source.typography && source.cta && source.card) {
      base = template;
      mergeIntoBase(base, source);
      if (source.editorial_grammar) {
        base.editorial_grammar = Object.assign({}, template.editorial_grammar, source.editorial_grammar);
      }
      if (source.requires_new_client_properties) {
        base.requires_new_client_properties = source.requires_new_client_properties;
      }
    } else {
      base = migrateLegacyToBase(source, template, {
        migratedFrom: opts.migratedFrom || 'legacy-unique-schema',
      });
    }

    base.$schema_name = 'publisher-brand-kit.base';
    base.$schema_version = '1.1.0';
    nestSet(base, 'metadata.schema', 'publisher-brand-kit.base@1.1.0');

    if (opts.url) nestSet(base, 'metadata.source_url', opts.url);
    if (opts.homepageUrl) nestSet(base, 'metadata.homepage_url', opts.homepageUrl);
    if (opts.method) nestSet(base, 'metadata.extraction_method', opts.method);
    if (opts.analysisDate) nestSet(base, 'metadata.analysis_date', opts.analysisDate);
    else if (!nestGet(base, 'metadata.analysis_date')) {
      nestSet(base, 'metadata.analysis_date', new Date().toISOString().split('T')[0]);
    }

    if (opts.provenanceNote) {
      const notes = nestGet(base, 'metadata.provenance_notes') || [];
      notes.push(opts.provenanceNote);
      nestSet(base, 'metadata.provenance_notes', notes);
    }

    // Never persist the banned write target
    if (base.colors && Object.prototype.hasOwnProperty.call(base.colors, 'primary')) {
      delete base.colors.primary;
      const notes = nestGet(base, 'metadata.provenance_notes') || [];
      notes.push('stripped colors.primary — not a base-template field');
      nestSet(base, 'metadata.provenance_notes', notes);
    }

    applyEditorialFromLegacy(base, source);
    recordUnfilledBaseFields(base);
    return base;
  }

  function applyEditorialFromLegacy(base, source) {
    if (!source) return;
    const existing = base.editorial_grammar || {};
    const labels = nestGet(source, 'brand_voice.content_labels');
    if (labels && typeof labels === 'object') {
      const verbatim = Object.keys(labels).filter(k => labels[k] && !k.startsWith('$'));
      if (verbatim.length && (!existing.content_labels || !existing.content_labels.labels_verbatim || !existing.content_labels.labels_verbatim.length)) {
        existing.content_labels = existing.content_labels || {};
        existing.content_labels.labels_verbatim = verbatim;
        existing.content_labels._design = 'detected keyword labels on page text — not invented badge chrome';
      }
    }
    if (source.editorial_grammar && typeof source.editorial_grammar === 'object') {
      Object.assign(existing, source.editorial_grammar);
    }
    base.editorial_grammar = Object.assign({}, loadTemplate().editorial_grammar, existing);

    if (Array.isArray(source.requires_new_client_properties && source.requires_new_client_properties.items)) {
      base.requires_new_client_properties = source.requires_new_client_properties;
    } else if (!base.requires_new_client_properties) {
      base.requires_new_client_properties = { items: [] };
    }
  }

  function recordUnfilledBaseFields(base) {
    const notes = nestGet(base, 'metadata.provenance_notes') || [];
    const watch = [
      'cta.sponsored.background',
      'colors.feed_accent',
      'chrome.header.accent_rule',
      'typography.headline.family',
      'typography.card_title.size',
      'typography.card_title.weight',
      'card.hover.headline_underline_color',
      'card.hover.surface_background',
    ];
    const missing = watch.filter(p => isEmpty(nestGet(base, p)));
    if (missing.length) {
      notes.push('unfilled base fields left null (not guessed): ' + missing.join(', '));
    }
    nestSet(base, 'metadata.provenance_notes', notes);
  }

  /**
   * Build a base kit from a crawler's raw (possibly unique-schema) extraction.
   */
  function buildBaseKitFromCrawl(raw, options) {
    return ensureBaseKit(raw, options);
  }

  return {
    emptyBaseKit,
    loadTemplate,
    ensureBaseKit,
    buildBaseKitFromCrawl,
    mergeIntoBase,
  };
}));
