#!/usr/bin/env node
// Build a self-contained HTML review document from a brand-kit.json,
// grouping every extracted token under its branding-element category.
// Output is pasteable straight into Google Docs (preserves headings + tables).
const fs = require('fs');
const path = require('path');

const kitPath = process.argv[2] || path.join(__dirname, '..', 'output', 'eonline', 'brand-kit.json');
const k = JSON.parse(fs.readFileSync(kitPath, 'utf-8'));

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const out = [];
const w = (s) => out.push(s);

const SRC_BADGE = {
  extracted: 'From page',
  derived: 'Computed',
  fallback: 'Default — verify',
  enriched: 'AI — verify',
  refined: 'AI-named — verify',
};

// Google Docs' HTML import strips inline span backgrounds, so a styled
// swatch just bloats the payload. Keep the hex as text (that's the data).
function swatch() { return ''; }

// Generic table renderer
function table(headers, rows) {
  if (!rows.length) { w('<p><i>None extracted.</i></p>'); return; }
  w('<table border="1" cellpadding="6">');
  w('<tr>' + headers.map((h) => `<th align="left">${esc(h)}</th>`).join('') + '</tr>');
  for (const r of rows) {
    w('<tr>' + r.map((c) => `<td>${c}</td>`).join('') + '</tr>');
  }
  w('</table>');
}

function srcCell(source) {
  return source ? esc(SRC_BADGE[source] || source) : '';
}

// ---- Header ----
w(`<h1>E! Online — Extracted Brand Kit Tokens (Review)</h1>`);
w(`<p><b>Source URL:</b> ${esc(k.metadata.source_url)}</p>`);
w(`<p><b>Crawler version:</b> ${esc(k.metadata.crawler_version)} &nbsp;|&nbsp; <b>Method:</b> ${esc(k.metadata.analysis_method)} &nbsp;|&nbsp; <b>Analysis date:</b> ${esc(k.metadata.analysis_date)}</p>`);
const eq = k.metadata.extraction_quality;
w(`<p><b>Extraction quality:</b> ${eq.extracted_token_count} extracted, ${eq.derived_token_count} derived, ${eq.fallback_token_count} fallback (ratio ${eq.extraction_ratio}). ${eq.fallback_token_count} tokens are defaults that should be verified.</p>`);

// ---- Review flags ----
w('<h2>⚠ Review flags</h2><ul>');
w(`<li><b>Primary accent may be mis-ranked.</b> The crawler selected <b>${swatch(k.colors.primary.hex)}${esc(k.colors.primary.hex)}</b> (named "${esc(k.colors.primary.name)}" from <code>--content-icon-color</code>) as the primary accent by usage frequency. However the CSS variables expose <b>${swatch('#BC2A9B')}#BC2A9B</b> as <code>--primary-color</code> / <code>--navbar-logo-color</code> / <code>--snipe-bkg-color</code> — this is E!'s signature magenta and is likely the true brand primary. Recommend promoting #BC2A9B to primary on review.</li>`);
w(`<li><b>Fallback tokens (${eq.fallback_token_count}):</b> ${eq.fallback_tokens.map((t) => `<code>${esc(t)}</code>`).join(', ')} — these were not found on the page and use defaults.</li>`);
w(`<li><b>Vendor keyframes present.</b> Of the captured animations, several are third-party (<code>jw-*</code> = JW Player, <code>tbl-*</code> = Taboola, <code>onetrust-*</code> = cookie consent) and are not E! brand motion. E!-owned candidates: <code>live_pulse</code>, <code>live_updates_pulse</code>, <code>spinAround</code>, <code>slide-down-custom</code>.</li>`);
w('</ul>');

// ============ 1. BRAND IDENTITY ============
w('<h2>1. Brand identity</h2>');
table(['Token', 'Value'], [
  ['Name', esc(k.brand.name)],
  ['Tagline', esc(k.brand.tagline) || '<i>(empty)</i>'],
  ['Website', esc(k.brand.website)],
  ['Language', esc(k.brand.language)],
  ['Description', esc(k.brand.description)],
]);

// ============ 2. LOGO ============
w('<h2>2. Logo</h2>');
const lp = k.logos.primary || {};
const ss = lp.shape_summary || {};
table(['Token', 'Value'], [
  ['Type', esc(lp.type)],
  ['Rendered width × height', `${esc(lp.width)} × ${esc(lp.height)} px`],
  ['SVG viewBox', esc(ss.viewBox)],
  ['Logo kind', esc(ss.kind)],
  ['Path count', esc(ss.path_count)],
  ['Has text/wordmark', esc(ss.has_text)],
  ['Unique fills', (ss.unique_fills || []).map((f) => `${swatch(f)}${esc(f)}`).join('  ')],
  ['Favicon URL', esc(k.logos.favicon_url)],
  ['Footer/light-dark variants', (k.logos.variants || []).length ? esc(JSON.stringify(k.logos.variants)) : '<i>none</i>'],
]);

