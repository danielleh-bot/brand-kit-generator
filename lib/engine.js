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

  Handlebars.registerHelper('default', (val, fallback) => {
    return (val !== null && val !== undefined && val !== '') ? val : fallback;
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
