# Business Insider — MVP vs Ideal (live baseline)

Source article: https://www.businessinsider.com/amazon-managers-challenge-automated-staffing-decisions-warehouse-2026-7
Taboola: `businessinsider` · `thumbs-1r` · `below-main-column`
Designer mapping: `docs/brand-kit-mapping-bi.pdf`

## Variant A — MVP via loader.js

- [ ] **Card gutter / spacing** (`partial`) — `spacing.card_gap` → .tbl-feed-card margin/padding via loader CSS
- [ ] **Container max width** (`partial`) — `spacing.container_max_width` → Placement width owned by publisher page / mode
- [ ] **Border / divider** (`standard`) — `colors.css_variables.--border-color-2` → .tbl-feed-card border-bottom-color
- [ ] **Font family** (`standard`) — `fonts.primary.family` → .video-title, .branding { font-family }
- [ ] **Section title** (`standard`) — `fonts.type_scale.section_headings` → .tbl-feed-header-text
- [ ] **Text link** (`standard`) — `colors.primary.hex` → link color / hover on titles via loader
- [ ] **Card title** (`standard`) — `fonts.type_scale.article_title_card` → .video-title
- [ ] **Brand / link primary** (`standard`) — `--base-a-color` → title hover underline, CTA, pre-label
- [ ] **Brand hover** (`standard`) — `--base-a-hover-color` → link/CTA hover
- [ ] **Primary text** (`standard`) — `--base-text-color` → .video-title color
- [ ] **Secondary text** (`standard`) — `secondary #71717a` → .branding / meta
- [ ] **Bg section** (`partial`) — `colors.backgrounds.section` → No first-class section band on thumbs-1r
- [ ] **Thumbnail border radius** (`standard`) — `photo_style.thumbnail_format.border_radius` → .thumbBlock img / .trc_img
- [ ] **Aspect / sizes** (`partial`) — `photo_style.thumbnail_format.sizes` → Mode controls thumb geometry; CSS can force object-fit
- [ ] **Video icon + duration** (`partial`) — `photo_style.video_thumbnails` → .trc-video-play-icon color; duration not a free field
- [ ] **Button radius + font style** (`standard`) — `buttons.primary` → .tbl-feed-more-btn

## Variant B — Unique / platform

- [ ] **Grid / column structure (context)** — Designer mapped BI homepage modules. Current article feed is linear thumbs-1r — composition is Unique.
- [ ] **Label (N MIN READ)** — Designer mapped MIN READ on BI modules — Unique for current feed mode.
- [ ] **Article category icon + label** — .trc-pre-label color only today — not icon system

## Captures

- `captures/homepage-chrome.png`
- `captures/article-chrome.png`
- `captures/current-feed.png` (live Taboola)
- `captures/feed-dom.json`
- `captures/css-vars.json`
