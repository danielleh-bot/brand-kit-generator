# Visual kit assets

Property cards in `../visual-brand-kit.html` use **inline HTML mock crops** (source publisher UI + suggested TRC feed application) driven by `brand-kit.json`.

Provenance is tagged `prototype` when live screenshot capture is unavailable (egress / workshop sandbox). To swap in live Puppeteer crops later, place:

- `source-<property-id>.png`
- `feed-<property-id>.png`

and extend `lib/visual-brand-kit.js` to prefer image files when present.
