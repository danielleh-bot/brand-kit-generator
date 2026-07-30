# Base brand-kit schema — conflict resolutions

Canonical template:
[`../assets/brand-kit.base.template.json`](../assets/brand-kit.base.template.json)

**Rule:** exactly **one** field owns each feed/card mapping. Legacy crawl kits
that overload `colors.primary.usage[]` or duplicate radius/CTA/hover fields
must be migrated into this shape before prototyping.

---

## Conflict → single owner

| Mapping (what gets painted) | Legacy conflicting sources | Canonical field | Why |
|---|---|---|---|
| Masthead background | `colors.primary` (when usage=header), `colors.secondary` (TWC navy), `layout_patterns.header.background_color`, top-level `header.background_color` | `chrome.header.background` | Primary must not mean “header” |
| Header accent rule | `colors.primary`, `layout_patterns.header.accent_rule_color` | `chrome.header.accent_rule` | Separate from CTA fill |
| Nav link list | `navigation.navLinks`, `header.utility_bar.items`, noisy `graphics.elements` | `chrome.nav_links` | Nav ≠ badges |
| Footer chrome | `layout_patterns.footer`, `colors.backgrounds.dark` | `chrome.footer.*` | Dark bg is not always footer |
| Page background | `colors.backgrounds.base` (also used as card face) | `colors.page_background` | Split page vs card |
| Card face | `colors.backgrounds.base` | `colors.card_surface` | Goal dark cards ≠ page well |
| Feed strip background | `colors.backgrounds.section`, `colors.primary` (BelTel misuse) | `colors.feed_well` | Never take section bg from primary |
| Hairline / separator | `colors.backgrounds.secondary`, `content_cards.border` color part | `colors.border` | One border color token |
| Headline text color | `colors.text.primary` | `colors.text_headline` | Role-named |
| Body / deck text | `colors.text.secondary` | `colors.text_body` | Role-named |
| Meta / disclosure text | `colors.text.tertiary` | `colors.text_meta` | Role-named |
| In-feed / body links | `colors.primary`, `colors.secondary` (Fox), `accents.info_blue` | `colors.link` | One link color |
| Feed section accent dot/rule | `colors.primary` | `colors.feed_accent` | Not CTA, not header |
| Active nav color | `colors.primary` | `colors.nav_active` | Not CTA |
| Sponsored CTA fill | `colors.primary`, `buttons.primary.background_color`, `colors.secondary` (Independent “Buttons”) | `cta.sponsored.background` | CTA owns fill |
| Sponsored CTA hover | `buttons.primary.hover_background`, `colors.primary_variants.darken_5` | `cta.sponsored.hover_background` | One hover |
| Sponsored CTA active/press | `colors.primary_variants.darken_10` | `cta.sponsored.active_background` | One active |
| Sponsored CTA geometry | `buttons.primary.*` | `cta.sponsored.*` | Geometry lives with CTA |
| Organic / ghost CTA | `buttons.secondary` | `cta.organic.*` | Dedicated |
| CTA label type | `fonts.type_scale.buttons` | `typography.cta_label` | Type scale role renamed |
| Headline font family | `fonts.primary` **or** `fonts.secondary` (Mediahuis serif headlines) | `typography.headline.family` | Role by use, not “primary” |
| Body font family | `fonts.primary` **or** `fonts.secondary` | `typography.body.family` | Same |
| Card title metrics | `fonts.type_scale.article_title_card` | `typography.card_title` | Unchanged role, clearer path |
| Feed module title metrics | `fonts.type_scale.section_headings` | `typography.feed_section_label` | Feed-specific name |
| Kicker / category type | `fonts.type_scale.category_pills` | `typography.kicker` | |
| Meta type | `fonts.type_scale.meta_text` | `typography.meta` | |
| Headline case | `brand_voice.headline_style.case` | `typography.headline_case` | `"sentence case"` \| `"title case"` |
| Card corner radius | `layout_patterns.content_cards.border_radius`, `spacing.card_border_radius` | `card.border_radius` | **One** radius for card chrome |
| Thumb corner radius | `photo_style.thumbnail_format.border_radius` | `card.thumbnail.border_radius` | May differ from card radius |
| Thumb aspect | `photo_style.thumbnail_format.aspect_ratio` | `card.thumbnail.aspect_ratio` | |
| Card border shorthand | `content_cards.border` | `card.border` | e.g. `1px solid #EEE` |
| Card shadow | `content_cards.shadow` | `card.shadow` | |
| Card padding | `content_cards.padding` | `card.padding` | |
| Gap between cards | `spacing.card_gap`, `spacing.grid_gap` | `card.gap` | Prefer stack gap; grid uses same unless composition needs override later |
| Feed section padding | `spacing.section_padding` | `feed.section_padding` | |
| Card hover behavior | free-text `content_cards.hover` | `card.hover.*` structured | No ambiguous prose |
| Video play overlay | `photo_style.video_thumbnails` | `card.video_play` | |
| Organic feed title | `taboola.feed_label` **or** invent from `brand.name` | `feed.labels.organic` | Always explicit string |
| Sponsored feed title | `taboola.sponsored_label` | `feed.labels.sponsored` | |
| Trending title | `taboola.trending_label` | `feed.labels.trending` | |
| Taboola mode list | `taboola.modes_in_use` | `feed.taboola.modes` | Composition hint only |
| Feed composition intent | inferred from modes / live | `feed.composition` | Enum: `horizontal-thumb`, `stacked-full`, `grid`, `premium-mixed` |
| Which badges exist | `brand_voice.content_labels` booleans | `badges.enabled[]` | Array of ids |
| Badge colors/labels | `graphics.elements[]` + `colors.accents.*` | `badges.styles.<id>` | Accents absorbed into badge styles |
| Opinion / news / video card recipes | `content_distinction.*` | `card_variants.*` | One variant object per type |
| Article block | `content.*` | `article.*` | Renamed for clarity |
| Author avatar | `photo_style.author_photos` | `article.author_avatar` | Above-feed only |
| Masthead logo | `logos.primary` | `logos.masthead` | Clearer name |
| Icon stroke language | `icons.style` | `chrome.icon_style` | Chrome concern |

