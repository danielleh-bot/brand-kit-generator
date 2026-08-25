/**
 * Business Insider Taboola Feed Loader — Brand Kit Integration
 * =============================================================
 * Publisher: axelspringer-businessinsider  (Axel Springer / Business Insider)
 *
 * This loader integrates the Business Insider brand kit (colors, typography,
 * spacing) into the Taboola feed widget styling. It applies brand-consistent
 * CSS overrides to all feed card modes (organic, sponsored, alternating) so the
 * Taboola feed visually matches the BI editorial design system — black wordmark
 * on white, 'Thunderbird' red editorial accents, black ('Subscribe') CTAs, the
 * yellow 'Bright Sun' reserved for premium, Brother-1816-style sans-serif, and
 * sharp 0px corners.
 *
 * Brand Kit Source: business-insider/brand-kit.json (2026-06-08)
 * NOTE: Confirm `publisherName` slug with BI AdOps before pushing to production.
 */

(function () {
  "use strict";

  // ─── Brand Kit Tokens ──────────────────────────────────────────────
  var BRAND = {
    // Colors — documented BI palette (BrandColorCode / Brandfetch). The
    // editorial accent is the 'Thunderbird' red; the primary action (CTA) is
    // black; the 'Bright Sun' yellow is held back for premium/brand moments.
    accent:           "#C71A1E",   // editorial red — kickers, hovers, rules, play icon
    accentDark:       "#A01419",
    action:           "#0A0A0A",   // primary CTA fill (matches Subscribe)
    actionDark:       "#333333",
    biRed:            "#C71A1E",
    biYellow:         "#FECF41",
    nearBlack:        "#111111",
    biBlack:          "#0A0A0A",
    darkGray:         "#4D4D4D",
    mediumGray:       "#888888",
    white:            "#FFFFFF",
    offWhite:         "#FAFAFA",
    lightGray:        "#EEEEEE",
    positiveGreen:    "#1A8F4C",
    linkBlue:         "#0F69FF",

    // Typography (Brother 1816 is BI's proprietary face — Manrope is the closest
    // Google Fonts equivalent for visual parity in feed cards rendered against
    // the publisher domain without the licensed font available.)
    fontPrimary:      "'Brother 1816', 'Manrope', 'Helvetica Neue', Arial, sans-serif",
    fontFallback:     "'Manrope', 'Helvetica Neue', Arial, sans-serif",

    // Sizes from type scale
    sectionHeadSize:  "20px",
    titleHeroSize:    "40px",
    titleCardSize:    "20px",
    titleCardLineH:   "25px",
    bodySize:         "18px",
    bodyLineH:        "28.8px",
    metaSize:         "12px",
    buttonSize:       "13px",

    // Spacing
    cardGap:          "20px",
    cardPadding:      "16px",
    cardRadius:       "0px",       // BI uses sharp corners on cards
    imageRadius:      "0px",
    buttonRadius:     "2px",

    // Publisher (confirm with BI AdOps — Axel Springer-managed)
    publisherName:    "axelspringer-businessinsider"
  };

  // ─── Initialize Taboola globals ────────────────────────────────────
  window._taboola = window._taboola || [];
  window.TRC = window.TRC || {};

  // Performance configuration — standard yielding profile (matches the
  // current t-online loader; BI runs the same TRC engine version).
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
  // This CSS is injected into the page to override default Taboola widget
  // styles with Business Insider brand tokens.
  var brandCSS = [

    // ── Google Fonts import (Manrope = Brother 1816 visual equivalent) ──
    "@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Inter:wght@400;500;700&display=swap');",

    // ── Feed container ──
    ".tbl-feed-card {",
    "  background-color: " + BRAND.white + ";",
    "  border: 1px solid " + BRAND.lightGray + ";",
    "  border-radius: " + BRAND.cardRadius + ";",
    "  margin-bottom: " + BRAND.cardGap + ";",
    "  padding: " + BRAND.cardPadding + ";",
    "  font-family: " + BRAND.fontPrimary + ";",
    "  transition: background-color 0.15s ease, border-color 0.15s ease;",
    "}",

    ".tbl-feed-card:hover {",
    "  background-color: " + BRAND.offWhite + ";",
    "  border-color: " + BRAND.nearBlack + ";",
    "}",

    // ── Feed header / "More From Business Insider" section ──
    ".tbl-feed-header {",
    "  margin-top: 32px;",
    "  margin-bottom: 16px;",
    "  padding: 16px 0 0;",
    "  background: transparent;",
    "  display: block;",
    "  text-align: left;",
    "  border-top: 3px solid " + BRAND.accent + ";",
    "}",

    ".tbl-feed-header-text {",
    "  font-family: " + BRAND.fontPrimary + ";",
    "  font-size: " + BRAND.sectionHeadSize + ";",
    "  font-weight: 800;",
    "  color: " + BRAND.nearBlack + ";",
    "  line-height: 1.2;",
    "  text-transform: uppercase;",
    "  letter-spacing: 0.04em;",
    "}",

    // Red accent dot before header (BI signature — mirrors the section dot)
    ".tbl-feed-header-text::before {",
    "  content: '';",
    "  display: inline-block;",
    "  width: 8px;",
    "  height: 8px;",
    "  border-radius: 50%;",
    "  background: " + BRAND.accent + ";",
    "  margin-right: 10px;",
    "  vertical-align: middle;",
    "  transform: translateY(-2px);",
    "}",

    // Hide default Taboola logo — BI uses its own branding throughout
    ".tbl-feed-header-logo {",
    "  display: none !important;",
    "}",

    // ── Card titles ──
    ".trc_rbox_div .video-title,",
    ".tbl-feed-card .video-title,",
    ".videoCube .video-title {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.titleCardSize + " !important;",
    "  line-height: " + BRAND.titleCardLineH + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.nearBlack + " !important;",
    "  text-decoration: none !important;",
    "  margin: 0 0 6px 0 !important;",
    "}",

    // Hero card title (larger)
    ".tbl-feed-card:first-child .video-title {",
    "  font-size: 28px !important;",
    "  line-height: 1.15 !important;",
    "  font-weight: 800 !important;",
    "}",

    // Title hover — BI red underline
    ".tbl-feed-card:hover .video-title,",
    ".videoCube:hover .video-title {",
    "  color: " + BRAND.nearBlack + " !important;",
    "  text-decoration: underline !important;",
    "  text-decoration-color: " + BRAND.accent + " !important;",
    "  text-decoration-thickness: 2px !important;",
    "  text-underline-offset: 3px;",
    "}",

    // ── Card descriptions / decks ──
    ".trc_rbox_div .video-description,",
    ".tbl-feed-card .video-description,",
    ".videoCube .video-description {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 15px !important;",
    "  line-height: 22px !important;",
    "  font-weight: 400 !important;",
    "  color: " + BRAND.darkGray + " !important;",
    "  text-decoration: none !important;",
    "  margin: 4px 0 10px 0 !important;",
    "}",

    // ── Branding / attribution line ──
    ".video-label-box .branding,",
    ".tbl-feed-card .branding,",
    ".logoDiv a span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 11px !important;",
    "  color: " + BRAND.mediumGray + " !important;",
    "  font-weight: 600 !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.06em !important;",
    "}",

    // Sponsored label — sits on a dark scrim
    ".trc_sponsored_overlay_base,",
    ".trc_sponsored_overlay {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 10px !important;",
    "  font-weight: 700 !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.08em !important;",
    "  border-radius: 0 !important;",
    "  background-color: " + BRAND.biBlack + " !important;",
    "  color: " + BRAND.white + " !important;",
    "  padding: 4px 8px !important;",
    "}",

    // ── Thumbnail images — BI uses sharp corners throughout ──
    ".trc_rbox_div .thumbBlock,",
    ".tbl-feed-card .thumbBlock,",
    ".videoCube .trc_img {",
    "  border-radius: " + BRAND.imageRadius + " !important;",
    "  overflow: hidden;",
    "}",

    // ── Widget header (e.g., section kicker) ──
    ".trc_rbox_header {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.metaSize + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.mediumGray + " !important;",
    "  border: none !important;",
    "  padding: 8px 0 !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.06em !important;",
    "}",

    // ── "See more" / Load more button — BI's primary action: solid black ──
    ".tbl-feed-more-btn,",
    ".tbl-feed-footer-overlay .tbl-feed-more-btn {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.buttonSize + " !important;",
    "  font-weight: 700 !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.06em !important;",
    "  color: " + BRAND.white + " !important;",
    "  background-color: " + BRAND.action + " !important;",
    "  border: none !important;",
    "  border-radius: " + BRAND.buttonRadius + " !important;",
    "  padding: 12px 24px !important;",
    "  cursor: pointer;",
    "  transition: background-color 0.2s ease, transform 0.2s ease;",
    "}",

    ".tbl-feed-more-btn:hover {",
    "  background-color: " + BRAND.actionDark + " !important;",
    "  transform: translateY(-1px);",
    "}",

    // ── Video play icon — BI editorial red ──
    ".trc_rbox_div .videoCube .trc-video-play-icon,",
    ".tbl-feed-card .trc-video-play-icon {",
    "  color: " + BRAND.accent + " !important;",
    "}",

    // ── Category / section pills (organic content kicker) ──
    ".tbl-feed-card .trc-pre-label,",
    ".trc-content-sponsored .trc-pre-label {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 11px !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.accent + " !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.08em !important;",
    "}",

    // ── Disclosure / "Sponsored" label at bottom ──
    ".trc_rbox_div .trc-disclosure-label,",
    ".tbl-feed-card .trc-disclosure-label {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 10px !important;",
    "  color: " + BRAND.mediumGray + " !important;",
    "  text-transform: uppercase !important;",
    "  letter-spacing: 0.06em !important;",
    "}",

    // ── Exclude / dismiss button ──
    ".trc_user_exclude_btn {",
    "  opacity: 0.5 !important;",
    "  transition: opacity 0.2s ease;",
    "}",
    ".trc_user_exclude_btn:hover {",
    "  opacity: 1 !important;",
    "}",

    // ── Loading placeholder — match BI section bg ──
    ".tbl-loading-cards-placeholder {",
    "  background: " + BRAND.offWhite + " !important;",
    "}",
    ".tbl-placeholder-card {",
    "  background: " + BRAND.lightGray + " !important;",
    "}",
    ".tbl-masker {",
    "  background-color: " + BRAND.white + " !important;",
    "  border-color: " + BRAND.white + " !important;",
    "}",

    // ── Responsive: mobile adjustments ──
    "@media (max-width: 768px) {",
    "  .tbl-feed-header-text {",
    "    font-size: 18px;",
    "  }",
    "  .tbl-feed-card:first-child .video-title {",
    "    font-size: 22px !important;",
    "    line-height: 1.2 !important;",
    "  }",
    "  .tbl-feed-card .video-title {",
    "    font-size: 17px !important;",
    "    line-height: 21px !important;",
    "  }",
    "  .tbl-feed-card .video-description {",
    "    font-size: 14px !important;",
    "    line-height: 20px !important;",
    "  }",
    "  .tbl-feed-card {",
    "    padding: 12px;",
    "    margin-bottom: 16px;",
    "  }",
    "}",

    // ── Dark section variant (BI black footer placement) ──
    ".trc_dark_section .tbl-feed-card {",
    "  background-color: " + BRAND.biBlack + ";",
    "  border-color: " + BRAND.darkGray + ";",
    "}",
    ".trc_dark_section .video-title {",
    "  color: " + BRAND.white + " !important;",
    "}",
    ".trc_dark_section .video-description {",
    "  color: " + BRAND.mediumGray + " !important;",
    "}",
    ".trc_dark_section .tbl-feed-card:hover .video-title {",
    "  text-decoration-color: " + BRAND.accent + " !important;",
    "}"

  ].join("\n");


  // ─── Inject brand CSS into page ────────────────────────────────────
  function injectBrandCSS() {
    var styleEl = document.createElement("style");
    styleEl.id = "taboola-businessinsider-brand-override";
    styleEl.type = "text/css";
    styleEl.textContent = brandCSS;
    (document.head || document.documentElement).appendChild(styleEl);
  }

  // Inject immediately if DOM is ready, otherwise wait
  if (document.readyState !== "loading") {
    injectBrandCSS();
  } else {
    document.addEventListener("DOMContentLoaded", injectBrandCSS);
  }


  // ─── Mode Style Overrides (injected into TRC mode configs) ────────
  // These override the __style__ objects within each mode to use BI fonts/colors.

  var modeStyleOverrides = {
    ".video-title":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.titleCardSize + ";" +
      "line-height:" + BRAND.titleCardLineH + ";" +
      "font-weight:bold;" +
      "color:" + BRAND.nearBlack + ";" +
      "text-decoration:none;" +
      "margin:0 0 6px 0;",

    ".video-description":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:15px;" +
      "line-height:22px;" +
      "font-weight:normal;" +
      "color:" + BRAND.darkGray + ";" +
      "text-decoration:none;",

    ".syndicatedItem .video-title":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.titleCardSize + ";" +
      "line-height:" + BRAND.titleCardLineH + ";" +
      "font-weight:bold;" +
      "color:" + BRAND.nearBlack + ";" +
      "text-decoration:none;" +
      "padding:0;",

    ".syndicatedItem .video-description":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:15px;" +
      "line-height:22px;" +
      "font-weight:normal;" +
      "color:" + BRAND.darkGray + ";" +
      "text-decoration:none;",

    ".video-label-box":
      "text-align:left;" +
      "margin:10px 0 0 0;",

    ".video-label-box .branding":
      "display:block;" +
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:11px;" +
      "color:" + BRAND.mediumGray + ";" +
      "text-transform:uppercase;" +
      "letter-spacing:0.06em;",

    ".logoDiv a span":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:11px;" +
      "color:" + BRAND.mediumGray + ";" +
      "display:inline;" +
      "font-weight:600;" +
      "text-transform:uppercase;" +
      "letter-spacing:0.06em;",

    ".trc_rbox_header .trc_header_ext":
      "position:relative;top:auto;right:auto;",

    ".trc_header_left_column":
      "height:auto;" +
      "background-color:transparent;",

    ".videoCube .video-label-box .video-title":
      "text-decoration:none;",

    ".videoCube:hover .video-label-box .video-title":
      "text-decoration:underline;" +
      "text-decoration-color:" + BRAND.accent + ";" +
      "text-decoration-thickness:2px;"
  };


  // ─── Push mode overrides to _taboola ──────────────────────────────
  // Applies BI styling to all relevant modes. The TRC engine merges these
  // __style__ properties with the mode defaults.

  var targetModes = [
    "alternating-thumbnails-a",
    "alternating-thumbnails-a-delta",
    "alternating-thumbnails-b",
    "organic-thumbs-feed-01-delta",
    "organic-thumbs-feed-01-x-delta",
    "organic-thumbs-feed-01-b-em-delta",
    "organic-thumbs-feed-01-c-delta",
    "organic-thumbs-feed-01-y-em-delta",
    "organic-thumbs-feed-01-z-delta",
    "organic-thumbs-feed-y-em-delta",
    "organic-thumbs-hero-01-a-delta",
    "organic-thumbs-feed-01-mp-delta",
    "organic-thumbs-feed-01-x-no-desc-delta",
    "organic-premium-card-1x1-delta",
    "organic-premium-stream-card-delta",
    "organic-premium-short-article-3-card-1x1-delta",
    "organic-premium-video-reel-delta",
    "organic-rec-reel-01-x-delta",
    "organic-thumbnails-feed-stream",
    "organic-thumbnails-feed-mobile",
    "organic-thumbnails-feed-mobile-wt",
    "organic-thumbnails-feed-mobile-cat",
    "organic-thumbnails-feed-carousel",
    "organic-thumbnails-feed-carousel-editorial",
    "organic-thumbnails-feed-carousel-editorial-wt",
    "organic-thumbnails-feed-carousel-video",
    "organic-thumbnails-feed-carousel-video-wt",
    "organic-thumbnails-feed-carousel-no-header",
    "organic-thumbnails-feed-3x1-new",
    "organic-thumbnails-feed-3x1-video",
    "organic-thumbnails-feed-3x1-video-wt",
    "organic-thumbnails-feed-3x1-with-header-editorial",
    "organic-thumbnails-feed-3x1-cat-native",
    "organic-thumbnails-feed-3x1-test-a",
    "organic-thumbnails-feed-2x1-header",
    "organic-thumbnails-feed-2x1-header-wt",
    "organic-thumbnails-feed-2x1-header-cat",
    "organic-thumbnails-feed-2x1",
    "organic-thumbnails-feed-4-hero-cat",
    "organic-thumbs-feed-mobile-no-header",
    "organic-thumbs-feed-mobile-no-header-wt",
    "organic-thumbs-feed-3x1-recent",
    "organic-thumbs-feed-3x1-header-editorial-wt",
    "organic-thumbs-feed-3x1-cat",
    "organic-thumbs-feed-carousel-no-header-wt",
    "organic-thumbs-feed-carousel-header-editorial-cat",
    "exchange-thumbnails-feed-with-header",
    "exchange-thumbnails-feed-with-header-wt",
    "exchange-thumbnails-feed-carousel",
    "exchange-thumbnails-feed-2x1-stream",
    "native-thumbnails-feed-mobile"
  ];

  var modeOverrideConfig = {};
  targetModes.forEach(function (modeName) {
    modeOverrideConfig[modeName] = {
      "__style__": modeStyleOverrides
    };
  });

  _taboola.push({
    overrideConfig: modeOverrideConfig
  });


  // ─── Pixel tracking ────────────────────────────────────────────────
  try {
    (new Image()).src =
      "https://cdn.taboola.com/libtrc/tr5?abgroup=trecs-3017-yielding_ctrl&pub=" +
      BRAND.publisherName;
  } catch (e) { /* silent */ }


  // ─── Load the TRC engine bundle ────────────────────────────────────
  // In production, the minified TRC webpack bundle follows here. For this
  // branded loader, we reference it externally:

  (function loadTRC() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "//cdn.taboola.com/libtrc/" + BRAND.publisherName + "/loader.js";
    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  })();

})();
