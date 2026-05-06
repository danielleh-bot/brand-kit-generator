# Gap Analysis — Brand Kit ↔ Taboola Transformer Custom Properties

**Goal.** For every property the Brand Kit Generator extracts from a publisher site, determine whether it can be mapped to a Transformer custom property on a custom UI mode **today, with zero dev effort** (i.e. usable in an A/B test without code changes), or whether it requires net-new development.

**Sources of truth used here.**
- Brand kit schema → `lib/crawler.js` (Puppeteer extractor) + `js/extractors.js` (browser extractor)
- Transformer-configurable surface area (proxy) → `lib/defaults.js` + the `PROPERTY_DEFS` table in `lib/analysis.js`. These represent the properties the existing analysis engine already knows how to "wire into" a Taboola feed config — i.e. the knobs that exist on the Transformer side today.
- Anything in the brand kit that has no counterpart in `defaults.js` / `PROPERTY_DEFS` is treated as a **gap**.

> ⚠️ **Assumption flag.** I do not have direct access to the Transformer JSON schema. The "configurable today" column is inferred from `lib/defaults.js`, which the codebase treats as the canonical Taboola feed baseline. Please correct the few rows flagged with `❓` against the live Transformer schema before circulating.

---

## TL;DR

| Bucket | Count | Share |
|---|---|---|
| ✅ Configurable today (1:1 mapping, no dev) | 14 | ~22% |
| 🟡 Partially configurable (knob exists but value space is too narrow, or only some sub-fields) | 9 | ~14% |
| 🔴 Not configurable today — needs dev to add a Transformer property (even for an A/B test) | 41 | ~64% |
| **Total brand-kit fields surveyed** | **64** | |

The biggest gaps cluster in: **typography type-scale (10 roles)**, **brand voice / content labels**, **photo & video styling**, **layout patterns (header/grid/footer)**, **icons & graphics inventory**, and **secondary/tertiary fonts**.

---

## 1. Properties configurable today in Transformer (no dev)

These already exist on the Transformer side (per `lib/defaults.js`) and the brand kit produces a value the engine already maps via `PROPERTY_DEFS` in `lib/analysis.js`. Suitable for A/B test as-is.

| # | Brand kit path | Transformer property (today) | Mapping in code |
|---|---|---|---|
| 1 | `fonts.primary.family` | `fonts.headline.family` | `analysis.js:32` |
| 2 | `fonts.secondary.family` | `fonts.body.family` | `analysis.js:34` |
| 3 | `fonts.primary.weights.bold` | `fonts.headline.weight` | `analysis.js:37` |
| 4 | `fonts.type_scale.article_title_card.size` | `fonts.headline.size` | `analysis.js:36` |
| 5 | `colors.text.primary.hex` | `colors.headline` | `analysis.js:35` |
| 6 | `colors.text.tertiary.hex` (or `.secondary.hex`) | `colors.sourceLabel` | `analysis.js:46` |
| 7 | `colors.primary.hex` | `colors.cta` | `analysis.js:45` |
| 8 | `colors.primary.hex` | `spacing.accentRule.color` | `analysis.js:40` |
| 9 | `colors.primary.hex` | `spacing.accentRule` (composed `3px solid <hex>`) | `analysis.js:41-44` |
| 10 | `colors.backgrounds.base.hex` | `colors.background` | `analysis.js:60` |
| 11 | `colors.backgrounds.section.hex` (or `.secondary`) | `colors.separator` | `analysis.js:47` |
| 12 | `photo_style.thumbnail_format.border_radius` | `spacing.borderRadius` | `analysis.js:39` |
| 13 | `fonts.type_scale.section_headings.transform` | `textStyles.headlineTransform` | `analysis.js:38` |
| 14 | `fonts.type_scale.section_headings.letterSpacing` | `spacing.letterSpacing` | `analysis.js:53` |

---

## 2. Partially configurable (knob exists, but value space is too narrow)

The Transformer property exists but only covers part of what the brand kit captures. An A/B test using the *existing* knob is possible, but the test will lose fidelity.

