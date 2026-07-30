# Goal.com — native mobile feed prototype

## Composition one-liner

Bare 390px Goal.com chrome (black sticky GOAL masthead + 4px tomato inset accent + Live blue pill) over a light `#F5F5F5` article well, with **Most Read tomato numerals**, **Ask Beta**, and TrueNative **stacked 16:9 thumbnail_top** organic/sponsored cards.

## Source

| | |
|---|---|
| Brand kit (uploaded) | Playwright extraction for Goal.com |
| Live article | https://www.goal.com/en-gb/lists/lionel-messi-world-cup-final-tears-belated-beautiful-bond-argentina-icon/blt34c70d4d893d1687 |
| Live corrections | Page well `#F5F5F5` (not dark `#1A1A1A`); headline 32px Clash Grotesk; black masthead with tomato inset accent |

## Files

| File | Purpose |
|---|---|
| `brand-kit.json` | Legacy-shaped kit reconciled with live inspection |
| `brand-kit.base.json` | Canonical one-field-per-mapping kit |
| `brand-kit.css` | Drop-in CSS custom properties |
| `mobile-prototype.html` | Standalone mobile prototype (open in a browser) |

## Open the prototype

```bash
open output/goal-com/mobile-prototype.html   # macOS
xdg-open output/goal-com/mobile-prototype.html
```

## Tokens applied (not palette-only)

- **Chrome:** black sticky header, white GOAL SVG, tomato top inset, Live pulse, section subnav
- **Type:** Clash Grotesk display + Satoshi body (Fontshare CDNs)
- **CTAs:** tomato `#FF6347` pills, 22px radius, hover `#E5533A`
- **Photo:** 16:9, 0px radius, play overlay on video card
- **Hover:** headline → tomato (no generic card lift)
- **Labels:** Most Read, Sponsored, Transfers/Analysis kickers, Ask Beta
- **Feed:** stacked-full TrueNative (live Taboola `thumbnail_top`), not Fox Premium grids

## Regenerate notes

Re-crawl / reconcile:

```bash
node generate.js \
  --url "https://www.goal.com/en-gb/lists/lionel-messi-world-cup-final-tears-belated-beautiful-bond-argentina-icon/blt34c70d4d893d1687" \
  --slug goal-com
```

Then re-apply live corrections in `brand-kit.json` if the crawler again attributes dark card surfaces as page background.
