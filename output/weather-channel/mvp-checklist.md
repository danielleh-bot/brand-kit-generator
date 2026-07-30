# The Weather Channel — MVP vs Ideal (live baseline)

Source: https://weather.com/news/news/2025-10-06-north-dakota-ef5-tornado-drought-ends
Taboola: `theweatherchannel` · `organic-thumbs-feed-01-c-new` · `taboola-below-content-thumbnails-article`

## Variant A — MVP via loader CSS

- [ ] **Feed container / placement** (`standard`) — `taboola.container` → #taboola-below-content-thumbnails-article
- [ ] **Mode composition (organic + thumbs mix)** (`partial`) — `taboola.modes_in_use` → Mode-owned card geometry; CSS can paint within mode
- [ ] **Divider / border** (`standard`) — `colors.css_variables.--border / --dd-border-color` → .tbl-feed-card border-bottom
- [ ] **Font family** (`standard`) — `fonts.primary.family` → .video-title, .branding
- [ ] **Article / section title** (`standard`) — `fonts.type_scale / h1` → .tbl-feed-header-text
- [ ] **Card title** (`standard`) — `fonts.type_scale.article_title_card` → .video-title
- [ ] **Meta / secondary label** (`standard`) — `colors.text.secondary` → .branding
- [ ] **Accent / link blue** (`standard`) — `colors.primary.hex` → title hover, CTA, pre-label
- [ ] **Masthead navy** (`partial`) — `colors.masthead` → Feed header dark variant / sponsored overlay
- [ ] **Primary text** (`standard`) — `colors.text.primary` → .video-title color
- [ ] **Thumbnail border radius** (`standard`) — `photo_style.thumbnail_format.border_radius` → .thumbBlock img / .trc_img
- [ ] **Aspect ratio** (`partial`) — `photo_style.thumbnail_format.aspect_ratio` → Mode-controlled; CSS object-fit can approximate
- [ ] **Video play indicator** (`partial`) — `photo_style.video_thumbnails` → .trc-video-play-icon
- [ ] **Sponsored label** (`standard`) — `badges / sponsored` → .trc_sponsored_overlay
- [ ] **See more / CTA button** (`standard`) — `buttons.primary` → .tbl-feed-more-btn

## Variant B — Unique / Soft

- [ ] **TrueNative / mobile composition** — Keep mobile-prototype.html as ideal Unique composition reference.
- [ ] **Alert / severe accents** — Highest weather-vertical unique gap vs current thumbs modes.
- [ ] **Conversational forecast voice** — Soft/Gen AI tier — hand-authored in ideal copy; enrich stub on main.

## Captures
- `captures/homepage-chrome.png`
- `captures/article-chrome.png`
- `captures/current-feed.png`
- `captures/feed-dom.json`
