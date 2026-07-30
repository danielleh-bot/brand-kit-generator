# Brand Kit Generator

Automatically extracts brand design tokens (colors, typography, spacing, layout, brand voice, icons, photos) from any publisher website and generates Taboola feed prototypes + analysis reports.

## Two ways to run it

### 1. Wizard (recommended for humans)

Guided 5-step browser experience: crawl a publisher, preview the extracted brand kit, export it as **JSON or drop-in CSS**, optionally re-render the prototype against a different article URL, and preview/share the final HTML.

```bash
npm install
npm run dev
# open http://localhost:4000
```

The wizard talks to a tiny Express backend (`server.js`) that runs the same Puppeteer extractor as the CLI and streams live progress over Server-Sent Events. All artifacts land in `./output/<slug>/` as self-contained files — exactly what you'd upload to Nexus.

The UI is fully responsive — open it on your phone over Wi-Fi or via a tunnel:

```bash
# 1) On your laptop, in the same Wi-Fi: the server already binds to 0.0.0.0.
#    Look for the "Network: http://192.168.x.x:4000" line in the start-up log
#    and open that URL on your phone.

# 2) Share over the internet via Cloudflare's free tunnel (no signup needed):
npx cloudflared tunnel --url http://localhost:4000
# prints a https://<random>.trycloudflare.com URL you can hand anyone

# Or restrict back to localhost only:
HOST=127.0.0.1 npm run dev
```

### 2. CLI (recommended for automation)

```bash
npm install
node generate.js --url "https://www.example.com/article-page" --slug example
```

Output in `./output/example/`:
- `brand-kit.json` — rich nested design tokens (deep extraction + optional AI enrichment)
- `brand-kit.css` — drop-in CSS (`:root` custom properties + utility classes)
- `index.html` — publisher-branded Taboola feed prototype
- `analysis-report.html` — before vs. after comparison report
- `loader.js` — **data-driven feed loader** (BRAND token block + CSS injector) generated from the kit
- `loader.css` — the same overrides, standalone for review
- `feed-mapping-report.html` — **the workshop deliverable**: every token mapped to the feed surface, grouped into Applied / Gaps / Skipped

#### CLI Options

```
--url <url>            Required. Publisher article URL to crawl
--slug <slug>          Publisher slug for output dir (default: derived from domain)
--output <dir>         Output directory (default: ./output)
--report-only          Only generate analysis report
--prototype-only       Only generate feed prototype
--brand-kit <path>     Use existing brand-kit.json (skip crawl)
--chrome <path>        Path to Chrome/Chromium executable
--no-behaviors         Skip interaction-behavior capture (hover/focus/keyframes)
--no-enrich            Skip Layer-2 AI enrichment
--re-enrich            Run enrichment against a kit loaded via --brand-kit
--enrich-model <name>  Override enrichment model (default: claude-sonnet-4-6)
--no-loader            Skip loader.js / loader.css / feed-mapping-report.html
--validate-render      Run static render checks on the generated loader CSS
--list                 List previously generated publishers
```

### AI enrichment (optional, Layer 2)

The crawler extracts everything deterministic. If `ANTHROPIC_API_KEY` is set,
a single Claude call (`claude-sonnet-4-6`) adds the interpretive layer the
crawler can't: brand voice, semantic colour **names** + usage prose, logo and
photo descriptions, icon names, and the intent behind captured interactions.

- **Opt-out:** `--no-enrich`, or simply don't set `ANTHROPIC_API_KEY` (it skips
  silently — the pipeline never fails on a missing key).
- **Safety:** numerics are never overwritten; the crawler is ground truth for
  every hex/px/weight. Any colour the model invents that isn't in the extracted
  set is dropped and logged to `metadata.enrichment.dropped_fields`. Every
  AI-authored value is tagged `source: "enriched"` (new) or `"refined"`
  (placeholder name upgraded) so it shows a "verify" badge.
- **Cost:** ~$0.04 first call, ~$0.01–0.02 cache-warm; p50 latency 6–12s.

```bash
export ANTHROPIC_API_KEY=sk-ant-...
node generate.js --url "https://www.example.com/article" --slug example
```

### Feed mapping + loader (Layer 3)

