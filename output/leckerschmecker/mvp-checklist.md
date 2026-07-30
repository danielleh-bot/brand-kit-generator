# Leckerschmecker — MVP vs Ideal checklist

Generated from the visual brand kit property matrix.

## Variant A — MVP via loader.js / `__style__`

Ship with today's TRC selectors only (CSS paint + existing mode overrides).

- [ ] **Primary brand color** (`standard`) — `colors.primary.hex` → .tbl-feed-card:hover .video-title, .tbl-feed-card .trc-pre-label, .tbl-feed-more-btn, .tbl-feed-header, .tbl-feed-header-text
  - MVP paint — measurable CTR/brand-fit lift with zero platform work.

- [ ] **Headline font family** (`standard`) — `fonts.primary.family` → .tbl-feed-card .video-title, .videoCube .video-title, .tbl-feed-card .branding, .video-label-box .branding
  - MVP — largest native-feel lever after colour.

- [ ] **Card / thumbnail border radius** (`standard`) — `photo_style.thumbnail_format.border_radius` → .tbl-feed-card .thumbBlock, .videoCube .trc_img, .tbl-feed-card
  - MVP — sharp vs rounded reads immediately as brand.

- [ ] **CTA / See more button** (`standard`) — `buttons.primary` → .tbl-feed-more-btn
  - MVP — loader can restyle .tbl-feed-more-btn.

- [ ] **Sponsored label (Anzeige pill)** (`partial`) — `recipe_card.sponsor_label` → .trc_sponsored_overlay, .trc_sponsored_overlay_base
  - Partial — single badge style only; mint pill vs black bar is a fidelity tradeoff.

- [ ] **Pill button radius (9999px)** (`standard`) — `border_radius.buttons` → .tbl-feed-more-btn
  - MVP — more-button radius is loader-safe.

## Variant B — Ideal subset (platform + soft)

Requires custom UI mode / new card fields and/or Gen AI brand-voice translation.

- [ ] **Cook / prep time on organic cards** (`unique`) — `layout_patterns.content_cards.recipe`
  - Unique — highest food-vertical RPM bet; needs card meta field or custom UI mode.
  - Note: Ideal prototype shows ⏱ 25 Min. under source. No TRC DOM hook today.

- [ ] **“Mehr von …” organic section band** (`unique`) — `layout_patterns.header.layers`
  - Unique — recirculation layout; not expressible as paint on thumbs-feed-01.

- [ ] **Brand voice / headline tone** (`soft`) — `brand_voice.tone`
  - Soft — Gen AI (or editorial) rewrite; not loader CSS.
  - Note: Hand-authored in ideal After panel. Live enrich.js not on main.

## Loader capability baseline

**Can do today:** inject CSS for `.video-title`, `.branding`, `.tbl-feed-more-btn`, `.trc-pre-label`, sponsored overlay, thumbnail radius, feed header accent.

**Cannot do without platform work:** new DOM fields (cook time, scores, alert windows), multi-badge inventories, section composition ("Mehr von…"), headline rewrite from brand voice.

## Gen AI

Soft-tier fields are hand-authored in ideal prototypes. Live enrichment is stubbed — see `lib/enrich-stub.js` and unmerged `feat/deep-crawl-enrich-feed-mapping`.
