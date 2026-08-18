# Belfast Telegraph — Taboola True Native prototype

Publisher ID **1284555** · belfasttelegraph.co.uk · Mediahuis

| File | View |
| --- | --- |
| `mobile-prototype-light.html` | Light mode |
| `mobile-prototype-dark.html` | Dark mode |

Open either file in a browser. Add `#full` to the URL (or press **Show full page**)
to expand the device frame so the whole article + feed fits in one screenshot.

## What these show

The Taboola True Native feed sits below the article in the publisher's own
article template. Sponsored and organic cards share identical geometry, type
scale and separators — the only difference is the label slot, where a sponsored
card carries "Sponsored · advertiser" in place of an organic card's section
kicker, plus the disclosure icon. That is the whole proposition: the feed is
rendered with Belfast Telegraph's design tokens rather than a widget skin.

Modelled on: https://www.belfasttelegraph.co.uk/area/derry-londonderry/news/a-real-sense-of-shock-and-sadness-woman-50s-dies-after-one-vehicle-crash-in-limavady/a/160113143.html

## How they were built

`scripts/build-mediahuis-mocks.js` renders all four mockups from one brand spec.
Palette, type, masthead, nav and feed inventory are tokens in that file, so
re-tuning after a design review is a one-line edit, not a hunt through the HTML.

```bash
node scripts/build-mediahuis-mocks.js
```

Each file is fully self-contained — all imagery is generated as inline SVG, so
nothing hotlinks a CDN that could 404 mid-presentation and the pages render
identically offline. Web fonts load from Google Fonts with system fallbacks.

## Fidelity: what is verified and what is approximated

Built in an environment with no outbound access to belfasttelegraph.co.uk, so the live page could
not be crawled for exact tokens. Read that way:

**Grounded** — article headline, standfirst and body facts come from the sample
page and reporting on the same story; section names, publisher ID, subscription
model and the shared Mediahuis article-template structure (the `/a/<id>.html`
URL pattern on both titles) are confirmed.

**Approximated, needs a screenshot pass** — exact brand hex values
(#CE0E2D (light) / #FF3B54 (dark)), the masthead lettering, nav item order, and hero
crop ratios. These are the tokens at the top of the build script; send a
screenshot of the live article in both modes and they can be trued up in minutes.

Advertiser names in the sponsored cards are fictional placeholders and imply no
existing relationship. Imagery is abstract, not photography of the real events.
