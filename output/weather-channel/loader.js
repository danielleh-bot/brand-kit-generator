/**
 * The Weather Channel Taboola Feed Loader — Brand Kit Integration
 * =============================================================
 * Publisher: theweatherchannel
 *
 * Brand Kit Source: weather-channel/brand-kit.json (LIVE crawl)
 * LIVE BASELINE: publisher theweatherchannel · mode organic-thumbs-feed-01-c-new ·
 * placement Below Content Thumbnails · container taboola-below-content-thumbnails-article
 */

(function () {
  "use strict";

  var BRAND = {
    linkBlue:         "#3A61CC",
    linkBlueDark:     "#2a4fa8",
    navy:             "#0C2340",
    nearBlack:        "#252422",
    darkGray:         "#676767",
    mediumGray:       "#8c8c8c",
    white:            "#FFFFFF",
    offWhite:         "#f5f7fa",
    lightGray:        "#e5e7eb",

    fontPrimary:      "'Inter', Arial, sans-serif",
    fontFallback:     "'Inter', Arial, sans-serif",

    sectionHeadSize:  "20px",
    titleCardSize:    "18px",
    titleCardLineH:   "24px",
    bodySize:         "16px",
    bodyLineH:        "24px",
    metaSize:         "12px",
    buttonSize:       "13px",

    cardGap:          "16px",
    cardPadding:      "12px",
    cardRadius:       "0px",
    imageRadius:      "0px",
    buttonRadius:     "4px",

    publisherName:    "theweatherchannel"
  };

  window._taboola = window._taboola || [];
  window.TRC = window.TRC || {};

  TRC.perfConfOverride = {
    logTimer: 50000,
    logLength: 5,
    traffic: 50,
    measureEnable: true,
    measureTimeToSend: 10000,
    measureInterval: 10000,
    disableRawDataSend: true
  };

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

  var brandCSS = [
    ".tbl-feed-card {",
    "  background-color: " + BRAND.white + ";",
    "  border: none;",
    "  border-bottom: 1px solid " + BRAND.lightGray + ";",
    "  border-radius: " + BRAND.cardRadius + ";",
    "  margin-bottom: " + BRAND.cardGap + ";",
    "  padding: " + BRAND.cardPadding + " 0;",
    "  font-family: " + BRAND.fontPrimary + ";",
    "}",

    ".tbl-feed-header {",
    "  margin-top: 28px;",
    "  margin-bottom: 14px;",
    "  font-family: " + BRAND.fontPrimary + ";",
    "}",

    ".tbl-feed-header-text,",
    ".trc_rbox_header .trcBoxHeader,",
    ".trc_rbox_header span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.sectionHeadSize + " !important;",
    "  font-weight: 800 !important;",
    "  color: " + BRAND.nearBlack + " !important;",
    "  letter-spacing: -0.01em;",
    "}",

    ".video-title,",
    ".thumbBlock + .video-label-box .video-title,",
    ".videoCube .video-label-box .video-title {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.titleCardSize + " !important;",
    "  line-height: " + BRAND.titleCardLineH + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.nearBlack + " !important;",
    "}",

    ".videoCube:hover .video-label-box .video-title {",
    "  color: " + BRAND.linkBlue + " !important;",
    "  text-decoration: underline;",
    "  text-decoration-color: " + BRAND.linkBlue + ";",
    "}",

    ".branding,",
    ".video-label-box .branding,",
    ".logoDiv a span {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.metaSize + " !important;",
    "  font-weight: 600 !important;",
    "  color: " + BRAND.mediumGray + " !important;",
    "  text-transform: none;",
    "}",

    ".thumbBlock img,",
    ".trc_img,",
    ".thumbBlock {",
    "  border-radius: " + BRAND.imageRadius + " !important;",
    "}",

    ".trc_sponsored_overlay,",
    ".trc-pre-label {",
    "  background-color: " + BRAND.navy + " !important;",
    "  color: " + BRAND.white + " !important;",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: 11px !important;",
    "  font-weight: 700 !important;",
    "}",

    ".tbl-feed-more-btn,",
    ".show-more-btn {",
    "  font-family: " + BRAND.fontPrimary + " !important;",
    "  font-size: " + BRAND.buttonSize + " !important;",
    "  font-weight: 700 !important;",
    "  color: " + BRAND.white + " !important;",
    "  background-color: " + BRAND.linkBlue + " !important;",
    "  border: none !important;",
    "  border-radius: " + BRAND.buttonRadius + " !important;",
    "  padding: 12px 20px !important;",
    "}",

    ".tbl-feed-more-btn:hover,",
    ".show-more-btn:hover {",
    "  background-color: " + BRAND.linkBlueDark + " !important;",
    "}"
  ].join("\n");

  var styleEl = document.createElement("style");
  styleEl.id = "twc-brand-kit-overrides";
  styleEl.textContent = brandCSS;
  (document.head || document.documentElement).appendChild(styleEl);

  var modeStyleOverrides = {
    ".video-title":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.titleCardSize + ";" +
      "line-height:" + BRAND.titleCardLineH + ";" +
      "font-weight:700;" +
      "color:" + BRAND.nearBlack + ";",

    ".branding":
      "font-family:" + BRAND.fontPrimary + ";" +
      "font-size:" + BRAND.metaSize + ";" +
      "color:" + BRAND.mediumGray + ";",

    ".thumbBlock img":
      "border-radius:" + BRAND.imageRadius + ";",

    ".tbl-feed-more-btn":
      "background-color:" + BRAND.linkBlue + ";" +
      "color:" + BRAND.white + ";" +
      "border-radius:" + BRAND.buttonRadius + ";"
  };

  var targetModes = [
    "organic-thumbs-feed-01-c-new",
    "above-the-feed-premium-card-fp-delta",
    "thumbs-feed-01-b-new",
    "organic-thumbs-feed-01-c-new",
    "thumbs-feed-01-b-new",
    "above-the-feed-premium-card-fp-delta",
    "organic-thumbs-feed-01-delta",
    "organic-thumbnails-feed-stream",
    "exchange-thumbnails-feed-with-header"
  ];

  var modeOverrideConfig = {};
  targetModes.forEach(function (modeName) {
    modeOverrideConfig[modeName] = { "__style__": modeStyleOverrides };
  });

  _taboola.push({ overrideConfig: modeOverrideConfig });

  try {
    (new Image()).src =
      "https://cdn.taboola.com/libtrc/tr5?abgroup=trecs-3017-yielding_ctrl&pub=" +
      BRAND.publisherName;
  } catch (e) { /* silent */ }

  (function loadTRC() {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.async = true;
    script.src = "//cdn.taboola.com/libtrc/" + BRAND.publisherName + "/loader.js";
    var firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  })();

})();
