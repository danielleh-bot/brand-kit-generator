---
name: publisher-brand-kit-prototype
description: >-
  Build a publisher-tailored standalone HTML mobile feed prototype from brand-kit
  JSON plus a live publisher article/feed URL. Use when given a brand kit and
  publisher URL, or asked for mobile-prototype.html, TrueNative/Premium Feed mock,
  native feed prototype, or "do the same for <publisher>" (Fox Sports / Weather
  Channel / AZ Central / BI). Hand-build per publisher — never reskin the last one.
---

# Publisher Brand Kit → Standalone HTML Feed Prototype

> **Claude Code skill** (also discovered by Cursor via `.claude/skills/`).
> Slash command: `/publisher-brand-kit-prototype`
> Zip this folder to upload as a Claude.ai skill if needed.

**MANDATORY:** Follow every phase below in order. Do not skip phases. Do not
copy a previous publisher's `mobile-prototype.html` and re-skin fonts/colors.
Each publisher gets a native composition designed from **their** brand kit and
**their** live site chrome/feed pattern.

Canonical prior deliverables in this repo (study for fidelity, never clone):

| Publisher | Deliverable | Composition |
|---|---|---|
| Weather Channel | `output/weather-channel/mobile-prototype.html` | iPhone frame + horizontal thumb-left cards + full-width featured |
| FOX Sports | `output/fox-sports/mobile-prototype.html` | 414px viewport + Premium Feed (1×1 / 2×1 / 4×1, reels, display) |
| AZ Central | `output/azcentral/mobile-prototype.html` (if present) | iPhone 17 + Gannett card inventory (premium lock, opinion, live pulse…) |
| Business Insider | `output/business-insider/index.html` | Desktop article + masthead + feed (not mobile-frame) |

Supporting references (load on demand):

- [`references/feed-field-mapping.md`](references/feed-field-mapping.md) — **common kit fields → feed/card intended use** (cross BI / Fox / TWC)
- [`references/token-application-matrix.md`](references/token-application-matrix.md) — every JSON field → CSS/HTML mapping
- [`references/anti-generic-rules.md`](references/anti-generic-rules.md) — hard bans against reskinning
- [`references/qa-checklist.md`](references/qa-checklist.md) — mandatory QA before ship
- [`references/publisher-composition-examples.md`](references/publisher-composition-examples.md) — why TWC ≠ Fox ≠ AZ ≠ BI
- [`scripts/qa-prototype.py`](scripts/qa-prototype.py) — automated structural/token QA harness

---

## Inputs (required)

The user supplies **both**:

1. **Brand kit JSON** — crawled/analyzed kit with tokens **and** feed-application
   suggestions (colors, fonts, type_scale, buttons, photo_style, layout_patterns,
   brand_voice, graphics, icons, spacing, navigation, content, related_articles,
   taboola, hover/interaction notes, etc.). May be pasted inline, attached, or at
   `output/<slug>/brand-kit.json`.
2. **Publisher article URL** — a live page that shows their current site chrome
   **and** (ideally) their current below-article feed / related module.

Optional but useful: homepage URL, feed product intent (TrueNative vs Premium),
device frame preference (iPhone 15 Pro / 17 / bare 414px).

If either required input is missing, stop and ask. Do not invent a brand kit.

---

## Phase 0 — Intake & inventory (no HTML yet)

1. Write the kit to `output/<slug>/brand-kit.json` if not already there.
   Derive `<slug>` from the brand name / hostname (`weather-channel`, `fox-sports`).
2. Parse the full JSON. Build a **Token Inventory Table** in your working notes
   covering **every top-level section** present. Missing sections are OK only if
   absent from the kit — never invent tokens to fill gaps.
