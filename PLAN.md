# Brand Kit Generator — Deep Crawl + Behavior Extraction + LLM Enrichment + Per-Publisher Feed Mapping

## Context

Four reference brand kits (t-online, CBS News, NBC News, Leckerschmecker)
ship dramatically richer schemas than what `lib/crawler.js` currently
produces, and each one ships brand expressions that don't exist in
Taboola's current static feed CSS surface at all (t-online's magenta-dot
heading motif; CBS's show-colored section bands; NBC's blue notched
horizontal rule; Leckerschmecker's pill buttons + green gradient CTAs).

Three problems live underneath this:

1. **The crawler is doing a narrower job than the reference kits.**
   Their `metadata.analysis_method` declares
   `"CSS extraction AND visual analysis AND web research"`; ours is pure
   computed-style scraping. No reasoning, no semantic naming.
2. **Even a perfect *visual* extraction doesn't deliver a native feed.**
   Many real brand tokens — show-color bands, custom badge shapes,
   brand-mark dot motifs, gradient CTAs, custom font faces — have no
   hook in Taboola's current per-mode `__style__` config or static
   feed-card markup. Without a mapping + recommendation layer, those
   tokens stay on the cutting-room floor and the feed looks
   generic-with-paint instead of natively-publisher.
3. **A native feed is also a behavioral parity problem, not only a CSS
   facelift.** Premium publisher feeds are distinguished by their
   *interaction language* — magenta underline-reveal on link hover,
   LIVE badge pulse, scroll-triggered reveal of section bands, card
   lift on hover, focus-state choreography, custom easings. None of
   that is extractable from static computed styles or expressible in
   today's loader.js. Without capturing and re-applying these
   microinteractions the feed will always feel transplanted, not
   native.

This plan addresses all three concerns with three coordinated layers —
each with a *visual* track and a *behavioral* track — in a way that
**never breaks the UI** (every layer has explicit safe-fallback
contracts, including reduced-motion and TRC-engine-conflict protection)
and converges the feed toward a **premium, completely custom
per-publisher** look *and feel*.

## Validated gap (grounded in crawler source)

### Already extracted by crawler (don't redo)

`brand` (5 keys, tagline always empty), `logos.primary` (one scored
logo), `logos.favicon_url`, `colors.primary`, `colors.text.{primary,
secondary, tertiary}`, `colors.backgrounds.{base, section, secondary,
dark}`, `colors.accents.{warning_yellow, negative_red, positive_green,
info_blue}`, `colors.secondary`, `colors.primary_variants.{darken_5,
darken_10}` (derived), `colors.gradients.primary` (conditional),
`fonts.{primary, secondary, tertiary[]}`, `fonts.type_scale` (10 fixed
roles, single `querySelector` each), `buttons.primary` (one button),
`photo_style` (3 sub-objects), `graphics.elements` (badge text scrape),
`icons.{style, count_detected, social_media_icons.platforms}`,
`layout_patterns.{grid, header.{layers, background_color, is_dark,
utility_bar, accent_rule_color}, footer.sections}`,
`spacing.{card_border_radius, container_max_width, grid_gap}`,
`metadata`, `extraction_quality`.

### Layer-classified gap

The Plan agent's review confirmed: a handful of "LLM-needed" items are
actually CSS-derivable, and a handful of "CSS-derivable" items need
DOM-heuristic safety nets, not pure CSS. Final classification below.

**Layer 1 — Deterministic / CSS-extractable** (crawler today: missed):

| Token area | Reference-kit example | How to extract |
|---|---|---|
| CSS custom properties on `:root` | All four kits use `--brand-*` naming | `getComputedStyle(document.documentElement)` walk for `--*`; match hex values back to extracted colors → free color *names* without an LLM call |
| Shadow registry | Leckerschmecker `{natural, deep, sharp}` | sample `box-shadow` from cards / buttons / popups / dropdowns; dedupe |
| Border-radius map | Leckerschmecker `{buttons: 9999px, cards: 5px, overlays: 4px, images: 0px}` | per-element-class sampling, cluster by role |
| Spacing scale | Leckerschmecker 8 named tiers | scrape `--spacing-*` / `--space-*` / `--gap-*` custom props |
| Typography hierarchy | CBS 16-element spec | 16 role selectors (hero, secondary, right-rail, sub-nav, byline, timestamps, more-link, footer-link, caption, …), per-element capture |
| Button variants | Leckerschmecker `{primary, outline, soft_cta}` | score multiple `button[class*=…]` patterns, emit a variants object |
| Text-color depth | Leckerschmecker 6 levels | sample h1/h2/h3/p/byline/caption distinctly |
| UI overlay rgba colors | CBS `video_overlay_bg: rgba(16,16,16,0.65)` | sample `[class*="overlay"]`, `[class*="modal"]`, `[class*="badge"]` — capture translucent values explicitly |
| Border / divider colors | Leckerschmecker `#ebebeb` | `hr`, `[class*="divider"]`, `[class*="separator"]` border colors |
| Show / section brand colors | CBS Mornings orange band, 60 Minutes crimson | iterate `<section>` and `[class*="show-"]` / `section[data-show]`; compare bg vs page bg via `closest()` walk for CSS-variable scope |
| Icon catalog (no semantic naming yet) | NBC 13 icons with viewBox | iterate `<svg>` (cap ~60), capture `aria-label` / `<title>` / `role` / `viewBox` / nearest button label |
| Chart embed detection | NBC Datawrapper | scan `iframe[src*="datawrapper"]`, `iframe[src*="flourish"]`, `iframe[src*="highcharts"]`, `iframe[src*="atlas.nyt.com"]` |
| Logo SVG structural summary | (deterministic part of) NBC peacock description | for inline SVG logos: count distinct `<path>`/`<g>`, bbox, unique fill colors, has `<text>` (wordmark vs mark-only) — constrains LLM hallucination on the semantic prose |
| Logo light/dark variants | header vs footer logo differ | second-pass scoring inside `<footer>`; record both |
| Header layer breakdown | t-online utility / main / sub-nav | iterate `headerEl.children` directly visible layers, emit `{bg, text_color, height, is_dark}` per layer |

