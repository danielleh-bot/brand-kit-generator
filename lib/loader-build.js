// ============================================================
//  LAYER 3 — LOADER BUILDER
//  Consumes the merged brand kit + the token→hook registry and
//  emits three artifacts per publisher:
//    • loader.js                — data-driven BRAND block + CSS injector
//    • loader.css               — the same CSS, standalone
//    • feed-mapping-report.html — Applied / Gaps / Skipped, the workshop deliverable
//
//  Enforces the safe-application contract (six visual + five
//  behavioural guarantees). Any violation degrades to a logged
//  fallback or drops the rule with a reason — the feed can never
//  break, and motion always respects prefers-reduced-motion.
// ============================================================

const fs = require('fs');
const path = require('path');
const { TOKEN_HOOKS, TRC_OWNED_SELECTORS, SAFE_ANIMATABLE_PROPS } = require('./feed-mapping');
let resolveGoogleFont;
try { ({ resolveGoogleFont } = require('./fonts')); } catch { resolveGoogleFont = () => null; }

const MAX_CSS_BYTES = 30 * 1024;
const MAX_EASINGS = 4;
const MAX_DURATION_TIERS = 4;
const MAX_TRANSITION_MS = 600;
const CAP_TRANSITION_MS = 400;

// ---- colour helpers (mirror crawler.js:18-50, standalone for Node) --------
function parseHex(str) {
  if (!str || typeof str !== 'string') return null;
  let s = str.trim();
  const rgb = s.match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i);
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] };
  if (s[0] === '#') {
    let h = s.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length >= 6) return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }
  return null;
}
function relLum(c) {
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
function contrastRatio(a, b) {
  const ca = parseHex(a), cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = relLum(ca), lb = relLum(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// numeric clamp — mirrors engine.js clampSize, standalone
function clampNumeric(value, lo, hi) {
  if (value == null) return null;
  const m = String(value).match(/^(-?\d+(?:\.\d+)?)\s*(px|rem|em|%)?$/);
  if (!m) return String(value);
  const n = parseFloat(m[1]);
  const unit = m[2] || 'px';
  if (!Number.isFinite(n)) return null;
  const clamped = Math.min(hi == null ? Infinity : hi, Math.max(lo == null ? -Infinity : lo, n));
  return clamped + (m[2] ? unit : (unit === 'px' ? 'px' : unit));
}

// ---- token-path resolver --------------------------------------------------
// Supports dot paths, [role=foo] selectors into *_extended arrays, and a
// trailing .* wildcard (returns the object of children).
function resolveToken(kit, tokenPath) {
  // array role selector e.g. fonts.type_scale_extended[role=card_title].size
  const roleMatch = tokenPath.match(/^(.+?)\[role=([^\]]+)\](?:\.(.+))?$/);
  if (roleMatch) {
    const [, arrPath, role, rest] = roleMatch;
    const arr = getPath(kit, arrPath);
    if (!Array.isArray(arr)) return undefined;
    const hit = arr.find((e) => e && e.role === role);
    if (!hit) return undefined;
    return rest ? getPath(hit, rest) : hit;
  }
  if (tokenPath.endsWith('.*')) {
    return getPath(kit, tokenPath.slice(0, -2));
  }
  return getPath(kit, tokenPath);
}
function getPath(obj, p) {
  return p.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// ---- font-fallback ladder -------------------------------------------------
const SYSTEM_SANS = 'system-ui, -apple-system, Segoe UI, Roboto';
const SYSTEM_SERIF = 'Georgia, Cambria, Times New Roman';
function fontStack(family, fallbacks) {
  const list = [];
  if (family) list.push(/\s/.test(family) ? `"${family}"` : family);
  const g = resolveGoogleFont(family);
  if (g && g.google && g.google !== family) list.push(/\s/.test(g.google) ? `"${g.google}"` : g.google);
  (fallbacks || []).forEach((f) => { if (f && !list.includes(f)) list.push(f); });
  const serif = /serif|times|georgia|playfair|lora|merriweather/i.test(family || '');
  list.push(serif ? SYSTEM_SERIF : SYSTEM_SANS);
  list.push(serif ? 'serif' : 'sans-serif');
  return list.join(', ');
}

// ---- main -----------------------------------------------------------------

function buildLoaderArtifacts(brandKit, { slug, outputDir, validateRender } = {}) {
  const applied = [];   // {token, selector, property, value, note?}
  const gaps = [];      // {token, recommendation, criticality}
  const skipped = [];   // {token, reason}
  const cssRules = [];  // {selector, decls: {prop:value}, important}
  const reducedMotion = []; // selectors needing a reduced-motion companion

  const isTrcOwned = (selector) =>
    TRC_OWNED_SELECTORS.some((own) => selector.split(',').some((s) => s.trim().includes(own.replace(/[\[\]^="]/g, ''))));

  // derived motion palette (capped)
  const bh = brandKit.behaviors || {};
  const easings = (bh.easings || []).slice(0, MAX_EASINGS).map((e) => e.value || e);
  const durationScale = bh.duration_scale || {};
  const normalDur = Math.min(CAP_TRANSITION_MS, durationScale.normal || durationScale.fast || 200);
  const primaryEasing = easings[0] || 'ease';

  for (const hook of TOKEN_HOOKS) {
    if (hook.category === 'safe-ignore') {
      // Only report safe-ignore for tokens actually present in the kit.
      const present = resolveToken(brandKit, hook.token);
      if (present !== undefined || hook.behavioral) skipped.push({ token: hook.token, reason: hook.reason });
      continue;
    }

    if (hook.category === 'gap') {
      const present = resolveToken(brandKit, hook.token);
      // Report the gap only when the publisher actually has this expression.
      const has = hook.behavioral
        ? (hook.token.includes('scroll_reveal') ? (bh.scroll_reveal || []).length > 0 : present !== undefined)
        : (present !== undefined && (typeof present !== 'object' || Object.keys(present).length > 0));
      if (has) gaps.push({ token: hook.token, recommendation: hook.recommendation, criticality: hook.criticality });
      continue;
    }

    // category === 'mapped'
    if (hook.behavioral) {
      const beh = buildBehavioralRule(hook, brandKit, { normalDur, primaryEasing, isTrcOwned });
      if (beh.skip) { skipped.push({ token: hook.token, reason: beh.skip }); continue; }
      if (beh.gap) { gaps.push({ token: hook.token, recommendation: beh.gap, criticality: hook.criticality }); continue; }
      if (beh.rule) {
        cssRules.push(beh.rule);
        if (beh.reducedMotionSelector) reducedMotion.push(beh.reducedMotionSelector);
        applied.push({ token: hook.token, selector: beh.rule.selector, property: Object.keys(beh.rule.decls).join(', '), value: beh.summary, note: beh.note });
      }
      continue;
    }

    // visual mapped
    let value = resolveToken(brandKit, hook.token);
    if (value && typeof value === 'object' && value.hex) value = value.hex; // colour entry → hex
    if (value == null || value === '') { skipped.push({ token: hook.token, reason: 'token absent in brand kit' }); continue; }

    for (const target of hook.targets) {
      let v = value;
      let note;
      const safety = hook.safety || {};

      // numeric bounds
      if (safety.clamp) {
        const clamped = clampNumeric(v, safety.clamp[0], safety.clamp[1]);
        if (clamped !== String(v)) note = `clamped to ${clamped}`;
        v = clamped;
      }
      // font-fallback ladder
      if (safety.font_fallback_required) {
        const fp = brandKit.fonts && brandKit.fonts.primary;
        v = fontStack(value, fp && fp.fallbacks);
        note = '4-tier fallback ladder applied';
      }
      // contrast safety
      if (safety.contrast_against) {
        let against = resolveToken(brandKit, safety.contrast_against);
        if (against && typeof against === 'object' && against.hex) against = against.hex;
        const ratio = contrastRatio(v, against);
        if (ratio != null && ratio < (safety.min_ratio || 4.5)) {
          // fall back to the most legible text token
          const fallback = getPath(brandKit, 'colors.text.primary.hex');
          const fbRatio = contrastRatio(fallback, against);
          if (fallback && fbRatio && fbRatio >= (safety.min_ratio || 4.5)) {
            note = `contrast ${ratio.toFixed(2)}<${safety.min_ratio || 4.5} → safety_fallback to text.primary`;
            v = fallback;
          } else {
            skipped.push({ token: hook.token, reason: `contrast ${ratio.toFixed(2)} below ${safety.min_ratio || 4.5}:1 against ${safety.contrast_against}; no safe fallback` });
            continue;
          }
        }
      }

      const important = /\.trc-|tbl-/.test(target.selector); // win over TRC inline styles only
      cssRules.push({ selector: target.selector, decls: { [target.property]: v }, important });
      applied.push({ token: hook.token, selector: target.selector, property: target.property, value: v, note });
    }
  }

  // ---- assemble CSS, enforce 30KB cap (critical wins) ----
  let css = renderCss(cssRules, reducedMotion);
  let truncatedNote = null;
  if (Buffer.byteLength(css, 'utf8') > MAX_CSS_BYTES) {
    const criticalTokens = new Set(TOKEN_HOOKS.filter((h) => h.criticality === 'critical').map((h) => h.token));
    const kept = cssRules.filter((r) => applied.find((a) => a.selector === r.selector && criticalTokens.has(a.token)));
    css = renderCss(kept, reducedMotion);
    truncatedNote = `CSS exceeded ${MAX_CSS_BYTES} bytes; dropped non-critical rules to fit.`;
  }

  const loaderJs = renderLoaderJs(brandKit, css, slug);
  const reportHtml = renderReport(brandKit, { applied, gaps, skipped, truncatedNote, slug });

  const out = {};
  if (outputDir) {
    fs.writeFileSync(path.join(outputDir, 'loader.css'), css);
    fs.writeFileSync(path.join(outputDir, 'loader.js'), loaderJs);
    fs.writeFileSync(path.join(outputDir, 'feed-mapping-report.html'), reportHtml);
  }
  out.summary = {
    applied_count: applied.length,
    gap_count: gaps.length,
    safe_ignored_count: skipped.length,
    contrast_fallback_count: applied.filter((a) => a.note && a.note.includes('safety_fallback')).length,
    font_fallback_count: applied.filter((a) => a.note && a.note.includes('fallback ladder')).length,
    css_bytes: Buffer.byteLength(css, 'utf8'),
    truncated: !!truncatedNote,
  };
  out.applied = applied; out.gaps = gaps; out.skipped = skipped;
  out.css = css; out.loaderJs = loaderJs; out.reportHtml = reportHtml;

  if (validateRender) out.validation = staticRenderChecks(css, applied, brandKit);
  return out;
}

// ---- behavioural rule builder ---------------------------------------------
function buildBehavioralRule(hook, kit, ctx) {
  const bh = kit.behaviors || {};
  const target = hook.targets && hook.targets[0];
  if (!target) return { skip: 'no target' };
  if (ctx.isTrcOwned(target.selector)) return { skip: 'TRC-engine-owned selector (no-conflict guard)' };

  // hover states
  const hoverMatch = hook.token.match(/hover_states\[role=(\w+)\]/);
  if (hoverMatch) {
    const role = hoverMatch[1];
    // map role → a representative captured hover state
    const wantSel = role === 'link' ? /(^|[^-])a$|video-title|link/ : /card|teaser/;
    const hs = (bh.hover_states || []).find((h) => h.diff && wantSel.test(h.selector_class || ''));
    if (!hs) return { gap: `No hover state captured for role "${role}" — nothing to install.` };
    const decls = {};
    for (const [prop, change] of Object.entries(hs.diff || {})) {
      const cssProp = prop.replace(/_/g, '-');
      if (!SAFE_ANIMATABLE_PROPS.includes(cssProp)) continue; // layout-thrash guard
      decls[cssProp] = change.to;
    }
    if (!Object.keys(decls).length) return { gap: 'Hover intent preserved, but all changed properties caused layout thrash — skipped.' };
    let dur = Math.min(ctx.normalDur, MAX_TRANSITION_MS);
    if (hs.transition_duration_ms) dur = Math.min(MAX_TRANSITION_MS, hs.transition_duration_ms);
    if (dur > MAX_TRANSITION_MS) dur = CAP_TRANSITION_MS;
    const baseSel = target.selector.replace(/:hover.*/, '');
    const transition = `all ${dur}ms ${ctx.primaryEasing}`;
    return {
      rule: { selector: target.selector, decls, important: /trc-|tbl-/.test(target.selector), baselineSelector: baseSel, baselineTransition: transition },
      reducedMotionSelector: baseSel,
      summary: `hover → ${Object.entries(decls).map(([p, v]) => `${p}:${v}`).join('; ')} (${dur}ms ${ctx.primaryEasing})`,
      note: 'reduced-motion companion emitted',
    };
  }

  // badge pulse keyframe
  if (hook.token.includes('badge_pulse')) {
    const kf = (bh.keyframes || []).find((k) => /pulse/i.test(k.name) && !/^jw-|^tbl-|^onetrust/.test(k.name));
    if (!kf) return { gap: 'No brand pulse keyframe captured (only vendor keyframes present).' };
    const dur = durTier(bh.duration_scale, 'slow') || 1200;
    return {
      rule: { selector: target.selector, decls: { animation: `${kf.name} ${dur}ms ${ctx.primaryEasing} infinite` }, important: true, keyframe: kf },
      reducedMotionSelector: target.selector,
      summary: `${kf.name} ${dur}ms infinite (LIVE-only, reduced-motion gated)`,
      note: 'continuous animation — LIVE-content-only exception, reduced-motion gated',
    };
  }
  return { skip: 'unrecognised behavioural token' };
}
function durTier(scale, tier) { return scale && scale[tier]; }

// ---- renderers ------------------------------------------------------------
function renderCss(rules, reducedMotionSelectors) {
  const lines = ['/* Generated by Taboola Brand Kit Generator — Layer 3 loader */', ''];
  // baseline transitions for behavioural rules
  const baselines = {};
  const keyframes = {};
  for (const r of rules) {
    if (r.baselineSelector && r.baselineTransition) baselines[r.baselineSelector] = r.baselineTransition;
    if (r.keyframe) keyframes[r.keyframe.name] = r.keyframe;
  }
  for (const [sel, transition] of Object.entries(baselines)) {
    lines.push(`${sel} { transition: ${transition}; }`);
  }
  for (const r of rules) {
    const decls = Object.entries(r.decls).map(([p, v]) => `  ${p}: ${v}${r.important ? ' !important' : ''};`).join('\n');
    lines.push(`${r.selector} {\n${decls}\n}`);
  }
  // emit used keyframes
  for (const kf of Object.values(keyframes)) {
    const steps = (kf.steps || []).map((s) => `  ${s.percent} { ${Object.entries(s.properties || {}).map(([p, v]) => `${p}: ${v};`).join(' ')} }`).join('\n');
    if (steps) lines.push(`@keyframes ${kf.name} {\n${steps}\n}`);
  }
  // reduced-motion companion — always present when any motion was emitted
  const motionSelectors = [...new Set(reducedMotionSelectors)];
  if (motionSelectors.length || Object.keys(keyframes).length) {
    const sels = motionSelectors.length ? motionSelectors.join(', ') : '*';
    lines.push('');
    lines.push('@media (prefers-reduced-motion: reduce) {');
    lines.push(`  ${sels} { transition: none !important; animation: none !important; }`);
    lines.push('}');
  }
  return lines.join('\n') + '\n';
}

function renderLoaderJs(brandKit, css, slug) {
  const BRAND = {
    name: brandKit.brand && brandKit.brand.name,
    primary: brandKit.colors && brandKit.colors.primary && brandKit.colors.primary.hex,
    secondary: brandKit.colors && brandKit.colors.secondary && brandKit.colors.secondary.hex,
    text: brandKit.colors && brandKit.colors.text && {
      primary: brandKit.colors.text.primary && brandKit.colors.text.primary.hex,
      secondary: brandKit.colors.text.secondary && brandKit.colors.text.secondary.hex,
    },
    background: brandKit.colors && brandKit.colors.backgrounds && brandKit.colors.backgrounds.base && brandKit.colors.backgrounds.base.hex,
    font: brandKit.fonts && brandKit.fonts.primary && brandKit.fonts.primary.family,
    radius: brandKit.border_radius && brandKit.border_radius.cards,
    breakpoints: brandKit.layout_patterns && brandKit.layout_patterns.breakpoints,
  };
  return `// Taboola feed brand loader — ${slug || (brandKit.brand && brandKit.brand.name) || 'publisher'}
// Auto-generated from brand-kit.json by lib/loader-build.js. Data, not theme switches:
// every value below is a function of this publisher's own extracted tokens.
(function () {
  var BRAND = ${JSON.stringify(BRAND, null, 2)};
  var CSS = ${JSON.stringify(css)};
  function inject() {
    if (document.getElementById('tbl-brand-loader')) return;
    var style = document.createElement('style');
    style.id = 'tbl-brand-loader';
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
  window.__TBL_BRAND__ = BRAND;
})();
`;
}

function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderReport(brandKit, { applied, gaps, skipped, truncatedNote, slug }) {
  const name = (brandKit.brand && brandKit.brand.name) || slug || 'Publisher';
  const row = (cells) => '<tr>' + cells.map((c) => `<td>${c}</td>`).join('') + '</tr>';
  const swatch = (v) => /^#[0-9a-fA-F]{3,8}$/.test(v) ? `<span style="display:inline-block;width:12px;height:12px;border:1px solid #999;background:${v};vertical-align:middle;margin-right:4px"></span>${esc(v)}` : esc(v);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(name)} — Feed Mapping Report</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:1100px;margin:24px auto;padding:0 16px;color:#1a1a2e}
h1{margin-bottom:4px}h2{margin-top:32px;border-bottom:2px solid #eee;padding-bottom:4px}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top}
th{background:#f5f5f7}code{background:#f0f0f4;padding:1px 4px;border-radius:3px;font-size:12px}
.crit{color:#b00020;font-weight:600}.tag{display:inline-block;padding:1px 8px;border-radius:9999px;font-size:11px;font-weight:600}
.applied{background:#d1fae5;color:#065f46}.gap{background:#fef3c7;color:#92400e}.skip{background:#e5e7eb;color:#374151}
.note{color:#666;font-style:italic}</style></head><body>
<h1>${esc(name)} — Feed Mapping Report</h1>
<p>How this publisher's extracted brand tokens map onto the Taboola feed surface.
<b>${applied.length}</b> applied · <b>${gaps.length}</b> gaps · <b>${skipped.length}</b> safe-ignored.</p>
${truncatedNote ? `<p class="crit">${esc(truncatedNote)}</p>` : ''}

<h2><span class="tag applied">Applied</span> Tokens driving the feed (${applied.length})</h2>
<table><tr><th>Token</th><th>Selector</th><th>Property</th><th>Resolved value</th><th>Note</th></tr>
${applied.map((a) => row([`<code>${esc(a.token)}</code>`, `<code>${esc(a.selector)}</code>`, esc(a.property), swatch(a.value), a.note ? `<span class="note">${esc(a.note)}</span>` : ''])).join('\n')}
</table>

<h2><span class="tag gap">Gaps</span> Brand expressions with no Taboola hook (${gaps.length})</h2>
<p>These are the workshop asks for Taboola engineering — hooks to add so the feed stops feeling generic.</p>
<table><tr><th>Token</th><th>Criticality</th><th>Recommendation</th></tr>
${gaps.map((g) => row([`<code>${esc(g.token)}</code>`, esc(g.criticality || ''), esc(g.recommendation)])).join('\n')}
</table>

<h2><span class="tag skip">Skipped</span> Deliberately not applied (${skipped.length})</h2>
<table><tr><th>Token</th><th>Reason</th></tr>
${skipped.map((s) => row([`<code>${esc(s.token)}</code>`, esc(s.reason)])).join('\n')}
</table>
<hr><p class="note">Generated by lib/loader-build.js against the merged brand kit. Behavioural rules ship with a prefers-reduced-motion companion; only paint/composite properties are animated; TRC-engine-owned selectors are never touched.</p>
</body></html>`;
}

// ---- optional static render checks ----------------------------------------
function staticRenderChecks(css, applied, brandKit) {
  const issues = [];
  // text colour == background colour. Skip selectors that sit over media
  // (play icons, thumbnails, video scrims) — white-on-image is intentional
  // there, not a contrast defect against the card background.
  const OVER_MEDIA = /play-icon|thumbnail|video|overlay|scrim|image/i;
  for (const a of applied) {
    if (a.property === 'color' && !OVER_MEDIA.test(a.selector)) {
      const bg = brandKit.colors && brandKit.colors.backgrounds && brandKit.colors.backgrounds.base && brandKit.colors.backgrounds.base.hex;
      if (bg && String(a.value).toUpperCase() === String(bg).toUpperCase()) {
        issues.push(`text colour equals background (${a.value}) on ${a.selector}`);
      }
    }
  }
  // outline:0 without focus-visible replacement
  if (/outline:\s*0|outline:\s*none/.test(css) && !/focus-visible/.test(css)) {
    issues.push('outline removed without a :focus-visible replacement');
  }
  return { ok: issues.length === 0, issues };
}

module.exports = { buildLoaderArtifacts, resolveToken, contrastRatio, fontStack };
