# The Weather Channel — Taboola Brand Kit

## Live baseline

Rebuilt from the **live publisher** and **live Taboola feed** (same method as Business Insider).

| Item | Value |
|---|---|
| Article | https://weather.com/news/news/2025-10-06-north-dakota-ef5-tornado-drought-ends |
| Publisher slug | `theweatherchannel` |
| Primary mode | `organic-thumbs-feed-01-c-new` |
| Modes seen | `organic-thumbs-feed-01-c-new`, `above-the-feed-premium-card-fp-delta`, `thumbs-feed-01-b-new` |
| Container | `taboola-below-content-thumbnails-article` |
| Font | Inter |
| Accent | #3A61CC |

Open first:
- [`visual-brand-kit.html`](./visual-brand-kit.html)
- [`feed-prototype.html`](./feed-prototype.html) (Before = live feed PNG)
- [`mobile-prototype.html`](./mobile-prototype.html) (TrueNative ideal / Unique reference)

```bash
node generate.js --url "https://weather.com/news/news/2025-10-06-north-dakota-ef5-tornado-drought-ends" --slug weather-channel
xvfb-run -a node scripts/capture-live-baseline.js \
  --url "https://weather.com/news/news/2025-10-06-north-dakota-ef5-tornado-drought-ends" --slug weather-channel --home "https://weather.com/" \
  --publisher theweatherchannel --container taboola-below-content-thumbnails-article \
  --mode organic-thumbs-feed-01-c-new --placement "Below Content Thumbnails"
node scripts/build-twc-live-kit.js
```
