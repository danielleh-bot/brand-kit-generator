// ============================================================
//  BRAND-KIT CSS EXPORT
//  Converts a brand-kit.json into a portable CSS file: design
//  tokens as CSS custom properties on :root, plus a small library
//  of utility classes that consume them. The output is intended
//  to be dropped straight into a publisher implementation as a
//  shareable artifact.
// ============================================================

function escapeCssString(value) {
  if (value == null) return '';
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function safeFontStack(primary, fallbacks) {
  const list = [];
  if (primary) list.push(`"${escapeCssString(primary)}"`);
  if (Array.isArray(fallbacks)) {
    for (const f of fallbacks) {
      if (f && !list.includes(`"${f}"`)) list.push(f);
    }
  }
  if (list.length === 0) list.push('sans-serif');
  return list.join(', ');
}

function pushVar(lines, name, value) {
  if (value === undefined || value === null || value === '') return;
  lines.push(`  ${name}: ${value};`);
}

function colorVars(lines, colors) {
  if (!colors) return;
  const c = colors;
  if (c.primary?.hex)   pushVar(lines, '--brand-color-primary',   c.primary.hex);
  if (c.secondary?.hex) pushVar(lines, '--brand-color-secondary', c.secondary.hex);

  if (c.text) {
    pushVar(lines, '--brand-color-text-primary',   c.text.primary?.hex);
    pushVar(lines, '--brand-color-text-secondary', c.text.secondary?.hex);
    pushVar(lines, '--brand-color-text-tertiary',  c.text.tertiary?.hex);
  }
  if (c.backgrounds) {
    pushVar(lines, '--brand-color-bg-base',      c.backgrounds.base?.hex);
    pushVar(lines, '--brand-color-bg-section',   c.backgrounds.section?.hex);
    pushVar(lines, '--brand-color-bg-secondary', c.backgrounds.secondary?.hex);
    pushVar(lines, '--brand-color-bg-dark',      c.backgrounds.dark?.hex);
  }
  if (c.accents) {
    pushVar(lines, '--brand-color-accent-warning',  c.accents.warning_yellow?.hex);
    pushVar(lines, '--brand-color-accent-negative', c.accents.negative_red?.hex);
    pushVar(lines, '--brand-color-accent-positive', c.accents.positive_green?.hex);
    pushVar(lines, '--brand-color-accent-info',     c.accents.info_blue?.hex);
  }
}

function fontVars(lines, fonts) {
  if (!fonts) return;
  if (fonts.primary) {
    pushVar(
      lines,
      '--brand-font-primary',
      safeFontStack(fonts.primary.family, fonts.primary.fallbacks),
    );
    if (fonts.primary.weights) {
      pushVar(lines, '--brand-font-primary-regular', fonts.primary.weights.regular);
      pushVar(lines, '--brand-font-primary-bold',    fonts.primary.weights.bold);
    }
  }
  if (fonts.secondary) {
    pushVar(
      lines,
      '--brand-font-secondary',
      safeFontStack(fonts.secondary.family, fonts.secondary.fallbacks || ['serif']),
    );
  }

  if (fonts.type_scale) {
    for (const [role, scale] of Object.entries(fonts.type_scale)) {
      const slug = role.replace(/_/g, '-');
      if (scale.size)          pushVar(lines, `--brand-size-${slug}`,    scale.size);
      if (scale.weight)        pushVar(lines, `--brand-weight-${slug}`,  scale.weight);
      if (scale.line_height)   pushVar(lines, `--brand-leading-${slug}`, scale.line_height);
      if (scale.letter_spacing) pushVar(lines, `--brand-tracking-${slug}`, scale.letter_spacing);
    }
  }
}

function brandVars(lines, brandKit) {
  if (!brandKit?.brand) return;
  if (brandKit.brand.name)
    pushVar(lines, '--brand-name', `"${escapeCssString(brandKit.brand.name)}"`);
  if (brandKit.brand.website)
    pushVar(lines, '--brand-website', `"${escapeCssString(brandKit.brand.website)}"`);
}

function utilityClasses() {
  // A small, opinionated set of utility classes mapped onto the variables
  // above. The goal is "drop this CSS in and your existing markup looks like
  // the publisher", not a full design system.
  return [
    '',
    '/* ---- Backgrounds ---- */',
    '.bg-brand-primary   { background-color: var(--brand-color-primary); }',
    '.bg-brand-secondary { background-color: var(--brand-color-secondary); }',
    '.bg-brand-base      { background-color: var(--brand-color-bg-base); }',
    '.bg-brand-section   { background-color: var(--brand-color-bg-section); }',
    '.bg-brand-dark      { background-color: var(--brand-color-bg-dark); color: var(--brand-color-bg-base); }',
    '',
    '/* ---- Text ---- */',
    '.text-brand-primary   { color: var(--brand-color-text-primary); }',
    '.text-brand-secondary { color: var(--brand-color-text-secondary); }',
    '.text-brand-tertiary  { color: var(--brand-color-text-tertiary); }',
    '.text-brand-accent    { color: var(--brand-color-primary); }',
    '',
    '/* ---- Borders ---- */',
    '.border-brand { border: 1px solid var(--brand-color-bg-section); }',
    '.border-brand-accent { border: 1px solid var(--brand-color-primary); }',
    '',
    '/* ---- Type roles ---- */',
    '.font-brand           { font-family: var(--brand-font-primary, sans-serif); }',
    '.font-brand-secondary { font-family: var(--brand-font-secondary, var(--brand-font-primary, serif)); }',
    '',
    '.brand-headline {',
    '  font-family: var(--brand-font-primary, sans-serif);',
    '  font-size: var(--brand-size-article-title-hero, 34px);',
    '  font-weight: var(--brand-weight-article-title-hero, 700);',
    '  line-height: var(--brand-leading-article-title-hero, 1.15);',
    '  color: var(--brand-color-text-primary);',
    '}',
    '',
    '.brand-card-title {',
    '  font-family: var(--brand-font-primary, sans-serif);',
    '  font-size: var(--brand-size-article-title-card, 22px);',
    '  font-weight: var(--brand-weight-article-title-card, 700);',
    '  line-height: var(--brand-leading-article-title-card, 1.25);',
    '  color: var(--brand-color-text-primary);',
    '}',
    '',
    '.brand-body {',
    '  font-family: var(--brand-font-primary, sans-serif);',
    '  font-size: var(--brand-size-article-body, 18px);',
    '  font-weight: var(--brand-weight-article-body, 400);',
    '  line-height: var(--brand-leading-article-body, 1.6);',
    '  color: var(--brand-color-text-secondary);',
    '}',
    '',
    '.brand-eyebrow {',
    '  font-family: var(--brand-font-primary, sans-serif);',
    '  font-size: var(--brand-size-meta-text, 12px);',
    '  font-weight: 700;',
    '  letter-spacing: 0.08em;',
    '  text-transform: uppercase;',
    '  color: var(--brand-color-primary);',
    '}',
    '',
    '.brand-button {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 12px 20px;',
    '  border: none;',
    '  border-radius: 6px;',
    '  background: var(--brand-color-primary);',
    '  color: var(--brand-color-bg-base, #fff);',
    '  font-family: var(--brand-font-primary, sans-serif);',
    '  font-size: var(--brand-size-buttons, 15px);',
    '  font-weight: var(--brand-weight-buttons, 700);',
    '  cursor: pointer;',
    '  transition: filter 160ms ease;',
    '}',
    '.brand-button:hover { filter: brightness(0.92); }',
    '',
  ].join('\n');
}

/**
 * Convert a brand kit object into a CSS document.
 *
 * @param {object} brandKit
 * @returns {string} CSS source
 */
function brandKitToCss(brandKit) {
  const meta = brandKit?.metadata?.extraction_quality;
  const name = brandKit?.brand?.name || 'Publisher';
  const header = [
    '/*',
    ` * Brand Kit — ${name}`,
    ' * Generated by Taboola Brand Kit Generator',
    meta
      ? ` * Extraction quality: ${meta.extracted_token_count}/${meta.total_tokens} tokens` +
        ` (${Math.round((meta.extraction_ratio || 0) * 100)}%)`
      : null,
    ' *',
    ' * Drop this file into a project to use the publisher\'s design tokens.',
    ' * All values are exposed as CSS custom properties on :root, with a small',
    ' * library of utility classes that consume them.',
    ' */',
    '',
    ':root {',
  ].filter(Boolean);

  const varLines = [];
  brandVars(varLines, brandKit);
  colorVars(varLines, brandKit?.colors);
  fontVars(varLines, brandKit?.fonts);

  return [
    ...header,
    ...varLines,
    '}',
    utilityClasses(),
  ].join('\n');
}

module.exports = { brandKitToCss };
