# Publisher composition examples (why each prototype differs)

Use these as proof that compositions must diverge. Do **not** copy markup.

## The Weather Channel — TrueNative horizontal

- **Shell:** iPhone 15 Pro device frame (393 CSS px), navy status bar
- **Chrome:** Dark navy sticky header + horizontally scrolling section nav;
  active tab uses TWC Blue underline
- **Article:** Blue uppercase category, Inter headlines, Libre Baskerville body
  cues, hero + caption, share toolbar
- **Feed:** Preserves TWC mobile pattern — **horizontal thumb-left / text-right**
  cards with occasional **full-width featured** sponsored cards; blue accent
  dot on section headers
- **Tokens that force this shape:** `layout_patterns.grid` single-column mobile,
  `content_cards.border_radius: 6px`, hover = shadow lift + headline→blue,
  labels include severe/forecast
- **Would be wrong:** Fox Premium 2×1 grids, 12px heavy shadows, sport tab rail

## FOX Sports — Premium Feed on sports chrome

- **Shell:** Bare `max-width: 414px` (no iPhone bezel)
- **Chrome:** `#0B0E1A` sticky header, FOX/SPORTS weight-split wordmark,
  horizontally scrolling **sport tabs**, 3px FOX Blue accent bar
- **Article:** 16:9 hero with gradient overlay + category, condensed headline,
  avatar byline
- **Feed:** Taboola **Premium Feed** language — 12px rounded cards, footer-aligned
  CTAs, advertiser branding, layouts **1×1 / 2×1 / 4×1**, video reels row,
  display/vertical creative
- **Tokens that force this shape:** Roboto Condensed + Roboto, navy/blue/red/yellow
  accents for live/score language, sports photography overlays
- **Would be wrong:** TWC horizontal weather cards, BI yellow "Bright Sun" CTAs

## AZ Central / Gannett — card-type inventory

- **Shell:** iPhone 17 frame (402×874, 54px radius, Dynamic Island)
- **Chrome:** Gannett dark editorial header, Unify Sans→Inter proxy
- **Feed:** Distinct card types justified by Gannett voice — Premium/Subscriber
  gold lock, Opinion teal rail, Video play+duration, Gallery count, Breaking/Live
  animated pulse, full-width featured, standard horizontal, Sponsored pills
- **Would be wrong:** Collapsing all types into one "card" with different badges only

## Business Insider — desktop article + design language

- **Shell:** Desktop (responsive breakpoints), not an iPhone frame
- **Chrome:** White masthead, black wordmark (post-2017), red kickers/underlines,
  sharp corners
- **Feed / CTAs:** Black primary buttons (not orange), red hover underlines,
  sharp ~2px radii — full design language, not palette-only
- **Would be wrong:** Dark navy sports header, Premium reels row

## Lekker (gold-standard reference when present)

- Before / Split / After feed prototype pattern
- Unique vertical meta on cards (cook time, portions, difficulty)
- Soft sponsored labeling — vertical-specific, not a news template

---

## Decision heuristic

Ask: **What card geometry does a reader already see on this publisher's mobile
article?** Start there (TrueNative). Only upgrade to Premium rich layouts when
the brief / kit / Taboola modes explicitly call for Premium Feed.
