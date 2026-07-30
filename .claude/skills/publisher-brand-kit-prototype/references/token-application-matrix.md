# Token → prototype application matrix

Every field that appears in a publisher `brand-kit.json` must be **consciously
applied** or explicitly marked N/A (absent from kit). Do not stop at colors and
fonts.

## brand

| Field | Apply as |
|---|---|
| `name` | `<title>`, logo text fallback, attribution strings |
| `tagline` | Optional masthead subtitle only if live site shows it |
| `website` | Logo `href`, provenance in README |
| `language` | `<html lang>` |
| `description` | README only — not on-page marketing copy |

## logos

| Field | Apply as |
|---|---|
| `primary.type` / `text` / `font` / `color` / `background` / `treatment` | Exact masthead wordmark treatment (weight splits, case, color-on-bg) |
| `primary` SVG / image URL | Inline SVG or `<img>` in header; constrain to header slot height |
| `brand_mark` | Favicon fallback, avatar initials, app-icon style marks |
| `favicon_url` | `<link rel="icon">` |

## colors

| Field | Apply as |
|---|---|
| `primary.hex` + `usage[]` | CTAs, active nav, links, accent rules, section labels — follow **usage**, don't paint everything primary |
| `primary_variants.darken_5/10` | Hover / active / pressed |
| `secondary.hex` | Masthead / dark sections when usage says so (TWC Navy, etc.) |
| `text.primary/secondary/tertiary` | Headlines, decks, meta — three distinct levels |
| `backgrounds.base/section/secondary/dark` | Page bg, feed section bg, cards, dark chrome |
| `accents.*` | LIVE/breaking/severe/warning/success indicators only where brand_voice calls for them |

## fonts + type_scale

| Role | Apply as |
|---|---|
| `fonts.primary` | Headlines, nav, buttons (per `usage`) |
| `fonts.secondary` | Body, bylines, meta |
| `fonts.*.google_equivalent` | Actual `@import` / Google Fonts link when proprietary |
| `type_scale.section_headings` | Feed section labels ("Sponsored Stories", "More From…") |
| `type_scale.article_title_hero` | Article `<h1>` |
| `type_scale.article_title_card` | Feed card headlines |
| `type_scale.article_lead` | Deck |
| `type_scale.article_body` | Article paragraphs |
| `type_scale.navigation` | Nav / sport tabs (transform + tracking matter) |
| `type_scale.utility_bar` | Utility strip |
| `type_scale.category_pills` | Kickers / category labels |
| `type_scale.buttons` | CTA text |
| `type_scale.meta_text` | Timestamps, sources, branding text |

Copy size, weight, family, line-height, text-transform, letter-spacing, color
when the kit provides them.

## buttons

| Field | Apply as |
|---|---|
| `background_color` / `text_color` | CTA fill + label |
| `border_radius` | Exact px — 0 / 2 / 4 / 6 / 24 are different brands |
| `padding` | Exact |
| `font_size` / `font_weight` / `text_transform` / `letter_spacing` | Exact |
| `hover_background` | `:hover` / `:active` |
| `secondary.*` | Outline / ghost CTAs for organic cards when present |

## brand_voice

| Field | Apply as |
|---|---|
| `headline_style.case` | Title Case vs sentence case on all headlines |
| `content_labels.*` | Which badges exist (live, breaking, video, severe, opinion, premium…) |
| `content_distinction.*` | Distinct typography/labels for news vs opinion vs forecast vs premium |

## photo_style

| Field | Apply as |
|---|---|
| `thumbnail_format.aspect_ratio` | `aspect-ratio` on thumbs + hero |
| `thumbnail_format.border_radius` | Thumb clipping |
| `video_thumbnails.indicator` + `indicator_color` | Play overlay glyph/color |
| `author_photos.shape/size` | Byline avatar |

## graphics / icons

| Field | Apply as |
|---|---|
| `graphics.style` | Overall photo/typography overlay language |
| `graphics.elements[]` | Score tickers, radar chips, etc. — include if feed-relevant |
| `icons.style` | Stroke vs fill, weight — match SVG icons in header/share/footer |
| `icons.social_media_icons` | Share toolbar + footer socials |

## layout_patterns

| Field | Apply as |
|---|---|
| `grid` | Single column vs 2-col desktop — drives shell choice |
| `header.background_color` / `is_dark` / `accent_rule_color` | Masthead + accent bar |
| `header.layers[]` | Recreate each layer (utility / main / sub-nav / tabs) |
| `header.utility_bar` | Top utility items |
| `content_cards.border_radius` / `border` / `shadow` / `padding` | Card chrome |
| `content_cards.hover` | **Interaction source of truth** |
| `footer.*` | Optional compact footer |

## spacing

| Field | Apply as |
|---|---|
| `card_border_radius` | Prefer over conflicting card radius if both exist — reconcile intentionally |
| `card_gap` / `grid_gap` | Feed rhythm (1px tight stack ≠ 16px airy stack) |
| `section_padding` | Feed section insets |
| `container_max_width` | Desktop shells |

## navigation / content / related_articles / taboola

| Field | Apply as |
|---|---|
| `navigation.navLinks[]` | Real labels + order from kit/live site |
| `content.*` | Article block copy + hero |
| `related_articles[]` | Organic feed cards (title, image, category, url) |
| `taboola.feed_label` / `sponsored_label` / `trending_label` | Exact section header strings |
| `taboola.modes_in_use` | Inform Premium vs thumbnails-feed composition |
| `taboola.publisher_id` | README / loader notes only for this skill |

## metadata / extraction_quality

Use for provenance honesty in README. If `extraction_ratio` is low, verify
tokens against the live URL before trusting them in CSS.

## Suggestion / application fields

Some kits include free-text suggestions (hover descriptions, feed application
notes, designer mapping). Treat them as **requirements**, not flavor text.
If the kit says cards should use "subtle shadow lift, headline color shifts to
TWC Blue", the CSS must implement both behaviors.