**Layer 1 (multi-viewport — relaxes single-`page.evaluate` constraint):**

| Token area | How to extract |
|---|---|
| `layout_patterns.breakpoints` | new top-level async `extractResponsiveBreakpoints(page)` that calls `page.setViewport()` at `[1440, 1024, 768, 480]` and re-reads layout; infers breakpoints from element display/grid transitions. Stylesheet-walk path (`document.styleSheets` for `@media`) tried first inside `page.evaluate()` with try/catch around CORS-blocked sheets; viewport probe is the safety net. Emits `breakpoints.source: 'stylesheet' \| 'probed' \| 'partial'`. |
| `layout_patterns.max_widths` map | sample every element with `max-width` between 600–1800px during the layout pass; bucket by role from class hints |

**Layer 1B — Behavior extraction (deterministic, Puppeteer-side)**:

This is the new track the user flagged. Static computed styles miss
the entire interaction layer. Capture it via Puppeteer interaction
plus pre-navigation script injection. Emits a parallel `behaviors`
top-level section on the brand kit.

| Behavior class | Source | How to extract |
|---|---|---|
| `behaviors.transitions[]` | computed style `transition-*` | Inside `page.evaluate()`: for a representative set of interactive selectors (`a`, `button`, `[class*="card"]`, `[class*="cta"]`, `[class*="link"]`, `[class*="badge"]`, `[class*="pill"]`), read `transitionProperty / Duration / TimingFunction / Delay`. Dedupe; emit a registry of `{property → {duration_ms, easing, delay_ms, source_selector}}`. |
| `behaviors.hover_states[]` | live interaction | For each of N (~8–12) representative interactive selectors: snapshot computed style → `page.hover(selector)` → wait `max(transitionDuration) + 80ms` → snapshot again → diff. Captures real hover transformations (color, transform, opacity, box-shadow, text-decoration, filter, scale). Reset by hovering off-canvas between samples. |
| `behaviors.focus_states[]` | live interaction | Same approach with `page.focus(selector)` on focusable elements. Captures `:focus` / `:focus-visible` choreography (outline, ring, color shift). |
| `behaviors.active_states[]` | live interaction | `page.mouse.down()` then snapshot — captures press-state shrink/dim. Limited to 1–2 representative buttons for cost. |
| `behaviors.keyframes[]` | `document.styleSheets` walk | Walk all readable stylesheets (CORS-tolerant try/catch), collect `@keyframes` rules with name + percentage steps. Cross-reference with `animation-name` declarations on real elements to surface which keyframes are actually used. |
| `behaviors.entry_animations[]` | pre-nav script injection | Before `page.goto()`, inject a script that wraps `Element.prototype.animate` (Web Animations API) and logs every call (keyframes + options + element selector). Captures JS-driven entry animations (NYT-style scroll choreography, Bloomberg ticker counters). |
| `behaviors.scroll_reveal[]` | runtime introspection | Inject a script before `page.goto()` that monkey-patches `IntersectionObserver` — log every observe() call (callback fingerprint, element selector, root margin, threshold). After load, scroll the page in 4–6 steps and capture classList / inline-style mutations via `MutationObserver`. Heuristically identify "card-enters-viewport → adds animation class" patterns. |
| `behaviors.lazy_load[]` | DOM inspection | Count `<img loading="lazy">`, capture skeleton/shimmer classes (`[class*="skeleton"]`, `[class*="shimmer"]`, `[class*="placeholder"]`). Sample shimmer keyframes if present. |
| `behaviors.tickers[]` | DOM inspection | Detect elements with `animation: marquee/ticker/scroll-left/-right` keyframes; capture stock-ticker / breaking-news patterns. |
| `behaviors.easings[]` | derived | Top-N most-used `cubic-bezier(...)` values across the transition + keyframe registries. Emits the publisher's *easing palette* — often 2–4 distinctive curves. |
| `behaviors.duration_scale[]` | derived | Cluster transition + animation durations into named tiers (fast ~120ms, normal ~200ms, slow ~400ms, hero ~600ms). Mirrors the spacing-scale approach. |

The interactive captures (`hover_states`, `focus_states`,
`active_states`) require restructuring crawler.js: it currently runs in
a single `page.evaluate()`, but these need round-trips to the
Puppeteer driver. The breakpoint extractor (Layer 1) already opens
this door; behavior capture goes through the same multi-step
extractor pattern (`extractInteractionBehaviors(page)` at top level).

Cost: ~10–25s added to a typical crawl (8–12 selector hover probes at
~1s each plus the keyframe walk). Wizard SSE shows this as a distinct
"Observing interactions…" stage.

Schema additions (new):

```
behaviors.transitions[]              // {selector_class, property, duration_ms, easing, delay_ms}
behaviors.hover_states[]             // {selector_class, diff: { color?, transform?, opacity?, box_shadow?, text_decoration?, ... }, transition_duration_ms}
behaviors.focus_states[]             // same shape
behaviors.active_states[]            // same shape
behaviors.keyframes[]                // {name, steps: [{percent, properties}], used_by_selectors[]}
behaviors.entry_animations[]         // {element_selector, keyframes, duration_ms, easing, delay_ms}
behaviors.scroll_reveal[]            // {selector_class, trigger: 'viewport', threshold, mutation: 'add-class' | 'inline-style', payload}
behaviors.lazy_load.{count, skeleton_present, shimmer_keyframe_name}
behaviors.tickers[]                  // {selector, keyframe_name, duration_ms, direction}
behaviors.easings[]                  // sorted by frequency
behaviors.duration_scale.{fast, normal, slow, hero}
```

Skip-safe: if interactive captures fail (selector throws, page blocks
hover, viewport probe times out), each behavior gets `source:
'partial'` with the reason logged. Crawler never aborts on a behavior
failure.

**Layer 2 — Requires reasoning (LLM enrichment)**:

After Layer-1 wins (CSS-var color naming, SVG structural summary,
section-band color extraction), what's left for the LLM is genuinely
interpretive:

