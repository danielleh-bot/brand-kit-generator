# OK! Magazine — mobile feed prototype

## Source

- Article: https://www.ok.co.uk/tv/love-island-finalist-reveals-sad-37458508
- Brand kit: `brand-kit.json` (crawl + live-observed enrichment from OK! DOM and Reach `s-v2.css` tokens)

## Composition one-liner

**iPhone 15 Pro high-fidelity frame + OK! red masthead + Love Island topic chips + Recommended TrueNative mix with interleaved sponsored + organic cards (featured, compact stack, full sponsored CTA, 2-up grid).**

## How to open

Open `mobile-prototype.html` in a browser (or serve the folder). Best viewed at ~414px width.

```bash
python3 -m http.server 8765 --directory output/ok-magazine
# then visit http://localhost:8765/mobile-prototype.html
```

## Kit corrections applied from live site

- CTA `border_radius` 0px → **32px** (Reach `--border-radius-com-cta-radius`)
- Body weight 600 → **400**
- Filled nav, topic chips, Taboola modes (`tmg-network` / `thumbnails-feed`), related articles, hover = headline → `#9A191D` (no card lift)
- Section accents: TV `#E605BA`, Royals/showbiz `#A326DF`

## Regenerate notes

Hand-authored per `publisher-brand-kit-prototype` skill. Do not reskin another publisher prototype.

## Feed realism

Recommended feed **must** interleave sponsored cards with organic OK! cards (compact Sponsored rows + full CTA card + sponsored tile). Organic-only stacks look fake for Taboola `thumbnails-feed`.
