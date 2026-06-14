// ============================================================
//  LAYER 2 — LLM ENRICHMENT
//  Adds the interpretive layer the crawler can't produce: brand
//  voice, semantic colour names + usage prose, logo/photo
//  descriptions, icon names, and behaviour intent. Additive and
//  defensive: crawler numerics are never overwritten, hallucinated
//  values are dropped, and a missing API key skips silently.
// ============================================================

const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Only these paths may be REFINED (overlaid onto an existing crawler value),
// and only when the current value is a known placeholder. Everything else the
// LLM returns is added to NEW keys (descriptions, brand_voice, groups, …) and
// never clobbers an extracted value.
const REFINABLE_PATHS = [
  'colors.primary.name',
  'colors.secondary.name',
  'colors.text.*.name',
  'colors.backgrounds.*.name',
  'colors.accents.*.name',
  'colors.*.usage_description',
];

// Placeholder names the crawler emits when it had no better label. A refine is
// only allowed to overwrite one of these — never a CSS-var-derived name.
const PLACEHOLDER_NAMES = new Set([
  'Primary Accent', 'Secondary Accent', 'Theme Color', 'Primary Text',
  'Secondary Text', 'Tertiary Text', 'White', 'Section', 'Secondary',
  'Dark Background', 'Primary', 'Brand Primary', 'Info Blue', 'Warning Yellow',
  'Negative Red', 'Positive Green', 'Off-White', 'Near Black', 'Default Blue',
  'Deep Dark', 'Body', 'Caption', 'Tertiary Text',
]);

// ---- small helpers --------------------------------------------------------

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

// Pull the crawler's full set of extracted hex colours so the hallucination
// detector can reject any colour the model invented.
function collectKnownHexes(brandKit) {
  const set = new Set();
  const visit = (v) => {
    if (!v) return;
    if (typeof v === 'string') {
      const m = v.match(/#[0-9a-fA-F]{3,8}/g);
      if (m) m.forEach((h) => set.add(h.toUpperCase()));
      return;
    }
    if (typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(brandKit.colors);
  return set;
}

function collectKnownFonts(brandKit) {
  const set = new Set();
  const f = brandKit.fonts || {};
  if (f.primary && f.primary.family) set.add(f.primary.family.toLowerCase());
  if (f.secondary && f.secondary.family) set.add(f.secondary.family.toLowerCase());
  (f.tertiary || []).forEach((t) => t.family && set.add(t.family.toLowerCase()));
  (f.type_scale_extended || []).forEach((e) => e.family && set.add(e.family.toLowerCase()));
  Object.values(f.type_scale || {}).forEach((e) => e && e.family && set.add(e.family.toLowerCase()));
  return set;
}

// ---- curated HTML payload -------------------------------------------------
// Build a compact, brand-relevant slice of the page rather than shipping the
// raw 50-100KB document. Regex-based (no DOM in Node), tolerant of messy HTML.

function curateHtml(pageHtml) {
  if (!pageHtml || typeof pageHtml !== 'string') return '';
  const parts = [];
  const grab = (re, label, max) => {
    const m = pageHtml.match(re);
    if (m && m[0]) parts.push(`<!-- ${label} -->\n` + truncate(m[0], max));
  };
  const title = pageHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) parts.push('<!-- title -->\n' + title[1].trim());
  const metas = pageHtml.match(/<meta[^>]+>/gi) || [];
  if (metas.length) parts.push('<!-- meta -->\n' + metas.slice(0, 40).join('\n'));
  // head <style> (brand custom-property names live here)
  const styles = (pageHtml.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || []).join('\n');
  if (styles) parts.push('<!-- styles -->\n' + truncate(styles.replace(/\s+/g, ' '), 20000));
  grab(/<header[\s\S]*?<\/header>/i, 'header', 5000);
  // inline SVGs in header
  const headerMatch = pageHtml.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch) {
    const svgs = (headerMatch[0].match(/<svg[\s\S]*?<\/svg>/gi) || []).slice(0, 4).join('\n');
    if (svgs) parts.push('<!-- header svgs -->\n' + truncate(svgs, 4000));
  }
  const articles = (pageHtml.match(/<(article|section)[\s\S]*?<\/\1>/gi) || []).slice(0, 3)
    .map((a) => a.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, ''))
    .join('\n');
  if (articles) parts.push('<!-- articles -->\n' + truncate(articles, 10000));
  grab(/<footer[\s\S]*?<\/footer>/i, 'footer', 5000);
  return truncate(parts.join('\n\n'), 42000);
}

