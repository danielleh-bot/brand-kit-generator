// ============================================================
//  SHARED BRAND-KIT UTILITIES
//  Helpers that both the CLI (generate.js) and the wizard server
//  (server.js) need to run before handing the kit to the template
//  engine. Keeps the two entry points from drifting.
// ============================================================

/**
 * Guarantee the prototype templates have a concrete header background
 * and `is_dark` flag — even when the crawler couldn't resolve them
 * (translucent sticky headers, sites that skin everything via JS, etc.).
 * Without this, the template falls back to dark bg + dark text →
 * invisible nav.
 */
function normaliseHeaderForRender(brandKit) {
  const lp = (brandKit.layout_patterns = brandKit.layout_patterns || {});
  const hdr = (lp.header = lp.header || {});
  if (!hdr.background_color) {
    hdr.background_color =
      brandKit.colors?.backgrounds?.dark?.hex ||
      brandKit.colors?.backgrounds?.base?.hex ||
      '#1a1a1a';
  }
  const m = String(hdr.background_color).replace('#', '').padEnd(6, '0');
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  hdr.is_dark = Number.isFinite(r) ? 0.299 * r + 0.587 * g + 0.114 * b < 140 : true;
  return brandKit;
}

module.exports = { normaliseHeaderForRender };
