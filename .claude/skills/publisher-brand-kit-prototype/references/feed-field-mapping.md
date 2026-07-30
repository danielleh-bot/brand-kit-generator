# Brand-kit field → feed / card mapping

Cross-publisher map of **common** `brand-kit.json` fields across
Business Insider, FOX Sports, and The Weather Channel, with:

1. What the kit’s own `usage` / description intends  
2. Where it should land in the **below-article feed** (section chrome, organic
   cards, sponsored cards, rich formats)

Presence: **All 3** = BI + Fox + TWC · **BI+TWC** = missing on Fox kit ·
**Fox only** / etc. noted per row when not universal.

Concrete hex/type values below are examples from the kits, not defaults to copy.

---

## 1. Feed section chrome (above the cards)

| Field | In kits | Kit-intended use (from JSON) | Suggested use in feed |
|---|---|---|---|
| `taboola.feed_label` | BI+TWC | Organic module title string | Section header for organic block, e.g. “More From Business Insider” / “More From The Weather Channel” |
| `taboola.sponsored_label` | BI+TWC | Sponsored module title | Section header for paid block, e.g. “Sponsored Stories” |
| `taboola.trending_label` | BI+TWC | Alternate organic header | Optional second organic rail / “Trending on …” |
| `taboola.modes_in_use[]` | BI+TWC | Which Taboola modes the pub runs | Chooses composition: thumbnails list vs stream vs Premium 1×1/2×1/4×1 — **do not invent Premium if only thumbs modes** |
| `taboola.publisher_id` | BI+TWC | TRC publisher slug | Loader / provenance only (not painted on cards) |
| `fonts.type_scale.section_headings` | All 3 | Size/weight/case/tracking for section titles | Feed section label typography (“Sponsored Stories”, “More From…”) |
| `colors.primary` | All 3 | CTA, active nav, section labels / accent rules (see per-pub `usage[]`) | Accent **dot / rule / underline** on feed section header; not necessarily the whole header fill |
| `colors.backgrounds.section` | All 3 | Section / feed / hover wells (BI `#F7F7F7`, Fox `#F4F4F4` “Feed background”, TWC `#F2F4F4`) | Feed strip background behind cards |
| `spacing.section_padding` | All 3 | Section insets | Horizontal/vertical padding of the feed block |
| `brand.name` | All 3 | Publisher identity | Organic branding text (“FOX Sports”, “The Weather Channel”) on native cards |

---

## 2. Card surface & layout geometry

| Field | In kits | Kit-intended use | Suggested use on feed cards |
|---|---|---|---|
| `layout_patterns.content_cards.border_radius` | All 3 | Card corner language (BI/Fox `0px`, TWC `6px`) | Outer card radius — **or** Premium override only when brief says Premium (Fox prototype used 12px intentionally) |
| `layout_patterns.content_cards.border` | All 3 | Card edge | Card border / hairline separators |
| `layout_patterns.content_cards.shadow` | Fox (+ others if set) | Elevation | Only if kit says so; Fox editorial = `none` |
| `layout_patterns.content_cards.padding` | BI+TWC | Inner card padding | Text block inset inside card |
| `layout_patterns.content_cards.hover` | BI+TWC | **Literal interaction contract** | Card/headline `:hover` — BI: bg `#F7F7F7` + orange underline; TWC: shadow lift + headline→`#0078D4`. Fox kit omits hover → don’t invent generic lift |
| `spacing.card_border_radius` | BI+TWC | Duplicate radius token | Reconcile with `content_cards.border_radius`; same value on thumbs if photo radius differs |
| `spacing.card_gap` / `grid_gap` | All 3 | Rhythm between cards | Stack gap (Fox `1px` tight editorial vs TWC/BI `16–20px` airy) |
| `layout_patterns.grid` | All 3 | Page grid description | Mobile: single-column stack vs desktop multi-col; drives whether cards are horizontal rows or grid tiles |
| `colors.backgrounds.base` | All 3 | “Card surface” / page bg | Default card face (`#FFFFFF` all three) |
| `colors.backgrounds.secondary` | All 3 | Borders / rules / dividers | Card borders, row separators, footer rules inside card |

---

## 3. Card thumbnail / media

