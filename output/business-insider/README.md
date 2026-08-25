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
| `loader.js` | Production-shape Taboola TrueNative loader for BI — CSS override + per-mode `__style__` overrideConfig. **Generated from `brand-kit.json`** by `generate.js`, so it never drifts from the kit | Ship to BI AdOps once `publisherName` is confirmed |

## Brand kit at a glance

```
Primary accent: BI Blue        #002AFF   Links, buttons, navigation, tags
Text:           Black / near    #000000 / #0A0A0A / #31313B
Backgrounds:    White / Dark    #FFFFFF (page + masthead) / #0A0A0A (footer)
Type:           Garnett → Hanken Grotesk (Google Fonts equivalent); Tiempos serif
Masthead:       WHITE header, black wordmark, blue accent rule (light, is_dark:false)
Card radius:    0px (sharp corners)
Image ratio:    16:9
Logo:           "Business Insider" wordmark (image); no BI cube mark
Headlines:      sentence case
```

> **Note — this replaces the earlier legacy values.** A first pass used BI's
> *old* identity (orange `#FF5A00`, Brother 1816, black masthead, BI cube).
> BI's current live site is **blue / Garnett / white**. These tokens were
> reconciled against a real Puppeteer crawl — see Provenance.

## Provenance — **read this before sharing**

> The **visual brand tokens** (colors, fonts, logo, buttons, photo style,
> header) are reconciled from a **live Puppeteer crawl** of
> businessinsider.com: primary accent `#002AFF` (blue — *not* the legacy
> orange), Garnett headline/UI type with a Tiempos editorial serif, a white
> masthead, and square 0px corners. Tokens are publisher-level, so they apply
> across BI articles.
>
> The **article context** (headline, deck, byline, hero, body, related cards)
> is the requested Cursor / Michael Truell story, so the in-feed mockups in
> `customer-report.html` reflect the page you asked about.
>
> A few **obvious mis-extractions were corrected** and flagged inline in
> `brand-kit.json` (`note` fields): `article_title_hero` font-size (18px →
> 36px, from its 44px line-height), `buttons` font-size (20px → 14px), button
> horizontal padding (the crawl collapsed it to `0px`), and the `graphics`
> badge list (page UI chrome like "Share"/"WhatsApp" was dropped; the real
> coloured CTAs "Sign up"/"Play now" are kept and LIVE/BREAKING/VIDEO are
> derived from `brand_voice.content_labels`). Extraction quality:
> **17/21 tokens extracted (0.81)**, 4 fallbacks.
>
> The mocked feed "screenshots" in `customer-report.html` are
> self-contained, pixel-accurate HTML/CSS renderings (the medium this tool
> emits) — open the file in any browser to view them. True PNG capture
> requires a headless browser.

To refresh from a live crawl of *this exact article* (replaces both tokens
and content), run the command below from a machine with normal internet
access and Chrome installed.

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
2. **Crawl the whole site** — starting from your URL, it samples the homepage,
   the section pages, and several articles (tune with `--max-pages <n>`)
3. Extract a brand kit from each page and **merge** them by cross-page
   frequency, so card styles / section heads / real CTAs are captured even if
   your start article didn't show them (`metadata.pages_crawled` lists what was
   sampled; pass `--single-page` to force the old one-URL behaviour)
4. Overwrite `output/business-insider/brand-kit.json`
5. Regenerate `index.html`, `analysis-report.html`, and `customer-report.html`

Re-crawling regenerates everything in one pass — `brand-kit.json`,
`brand-kit.css`, `index.html`, the reports, **and `loader.js`**. The loader is
now emitted from the kit by `generate.js` (`lib/loader-export.js`), so its
`BRAND` tokens and CSS always match the latest crawl. No hand-copying.

## Loader.js — pre-production checklist

- [ ] Confirm `publisherName` slug with BI AdOps. Axel-Springer-owned BI
      almost certainly runs on an Axel-Springer-prefixed TRC publisher
      slug; this file uses `axelspringer-businessinsider` as a placeholder.
- [ ] Confirm the production `loaderType` and `experimentID` system flags
      (currently carried over from the t-online integration —
      `trecs-3017-yielding_ctrl` / `29860`).
- [ ] Decide on Garnett hosting. The loader leads every font stack with
      `'Garnett'` (BI's licensed face) and falls back to **Hanken Grotesk**
      (the Google-Fonts equivalent it `@import`s) for parity in the feed
      origin. If BI exposes its licensed Garnett web font to the Taboola
      origin, the fallback is never used.
- [ ] Confirm the target modes list against BI's current Taboola
      deployment (driven by `taboola.modes_in_use` in the kit; falls back to
      a fuller default list). BI may use fewer.
- [ ] Card-title size is a **fallback** in the kit (not crawled) — verify it
      on the next live crawl. The loader flags this inline.

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