// ---- the enrichment tool schema ------------------------------------------
// One forced tool call returns a strict, additive delta. Kept intentionally
// loose on free-text, strict on anything that could collide with crawler data.

function enrichmentTool() {
  return {
    name: 'emit_enrichment',
    description: 'Return the interpretive brand-kit enrichment delta. Only describe what is genuinely supported by the supplied page + brand kit. Never invent hex colours, font names, or numeric values.',
    input_schema: {
      type: 'object',
      properties: {
        brand: {
          type: 'object',
          properties: {
            tagline: { type: 'string' },
            owner: { type: 'string' },
            parent_brand: { type: 'string' },
          },
        },
        brand_voice: {
          type: 'object',
          properties: {
            personality_traits: { type: 'array', items: { type: 'string' } },
            tone: { type: 'string' },
            editorial_values: { type: 'array', items: { type: 'string' } },
            headline_style: { type: 'string' },
            content_distinction: { type: 'string' },
          },
        },
        color_names: {
          type: 'array',
          description: 'Refined human names + usage prose for EXISTING colours, keyed by hex. Do not introduce new hex values.',
          items: {
            type: 'object',
            properties: {
              hex: { type: 'string' },
              name: { type: 'string' },
              usage_description: { type: 'string' },
            },
            required: ['hex'],
          },
        },
        color_groups: {
          type: 'object',
          description: 'Additive grouping view; reference existing hexes only.',
          properties: {
            core_palette: { type: 'array', items: { type: 'string' } },
            show_brands: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' }, hex: { type: 'string' } } },
            },
          },
        },
        logo_description: { type: 'string' },
        photo_style: {
          type: 'object',
          properties: {
            overall_aesthetic: { type: 'string' },
            characteristics: { type: 'array', items: { type: 'string' } },
          },
        },
        icon_names: {
          type: 'array',
          description: 'Human names for icons, indexed to the supplied icon catalog (1-based).',
          items: { type: 'object', properties: { index: { type: 'integer' }, name: { type: 'string' } } },
        },
        signature_interactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              target_role: { type: 'string' },
              intent: { type: 'string' },
              priority: { type: 'string', enum: ['signature', 'reinforcing', 'incidental'] },
              feed_relevance: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['name'],
          },
        },
        choreography_summary: { type: 'string' },
      },
    },
  };
}

function systemBlocks(schemaHint) {
  const rules = [
    'You are a senior brand designer reviewing an automated extraction of a publisher\'s website.',
    'Your job is ONLY the interpretive layer the automated crawler cannot produce: brand voice, semantic colour names + where each colour is used, a logo description, photo aesthetic, icon names, and the intent behind interaction behaviours.',
    'HARD RULES:',
    '- NEVER invent a hex colour, RGB value, font family, or pixel value. Only reference values present in the supplied brand kit.',
    '- When naming colours, key them by the EXACT hex already in the kit.',
    '- Keep names short and brand-accurate (e.g. "Telekom Magenta", "E! Magenta"). Keep usage_description to one concise sentence.',
    '- If you are not confident about a field, omit it rather than guessing.',
    '- Output strictly via the emit_enrichment tool.',
  ].join('\n');
  return [
    { type: 'text', text: rules, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: schemaHint, cache_control: { type: 'ephemeral' } },
  ];
}

// ---- safe merge -----------------------------------------------------------