3. Extract from the kit (when present):
   - `brand.*`, `logos.*`, `colors.*` (primary, variants, secondary, text, backgrounds, accents)
   - `fonts.*` + full `type_scale` (all 10 roles)
   - `buttons.primary` / `buttons.secondary` (+ hover fields)
   - `photo_style.*` (aspect, radius, video indicator)
   - `layout_patterns.header` / `content_cards` / `footer` / `grid`
   - `layout_patterns.content_cards.hover` ← interaction source of truth
   - `brand_voice.content_labels` / `content_distinction` / `headline_style`
   - `graphics.elements`, `icons.style`
   - `spacing.*`
   - `navigation.navLinks`
   - `content.*` (headline, deck, byline, hero, paragraphs)
   - `related_articles[]`
   - `taboola.*` (feed_label, sponsored_label, modes)
   - Any explicit **feed application / suggestion** fields the kit carries
4. List which tokens are `source: extracted|documented|derived|manual` vs
   fallback. Prefer non-fallback values. Flag low-quality kits before designing.

**Gate:** You can name every color hex, font family, type-scale role, button
radius, card radius, hover behavior, and content label from the kit without
guessing. If you cannot, re-read the JSON — do not proceed to HTML.

---

## Phase 1 — Live publisher inspection (ground truth)

Open / fetch the provided **article URL** (and homepage if given). Record:

1. **Chrome:** header layers, logo treatment (wordmark vs SVG vs combination),
   nav labels, utility icons, accent rules, sticky behavior, dark vs light masthead.
2. **Article anatomy:** category/kicker, headline case, deck, byline, hero
   aspect, caption style, body serif/sans, share toolbar.
3. **Feed / related pattern currently on site:**
   - Horizontal thumb-left / text-right?
   - Vertical stacked full-width cards?
   - Multi-column grid?
   - Mixed featured + compact?
   - Premium layouts (1×1, 2×1, 4×1, reels)?
   - Publisher-unique card types (LIVE, Opinion, Subscriber, Gallery, Severe…)?
4. **Taboola presence** (if any): loader slug, mode, container id, sponsored
   vs organic labeling — note for `taboola.*` alignment; do not invent if absent.
5. Screenshot or detailed notes of the live feed composition. Prefer real
   DOM observation (browser / Puppeteer / curl+parse) over memory.

**Gate:** You can describe this publisher's mobile article + feed pattern in
one sentence that would be **false** for a different publisher in this repo.
Example: "TWC = navy sticky masthead + horizontal scroll section nav +
thumb-left horizontal cards with blue accent dot headers" — that sentence
must not also describe Fox.

Compare notes against the brand kit. If live CSS contradicts the kit on a
critical token (font family, primary hex, masthead color, card radius),
**prefer live computed style**, patch `brand-kit.json` with a provenance note
in `metadata`, and proceed with the corrected value. Never silently keep a
wrong kit token.

---

## Phase 2 — Composition decision (unique per publisher)

Before writing HTML, write a short **Composition Spec** (keep it in a comment
at the top of the prototype `<style>` or a sibling `README` note):

1. **Viewport shell:** choose ONE based on the brief / prior convention for
   this vertical — do not default to the last publisher's shell.
   - iPhone 15 Pro frame (~393×800, Dynamic Island) — TWC-style
   - iPhone 17 frame (402×874, 54px radius) — AZ-style
   - Bare mobile max-width 414px (no device chrome) — Fox-style
   - Desktop article layout — BI-style
2. **Feed product intent:** TrueNative (preserve publisher's existing card
   geometry) vs Premium Feed (rounded cards, footer CTAs, rich formats) vs
   publisher-unique inventory. Derive from kit suggestions + live pattern +
   user brief — not from the previous PR.
3. **Card type inventory:** list every card type you will implement, sourced
   from `brand_voice.content_labels`, `graphics.elements`, live feed, and
   kit suggestions. Each type needs a distinct visual treatment.
4. **Interaction model:** copy `layout_patterns.content_cards.hover` and
   `buttons.*.hover_*` literally. If the kit says "headline shifts to primary
   blue", implement that — **not** a generic `translateY(-2px)` card lift
   unless the kit explicitly specifies lift/shadow.