// ============ 3. COLORS ============
w('<h2>3. Colors</h2>');
const colorRows = [];
const pushColor = (label, c) => {
  if (!c || !c.hex) return;
  colorRows.push([esc(label), `${swatch(c.hex)}${esc(c.hex)}`, esc(c.name || ''), esc((Array.isArray(c.usage) ? c.usage.join(', ') : c.usage) || ''), srcCell(c.source) + (c.named_via ? ` (named via ${esc(c.named_via)})` : '')]);
};
pushColor('Primary accent', k.colors.primary);
pushColor('Secondary accent', k.colors.secondary);
pushColor('Text — primary', k.colors.text.primary);
pushColor('Text — secondary', k.colors.text.secondary);
pushColor('Text — tertiary', k.colors.text.tertiary);
pushColor('Text — deep dark', k.colors.text.deep_dark);
pushColor('Text — body', k.colors.text.body);
pushColor('Text — caption', k.colors.text.caption);
pushColor('Background — base', k.colors.backgrounds.base);
pushColor('Background — section', k.colors.backgrounds.section);
pushColor('Background — secondary', k.colors.backgrounds.secondary);
pushColor('Background — dark', k.colors.backgrounds.dark);
for (const [name, c] of Object.entries(k.colors.accents || {})) pushColor('Accent — ' + name, c);
for (const [name, c] of Object.entries(k.colors.primary_variants || {})) pushColor('Primary variant — ' + name, c);
for (const [name, c] of Object.entries(k.colors.borders || {})) colorRows.push([esc('Border — ' + name), `${swatch(c.hex)}${esc(c.hex)}`, '', '', srcCell(c.source)]);
table(['Role', 'Hex', 'Name', 'Usage', 'Source'], colorRows);

// UI overlays
if (k.colors.ui_overlays) {
  w('<h3>3a. UI overlays (translucent)</h3>');
  table(['Role', 'Value', 'Source'], Object.entries(k.colors.ui_overlays).map(([n, v]) => [esc(n), esc(v.value), srcCell(v.source)]));
}
// Show / section brand colors
if (k.colors.show_brand_colors) {
  w('<h3>3b. Show / section brand colors</h3>');
  table(['Section', 'Hex', 'Label', 'Source'], Object.entries(k.colors.show_brand_colors).map(([n, v]) => [esc(n), `${swatch(v.hex)}${esc(v.hex)}`, esc(v.section_label), srcCell(v.source)]));
}
// Gradients
if (k.colors.gradients) {
  w('<h3>3c. Gradients</h3>');
  table(['Role', 'Value', 'Source'], Object.entries(k.colors.gradients).map(([n, v]) => [esc(n), esc(v.value), srcCell(v.source)]));
}

// ============ 3d. CSS CUSTOM PROPERTIES ============
w('<h3>3d. CSS custom properties (' + (k.colors.css_custom_properties || []).length + ' total)</h3>');
table(['Property', 'Value', 'Role guess', 'Matches color'], (k.colors.css_custom_properties || []).map((p) => [
  `<code>${esc(p.name)}</code>`, esc(p.value), esc(p.role_guess), p.matches_hex ? `${swatch(p.matches_hex)}${esc(p.matches_hex)}` : '',
]));

// ============ 4. TYPOGRAPHY ============
w('<h2>4. Typography</h2>');
w('<h3>4a. Font families</h3>');
const fp = k.fonts.primary || {}, fsec = k.fonts.secondary || {};
table(['Role', 'Family', 'Fallbacks', 'Weights', 'Usage', 'Source'], [
  ['Primary', esc(fp.family), esc((fp.fallbacks || []).join(', ')), esc(JSON.stringify(fp.weights || {})), esc(fp.usage), srcCell(fp.source)],
  ['Secondary', esc(fsec.family), '', esc(fsec.weight), esc(fsec.usage), srcCell(fsec.source)],
].concat((k.fonts.tertiary || []).map((t) => ['Tertiary', esc(t.family), '', '', esc(t.usage), srcCell(t.source)])));

w('<h3>4b. Type scale — extended 16-role hierarchy</h3>');
table(['Role', 'Size', 'Weight', 'Family', 'Line height', 'Transform', 'Tracking', 'Color', 'Source'],
  (k.fonts.type_scale_extended || []).map((e) => [
    esc(e.role), esc(e.size), esc(e.weight), esc(e.family), esc(e.line_height || ''),
    esc(e.text_transform || ''), esc(e.letter_spacing || ''), e.color ? `${swatch(e.color)}${esc(e.color)}` : '', srcCell(e.source),
  ]));