function applyEnrichment(brandKit, delta, opts) {
  const knownHexes = collectKnownHexes(brandKit);
  const added = [];
  const refined = [];
  const dropped = [];

  const tagSource = (obj, src) => { if (obj && typeof obj === 'object') obj.source = src; return obj; };

  // brand fields (additive only; tagline refine allowed since it starts empty)
  if (delta.brand) {
    for (const key of ['tagline', 'owner', 'parent_brand']) {
      if (delta.brand[key]) {
        const cur = get(brandKit, `brand.${key}`);
        if (!cur) { brandKit.brand[key] = delta.brand[key]; added.push(`brand.${key}`); }
      }
    }
  }

  // brand_voice — entirely new interpretive section (merge into existing object)
  if (delta.brand_voice) {
    brandKit.brand_voice = brandKit.brand_voice || {};
    brandKit.brand_voice.enriched = { ...delta.brand_voice, source: 'enriched' };
    added.push('brand_voice.enriched');
  }

  // colour names + usage prose — refine names on existing hexes, add usage_description
  if (Array.isArray(delta.color_names)) {
    // index colour entries by hex for lookup
    const byHex = {};
    const indexColors = (node) => {
      if (!node || typeof node !== 'object') return;
      if (node.hex) (byHex[String(node.hex).toUpperCase()] = byHex[String(node.hex).toUpperCase()] || []).push(node);
      Object.values(node).forEach((v) => { if (v && typeof v === 'object') indexColors(v); });
    };
    indexColors(brandKit.colors);
    for (const cn of delta.color_names) {
      const hex = cn.hex && String(cn.hex).toUpperCase();
      if (!hex || !knownHexes.has(hex)) { dropped.push(`color_names[${cn.hex}] (unknown hex)`); continue; }
      const targets = byHex[hex] || [];
      for (const t of targets) {
        // Refine only generic/placeholder names. A specific CSS-var-derived
        // name (e.g. "Telekom Magenta") is NOT in PLACEHOLDER_NAMES, so it
        // stays protected; a generic one like "Primary" can be upgraded.
        if (cn.name && PLACEHOLDER_NAMES.has(t.name)) {
          t.name = cn.name; t.source = 'refined'; refined.push(`colors[${hex}].name`);
        }
        if (cn.usage_description && !t.usage_description) {
          t.usage_description = cn.usage_description; added.push(`colors[${hex}].usage_description`);
        }
      }
    }
  }

  // colour groups — additive view, validate referenced hexes
  if (delta.color_groups) {
    const groups = {};
    if (Array.isArray(delta.color_groups.core_palette)) {
      groups.core_palette = delta.color_groups.core_palette.filter((h) => knownHexes.has(String(h).toUpperCase()));
    }
    if (Array.isArray(delta.color_groups.show_brands)) {
      groups.show_brands = delta.color_groups.show_brands.filter((s) => s.hex && knownHexes.has(String(s.hex).toUpperCase()));
    }
    if (Object.keys(groups).length) { brandKit.colors.groups = { ...groups, source: 'enriched' }; added.push('colors.groups'); }
  }

  // logo description
  if (delta.logo_description && brandKit.logos && brandKit.logos.primary) {
    brandKit.logos.primary.description = delta.logo_description;
    brandKit.logos.primary.description_source = 'enriched';
    added.push('logos.primary.description');
  }

  // photo style prose
  if (delta.photo_style) {
    brandKit.photo_style = brandKit.photo_style || {};
    brandKit.photo_style.aesthetic = { ...delta.photo_style, source: 'enriched' };
    added.push('photo_style.aesthetic');
  }

  // icon names — map onto the catalog by 1-based index
  if (Array.isArray(delta.icon_names) && brandKit.icons && Array.isArray(brandKit.icons.catalog)) {
    for (const ic of delta.icon_names) {
      const i = (ic.index || 0) - 1;
      if (i >= 0 && i < brandKit.icons.catalog.length && ic.name) {
        brandKit.icons.catalog[i].name = ic.name;
        brandKit.icons.catalog[i].name_source = 'enriched';
      }
    }
    added.push('icons.catalog[].name');
  }

  // behaviour interpretation
  if (brandKit.behaviors) {
    if (Array.isArray(delta.signature_interactions)) {
      brandKit.behaviors.signature_interactions = delta.signature_interactions.map((s) => ({ ...s, source: 'enriched' }));
      added.push('behaviors.signature_interactions');
    }
    if (delta.choreography_summary) {
      brandKit.behaviors.choreography_summary = delta.choreography_summary;
      added.push('behaviors.choreography_summary');
    }
  }

  return { added, refined, dropped, tagSource };
}

// ---- main -----------------------------------------------------------------