- `brand.{tagline (currently empty), owner, parent_brand, license}`
- `brand_voice.{personality_traits, tone, characteristics, editorial_values, headline_style.format/tone, content_distinction descriptions, section_taglines, newsletter_voice}`
- Color **names** *where CSS-var matching didn't already supply them* — refines crawler placeholder names like `'Primary Accent'` to e.g. `'Telekom Magenta'`
- Color **usage descriptions** — concise prose explaining where each color appears (e.g. "Used for LIVE badges and breaking news indicators")
- `logos.primary.description` — semantic prose on top of the structural summary ("six-feathered peacock", "magenta dot motif appended to every section heading")
- `logos.brand_mark` semantic interpretation
- `photo_style.{overall_aesthetic, characteristics}` — interpretive prose
- `graphics.elements[].description` — semantic meaning of detected color blocks
- `icons[].name` — human-readable interpretation of each SVG (search, hamburger, play, share, etc.) constrained by the crawler-provided `viewBox` + `aria-label` if any
- Section-band color **labels** — "CBS Mornings warm orange" (the crawler extracted the hex + the section's nearest `<h2>` text; the LLM produces the brand-aware label)
- `colors.groups` — an additive, LLM-authored grouping view (`core_palette: ['primary','secondary']`, `show_brands: [{name, color_ref}]`) that doesn't replace the flat canonical shape
- `behaviors.signature_interactions[]` — semantic naming + intent for the captured behaviors. The crawler gives raw diffs (`{ color: '#171B26' → '#E20074', text_decoration: 'none' → 'underline', transition: 160ms ease }`); the LLM produces names + intent:
  - `name`: "Magenta underline reveal"
  - `target_role`: "headline link" / "CTA button" / "section heading" / "card surface"
  - `intent`: "emphasizes brand identity on every interactive surface"
  - `priority`: `signature` | `reinforcing` | `incidental`
  - `feed_relevance`: `'high'` (apply to feed cards) | `'medium'` (apply to feed CTAs only) | `'low'` (skip — too publisher-specific or off-context for a feed)
- `behaviors.named_easings` — turn `cubic-bezier(0.4, 0, 0.2, 1)` into "Material Standard" / "Telekom Smooth" / publisher-named curve when discoverable
- `behaviors.choreography_summary` — interpretive prose for the workshop deliverable, e.g. "BI uses a calm 160ms / 220ms duration pair with a subtle ease-out, reserving longer 400ms transitions only for the breaking-news ribbon. Hover states are uniformly underline + color, never scale — preserving an editorial-not-interactive feel."

**Layer 3 — Mapping + Application + Validation** (the user's missing
piece — see next section).

## Layer 3 — Token → Feed mapping, safe application, no-break guarantee

This is the layer the user flagged as undefined. It's what turns a rich
brand kit into a native, premium, unbreakable per-publisher feed.

### The token-to-hook registry

A new module `lib/feed-mapping.js` declares **every brand token's
relationship to the Taboola feed surface**. Three categories:

| Hook category | Definition | Examples |
|---|---|---|
| **mapped** | Token has a current Taboola CSS hook (mode `__style__` selector or static feed-card class). Apply directly. | `colors.primary.hex` → card title hover underline; `fonts.primary.family` → all card text; `buttons.primary.border_radius` → "See more" CTA |
| **gap** | Token represents a real brand expression with no current Taboola hook. The mapping engine emits a *recommendation* for the workshop deliverable: "add hook X for publisher Y". | `colors.show_brand_colors.cbs_mornings` → no section-band hook today; `graphics.elements[name=BREAKING]` → no first-card overlay hook; `logos.brand_mark.dot_motif` → no per-section-heading hook |
| **safe-ignore** | Token detected but applying it would risk breaking the feed (animations, fixed positions, complex `:has()` selectors, `position: sticky` overlays). Skip with a logged reason. | Detected hero parallax background; detected sticky breaking-news banner; CSS custom-property cascades that reference unresolvable vars |

The registry is **publisher-agnostic data** — a single declarative file
that lists every supported token path, its target Taboola selector(s),
and per-target safety constraints. New token paths added in Layer 1/1B/2
get a registry entry; tokens without a registry entry default to
`gap` until reviewed.

The registry covers **both visual and behavioral tokens** under the
same schema. Behavioral entries declare which Web Animations / CSS
transitions to install, on which selectors, with what easings and
durations — driven by Layer 1B's extraction.

```js
// lib/feed-mapping.js — sketch
module.exports = {
  TOKEN_HOOKS: [
    {
      token: 'colors.primary.hex',
      category: 'mapped',
      targets: [
        { selector: '.tbl-feed-card:hover .video-title', property: 'text-decoration-color' },
        { selector: '.tbl-feed-more-btn',                property: 'background-color' },
        { selector: '.tbl-feed-card .trc-pre-label',     property: 'color' },
      ],
      criticality: 'critical',          // missing → feed doesn't feel native
      safety: { contrast_against: 'colors.backgrounds.base.hex', min_ratio: 4.5 },
    },
    {
      token: 'colors.show_brand_colors.*',
      category: 'gap',
      recommendation: 'Per-section card band — propose new mode-level `__sectionBand__` config that wraps every Nth feed-card in a colored container. See workshop brief.',
      criticality: 'enhances',
    },
    {
      token: 'logos.brand_mark.dot_color',
      category: 'gap',
      recommendation: 'Per-section heading suffix dot — propose new feed-header `__sectionMark__` slot rendering a colored dot/glyph after the section label. See workshop brief.',
      criticality: 'enhances',
    },
    {
      token: 'photo_style.video_thumbnails.indicator_color',
      category: 'mapped',
      targets: [{ selector: '.tbl-feed-card .trc-video-play-icon', property: 'color' }],
      criticality: 'enhances',
    },
    {
      token: 'fonts.primary.family',
      category: 'mapped',
      targets: [{ selector: '.tbl-feed-card *', property: 'font-family' }],
      criticality: 'critical',
      safety: { font_fallback_required: true, max_custom_face_kb: 200 },
    },
    {
      token: 'spacing.css_custom_properties[--brand-card-pad]',
      category: 'safe-ignore',
      reason: 'CSS custom property cascade; resolving it requires evaluating the publisher\'s scoped variable scope — defer to v2.',
    },

    // ─── Behavioral entries ──────────────────────────────────────
    {
      token: 'behaviors.hover_states[role=card]',
      category: 'mapped',
      targets: [{
        selector: '.tbl-feed-card',
        install: {
          baseline: { transition: '${behaviors.transitions[card].compose} all ${behaviors.duration_scale.normal}ms ${behaviors.easings[0]}' },
          ':hover': '${behaviors.hover_states[role=card].diff}',
        }
      }],
      criticality: 'enhances',
      safety: {
        max_duration_ms: 400,
        no_layout_thrash: true,         // transform/opacity/filter/color/text-decoration only
        respect_reduced_motion: true,
        no_trc_conflict: true,           // skip if selector matches a TRC-owned class
      },
    },
    {
      token: 'behaviors.hover_states[role=link]',
      category: 'mapped',
      targets: [{
        selector: '.tbl-feed-card .video-title, .tbl-feed-card a',
        install: { ':hover': '${behaviors.hover_states[role=link].diff}' }
      }],
      criticality: 'critical',           // headline hover is the most-felt brand cue
      safety: { ...same as above },
    },
    {
      token: 'behaviors.scroll_reveal[role=card]',
      category: 'gap',
      recommendation: 'Per-card scroll-reveal — propose a new feed-card data attribute (e.g. `data-tbl-reveal`) plus a TRC-engine-managed IntersectionObserver that adds a reveal class. Today the engine handles paging/loading but not per-card entry choreography. See workshop brief.',
      criticality: 'enhances',
    },
    {
      token: 'behaviors.keyframes[role=badge_pulse]',
      category: 'mapped',
      targets: [{
        selector: '.tbl-feed-card .trc-pre-label[data-kind="live"]',  // synthesized; depends on Taboola surfacing a "kind" hint
        install: { animation: '${behaviors.keyframes[role=badge_pulse].name} ${behaviors.duration_scale.slow}ms ${behaviors.easings[0]} infinite' }
      }],
      criticality: 'enhances',
      safety: {
        max_continuous_animation: true,  // OK because explicitly LIVE-content-only and capped at slow tier
        respect_reduced_motion: true,
        cpu_budget_check: true,           // verify computed `will-change` doesn't force layer thrash
      },
    },
    {
      token: 'behaviors.entry_animations[js_driven]',
      category: 'safe-ignore',
      reason: 'JS-driven entry animations (Web Animations API) detected on publisher site, but applying them to TRC-rendered cards would race with the TRC engine\'s own DOM insertion lifecycle. Surface in gap report as "advanced behavior — needs TRC engine integration."',
    },
    {
      token: 'behaviors.tickers',
      category: 'safe-ignore',
      reason: 'Marquee/ticker animations are off-context for a content feed. Skipping by design.',
    },
    // … one entry per token path
  ],
};
```

### The application engine

`lib/loader-build.js` (new) consumes the brand kit + registry and emits:

1. **`output/<slug>/loader.js`** — same shape as the t-online and
   business-insider loaders we've already shipped, but generated
   from data instead of hand-written. Two halves:
   - A `BRAND` token block (every Layer-1 + Layer-2 value).
   - A CSS-override block built from the registry's `mapped` entries.
2. **`output/<slug>/loader.css`** — the same CSS block, standalone, for
   review.
3. **`output/<slug>/feed-mapping-report.html`** — the registry
   resolved against this publisher's kit, grouped by category:
   - **Applied** — every `mapped` token + the selectors/properties used
   - **Gaps** — every `gap` token, with the registry's recommendation
     prose. **This is the workshop deliverable** for Taboola
     engineering: "here are the hooks we need to add so BI / CBS / NBC
     / Leckerschmecker stop feeling generic."
   - **Skipped (safe-ignore)** — tokens we deliberately didn't apply,
     with reason

### Safe-application contract — *nothing in the UI can break*

The loader builder enforces eleven guarantees before writing output —
six visual, five behavioral. Any violation either degrades silently
to a logged fallback or drops the rule with a reason.

**Visual guarantees:**

| Guarantee | How |
|---|---|
| **Contrast safety** | Every text-on-bg color pair in the resolved registry is checked for WCAG AA contrast ≥ 4.5:1 (3.0 for large text). On failure: swap to the next-darker text token or fall back to `colors.text.primary` with a logged `safety_fallback` note. |
| **Font-fallback ladder** | Every custom font face gets a 4-tier fallback chain: extracted family → Google Fonts equivalent (`lib/fonts.js` map) → system family → generic (`sans-serif`/`serif`). No bare proprietary face names. |
| **Numeric bounds** | Every extracted px/em value passes through the existing `clampSize` helper (`lib/engine.js:121-134`) — already shipped, just reused. Stops a glitchy `960px` headline from wrecking layout. |
| **Selector-explosion limit** | Cap the generated CSS at ~30KB. If the registry resolves to more rules than that (e.g., 200 show-brand colors detected), prioritize `critical` over `enhances` and drop the tail with a logged reason. |
| **`!important` only where the TRC engine needs to win** | Generated CSS only uses `!important` on selectors that target the TRC widget's inline styles. Never on the publisher's own page styles. |
| **Final visual smoke test** | After the loader is written, optionally (`--validate-render` flag) launch a clean Puppeteer page, inject `output/<slug>/loader.js` + a static fake-feed HTML, screenshot, and run a static-analysis pass: 1) no element with `width: 0` or `height: 0` that has visible text; 2) no text color = bg color; 3) no `outline: 0` without `:focus-visible` replacement. If `--validate-render --vision` is also set, send the screenshot to Claude with a "does this render correctly?" prompt and surface the verdict in the report. |

