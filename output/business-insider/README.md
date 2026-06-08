# Business Insider — Taboola Brand Kit

Deliverable package for the BI workshop on **2026-06-08**.

## What's in this folder

| File | What it is | When to use it |
|---|---|---|
| `brand-kit.json` | Full nested brand kit (colors, fonts, type scale, layout, brand voice, photo style, graphics, buttons, navigation, sample article, related cards) | Source of truth — feeds the prototype, the report, the CSS export, and the loader |
| `brand-kit.css` | Drop-in CSS — `:root` custom properties + utility classes (`.brand-headline`, `.brand-button`, etc.) | Hand to a BI engineer who wants to consume the tokens directly |
| `index.html` | Branded prototype — white BI masthead, hero article, two-column body + sidebar, full-width sponsored + native Taboola feed, footer | Open in a browser during the workshop |
| `analysis-report.html` | Before/after comparison against generic Taboola defaults: drift table, gaps, workflow comparison | Walk through with the BI team to show what changes |
| `loader.js` | Production-shape Taboola loader for BI — CSS override + per-mode `__style__` overrideConfig, mirrors the t-online integration pattern | Ship to BI AdOps once `publisherName` is confirmed |

## Brand kit at a glance

```
Primary:        BI Yellow      #FECF41   Signature 'Bright Sun' — premium / brand highlight (black text)
Accent:         BI Red         #C71A1E   'Thunderbird' — kickers, hover underlines, section rules
Action (CTA):   Black          #0A0A0A   Subscribe / load-more / sponsored CTA fill
Background:     White          #FFFFFF   (dark footer #0A0A0A)
Text:           Near-black     #111111
Type:           Brother 1816 → Manrope (Google Fonts equivalent)
Card radius:    0px (sharp corners)
Image ratio:    16:9
Logo:           BUSINESS INSIDER black wordmark on a WHITE masthead, BI cube mark
Section labels: UPPERCASE, red kicker
```

## Provenance — **read this before the workshop**

> This brand kit was **constructed from publicly-documented BI brand
> sources** (BrandColorCode, Brandfetch, 1000logos), NOT extracted by a live
> crawl. The workshop sandbox cannot reach `businessinsider.com` (network
> egress is denied at the proxy: HTTP 403 `host_not_allowed`).
>
> **Correction (2026-06-08):** an earlier draft of this kit used an invented
> orange `#FF5A00` accent on a black masthead. That did not match BI's actual
> identity and has been replaced with the documented palette — the signature
> 'Bright Sun' yellow `#FECF41`, the 'Thunderbird' red `#C71A1E`, and BI's
> black wordmark on a white masthead (the logo was de-serifed and blackened
> in 2017). Color/logo tokens are marked `"source": "documented"`; the
> `metadata.extraction_method` field in `brand-kit.json` records the change.
> Re-crawl for byte-exact values when network access is available.

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
