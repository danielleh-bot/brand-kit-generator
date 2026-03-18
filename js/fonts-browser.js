// ============================================================
//  FONT MAPPING (Browser-compatible)
//  Maps proprietary fonts to Google Fonts equivalents
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

  // Hebrew / RTL fonts
  'Yedioth':               { google: 'Heebo',             weights: '400;500;700;800' },
  'YediothSans':           { google: 'Heebo',             weights: '400;500;700;800' },
  'yedioth':               { google: 'Heebo',             weights: '400;500;700;800' },
  'NarkissBlock':          { google: 'Frank Ruhl Libre',  weights: '400;500;700' },
  'Narkiss Block':         { google: 'Frank Ruhl Libre',  weights: '400;500;700' },
  'Arial Hebrew':          { google: 'Heebo',             weights: '400;500;700' },
  'Heebo':                 { google: 'Heebo',             weights: '400;500;700;800' },
  'Rubik':                 { google: 'Rubik',             weights: '400;500;600;700' },
  'Assistant':             { google: 'Assistant',          weights: '400;600;700' },
  'David Libre':           { google: 'David Libre',       weights: '400;500;700' },
  'Secular One':           { google: 'Secular One',       weights: '400' },
  'Alef':                  { google: 'Alef',              weights: '400;700' },
  'Varela Round':          { google: 'Varela Round',      weights: '400' },
  'Open Sans Hebrew':      { google: 'Open Sans',         weights: '400;600;700' },
  'Suez One':              { google: 'Suez One',          weights: '400' },

  // Arabic fonts
  'Cairo':                 { google: 'Cairo',             weights: '400;600;700' },
  'Tajawal':               { google: 'Tajawal',           weights: '400;500;700' },
  'Amiri':                 { google: 'Amiri',             weights: '400;700' },
  'Noto Sans Arabic':      { google: 'Noto Sans Arabic',  weights: '400;500;700' },
  'Noto Kufi Arabic':      { google: 'Noto Kufi Arabic',  weights: '400;500;700' },
};

function resolveGoogleFont(fontFamily) {
  if (!fontFamily) return null;
  const families = fontFamily.split(',').map(f => f.trim().replace(/['"]/g, ''));
  for (const family of families) {
    if (FONT_MAP[family]) return FONT_MAP[family];
    const lower = family.toLowerCase();
    for (const [key, val] of Object.entries(FONT_MAP)) {
      if (key.toLowerCase() === lower) return val;
    }
  }
  return null;
}

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

  if (fonts.type_scale) {
    for (const [role, spec] of Object.entries(fonts.type_scale)) {
      if (spec && spec.family && !result[role]) {
        const resolved = resolveGoogleFont(spec.family);
        if (resolved) {
          result[role] = { original: spec.family, google: resolved.google, weights: resolved.weights };
        }
      }
    }
  }

  return result;
}

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
    // Pick a sensible default based on language
    const lang = brandKit.brand_voice?.language || brandKit.brand?.language || 'en';
    const baseLang = lang.toLowerCase().split('-')[0];
    if (baseLang === 'he') {
      params.push('family=Heebo:wght@400;500;700;800');
    } else if (baseLang === 'ar') {
      params.push('family=Cairo:wght@400;600;700');
    } else {
      params.push('family=Inter:wght@400;500;600;700');
    }
  }

  // Detect language and add appropriate subset
  const lang = brandKit.brand_voice?.language || brandKit.brand?.language || 'en';
  const baseLang = lang.toLowerCase().split('-')[0];
  let subset = '';
  if (baseLang === 'he') subset = '&subset=hebrew';
  else if (baseLang === 'ar') subset = '&subset=arabic';
  else if (['ru', 'uk', 'bg'].includes(baseLang)) subset = '&subset=cyrillic';

  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap${subset}`;
}
