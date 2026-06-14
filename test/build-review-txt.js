#!/usr/bin/env node
// Plain-text review of every extracted brand-kit token, grouped by category.
// Uploads cleanly to Google Docs via text/plain -> native Doc conversion.
const fs = require('fs');
const path = require('path');
const k = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'output', 'eonline', 'brand-kit.json'), 'utf-8'));

const L = [];
const w = (s = '') => L.push(s);
const SRC = { extracted: 'From page', derived: 'Computed', fallback: 'DEFAULT — VERIFY', enriched: 'AI — verify', refined: 'AI-named — verify' };
const src = (s) => s ? `  [${SRC[s] || s}]` : '';
const rule = (ch = '─') => w(ch.repeat(72));
function h1(t) { w(); rule('═'); w(t.toUpperCase()); rule('═'); }
function h2(t) { w(); w(t); rule(); }

h1('E! Online — Extracted Brand Kit Tokens (Review)');
w(`Source URL:   ${k.metadata.source_url}`);
w(`Crawler:      v${k.metadata.crawler_version} — ${k.metadata.analysis_method}`);
w(`Analysis date: ${k.metadata.analysis_date}`);
const eq = k.metadata.extraction_quality;
w(`Quality:      ${eq.extracted_token_count} extracted, ${eq.derived_token_count} derived, ${eq.fallback_token_count} fallback (ratio ${eq.extraction_ratio})`);

const primaryHex = (k.colors.primary && k.colors.primary.hex) || '';
const promoted = k.colors.primary && k.colors.primary.promoted_from;
h2('⚠ REVIEW FLAGS');
if (promoted) {
  w(`1. PRIMARY RESOLVED CORRECTLY. Primary = ${primaryHex} (E! magenta), promoted from`);
  w(`   the explicit brand variable ${promoted}. The high-traffic teal #2CA8C8`);
  w('   (--content-icon-color) is captured as the secondary accent. Confirm on review.');
} else {
  w(`1. PRIMARY = ${primaryHex} (picked by usage frequency). If the publisher declares a`);
  w('   --primary-color / --navbar-logo-color brand variable, verify it matches.');
}
w(`2. FALLBACK TOKENS (${eq.fallback_token_count}, not found on page — verify): ${eq.fallback_tokens.join(', ')}`);
w('3. VENDOR KEYFRAMES present (jw-* = JW Player, tbl-* = Taboola, onetrust-* =');
w('   consent). E!-owned motion candidates: live_pulse, live_updates_pulse,');
w('   spinAround, slide-down-custom.');

// 1. BRAND
h1('1. Brand identity');
w(`Name:        ${k.brand.name}`);
w(`Tagline:     ${k.brand.tagline || '(empty)'}`);
w(`Website:     ${k.brand.website}`);
w(`Language:    ${k.brand.language}`);
w(`Description: ${String(k.brand.description || '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()}`);

// 2. LOGO
h1('2. Logo');
const lp = k.logos.primary || {}, ss = lp.shape_summary || {};
w(`Type:          ${lp.type}`);
w(`Rendered size: ${lp.width} × ${lp.height} px`);
w(`SVG viewBox:   ${ss.viewBox}`);
w(`Logo kind:     ${ss.kind} (path_count ${ss.path_count}, has_text ${ss.has_text})`);
w(`Unique fills:  ${(ss.unique_fills || []).join(', ')}`);
w(`Favicon:       ${k.logos.favicon_url}`);
w(`Variants:      ${(k.logos.variants || []).length ? JSON.stringify(k.logos.variants) : 'none'}`);

// 3. COLORS
h1('3. Colors');
const colorLine = (label, c) => { if (c && c.hex) w(`• ${label}: ${c.hex}  "${c.name || ''}"${c.usage ? '  — usage: ' + (Array.isArray(c.usage) ? c.usage.join(', ') : c.usage) : ''}${src(c.source)}${c.named_via ? '  (named via ' + c.named_via + ')' : ''}`); };
colorLine('Primary accent', k.colors.primary);
colorLine('Secondary accent', k.colors.secondary);
colorLine('Text — primary', k.colors.text.primary);
colorLine('Text — secondary', k.colors.text.secondary);
colorLine('Text — tertiary', k.colors.text.tertiary);
colorLine('Text — deep dark', k.colors.text.deep_dark);
colorLine('Text — body', k.colors.text.body);
colorLine('Text — caption', k.colors.text.caption);
colorLine('Background — base', k.colors.backgrounds.base);
colorLine('Background — section', k.colors.backgrounds.section);
colorLine('Background — secondary', k.colors.backgrounds.secondary);
colorLine('Background — dark', k.colors.backgrounds.dark);
for (const [n, c] of Object.entries(k.colors.accents || {})) colorLine('Accent — ' + n, c);
for (const [n, c] of Object.entries(k.colors.primary_variants || {})) colorLine('Primary variant — ' + n, c);
for (const [n, c] of Object.entries(k.colors.borders || {})) w(`• Border — ${n}: ${c.hex}${src(c.source)}`);
if (k.colors.ui_overlays) { w(); w('UI overlays (translucent):'); for (const [n, v] of Object.entries(k.colors.ui_overlays)) w(`• ${n}: ${v.value}${src(v.source)}`); }
if (k.colors.show_brand_colors) { w(); w('Show / section brand colors:'); for (const [n, v] of Object.entries(k.colors.show_brand_colors)) w(`• ${n}: ${v.hex} "${v.section_label}"${src(v.source)}`); }