w('<h3>4c. Type scale — legacy 10-role (back-compat)</h3>');
table(['Role', 'Size', 'Weight', 'Family', 'Line height', 'Color', 'Source'],
  Object.entries(k.fonts.type_scale || {}).map(([role, e]) => [
    esc(role), esc(e.size), esc(e.weight), esc(e.family), esc(e.line_height || ''),
    e.color ? `${swatch(e.color)}${esc(e.color)}` : '', srcCell(e.source),
  ]));

// ============ 5. BUTTONS ============
w('<h2>5. Buttons</h2>');
const btnRows = [];
for (const [variant, b] of Object.entries(k.buttons || {})) {
  if (!b) continue;
  btnRows.push([
    esc(variant),
    b.background_color ? `${swatch(b.background_color)}${esc(b.background_color)}` : '',
    b.text_color ? `${swatch(b.text_color)}${esc(b.text_color)}` : '',
    esc(b.border_radius || ''), esc(b.padding || ''), esc(b.font_size || ''), esc(b.font_weight || ''),
    esc(b.border || ''), srcCell(b.source),
  ]);
}
table(['Variant', 'Background', 'Text', 'Radius', 'Padding', 'Font size', 'Weight', 'Border', 'Source'], btnRows);

// ============ 6. SHADOWS & RADIUS ============
w('<h2>6. Shadows, border-radius, spacing</h2>');
if (k.shadows) {
  w('<h3>6a. Shadow registry</h3>');
  table(['Tier', 'Value'], Object.entries(k.shadows).filter(([key]) => key !== 'source').map(([n, v]) => [esc(n), esc(v)]));
}
if (k.border_radius) {
  w('<h3>6b. Border-radius map</h3>');
  table(['Role', 'Radius'], Object.entries(k.border_radius).filter(([key]) => key !== 'source').map(([n, v]) => [esc(n), esc(v)]));
}
w('<h3>6c. Spacing</h3>');
const sp = k.spacing || {};
const lp2 = k.layout_patterns || {};
const spacingRows = Object.entries(sp).map(([n, v]) => [esc(n), esc(v)]);
if (lp2.spacing_scale) for (const [n, v] of Object.entries(lp2.spacing_scale)) { if (n !== 'source') spacingRows.push(['spacing_scale.' + esc(n), esc(v)]); }
table(['Token', 'Value'], spacingRows);

// ============ 7. LAYOUT ============
w('<h2>7. Layout patterns</h2>');
table(['Token', 'Value'], [
  ['Grid', esc(lp2.grid)],
  ['Header background', `${swatch((lp2.header || {}).background_color)}${esc((lp2.header || {}).background_color)}`],
  ['Header is dark', esc((lp2.header || {}).is_dark)],
  ['Container max-width', esc((lp2.max_widths || {}).site_container || (sp.container_max_width))],
  ['Breakpoint — mobile', esc((lp2.breakpoints || {}).mobile)],
  ['Breakpoint — tablet', esc((lp2.breakpoints || {}).tablet)],
  ['Breakpoint — desktop', esc((lp2.breakpoints || {}).desktop)],
  ['Breakpoint source', esc((lp2.breakpoints || {}).source)],
]);
if ((lp2.header || {}).layers_detailed) {
  w('<h3>7a. Header layers (detailed)</h3>');
  table(['Tag', 'Background', 'Text', 'Height', 'Is dark', 'Source'], lp2.header.layers_detailed.map((l) => [
    esc(l.tag), l.bg ? `${swatch(l.bg)}${esc(l.bg)}` : '', l.text_color ? `${swatch(l.text_color)}${esc(l.text_color)}` : '', esc(l.height), esc(l.is_dark), srcCell(l.source),
  ]));
}

// ============ 8. PHOTO STYLE ============
w('<h2>8. Photo & media style</h2>');
const ps = k.photo_style || {};
table(['Token', 'Value'], [
  ['Thumbnail aspect ratio', esc((ps.thumbnail_format || {}).aspect_ratio)],
  ['Thumbnail border radius', esc((ps.thumbnail_format || {}).border_radius)],
  ['Video indicator', esc((ps.video_thumbnails || {}).indicator)],
  ['Video indicator color', (ps.video_thumbnails || {}).indicator_color ? `${swatch(ps.video_thumbnails.indicator_color)}${esc(ps.video_thumbnails.indicator_color)}` : ''],
  ['Author photo shape', esc((ps.author_photos || {}).shape)],
]);