5. **Anti-clone check:** name three things this composition will do that the
   *previous* publisher prototype in `output/` does **not** do.

**Gate:** Composition Spec exists and fails the "could this be a font/color
swap of Fox or TWC?" test.

---

## Phase 3 — Map every token → CSS variables

Create `:root` CSS custom properties from the kit. Use the mapping in
[`references/token-application-matrix.md`](references/token-application-matrix.md).

Rules:

- Prefix variables with a publisher-specific short code (`--twc-`, `--fox-`,
  `--bi-`, `--az-`) — never reuse another publisher's prefix.
- Load Google Fonts (or kit `google_equivalent`) that match `fonts.primary` /
  `fonts.secondary`. Proprietary fonts → documented web proxy (Brother 1816 →
  Manrope, Unify Sans → Inter, Helvetica Neue → Inter) **and** note the
  proxy in an HTML comment.
- Wire **type_scale** roles to concrete classes (hero title, card title,
  nav, meta, buttons, section headings, category pills, body, lead).
- Wire **buttons.primary** exactly: bg, text, radius, padding, weight,
  transform, letter-spacing, hover bg.
- Wire **photo_style.thumbnail_format** aspect-ratio + border-radius onto
  every thumb.
- Wire **spacing** gaps/padding; do not invent 16px everywhere if the kit
  says `card_gap: 1px` (Fox editorial tight stack) vs `16px` (TWC).

---

## Phase 4 — Build page chrome (must look like THEIR site)

Hand-author HTML/CSS for:

1. Sticky header using `layout_patterns.header` (bg, dark/light, layers).
2. Logo from `logos.primary` (SVG if available, else faithful text wordmark
   with stated treatment — e.g. FOX heavy + SPORTS light).
3. Favicon via `logos.favicon_url`.
4. Nav from `navigation.navLinks` (horizontal scroll on mobile when many
   items). Active state uses primary / accent_rule_color.
5. Utility icons matching `icons.style` (stroked monoline vs filled).
6. Accent rule / sport tabs / utility bar exactly as `header.layers` describe.

**Do not** invent a hamburger + centered wordmark + search icon layout unless
the live site / kit header layers show that pattern.

---

## Phase 5 — Build realistic article block

Use `content.*` from the kit when present; otherwise scrape the provided URL.

Required elements:

1. Category / kicker (brand voice color + `category_pills` type scale)
2. Headline (`article_title_hero` type scale + `headline_style` case)
3. Deck / lead if the publisher uses one
4. Byline + date (`meta_text`)
5. Hero image at kit aspect ratio + caption if provided
6. 2–4 short body paragraphs (`article_body`) — realistic, on-topic, **no em dashes**
7. Share / action toolbar if the live article has one

Hero image: prefer the live article hero URL; else a thematic image with a
branded gradient fallback (`onerror` → `data-fallback` → parent gradient).
Never leave broken-image icons visible.

---

## Phase 6 — Build the native feed (the core deliverable)

Place the feed **below** the article. This is not a generic Taboola skin —
it is a **native feed experience** designed for this publisher.

### 6.1 Structure

1. Section divider / header using `taboola.feed_label` or
   `taboola.sponsored_label` (exact strings from kit when present).
2. Alternate sponsored blocks and organic/native blocks as appropriate for
   the feed product intent.
3. Taboola attribution footer.

### 6.2 Cards

For **each** card type in your Composition Spec:

1. Implement distinct markup + CSS (not one card class with a modifier that
   only changes a label color).
2. Apply kit tokens: radius, shadow/border from `content_cards`, thumb aspect
   from `photo_style`, title from `article_title_card`, meta from `meta_text`,
   CTA from `buttons.primary` / secondary patterns.
3. Sponsored: disclosure badge, advertiser branding, CTA label.
4. Organic/native: publisher branding, category labels from
   `brand_voice.content_labels` / `content_distinction` where relevant
   (LIVE, SEVERE, Opinion, Analysis, Subscriber Exclusive, Video, Gallery…).