async function enrichBrandKit(brandKit, { url, pageHtml, options } = {}) {
  const opts = options || {};
  const meta = { status: 'enriched', model: opts.model || DEFAULT_MODEL };

  if (opts.noEnrich) {
    meta.status = 'skipped_opt_out';
    brandKit.metadata = brandKit.metadata || {};
    brandKit.metadata.enrichment = meta;
    return { brandKit, status: meta.status, metadata: meta };
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    meta.status = 'skipped_no_key';
    brandKit.metadata = brandKit.metadata || {};
    brandKit.metadata.enrichment = meta;
    return { brandKit, status: meta.status, metadata: meta };
  }

  let Anthropic;
  try { Anthropic = require('@anthropic-ai/sdk'); } catch (e) {
    meta.status = 'failed'; meta.error = 'SDK not installed';
    brandKit.metadata = brandKit.metadata || {};
    brandKit.metadata.enrichment = meta;
    return { brandKit, status: meta.status, metadata: meta };
  }
  const client = new Anthropic({ apiKey });

  // Compact brand-kit summary for the model — strip giant arrays it doesn't need.
  const kitForModel = JSON.parse(JSON.stringify(brandKit));
  if (kitForModel.logos && kitForModel.logos.primary) delete kitForModel.logos.primary.svg;
  if (kitForModel.colors) delete kitForModel.colors.css_custom_properties; // names already derived

  const schemaHint = 'The brand kit JSON and a curated slice of the page HTML follow. Colours you may reference (hex):\n'
    + [...collectKnownHexes(brandKit)].join(', ');

  const userContent = [
    'BRAND KIT (crawler output):',
    '```json',
    JSON.stringify(kitForModel, null, 1),
    '```',
    'CURATED PAGE HTML:',
    '```html',
    curateHtml(pageHtml),
    '```',
    `URL: ${url || brandKit.metadata && brandKit.metadata.source_url || ''}`,
    'Call emit_enrichment with the interpretive enrichment. Reference only hexes from the allowed list.',
  ].join('\n');

  const tool = enrichmentTool();
  const tStart = Date.now();
  let response;
  const callOnce = () => client.messages.create({
    model: meta.model,
    max_tokens: 4096,
    system: systemBlocks(schemaHint),
    tools: [tool],
    tool_choice: { type: 'tool', name: 'emit_enrichment' },
    messages: [{ role: 'user', content: userContent }],
  });

  // Network/5xx → retry once with backoff. Misconfigured key → fail loudly.
  try {
    try {
      response = await callOnce();
    } catch (e1) {
      if (e1 && (e1.status === 401 || e1.status === 403)) throw e1; // bad key — surface
      await new Promise((r) => setTimeout(r, 1200));
      response = await callOnce();
    }
  } catch (err) {
    meta.status = 'failed';
    meta.error = truncate(String((err && err.message) || err), 200);
    brandKit.metadata = brandKit.metadata || {};
    brandKit.metadata.enrichment = meta;
    if (brandKit.metadata.analysis_method && !/Claude/.test(brandKit.metadata.analysis_method)) {
      // leave method unchanged on failure
    }
    return { brandKit, status: meta.status, metadata: meta };
  }

  meta.latency_ms = Date.now() - tStart;
  if (response.usage) {
    meta.input_tokens = response.usage.input_tokens;
    meta.output_tokens = response.usage.output_tokens;
    meta.cache_read_tokens = response.usage.cache_read_input_tokens || 0;
    meta.cache_creation_tokens = response.usage.cache_creation_input_tokens || 0;
  }

  const toolUse = (response.content || []).find((b) => b.type === 'tool_use' && b.name === 'emit_enrichment');
  if (!toolUse) {
    meta.status = 'partial'; meta.error = 'no tool_use in response';
    brandKit.metadata = brandKit.metadata || {};
    brandKit.metadata.enrichment = meta;
    return { brandKit, status: meta.status, metadata: meta };
  }

  const { added, refined, dropped } = applyEnrichment(brandKit, toolUse.input || {}, opts);
  meta.fields_added = added;
  meta.fields_refined = refined;
  meta.dropped_fields = dropped;
  meta.status = dropped.length && !added.length && !refined.length ? 'partial' : 'enriched';

  brandKit.metadata = brandKit.metadata || {};
  brandKit.metadata.enrichment = meta;
  if (brandKit.metadata.analysis_method && !/Claude/.test(brandKit.metadata.analysis_method)) {
    brandKit.metadata.analysis_method += ` + Claude enrichment (${meta.model})`;
  }

  return { brandKit, status: meta.status, metadata: meta };
}

module.exports = { enrichBrandKit, applyEnrichment, curateHtml, collectKnownHexes, collectKnownFonts, REFINABLE_PATHS };