**Behavioral guarantees:**

| Guarantee | How |
|---|---|
| **Reduced-motion compliance** | Every emitted `transition`, `animation`, or keyframe rule is paired with a `@media (prefers-reduced-motion: reduce) { ... animation: none; transition: none; }` companion. Pulse/loop animations also gated on `prefers-reduced-motion: no-preference`. No exceptions. |
| **Performance budget** | Reject any non-loop transition > 600ms (degrade to capped 400ms); reject continuous animations unless explicitly approved (LIVE pulse is the canonical exception); only allow `transform / opacity / filter / color / box-shadow / text-decoration / text-decoration-color` on transitioned/animated properties — never `width / height / top / left / margin / padding` (layout-thrash list). Properties outside the safe list are dropped silently and logged to the gap report as "behavior intent preserved, but properties caused layout thrash — skipped." |
| **TRC-engine non-conflict** | Static deny-list of selectors owned by the TRC engine's own lifecycle (`.tbl-loading-cards-placeholder`, `.tbl-placeholder-card`, `.tbl-masker`, `.tbl-feed-loading-*`, `[class^="trc_"][data-state]`). The loader builder never installs behaviors on these. Additionally: if Layer 1B's extracted entry animation depends on JS-driven Web Animations API calls, it's auto-routed to `safe-ignore` because the TRC engine controls its own DOM insertion choreography and overriding it can race. |
| **Scroll-reveal opt-in only** | Per-card scroll-reveal is a `gap` token by default — no IntersectionObserver-based reveal classes get installed unless a future Taboola hook is added. This is a structural constraint to keep loader.js purely declarative CSS and avoid race conditions with TRC's own viewport observer. The recommendation appears in the feed-mapping-report as a workshop ask. |
| **Easing + duration palette caps** | At most 4 distinct easings and 4 distinct duration tiers per publisher are propagated into the loader. Beyond that, normalize to the top-N most-used. Prevents a publisher's experimental one-off curves from leaking into the feed. |