5. Video: play overlay per `photo_style.video_thumbnails`.
6. Rich formats (only if Premium / kit / brief calls for them): reels row,
   2×1 pairs, 4×1 stream, display/vertical — Fox reference, not default.

### 6.3 Interactions (mandatory)

Implement kit-specified UX — not a stock hover pack:

- Headline / card hover from `content_cards.hover`
- Button hover from `buttons.primary.hover_background` (or variants)
- Active/pressed states from `colors.primary_variants` when present
- Nav active underline / accent
- Any JS needed for horizontal reel scroll, live pulse animation,
  sticky header, or tab switching — keep it minimal and purposeful
- Prefer CSS `:hover` / `:active` / `@keyframes` matching the kit language

### 6.4 Content sourcing

- Prefer `related_articles[]` from the kit for native cards.
- Sponsored cards: plausible advertisers; never reuse another publisher's
  sponsored lineup verbatim.
- Headlines follow `brand_voice.headline_style` (title case vs sentence case).
- **No em dashes** (`—`) in any visible copy.

---

## Phase 7 — Self-contained HTML deliverable

Output path: `output/<slug>/mobile-prototype.html` (or `index.html` for
desktop-first briefs like BI).

Requirements:

- Single standalone HTML file (inline `<style>`, inline minimal `<script>`)
- Google Fonts `<link>` in `<head>`
- Works offline for layout even if remote images fail (fallbacks)
- No build step, no Handlebars, no dependency on `templates/prototype.hbs`
- Optional: also refresh `brand-kit.css` if tokens were corrected

Also update/create `output/<slug>/README.md` with: source URL, kit provenance,
composition one-liner, how to open the prototype, and regenerate notes.

---

## Phase 8 — QA (mandatory; do not ship without)

Run the checklist in [`references/qa-checklist.md`](references/qa-checklist.md).
At minimum:

```bash
python3 .claude/skills/publisher-brand-kit-prototype/scripts/qa-prototype.py \
  --kit output/<slug>/brand-kit.json \
  --html output/<slug>/mobile-prototype.html
```

Then visual QA in a browser (or computer-use / Puppeteer screenshots):

1. Open at the intended viewport width.
2. Scroll full article → full feed.
3. Hover nav, cards, CTAs — confirm kit hover, not generic lift.
4. Disable network / break image URLs — confirm gradient fallbacks, no layout collapse.
5. Diff against a *different* publisher prototype: layouts must not be isomorphic.

Fix every failure before committing.

---

## Phase 9 — Ship

1. Commit `output/<slug>/brand-kit.json`, `mobile-prototype.html`, README, and
   any corrected CSS under a descriptive message naming the publisher.
2. Do **not** modify unrelated publishers' prototypes "for consistency."
3. In the PR / summary: state composition one-liner, which kit sections were
   applied, which live-site observations corrected the kit, and QA results.

---

## Hard bans (read [`anti-generic-rules.md`](references/anti-generic-rules.md))

- ❌ Open last publisher's HTML, search-replace colors/fonts, ship it
- ❌ Force every publisher into Premium 1×1/2×1/4×1 or into horizontal cards
- ❌ Generic card `translateY` + drop-shadow hover when kit specifies otherwise
- ❌ Invent brand colors, logos, or nav labels not in kit / live site
- ❌ Fabricate "live feed" screenshots or claim crawl provenance when hand-built
- ❌ Em dashes in copy; broken `<img>` icons; lorem ipsum
- ❌ Reuse CSS class prefixes (`fox-`, `twc-`, `pf-`) on a different publisher
- ❌ Skip Phase 1 live inspection because "the kit is enough"

---

## Quick trigger examples

- "Here's the brand kit JSON for ESPN + https://www.espn.com/… — build the prototype"
- "Do the same native feed mobile prototype for The Athletic"
- "Generate mobile-prototype.html from output/foo/brand-kit.json and this article URL"