| Field | In kits | Kit-intended use | Suggested use on feed cards |
|---|---|---|---|
| `photo_style.thumbnail_format.aspect_ratio` | All 3 | Thumb crop (all three: `16:9`) | `aspect-ratio` on `.thumb` / hero-in-card; 1×1 display creatives are Premium exception |
| `photo_style.thumbnail_format.border_radius` | All 3 | Thumb clip (BI/Fox `0px`, TWC `6px`) | Radius on image only (may match or be tighter than card radius) |
| `photo_style.video_thumbnails.indicator` | All 3 | Play treatment description | Center play overlay on video cards |
| `photo_style.video_thumbnails.indicator_color` | All 3 | Overlay color (BI orange `#FF5A00`, Fox/TWC white) | Play glyph / circle fill |
| `related_articles[].image` / `url` | BI+TWC | Real related stories | Organic card thumb + click-through |
| `graphics.style` | All 3 | Photo/typography language | Crop style, overlay boldness (sports overlays vs editorial photography vs weather drama) |

---

## 4. Card typography

| Field | In kits | Kit-intended use | Suggested use on feed cards |
|---|---|---|---|
| `fonts.primary` (+ `google_equivalent`) | All 3 | Headlines, nav, buttons, **card titles** (Fox usage explicitly includes card titles) | Card headline font family |
| `fonts.secondary` (+ equiv) | All 3 | Body, meta, bylines, deck | Description, branding line, meta under headline |
| `fonts.type_scale.article_title_card` | All 3 | Card title size/weight/line-height | **Primary card headline** style |
| `fonts.type_scale.meta_text` | All 3 | Timestamps / meta | Branding text, time ago, “Ad”/disclosure size |
| `fonts.type_scale.category_pills` | All 3 | Uppercase/tracked labels | Category / LIVE / SEVERE / Opinion kickers on cards |
| `fonts.type_scale.buttons` | All 3 | CTA type | Sponsored CTA label + organic text-link CTA |
| `brand_voice.headline_style.case` | All 3 | Title vs sentence case | Case for **all** card headlines (BI/TWC sentence case; Fox Title Case) |
| `colors.text.primary` | All 3 | Headlines | Default card headline color |
| `colors.text.secondary` | All 3 | Deck / secondary | Optional description line |
| `colors.text.tertiary` | All 3 | Timestamps, disclosures, attribution | Branding, “Sponsored”, Taboola footer |

---

## 5. CTAs & sponsored treatment

| Field | In kits | Kit-intended use | Suggested use on feed cards |
|---|---|---|---|
| `buttons.primary.*` | All 3 | Fill, radius, padding, weight, transform, hover | **Sponsored CTA pill/button** (BI orange 2px sharp; Fox blue 4px uppercase; TWC blue 4px sentence case) |
| `buttons.primary.hover_background` | BI+TWC | Pressed/hover fill | CTA `:hover` (Fox uses `colors.primary_variants.darken_5` instead) |
| `buttons.secondary.*` | BI+TWC | Outline / ghost | Organic “text CTA” or outline Learn More; BI black outline, TWC blue outline |
| `colors.primary_variants.darken_5/10` | All 3 | Hover / active (Fox usage strings say so explicitly) | CTA hover + card press states |
| `colors.primary.usage[]` | All 3 | Where primary is allowed | Only paint CTAs/labels/underlines listed — e.g. BI includes “Sponsored / exclusive ribbons” + “Hover underlines” |
| `brand_voice.content_labels.sponsored` | BI+TWC | Sponsored content exists | Show Sponsored/Ad badge on paid cards |
| `taboola.sponsored_label` | BI+TWC | Module wording | Prefer kit string over inventing “Ads” |

---

## 6. Badges, labels, vertical-specific card types