| # | Brand kit path(s) | Transformer property today | What's missing |
|---|---|---|---|
| 15 | `fonts.eyebrow.family` ← derived from `type_scale.category_pills` / `utility_bar` | `fonts.eyebrow.family` | `eyebrow.size`, `weight`, `transform`, `letterSpacing` are in `defaults.js` but the brand kit captures more granular per-role values that don't all have a 1:1 knob |
| 16 | `colors.text.secondary.hex` | `colors.body` (defaults.js) | Brand kit has 3 text levels (primary/secondary/tertiary); Transformer only exposes 2 (`headline` / `body`) plus `sourceLabel` — tertiary is currently approximated |
| 17 | `graphics.elements[0]` (badge) | `badges.label` + `badges.bg` + `badges.text` | Transformer supports a single sponsored badge style. Brand kit may extract multiple badges (Live, Breaking, Opinion, Video) — only the first is wired |
| 18 | `brand_voice.content_labels.*` | `categoryLabel` (single string) | Brand kit produces a *map* of label kinds (`opinion`, `live`, `breaking`, `video`, `gallery`, `analysis`, `sponsored`); Transformer joins them into one comma-separated string — A/B test on individual labels not possible |
| 19 | `photo_style.thumbnail_format.aspect_ratio` | `thumbnailAspectRatio` | Single global value. Brand kit captures it but Transformer can't vary aspect-ratio per card type (hero vs feed) without dev |
| 20 | `fonts.type_scale.section_headings.size` | — | `fonts.headline.size` only maps `article_title_card`. No way to set a separate size for section headings vs card headlines |
| 21 | `colors.backgrounds.section.hex` | `colors.separator` (re-used) | Background and separator are conflated in the current mapping; a real "section background" knob doesn't exist as its own property |
| 22 | `fonts.primary.weights.regular` | — (defaults to 400) | Brand kit captures regular weight separately; only `headline.weight` (bold) is exposed |
| 23 | `colors.secondary.hex` (second accent) | — | `colors.cta` reuses primary; no secondary accent slot exists in Transformer today |

---

## 3. Not configurable today — needs dev for an A/B test

These are extracted by the brand kit but have **no counterpart** in `lib/defaults.js`/`PROPERTY_DEFS`. A new Transformer property would have to be added before they can be turned on or used in an A/B test.

### 3a. Typography — type-scale roles (10)

Brand kit extracts a full 10-role type scale (`crawler.js:256-302`); Transformer only exposes `headline` / `eyebrow` / `body`.

| # | Brand kit path | Notes |
|---|---|---|
| 24 | `fonts.type_scale.article_title_hero` | Hero / front-page headline size+weight+lineHeight+color |
| 25 | `fonts.type_scale.article_lead` | Subtitle / deck |
| 26 | `fonts.type_scale.article_body` | Article paragraph styling |
| 27 | `fonts.type_scale.navigation` | Nav link typography |
| 28 | `fonts.type_scale.utility_bar` | Top-bar / utility links |
| 29 | `fonts.type_scale.category_pills` | Pill / chip / filter typography |
| 30 | `fonts.type_scale.buttons` | Button text |
| 31 | `fonts.type_scale.meta_text` | Date / byline / caption |
| 32 | `fonts.type_scale.opinion_headline` | Editorial/opinion serif-italic style — entirely new pattern |
| 33 | `fonts.type_scale.*.line_height` / `letter_spacing` / `style` | Per-role line-height/letter-spacing/italic — only the section-headings letterSpacing is wired today |

### 3b. Fonts — secondary / tertiary

| # | Brand kit path | Notes |
|---|---|---|
| 34 | `fonts.secondary.weight` / `style` | Italic editorial pairing — captured but no Transformer slot |
| 35 | `fonts.tertiary[]` | Up to 3 additional families captured; Transformer has no tertiary slot |
| 36 | `fonts.primary.fallbacks[]` | Fallback stack is captured per-publisher; Transformer uses a fixed Arial fallback |

### 3c. Colors — accents palette

`colors.accents.*` (`crawler.js:183-187`) is fully extracted but has no Transformer surface.

| # | Brand kit path | Notes |
|---|---|---|
| 37 | `colors.accents.warning_yellow` | Used by publishers for warning/highlight badges |
| 38 | `colors.accents.negative_red` | Live/breaking labels |
| 39 | `colors.accents.positive_green` | Markets / positive sentiment |
| 40 | `colors.accents.info_blue` | Info badges |
| 41 | `colors.backgrounds.dark.hex` | Dark mode / inverted-section backgrounds |
| 42 | `colors.borders.primary.hex` | Border color (extractors.js outputs this; defaults.js has no `colors.border`) |

### 3d. Logos & brand mark

| # | Brand kit path | Notes |
|---|---|---|
| 43 | `logos.primary.url` / `logos.primary.svg` / `logos.primary.text` | Publisher logo (image, SVG, or text). `defaults.js` has no logo property — a custom UI mode that swaps in publisher logo needs dev |
| 44 | `logos.primary.font` | Logo wordmark font when text-based |
| 45 | `logos.favicon_url` | Favicon |
| 46 | `logos.brand_mark` | Compact mark variant |

### 3e. Brand voice / editorial