### "Completely custom per publisher" + "premium" + "feels like the publisher's own"

The loader builder treats the brand kit as **data, not theme switches**:
no shared base CSS that publishers opt into. Each publisher gets a
loader that's entirely a function of their own tokens — visual *and*
behavioral. Premium feel comes from:

- Multi-element type hierarchy (Layer 1) → feed-card titles, decks, and
  category labels all read like the publisher's own editorial system,
  not three-sizes-and-done.
- **Real interaction language** (Layer 1B + 3) — extracted hover
  diffs, focus choreography, easing palette, and duration tiers are
  re-applied to TRC card and link surfaces. A publisher that uses a
  220ms ease-out underline reveal sees the same on every feed card; a
  publisher with subtle 1.5%-scale lifts gets the same lift; a
  publisher whose CTA pulses sees the LIVE badge pulse. The feed
  responds to the user *the way the publisher's own surface does*.
- Real shadows + real border-radius + real spacing scale (Layer 1) →
  feed elements share visual weight with the publisher's surface.
- **Named easings + duration tiers** (Layer 1B-derived) bound the
  loader's animation vocabulary to the publisher's own palette — no
  generic browser-default `ease`/`200ms` curves get through.
- Brand-mark motif application (Layer 2 + Layer 3 gap recommendation) →
  even when Taboola doesn't ship the hook yet, the workshop brief makes
  it tractable to add.
- **Reduced-motion respect by default** — premium implies polite. The
  feed never overrides a user's accessibility setting; behaviors that
  can't be politely degraded are routed to `safe-ignore`.

## Architecture summary

### Layer 1 + 1B — deepen `lib/crawler.js`

Stay inside the existing single `page.evaluate()` block for the
deterministic CSS scrapes (Layer 1). Schema changes are **additive
only** — every current key path preserved. The 18+ template `default`
fallback paths across `templates/prototype.hbs` and the partials confirm
new keys land without breaking existing brand kits.

The single-evaluate constraint is relaxed for **three** approved
top-level Puppeteer-driving extractors that need round-trips:
`extractResponsiveBreakpoints(page)` (viewport probe),
`extractInteractionBehaviors(page)` (hover/focus/active probes), and
`installBehaviorObservers(page)` (pre-`page.goto()` script injection
that captures `IntersectionObserver` calls, Web Animations API calls,
and post-load MutationObserver mutations).

New extractors documented in the gap table above; representative
signatures:

```js
// Inside page.evaluate():
function scanCssCustomProperties() { /* :root --* + stylesheet rules */ }
function classifyShowSections() { /* iterate <section>, compare bg */ }
function summarizeLogoSvg(svg) { /* path count, fills, bbox, has-text */ }
function captureShadowRegistry() { /* unique box-shadow */ }
function captureBorderRadiusMap() { /* per element-class radius cluster */ }
function captureSpacingTokens() { /* --spacing-*, --space-*, --gap-* */ }
function captureBreakpointsFromStylesheets() { /* @media walk, CORS-tolerant */ }
function captureTypeScaleExtended() { /* 16-role hierarchy */ }
function captureButtonVariants() { /* primary/secondary/outline/soft */ }
function captureColorOverlays() { /* rgba() < 1 alpha */ }
function captureBordersAndDividers() { /* hr/divider/separator */ }
function captureIconCatalog() { /* viewBox + aria-label + role-hint */ }
function captureChartIframes() { /* datawrapper/flourish/highcharts */ }
function captureLogoVariants() { /* header vs footer; light vs dark */ }
function captureHeaderLayers() { /* per-layer bg/text/height */ }

// Outside page.evaluate(), in extractBrandKit():
async function extractResponsiveBreakpoints(page) {
  // setViewport at [1440, 1024, 768, 480], re-extract layout, infer
}

// New top-level behavioral extractors:
async function installBehaviorObservers(page) {
  // page.evaluateOnNewDocument({ ... }) wrapping:
  //   - Element.prototype.animate (capture keyframes + options + element)
  //   - IntersectionObserver constructor (capture observe() calls)
  //   - performance: rAF count + long-task observer for budget warning
  // Run BEFORE page.goto(). Results read back after load via window.__captured*.
}

async function extractInteractionBehaviors(page) {
  // For ~8-12 representative selectors (a, button, [class*="card"], etc.):
  //   1. Snapshot computed style on a sample element.
  //   2. page.hover(selector). Wait max(transitionDuration)+80ms.
  //   3. Re-snapshot. Diff. Push to behaviors.hover_states[].
  //   4. Hover off-canvas to reset.
  //   5. Repeat for page.focus() → behaviors.focus_states[].
  //   6. For 1-2 prominent buttons: page.mouse.down() + snapshot → behaviors.active_states[].
  // Then read window.__capturedAnimations + window.__capturedObservers
  // populated by installBehaviorObservers and assemble entry_animations[]
  // and scroll_reveal[] sections.
  // Robust to selector not present (try/catch each).
}
```

