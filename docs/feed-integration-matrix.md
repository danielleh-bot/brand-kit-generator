# Feed integration matrix — Unique vs Standard

Visual brand kits are the primary artifact. Each publisher page shows
**source (publisher) → suggested application on today’s Taboola feed → integration tier**.

## Publishers

| Publisher | Visual kit | Ideal prototype | MVP coverage |
|---|---|---|---|
| Leckerschmecker | [visual-brand-kit.html](../output/leckerschmecker/visual-brand-kit.html) | [feed-prototype.html](../output/leckerschmecker/feed-prototype.html) | 56% (5 standard / 2 unique / 1 soft) |
| Business Insider | [visual-brand-kit.html](../output/business-insider/visual-brand-kit.html) | [feed-prototype.html](../output/business-insider/feed-prototype.html) | 57% (4 standard / 1 unique / 1 soft) |
| FOX Sports | [visual-brand-kit.html](../output/fox-sports/visual-brand-kit.html) | [feed-prototype.html](../output/fox-sports/feed-prototype.html) | 57% (4 standard / 2 unique / 1 soft) |
| The Weather Channel | [visual-brand-kit.html](../output/weather-channel/visual-brand-kit.html) | [feed-prototype.html](../output/weather-channel/feed-prototype.html) | 57% (4 standard / 2 unique / 1 soft) |

## Tiers

| Tier | Meaning | Ship path |
|---|---|---|
| **Standard / MVP** | Maps to existing TRC selectors | `loader.js` CSS + `overrideConfig[mode].__style__` |
| **Partial** | Knob exists, fidelity loss | Loader with compromise |
| **Unique / needs platform** | Ideal shows it; no card hook | Custom UI mode / Transformer work |
| **Soft / Gen AI** | Tone / copy / naming | Hand-authored in prototypes; `lib/enrich-stub.js` plug-point |

## Gen AI

Live enrichment is **not wired on main**. Soft properties are documented in the visual kit and stubbed via [`lib/enrich-stub.js`](../lib/enrich-stub.js). Full Claude pipeline exists on branch `feat/deep-crawl-enrich-feed-mapping`.

## Loader capability baseline

From the Business Insider production-shaped loader:

**Can paint today:** `.video-title`, `.branding`, `.tbl-feed-more-btn`, `.trc-pre-label`, sponsored overlay, thumbnail radius, feed header accent/dot.

**Cannot without platform:** cook time / scores / alert windows as card fields, multi-badge inventories, “Mehr von…” section composition, brand-voice headline rewrite.
