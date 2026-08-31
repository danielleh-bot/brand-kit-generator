// ============================================================
//  LIVE CP BINDINGS + FEED MECHANICS
//  Primary gap table: kit field → live CP key (not generic Arial defaults).
//  Selectors copied from data/cp-bindings.json — none invented.
// ============================================================

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./aliases'),
      (function () {
        try { return require('../data/cp-bindings.json'); } catch (e) { return []; }
      })()
    );
  } else {
    root.BrandKitCpBindings = factory(root.BrandKitAliases, root.CP_BINDINGS || []);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (aliases, bindingsData) {

  const { nestGet, isEmpty, resolveField } = aliases;

  const DEAD_CTA_SELECTOR = '.tbl-cta-style .cta-button';
  const LIVE_CTA_SELECTOR = 'button.video-cta-button';

  /**
   * Documented live feed mechanics — used in gap output. Do not invent selectors.
   */
  const FEED_MECHANICS = {
    syndicated_twins: {
      rule: 'Write organic + syndicated twins',
      examples: [
        { organic: '.video-title', syndicated: '.syndicatedItem .video-title' },
        { organic: '.branding', syndicated: '.syndicatedItem .branding' },
      ],
      why: 'Branding cascade: .branding/color is overridden by the deeper syndicated twin.',
    },
    cta_gate: {
      rule: 'CTA mounts only when ctaWidget is on AND the item has cta-text',
      stripped_class: 'video-cta-style-removed',
      stripped_means: 'NewCta stripped the button — CSS cannot restore it',
      live_node: LIVE_CTA_SELECTOR,
      dead_selector: DEAD_CTA_SELECTOR,
      do_not: 'Do not recommend writing ' + DEAD_CTA_SELECTOR,
    },
    hover_wash: {
      live_node: 'div.videoCube:hover',
      property: 'background-color',
      not: 'a.item-label-href',
      default_live: '#EBF0FF (rbox.css) — recolour only if crawled',
    },
  };

  const STATUS_LABELS = {
    MAPPED_LIVE: 'Live CP selector exists on videoCube DOM',
    DEAD_SELECTOR: 'In the CP registry but does not match live DOM — do not write it',
    PUBCONFIG: 'Live mechanism is pubConfig / inherit, not CP CSS',
    NEEDS_NEW_CP: 'Live node exists; property missing from registry',
    NEEDS_RENDERER: 'No DOM / no variant — product + R&D',
    DO_NOT_MAP: 'Chrome / article / provenance — not a feed card token',
    HACKABLE_CSS: 'No first-class CP; loader !important can restyle IF light-DOM',
    MAPPED_TWIN: 'Same as live; must also write syndicated twin',
  };

  function loadBindings() {
    return Array.isArray(bindingsData) ? bindingsData : [];
  }

  function selectorList(binding) {
    const writes = binding.cp_writes || [];
    return writes.map(w => {
      const sel = w.selector || '';
      const prop = w.property || '';
      return (sel ? sel : '(no selector)') + (prop ? ' → ' + prop : '');
    });
  }

  function hasDeadCtaSelector(binding) {
    const writes = binding.cp_writes || [];
    return writes.some(w => (w.selector || '').indexOf(DEAD_CTA_SELECTOR) !== -1);
  }

  function liveRecommendation(binding) {
    if (hasDeadCtaSelector(binding) || binding.status === 'DEAD_SELECTOR') {
      const proposed = binding.proposed && binding.proposed.selector;
      return {
        write: false,
        reason: 'DEAD_SELECTOR — do not write ' + DEAD_CTA_SELECTOR,
        live_instead: proposed || LIVE_CTA_SELECTOR,
      };
    }
    if (binding.status === 'DO_NOT_MAP') {
      return { write: false, reason: binding.do_not || 'DO_NOT_MAP', live_instead: null };
    }
    return { write: binding.status === 'MAPPED_LIVE' || binding.status === 'MAPPED_TWIN', reason: null, live_instead: null };
  }

  function twinsNote(binding) {
    const writes = binding.cp_writes || [];
    const sels = writes.map(w => w.selector || '');
    const hasOrganicTitle = sels.some(s => s === '.video-title' || s === '.branding');
    const hasTwin = sels.some(s => s.indexOf('.syndicatedItem') !== -1);
    if (hasOrganicTitle && hasTwin) return 'syndicated twin required';
    if (hasOrganicTitle && !hasTwin) return 'organic selector present — twin missing from this binding';
    return null;
  }

  /**
   * Primary gap table: each binding × kit value × live CP key.
   */
  function computeCpGaps(brandKit, defaults) {
    const bindings = loadBindings();
    const rows = [];
    const statusCounts = {};

    for (const binding of bindings) {
      const path = binding.kit_path;
      const resolved = resolveField(brandKit, path);
      const kitValue = resolved.value;
      const filled = !isEmpty(kitValue);
      const rec = liveRecommendation(binding);
      const twins = twinsNote(binding);
      const dead = hasDeadCtaSelector(binding) || binding.status === 'DEAD_SELECTOR';

      let defaultValue = null;
      if (defaults) {
        defaultValue = nestGet(defaults, path);
        if (defaultValue === undefined && binding.cp_writes && binding.cp_writes[0]) {
          defaultValue = binding.cp_writes[0].default;
        }
      }

      statusCounts[binding.status] = (statusCounts[binding.status] || 0) + 1;

      const flags = [];
      if (dead) flags.push('DO_NOT_WRITE dead selector ' + DEAD_CTA_SELECTOR);
      if (twins) flags.push(twins);
      if (binding.status === 'PUBCONFIG' && path.indexOf('cta.') === 0) {
        flags.push('ctaWidget gate + item cta-text; video-cta-style-removed cannot be restored by CSS');
      }
      if (path === 'card.hover.surface_background') {
        flags.push('hover wash is div.videoCube:hover background-color, not a.item-label-href');
      }
      if (path === 'card.hover.headline_underline_color' && isEmpty(kitValue)) {
        flags.push('hover decoration left null — not defaulted to underline');
      }
      if (binding.do_not) flags.push(binding.do_not);

      rows.push({
        kit_path: path,
        feed_role: binding.feed_role || path,
        kit_value: filled ? kitValue : null,
        kit_source: resolved.source,
        status: binding.status,
        status_label: STATUS_LABELS[binding.status] || binding.status,
        live_selectors: selectorList(binding),
        proposed: binding.proposed || null,
        vs_default: defaultValue == null || defaultValue === '' ? null : defaultValue,
        filled,
        write_recommended: rec.write && filled,
        flags,
        do_not: binding.do_not || null,
      });
    }

    return {
      rows,
      statusCounts,
      mechanics: FEED_MECHANICS,
      deadCtaSelector: DEAD_CTA_SELECTOR,
      liveCtaSelector: LIVE_CTA_SELECTOR,
    };
  }

  function generateMechanicGaps(cpGaps) {
    const gaps = [];
    const rows = (cpGaps && cpGaps.rows) || [];

    const deadCta = rows.filter(r => r.status === 'DEAD_SELECTOR');
    if (deadCta.length) {
      gaps.push({
        category: 'Dead CTA selector',
        severity: 'high',
        description: 'Registry selector ' + DEAD_CTA_SELECTOR + ' matches no live node. Live CTA is ' + LIVE_CTA_SELECTOR + '. Do not recommend writing the dead selector. CTA mounts only with ctaWidget + item cta-text; class video-cta-style-removed means the button was stripped and CSS cannot restore it.',
        properties: deadCta.map(r => r.kit_path),
      });
    }

    const twins = rows.filter(r => (r.flags || []).some(f => f.indexOf('syndicated twin') !== -1) && r.filled);
    if (twins.length) {
      gaps.push({
        category: 'Syndicated twins',
        severity: 'medium',
        description: 'Filled title/branding fields must write both the organic selector and the .syndicatedItem twin (e.g. .video-title AND .syndicatedItem .video-title).',
        properties: twins.map(r => r.kit_path),
      });
    }

    const hover = rows.find(r => r.kit_path === 'card.hover.surface_background');
    if (hover) {
      gaps.push({
        category: 'Hover wash',
        severity: hover.filled ? 'medium' : 'info',
        description: 'Live hover wash is div.videoCube:hover background-color (rbox default #EBF0FF). Do not target a.item-label-href. Recolour only if crawled; leave null otherwise.',
        properties: ['card.hover.surface_background'],
      });
    }

    const needsNew = rows.filter(r => (r.status === 'NEEDS_NEW_CP' || r.status === 'NEEDS_RENDERER') && r.filled);
    if (needsNew.length) {
      gaps.push({
        category: 'Needs new CP / renderer',
        severity: 'medium',
        description: 'Kit has values that no live CP selector can express. Record in requires_new_client_properties — do not invent a unique top-level key.',
        properties: needsNew.map(r => r.kit_path + ' (' + r.status + ')'),
      });
    }

    const unfilledLive = rows.filter(r => r.status === 'MAPPED_LIVE' && !r.filled);
    if (unfilledLive.length) {
      gaps.push({
        category: 'Unfilled live CP fields',
        severity: 'info',
        description: 'Live CP keys exist but this crawl left the kit field null. Not guessed.',
        properties: unfilledLive.map(r => r.kit_path),
      });
    }

    return gaps;
  }

  return {
    DEAD_CTA_SELECTOR,
    LIVE_CTA_SELECTOR,
    FEED_MECHANICS,
    STATUS_LABELS,
    loadBindings,
    computeCpGaps,
    generateMechanicGaps,
    hasDeadCtaSelector,
  };
}));