---

## Removed / forbidden in base template

| Legacy field | Status |
|---|---|
| `colors.primary` + `usage[]` | **Removed** — too generic; split into `cta.*`, `colors.link`, `colors.feed_accent`, `colors.nav_active`, `chrome.header.*` |
| `colors.secondary` + `usage[]` | **Removed** — same reason |
| `colors.primary_variants` | **Removed** — fold into `cta.sponsored.hover_background` / `active_background` |
| `colors.accents.*` | **Removed** — fold into `badges.styles.*` |
| `colors.top_bg_colors` / `top_text_colors` / `top_link_colors` | **Removed** — ranked guesses, not roles |
| `fonts.primary` / `fonts.secondary` as sole names | **Replaced** by `typography.headline` / `typography.body` |
| `fonts.all_fonts` | **Removed** — debug only |
| `fonts.type_scale.utility_bar` | Optional later; not required for feed cards |
| Dual `header` vs `layout_patterns.header` | **Collapsed** to `chrome.header` |
| `spacing.card_border_radius` duplicate | **Collapsed** into `card.border_radius` |
| Free-text `content_cards.hover` | **Replaced** by `card.hover` object |
| `graphics.elements` as nav/search noise | **Not used**; only contrast-valid entries migrate into `badges.styles` |

---

## `feed.composition` enum

| Value | Meaning |
|---|---|
| `horizontal-thumb` | Thumb-left / text-right rows (TWC TrueNative mobile) |
| `stacked-full` | Full-width image-above-text cards |
| `grid` | Multi-column tile grid |
| `premium-mixed` | 1×1 / 2×1 / 4×1 + optional reels (Fox Premium-style) |

Pick from live feed + `feed.taboola.modes`, not from the previous publisher.

---

## `card.hover` rules

Set only the channels the brand actually uses; leave others `null`:

```json
"hover": {
  "surface_background": "#F7F7F7",
  "headline_color": null,
  "headline_underline_color": "#FF5A00",
  "shadow": null,
  "translate_y": null
}
```

Do **not** default `translate_y` or `shadow` unless the brand specifies them.

---

## Migration checklist (legacy → base)

1. Map header bg from `layout_patterns.header` or top-level `header` → `chrome.header.background` (ignore primary usage claiming header).  
2. Put CTA fill only in `cta.sponsored.background` (from `buttons.primary` if non-null; else live CSS; never Material `#2196F3` / `#0000EE` without verification).  
3. Resolve card radius from `content_cards.border_radius` if non-empty, else `spacing.card_border_radius` → `card.border_radius`.  
4. Parse free-text hover into `card.hover.*`.  
5. Copy `taboola.*_label` into `feed.labels.*`; if missing, set explicit strings once (do not leave “fallback to brand.name” dual-path).  
6. Build `badges.enabled` from true `content_labels`; build `badges.styles` from accents/elements **with contrast**.  
7. Assign `typography.headline.family` by actual headline computed style, not which font was labeled “primary”.  
8. Record notes in `metadata.provenance_notes` and set `metadata.migrated_from` to the legacy file path.

---

## Example (partial) — Weather Channel–shaped

```json
{
  "chrome": {
    "header": { "background": "#0C2340", "is_dark": true, "accent_rule": "#0078D4" }
  },
  "colors": {
    "page_background": "#FFFFFF",
    "feed_well": "#F2F4F4",
    "card_surface": "#FFFFFF",
    "border": "#E8EAEB",
    "text_headline": "#1B1B1B",
    "text_body": "#555555",
    "text_meta": "#8B8D8E",
    "link": "#0078D4",
    "feed_accent": "#0078D4",
    "nav_active": "#0078D4"
  },
  "card": {
    "border_radius": "6px",
    "border": "1px solid #E8EAEB",
    "gap": "16px",
    "thumbnail": { "aspect_ratio": "16:9", "border_radius": "6px" },
    "hover": {
      "surface_background": null,
      "headline_color": "#0078D4",
      "headline_underline_color": null,
      "shadow": "0 2px 8px rgba(0,0,0,0.08)",
      "translate_y": null
    }
  },
  "cta": {
    "sponsored": {
      "background": "#0078D4",
      "text_color": "#FFFFFF",
      "hover_background": "#006CBF",
      "border_radius": "4px"
    }
  },
  "feed": {
    "composition": "horizontal-thumb",
    "labels": {
      "organic": "More From The Weather Channel",
      "sponsored": "Sponsored Stories"
    }
  }
}
```