Schema additions (all new keys; nothing renamed):

```
colors.text.{deep_dark, body, caption}        // adds 3 to existing 3
colors.ui_overlays.{video_scrim, modal, sponsored}
colors.borders.{divider, hr}
colors.show_brand_colors.{<section-slug>: {hex, source}}
colors.css_custom_properties[]                // {name, value, role_guess}
shadows.{natural, deep, sharp, source}
border_radius.{buttons, cards, images, overlays, pills}
layout_patterns.breakpoints.{mobile, tablet, desktop, source}
layout_patterns.max_widths.{site_container, card_wide, card_narrow}
layout_patterns.spacing_scale.{base, small, medium, large, xl, xxl}
layout_patterns.header.layers_detailed[]
fonts.type_scale_extended[]                   // 16-role hierarchy; legacy type_scale preserved
buttons.{secondary, outline, soft_cta}
icons.catalog[]                               // {viewBox, aria_label, role_hint, source}
charts.{platform, embed_method, instances[]}
logos.variants[], logos.brand_mark, logos.primary.shape_summary

// New top-level behaviors section:
behaviors.transitions[], behaviors.hover_states[], behaviors.focus_states[],
behaviors.active_states[], behaviors.keyframes[], behaviors.entry_animations[],
behaviors.scroll_reveal[], behaviors.lazy_load, behaviors.tickers[],
behaviors.easings[], behaviors.duration_scale
```

`metadata.crawler_version` set explicitly to `'2.2.0'`.
`metadata.analysis_method` set to
`'Puppeteer computed-style extraction (deep)'`; Layer 2 appends
`' + Claude enrichment (claude-sonnet-4-6)'` when it runs.

### Layer 2 — new `lib/enrich.js` module

Single export:

```js
async function enrichBrandKit(brandKit, {
  url, pageHtml, options
}) → { brandKit, status, metadata }
```

Pipeline:

1. **Curated HTML payload** — not the raw 50–100KB page. Send:
   - `<title>` + every `<meta>` tag
   - `<header>` outerHTML (truncate 5KB)
   - All inline `<svg>` outerHTML inside the header
   - First 3 `<article>` / `<section>` outerHTML (strip `<script>` /
     `<style>` / `<noscript>`, truncate 10KB)
   - `<footer>` outerHTML (truncate 5KB)
   - `<style>` text from `<head>` (truncate 20KB — so the LLM sees
     brand custom-property names)
   - Total ~30–40KB. Plus the ~5KB brand kit JSON.
2. **Single non-streaming `messages.create` call** —
   `claude-sonnet-4-6`, `max_tokens: 4096`, tool-use forcing for JSON
   output:
   - System block split into two cached parts: rules + schema spec
     (`cache_control: { type: 'ephemeral' }`).
   - One tool `emit_enrichment` with a strict input schema mirroring the
     allowed enrichment keys. `tool_choice: { type: 'tool', name: ... }`.
   - No streaming. The UI shows a single "Enriching with AI…" stage.
3. **`safeMerge(crawlerKit, enrichmentDelta)`** — additive-only with a
   narrow allow-list:

   ```js
   const REFINABLE_PATHS = [
     'colors.primary.name', 'colors.secondary.name',
     'colors.text.*.name', 'colors.backgrounds.*.name',
     'colors.accents.*.name',
     'colors.*.usage',
   ];
   ```

   - **Numerics never overwritten.** Crawler is ground truth for hex,
     rgb, px, weight, radius values.
   - **Refinement allowed** when the existing value matches a known
     placeholder constant (`'Primary Accent'`, `'Near Black'`, etc.).
   - **Tagged every change** — extend the `source` enum:

     | `source` | Meaning | UI hint |
     |---|---|---|
     | `extracted` | Crawler pulled from live page | "From page" |
     | `derived` | Crawler computed (darken_5) | "Computed" |
     | `fallback` | Crawler couldn't find; used default | "Default — verify" |
     | `enriched` | LLM-authored, no crawler equivalent | "AI — verify" |
     | `refined` | LLM overlaid a placeholder name | "AI-named — verify" |

   - **Hallucination detector** — post-merge validator scans every
     hex / numeric / color-ref field in the delta against the crawler's
     extracted set. If the LLM invented a color or referenced an
     unknown font weight, drop that field silently and log to
     `metadata.enrichment.dropped_fields[]`. Never retry — proceed with
     validated subset.

4. **Metadata** —
   ```json
   "enrichment": {
     "status": "enriched" | "skipped_no_key" | "skipped_opt_out" | "failed" | "partial",
     "model": "claude-sonnet-4-6",
     "latency_ms": 8421,
     "input_tokens": 12000, "cache_read_tokens": 10500, "output_tokens": 2300,
     "fields_added": [...], "fields_refined": [...],
     "dropped_fields": [...], "low_confidence_fields": [...]
   }
   ```

Configuration:

- `ANTHROPIC_API_KEY` env var — absent: skip silently, no failure.
- `--no-enrich` CLI flag.
- `--re-enrich` (resume path: enrich a kit loaded via `--brand-kit`).
- `--enrich-screenshot` (v2 placeholder, defaults off).
- `--enrich-model <name>` (override default).

Error handling:

- Network failure / 5xx / rate-limit → retry once with backoff
  (1s, 2s); on second failure, write crawler-only output, set
  `metadata.enrichment.status = 'failed'` with the error. Pipeline
  never aborts.
- Schema validation failure (rare with tool-use): one retry with
  corrective follow-up; then graceful degrade.
- Hallucination: drop silently per above.
- Fail loudly **only** on misconfigured API key (setup error).

Cost / latency (Sonnet 4.6, ~12K input + 2-3K output):
- First call: ~$0.04. Cache-warm subsequent: ~$0.01–$0.02.
- p50 latency: 6–12s. p95: ~18s. Reflected in the SSE wizard's stage
  timing.