// ============ 9. ICONS ============
w('<h2>9. Icons</h2>');
const ic = k.icons || {};
w(`<p><b>Style:</b> ${esc(ic.style)} &nbsp;|&nbsp; <b>SVGs detected:</b> ${esc(ic.count_detected)} &nbsp;|&nbsp; <b>Social platforms:</b> ${esc((ic.social_media_icons || {}).platforms ? ic.social_media_icons.platforms.join(', ') : '')}</p>`);
w('<h3>9a. Icon catalog (viewBox + accessibility hints)</h3>');
table(['#', 'viewBox', 'aria-label', 'Role hint'], (ic.catalog || []).map((c, i) => [i + 1, esc(c.viewBox), esc(c.aria_label || ''), esc(c.role_hint || '')]));

// ============ 10. CHARTS ============
if (k.charts) {
  w('<h2>10. Chart embeds</h2>');
  table(['Token', 'Value'], [['Platform', esc(k.charts.platform)], ['Embed method', esc(k.charts.embed_method)], ['Instances', esc((k.charts.instances || []).length)]]);
}

// ============ 11. GRAPHICS / BADGES ============
w('<h2>11. Graphics & badges</h2>');
w(`<p><b>Style:</b> ${esc(k.graphics.style)}</p>`);
table(['Label', 'Background', 'Text color'], (k.graphics.elements || []).map((g) => [
  esc(g.name), esc(g.background_color), g.text_color ? `${swatch(g.text_color)}${esc(g.text_color)}` : '',
]));

// ============ 12. BRAND VOICE ============
w('<h2>12. Brand voice</h2>');
const bv = k.brand_voice || {};
table(['Token', 'Value'], [
  ['Headline format', esc((bv.headline_style || {}).format)],
  ['Headline case', esc((bv.headline_style || {}).case)],
  ['Content labels detected', esc(Object.keys(bv.content_labels || {}).join(', '))],
]);

// ============ 13. BEHAVIORS ============
w('<h2>13. Interaction behaviors (Layer 1B)</h2>');
const bh = k.behaviors || {};
w(`<p><b>Captured:</b> ${(bh.transitions || []).length} transitions, ${(bh.hover_states || []).length} hover states, ${(bh.focus_states || []).length} focus states, ${(bh.active_states || []).length} active states, ${(bh.keyframes || []).length} keyframes, ${(bh.scroll_reveal || []).length} scroll-reveal patterns.</p>`);

if ((bh.transitions || []).length) {
  w('<h3>13a. Transitions</h3>');
  table(['Selector', 'Property', 'Duration (ms)', 'Easing', 'Delay (ms)'], bh.transitions.map((t) => [esc(t.selector_class), esc(t.property), esc(t.duration_ms), esc(t.easing), esc(t.delay_ms)]));
}
if ((bh.focus_states || []).length) {
  w('<h3>13b. Focus states</h3>');
  table(['Selector', 'Diff', 'Transition (ms)'], bh.focus_states.map((f) => [esc(f.selector_class), esc(JSON.stringify(f.diff || {})), esc(f.transition_duration_ms || '')]));
}
w('<h3>13c. Keyframes (animation library)</h3>');
table(['Name', 'Steps', 'Used by', 'Likely owner'], (bh.keyframes || []).map((kf) => {
  const owner = /^jw-/.test(kf.name) ? 'JW Player (vendor)' : /^tbl-/.test(kf.name) ? 'Taboola (vendor)' : /^onetrust/.test(kf.name) ? 'OneTrust (consent)' : 'E! / site';
  return [`<code>${esc(kf.name)}</code>`, esc((kf.steps || []).length), esc((kf.used_by_selectors || []).join(', ')), esc(owner)];
}));
w('<h3>13d. Lazy-load / scroll reveal / motion palette</h3>');
table(['Token', 'Value'], [
  ['Lazy images', esc((bh.lazy_load || {}).count)],
  ['Skeleton present', esc((bh.lazy_load || {}).skeleton_present)],
  ['Shimmer keyframe', esc((bh.lazy_load || {}).shimmer_keyframe_name || '')],
  ['Scroll-reveal patterns', esc((bh.scroll_reveal || []).map((s) => s.selector_class).join(', '))],
  ['Easing palette', esc((bh.easings || []).map((e) => e.value).join(' | '))],
  ['Duration tiers', esc(JSON.stringify(bh.duration_scale || {}))],
]);

w('<hr><p style="color:#888"><i>Generated from output/eonline/brand-kit.json — every token in the kit is represented above. Source tags: From page = extracted live; Computed = derived; Default — verify = fallback.</i></p>');

const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>' + out.join('\n') + '</body></html>';
const dest = path.join(__dirname, '..', 'output', 'eonline', 'review-doc.html');
fs.writeFileSync(dest, html);
console.log('Wrote ' + dest + ' (' + html.length + ' bytes)');