| Field | In kits | Kit-intended use | Suggested use on feed cards |
|---|---|---|---|
| `brand_voice.content_labels.*` | All 3 | Which labels the brand uses | Enable only flags that are `true` — don’t ship SEVERE on Fox or Subscriber on TWC |
| `brand_voice.content_distinction.*` | BI+TWC (+ Fox opinion markers) | News vs opinion vs premium vs forecast vs severe | Distinct card variants (kicker color, left rail, lock icon, etc.) |
| `graphics.elements[]` | All 3 | Named badge recipes (label + bg + text) | Exact badge chips on organic cards: BI BREAKING/EXCLUSIVE/PREMIUM/OPINION; TWC BREAKING/SEVERE/VIDEO; Fox score/live language via accents |
| `colors.secondary.usage[]` | All 3 | Secondary accent roles | BI: Breaking/Live/Premium flags · Fox: links + score highlights · TWC: header/dark overlays (usually **not** card CTA fill) |
| `colors.accents.negative_red` | All 3 | Breaking / live / extreme | LIVE / BREAKING badge fill |
| `colors.accents.warning_yellow` | All 3 | Alerts / live / premium gold | Fox LIVE/score · TWC SEVERE · BI premium ribbon |
| `colors.accents.positive_green` | All 3 | Wins / low risk / markets | Stats / positive indicators on sports or markets cards only |
| `colors.accents.info_blue` | BI+TWC | In-body links | Prefer for text links inside descriptions, not badge spam |

**Label inventory by publisher (from kits):**

| Label capability | BI | Fox | TWC |
|---|---|---|---|
| breaking | ✓ | ✓ | ✓ |
| live | ✓ | ✓ | ✓ |
| video | ✓ | ✓ | ✓ |
| analysis | ✓ | ✓ | — |
| sponsored | ✓ | — (still used in Premium mock) | ✓ |
| opinion / exclusive / premium | ✓ | opinion markers in distinction | — |
| severe_weather / forecast / tropical | — | — | ✓ |

---

## 7. Interaction (feed UX, not just look)

| Field | In kits | Kit-intended use | Suggested use in feed |
|---|---|---|---|
| `layout_patterns.content_cards.hover` | BI+TWC | Free-text hover spec | **Implement literally** on card/headline |
| `buttons.primary.hover_background` | BI+TWC | CTA hover | Sponsored button hover |
| `colors.primary_variants.*` | All 3 | Darken for hover/active | Fallback when `hover_background` missing |
| `colors.primary.usage` includes “Hover underlines” (BI) | BI | Underline accent | Headline/nav underline in primary on hover — **not** generic `translateY` |

---

## 8. Page chrome that frames the feed (required for prototype realism)

These are not card tokens but appear in every prototype so the feed feels native:

| Field | In kits | Suggested use |
|---|---|---|
| `logos.primary` (+ treatment) | All 3 | Masthead wordmark above article/feed |
| `logos.favicon_url` | All 3 | Tab icon |
| `layout_patterns.header.*` | All 3 | Sticky nav / accent rule / layers |
| `navigation.navLinks[]` | BI+TWC | Real section tabs |
| `fonts.type_scale.navigation` | All 3 | Nav / sport-tab type |
| `content.*` | BI+TWC | Article block above feed (headline, hero, body) |
| `related_articles[]` | BI+TWC | Organic card copy/images |
| `photo_style.author_photos` | All 3 | Article byline avatar (above feed) |
| `icons.style` / `social_media_icons` | All 3 | Share toolbar / footer near feed |

---

## 9. Per-publisher color → feed cheat sheet

| Role | Business Insider | FOX Sports | Weather Channel | Feed target |
|---|---|---|---|---|
| Primary | `#FF5A00` ribbons, CTA, hover underline | `#003087` CTA, section labels, active nav | `#0078D4` CTA, links, accent borders, hover headline | CTA + section accent + hover |
| Secondary | `#E03625` breaking/live | `#1A8CFF` links/scores | `#0C2340` header/dark (chrome) | Badges vs chrome — follow `usage[]` |
| Card face | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` | Card bg |
| Feed well | `#F7F7F7` | `#F4F4F4` | `#F2F4F4` | Section behind cards |
| Card radius | `0px` | kit `0px` (Premium mock may round) | `6px` | Geometry |
| Card hover | bg + orange underline | (unspecified in kit) | shadow + blue headline | Interaction |
| Headline case | sentence | Title Case | sentence | Card titles |

---

## 10. How to use this table when building a new publisher

1. Walk **every row in sections 1–7** against the new `brand-kit.json`.  
2. If a field is missing, omit the feature or observe it live and add `source: live-observed`.  
3. Prefer the kit’s own `usage[]` and `content_cards.hover` text over this table’s examples.  
4. `modes_in_use` + live feed geometry decide card **composition**; colors/fonts only theme that composition.

Related skill docs: `token-application-matrix.md` (prototype-wide), `anti-generic-rules.md`, `publisher-composition-examples.md`.
