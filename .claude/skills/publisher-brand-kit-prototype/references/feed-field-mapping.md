# Brand-kit field → feed / card mapping (full corpus)

Analyzed **9** brand kits:

| Corpus | Publishers |
|---|---|
| `output/` (hand-enriched prototypes) | Business Insider, FOX Sports, The Weather Channel |
| `brand-kit-extractions/` (uploaded crawl zips) | Belfast Telegraph, Crime World, Irish Independent, Goal.com, Glasgow Live, OK! Magazine |

Zip 1 (`brand-kit-extractions.zip`) ⊂ Zip 2 (`brand-kit-extractions 2.zip`). Unique set = the six under `brand-kit-extractions/`.

Two extraction **depths** appear:

| Depth | Kits | Typical extras |
|---|---|---|
| **Rich** | BI, Fox, TWC, Belfast Telegraph, Crime World, Independent.ie | `brand_voice`, `graphics`, `icons`, `layout_patterns`, full `type_scale`, accents/variants |
| **Slim** | Goal.com, Glasgow Live, OK! | `header` (top-level), often `colors.top_*`, `fonts.all_fonts`; **no** `brand_voice` / `graphics` / `content_cards.hover` / `taboola` |

---

## 1. Universal core (present in all 9) → feed use

| Field | What it means | Suggested use on feed / cards |
|---|---|---|
| `brand.name` / `website` / `language` | Publisher identity | Organic branding text; `<html lang>`; provenance |
| `logos.primary` + `favicon_url` | Masthead mark | Chrome above feed; favicon |
| `colors.primary.hex` | Brand accent (see `usage[]` when present) | Section accent, links, CTA fill **when** usage/buttons say so — not automatic header fill |
| `colors.text.primary/secondary/tertiary` | 3 text levels | Card headline / description / meta+disclosure |
| `colors.backgrounds.base` | Page/card face | Card surface (usually white; **Goal.com is dark `#1A1A1A`**) |
| `colors.backgrounds.section` | Section / feed well | Feed strip background (missing/null on Goal → use `base`/`dark`) |
| `colors.backgrounds.dark` | Dark chrome | Masthead/footer; dark feed variants |
| `fonts.primary` (+ weights/fallbacks) | Lead type family | Card titles **and/or** body — follow `usage` when present |
| `fonts.type_scale.article_title_card` | Card title metrics | **Primary card headline** CSS |
| `fonts.type_scale.article_title_hero` | Hero title | Article above feed (not the card) |
| `fonts.type_scale.section_headings` | Module titles | “Sponsored Stories” / “More From…” |
| `fonts.type_scale.meta_text` | Meta | Branding line, timestamps, Ad label |
| `fonts.type_scale.buttons` | CTA type | Sponsored CTA label |
| `fonts.type_scale.navigation` | Nav type | Section tabs above article |
| `fonts.type_scale.article_body` / `article_lead` | Body / deck | Article block above feed |
| `buttons.primary` | CTA geometry | Sponsored CTA (radius/padding/weight). If `background_color` is `null` + `source: fallback`, **derive fill from `colors.primary` or live CSS** — do not ship a grey/empty button |
| `photo_style.thumbnail_format.aspect_ratio` | Thumb crop | Card thumb `aspect-ratio` (`16:9` / `4:3` / `3:2` vary by pub) |
| `photo_style.thumbnail_format.border_radius` | Thumb clip | Image radius (often `0px` even when buttons are rounded) |

---

## 2. Common rich fields (6/9) → feed use

