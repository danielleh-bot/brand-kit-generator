// ============================================================
//  TEMPLATE ENGINE
//  Handlebars setup, partial registration, and custom helpers
// ============================================================

const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const { resolveGoogleFont, FONT_MAP } = require('./fonts');

/**
 * Recursively register all .hbs files from a directory as partials
 * Partial names use path-based naming: partials/proto-nav.hbs → proto-nav
 * Nested: partials/components/feed-card.hbs → components-feed-card
 */
function registerPartials(dir) {
  const baseDir = dir;

  function walk(currentDir, prefix) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, prefix ? `${prefix}-${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.hbs')) {
        const name = entry.name.replace('.hbs', '');
        const partialName = prefix ? `${prefix}-${name}` : name;
        const content = fs.readFileSync(fullPath, 'utf-8');
        Handlebars.registerPartial(partialName, content);
      }
    }
  }

  walk(baseDir, '');
}

/**
 * Register all custom Handlebars helpers
 */
function registerHelpers() {
  Handlebars.registerHelper('eq', (a, b) => a === b);
  Handlebars.registerHelper('neq', (a, b) => a !== b);
  Handlebars.registerHelper('gt', (a, b) => a > b);
  Handlebars.registerHelper('gte', (a, b) => a >= b);
  Handlebars.registerHelper('lt', (a, b) => a < b);
  Handlebars.registerHelper('or', (a, b) => a || b);
  Handlebars.registerHelper('and', (a, b) => a && b);
  Handlebars.registerHelper('not', (a) => !a);

  Handlebars.registerHelper('json', (obj) => {
    return new Handlebars.SafeString(JSON.stringify(obj, null, 2));
  });

  Handlebars.registerHelper('jsonInline', (obj) => {
    return JSON.stringify(obj);
  });

  Handlebars.registerHelper('statusTag', (status) => {
    const colors = {
      drift: { bg: '#fef3c7', text: '#92400e', label: 'Drift' },
      missing: { bg: '#dbeafe', text: '#1e40af', label: 'New' },
      exact: { bg: '#d1fae5', text: '#065f46', label: 'Match' },
    };
    const c = colors[status] || colors.exact;
    return new Handlebars.SafeString(
      `<span style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:${c.bg};color:${c.text}">${c.label}</span>`
    );
  });

  Handlebars.registerHelper('colorSwatch', (hex) => {
    if (!hex || hex === '—') return '';
    return new Handlebars.SafeString(
      `<span style="display:inline-block;width:14px;height:14px;border-radius:3px;background:${hex};border:1px solid rgba(0,0,0,0.15);vertical-align:middle;margin-right:4px"></span>`
    );
  });

  Handlebars.registerHelper('ifNotNull', function (val, options) {
    return (val !== null && val !== undefined && val !== '—') ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('resolveFont', (fontFamily) => {
    const resolved = resolveGoogleFont(fontFamily);
    return resolved ? resolved.google : fontFamily || 'Inter';
  });

  Handlebars.registerHelper('truncate', (str, len) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '…' : str;
  });

  Handlebars.registerHelper('add', (a, b) => a + b);
  Handlebars.registerHelper('subtract', (a, b) => a - b);

  Handlebars.registerHelper('repeat', function (n, options) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn({ index: i });
    }
    return result;
  });

  Handlebars.registerHelper('isColor', (val) => {
    return typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val);
  });

  // snake_case / camelCase → "Title Case". Used by the customer report to
  // label type-scale roles (article_title_hero → "Article Title Hero").
  Handlebars.registerHelper('titleize', (str) => {
    if (!str) return '';
    return String(str)
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  });

  // "16:9" -> "16 / 9" for the CSS aspect-ratio property. Accepts an already
  // slash-formatted value too. Falls back when the token is missing/garbage.
  Handlebars.registerHelper('aspectRatio', (val, fallback) => {
    const def = fallback || '16 / 9';
    if (!val || typeof val !== 'string') return def;
    const m = val.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);
    return m ? `${m[1]} / ${m[2]}` : def;
  });

  // Up to two uppercase initials from a name ("Business Insider" → "BI").
  Handlebars.registerHelper('initials', (str) => {
    if (!str) return '';
    const words = String(str).trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return String(str).slice(0, 2).toUpperCase();
  });

  // Pick a readable text colour (#111 or #fff) for a label sitting on top
  // of a coloured swatch, based on the swatch's perceived luminance.
  Handlebars.registerHelper('contrastColor', (hex) => {
    if (!hex || typeof hex !== 'string') return '#111111';
    const m = hex.replace('#', '').padEnd(6, '0');
    const r = parseInt(m.slice(0, 2), 16);
    const g = parseInt(m.slice(2, 4), 16);
    const b = parseInt(m.slice(4, 6), 16);
    if (![r, g, b].every(Number.isFinite)) return '#111111';
    return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? '#ffffff' : '#111111';
  });

  Handlebars.registerHelper('default', (val, fallback) => {
    return (val !== null && val !== undefined && val !== '') ? val : fallback;
  });

  // Text direction for prototype <html dir="..."> based on language code.
  Handlebars.registerHelper('textDirection', (lang) => {
    const code = String(lang || 'en').toLowerCase().slice(0, 2);
    return /^(he|ar|fa|ur|yi)$/.test(code) ? 'rtl' : 'ltr';
  });

  // Constrain an extracted CSS size token to a sane range. The crawler
  // occasionally pulls a wildly large computed value (e.g. transient
  // viewport-relative units evaluated at off-screen sizes). Bound the
  // numeric component so a glitchy "960px" doesn't blow up the layout.
  Handlebars.registerHelper('clampSize', (size, min, max, fallback) => {
    const def = fallback || '32px';
    if (!size || typeof size !== 'string') return def;
    const match = size.match(/^(-?\d+(?:\.\d+)?)\s*(px|rem|em|vw|vh|%)?$/);
    if (!match) return def;
    const value = parseFloat(match[1]);
    const unit = match[2] || 'px';
    if (unit !== 'px' && unit !== 'rem' && unit !== 'em') return def;
    const lo = parseFloat(min) || 0;
    const hi = parseFloat(max) || Infinity;
    if (!Number.isFinite(value) || value <= 0) return def;
    const clamped = Math.min(hi, Math.max(lo, value));
    return clamped + unit;
  });
}

/**
 * Compile and render a Handlebars template with data
 * @param {string} templateName - Name of template file (without path, with .hbs)
 * @param {object} data - Template data context
 * @param {string} [templatesDir] - Path to templates directory
 * @returns {string} Rendered HTML
 */
function render(templateName, data, templatesDir) {
  const dir = templatesDir || path.join(__dirname, '..', 'templates');
  const templatePath = path.join(dir, templateName);
  const source = fs.readFileSync(templatePath, 'utf-8');
  const template = Handlebars.compile(source);
  return template(data);
}

/**
 * Initialize the engine: register partials and helpers
 */
function init(templatesDir) {
  const dir = templatesDir || path.join(__dirname, '..', 'templates');
  registerHelpers();
  registerPartials(path.join(dir, 'partials'));
}

module.exports = { init, render, registerPartials, registerHelpers, Handlebars };
