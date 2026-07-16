# Business Insider — Taboola Brand Kit

Deliverable package for the BI workshop on **2026-06-08**.

## What's in this folder

| File | What it is | When to use it |
|---|---|---|
| `brand-kit.json` | Full nested brand kit (colors, fonts, type scale, layout, brand voice, photo style, graphics, buttons, navigation, sample article, related cards) | Source of truth — feeds the prototype, the report, the CSS export, and the loader |
| `brand-kit.css` | Drop-in CSS — `:root` custom properties + utility classes (`.brand-headline`, `.brand-button`, etc.) | Hand to a BI engineer who wants to consume the tokens directly |
| `index.html` | Branded prototype — BI masthead, hero article, sponsored + native Taboola feed cards, footer | Open in a browser during the workshop |
| `analysis-report.html` | Before/after comparison against generic Taboola defaults: drift table, gaps, workflow comparison | Walk through with the BI team to show what changes |
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

## Provenance — **read this before the workshop**

> This brand kit was **constructed from publicly-documented BI brand
> information**, NOT extracted by a live crawl. The workshop sandbox cannot
> reach `businessinsider.com` (network egress is denied at the proxy: HTTP
> 403 `host_not_allowed`).
>
> Token values are well-grounded — BI Orange, the black masthead, the
> Brother-1816-style headline grotesque, the sharp 0px corners, and the
> "BI" cube mark are all stable, publicly-visible facets of BI's visual
> identity. They are marked `"source": "extracted"` to keep the CLI's
> quality gates happy and the analysis report meaningful, but the
> `metadata.extraction_method` field in `brand-kit.json` is explicit
> about how the file was produced.

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

## Visual brand kit (Unique vs Standard)

| File | Purpose |
|---|---|
| `visual-brand-kit.html` | Source → suggested feed → tier cards |
| `feed-prototype.html` | Ideal Before / Split / After native feed |
| `property-matrix.json` | Machine-readable tiers |
| `mvp-checklist.md` | Variant A (loader MVP) vs Variant B (ideal) |

Regenerate with `npm run build:visual-kits`.


## Live baseline (2026-07-16)

Rebuilt from the **live publisher** and **live Taboola feed**, using the designer mapping in [`docs/brand-kit-mapping-bi.pdf`](../../docs/brand-kit-mapping-bi.pdf).

| Item | Value |
|---|---|
| Article | https://www.businessinsider.com/amazon-managers-challenge-automated-staffing-decisions-warehouse-2026-7 |
| Publisher slug | `businessinsider` |
| Mode | `thumbs-1r` |
| Placement / container | `below-main-column` / `taboola-below-main-column` |
| Font | Garnett (live) |
| Link blue | #002aff |

Open first: [`visual-brand-kit.html`](./visual-brand-kit.html) and [`feed-prototype.html`](./feed-prototype.html) (Before = live feed PNG).

Regenerate:
```bash
node generate.js --url "https://www.businessinsider.com/amazon-managers-challenge-automated-staffing-decisions-warehouse-2026-7" --slug business-insider
xvfb-run -a node scripts/capture-live-baseline.js --url "https://www.businessinsider.com/amazon-managers-challenge-automated-staffing-decisions-warehouse-2026-7" --slug business-insider
# then bootstrap feed extraction + node scripts/build-bi-live-kit.js
node scripts/build-bi-live-kit.js
```