| # | Brand kit path | Notes |
|---|---|---|
| 47 | `brand_voice.headline_style.case` (`uppercase` / `sentence case`) | Detected pattern; not exposed (only `textStyles.headlineTransform` which is the CSS `text-transform`, not the *content* casing strategy) |
| 48 | `brand_voice.headline_style.pattern` (e.g. "Topic colon pattern") | Editorial template — no Transformer slot |
| 49 | `brand_voice.content_distinction.opinion.typography` | Distinct editorial/opinion typography rule — would need conditional styling support |
| 50 | `brand_voice.language` | Language override per UI mode (RTL implications) — `layout.direction = rtl/ltr` not exposed in defaults.js |

### 3f. Photo style & video

| # | Brand kit path | Notes |
|---|---|---|
| 51 | `photo_style.video_thumbnails.indicator` | Play-button presence/absence |
| 52 | `photo_style.video_thumbnails.indicator_color` | Play-button tint |
| 53 | `photo_style.author_photos.shape` (circular/square) | Author avatar shape |
| 54 | `photo_style.author_photos.size` | Author avatar size |

### 3g. Graphics / badge inventory

| # | Brand kit path | Notes |
|---|---|---|
| 55 | `graphics.elements[]` (full array, multi-badge) | Today only the first badge maps. Live/Breaking/Opinion/Sponsored each need their own Transformer slot to be A/B testable independently |
| 56 | `graphics.style` (e.g. "Minimal — relies on photography and typography") | Stylistic posture — no slot |

### 3h. Icons

| # | Brand kit path | Notes |
|---|---|---|
| 57 | `icons.style` (e.g. "SVG-based") | Icon system signal — no Transformer slot |
| 58 | `icons.social_media_icons.platforms[]` | Which social networks the publisher uses (Facebook, X, IG, etc.) — drives footer |
| 59 | `icons.social_media_icons.placement` | Footer vs header |

### 3i. Layout patterns

`defaults.js` exposes `spacing.cardGap`, but everything else from `layout_patterns` (`crawler.js:450-506`) and `layout.*` (`extractors.js:198-251`) is unmapped.

| # | Brand kit path | Notes |
|---|---|---|
| 60 | `layout_patterns.grid` (single/two-column) | Layout strategy |
| 61 | `layout_patterns.header.layers[]` | Header structure (utility bar / brand bar / nav) |
| 62 | `layout_patterns.footer.sections[]` | Footer column structure |
| 63 | `layout.container.max_width` | Container width |
| 64 | `layout.spacing.{xs,sm,md,lg,xl}` | 5-step spacing scale |
| 65 | `layout.grid.gap` | Grid gap (≠ `spacing.cardGap` granularity) |
| 66 | `header.style` (light/dark) / `header.background` / `header.accentBarColor` / `header.hasSearch` | From `extractHeaderStyle()` (`extractors.js:671-781`) — drives a custom-headed UI mode but no knobs for these exist |

---

## 4. Recommendations

Prioritized by A/B-test value × extraction reliability:

1. **Add type-scale roles to Transformer.** Even adding `hero_headline.size/weight`, `eyebrow.size/transform/letterSpacing`, and `meta_text.size/color` unlocks ~7 properties already extracted reliably.
2. **Multi-badge support.** Promote `badges` from a single object to a keyed map (`sponsored`, `live`, `breaking`, `opinion`, `video`). All extracted today via `graphics.elements[]`.
3. **Accent color palette.** Add `colors.accents.{warning,negative,positive,info}` slots — already extracted with high confidence (RGB-component classification in `crawler.js:162-165`).
4. **Photo & video knobs.** Add `photo_style.video_indicator{enabled,color}` and `photo_style.author_avatar.shape` — small surface, real visual impact.
5. **Logo slot.** A single `logos.primary.{type,url|svg|text}` property would unlock branded-header UI modes that currently need a dev ticket per publisher.
6. **Direction.** Add `layout.direction` (`ltr` / `rtl`) — currently RTL support is hard-coded in templates, not exposed as a knob.
7. **Tertiary text level + secondary accent.** Both are extracted; both need a slot.

Items 1–3 alone would move ~22 properties from "needs dev" → "configurable today" and roughly double the share of brand-kit fidelity that is A/B-testable without code changes.

---

## 5. Caveats

- The Transformer surface used here is `lib/defaults.js` + `PROPERTY_DEFS`. If Transformer exposes properties not represented there, some "🔴 needs dev" rows are actually 🟡 or ✅ — please verify against the real schema and re-bucket.
- Brand kit values are extracted heuristically. Even where a Transformer slot exists, low-confidence extraction (e.g. badge text from class-name fuzzy matching) may need human QA before A/B testing.
- This analysis is structural (does the knob exist?), not behavioral (does the knob actually change the rendered widget the way the brand kit expects?). A second pass on the Transformer rendering pipeline is recommended for the ✅ rows before relying on them in a live test.