### Layer 3 — new `lib/feed-mapping.js` + `lib/loader-build.js`

Already described above. Composition:

1. `lib/feed-mapping.js` exports `TOKEN_HOOKS` — the declarative
   registry.
2. `lib/loader-build.js` consumes the registry + the merged brand kit:
   - Resolves each `mapped` entry against the kit (skip if token
     missing; skip with contrast/font-fallback safety check).
   - Emits `output/<slug>/loader.js` (data-driven, same shape as the
     two hand-written loaders we shipped).
   - Emits `output/<slug>/loader.css` (standalone).
   - Emits `output/<slug>/feed-mapping-report.html`:
     - **Applied** table — token → selector → resolved value
     - **Gaps** list — token + recommendation for Taboola engineering
     - **Skipped** list — safe-ignore tokens with reasons
3. Safe-application contract enforced (contrast, font-fallback,
   numeric bounds, selector-explosion limit, `!important` discipline,
   optional final-render smoke test).

CLI:
- Default: emit all three loader artifacts.
- `--no-loader` to skip.
- `--validate-render` to launch the post-write Puppeteer smoke test.
- `--validate-render --vision` to also send the screenshot through
  Claude for a "does this render?" check.

### Integration

**`generate.js`:**

```js
// Sequence (current at lines 161–203, refactored):
1. installBehaviorObservers(page)        → wrap Element.animate + IntersectionObserver BEFORE goto()
2. page.goto(url) [existing]
3. extractBrandKit(page, url)            → Layer 1 crawler kit (visual)
4. extractInteractionBehaviors(page)     → Layer 1B behaviors (hover/focus/active probes; read observers)
5. extractResponsiveBreakpoints(page)    → Layer 1 multi-viewport probe
6. extractContent(page)                  → article
7. extractNavigation(page)               → nav
8. extractRelatedArticles(page, url)     → related
9. enrichBrandKit(crawlerKit, ...)       → Layer 2, if key present & --no-enrich not set
10. buildLoaderArtifacts(mergedKit)      → Layer 3, if --no-loader not set
11. Write brand-kit.json, brand-kit.css, index.html, analysis-report.html,
    loader.js, loader.css, feed-mapping-report.html
```

Step ordering matters: behavior observers MUST be installed before
`page.goto()` to capture entry animations and IntersectionObserver
constructor calls. The interaction probes run AFTER load when the page
is stable.

New flags (added to `generate.js` lines 19–32):
`--no-enrich`, `--re-enrich`, `--enrich-screenshot`,
`--enrich-model <name>`, `--no-loader`, `--no-behaviors`,
`--validate-render`, `--validate-render-vision`.

**`server.js`:**

- Insert two new SSE stages: `enriching_brand_kit` (between brand and
  content) and `building_loader` (after analysis). Skip cleanly if key
  missing — wizard shows a banner.
- `buildDefaultsBrandKit` at `server.js:235-265` (the synthetic "before"
  kit for the comparison report) **must NOT be enriched and must NOT
  produce a loader.** It's the un-branded baseline.

**`lib/analysis.js`:**

- `tokenProvenance` at lines 109–121 extended to handle `'enriched'` /
  `'refined'` (treat as "real findings" with a distinct status,
  `'discovered'`).
- `extraction_quality` tally extended from 2-bucket (extracted /
  fallback) to 5-bucket (extracted / derived / fallback / enriched /
  refined).
- New `mappingQuality` summary added to the analysis report context:
  applied count, gap count, safe-ignored count, contrast-fallback
  count, font-fallback count.

**`lib/css-export.js`:**

- Lines 32–87: when emitting CSS custom properties, append a comment
  with the color/font human name if `source ∈ {extracted via
  --css-var, refined, enriched}`:

  ```css
  --brand-color-primary: #FF5A00; /* BI Orange — Subscribe CTA, section accent rules */
  ```

**`README.md` + `HOWTO.md`:**

- Document `ANTHROPIC_API_KEY`, what enrichment adds, opt-out flags,
  cost expectations.
- Document the three new artifacts (`loader.js`, `loader.css`,
  `feed-mapping-report.html`) and how to hand the gap report to
  Taboola AdOps / engineering.

## Critical files to modify

| File | Change | Why |
|---|---|---|
| `lib/crawler.js` | Add ~14 inner extractors + 1 top-level `extractResponsiveBreakpoints` | Layer 1 deepening |
| `lib/enrich.js` | **NEW** ~300 LOC | Layer 2 |
| `lib/feed-mapping.js` | **NEW** registry data | Layer 3 — token→hook |
| `lib/loader-build.js` | **NEW** ~250 LOC | Layer 3 — generated loader.js + reports |
| `generate.js` | New flags + pipeline insertion (lines 19–32, 161–203) | Wire enrich + loader build |
| `server.js` | New SSE stages + defaults-fork guard (lines 90, 195, 235–265) | Wizard UX + protect defaults kit |
| `lib/analysis.js` | `tokenProvenance` + tally → 5-bucket; new mappingQuality (lines 109–175) | Surface enrichment + mapping confidence |
| `lib/css-export.js` | Append name/usage comments in `pushVar` calls (lines 32–87) | Workshop-readable exported CSS |
| `package.json` | Add `@anthropic-ai/sdk`; bump to `2.2.0` | Layer 2 dep |
| `README.md`, `HOWTO.md` | Doc updates | New env var, flags, artifacts, gap report |
| `templates/partials/*.hbs` | **Optional** — no edits required; defaults guard everything. Recommend a follow-up to surface `show_brand_colors` + `shadows` in the prototype. | Templates already tolerate missing keys |

## Reuse (don't reinvent)

- `lib/crawler.js:18-50` color/luminance/contrast helpers — reuse in
  Layer 3 safety checks (`safety.contrast_against`).
- `lib/crawler.js:574-603` `extractionQuality` walker — extend
  in-place to 5-bucket; preserves the existing JSON shape.
- `lib/engine.js:121-134` `clampSize` helper — reused by loader-build
  for numeric-bounds safety, no changes.
- `lib/fonts.js` `resolveGoogleFont` + `FONT_MAP` — reused as the
  middle tier of the font-fallback ladder.
