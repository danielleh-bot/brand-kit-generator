# FOX Sports — MVP vs Ideal checklist

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

## Variant B — Ideal subset (platform + soft)

Requires custom UI mode / new card fields and/or Gen AI brand-voice translation.

- [ ] **LIVE badge / score-adjacent kicker** (`unique`) — `brand_voice.content_labels.live`
  - Unique — LIVE pulse + score line is sports-native; needs card meta + optional motion.

- [ ] **Premium Feed card compositions (1×1 / 2×1 / 4×1)** (`unique`) — `layout_patterns.content_cards`
  - Unique — composition change, not CSS paint on a single mode.

- [ ] **Sports headline voice (Title Case energy)** (`soft`) — `brand_voice.headline_style`
  - Soft — Gen AI rewrite into sports Title Case energy.

## Loader capability baseline

**Can do today:** inject CSS for `.video-title`, `.branding`, `.tbl-feed-more-btn`, `.trc-pre-label`, sponsored overlay, thumbnail radius, feed header accent.

**Cannot do without platform work:** new DOM fields (cook time, scores, alert windows), multi-badge inventories, section composition ("Mehr von…"), headline rewrite from brand voice.

## Gen AI

Soft-tier fields are hand-authored in ideal prototypes. Live enrichment is stubbed — see `lib/enrich-stub.js` and unmerged `feat/deep-crawl-enrich-feed-mapping`.