`lib/feed-mapping.js` is a declarative registry of every brand token's
relationship to the Taboola feed surface — **mapped** (a CSS hook exists, apply
it), **gap** (a real brand expression with no hook yet → recommendation), or
**safe-ignore** (would risk breaking the feed). `lib/loader-build.js` resolves
it against the kit and writes the loader + the `feed-mapping-report.html` gap
report you hand to Taboola AdOps / engineering. Eleven safety guarantees run
before anything is written (WCAG-AA contrast with fallback, 4-tier font ladder,
numeric clamps, 30 KB cap, `!important` only vs. TRC inline styles, reduced-motion
companions on all motion, ≤400 ms paint/composite-only transitions, TRC-engine
non-conflict, scroll-reveal kept opt-in, easing/duration palette caps).

## Project Structure

```
├── server.js                   Express backend for the wizard (SSE progress)
├── generate.js                 CLI entry point (commander)
├── wizard/                     Modern SPA — vanilla HTML/CSS/JS
│   ├── index.html
│   ├── wizard.css
│   └── wizard.js
├── lib/
│   ├── crawler.js              Puppeteer crawler: deep CSS extraction + behaviour capture
│   ├── enrich.js               Layer 2 — Claude enrichment (brand voice, names, intent)
│   ├── feed-mapping.js         Layer 3 — declarative token→feed-hook registry
│   ├── loader-build.js         Layer 3 — generated loader.js/.css + mapping report
│   ├── defaults.js             Generic Taboola baseline for "before" comparison
│   ├── fonts.js                Proprietary font → Google Fonts mapping
│   ├── feed-content.js         Sponsored + native card generation
│   ├── unsplash.js             Curated photo bank + topic detector
│   ├── css-export.js           brand-kit.json → brand-kit.css (with name comments)
│   ├── analysis.js             Diff brand kit vs defaults → stats/gaps/workflow
│   └── engine.js               Handlebars setup, partial registration, helpers
├── templates/                  Handlebars templates for prototype + report
└── output/                     Generated per-publisher artifacts
```

## Brand Kit JSON Schema

The generated `brand-kit.json` contains:

| Section | Contents |
|---------|----------|
| `brand` | name, tagline, website, description, language |
| `logos` | primary logo (SVG/text/image) + SVG structural summary, favicon, light/dark variants |
| `colors` | primary (promoted from `--primary-color` when present) + text (6 levels) + backgrounds + accents + `borders` + `ui_overlays` + `show_brand_colors` + `css_custom_properties` |
| `fonts` | primary/secondary/tertiary + legacy 10-role `type_scale` + new 16-role `type_scale_extended` |
| `shadows` / `border_radius` | shadow registry (sharp/natural/deep) + per-role radius map |
| `buttons` | primary + `secondary` / `outline` / `soft_cta` variants |
| `behaviors` | transitions, hover/focus/active diffs, keyframes, scroll-reveal, easings, duration tiers (Layer 1B) |
| `brand_voice` | language, headline patterns, content labels (+ AI `enriched` block) |
| `photo_style` | aspect ratio, border radius, video indicators (+ AI `aesthetic`) |
| `graphics` / `icons` | badges, decorative elements; SVG count, social icons, `catalog[]` (viewBox + a11y) |
| `layout_patterns` | header layers (detailed), grid, `breakpoints`, `max_widths`, `spacing_scale` |
| `charts` | detected Datawrapper/Flourish/Highcharts embeds |
| `metadata` | analysis date, source URL, `crawler_version`, 5-bucket `extraction_quality`, `enrichment` |

Every leaf token carries a `source`: `extracted` (from page) · `derived`
(computed) · `fallback` (default — verify) · `enriched` (AI-authored) ·
`refined` (AI upgraded a placeholder name).

## Deploy it

Want a public URL you can hand teammates? See [`DEPLOY.md`](./DEPLOY.md).
The repo includes:

- `Dockerfile` — Node 20 + system Chromium, ready to push to any container host.
- `render.yaml` — one-click [Render](https://render.com) blueprint (deployable from a phone).
- `fly.toml` — [Fly.io](https://fly.io) config (deployable via `flyctl deploy`).

## Requirements

- Node.js 18+
- Chrome or Chromium installed on the system (or set `CHROME_PATH=/path/to/chrome`)
