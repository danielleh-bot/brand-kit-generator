// ============================================================
//  TABOOLA TRUENATIVE LOADER EXPORT
//  Converts a brand-kit.json into a production-shape Taboola
//  feed loader (loader.js): a brand-driven CSS override block,
//  per-mode `__style__` overrideConfig, and the TRC engine
//  scaffolding. Emitted by generate.js alongside brand-kit.css
//  so a re-crawl produces a loader that can never drift from
//  the kit (the previous hand-maintained loader did, which is
//  how the licensed font and the real accent got lost).
// ============================================================

const { resolveGoogleFont, buildGoogleFontsUrl } = require('./fonts');

// Fuller default mode list — used when the kit doesn't pin modes_in_use. These
// are the organic/sponsored/exchange feed modes a publisher integration
// typically targets; AdOps confirms the live subset.
const DEFAULT_TARGET_MODES = [
  'alternating-thumbnails-a',
  'alternating-thumbnails-a-delta',
  'alternating-thumbnails-b',
  'organic-thumbs-feed-01-delta',
  'organic-thumbs-feed-01-x-delta',
  'organic-thumbs-feed-01-b-em-delta',
  'organic-thumbs-feed-01-c-delta',
  'organic-thumbs-feed-01-y-em-delta',
  'organic-thumbs-feed-01-z-delta',
  'organic-thumbs-feed-y-em-delta',
  'organic-thumbs-hero-01-a-delta',
  'organic-thumbs-feed-01-mp-delta',
  'organic-thumbs-feed-01-x-no-desc-delta',
  'organic-premium-card-1x1-delta',
  'organic-premium-stream-card-delta',
  'organic-premium-short-article-3-card-1x1-delta',
  'organic-premium-video-reel-delta',
  'organic-rec-reel-01-x-delta',
  'organic-thumbnails-feed-stream',
  'organic-thumbnails-feed-mobile',
  'organic-thumbnails-feed-3x1-new',
  'organic-thumbnails-feed-3x1-with-header-editorial',
  'organic-thumbnails-feed-2x1-header',
  'organic-thumbnails-feed-2x1',
  'exchange-thumbnails-feed-with-header',
  'exchange-thumbnails-feed-carousel',
  'native-thumbnails-feed-mobile',
];