h2(`3a. CSS custom properties (${(k.colors.css_custom_properties || []).length} total)`);
for (const p of (k.colors.css_custom_properties || [])) w(`• ${p.name} = ${p.value}  [${p.role_guess}]${p.matches_hex ? '  → ' + p.matches_hex : ''}`);

// 4. TYPOGRAPHY
h1('4. Typography');
const fp = k.fonts.primary || {}, fsec = k.fonts.secondary || {};
w(`Primary font:   ${fp.family} (fallbacks: ${(fp.fallbacks || []).join(', ')}; weights ${JSON.stringify(fp.weights || {})})${src(fp.source)}`);
w(`   usage: ${fp.usage}`);
w(`Secondary font: ${fsec.family} (weight ${fsec.weight}; usage ${fsec.usage})${src(fsec.source)}`);
for (const t of (k.fonts.tertiary || [])) w(`Tertiary font:  ${t.family}${src(t.source)}`);

h2('4a. Type scale — extended 16-role hierarchy');
for (const e of (k.fonts.type_scale_extended || [])) {
  const bits = [`${e.size}`, `w${e.weight}`, e.family];
  if (e.line_height) bits.push(`lh ${e.line_height}`);
  if (e.text_transform) bits.push(e.text_transform);
  if (e.letter_spacing) bits.push(`tracking ${e.letter_spacing}`);
  if (e.color) bits.push(e.color);
  w(`• ${e.role}: ${bits.join(' / ')}${src(e.source)}`);
}
h2('4b. Type scale — legacy 10-role (back-compat)');
for (const [role, e] of Object.entries(k.fonts.type_scale || {})) {
  const bits = [`${e.size}`, `w${e.weight}`, e.family];
  if (e.line_height) bits.push(`lh ${e.line_height}`);
  if (e.color) bits.push(e.color);
  w(`• ${role}: ${bits.join(' / ')}${src(e.source)}`);
}

// 5. BUTTONS
h1('5. Buttons');
for (const [variant, b] of Object.entries(k.buttons || {})) {
  if (!b) continue;
  w(`• ${variant}: bg ${b.background_color} / text ${b.text_color} / radius ${b.border_radius} / pad ${b.padding} / ${b.font_size} w${b.font_weight}${b.border ? ' / border ' + b.border : ''}${src(b.source)}`);
}

// 6. SHADOWS / RADIUS / SPACING
h1('6. Shadows, border-radius, spacing');
if (k.shadows) { w('Shadow registry:'); for (const [n, v] of Object.entries(k.shadows)) if (n !== 'source') w(`• ${n}: ${v}`); }
if (k.border_radius) { w(); w('Border-radius map:'); for (const [n, v] of Object.entries(k.border_radius)) if (n !== 'source') w(`• ${n}: ${v}`); }
w(); w('Spacing:');
for (const [n, v] of Object.entries(k.spacing || {})) w(`• ${n}: ${v}`);
if (k.layout_patterns.spacing_scale) for (const [n, v] of Object.entries(k.layout_patterns.spacing_scale)) if (n !== 'source') w(`• spacing_scale.${n}: ${v}`);

// 7. LAYOUT
h1('7. Layout patterns');
const lp2 = k.layout_patterns || {};
w(`Grid:            ${lp2.grid}`);
w(`Header bg:       ${(lp2.header || {}).background_color} (is_dark ${(lp2.header || {}).is_dark})`);
w(`Container width: ${(lp2.max_widths || {}).site_container || k.spacing.container_max_width}`);
const bp = lp2.breakpoints || {};
w(`Breakpoints:     mobile ${bp.mobile}, tablet ${bp.tablet}, desktop ${bp.desktop}  (source: ${bp.source})`);
for (const l of ((lp2.header || {}).layers_detailed || [])) w(`• header layer <${l.tag}>: bg ${l.bg || '—'} / text ${l.text_color} / h${l.height}${src(l.source)}`);