| Field | Kits | Suggested feed / card use |
|---|---|---|
| `colors.primary_variants.darken_5/10` | Rich 6 | CTA `:hover` / `:active` |
| `colors.backgrounds.secondary` | Most rich | Card borders / hairlines |
| `fonts.secondary` | Most | Description, meta, opinion italic faces |
| `fonts.type_scale.category_pills` / `utility_bar` | Most rich | Kickers on cards; utility chrome |
| `brand_voice.headline_style.case` | Rich 6 | Title vs sentence case on **all** card headlines |
| `brand_voice.content_labels.*` | Rich 6 | Which badges to enable (LIVE, Opinion, Gallery, Sponsored…) |
| `brand_voice.content_distinction.news/opinion…` | Most rich | Distinct card variants (serif-italic opinion, etc.) |
| `photo_style.video_thumbnails` | Rich 6 | Play overlay on video cards (skip if `indicator` null) |
| `photo_style.author_photos` | Rich 6 | Byline avatar above feed |
| `layout_patterns.header` / top-level `header` | Rich / slim | Masthead bg + dark flag framing the feed |
| `layout_patterns.content_cards` | Rich 6 | Card radius/border/shadow/**hover** — empty `{}` on Mediahuis extracts ⇒ fall back to `spacing.card_border_radius` + live observation |
| `layout_patterns.grid` / `footer` | Rich 6 | Single vs multi column; optional footer |
| `spacing.card_border_radius` / `grid_gap` | Most | Card radius + stack/grid gap |
| `graphics.style` + `graphics.elements[]` | Rich 6 | Badge chips — **QA colors**; crawls often emit white-on-white noise |
| `icons.style` | Rich 6 | Share/UI icon stroke language |
| `buttons.secondary` | BI, TWC only so far | Outline/ghost organic CTAs |
| `taboola.feed_label` / `sponsored_label` / `modes_in_use` | BI, TWC only | Exact section titles + composition mode |
| `navigation.navLinks` / `content` / `related_articles` | BI, TWC | Real nav + article + organic card inventory |

---

## 3. Slim-crawl-only fields (Goal / Glasgow / OK!)

| Field | Suggested feed use |
|---|---|
| `header.background_color` / `is_dark` | Masthead (Glasgow purple `#9B2687`, OK! red `#BE1F24`; Goal often unset) |
| `colors.top_bg_colors` / `top_text_colors` / `top_link_colors` | Ranked palette candidates when role mapping is thin — pick roles via live page, don’t assign blindly |
| `fonts.all_fonts` | Fallback font list if primary/secondary look wrong |

Slim kits **lack** hover contracts, content labels, and Taboola strings → derive feed UX from the live article URL and keep card types minimal (standard thumb + sponsored CTA) until enriched.

---

## 4. Feed application by UI region

### 4.1 Feed section chrome
| Token | Apply as |
|---|---|
| `taboola.*_label` or `brand.name` | Section header copy |
| `type_scale.section_headings` | Header type |
| `colors.primary` (if usage includes labels/accents) | Accent rule/dot |
| `colors.backgrounds.section` | Feed well |
| `spacing.section_padding` / `grid_gap` | Insets + rhythm |

### 4.2 Card chrome
| Token | Apply as |
|---|---|
| `content_cards.*` or `spacing.card_border_radius` | Radius, border, shadow |
| `content_cards.hover` | Literal hover (BI/TWC). If missing/empty: hover CTA only, or observe live |
| `backgrounds.base` | Card face |
| `backgrounds.secondary` / text.tertiary borders | Separators |

### 4.3 Card media
| Token | Apply as |
|---|---|
| `photo_style.thumbnail_format` | Aspect + radius |
| `video_thumbnails` | Play affordance |
| `related_articles[]` | Organic thumbs/titles when present |

### 4.4 Card type
| Token | Apply as |
|---|---|
| `type_scale.article_title_card` | Headline |
| `type_scale.meta_text` | Branding / time / Ad |
| `brand_voice.headline_style` | Case |
| `fonts.primary` / `secondary` (+ distinction typography) | News vs opinion faces |

### 4.5 CTA + sponsored
| Token | Apply as |
|---|---|
| `buttons.primary` | Sponsored CTA — Goal pill `22px`; OK!/Glasgow sharp `0px` uppercase; Mediahuis fallback radius `6px` needs live fill color |
| `primary_variants` / `hover_background` | CTA hover |
| `content_labels.sponsored` | Ad/Sponsored badge |

### 4.6 Badges / vertical card types
| Token | Apply as |
|---|---|
| `content_labels` | Gate which badges exist |
| `graphics.elements` | Named chips — prefer elements with contrasting `background_color`≠`text_color` |
| `content_distinction.opinion` | Serif-italic opinion cards (Mediahuis cluster) |
| `accents.*` (BI/Fox/TWC) | LIVE/SEVERE/premium colors |

---

## 5. Per-publisher feed cheat sheet (extractions)

| Publisher | Primary | Header | Fonts | Thumb | CTA | Labels / notes | Feed implication |
|---|---|---|---|---|---|---|---|
| **Belfast Telegraph** | `#00778B` (usage says header/section — **verify**: layout header is `#000`) | Black dark | Nuacht Sans + Nuacht Serif | **4:3** / 0 | fallback 6px | opinion, live, breaking, video, analysis, sponsored | Mediahuis pattern: black chrome, `#F7F9FC` well, sharp cards, opinion italic, teal accent sparingly |
| **Crime World** | `#2196F3` (suspicious Material blue; EQ 0.55) | Black dark | Inter Tight + Times | **4:3** / 0 | fallback 6px | opinion, live, breaking, video, sponsored | Same Mediahuis skeleton; treat orange `#FF6900` from `graphics.elements` as candidate accent for kickers — **confirm on live site** |
| **Irish Independent** | `#04847F` | Black dark | Nuacht Sans + Times | **4:3** / 0 | fallback 6px | + **gallery**, analysis, sponsored | Mediahuis + gallery card type; secondary `#D2DB5C` marked for Buttons — candidate CTA/accent |
| **Goal.com** | `#FF6347` tomato | Light/unset | Satoshi + Clash Grotesk | **16:9** / 0 | **Pill 22px** filled tomato | (none in kit) | **Dark feed** (`bg.base #1A1A1A`, light text). Sports vertical — score/LIVE language from live site, not kit labels |
| **Glasgow Live** | `#0000EE` (browser-default blue — **distrust**) | **Purple `#9B2687`** | Open Sans + Signika | **3:2** / 0 | sharp 0 uppercase (bg null) | (none) | Use header purple as brand chrome/CTA candidate; verify primary on live CSS |
| **OK! Magazine** | `#BE1F24` | Red `#BE1F24` | Open Sans + Signika | **3:2** / 0 | red sharp uppercase | (none) | Celebrity vertical: red masthead continuity into sponsored CTAs; 3:2 thumbs |

### Mediahuis cluster (BelTel / Independent.ie / Crime World)

Shared crawl shape → shared **starting** feed composition (still verify live):

- Dark `#000` header, section well `#F7F9FC`
- Card radius `0px`, thumb **4:3**
- Card title scale ~`22px/700`
- Sentence-case headlines
- Opinion distinction via secondary **serif italic**
- Button token often `source: fallback` with null colors → paint from live computed styles / secondary accents

Do **not** clone BelTel HTML onto Crime World — accents, fonts, and badge inventory differ.

---

## 6. Hand-enriched prototype kits (reminder)

| Publisher | Card hover (kit) | Thumb | CTA language | Unique feed notes |
|---|---|---|---|---|
| Business Insider | bg `#F7F7F7` + orange underline | 16:9 / 0 | Orange 2px uppercase | Exclusive / Premium / Opinion kickers; sharp editorial |
| FOX Sports | (unspecified) | 16:9 / 0 | Blue 4px uppercase | Sports Premium layouts optional; navy chrome |
| Weather Channel | shadow lift + headline→blue | 16:9 / **6px** | Blue 4px sentence | Horizontal TrueNative; SEVERE/FORECAST labels |

---

## 7. Extraction-quality rules (mandatory when using zip kits)

1. Prefer tokens with `source: extracted` over `fallback`.  
2. If `buttons.primary.background_color` is null → resolve from live page or a non-null `colors.secondary`/`primary` with CTA `usage`.  
3. Distrust palette red flags: `#0000EE`, `#2196F3` Material blue, white-on-white `graphics.elements`.  
4. BelTel primary `usage: Header background` conflicting with `header.background_color: #000` → **live wins**.  
5. Slim kits: enrich from the article URL before inventing badges/hover.  
6. Never assume `taboola.*` — only BI/TWC kits include it today; others need live Taboola probe or generic “Sponsored Stories” / “More From {brand}”.

---

## 8. Presence matrix (field → count / 9)

**9/9:** `brand`, `logos.primary`, `logos.favicon_url`, `colors.primary`, `colors.text.*`, `colors.backgrounds.base|section|dark`, `fonts.primary`, core `type_scale` roles, `buttons.primary`, `photo_style.thumbnail_format`

**6/9:** `brand_voice.*`, `graphics`, `icons`, `layout_patterns.content_cards`, `primary_variants`, `photo_style.video_thumbnails`

**3/9 or fewer:** `taboola`, `navigation`, `content`, `related_articles`, `buttons.secondary`, slim `header` + `top_*_colors`, documented `content_cards.hover`

---

## 9. How an agent should apply this

1. Detect depth (rich vs slim).  
2. Walk §1 universal rows; then §2 if rich; then §3 if slim.  
3. Apply §4 region mapping.  
4. Override with §5–6 publisher row.  
5. Run §7 QA on suspicious tokens before painting the feed.

See also: `token-application-matrix.md`, `anti-generic-rules.md`, `publisher-composition-examples.md`.

---

## Canonical base template (conflict-free)

Legacy kits overload the same mapping onto multiple fields (`colors.primary`
for header+CTA+accent, dual card radii, dual headers, etc.). Use the resolved
schema instead:

- Template: [`../assets/brand-kit.base.template.json`](../assets/brand-kit.base.template.json)
- Resolutions: [`brand-kit-base-resolutions.md`](brand-kit-base-resolutions.md)
- Validator: `scripts/validate-base-kit.py`