// ── helpers ─────────────────────────────────────────────────
function jsStr(value, fallback) {
  const v = value == null || value === '' ? fallback : value;
  return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function get(obj, path, fallback) {
  const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return v == null || v === '' ? fallback : v;
}

// Build a CSS font-family stack with the publisher's licensed face FIRST and
// its Google-Fonts equivalent as the rendering fallback. This is the rule that
// guarantees the real font (e.g. Garnett) is never dropped — it comes straight
// from fonts.primary.family.
function fontStack(family, tail) {
  const stack = [];
  if (family) stack.push(`'${family}'`);
  const resolved = resolveGoogleFont(family);
  if (resolved && resolved.google && resolved.google !== family) {
    stack.push(`'${resolved.google}'`);
  }
  for (const t of tail) {
    if (!stack.includes(t) && !stack.includes(`'${t}'`)) stack.push(t);
  }
  return stack.join(', ');
}

/**
 * Convert a brand kit object into a Taboola TrueNative loader.js source string.
 *
 * @param {object} brandKit
 * @returns {string} loader.js source
 */
function brandKitToLoader(brandKit) {
  const bk = brandKit || {};
  const name = get(bk, 'brand.name', 'Publisher');

  // ── colours ──
  const accent      = get(bk, 'colors.primary.hex', '#1a73e8');
  const accentHover = get(bk, 'colors.primary_variants.darken_5.hex', accent);
  const textMain    = get(bk, 'colors.text.secondary.hex', get(bk, 'colors.text.primary.hex', '#111111'));
  const deck        = get(bk, 'colors.text.tertiary.hex', '#4d4d4d');
  const meta        = get(bk, 'fonts.type_scale.meta_text.color', get(bk, 'colors.text.tertiary.hex', '#888888'));
  const white       = get(bk, 'colors.backgrounds.base.hex', '#ffffff');
  const offWhite    = get(bk, 'colors.backgrounds.section.hex', '#f7f7f7');
  const dark        = get(bk, 'colors.backgrounds.dark.hex', '#0a0a0a');
  const cardBorder  = get(bk, 'layout_patterns.content_cards.border', `1px solid ${offWhite}`);

  // ── typography ──
  const primaryFamily = get(bk, 'fonts.primary.family', 'sans-serif');
  const serifFamily   = get(bk, 'fonts.tertiary.0.family', null);
  const fontPrimary   = fontStack(primaryFamily, ["'Helvetica Neue'", 'Arial', 'sans-serif']);
  const fontSerif     = serifFamily ? fontStack(serifFamily, ['Georgia', 'serif']) : null;

  const sectionSize = get(bk, 'fonts.type_scale.section_headings.size', '18px');
  const cardSize    = get(bk, 'fonts.type_scale.article_title_card.size', '20px');
  const cardSizeIsFallback = get(bk, 'fonts.type_scale.article_title_card.source', '') === 'fallback';
  const cardLineH   = get(bk, 'fonts.type_scale.article_title_card.line_height', '1.25');
  const deckSize    = get(bk, 'fonts.type_scale.article_lead.size', '15px');
  const metaSize    = get(bk, 'fonts.type_scale.meta_text.size', '12px');

  // ── button (the "See more" CTA) ──
  const btnBg        = get(bk, 'buttons.primary.background_color', accent);
  const btnText      = get(bk, 'buttons.primary.text_color', '#ffffff');
  const btnRadius    = get(bk, 'buttons.primary.border_radius', '4px');
  const btnWeight    = get(bk, 'buttons.primary.font_weight', 700);
  const btnSize      = get(bk, 'fonts.type_scale.buttons.size', get(bk, 'buttons.primary.font_size', '14px'));
  const btnTracking  = get(bk, 'buttons.primary.letter_spacing', '0.04em');
  const btnTransform = get(bk, 'buttons.primary.text_transform', null) || 'none';
  const btnHover     = get(bk, 'buttons.primary.hover_background', accentHover);

  // ── cards / photo ──
  const cardRadius  = get(bk, 'layout_patterns.content_cards.border_radius', get(bk, 'photo_style.thumbnail_format.border_radius', '0px'));
  const imageRadius = get(bk, 'photo_style.thumbnail_format.border_radius', cardRadius);
  const cardPadding = get(bk, 'layout_patterns.content_cards.padding', '16px');
  const cardGap     = get(bk, 'spacing.card_gap', '20px');
  const playColor   = get(bk, 'photo_style.video_thumbnails.indicator_color', accent);

  // ── Taboola scaffolding ──
  const publisherId   = get(bk, 'taboola.publisher_id', 'CONFIRM-WITH-ADOPS');
  const publisherNote = get(bk, 'taboola.publisher_id_note', 'Confirm the publisher slug with AdOps before pushing to production.');
  const modesInUse    = get(bk, 'taboola.modes_in_use', null);
  const targetModes   = Array.isArray(modesInUse) && modesInUse.length ? modesInUse : DEFAULT_TARGET_MODES;

  const fontsUrl = buildGoogleFontsUrl(bk);

  const cardTitleNote = cardSizeIsFallback
    ? `      // NOTE: card-title size is a FALLBACK in the brand kit (not crawled). Verify on a re-crawl.\n`
    : '';

  // The brand CSS override block — every value below comes from the kit.
  const brandCSS = [
    `    // ── Web-font fallbacks for the licensed faces (the publisher serves the`,
    `    //    real font on its own pages; these render parity in the feed origin) ──`,
    `    "@import url('${fontsUrl}');",`,
    ``,
    `    // ── Feed card container ──`,
    `    ".tbl-feed-card {",`,
    `    "  background-color: " + BRAND.white + ";",`,
    `    "  border: " + BRAND.cardBorder + ";",`,
    `    "  border-radius: " + BRAND.cardRadius + ";",`,
    `    "  margin-bottom: " + BRAND.cardGap + ";",`,
    `    "  padding: " + BRAND.cardPadding + ";",`,
    `    "  font-family: " + BRAND.fontPrimary + ";",`,
    `    "  transition: none;",`,
    `    "}",`,
    ``,
    `    // Hover = headline picks up the accent ONLY. No background or border`,
    `    // change (this publisher does not lift/pop cards on hover).`,
    `    ".tbl-feed-card:hover .video-title {",`,
    `    "  color: " + BRAND.accent + " !important;",`,
    `    "}",`,
    ``,
    `    // ── Feed header ("More From ${name}") ──`,
    `    ".tbl-feed-header {",`,
    `    "  margin-top: 32px;",`,
    `    "  margin-bottom: 16px;",`,
    `    "  padding: 16px 0 0;",`,
    `    "  background: transparent;",`,
    `    "  text-align: left;",`,
    `    "  border-top: 3px solid " + BRAND.accent + ";",`,
    `    "}",`,
    ``,
    `    ".tbl-feed-header-text {",`,
    `    "  font-family: " + BRAND.fontPrimary + ";",`,
    `    "  font-size: " + BRAND.sectionSize + ";",`,
    `    "  font-weight: 700;",`,
    `    "  color: " + BRAND.textMain + ";",`,
    `    "  line-height: 1.2;",`,
    `    "}",`,
    ``,
    `    // Accent dot before the header (mirrors the publisher's section dot)`,
    `    ".tbl-feed-header-text::before {",`,
    `    "  content: '';",`,
    `    "  display: inline-block;",`,
    `    "  width: 8px; height: 8px;",`,
    `    "  border-radius: 50%;",`,
    `    "  background: " + BRAND.accent + ";",`,
    `    "  margin-right: 10px;",`,
    `    "  vertical-align: middle;",`,
    `    "  transform: translateY(-2px);",`,
    `    "}",`,
    ``,
    `    // Hide the default Taboola logo — the publisher brands the unit itself`,
    `    ".tbl-feed-header-logo { display: none !important; }",`,
    ``,
    `    // ── Card titles ──`,
    cardTitleNote +
    `    ".trc_rbox_div .video-title,",`,
    `    ".tbl-feed-card .video-title,",`,
    `    ".videoCube .video-title {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: " + BRAND.cardSize + " !important;",`,
    `    "  line-height: " + BRAND.cardLineH + " !important;",`,
    `    "  font-weight: 700 !important;",`,
    `    "  color: " + BRAND.textMain + " !important;",`,
    `    "  text-decoration: none !important;",`,
    `    "  margin: 0 0 6px 0 !important;",`,
    `    "}",`,
    ``,
    `    // ── Card descriptions / decks ──`,
    `    ".trc_rbox_div .video-description,",`,
    `    ".tbl-feed-card .video-description,",`,
    `    ".videoCube .video-description {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: " + BRAND.deckSize + " !important;",`,
    `    "  font-weight: 400 !important;",`,
    `    "  color: " + BRAND.deck + " !important;",`,
    `    "  text-decoration: none !important;",`,
    `    "  margin: 4px 0 10px 0 !important;",`,
    `    "}",`,
    ``,
    `    // ── Branding / attribution line ──`,
    `    ".video-label-box .branding,",`,
    `    ".tbl-feed-card .branding,",`,
    `    ".logoDiv a span {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: " + BRAND.metaSize + " !important;",`,
    `    "  color: " + BRAND.meta + " !important;",`,
    `    "  font-weight: 600 !important;",`,
    `    "}",`,
    ``,
    `    // Sponsored label — sits on a dark scrim`,
    `    ".trc_sponsored_overlay_base,",`,
    `    ".trc_sponsored_overlay {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: 10px !important;",`,
    `    "  font-weight: 700 !important;",`,
    `    "  text-transform: uppercase !important;",   // editorial label convention, not a token`,
    `    "  letter-spacing: 0.08em !important;",`,
    `    "  border-radius: 0 !important;",`,
    `    "  background-color: " + BRAND.dark + " !important;",`,
    `    "  color: " + BRAND.white + " !important;",`,
    `    "  padding: 4px 8px !important;",`,
    `    "}",`,
    ``,
    `    // ── Thumbnails ──`,
    `    ".trc_rbox_div .thumbBlock,",`,
    `    ".tbl-feed-card .thumbBlock,",`,
    `    ".videoCube .trc_img {",`,
    `    "  border-radius: " + BRAND.imageRadius + " !important;",`,
    `    "  overflow: hidden;",`,
    `    "}",`,
    ``,
    `    // ── Category / section kicker (organic pre-label) ──`,
    `    // Uses the brand ACCENT as an eyebrow. The page-level category-pill token`,
    `    // is a different role (larger / dark / non-caps), so it is not copied here.`,
    `    ".tbl-feed-card .trc-pre-label,",`,
    `    ".trc-content-sponsored .trc-pre-label {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: 11px !important;",`,
    `    "  font-weight: 700 !important;",`,
    `    "  color: " + BRAND.accent + " !important;",`,
    `    "  text-transform: uppercase !important;",`,
    `    "  letter-spacing: 0.08em !important;",`,
    `    "}",`,
    ``,
    `    // ── Video play icon ──`,
    `    ".trc_rbox_div .videoCube .trc-video-play-icon,",`,
    `    ".tbl-feed-card .trc-video-play-icon {",`,
    `    "  color: " + BRAND.playColor + " !important;",`,
    `    "}",`,
    ``,
    `    // ── "See more" / Load more button — the publisher's real CTA ──`,
    `    ".tbl-feed-more-btn,",`,
    `    ".tbl-feed-footer-overlay .tbl-feed-more-btn {",`,
    `    "  font-family: " + BRAND.fontPrimary + " !important;",`,
    `    "  font-size: " + BRAND.btnSize + " !important;",`,
    `    "  font-weight: " + BRAND.btnWeight + " !important;",`,
    `    "  letter-spacing: " + BRAND.btnTracking + " !important;",`,
    `    "  text-transform: " + BRAND.btnTransform + " !important;",`,
    `    "  color: " + BRAND.btnText + " !important;",`,
    `    "  background-color: " + BRAND.btnBg + " !important;",`,
    `    "  border: none !important;",`,
    `    "  border-radius: " + BRAND.btnRadius + " !important;",`,
    `    "  padding: 12px 24px !important;",`,
    `    "  cursor: pointer;",`,
    `    "  transition: background-color 0.2s ease;",`,
    `    "}",`,
    `    ".tbl-feed-more-btn:hover {",`,
    `    "  background-color: " + BRAND.btnHover + " !important;",`,
    `    "}",`,
    ``,
    `    // ── Loading placeholders — match the publisher surfaces ──`,
    `    ".tbl-loading-cards-placeholder { background: " + BRAND.offWhite + " !important; }",`,
    `    ".tbl-masker { background-color: " + BRAND.white + " !important; border-color: " + BRAND.white + " !important; }",`,
    ``,
    `    // ── Responsive: mobile ──`,
    `    "@media (max-width: 768px) {",`,
    `    "  .tbl-feed-header-text { font-size: 16px; }",`,
    `    "  .tbl-feed-card .video-title { font-size: 17px !important; line-height: 21px !important; }",`,
    `    "  .tbl-feed-card .video-description { font-size: 14px !important; line-height: 20px !important; }",`,
    `    "  .tbl-feed-card { padding: 12px; margin-bottom: 16px; }",`,
    `    "}"`,
  ].join('\n');

  // Per-mode __style__ overrides (TRC merges these with mode defaults).
  const modeStyle = [
    `  var modeStyleOverrides = {`,
    `    ".video-title":`,
    `      "font-family:" + BRAND.fontPrimary + ";" +`,
    `      "font-size:" + BRAND.cardSize + ";" +`,
    `      "line-height:" + BRAND.cardLineH + ";" +`,
    `      "font-weight:bold;" +`,
    `      "color:" + BRAND.textMain + ";" +`,
    `      "text-decoration:none;" +`,
    `      "margin:0 0 6px 0;",`,
    ``,
    `    ".video-description":`,
    `      "font-family:" + BRAND.fontPrimary + ";" +`,
    `      "font-size:" + BRAND.deckSize + ";" +`,
    `      "font-weight:normal;" +`,
    `      "color:" + BRAND.deck + ";" +`,
    `      "text-decoration:none;",`,
    ``,
    `    ".video-label-box .branding":`,
    `      "display:block;" +`,
    `      "font-family:" + BRAND.fontPrimary + ";" +`,
    `      "font-size:" + BRAND.metaSize + ";" +`,
    `      "color:" + BRAND.meta + ";",`,
    ``,
    `    ".logoDiv a span":`,
    `      "font-family:" + BRAND.fontPrimary + ";" +`,
    `      "font-size:" + BRAND.metaSize + ";" +`,
    `      "color:" + BRAND.meta + ";" +`,
    `      "display:inline;" +`,
    `      "font-weight:600;",`,
    ``,
    `    ".videoCube:hover .video-label-box .video-title":`,
    `      "color:" + BRAND.accent + ";"`,
    `  };`,
  ].join('\n');

  return `/**
 * ${name} — Taboola TrueNative Feed Loader (brand-kit generated)
 * =============================================================
 * Publisher: ${publisherId}
 *
 * GENERATED FILE — do not hand-edit. Emitted by generate.js from
 * ${name}'s brand-kit.json so the feed styling can never drift from the
 * kit. Re-crawl the publisher and regenerate to update.
 *
 * Applies the brand identity (accent ${accent}, ${primaryFamily} type,
 * real button CTA, ${cardRadius} card corners) to every feed card mode so
 * paid + recommended placements read as native ${name} cards.
 *
 * Brand kit: ${name}/brand-kit.json (${get(bk, 'metadata.analysis_date', 'undated')})
 * NOTE: ${publisherNote}
 */

(function () {
  "use strict";

  // ─── Brand Kit Tokens (from brand-kit.json) ────────────────────────
  var BRAND = {
    accent:        '${jsStr(accent)}',
    accentHover:   '${jsStr(accentHover)}',
    textMain:      '${jsStr(textMain)}',
    deck:          '${jsStr(deck)}',
    meta:          '${jsStr(meta)}',
    white:         '${jsStr(white)}',
    offWhite:      '${jsStr(offWhite)}',
    dark:          '${jsStr(dark)}',
    cardBorder:    '${jsStr(cardBorder)}',

    // Typography — licensed face first, Google-Fonts equivalent as fallback
    fontPrimary:   "${fontPrimary}",${fontSerif ? `\n    fontSerif:     "${fontSerif}",` : ''}

    // Sizes (from type_scale)
    sectionSize:   '${jsStr(sectionSize)}',
    cardSize:      '${jsStr(cardSize)}',
    cardLineH:     '${jsStr(cardLineH)}',
    deckSize:      '${jsStr(deckSize)}',
    metaSize:      '${jsStr(metaSize)}',

    // Button (real CTA — buttons.primary)
    btnBg:         '${jsStr(btnBg)}',
    btnText:       '${jsStr(btnText)}',
    btnRadius:     '${jsStr(btnRadius)}',
    btnWeight:     '${jsStr(btnWeight)}',
    btnSize:       '${jsStr(btnSize)}',
    btnTracking:   '${jsStr(btnTracking)}',
    btnTransform:  '${jsStr(btnTransform)}',
    btnHover:      '${jsStr(btnHover)}',

    // Cards / photo
    cardRadius:    '${jsStr(cardRadius)}',
    imageRadius:   '${jsStr(imageRadius)}',
    cardPadding:   '${jsStr(cardPadding)}',
    cardGap:       '${jsStr(cardGap)}',
    playColor:     '${jsStr(playColor)}',

    // Publisher (confirm with AdOps before production)
    publisherName: '${jsStr(publisherId)}'
  };

  // ─── Initialize Taboola globals ────────────────────────────────────
  window._taboola = window._taboola || [];
  window.TRC = window.TRC || {};

  // Performance configuration — standard yielding profile.
  // NOTE: experimentID / loaderType below are carried from a prior
  // integration and are UNCONFIRMED for ${name}; confirm with AdOps.
  TRC.perfConfOverride = {
    logTimer: 50000,
    logLength: 5,
    traffic: 50,
    measureEnable: true,
    measureTimeToSend: 10000,
    measureInterval: 10000,
    disableRawDataSend: true
  };

  // ─── System override config ────────────────────────────────────────
  _taboola.push({
    overrideConfig: {
      global: {
        "exclude-ms3": [],
        "is-ms3": "true",
        "perf_opt_fader": "tbt"
      },
      systemFlags: {
        loaderType: "trecs-3017-yielding_ctrl",
        experimentID: 29860
      }
    }
  });

  // ─── Brand Kit CSS Override ────────────────────────────────────────
  var brandCSS = [
${brandCSS}
  ].join("\\n");

  function injectBrandCSS() {
    var styleEl = document.createElement("style");
    styleEl.id = "taboola-brand-override";
    styleEl.type = "text/css";
    styleEl.textContent = brandCSS;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  if (document.readyState !== "loading") {
    injectBrandCSS();
  } else {
    document.addEventListener("DOMContentLoaded", injectBrandCSS);
  }

  // ─── Mode Style Overrides (injected into TRC mode configs) ─────────
${modeStyle}

  var targetModes = ${JSON.stringify(targetModes, null, 2).replace(/\n/g, '\n  ')};

  var modeOverrideConfig = {};
  targetModes.forEach(function (modeName) {
    modeOverrideConfig[modeName] = { "__style__": modeStyleOverrides };
  });

  _taboola.push({ overrideConfig: modeOverrideConfig });

  // ─── Pixel tracking ────────────────────────────────────────────────
  try {
    (new Image()).src =
      "https://cdn.taboola.com/libtrc/tr5?abgroup=trecs-3017-yielding_ctrl&pub=" +
      BRAND.publisherName;
  } catch (e) { /* silent */ }

  // ─── Load the TRC engine bundle ────────────────────────────────────
  (function loadTRC() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "//cdn.taboola.com/libtrc/" + BRAND.publisherName + "/loader.js";
    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  })();

})();
`;
}

module.exports = { brandKitToLoader, DEFAULT_TARGET_MODES };