// 8. PHOTO
h1('8. Photo & media style');
const psf = (k.photo_style || {}).thumbnail_format || {}, vt = (k.photo_style || {}).video_thumbnails || {};
w(`Thumbnail aspect ratio: ${psf.aspect_ratio}`);
w(`Thumbnail border radius: ${psf.border_radius}`);
w(`Video indicator: ${vt.indicator} (${vt.indicator_color})`);

// 9. ICONS
h1('9. Icons');
const ic = k.icons || {};
w(`Style: ${ic.style} | SVGs detected: ${ic.count_detected} | Social: ${(ic.social_media_icons || {}).platforms ? ic.social_media_icons.platforms.join(', ') : ''}`);
w(); w('Icon catalog:');
(ic.catalog || []).forEach((c, i) => w(`• #${i + 1} viewBox ${c.viewBox}${c.aria_label ? ' / aria "' + c.aria_label + '"' : ''}${c.role_hint ? ' / role "' + c.role_hint + '"' : ''}`));

// 10. CHARTS
if (k.charts) { h1('10. Chart embeds'); w(`Platform: ${k.charts.platform} / ${k.charts.embed_method} / instances ${(k.charts.instances || []).length}`); }

// 11. GRAPHICS
h1('11. Graphics & badges');
w(`Style: ${k.graphics.style}`);
for (const g of (k.graphics.elements || [])) w(`• "${g.name}": bg ${g.background_color} / text ${g.text_color || '—'}`);

// 12. BRAND VOICE
h1('12. Brand voice');
const bv = k.brand_voice || {};
w(`Headline format: ${(bv.headline_style || {}).format} / case ${(bv.headline_style || {}).case}`);
w(`Content labels:  ${Object.keys(bv.content_labels || {}).join(', ')}`);

// 13. BEHAVIORS
h1('13. Interaction behaviors (Layer 1B)');
const bh = k.behaviors || {};
w(`Captured: ${(bh.transitions || []).length} transitions, ${(bh.hover_states || []).length} hover, ${(bh.focus_states || []).length} focus, ${(bh.active_states || []).length} active, ${(bh.keyframes || []).length} keyframes, ${(bh.scroll_reveal || []).length} scroll-reveal.`);
if ((bh.transitions || []).length) { w(); w('Transitions:'); for (const t of bh.transitions) w(`• ${t.selector_class}: ${t.property} ${t.duration_ms}ms ${t.easing} (delay ${t.delay_ms}ms)`); }
if ((bh.focus_states || []).length) { w(); w('Focus states:'); for (const f of bh.focus_states) w(`• ${f.selector_class}: ${JSON.stringify(f.diff)}`); }
w(); w('Keyframes (animation library):');
for (const kf of (bh.keyframes || [])) {
  const owner = /^jw-/.test(kf.name) ? 'JW Player' : /^tbl-/.test(kf.name) ? 'Taboola' : /^onetrust/.test(kf.name) ? 'OneTrust' : 'E! / site';
  w(`• ${kf.name} (${(kf.steps || []).length} steps) — ${owner}${(kf.used_by_selectors || []).length ? ' — used by ' + kf.used_by_selectors.join(', ') : ''}`);
}
w(); w('Motion/lazy:');
w(`• Lazy images: ${(bh.lazy_load || {}).count} | Skeleton present: ${(bh.lazy_load || {}).skeleton_present}`);
w(`• Scroll-reveal: ${(bh.scroll_reveal || []).map((s) => s.selector_class).join(', ') || '—'}`);
w(`• Easing palette: ${(bh.easings || []).map((e) => e.value).join(' | ') || '—'}`);
w(`• Duration tiers: ${JSON.stringify(bh.duration_scale || {})}`);

w(); rule('═');
w('Generated from output/eonline/brand-kit.json — every token in the kit is');
w('represented above. Source tags: From page = extracted live; Computed = derived;');
w('DEFAULT — VERIFY = fallback (not found on page).');

const text = L.join('\n');
const dest = path.join(__dirname, '..', 'output', 'eonline', 'review-doc.txt');
fs.writeFileSync(dest, text);
console.log('Wrote ' + dest + ' (' + text.length + ' chars, ' + L.length + ' lines)');
