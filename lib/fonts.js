// ============================================================
//  FONT MAPPING: Proprietary → Google Fonts
//  Maps publisher-specific proprietary fonts to their closest
//  Google Fonts equivalents for rendering in prototypes
// ============================================================

const FONT_MAP = {
  // Sans-serif
  'FoundersGroteskCond':   { google: 'Oswald',            weights: '400;500;600;700' },
  'FoundersGrotesk':       { google: 'Inter',             weights: '400;500;600;700' },
  'ProximaNova':           { google: 'Inter',             weights: '300;400;500;600;700;800' },
  'Proxima Nova':          { google: 'Inter',             weights: '300;400;500;600;700;800' },
  'Helvetica Neue':        { google: 'Inter',             weights: '300;400;500;600;700' },
  'Helvetica':             { google: 'Inter',             weights: '300;400;500;600;700' },
  'Futura':                { google: 'Nunito Sans',       weights: '400;600;700' },
  'Franklin Gothic':       { google: 'Libre Franklin',    weights: '400;500;600;700' },
  'Gotham':                { google: 'Montserrat',        weights: '400;500;600;700' },
  'Trade Gothic':          { google: 'Barlow Condensed',  weights: '400;500;600;700' },
  'Roboto':                { google: 'Roboto',            weights: '400;500;700' },
  'Open Sans':             { google: 'Open Sans',         weights: '400;600;700' },
  'Lato':                  { google: 'Lato',              weights: '400;700' },
  'Noto Sans':             { google: 'Noto Sans',         weights: '400;500;700' },
  'Source Sans Pro':        { google: 'Source Sans 3',     weights: '400;600;700' },
  'Segoe UI':              { google: 'Inter',             weights: '400;500;600;700' },

  // Serif
  'PublicoText':           { google: 'Lora',              weights: '400;500;600' },
  'PublicoHeadline':       { google: 'Roboto Slab',       weights: '400;500;700' },
  'TiemposHeadline':       { google: 'Playfair Display',  weights: '400;500;600;700' },
  'TiemposText':           { google: 'Source Serif 4',    weights: '400;600' },
  'Georgia':               { google: 'Merriweather',      weights: '400;700' },
  'Cheltenham':            { google: 'Libre Baskerville', weights: '400;700' },
  'Chronicle Display':     { google: 'DM Serif Display',  weights: '400' },
  'Miller':                { google: 'Crimson Pro',       weights: '400;500;600;700' },
  'RobotoSerif':           { google: 'Roboto Serif',      weights: '400;500;600;700' },
  'Noto Serif':            { google: 'Noto Serif',        weights: '400;700' },
  'PT Serif':              { google: 'PT Serif',          weights: '400;700' },

  // Monospace
  'FoundersGroteskMono':   { google: 'Roboto Mono',      weights: '400;500;600' },
  'Courier':               { google: 'IBM Plex Mono',    weights: '400;500;600' },
  'Courier New':           { google: 'IBM Plex Mono',    weights: '400;500;600' },
  'SF Mono':               { google: 'JetBrains Mono',   weights: '400;500;600' },

  // Display / Condensed
  'Impact':                { google: 'Oswald',            weights: '400;500;600;700' },
  'Montserrat':            { google: 'Montserrat',        weights: '400;500;600;700' },
  'Playfair Display':      { google: 'Playfair Display',  weights: '400;500;600;700' },
  'Arimo':                 { google: 'Arimo',             weights: '400;500;700' },
};

/**
 * Parse a font-family string and find the best Google Font match
 * @param {string} fontFamily - CSS font-family value (e.g. "FoundersGroteskCond, sans-serif")
 * @returns {{ google: string, weights: string } | null}
 */
function resolveGoogleFont(fontFamily) {
  if (!fontFamily) return null;
  const families = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
  for (const family of families) {
    if (FONT_MAP[family]) return FONT_MAP[family];
    // Try case-insensitive partial match
    const lower = family.toLowerCase();
    for (const [key, val] of Object.entries(FONT_MAP)) {
      if (key.toLowerCase() === lower) return val;
    }
  }
  return null;
}

/**
 * Resolve all fonts in a brand kit to their Google Font equivalents
 * @param {object} brandKit - Full brand kit object
 * @returns {object} - { headline: { original, google, weights }, body: {...}, ... }
 */
function resolveAllFonts(brandKit) {
  const result = {};
  const fonts = brandKit.fonts || {};

  if (fonts.primary) {
    const resolved = resolveGoogleFont(fonts.primary.family);
    result.headline = {
      original: fonts.primary.family,
      google: resolved ? resolved.google : fonts.primary.family,
      weights: resolved ? resolved.weights : '400;700'
    };
  }

  if (fonts.secondary) {
    const resolved = resolveGoogleFont(fonts.secondary.family);
    result.body = {
      original: fonts.secondary.family,
      google: resolved ? resolved.google : fonts.secondary.family,
      weights: resolved ? resolved.weights : '400;600'
    };
  }

  // Check type_scale for any additional fonts
  if (fonts.type_scale) {
    for (const [role, spec] of Object.entries(fonts.type_scale)) {
      if (spec && spec.family && !result[role]) {
        const resolved = resolveGoogleFont(spec.family);
        if (resolved) {
          result[role] = {
            original: spec.family,
            google: resolved.google,
            weights: resolved.weights
          };
        }
      }
    }
  }

  return result;
}

/**
 * Build Google Fonts <link> URL for all resolved fonts in a brand kit
 * @param {object} brandKit - Full brand kit object
 * @returns {string} - Google Fonts CSS2 URL
 */
function buildGoogleFontsUrl(brandKit) {
  const fonts = resolveAllFonts(brandKit);
  const seen = new Set();
  const params = [];

  for (const { google, weights } of Object.values(fonts)) {
    const key = `${google}:${weights}`;
    if (!seen.has(key)) {
      seen.add(key);
      params.push(`family=${encodeURIComponent(google)}:wght@${weights}`);
    }
  }

  if (params.length === 0) {
    params.push('family=Inter:wght@400;500;600;700');
  }

  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}

module.exports = { FONT_MAP, resolveGoogleFont, resolveAllFonts, buildGoogleFontsUrl };