- `lib/analysis.js:30-68` `extractBrandKitValue` flat-path readers — no
  shape change required.
- `wizard/wizard.js:435-453` (logo render), `:352-373` (palette
  collect), `:467-488` (quality bar) — extended to display the new
  `source` values and the mapping-report summary.

## Schema decisions

1. **Flat canonical shape preserved.** CBS-style nested
   `core_palette` / `secondary_palette` is offered as an additive
   `colors.groups` field the LLM populates — templates and consumers
   ignore it. Confirms with `lib/css-export.js:32-55`, `prototype.hbs:11-45`,
   `lib/analysis.js:30-68`, `wizard/wizard.js:352-373`.
2. **Show-brand colors get their own bucket** —
   `colors.show_brand_colors`. Not text/bg/accent.
3. **Type-scale double-track** — `fonts.type_scale` (10 roles, single
   `querySelector`) preserved for backwards compat;
   `fonts.type_scale_extended` (16 roles, full computed) is the richer
   new field.
4. **`source` enum extended** —
   `extracted | derived | fallback | enriched | refined`. Tracks every
   field's provenance for the workshop demo's verify-badges.
5. **Token-hook registry is data, not code.** Adding a new publisher
   doesn't require code changes — only a richer brand kit. Adding a
   new Taboola feed hook (because the workshop brief got accepted)
   does require a registry edit.

## Verification

End-to-end test plan covering all three layers:

1. **Layer 1 unit** — Run `node generate.js --url https://www.cbsnews.com --slug cbs-news --no-enrich --no-loader`. Diff `output/cbs-news/brand-kit.json` vs the reference kit.
   Target: ≥70% closure of deterministic gaps (shadows, breakpoints,
   16-role type hierarchy, icon catalog, chart detection, header layer
   breakdown, show-brand colors). Track per-section delta.

2. **Layer 2 unit** — Same URL with `ANTHROPIC_API_KEY` set and no
   `--no-enrich`. Diff again. Brand voice fields, color *names*, photo
   aesthetic prose, logo semantic description must appear. Verify
   `metadata.enrichment` populated with token counts + latency.

3. **Layer 2 hallucination defense** — Spike-test with a small page
   (a hand-crafted minimal HTML stub). Assert that the model never
   produces a hex that wasn't in the crawler-extracted color set; if
   it does, `dropped_fields` records it.

4. **Layer 3 mapping** — Open `output/cbs-news/feed-mapping-report.html`.
   Assert the **Applied** table is non-empty, the **Gaps** list has
   real entries (e.g., show_brand_colors → recommendation), and the
   **Skipped** list documents any safe-ignore decisions.

5. **Layer 3 safe-application** — Generate loaders for all four
   reference publishers (t-online via existing brand-kit.json,
   business-insider, cbs-news fresh, plus one more). Open each
   `output/<slug>/index.html` with the generated loader injected;
   visually confirm: no invisible text, no broken layout, no missing
   fallback fonts, contrast looks readable. Optionally run with
   `--validate-render` and assert the static checks pass.

6. **Cost smoke** — Sum `metadata.enrichment.{input_tokens,
   cache_read_tokens, output_tokens}` over five consecutive runs of
   the same URL. Confirm cache hit rate ≥80% and per-run cost
   ≤$0.05.

7. **Skip-mode smoke** — Unset `ANTHROPIC_API_KEY`. Re-run. Pipeline
   completes; `metadata.enrichment.status = 'skipped_no_key'`; loader
   still builds with crawler-only tokens; no UI break.

8. **Backwards compatibility** — Render the prototype for the existing
   `output/business-insider/brand-kit.json` (hand-built) through the
   updated pipeline. No template breakage; new schema fields render
   where the templates already use `{{default}}`.

9. **Defaults-fork guard** — Run the wizard end-to-end. Confirm
   `buildDefaultsBrandKit` in `server.js:235-265` produces NO
   `metadata.enrichment` block and NO `loader.js`. The "before" panel
   in the analysis report stays un-branded.

10. **Resume-path with re-enrich** — Run with `--brand-kit
    output/business-insider/brand-kit.json --re-enrich`. Assert the
    enriched output preserves crawler-extracted fields and only fills
    placeholders (e.g., `colors.primary.name: 'BI Orange'` is left
    alone if already specific; a generic name gets refined).

## Phasing

Sequential — each phase shippable on its own and improves output
quality:

1. **Phase 1 — Layer 1 quick wins (no LLM dep)**: CSS custom-property
   scrape, shadow registry, border-radius map, multi-button capture,
   show-section color iteration, expanded 16-role type scale, header
   layers detailed, icon catalog with viewBox. ~1.5 days.
2. **Phase 2 — Layer 1 hard**: multi-viewport breakpoint extraction
   (relax single-evaluate), chart iframe detection, logo light/dark
   variants, SVG structural summary. ~2 days.
3. **Phase 3 — Layer 2 LLM enrichment**: `lib/enrich.js`,
   `REFINABLE_PATHS` allow-list, hallucination detector, source enum
   extension, SSE stage, `--no-enrich` / `--re-enrich` flags,
   prompt-caching. ~2 days.
4. **Phase 4 — Layer 3 mapping + application**: `feed-mapping.js`
   registry, `loader-build.js` engine, three new output artifacts
   (loader.js, loader.css, feed-mapping-report.html), safe-application
   contract, `--validate-render` flag. ~2 days.
5. **Phase 5 — UX polish**: wizard verify-badges, analysis report
   5-bucket quality + mapping quality sections, CSS export name
   comments. ~1 day.

## Out of scope

- Switching templates to consume every new schema field. Follow-up
  work, not required by this plan (templates already tolerate missing
  keys).
- Replacing `lib/feed-content.js`'s sponsored card pool with
  publisher-specific advertiser detection.
- A schema migration tool for existing kits. Older kits remain valid;
  `--re-enrich` covers the upgrade path.
- Multi-page crawls (article + homepage + section index). Single-URL
  scope preserved.
- Adopting new Taboola feed hooks recommended by the gap report — that's
  a Taboola engineering follow-up the gap report itself enables.
