/**
 * Business Insider — Taboola TrueNative Feed Loader (brand-kit generated)
 * =============================================================
 * Publisher: axelspringer-businessinsider
 *
 * GENERATED FILE — do not hand-edit. Emitted by generate.js from
 * Business Insider's brand-kit.json so the feed styling can never drift from the
 * kit. Re-crawl the publisher and regenerate to update.
 *
 * Applies the brand identity (accent #002AFF, Garnett type,
 * real button CTA, 0px card corners) to every feed card mode so
 * paid + recommended placements read as native Business Insider cards.
 *
 * Brand kit: Business Insider/brand-kit.json (2026-06-15)
 * NOTE: Confirm with AdOps — Axel Springer-owned BI uses an Axel-Springer-prefixed publisher slug on the TRC engine. Replace before pushing to production.
 */

(function () {
  "use strict";

  // ─── Brand Kit Tokens (from brand-kit.json) ────────────────────────
  var BRAND = {
    accent:        '#002AFF',
    accentHover:   '#0028F2',
    textMain:      '#0A0A0A',
    deck:          '#31313B',
    meta:          '#0A0A0A',
    white:         '#FFFFFF',
    offWhite:      '#F7F9FC',
    dark:          '#0A0A0A',
    cardBorder:    '1px solid #E6E9F0',

    // Typography — licensed face first, Google-Fonts equivalent as fallback
    fontPrimary:   "'Garnett', 'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif",
    fontSerif:     "'tiempos', 'Source Serif 4', Georgia, serif",

    // Sizes (from type_scale)
    sectionSize:   '18px',
    cardSize:      '22px',
    cardLineH:     '1.25',
    deckSize:      '14px',
    metaSize:      '12px',

    // Button (real CTA — buttons.primary)
    btnBg:         '#002AFF',
    btnText:       '#FFFFFF',
    btnRadius:     '4px',
    btnWeight:     '600',
    btnSize:       '14px',
    btnTracking:   '0.28px',
    btnTransform:  'none',
    btnHover:      '#0028F2',

    // Cards / photo
    cardRadius:    '0px',
    imageRadius:   '0px',
    cardPadding:   '16px',
    cardGap:       '20px',
    playColor:     '#0A0A0A',

    // Publisher (confirm with AdOps before production)
    publisherName: 'axelspringer-businessinsider'
  };

  // ─── Initialize Taboola globals ────────────────────────────────────
  window._taboola = window._taboola || [];
  window.TRC = window.TRC || {};

  // Performance configuration — standard yielding profile.
  // NOTE: experimentID / loaderType below are carried from a prior
  // integration and are UNCONFIRMED for Business Insider; confirm with AdOps.
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
    // ── Web-font fallbacks for the licensed faces (the publisher serves the
    //    real font on its own pages; these render parity in the feed origin) ──
    "@import url('https://fonts.googleapis.com/css2?family=Hanken%20Grotesk:wght@400;500;600;700;800&display=swap');",

    // ── Feed card container ──
    ".tbl-feed-card {",
    "  background-color: " + BRAND.white + ";",
    "  border: " + BRAND.cardBorder + ";",
    "  border-radius: " + BRAND.cardRadius + ";",
    "  margin-bottom: " + BRAND.cardGap + ";",
    "  padding: " + BRAND.cardPadding + ";",
    "  font-family: " + BRAND.fontPrimary + ";",
    "  transition: none;",
    "}",

    // Hover = headline picks up the accent ONLY. No background or border
    // change (this publisher does not lift/pop cards on hover).
    ".tbl-feed-card:hover .video-title {",
    "  color: " + BRAND.accent + " !important;",
    "}",

    // ── Feed header ("More From Business Insider") ──
    ".tbl-feed-header {",
    "  margin-top: 32px;",
    "  margin-bottom: 16px;",
    "  padding: 16px 0 0;",
    "  background: transparent;",
    "  text-align: left;",
    "  border-top: 3px solid " + BRAND.accent + ";",
    "}",

    ".tbl-feed-header-text {",
    "  font-family: " + BRAND.fontPrimary + ";",
    "  font-size: " + BRAND.sectionSize + ";",
    "  font-weight: 700;",
    "  color: " + BRAND.textMain + ";",
    "  line-height: 1.2;",
    "}",

    // Accent dot before the header (mirrors the publisher's section dot)
    ".tbl-feed-header-text::before {",
    "  content: '';",
    "  display: inline-block;",
    "  width: 8px; height: 8px;",
    "  border-radius: 50%;",
    "  background: " + BRAND.accent + ";",
    "  margin-right: 10px;",
    "  vertical-align: middle;",
    "  transform: translateY(-2px);",
    "}",

    // Hide the default Taboola logo — the publisher brands the unit itself
    ".tbl-feed-header-logo { display: none !important; }",

    // ── Card titles ──
      // NOTE: card-title size is a FALLBACK in the brand kit (not crawled). Verify on a re-crawl.
    ".trc_rbox_div .video-title,",
    ".tbl-feed-card .video-title,",
    ".videoCube .video-title {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.cardSize + " !important;",
    "  line-height: " + BRAND.cardLineH + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.textMain + " !important;",
    "  text-decoration: none !important;",
    "  margin: 0 0 6px 0 !important;",
    "}",

    // ── Card descriptions / decks ──
    ".trc_rbox_div .video-description,",
    ".tbl-feed-card .video-description,",
    ".videoCube .video-description {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.deckSize + " !important;",
    "  font-weight: 400 !important;",
    "  color: " + BRAND.deck + " !important;",
    "  text-decoration: none !important;",
    "  margin: 4px 0 10px 0 !important;",
    "}",

    // ── Branding / attribution line ──
    ".video-label-box .branding,",
    ".tbl-feed-card .branding,",
    ".logoDiv a span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.metaSize + " !important;",
    "  color: " + BRAND.meta + " !important;",
    "  font-weight: 600 !important;",
    "}",

    // Sponsored label — sits on a dark scrim
    ".trc_sponsored_overlay_base,",
    ".trc_sponsored_overlay {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 10px !important;",
    "  font-weight: 700 !important;",
    "  text-transform: uppercase !important;",   // editorial label convention, not a token
    "  letter-spacing: 0.08em !important;",
    "  border-radius: 0 !important;",
    "  background-color: " + BRAND.dark + " !important;",
    "  color: " + BRAND.white + " !important;",
    "  padding: 4px 8px !important;",
    "}",

    // ── Thumbnails ──
    ".trc_rbox_div .thumbBlock,",
    ".tbl-feed-card .thumbBlock,",
    ".videoCube .trc_img {",
    "  border-radius: " + BRAND.imageRadius + " !important;",
    "  overflow: hidden;",
    "}",

    // ── Category / section kicker (organic pre-label) ──
    // Uses the brand ACCENT as an eyebrow. The page-level category-pill token
    // is a different role (larger / dark / non-caps), so it is not copied here.
    ".tbl-feed-card .trc-pre-label,",
    ".trc-content-sponsored .trc-pre-label {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 11px !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.accent + " !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.08em !important;",
    "}",

    // ── Video play icon ──
    ".trc_rbox_div .videoCube .trc-video-play-icon,",
    ".tbl-feed-card .trc-video-play-icon {",
    "  color: " + BRAND.playColor + " !important;",
    "}",

    // ── "See more" / Load more button — the publisher's real CTA ──
    ".tbl-feed-more-btn,",
    ".tbl-feed-footer-overlay .tbl-feed-more-btn {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.btnSize + " !important;",
    "  font-weight: " + BRAND.btnWeight + " !important;",
    "  letter-spacing: " + BRAND.btnTracking + " !important;",
    "  text-transform: " + BRAND.btnTransform + " !important;",
    "  color: " + BRAND.btnText + " !important;",
    "  background-color: " + BRAND.btnBg + " !important;",
    "  border: none !important;",
    "  border-radius: " + BRAND.btnRadius + " !important;",
    "  padding: 12px 24px !important;",
    "  cursor: pointer;",
    "  transition: background-color 0.2s ease;",
    "}",
    ".tbl-feed-more-btn:hover {",
    "  background-color: " + BRAND.btnHover + " !important;",
    "}",

    // ── Loading placeholders — match the publisher surfaces ──
    ".tbl-loading-cards-placeholder { background: " + BRAND.offWhite + " !important; }",
    ".tbl-masker { background-color: " + BRAND.white + " !important; border-color: " + BRAND.white + " !important; }",

    // ── Responsive: mobile ──
    "@media (max-width: 768px) {",
    "  .tbl-feed-header-text { font-size: 16px; }",
    "  .tbl-feed-card .video-title { font-size: 17px !important; line-height: 21px !important; }",
    "  .tbl-feed-card .video-description { font-size: 14px !important; line-height: 20px !important; }",
    "  .tbl-feed-card { padding: 12px; margin-bottom: 16px; }",
    "}"
  ].join("\n");

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
  var modeStyleOverrides = {
    ".video-title":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.cardSize + ";" +
      "line-height:" + BRAND.cardLineH + ";" +
      "font-weight:bold;" +
      "color:" + BRAND.textMain + ";" +
      "text-decoration:none;" +
      "margin:0 0 6px 0;",

    ".video-description":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.deckSize + ";" +
      "font-weight:normal;" +
      "color:" + BRAND.deck + ";" +
      "text-decoration:none;",

    ".video-label-box .branding":
      "display:block;" +
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.metaSize + ";" +
      "color:" + BRAND.meta + ";",

    ".logoDiv a span":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.metaSize + ";" +
      "color:" + BRAND.meta + ";" +
      "display:inline;" +
      "font-weight:600;",

    ".videoCube:hover .video-label-box .video-title":
      "color:" + BRAND.accent + ";"
  };

  var targetModes = [
    "alternating-thumbnails-a",
    "organic-thumbs-feed-01",
    "organic-thumbnails-feed-stream",
    "organic-thumbnails-feed-3x1-with-header-editorial",
    "exchange-thumbnails-feed-with-header"
  ];

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
