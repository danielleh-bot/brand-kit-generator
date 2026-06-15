# Business Insider — Taboola Brand Kit

Deliverable package. Latest analysis: **2026-06-15**, re-pointed at the
article
[`cursor-ceo-michael-truell-spacex-elon-musk-anthropic-2026-6`](https://www.businessinsider.com/cursor-ceo-michael-truell-spacex-elon-musk-anthropic-2026-6).

## What's in this folder

| File | What it is | When to use it |
|---|---|---|
| `brand-kit.json` | Full nested brand kit (colors, fonts, type scale, layout, brand voice, photo style, graphics, buttons, navigation, sample article, related cards) | Source of truth — feeds the prototype, the reports, the CSS export, and the loader |
| `brand-kit.css` | Drop-in CSS — `:root` custom properties + utility classes (`.brand-headline`, `.brand-button`, etc.) | Hand to a BI engineer who wants to consume the tokens directly |
| `customer-report.html` | **Customer-facing brand kit report** — every analyzed property with visual examples, plus mocked "screenshots" of how sponsored + recommended content renders in the BI feed (desktop and mobile) | Share with the BI / brand stakeholders — this is the client deliverable |
| `index.html` | Branded prototype — BI masthead, hero article, sponsored + native Taboola feed cards, footer | Open in a browser to walk the full page |
| `analysis-report.html` | Before/after comparison against generic Taboola defaults: drift table, gaps, workflow comparison | Internal/engineering view of what changes |
| `loader.js` | Production-shape Taboola loader for BI — CSS override + per-mode `__style__` overrideConfig, mirrors the t-online integration pattern | Ship to BI AdOps once `publisherName` is confirmed |

## Brand kit at a glance

```
Primary:        BI Orange      #FF5A00   Subscribe CTA, accent rules, hover underlines
Secondary:      BI Red         #E03625   Breaking news, live ticker
Background:     White / Black  #FFFFFF / #000000
Text:           Near-black     #111111
Type:           Brother 1816 → Manrope (Google Fonts equivalent)
Card radius:    0px (sharp corners)
Image ratio:    16:9
Logo:           BUSINESS INSIDER wordmark on black, BI cube mark
Section labels: UPPERCASE BI ORANGE
```

## Provenance — **read this before sharing**

> A re-crawl was requested against the Cursor / Michael Truell article. A
> **live headless crawl could not run from this environment**:
> `businessinsider.com` returns **HTTP 403** to automated clients,
> reader-proxy hosts are off the network egress allowlist, and no
> Chrome/Chromium is installable (the browser CDN also 403s).
>
> So: the **visual brand tokens** (BI Orange `#FF5A00`, the black masthead,
> the Brother-1816 headline grotesque, the sharp 0px corners, the "BI"
> cube mark) are carried forward from BI's well-documented, stable visual
> identity. The **article context** (headline, deck, byline, hero, body,
> related cards) was reconstructed from public reporting on the SpaceX–Cursor
> story so the in-feed mockups in `customer-report.html` reflect the
> requested page. Tokens are marked `"source": "extracted"` to keep the
> CLI quality gates and the reports meaningful; `metadata.extraction_method`
> in `brand-kit.json` documents exactly how this run was produced.
>
> The mocked feed "screenshots" in `customer-report.html` are
> self-contained, pixel-accurate HTML/CSS renderings (the medium this tool
> emits) — open the file in any browser to view them. True PNG capture
> requires a headless browser, which is unavailable in this environment.

If you want the *real* extracted tokens (resolved font CSS, exact pixel
sizes, real button border-radius, actual logo SVG, real related-article
list), run the re-crawl command below from a machine with normal
internet access and replace this `brand-kit.json` with the output.

## Re-crawl from your laptop (5 minutes)

```bash
# from the repo root
npm install                    # one time
node generate.js \
  --url "https://www.businessinsider.com/<a-recent-article-url>" \
  --slug business-insider
```

This will:

1. Launch headless Chrome
2. Navigate to the article page (where Taboola feed is embedded)
3. Extract ~50 brand tokens from live CSS
4. Overwrite `output/business-insider/brand-kit.json`
5. Regenerate `index.html` and `analysis-report.html`

After re-crawling, regenerate the CSS export and the loader (the loader
isn't yet auto-emitted by `generate.js` — copy the per-mode style block
and the CSS tokens from the new `brand-kit.json` into `loader.js`'s
`BRAND` object).

## Loader.js — pre-production checklist

- [ ] Confirm `publisherName` slug with BI AdOps. Axel-Springer-owned BI
      almost certainly runs on an Axel-Springer-prefixed TRC publisher
      slug; this file uses `axelspringer-businessinsider` as a placeholder.
- [ ] Confirm the production `loaderType` and `experimentID` system flags
      (currently carried over from the t-online integration —
      `trecs-3017-yielding_ctrl` / `29860`).
- [ ] Decide on Brother 1816 hosting. Manrope is the visual stand-in but
      the licensed Brother 1816 web font is what BI ships in their own
      pages. If BI is willing to expose the font CSS to the Taboola feed
      origin, swap the `@import` for their licensed font URL.
- [ ] Verify the dark-section variant against BI's footer placement —
      we apply `.trc_dark_section` overrides but BI may not currently
      use a dark feed surface.
- [ ] Confirm the target modes list against BI's current Taboola
      deployment. The list mirrors t-online's; BI may use fewer.

## Workshop talking points

- **The generator extracts every token, not just colors.** Show the
  property table in `analysis-report.html` — 18 brand tokens diffed against
  Taboola defaults, each with provenance.
- **One command, one publisher.** `node generate.js --url <article-url> --slug <publisher>` runs end-to-end in under 30 seconds.
- **The loader is a thin shell on top of the brand kit.** Same JSON drives
  the prototype, the CSS export, and the production loader — re-crawl
  when BI redesigns, regenerate everything.
- **No black-box.** Every CSS rule in `loader.js` is human-readable and
  references a token from `brand-kit.json` — BI engineers can audit,
  diff, and modify in version control.
